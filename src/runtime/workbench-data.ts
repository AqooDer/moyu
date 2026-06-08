import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { listAgents } from "../agent/registry.js";
import { buildWorkbenchSettings, type WorkbenchSettings } from "../settings/workbench.js";
import { listArtifacts, type ArtifactHistoryItem } from "./artifacts.js";
import { getRunHistoryDetail, listRunHistory, type RunHistoryItem } from "./history.js";
import type { ConversationMessage, ModelRoleResolution, RuntimeTrace, StepRecord, WorkRecord, WorkState } from "./types.js";
import { createWorkIdFromRunId, listConversationMessages, listWorkRecords } from "./work-store.js";

export interface WorkbenchData {
  schemaVersion: 1;
  generatedAt: string;
  selectedRun: WorkbenchRun | null;
  works: WorkbenchWork[];
  messages: WorkbenchMessage[];
  artifacts: WorkbenchArtifact[];
  agents: WorkbenchAgent[];
  settings: WorkbenchSettings;
}

export interface WorkbenchRun {
  id: string;
  agentId: string;
  agentVersion: string | null;
  recipeId: string | null;
  state: string;
  dryRun: boolean;
  startedAt: string | null;
  durationMs: number | null;
  prompt: string | null;
  tracePath: string;
  workId: string | null;
  artifactCount: number;
  modelRoles: ModelRoleResolution[];
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

export interface WorkbenchWork {
  id: string;
  title: { zh: string; en: string };
  description: { zh: string; en: string };
  state: string;
  agentId: string;
  runId: string;
  updatedAt: string | null;
  active: boolean;
}

export interface WorkbenchMessage {
  id: string;
  workId: string;
  runId: string | null;
  role: string;
  kind: string;
  content: string;
  artifactIds: string[];
  createdAt: string;
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
    selectedRunId?: string;
    configPath?: string;
    workStorePath?: string;
  } = {},
): Promise<WorkbenchData> {
  const tracesRoot = input.tracesRoot ?? "traces";
  const prototypeRoot = path.resolve(input.prototypeRoot ?? "ui/workbench");
  const artifactLimit = input.artifactLimit ?? 12;
  const runs = await listRunHistory({ tracesRoot, limit: 8 });
  const selectedRunId = input.selectedRunId || runs[0]?.id;
  const selectedRun = selectedRunId ? await getWorkbenchRun(selectedRunId, tracesRoot) : null;
  const workStorePath = input.workStorePath;
  const storedWorks = await listWorkRecords({ limit: 40, storePath: workStorePath });
  const works = getWorkbenchWorks(runs, selectedRun, storedWorks);
  const selectedWork = findSelectedWorkRecord(storedWorks, selectedRun, works);
  const messages = await getWorkbenchMessages(selectedWork, selectedRun, workStorePath);
  const artifacts = await listArtifacts({
    tracesRoot,
    runId: selectedRun?.id,
    limit: artifactLimit,
  });
  const agents = await getWorkbenchAgents();
  const workbenchArtifacts =
    artifacts.length > 0
      ? artifacts.map((artifact) => toWorkbenchArtifact(artifact, prototypeRoot))
      : selectedRun
        ? []
        : await fallbackWorkbenchArtifacts(prototypeRoot);

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    selectedRun,
    works,
    messages,
    artifacts: workbenchArtifacts,
    agents,
    settings: await buildWorkbenchSettings({ configPath: input.configPath }),
  };
}

