import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { listArtifacts } from "../runtime/artifacts.js";
import type { AgentValidationResult } from "../agent/validate.js";

export interface AgentDraftRecord {
  schemaVersion: 1;
  runId: string;
  agentId: string;
  draftPath: string;
  targetPath: string;
  state: "drafted" | "validation_failed" | "installed" | "install_conflict";
  validation: AgentValidationResult;
  createdAt: string;
  installedAt: string | null;
}

export async function writeAgentDraftRecord(
  filePath: string,
  record: AgentDraftRecord,
) {
  await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return filePath;
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
  targetPath: string;
  validation: AgentValidationResult;
}) {
  const artifacts = await listArtifacts({ runId: input.runId });
  const draft = artifacts.find((artifact) => artifact.name === "agent-draft.json");
  if (!draft) {
    return null;
  }

  const record = await readAgentDraftRecord(draft.path);
  const updated: AgentDraftRecord = {
    ...record,
    targetPath: path.resolve(input.targetPath),
    state: input.validation.ok ? "installed" : "validation_failed",
    validation: input.validation,
    installedAt: new Date().toISOString(),
  };
  await writeAgentDraftRecord(draft.path, updated);
  return updated;
}

async function readAgentDraftRecord(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as AgentDraftRecord;
}
