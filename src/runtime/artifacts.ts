import { spawn } from "node:child_process";
import { platform } from "node:os";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { getRunHistoryDetail, listRunHistory } from "./history.js";
import type { ArtifactRecord, RuntimeTrace } from "./types.js";

export type ArtifactPreviewKind = "text" | "image" | "pdf" | "office" | "binary" | "unsupported";
export type ArtifactSandboxScope = "workspace" | "artifacts" | "traces" | "agents" | "temp" | "external";

export interface ArtifactPreviewMetadata {
  kind: ArtifactPreviewKind;
  label: string;
  mime: string;
  encoding: "utf8" | "binary";
  canInline: boolean;
  canOpenExternal: boolean;
  canExtractText: boolean;
  maxPreviewBytes: number | null;
  sandbox: {
    scope: ArtifactSandboxScope;
    relativePath: string | null;
  };
  reason: string | null;
}

export interface ArtifactPreviewResult {
  artifact: ArtifactHistoryItem;
  preview: ArtifactPreviewMetadata;
  text: string | null;
  truncated: boolean;
  binary: boolean;
}

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
  preview: ArtifactPreviewMetadata;
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
  const preview = await readArtifactPreview(artifactId, input);
  if (!preview) {
    return null;
  }
  return {
    artifact: preview.artifact,
    text: preview.text,
    truncated: preview.truncated,
    binary: preview.binary,
  };
}

export async function readArtifactPreview(
  artifactId: string,
  input: { tracesRoot?: string; maxBytes?: number } = {},
): Promise<ArtifactPreviewResult | null> {
  const artifact = await getArtifactDetail(artifactId, { tracesRoot: input.tracesRoot });
  if (!artifact) {
    return null;
  }

  const preview = buildArtifactPreviewMetadata(artifact, { maxBytes: input.maxBytes });
  if (preview.kind !== "text") {
    return {
      artifact,
      preview,
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
    preview,
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
    `preview: ${item.preview.kind} inline=${item.preview.canInline ? "yes" : "no"} scope=${item.preview.sandbox.scope}`,
    `absolute_path: ${item.path}`,
    `trace: ${path.relative(process.cwd(), item.traceFile)}`,
  ].join("\n");
}

export function buildArtifactPreviewMetadata(
  artifact: Pick<ArtifactHistoryItem, "type" | "name" | "path">,
  input: { maxBytes?: number } = {},
): ArtifactPreviewMetadata {
  const extension = normalizeExtension(path.extname(artifact.name || artifact.path));
  const type = normalizeExtension(artifact.type);
  const normalized = type || extension || "file";
  const mime = getArtifactMime(normalized, artifact.name);
  const sandbox = classifySandboxPath(artifact.path);
  const maxPreviewBytes = input.maxBytes ?? 64 * 1024;

  if (isTextArtifact(normalized, mime)) {
    return {
      kind: "text",
      label: textLabel(normalized),
      mime,
      encoding: "utf8",
      canInline: true,
      canOpenExternal: true,
      canExtractText: true,
      maxPreviewBytes,
      sandbox,
      reason: null,
    };
  }

  if (isImageType(normalized, mime)) {
    return {
      kind: "image",
      label: "Image preview",
      mime,
      encoding: "binary",
      canInline: true,
      canOpenExternal: true,
      canExtractText: false,
      maxPreviewBytes: null,
      sandbox,
      reason: null,
    };
  }

  if (normalized === "pdf") {
    return {
      kind: "pdf",
      label: "PDF document",
      mime,
      encoding: "binary",
      canInline: false,
      canOpenExternal: true,
      canExtractText: false,
      maxPreviewBytes: null,
      sandbox,
      reason: "PDF text extraction is not enabled in Previewer v1.",
    };
  }

  if (isOfficeType(normalized)) {
    return {
      kind: "office",
      label: "Office document",
      mime,
      encoding: "binary",
      canInline: false,
      canOpenExternal: true,
      canExtractText: false,
      maxPreviewBytes: null,
      sandbox,
      reason: "Office parsing is not enabled in Previewer v1.",
    };
  }

  return {
    kind: isKnownBinaryType(normalized) ? "binary" : "unsupported",
    label: isKnownBinaryType(normalized) ? "Binary file" : "Unsupported file",
    mime,
    encoding: "binary",
    canInline: false,
    canOpenExternal: true,
    canExtractText: false,
    maxPreviewBytes: null,
    sandbox,
    reason: "This artifact type does not have an inline preview in Previewer v1.",
  };
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
    preview: buildArtifactPreviewMetadata({
      type: artifact.type,
      name: artifact.name,
      path: artifact.path,
    }),
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
      preview: buildArtifactPreviewMetadata({
        type: path.extname(file).replace(".", "") || "file",
        name: path.basename(file),
        path: path.resolve(file),
      }),
    },
  ];
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