export async function writeWorkbenchData(
  outputPath: string,
  input: {
    tracesRoot?: string;
    artifactLimit?: number;
    prototypeRoot?: string;
    configPath?: string;
    workStorePath?: string;
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
      agentVersion: detail.trace.run.agentVersion,
      recipeId: detail.trace.run.recipeId,
      state: detail.trace.run.state,
      dryRun: detail.trace.run.dryRun,
      startedAt: detail.trace.run.startedAt,
      durationMs: detail.trace.run.durationMs,
      prompt: getPrompt(detail.trace.run.input),
      tracePath: path.relative(process.cwd(), detail.item.traceFile),
      workId: detail.trace.run.workId ?? null,
      artifactCount: detail.trace.artifacts.length,
      modelRoles: detail.trace.run.modelRoles ?? [],
      steps: detail.trace.steps.map(toWorkbenchStep),
    };
  }

  const trace = detail.trace as Record<string, unknown>;
  return {
    id: detail.item.id,
    agentId: detail.item.agentId,
    agentVersion: null,
    recipeId: null,
    state: detail.item.state,
    dryRun: detail.item.dryRun,
    startedAt: detail.item.startedAt,
    durationMs: detail.item.durationMs,
    prompt: typeof trace.prompt === "string" ? trace.prompt : null,
    tracePath: path.relative(process.cwd(), detail.item.traceFile),
    workId: null,
    artifactCount: detail.item.artifactCount,
    modelRoles: [],
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

function getWorkbenchWorks(
  runs: RunHistoryItem[],
  selectedRun: WorkbenchRun | null,
  storedWorks: WorkRecord[],
): WorkbenchWork[] {
  if (runs.length === 0 && storedWorks.length === 0) {
    return [
      {
        id: "meta-create-agent",
        title: { zh: "创建生图原型 Agent", en: "Create Image Prototype Agent" },
        description: {
          zh: "等待通过元智能体开启第一个创建会话",
          en: "Waiting for the first Meta Agent creation session",
        },
        state: "waiting",
        agentId: "meta/create-agent",
        runId: "",
        updatedAt: null,
        active: true,
      },
    ];
  }

  const selectedRunId = selectedRun?.id || runs[0]?.id;
  const referencedRuns = new Set(storedWorks.flatMap((work) => work.runIds));
  const storedWorkbenchWorks = storedWorks.map((work) => {
    const run = findLatestRunForWork(work, runs);
    const runId = run?.id || work.runIds[0] || "";
    return {
      id: work.id,
      title: {
        zh: compactText(work.title, 22),
        en: compactText(work.title, 34),
      },
      description: getStoredWorkDescription(work, run),
      state: work.state,
      agentId: work.agentId || run?.agentId || "meta/create-agent",
      runId,
      updatedAt: work.updatedAt,
      active: Boolean(selectedRunId && work.runIds.includes(selectedRunId)),
    };
  });
  const fallbackWorks = runs
    .filter((run) => !referencedRuns.has(run.id))
    .map((run) => ({
      id: createWorkIdFromRunId(run.id),
      title: getWorkbenchWorkTitle(run, selectedRun),
      description: getWorkbenchWorkDescription(run),
      state: run.state,
      agentId: run.agentId,
      runId: run.id,
      updatedAt: run.startedAt,
      active: run.id === selectedRunId,
    }));
  const works = [...storedWorkbenchWorks, ...fallbackWorks].sort((a, b) =>
    (b.updatedAt || "").localeCompare(a.updatedAt || ""),
  );
  if (!works.some((work) => work.active) && works[0]) {
    works[0].active = true;
  }
  return works;
}

function findLatestRunForWork(work: WorkRecord, runs: RunHistoryItem[]) {
  return runs
    .filter((run) => work.runIds.includes(run.id))
    .sort((left, right) => (right.startedAt || "").localeCompare(left.startedAt || ""))[0] ?? null;
}

function getStoredWorkDescription(work: WorkRecord, run: RunHistoryItem | null) {
  if (run) {
    return getWorkbenchWorkDescription(run);
  }
  return {
    zh: `${formatWorkRecordState(work.state, "zh")} · ${formatWorkTime(work.updatedAt, "zh")}`,
    en: `${formatWorkRecordState(work.state, "en")} · ${formatWorkTime(work.updatedAt, "en")}`,
  };
}

function formatWorkRecordState(state: WorkState, lang: "zh" | "en") {
  const stateMap = {
    active: { zh: "进行中", en: "Active" },
    waiting_user: { zh: "等待确认", en: "Waiting for user" },
    running: { zh: "运行中", en: "Running" },
    completed: { zh: "已完成", en: "Completed" },
    archived: { zh: "已归档", en: "Archived" },
  } as const;
  return stateMap[state]?.[lang] || state;
}

function findSelectedWorkRecord(
  storedWorks: WorkRecord[],
  selectedRun: WorkbenchRun | null,
  works: WorkbenchWork[],
) {
  if (!selectedRun?.id) {
    return storedWorks.find((work) => work.id === works.find((item) => item.active)?.id) ?? null;
  }
  return storedWorks.find((work) => work.runIds.includes(selectedRun.id)) ?? null;
}

async function getWorkbenchMessages(
  work: WorkRecord | null,
  selectedRun: WorkbenchRun | null,
  workStorePath?: string,
) {
  const messages = work
    ? await listConversationMessages({ workId: work.id, limit: 80, storePath: workStorePath })
    : selectedRun?.id
      ? await listConversationMessages({ runId: selectedRun.id, limit: 80, storePath: workStorePath })
      : [];
  if (messages.length > 0) {
    return messages.map(toWorkbenchMessage);
  }
  if (!selectedRun) {
    return [];
  }
  return getFallbackMessagesFromRun(selectedRun);
}

function toWorkbenchMessage(message: ConversationMessage): WorkbenchMessage {
  return {
    id: message.id,
    workId: message.workId,
    runId: message.runId,
    role: message.role,
    kind: message.kind,
    content: message.content,
    artifactIds: message.artifactIds,
    createdAt: message.createdAt,
  };
}

function getFallbackMessagesFromRun(run: WorkbenchRun): WorkbenchMessage[] {
  const workId = run.workId || createWorkIdFromRunId(run.id);
  const createdAt = run.startedAt || new Date(0).toISOString();
  const messages: WorkbenchMessage[] = [];
  if (run.prompt) {
    messages.push({
      id: `fallback-${run.id}-user`,
      workId,
      runId: run.id,
      role: "user",
      kind: "user_message",
      content: run.prompt,
      artifactIds: [],
      createdAt,
    });
  }
  messages.push({
    id: `fallback-${run.id}-summary`,
    workId,
    runId: run.id,
    role: "agent",
    kind: "summary",
    content: `${run.agentId} ${formatRunState(run.state, "zh")}，产物数 ${run.artifactCount}。`,
    artifactIds: [],
    createdAt,
  });
  return messages;
}

function getWorkbenchWorkTitle(run: RunHistoryItem, selectedRun: WorkbenchRun | null) {
  const prompt = run.prompt || (run.id === selectedRun?.id ? selectedRun.prompt : null);
  if (prompt) {
    const promptTitle = compactText(prompt, 22);
    return {
      zh: promptTitle,
      en: compactText(prompt, 34),
    };
  }

  const agentName = getAgentDisplayName(run.agentId);
  return {
    zh: `${agentName.zh} 运行`,
    en: `${agentName.en} run`,
  };
}

function getWorkbenchWorkDescription(run: RunHistoryItem) {
  const zhParts = [formatRunState(run.state, "zh"), `${run.artifactCount} 个产物`];
  const enParts = [formatRunState(run.state, "en"), `${run.artifactCount} artifacts`];

  if (run.dryRun) {
    zhParts.push("dry-run");
    enParts.push("dry-run");
  }
  const zhTime = formatWorkTime(run.startedAt, "zh");
  const enTime = formatWorkTime(run.startedAt, "en");
  if (zhTime) {
    zhParts.push(zhTime);
  }
  if (enTime) {
    enParts.push(enTime);
  }

  return {
    zh: zhParts.join(" · "),
    en: enParts.join(" · "),
  };
}

function getAgentDisplayName(agentId: string) {
  if (agentId === "meta/create-agent") {
    return { zh: "元智能体", en: "Meta Agent" };
  }
  if (agentId.includes("image") || agentId.includes("image-gen")) {
    return { zh: "生图 Agent", en: "Image Agent" };
  }
  return { zh: agentId, en: agentId };
}

function formatRunState(state: string, lang: "zh" | "en") {
  const stateMap = {
    succeeded: { zh: "已完成", en: "Completed" },
    failed: { zh: "失败", en: "Failed" },
    running: { zh: "运行中", en: "Running" },
    created: { zh: "已创建", en: "Created" },
    waiting: { zh: "等待中", en: "Waiting" },
    "dry-run": { zh: "Dry run", en: "Dry run" },
  } as const;
  return stateMap[state as keyof typeof stateMap]?.[lang] || state;
}

function formatWorkTime(value: string | null, lang: "zh" | "en") {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(lang === "zh" ? "zh-CN" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function compactText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1))}...`;
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

async function getWorkbenchAgents() {
  const installed = await listAgents();
  const mapped = installed.map((agent): WorkbenchAgent => {
    const title = agent.name || agent.agentId;
    const description = agent.description || agent.recipeRef || agent.path;
    return {
      id: agent.agentId,
      title: { zh: title, en: title },
      description: { zh: description, en: description },
    };
  });

  const seen = new Set(mapped.map((agent) => agent.id));
  return [
    ...mapped,
    ...defaultAgents.filter((agent) => !seen.has(agent.id) && agent.id.endsWith("/draft")),
  ].sort((left, right) => left.id.localeCompare(right.id));
}
