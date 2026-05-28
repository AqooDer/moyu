import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { ArtifactRecord, RuntimeTrace } from "./types.js";

export interface RunHistoryItem {
  id: string;
  agentId: string;
  state: string;
  dryRun: boolean;
  startedAt: string | null;
  durationMs: number | null;
  artifactCount: number;
  traceFile: string;
  schema: "runtime-v1" | "legacy" | "unknown";
}

export interface RunHistoryDetail {
  item: RunHistoryItem;
  trace: RuntimeTrace | LegacyTrace | Record<string, unknown>;
}

interface LegacyTrace {
  run_id?: string;
  status?: string;
  prompt?: string;
  count?: number;
  size?: string;
  style?: string;
  output_dir?: string;
  outputs?: unknown[];
  started_at?: string;
  duration_ms?: number;
}

export async function listRunHistory(input: { tracesRoot?: string; limit?: number } = {}) {
  const tracesRoot = path.resolve(input.tracesRoot ?? "traces");
  const entries = await safeReadDir(tracesRoot);
  const items: RunHistoryItem[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const traceFile = path.join(tracesRoot, entry.name, "run.json");
    if (!(await fileExists(traceFile))) {
      continue;
    }

    const detail = await readRunTraceFile(traceFile);
    items.push(detail.item);
  }

  items.sort((left, right) => {
    const leftTime = left.startedAt ? new Date(left.startedAt).getTime() : 0;
    const rightTime = right.startedAt ? new Date(right.startedAt).getTime() : 0;
    return rightTime - leftTime;
  });

  return typeof input.limit === "number" ? items.slice(0, input.limit) : items;
}

export async function getRunHistoryDetail(
  runId: string,
  input: { tracesRoot?: string } = {},
): Promise<RunHistoryDetail | null> {
  const tracesRoot = path.resolve(input.tracesRoot ?? "traces");
  const directTraceFile = path.join(tracesRoot, runId, "run.json");

  if (await fileExists(directTraceFile)) {
    return readRunTraceFile(directTraceFile);
  }

  const items = await listRunHistory({ tracesRoot });
  const match = items.find((item) => item.id === runId);
  return match ? readRunTraceFile(match.traceFile) : null;
}

export function formatRunHistoryList(items: RunHistoryItem[]) {
  if (items.length === 0) {
    return "No runs found.";
  }

  const rows = items.map((item) => [
    item.startedAt ?? "-",
    item.id,
    item.agentId,
    item.state,
    item.dryRun ? "yes" : "no",
    String(item.artifactCount),
    formatDuration(item.durationMs),
  ]);

  return formatTable(["started_at", "run_id", "agent", "state", "dry", "artifacts", "duration"], rows);
}

export function formatRunHistoryDetail(detail: RunHistoryDetail) {
  const { item, trace } = detail;
  const lines = [
    `run_id: ${item.id}`,
    `schema: ${item.schema}`,
    `agent: ${item.agentId}`,
    `state: ${item.state}`,
    `dry_run: ${item.dryRun ? "yes" : "no"}`,
    `started_at: ${item.startedAt ?? "-"}`,
    `duration: ${formatDuration(item.durationMs)}`,
    `trace: ${path.relative(process.cwd(), item.traceFile)}`,
  ];

  if (isRuntimeTrace(trace)) {
    lines.push("", "input:");
    lines.push(...formatObjectLines(trace.run.input));
    lines.push("", "steps:");
    lines.push(...formatStepLines(trace));
    lines.push("", "artifacts:");
    lines.push(...formatArtifactLines(trace.artifacts));
    if (trace.notes.length > 0) {
      lines.push("", "notes:");
      lines.push(...trace.notes.map((note) => `- ${note}`));
    }
    return lines.join("\n");
  }

  lines.push("", "legacy_trace:");
  lines.push(...formatObjectLines(trace));
  return lines.join("\n");
}

async function readRunTraceFile(traceFile: string): Promise<RunHistoryDetail> {
  const raw = await readFile(traceFile, "utf8");
  const trace = JSON.parse(raw) as RuntimeTrace | LegacyTrace | Record<string, unknown>;
  return {
    item: summarizeTrace(trace, traceFile),
    trace,
  };
}

function summarizeTrace(
  trace: RuntimeTrace | LegacyTrace | Record<string, unknown>,
  traceFile: string,
): RunHistoryItem {
  if (isRuntimeTrace(trace)) {
    return {
      id: trace.run.id,
      agentId: trace.run.agentId,
      state: trace.run.state,
      dryRun: trace.run.dryRun,
      startedAt: trace.run.startedAt,
      durationMs: trace.run.durationMs,
      artifactCount: trace.artifacts.length,
      traceFile,
      schema: "runtime-v1",
    };
  }

  if (isLegacyTrace(trace)) {
    return {
      id: trace.run_id ?? path.basename(path.dirname(traceFile)),
      agentId: "spike/image-gen",
      state: trace.status ?? "unknown",
      dryRun: trace.status === "dry-run",
      startedAt: trace.started_at ?? null,
      durationMs: trace.duration_ms ?? null,
      artifactCount: Array.isArray(trace.outputs) ? trace.outputs.length : 0,
      traceFile,
      schema: "legacy",
    };
  }

  return {
    id: path.basename(path.dirname(traceFile)),
    agentId: "unknown",
    state: "unknown",
    dryRun: false,
    startedAt: null,
    durationMs: null,
    artifactCount: 0,
    traceFile,
    schema: "unknown",
  };
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

function isLegacyTrace(trace: unknown): trace is LegacyTrace {
  return Boolean(trace && typeof trace === "object" && "status" in trace);
}

function formatStepLines(trace: RuntimeTrace) {
  if (trace.steps.length === 0) {
    return ["- none"];
  }

  return trace.steps.map((step) => {
    const suffix = step.error ? ` error=${step.error.code}` : "";
    return `- ${step.id} ${step.name} [${step.kind}] ${step.state} ${formatDuration(step.durationMs)}${suffix}`;
  });
}

function formatArtifactLines(artifacts: ArtifactRecord[]) {
  if (artifacts.length === 0) {
    return ["- none"];
  }

  return artifacts.map((artifact) => {
    const relativePath = path.relative(process.cwd(), artifact.path);
    return `- ${artifact.id} ${artifact.name} ${artifact.type}/${artifact.role} ${formatBytes(
      artifact.sizeBytes,
    )} sha256=${artifact.sha256} path=${relativePath}`;
  });
}

function formatObjectLines(value: unknown) {
  if (!value || typeof value !== "object") {
    return [`- ${String(value)}`];
  }

  return Object.entries(value as Record<string, unknown>).map(
    ([key, item]) => `- ${key}: ${formatScalar(item)}`,
  );
}

function formatScalar(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null || typeof value === "undefined") {
    return "-";
  }
  return JSON.stringify(value);
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

function formatDuration(durationMs: number | null) {
  if (durationMs === null) {
    return "-";
  }
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes}B`;
  }
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)}KB`;
  }
  return `${(sizeBytes / 1024 / 1024).toFixed(1)}MB`;
}

async function safeReadDir(dirPath: string) {
  try {
    return await readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    if (isNotFound(error)) {
      return [];
    }
    throw error;
  }
}

async function fileExists(filePath: string) {
  try {
    const info = await stat(filePath);
    return info.isFile();
  } catch (error) {
    if (isNotFound(error)) {
      return false;
    }
    throw error;
  }
}

function isNotFound(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
