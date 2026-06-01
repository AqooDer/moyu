import { spawn } from "node:child_process";
import { platform } from "node:os";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { getRunHistoryDetail, listRunHistory } from "./history.js";
import type { ArtifactRecord, RuntimeTrace } from "./types.js";

export interface ArtifactHistoryItem {
  id: string;
  runId: string;
  agentId: string;
  type: string;
  role: string;
  name: string;
  path: string;
  sizeBytes: number | null;
  sha256: string | null;
  createdAt: string | null;
  traceFile: string;
  schema: "runtime-v1" | "legacy";
}

export async function listArtifacts(
  input: { tracesRoot?: string; runId?: string; limit?: number } = {},
) {
  const items: ArtifactHistoryItem[] = [];

  if (input.runId) {
    const detail = await getRunHistoryDetail(input.runId, { tracesRoot: input.tracesRoot });
    if (!detail) {
      return items;
    }
    items.push(...artifactsFromTrace(asTraceObject(detail.trace), detail.item.traceFile));
    return limitArtifacts(items, input.limit);
  }

  const runs = await listRunHistory({ tracesRoot: input.tracesRoot });
  for (const run of runs) {
    const detail = await getRunHistoryDetail(run.id, { tracesRoot: input.tracesRoot });
    if (!detail) {
      continue;
    }
    items.push(...artifactsFromTrace(asTraceObject(detail.trace), detail.item.traceFile));
  }

  return limitArtifacts(items, input.limit);
}

export async function getArtifactDetail(
  artifactId: string,
  input: { tracesRoot?: string } = {},
) {
  const artifacts = await listArtifacts({ tracesRoot: input.tracesRoot });
  return artifacts.find((artifact) => artifact.id === artifactId) ?? null;
}

export async function readArtifactText(
  artifactId: string,
  input: { tracesRoot?: string; maxBytes?: number } = {},
) {
  const artifact = await getArtifactDetail(artifactId, { tracesRoot: input.tracesRoot });
  if (!artifact) {
    return null;
  }

  if (isBinaryArtifact(artifact)) {
    return {
      artifact,
      text: null,
      truncated: false,
      binary: true,
    };
  }

  await assertFileExists(artifact.path);
  const maxBytes = input.maxBytes ?? 64 * 1024;
  const content = await readFile(artifact.path);
  const slice = content.subarray(0, maxBytes);
  return {
    artifact,
    text: slice.toString("utf8"),
    truncated: content.length > slice.length,
    binary: false,
  };
}

export async function openArtifact(artifactId: string, input: { tracesRoot?: string } = {}) {
  const artifact = await getArtifactDetail(artifactId, input);
  if (!artifact) {
    return null;
  }

  await assertFileExists(artifact.path);
  await openFile(artifact.path);
  return artifact;
}

export function formatArtifactList(items: ArtifactHistoryItem[]) {
  if (items.length === 0) {
    return "No artifacts found.";
  }

  const rows = items.map((item) => [
    item.id,
    item.runId,
    item.type,
    item.role,
    formatBytes(item.sizeBytes),
    path.relative(process.cwd(), item.path),
  ]);

  return formatTable(["artifact_id", "run_id", "type", "role", "size", "path"], rows);
}

export function formatArtifactDetail(item: ArtifactHistoryItem) {
  return [
    `artifact_id: ${item.id}`,
    `run_id: ${item.runId}`,
    `agent: ${item.agentId}`,
    `schema: ${item.schema}`,
    `type: ${item.type}`,
    `role: ${item.role}`,
    `name: ${item.name}`,
    `size: ${formatBytes(item.sizeBytes)}`,
    `sha256: ${item.sha256 ?? "-"}`,
    `created_at: ${item.createdAt ?? "-"}`,
    `path: ${path.relative(process.cwd(), item.path)}`,
    `absolute_path: ${item.path}`,
    `trace: ${path.relative(process.cwd(), item.traceFile)}`,
  ].join("\n");
}

