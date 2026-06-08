import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { listArtifacts } from "../runtime/artifacts.js";
import type { AgentValidationResult } from "../agent/validate.js";

export type AgentDraftState = "drafted" | "validation_failed" | "installed" | "install_conflict";

export interface AgentDraftRecord {
  schemaVersion: 1;
  revision: number;
  runId: string;
  agentId: string;
  draftPath: string;
  targetPath: string;
  state: AgentDraftState;
  validation: AgentValidationResult;
  createdAt: string;
  updatedAt: string;
  installedAt: string | null;
}

export interface AgentDraftIndex {
  schemaVersion: 1;
  updatedAt: string;
  drafts: AgentDraftIndexEntry[];
}

export interface AgentDraftIndexEntry {
  runId: string;
  agentId: string;
  draftPath: string;
  targetPath: string;
  state: AgentDraftState;
  revision: number;
  validationOk: boolean;
  createdAt: string;
  updatedAt: string;
  installedAt: string | null;
}

export interface ListAgentDraftRecordsOptions {
  rootDir?: string;
  state?: AgentDraftState;
  agentId?: string;
}

export async function writeAgentDraftRecord(
  filePath: string,
  record: AgentDraftRecord,
) {
  await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  await upsertAgentDraftIndex(filePath, record);
  return filePath;
}

export async function listAgentDraftRecords(options: ListAgentDraftRecordsOptions = {}) {
  const index = await readAgentDraftIndex(options.rootDir);
  return index.drafts
    .filter((draft) => !options.state || draft.state === options.state)
    .filter((draft) => !options.agentId || draft.agentId === options.agentId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function readAgentDraftRecordByRun(runId: string) {
  const artifacts = await listArtifacts({ runId });
  const draft = artifacts.find((artifact) => artifact.name === "agent-draft.json");
  if (!draft) {
    return null;
  }
  return readAgentDraftRecord(draft.path);
}

export async function markAgentDraftInstalled(input: {
  runId: string;
  agentId?: string;
  targetPath: string;
  validation: AgentValidationResult;
}) {
  const artifacts = await listArtifacts({ runId: input.runId });
  const draft = artifacts.find((artifact) => artifact.name === "agent-draft.json");
  if (!draft) {
    return null;
  }

  const record = await readAgentDraftRecord(draft.path);
  const updatedAt = new Date().toISOString();
  const updated: AgentDraftRecord = {
    ...record,
    revision: record.revision + 1,
    agentId: input.agentId ?? record.agentId,
    targetPath: path.resolve(input.targetPath),
    state: input.validation.ok ? "installed" : "validation_failed",
    validation: input.validation,
    updatedAt,
    installedAt: updatedAt,
  };
  await writeAgentDraftRecord(draft.path, updated);
  return updated;
}

export async function markAgentDraftInstallConflict(input: {
  runId: string;
  targetPath: string;
}) {
  const artifacts = await listArtifacts({ runId: input.runId });
  const draft = artifacts.find((artifact) => artifact.name === "agent-draft.json");
  if (!draft) {
    return null;
  }

  const record = await readAgentDraftRecord(draft.path);
  if (record.state === "installed" && path.resolve(record.targetPath) === path.resolve(input.targetPath)) {
    return record;
  }

  const updated: AgentDraftRecord = {
    ...record,
    revision: record.revision + 1,
    targetPath: path.resolve(input.targetPath),
    state: "install_conflict",
    updatedAt: new Date().toISOString(),
  };
  await writeAgentDraftRecord(draft.path, updated);
  return updated;
}

async function readAgentDraftRecord(filePath: string) {
  return normalizeAgentDraftRecord(JSON.parse(await readFile(filePath, "utf8")));
}

async function readAgentDraftIndex(rootDir?: string): Promise<AgentDraftIndex> {
  const filePath = resolveAgentDraftIndexPath(rootDir);
  try {
    const index = JSON.parse(await readFile(filePath, "utf8")) as AgentDraftIndex;
    return {
      schemaVersion: 1,
      updatedAt: typeof index.updatedAt === "string" ? index.updatedAt : new Date(0).toISOString(),
      drafts: Array.isArray(index.drafts) ? index.drafts.map(normalizeAgentDraftIndexEntry) : [],
    };
  } catch {
    return {
      schemaVersion: 1,
      updatedAt: new Date(0).toISOString(),
      drafts: [],
    };
  }
}

async function upsertAgentDraftIndex(recordFilePath: string, record: AgentDraftRecord) {
  const indexPath = resolveAgentDraftIndexPath(path.dirname(path.dirname(recordFilePath)));
  const index = await readAgentDraftIndex(path.dirname(indexPath));
  const entry = toAgentDraftIndexEntry(record);
  const drafts = index.drafts.filter((draft) => draft.runId !== entry.runId);
  drafts.push(entry);
  drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const updated: AgentDraftIndex = {
    schemaVersion: 1,
    updatedAt: entry.updatedAt,
    drafts,
  };
  await mkdir(path.dirname(indexPath), { recursive: true });
  await writeFile(indexPath, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
}

function resolveAgentDraftIndexPath(rootDir = path.resolve("artifacts", "meta-agent-runs")) {
  return path.join(rootDir, "agent-drafts.json");
}

function toAgentDraftIndexEntry(record: AgentDraftRecord): AgentDraftIndexEntry {
  return {
    runId: record.runId,
    agentId: record.agentId,
    draftPath: path.resolve(record.draftPath),
    targetPath: path.resolve(record.targetPath),
    state: record.state,
    revision: record.revision,
    validationOk: record.validation.ok,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    installedAt: record.installedAt,
  };
}

function normalizeAgentDraftRecord(raw: AgentDraftRecord): AgentDraftRecord {
  const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : new Date(0).toISOString();
  const installedAt = typeof raw.installedAt === "string" ? raw.installedAt : null;
  return {
    ...raw,
    schemaVersion: 1,
    revision: Number.isFinite(raw.revision) ? raw.revision : 1,
    state: raw.state,
    draftPath: path.resolve(raw.draftPath),
    targetPath: raw.targetPath ? path.resolve(raw.targetPath) : "",
    createdAt,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : installedAt || createdAt,
    installedAt,
  };
}

function normalizeAgentDraftIndexEntry(raw: AgentDraftIndexEntry): AgentDraftIndexEntry {
  const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : new Date(0).toISOString();
  const installedAt = typeof raw.installedAt === "string" ? raw.installedAt : null;
  return {
    runId: raw.runId,
    agentId: raw.agentId,
    draftPath: path.resolve(raw.draftPath),
    targetPath: raw.targetPath ? path.resolve(raw.targetPath) : "",
    state: raw.state,
    revision: Number.isFinite(raw.revision) ? raw.revision : 1,
    validationOk: Boolean(raw.validationOk),
    createdAt,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : installedAt || createdAt,
    installedAt,
  };
}
