import { createHash } from "node:crypto";
import { access, cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse, stringify } from "yaml";
import { readAgentSummary } from "../agent/registry.js";
import { validateAgentFolder, type AgentValidationResult } from "../agent/validate.js";
import { listArtifacts } from "../runtime/artifacts.js";
import { updateWorkStateForRun } from "../runtime/work-store.js";
import { markAgentDraftInstallConflict, markAgentDraftInstalled, readAgentDraftRecordByRun } from "./agent-draft.js";

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

export interface InstallAgentDraftVersionResult extends InstallAgentDraftResult {
  originalAgentId: string;
  versioned: true;
}

export interface InstallAgentDraftDiff {
  runId: string;
  agentId: string;
  sourcePath: string;
  targetPath: string;
  targetExists: boolean;
  summary: {
    sourceOnly: number;
    targetOnly: number;
    changed: number;
    unchanged: number;
  };
  files: {
    sourceOnly: string[];
    targetOnly: string[];
    changed: string[];
    unchanged: string[];
  };
}

export interface InstallConflictResolution {
  runId: string;
  agentId: string;
  sourcePath: string;
  targetPath: string;
  nextActions: {
    createVersion: {
      type: "create_version";
      label: { zh: string; en: string };
      method: "POST";
      endpoint: "/api/meta/install-agent/version";
      payload: { runId: string };
      proposedAgentId: string;
      proposedTargetPath: string;
    };
    viewDiff: {
      type: "view_diff";
      label: { zh: string; en: string };
      method: "GET";
      endpoint: string;
      summary: InstallAgentDraftDiff["summary"];
    };
  };
  diffSummary: InstallAgentDraftDiff["summary"];
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
    const draft = await readAgentDraftRecordByRun(options.runId);
    if (draft?.state === "installed" && path.resolve(draft.targetPath) === targetPath) {
      const validation = await validateAgentFolder(targetPath);
      return {
        runId: options.runId,
        sourcePath,
        targetPath,
        agentId: summary.agentId,
        installed: validation.ok,
        validation,
      };
    }

