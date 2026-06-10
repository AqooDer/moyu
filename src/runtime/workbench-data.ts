import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { listAgents, type AgentMcpServerSummary } from "../agent/registry.js";
import { listLlmCallLogs, type LlmCallLogRecord } from "../lib/llm-call-log.js";
import type { SqliteSettingsPaths } from "../settings/store/sqlite.js";
import { buildWorkbenchSettings, type WorkbenchSettings } from "../settings/workbench.js";
import {
  listArtifacts,
  type ArtifactHistoryItem,
  type ArtifactPreviewMetadata,
} from "./artifacts.js";
import { getRunHistoryDetail, listRunHistory } from "./history.js";
import type {
  ArtifactDeliveryRecord,
  ConversationMessage,
  ExecutionModeRecord,
  MiddlewarePipelineRecord,
  McpServerResolution,
  ModelRoleResolution,
  PlanRecord,
  PolicyEvaluationRecord,
  RuntimeTrace,
  SandboxFilesystemRecord,
  StepRecord,
  TraceEventRecord,
  WorkerJobRecord,
} from "./types.js";
import {
  buildWorkSummaries,
  type WorkLifecycle,
  type WorkProgress,
  type WorkSummary,
} from "./work-manager.js";
import { listConversationMessages, listWorkRecords } from "./work-store.js";

export interface WorkbenchData {
  schemaVersion: 1;
  generatedAt: string;
  selectedRun: WorkbenchRun | null;
  works: WorkbenchWork[];
  messages: WorkbenchMessage[];
  artifacts: WorkbenchArtifact[];
  agents: WorkbenchAgent[];
  settings: WorkbenchSettings;
  llmCalls: LlmCallLogRecord[];
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
  mcpServers: McpServerResolution[];
  plan: PlanRecord | null;
  middleware: MiddlewarePipelineRecord | null;
  policy: PolicyEvaluationRecord | null;
  execution: ExecutionModeRecord | null;
  sandbox: SandboxFilesystemRecord | null;
  delivery: ArtifactDeliveryRecord | null;
  worker: WorkerJobRecord | null;
  events: TraceEventRecord[];
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
  path: string;
  url: string;
  sizeBytes: number | null;
  sha256: string | null;
  createdAt: string | null;
  preview: ArtifactPreviewMetadata;
}

export interface WorkbenchWork {
  id: string;
  title: { zh: string; en: string };
  description: { zh: string; en: string };
  state: string;
  storedState: string | null;
  agentId: string;
  runId: string;
  runIds: string[];
  currentRunId: string | null;
  updatedAt: string | null;
  active: boolean;
  artifactCount: number;
  dryRun: boolean;
  lifecycle: WorkLifecycle;
  progress: WorkProgress;
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
  mcpServers: AgentMcpServerSummary[];
}

export async function buildWorkbenchData(
  input: {
    tracesRoot?: string;
    artifactLimit?: number;
    prototypeRoot?: string;
    selectedRunId?: string;
    configPath?: string;
    settingsStore?: SqliteSettingsPaths;
    workStorePath?: string;
    llmCallLogPath?: string;
  } = {},
): Promise<WorkbenchData> {
  const tracesRoot = input.tracesRoot ?? "traces";
  const prototypeRoot = path.resolve(input.prototypeRoot ?? "ui/workbench");
  const artifactLimit = input.artifactLimit ?? 12;
  const allRuns = await listRunHistory({ tracesRoot });
  const runs = allRuns.slice(0, 8);
  const selectedRunId = input.selectedRunId || runs[0]?.id;
  const selectedRun = selectedRunId ? await getWorkbenchRun(selectedRunId, tracesRoot) : null;
  const workStorePath = input.workStorePath;
  const storedWorks = await listWorkRecords({ limit: 40, storePath: workStorePath });
  const workSummaries = await buildWorkSummaries({ runs: allRuns, storedWorks, tracesRoot });
  const works = getWorkbenchWorks(workSummaries, selectedRun);
  const selectedWork = findSelectedWorkSummary(workSummaries, selectedRun, works);
  const messages = await getWorkbenchMessages(selectedWork, selectedRun, workStorePath);
  const artifacts = await listArtifacts({
    tracesRoot,
    runId: selectedRun?.id,
    limit: artifactLimit,
  });
  const agents = await getWorkbenchAgents();
  const workbenchArtifacts = artifacts.map((artifact) => toWorkbenchArtifact(artifact, prototypeRoot));
  const llmCalls = await listLlmCallLogs({ logPath: input.llmCallLogPath, limit: 12 });

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    selectedRun,
    works,
    messages,
    artifacts: workbenchArtifacts,
    agents,
    settings: await buildWorkbenchSettings({ configPath: input.configPath, settingsStore: input.settingsStore }),
    llmCalls,
  };
}

