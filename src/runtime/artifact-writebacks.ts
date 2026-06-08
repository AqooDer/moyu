import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  readWorkspaceKnowledgeBaseConfig,
  type WorkspaceKnowledgeBaseConfig,
} from "../settings/knowledge/knowledge-bases.js";
import { getArtifactDetail } from "./artifacts.js";
import { getRunHistoryDetail, listRunHistory } from "./history.js";
import type { ArtifactRecord, KnowledgeWriteBackRecord, RuntimeTrace } from "./types.js";

export interface KnowledgeWriteBackHistoryItem extends KnowledgeWriteBackRecord {
  traceFile: string;
}

export interface MarkKnowledgeWriteBackResult {
  record: KnowledgeWriteBackRecord;
  traceFile: string;
  created: boolean;
}

export async function markArtifactForKnowledgeBase(input: {
  artifactId: string;
  collectionId: string;
  reviewer: string;
  note?: string | null;
  tracesRoot?: string;
  configPath?: string;
  knowledgeBaseConfig?: WorkspaceKnowledgeBaseConfig;
}): Promise<MarkKnowledgeWriteBackResult | null> {
  const collectionId = normalizeRequired(input.collectionId, "collection id");
  const reviewer = normalizeRequired(input.reviewer, "reviewer");
  const artifact = await getArtifactDetail(input.artifactId, { tracesRoot: input.tracesRoot });
  if (!artifact) {
    return null;
  }

  const detail = await getRunHistoryDetail(artifact.runId, { tracesRoot: input.tracesRoot });
  if (!detail || !isRuntimeTrace(detail.trace)) {
    throw new Error(`Artifact write-back only supports runtime-v1 traces: ${input.artifactId}`);
  }

  const runtimeArtifact = detail.trace.artifacts.find((item) => item.id === artifact.id);
  if (!runtimeArtifact) {
    return null;
  }

  const knowledgeBaseConfig =
    input.knowledgeBaseConfig ?? (await readWorkspaceKnowledgeBaseConfig(input.configPath));
  assertWriteBackAllowed(knowledgeBaseConfig, collectionId, runtimeArtifact.type);

  const writeBacks = ensureKnowledgeWriteBacks(detail.trace);
  const existing = writeBacks.find(
    (item) => item.artifactId === artifact.id && item.collectionId === collectionId,
  );
  if (existing) {
    return {
      record: existing,
      traceFile: detail.item.traceFile,
      created: false,
    };
  }

  const createdAt = now();
  const record: KnowledgeWriteBackRecord = {
    id: `kbw-${detail.trace.run.id}-${writeBacks.length + 1}`,
    artifactId: artifact.id,
    runId: detail.trace.run.id,
    agentId: detail.trace.run.agentId,
    collectionId,
    source: toWriteBackSource(runtimeArtifact),
    review: {
      decision: "approved",
      reviewer,
      note: normalizeOptional(input.note),
      reviewedAt: createdAt,
    },
    createdAt,
  };

  writeBacks.push(record);
  await writeFile(detail.item.traceFile, JSON.stringify(detail.trace, null, 2), "utf8");
  return {
    record,
    traceFile: detail.item.traceFile,
    created: true,
  };
}

export async function listKnowledgeWriteBacks(
  input: {
    tracesRoot?: string;
    runId?: string;
    collectionId?: string;
    artifactId?: string;
  } = {},
): Promise<KnowledgeWriteBackHistoryItem[]> {
  const records: KnowledgeWriteBackHistoryItem[] = [];

  if (input.runId) {
    const detail = await getRunHistoryDetail(input.runId, { tracesRoot: input.tracesRoot });
    if (!detail || !isRuntimeTrace(detail.trace)) {
      return records;
    }
    records.push(...writeBacksFromTrace(detail.trace, detail.item.traceFile));
    return filterWriteBacks(records, input);
  }

  const runs = await listRunHistory({ tracesRoot: input.tracesRoot });
  for (const run of runs) {
    const detail = await getRunHistoryDetail(run.id, { tracesRoot: input.tracesRoot });
    if (!detail || !isRuntimeTrace(detail.trace)) {
      continue;
    }
    records.push(...writeBacksFromTrace(detail.trace, detail.item.traceFile));
  }

  return filterWriteBacks(records, input);
}