    await markAgentDraftInstallConflict({
      runId: options.runId,
      targetPath,
    });
    throw new InstallConflictError(`Agent already exists: ${targetPath}`, targetPath, summary.agentId, sourcePath);
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
  await updateWorkStateForRun({
    runId: options.runId,
    state: validation.ok ? "completed" : "waiting_user",
    summary: validation.ok
      ? `Agent ${summary.agentId} 已安装到正式目录。`
      : `Agent ${summary.agentId} 安装后校验未通过，请继续审核。`,
    updatedAt: new Date().toISOString(),
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

export async function installAgentDraftAsVersion(
  options: InstallAgentDraftOptions,
): Promise<InstallAgentDraftVersionResult> {
  const sourcePath = await resolveDraftAgentPath(options.runId);
  const sourceValidation = await validateAgentFolder(sourcePath);
  if (!sourceValidation.ok) {
    return {
      runId: options.runId,
      sourcePath,
      targetPath: "",
      agentId: "unknown",
      originalAgentId: "unknown",
      installed: false,
      versioned: true,
      validation: sourceValidation,
    };
  }

  const summary = await readAgentSummary(sourcePath);
  const versionTarget = await resolveNextVersionTarget(summary.agentId, options.rootDir ?? "agents");
  await mkdir(path.dirname(versionTarget.targetPath), { recursive: true });
  await cp(sourcePath, versionTarget.targetPath, {
    recursive: true,
    force: false,
    errorOnExist: true,
  });
  await rewriteAgentVersionReferences(versionTarget.targetPath, summary.agentId, versionTarget.agentId);

  const validation = await validateAgentFolder(versionTarget.targetPath);
  await markAgentDraftInstalled({
    runId: options.runId,
    agentId: versionTarget.agentId,
    targetPath: versionTarget.targetPath,
    validation,
  });
  await updateWorkStateForRun({
    runId: options.runId,
    state: validation.ok ? "completed" : "waiting_user",
    summary: validation.ok
      ? `Agent ${summary.agentId} 已安装为新版本 ${versionTarget.agentId}。`
      : `Agent ${summary.agentId} 创建新版本后校验未通过，请继续审核。`,
    updatedAt: new Date().toISOString(),
  });

  return {
    runId: options.runId,
    sourcePath,
    targetPath: versionTarget.targetPath,
    agentId: versionTarget.agentId,
    originalAgentId: summary.agentId,
    installed: validation.ok,
    versioned: true,
    validation,
  };
}

export async function buildInstallConflictResolution(
  input: {
    runId: string;
    rootDir?: string;
  },
): Promise<InstallConflictResolution> {
  const sourcePath = await resolveDraftAgentPath(input.runId);
  const summary = await readAgentSummary(sourcePath);
  const targetPath = path.resolve(input.rootDir ?? "agents", summary.folderName);
  const versionTarget = await resolveNextVersionTarget(summary.agentId, input.rootDir ?? "agents");
  const diff = await diffAgentDraft({ runId: input.runId, rootDir: input.rootDir });

  return {
    runId: input.runId,
    agentId: summary.agentId,
    sourcePath,
    targetPath,
    nextActions: {
      createVersion: {
        type: "create_version",
        label: { zh: "创建新版本", en: "Create new version" },
        method: "POST",
        endpoint: "/api/meta/install-agent/version",
        payload: { runId: input.runId },
        proposedAgentId: versionTarget.agentId,
        proposedTargetPath: versionTarget.targetPath,
      },
      viewDiff: {
        type: "view_diff",
        label: { zh: "查看差异", en: "View diff" },
        method: "GET",
        endpoint: `/api/meta/install-agent/diff?runId=${encodeURIComponent(input.runId)}`,
        summary: diff.summary,
      },
    },
    diffSummary: diff.summary,
  };
}

export async function diffAgentDraft(
  input: {
    runId: string;
    rootDir?: string;
  },
): Promise<InstallAgentDraftDiff> {
  const sourcePath = await resolveDraftAgentPath(input.runId);
  const summary = await readAgentSummary(sourcePath);
  const targetPath = path.resolve(input.rootDir ?? "agents", summary.folderName);
  const targetExists = await exists(targetPath);
  const sourceFiles = await fingerprintFiles(sourcePath);
  const targetFiles = targetExists ? await fingerprintFiles(targetPath) : new Map<string, string>();
  const allPaths = new Set([...sourceFiles.keys(), ...targetFiles.keys()]);
  const sourceOnly: string[] = [];
  const targetOnly: string[] = [];
  const changed: string[] = [];
  const unchanged: string[] = [];

  for (const filePath of [...allPaths].sort()) {
    const sourceHash = sourceFiles.get(filePath);
    const targetHash = targetFiles.get(filePath);
    if (!sourceHash && targetHash) {
      targetOnly.push(filePath);
    } else if (sourceHash && !targetHash) {
      sourceOnly.push(filePath);
    } else if (sourceHash === targetHash) {
      unchanged.push(filePath);
    } else {
      changed.push(filePath);
    }
  }

  return {
    runId: input.runId,
    agentId: summary.agentId,
    sourcePath,
    targetPath,
    targetExists,
    summary: {
      sourceOnly: sourceOnly.length,
      targetOnly: targetOnly.length,
      changed: changed.length,
      unchanged: unchanged.length,
    },
    files: {
      sourceOnly,
      targetOnly,
      changed,
      unchanged,
    },
  };
}

export class InstallConflictError extends Error {
  constructor(
    message: string,
    readonly targetPath: string,
    readonly agentId: string,
    readonly sourcePath: string,
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

async function resolveNextVersionTarget(agentId: string, rootDir: string) {
  const { baseAgentId, nextVersion } = splitVersionedAgentId(agentId);
  for (let version = nextVersion; version <= nextVersion + 49; version += 1) {
    const candidateAgentId = `${baseAgentId}-v${version}`;
    const targetPath = path.resolve(rootDir, agentIdToFolderName(candidateAgentId));
    if (!(await exists(targetPath))) {
      return {
        agentId: candidateAgentId,
        targetPath,
      };
    }
  }
  throw new Error(`Unable to find an available version for Agent: ${agentId}`);
}

function splitVersionedAgentId(agentId: string) {
  const match = agentId.match(/^(.*)-v(\d+)$/);
  if (!match) {
    return {
      baseAgentId: agentId,
      nextVersion: 2,
    };
  }
  return {
    baseAgentId: match[1],
    nextVersion: Number(match[2]) + 1,
  };
}

function agentIdToFolderName(agentId: string) {
  return agentId.replace(/\//g, "__");
}

async function rewriteAgentVersionReferences(agentPath: string, originalAgentId: string, nextAgentId: string) {
  const files = await listFiles(agentPath);
  for (const filePath of files) {
    if (!isTextAgentFile(filePath)) {
      continue;
    }
    const content = await readFile(filePath, "utf8");
    const replaced = content.replace(new RegExp(escapeRegExp(originalAgentId), "g"), nextAgentId);
    await writeFile(filePath, replaced, "utf8");
  }

  const manifestPath = path.join(agentPath, "manifest.yaml");
  const manifest = parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>;
  manifest.agent_id = nextAgentId;
  manifest.version = inferManifestVersion(nextAgentId, manifest.version);
  manifest.updated_at = new Date().toISOString();
  await writeFile(manifestPath, stringify(manifest), "utf8");
}

function inferManifestVersion(agentId: string, fallback: unknown) {
  const match = agentId.match(/-v(\d+)$/);
  if (!match) {
    return typeof fallback === "string" && fallback.trim() ? fallback : "0.1.0";
  }
  return `0.${Number(match[1])}.0`;
}

function isTextAgentFile(filePath: string) {
  const textExtensions = new Set([".json", ".md", ".ts", ".txt", ".yaml", ".yml"]);
  return textExtensions.has(path.extname(filePath).toLowerCase()) || path.basename(filePath).startsWith(".");
}

async function fingerprintFiles(rootDir: string) {
  const files = await listFiles(rootDir);
  const fingerprints = new Map<string, string>();
  for (const filePath of files) {
    const content = await readFile(filePath);
    fingerprints.set(
      path.relative(rootDir, filePath).split(path.sep).join("/"),
      createHash("sha256").update(content).digest("hex"),
    );
  }
  return fingerprints;
}

async function listFiles(rootDir: string) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(entryPath)));
    } else if (entry.isFile() || (await isFile(entryPath))) {
      files.push(entryPath);
    }
  }
  return files.sort();
}

async function isFile(filePath: string) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