export async function writeWorkbenchData(
  outputPath: string,
  input: {
    tracesRoot?: string;
    artifactLimit?: number;
    prototypeRoot?: string;
    configPath?: string;
    settingsStore?: SqliteSettingsPaths;
    workStorePath?: string;
    llmCallLogPath?: string;
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
      mcpServers: detail.trace.run.mcpServers ?? [],
      plan: detail.trace.plan ?? null,
      middleware: detail.trace.middleware ?? null,
      policy: detail.trace.policy ?? null,
      execution: detail.trace.execution ?? null,
      sandbox: detail.trace.sandbox ?? null,
      delivery: detail.trace.delivery ?? null,
      worker: detail.trace.worker ?? null,
      events: detail.trace.events ?? [],
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
    mcpServers: [],
    plan: null,
    middleware: null,
    policy: null,
    execution: null,
    sandbox: null,
    delivery: null,
    worker: null,
    events: [],
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
    path: artifact.preview.sandbox.relativePath ?? artifact.path,
    url: toRelativeUrl(artifact.path, prototypeRoot),
    sizeBytes: artifact.sizeBytes,
    sha256: artifact.sha256,
    createdAt: artifact.createdAt,
    preview: artifact.preview,
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
  summaries: WorkSummary[],
  selectedRun: WorkbenchRun | null,
): WorkbenchWork[] {
  if (summaries.length === 0) {
    return [];
  }

  const selectedRunId = selectedRun?.id || summaries[0]?.currentRunId || summaries[0]?.runIds[0];
  const works = summaries.map((work) => {
    const runId = work.currentRunId || work.runIds[0] || "";
    return {
      id: work.id,
      title: {
        zh: compactText(work.title, 22),
        en: compactText(work.title, 34),
      },
      description: getWorkbenchWorkDescription(work),
      state: work.state,
      storedState: work.storedState,
      agentId: work.agentId || "meta/create-agent",
      runId,
      runIds: work.runIds,
      currentRunId: work.currentRunId,
      updatedAt: work.updatedAt,
      artifactCount: work.artifactCount,
      dryRun: work.dryRun,
      lifecycle: work.lifecycle,
      progress: work.progress,
      active: Boolean(selectedRunId && work.runIds.includes(selectedRunId)),
    };
  });
  if (!works.some((work) => work.active) && works[0]) {
    works[0].active = true;
  }
  return works;
}

function formatWorkLifecycleState(state: string, lang: "zh" | "en") {
  const stateMap = {
    active: { zh: "进行中", en: "Active" },
    waiting_user: { zh: "等待确认", en: "Waiting for user" },
    running: { zh: "运行中", en: "Running" },
    completed: { zh: "已完成", en: "Completed" },
    archived: { zh: "已归档", en: "Archived" },
    failed: { zh: "失败", en: "Failed" },
    cancelled: { zh: "已取消", en: "Cancelled" },
    unknown: { zh: "未知", en: "Unknown" },
  } as const;
  return stateMap[state as keyof typeof stateMap]?.[lang] || state;
}

function findSelectedWorkSummary(
  summaries: WorkSummary[],
  selectedRun: WorkbenchRun | null,
  works: WorkbenchWork[],
) {
  if (!selectedRun?.id) {
    return summaries.find((work) => work.id === works.find((item) => item.active)?.id) ?? null;
  }
  return summaries.find((work) => work.runIds.includes(selectedRun.id)) ?? null;
}

async function getWorkbenchMessages(
  work: WorkSummary | null,
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
  return [];
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

function getWorkbenchWorkDescription(work: WorkSummary) {
  const zhParts = [
    formatWorkLifecycleState(work.state, "zh"),
    `${work.progress.percent}%`,
    `${work.artifactCount} 个产物`,
  ];
  const enParts = [
    formatWorkLifecycleState(work.state, "en"),
    `${work.progress.percent}%`,
    `${work.artifactCount} artifacts`,
  ];

  if (work.dryRun) {
    zhParts.push("dry-run");
    enParts.push("dry-run");
  }
  const zhTime = formatWorkTime(work.updatedAt, "zh");
  const enTime = formatWorkTime(work.updatedAt, "en");
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

async function getWorkbenchAgents() {
  const installed = await listAgents();
  return installed.map((agent): WorkbenchAgent => {
    const title = agent.name || agent.agentId;
    const description = agent.description || agent.recipeRef || agent.path;
    return {
      id: agent.agentId,
      title: { zh: title, en: title },
      description: { zh: description, en: description },
      mcpServers: agent.mcpServers,
    };
  }).sort((left, right) => left.id.localeCompare(right.id));
}
