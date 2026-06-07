import { access, cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { readAgentSummary } from "../agent/registry.js";
import { validateAgentFolder, type AgentValidationResult } from "../agent/validate.js";
import { listArtifacts } from "../runtime/artifacts.js";
import { markAgentDraftInstalled } from "./agent-draft.js";

export interface InstallAgentDraftOptions {
  runId: string;
  rootDir?: string;
  force?: boolean;
}

export interface InstallAgentDraftResult {
  runId: string;
  sourcePath: string;
  targetPath: string;
  agentId: string;
  installed: boolean;
  validation: AgentValidationResult;
}

export async function installAgentDraft(options: InstallAgentDraftOptions): Promise<InstallAgentDraftResult> {
  const sourcePath = await resolveDraftAgentPath(options.runId);
  const sourceValidation = await validateAgentFolder(sourcePath);
  if (!sourceValidation.ok) {
    return {
      runId: options.runId,
      sourcePath,
      targetPath: "",
      agentId: "unknown",
      installed: false,
      validation: sourceValidation,
    };
  }

  const summary = await readAgentSummary(sourcePath);
  const targetPath = path.resolve(options.rootDir ?? "agents", summary.folderName);
  if (!options.force && (await exists(targetPath))) {
    throw new InstallConflictError(`Agent already exists: ${targetPath}`, targetPath);
  }

  await mkdir(path.dirname(targetPath), { recursive: true });
  await cp(sourcePath, targetPath, {
    recursive: true,
    force: Boolean(options.force),
    errorOnExist: !options.force,
  });

  const validation = await validateAgentFolder(targetPath);
  await markAgentDraftInstalled({
    runId: options.runId,
    targetPath,
    validation,
  });
  return {
    runId: options.runId,
    sourcePath,
    targetPath,
    agentId: summary.agentId,
    installed: validation.ok,
    validation,
  };
}

export class InstallConflictError extends Error {
  constructor(
    message: string,
    readonly targetPath: string,
  ) {
    super(message);
    this.name = "InstallConflictError";
  }
}

async function resolveDraftAgentPath(runId: string) {
  const artifacts = await listArtifacts({ runId });
  const manifest = artifacts.find((artifact) => artifact.name === "manifest.yaml");
  if (!manifest) {
    throw new Error(`No manifest artifact found for run: ${runId}`);
  }
  return path.dirname(manifest.path);
}

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