function classifySandboxPath(filePath: string): ArtifactPreviewMetadata["sandbox"] {
  const absolute = path.resolve(filePath);
  const relative = path.relative(process.cwd(), absolute);
  const normalized = relative.split(path.sep).join("/");
  if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
    return {
      scope: scopeFromWorkspaceRelative(normalized),
      relativePath: normalized || ".",
    };
  }

  const tempRelative = path.relative(path.resolve("/tmp"), absolute);
  if (!tempRelative.startsWith("..") && !path.isAbsolute(tempRelative)) {
    return {
      scope: "temp",
      relativePath: tempRelative.split(path.sep).join("/"),
    };
  }

  return {
    scope: "external",
    relativePath: null,
  };
}

function scopeFromWorkspaceRelative(relativePath: string): ArtifactSandboxScope {
  const first = relativePath.split("/")[0];
  if (first === "artifacts") {
    return "artifacts";
  }
  if (first === "traces") {
    return "traces";
  }
  if (first === "agents") {
    return "agents";
  }
  return "workspace";
}

function getArtifactMime(type: string, name: string) {
  const extension = normalizeExtension(type || path.extname(name));
  const mimeTypes: Record<string, string> = {
    css: "text/css; charset=utf-8",
    csv: "text/csv; charset=utf-8",
    diff: "text/x-diff; charset=utf-8",
    gif: "image/gif",
    html: "text/html; charset=utf-8",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    js: "text/javascript; charset=utf-8",
    json: "application/json; charset=utf-8",
    jsonl: "application/x-ndjson; charset=utf-8",
    log: "text/plain; charset=utf-8",
    md: "text/markdown; charset=utf-8",
    markdown: "text/markdown; charset=utf-8",
    pdf: "application/pdf",
    png: "image/png",
    svg: "image/svg+xml",
    text: "text/plain; charset=utf-8",
    ts: "text/plain; charset=utf-8",
    txt: "text/plain; charset=utf-8",
    webp: "image/webp",
    yaml: "text/yaml; charset=utf-8",
    yml: "text/yaml; charset=utf-8",
  };
  if (extension === "doc" || extension === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (extension === "ppt" || extension === "pptx") {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  if (extension === "xls" || extension === "xlsx") {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  return mimeTypes[extension] ?? "application/octet-stream";
}

function normalizeExtension(value: string | null | undefined) {
  return String(value || "")
    .replace(/^\./, "")
    .trim()
    .toLowerCase();
}

function isTextArtifact(type: string, mime: string) {
  return (
    mime.startsWith("text/") ||
    ["json", "jsonl", "yaml", "yml", "md", "markdown", "ts", "tsx", "js", "jsx", "css", "html", "xml", "log", "patch", "diff"].includes(type)
  );
}

function isImageType(type: string, mime: string) {
  return mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(type);
}

function isOfficeType(type: string) {
  return ["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(type);
}

function isKnownBinaryType(type: string) {
  return ["zip", "gz", "tar", "bin", "sqlite", "db", "mp4", "mov"].includes(type);
}

function textLabel(type: string) {
  if (type === "md" || type === "markdown") {
    return "Markdown text";
  }
  if (type === "json" || type === "jsonl") {
    return "JSON text";
  }
  if (type === "yaml" || type === "yml") {
    return "YAML text";
  }
  if (type === "html") {
    return "HTML source";
  }
  return "Text preview";
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