export function formatKnowledgeWriteBackList(items: KnowledgeWriteBackHistoryItem[]) {
  if (items.length === 0) {
    return "No knowledge write-backs found.";
  }

  const rows = items.map((item) => [
    item.createdAt,
    item.id,
    item.artifactId,
    item.collectionId,
    item.review.reviewer,
    path.relative(process.cwd(), item.source.artifactPath),
  ]);

  return formatTable(["created_at", "write_back_id", "artifact_id", "collection", "reviewer", "path"], rows);
}

export function formatKnowledgeWriteBackResult(result: MarkKnowledgeWriteBackResult) {
  return [
    `write_back_id: ${result.record.id}`,
    `created: ${result.created ? "yes" : "no"}`,
    `artifact_id: ${result.record.artifactId}`,
    `run_id: ${result.record.runId}`,
    `agent: ${result.record.agentId}`,
    `collection: ${result.record.collectionId}`,
    `reviewer: ${result.record.review.reviewer}`,
    `reviewed_at: ${result.record.review.reviewedAt}`,
    `trace: ${path.relative(process.cwd(), result.traceFile)}`,
  ].join("\n");
}

function writeBacksFromTrace(trace: RuntimeTrace, traceFile: string): KnowledgeWriteBackHistoryItem[] {
  return (trace.knowledgeWriteBacks ?? []).map((record) => ({
    ...record,
    traceFile,
  }));
}

function filterWriteBacks(
  items: KnowledgeWriteBackHistoryItem[],
  input: {
    collectionId?: string;
    artifactId?: string;
  },
) {
  return items.filter(
    (item) =>
      (!input.collectionId || item.collectionId === input.collectionId) &&
      (!input.artifactId || item.artifactId === input.artifactId),
  );
}

function ensureKnowledgeWriteBacks(trace: RuntimeTrace) {
  trace.knowledgeWriteBacks ??= [];
  return trace.knowledgeWriteBacks;
}

function toWriteBackSource(artifact: ArtifactRecord): KnowledgeWriteBackRecord["source"] {
  return {
    producerStepId: artifact.producerStepId,
    artifactType: artifact.type,
    artifactRole: artifact.role,
    artifactName: artifact.name,
    artifactPath: artifact.path,
    artifactSizeBytes: artifact.sizeBytes,
    artifactSha256: artifact.sha256,
    artifactCreatedAt: artifact.createdAt,
  };
}

function assertWriteBackAllowed(
  config: WorkspaceKnowledgeBaseConfig,
  collectionId: string,
  artifactType: string,
) {
  const collection = config.knowledgeBases[collectionId];
  if (!collection) {
    throw new Error(`Knowledge base collection not found: ${collectionId}`);
  }

  if (!collection.writeBack.enabled) {
    throw new Error(`Knowledge base write-back is disabled: ${collectionId}`);
  }

  if (!isArtifactTypeAllowed(artifactType, collection.writeBack.allowedArtifactTypes)) {
    throw new Error(
      `Artifact type "${artifactType}" is not allowed for knowledge base collection: ${collectionId}`,
    );
  }
}

function isArtifactTypeAllowed(artifactType: string, allowedTypes: string[]) {
  const accepted = new Set(allowedTypes.map(normalizeArtifactType).filter(Boolean));
  if (accepted.has("*")) {
    return true;
  }
  const candidates = artifactTypeCandidates(artifactType);
  return candidates.some((candidate) => accepted.has(candidate));
}

function artifactTypeCandidates(artifactType: string) {
  const normalized = normalizeArtifactType(artifactType);
  const aliases: Record<string, string[]> = {
    md: ["markdown"],
    markdown: ["md"],
    png: ["image"],
    jpg: ["image"],
    jpeg: ["image"],
    webp: ["image"],
    gif: ["image"],
    svg: ["image"],
  };
  return [normalized, ...(aliases[normalized] ?? [])].filter(Boolean);
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

function normalizeArtifactType(value: string) {
  return value.trim().toLowerCase();
}

function normalizeRequired(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`Missing ${label}.`);
  }
  return normalized;
}

function normalizeOptional(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function now() {
  return new Date().toISOString();
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
