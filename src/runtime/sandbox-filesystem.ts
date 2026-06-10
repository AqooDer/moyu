import { mkdir } from "node:fs/promises";
import path from "node:path";
import type {
  RunRecord,
  SandboxCleanupPolicy,
  SandboxDirectoryKind,
  SandboxDirectoryRecord,
  SandboxFilesystemRecord,
} from "./types.js";

const sandboxDirectorySummaries: Record<SandboxDirectoryKind, string> = {
  workspace: "Run-scoped workspace for future task files and resumable working state.",
  uploads: "Run-scoped upload landing area reserved for future file intake.",
  outputs: "Actual artifact output root used by this run.",
  temp: "Run-scoped scratch area for transient runtime files.",
  traces: "Trace output directory for run.json and debug logs.",
};

const cleanupPolicies: Record<SandboxDirectoryKind, SandboxCleanupPolicy> = {
  workspace: "keep",
  uploads: "keep",
  outputs: "keep",
  temp: "ephemeral",
  traces: "keep",
};

export async function createRunSandboxFilesystem(input: {
  run: RunRecord;
  outputsDir: string;
  rootDir?: string;
  tracesDir?: string;
  createdAt?: string;
}): Promise<SandboxFilesystemRecord> {
  const root = path.resolve(input.rootDir ?? path.join("artifacts", "sandboxes", input.run.id));
  const tracesDir = path.resolve(input.tracesDir ?? path.join("traces", input.run.id));
  const directoryPaths: Record<SandboxDirectoryKind, string> = {
    workspace: path.join(root, "workspace"),
    uploads: path.join(root, "uploads"),
    outputs: path.resolve(input.outputsDir),
    temp: path.join(root, "temp"),
    traces: tracesDir,
  };
  const createdAt = input.createdAt ?? new Date().toISOString();

  const directories: SandboxDirectoryRecord[] = [];
  for (const kind of ["workspace", "uploads", "outputs", "temp", "traces"] as const) {
    const directoryPath = directoryPaths[kind];
    await mkdir(directoryPath, { recursive: true });
    directories.push({
      id: `sandbox-${input.run.id}-${kind}`,
      kind,
      path: directoryPath,
      relativePath: toWorkspaceRelativePath(directoryPath),
      writable: true,
      cleanupPolicy: cleanupPolicies[kind],
      created: true,
      summary: sandboxDirectorySummaries[kind],
    });
  }

  return {
    id: `sandbox-${input.run.id}`,
    runId: input.run.id,
    workId: input.run.workId || `work-${input.run.id}`,
    root,
    relativeRoot: toWorkspaceRelativePath(root),
    scope: "run",
    state: "ready",
    directories,
    constraints: [
      "No process isolation, chroot, container, or OS sandbox is enforced in v1.",
      "Uploads, deletes, downloads, and path approvals are not implemented in v1.",
      "MCP can reference this boundary as context, but no MCP server is started by Sandbox Filesystem v1.",
    ],
    createdAt,
    updatedAt: createdAt,
  };
}

function toWorkspaceRelativePath(filePath: string) {
  return path.relative(process.cwd(), filePath).split(path.sep).join("/");
}