function artifactsFromTrace(
  trace: RuntimeTrace | Record<string, unknown>,
  traceFile: string,
) {
  if (isRuntimeTrace(trace)) {
    return trace.artifacts.map((artifact) => fromRuntimeArtifact(trace, artifact, traceFile));
  }

  if (Array.isArray(trace.outputs)) {
    return trace.outputs.flatMap((output, index) => fromLegacyOutput(trace, output, index, traceFile));
  }

  return [];
}

function asTraceObject(trace: unknown) {
  return trace as RuntimeTrace | Record<string, unknown>;
}

function fromRuntimeArtifact(
  trace: RuntimeTrace,
  artifact: ArtifactRecord,
  traceFile: string,
): ArtifactHistoryItem {
  return {
    id: artifact.id,
    runId: artifact.runId,
    agentId: trace.run.agentId,
    type: artifact.type,
    role: artifact.role,
    name: artifact.name,
    path: artifact.path,
    sizeBytes: artifact.sizeBytes,
    sha256: artifact.sha256,
    createdAt: artifact.createdAt,
    traceFile,
    schema: "runtime-v1",
  };
}

function fromLegacyOutput(
  trace: Record<string, unknown>,
  output: unknown,
  index: number,
  traceFile: string,
): ArtifactHistoryItem[] {
  if (!output || typeof output !== "object") {
    return [];
  }

  const file = (output as { file?: unknown }).file;
  if (typeof file !== "string") {
    return [];
  }

  const runId = typeof trace.run_id === "string" ? trace.run_id : path.basename(path.dirname(traceFile));
  return [
    {
      id: `legacy-${runId}-${index + 1}`,
      runId,
      agentId: "spike/image-gen",
      type: path.extname(file).replace(".", "") || "file",
      role: "primary",
      name: path.basename(file),
      path: path.resolve(file),
      sizeBytes: null,
      sha256: null,
      createdAt: null,
      traceFile,
      schema: "legacy",
    },
  ];
}

function isBinaryArtifact(artifact: ArtifactHistoryItem) {
  return /png|jpe?g|webp|gif|zip|pdf|pptx|docx|xlsx/i.test(artifact.type || artifact.name);
}

function isRuntimeTrace(trace: unknown): trace is RuntimeTrace {
  return Boolean(
    trace &&
      typeof trace === "object" &&
      "schemaVersion" in trace &&
      (trace as { schemaVersion?: unknown }).schemaVersion === 1 &&
      "run" in trace &&
      "steps" in trace &&
      "artifacts" in trace,
  );
}

function limitArtifacts(items: ArtifactHistoryItem[], limit?: number) {
  return typeof limit === "number" ? items.slice(0, limit) : items;
}

function formatTable(headers: string[], rows: string[][]) {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index].length)),
  );
  const formatRow = (row: string[]) =>
    row.map((cell, index) => cell.padEnd(widths[index])).join("  ").trimEnd();

  return [formatRow(headers), formatRow(widths.map((width) => "-".repeat(width))), ...rows.map(formatRow)].join(
    "\n",
  );
}

function formatBytes(sizeBytes: number | null) {
  if (sizeBytes === null) {
    return "-";
  }
  if (sizeBytes < 1024) {
    return `${sizeBytes}B`;
  }
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)}KB`;
  }
  return `${(sizeBytes / 1024 / 1024).toFixed(1)}MB`;
}

async function assertFileExists(filePath: string) {
  const info = await stat(filePath);
  if (!info.isFile()) {
    throw new Error(`Artifact path is not a file: ${filePath}`);
  }
}

async function openFile(filePath: string) {
  const os = platform();
  const command =
    os === "darwin" ? "open" : os === "win32" ? "cmd" : "xdg-open";
  const args =
    os === "darwin" ? [filePath] : os === "win32" ? ["/c", "start", "", filePath] : [filePath];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
    });
    child.on("error", reject);
    child.on("spawn", () => {
      child.unref();
      resolve();
    });
  });
}
