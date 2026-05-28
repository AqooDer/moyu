import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { listArtifacts, type ArtifactHistoryItem } from "./artifacts.js";
import { getRunHistoryDetail, listRunHistory } from "./history.js";
import type { RuntimeTrace, StepRecord } from "./types.js";

export interface WorkbenchData {
  schemaVersion: 1;
  generatedAt: string;
  selectedRun: WorkbenchRun | null;
  artifacts: WorkbenchArtifact[];
  agents: WorkbenchAgent[];
}

export interface WorkbenchRun {
  id: string;
  agentId: string;
  state: string;
  startedAt: string | null;
  durationMs: number | null;
  prompt: string | null;
  steps: WorkbenchStep[];
}

export interface WorkbenchStep {
  id: string;
  name: string;
  state: string;
  durationMs: number | null;
}

export interface WorkbenchArtifact {
  id: string;
  runId: string;
  agentId: string;
  type: string;
  role: string;
  name: string;
  url: string;
  sizeBytes: number | null;
  sha256: string | null;
  createdAt: string | null;
}

export interface WorkbenchAgent {
  id: string;
  title: { zh: string; en: string };
  description: { zh: string; en: string };
}

export async function buildWorkbenchData(
  input: {
    tracesRoot?: string;
    artifactLimit?: number;
    prototypeRoot?: string;
  } = {},
): Promise<WorkbenchData> {
  const tracesRoot = input.tracesRoot ?? "traces";
  const prototypeRoot = path.resolve(input.prototypeRoot ?? "ui/workbench-prototype");
  const artifactLimit = input.artifactLimit ?? 12;
  const runs = await listRunHistory({ tracesRoot, limit: 1 });
  const selectedRun = runs[0] ? await getWorkbenchRun(runs[0].id, tracesRoot) : null;
  const artifacts = await listArtifacts({ tracesRoot, limit: artifactLimit });
  const workbenchArtifacts =
    artifacts.length > 0
      ? artifacts.map((artifact) => toWorkbenchArtifact(artifact, prototypeRoot))
      : await fallbackWorkbenchArtifacts(prototypeRoot);

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    selectedRun,
    artifacts: workbenchArtifacts,
    agents: defaultAgents,
  };
}

export async function writeWorkbenchData(
  outputPath: string,
  input: {
    tracesRoot?: string;
    artifactLimit?: number;
    prototypeRoot?: string;
  } = {},
) {
  const data = await buildWorkbenchData(input);
  const resolvedOutput = path.resolve(outputPath);
  await mkdir(path.dirname(resolvedOutput), { recursive: true });
  await writeFile(resolvedOutput, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return { outputPath: resolvedOutput, data };
}

async function getWorkbenchRun(runId: string, tracesRoot: string): Promise<WorkbenchRun | null> {
  const detail = await getRunHistoryDetail(runId, { tracesRoot });
  if (!detail) {
    return null;
  }

  if (isRuntimeTrace(detail.trace)) {
    return {
      id: detail.trace.run.id,
      agentId: detail.trace.run.agentId,
      state: detail.trace.run.state,
      startedAt: detail.trace.run.startedAt,
      durationMs: detail.trace.run.durationMs,
      prompt: getPrompt(detail.trace.run.input),
      steps: detail.trace.steps.map(toWorkbenchStep),
    };
  }

  const trace = detail.trace as Record<string, unknown>;
  return {
    id: detail.item.id,
    agentId: detail.item.agentId,
    state: detail.item.state,
    startedAt: detail.item.startedAt,
    durationMs: detail.item.durationMs,
    prompt: typeof trace.prompt === "string" ? trace.prompt : null,
    steps: [],
  };
}

function toWorkbenchStep(step: StepRecord): WorkbenchStep {
  return {
    id: step.id,
    name: step.name,
    state: step.state,
    durationMs: step.durationMs,
  };
}

function toWorkbenchArtifact(
  artifact: ArtifactHistoryItem,
  prototypeRoot: string,
): WorkbenchArtifact {
  return {
    id: artifact.id,
    runId: artifact.runId,
    agentId: artifact.agentId,
    type: artifact.type,
    role: artifact.role,
    name: artifact.name,
    url: toRelativeUrl(artifact.path, prototypeRoot),
    sizeBytes: artifact.sizeBytes,
    sha256: artifact.sha256,
    createdAt: artifact.createdAt,
  };
}

function toRelativeUrl(filePath: string, fromDir: string) {
  const relative = path.relative(fromDir, path.resolve(filePath));
  return relative.split(path.sep).join("/");
}

function getPrompt(input: Record<string, unknown>) {
  const prompt = input.prompt;
  return typeof prompt === "string" ? prompt : null;
}

async function fallbackWorkbenchArtifacts(prototypeRoot: string): Promise<WorkbenchArtifact[]> {
  const candidates = [
    {
      name: "moyu-logo-master.png",
      path: "brand/source/moyu-logo-master.png",
      agentId: "image-gen/prototype-v1",
    },
    {
      name: "image-01.png",
      path: "artifacts/agent-runs/image-gen__prototype-v1/run-image-gen__prototype-v1-mplf2lfk-ako86f/image-01.png",
      agentId: "image-gen/prototype-v1",
    },
    {
      name: "artifact-detail-02.png",
      path: "artifacts/ui-concepts/artifact-detail-02/image-01.png",
      agentId: "image-gen/prototype-v1",
    },
  ];
  const artifacts: WorkbenchArtifact[] = [];

  for (const candidate of candidates) {
    const resolvedPath = path.resolve(candidate.path);
    const fileInfo = await safeStat(resolvedPath);
    if (!fileInfo?.isFile()) {
      continue;
    }
    artifacts.push({
      id: `prototype-${artifacts.length + 1}`,
      runId: "prototype-static",
      agentId: candidate.agentId,
      type: "png",
      role: artifacts.length === 0 ? "primary" : "intermediate",
      name: candidate.name,
      url: toRelativeUrl(resolvedPath, prototypeRoot),
      sizeBytes: fileInfo.size,
      sha256: null,
      createdAt: null,
    });
  }

  return artifacts;
}

async function safeStat(filePath: string) {
  try {
    return await stat(filePath);
  } catch {
    return null;
  }
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

const defaultAgents: WorkbenchAgent[] = [
  {
    id: "image-gen/prototype-v1",
    title: { zh: "生图原型 Agent", en: "Image Prototype Agent" },
    description: {
      zh: "根据提示词生成界面概念图",
      en: "Generate UI concepts from prompts",
    },
  },
  {
    id: "code-review/draft",
    title: { zh: "代码审查 Agent", en: "Code Review Agent" },
    description: {
      zh: "阅读代码并给出风险建议",
      en: "Inspect code and surface risks",
    },
  },
  {
    id: "docs-organizer/draft",
    title: { zh: "文档整理 Agent", en: "Documentation Agent" },
    description: {
      zh: "整理需求、Trace 与产物说明",
      en: "Organize requirements, traces, and artifacts",
    },
  },
  {
    id: "research/draft",
    title: { zh: "资料研究 Agent", en: "Research Agent" },
    description: {
      zh: "检索、归纳并输出结构化结论",
      en: "Search, summarize, and structure findings",
    },
  },
];
