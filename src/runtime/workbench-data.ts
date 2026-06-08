import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { listAgents } from "../agent/registry.js";
import { listArtifacts, type ArtifactHistoryItem } from "./artifacts.js";
import { getRunHistoryDetail, listRunHistory, type RunHistoryItem } from "./history.js";
import {
  readWorkspaceKnowledgeBaseConfig,
  type KnowledgeBaseConfig,
  type WorkspaceKnowledgeBaseConfig,
} from "./knowledge-bases.js";
import type { ModelRoleResolution, RuntimeTrace, StepRecord } from "./types.js";

export interface WorkbenchData {
  schemaVersion: 1;
  generatedAt: string;
  selectedRun: WorkbenchRun | null;
  works: WorkbenchWork[];
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

export interface WorkbenchAgent {
  id: string;
  title: { zh: string; en: string };
  description: { zh: string; en: string };
}

export interface WorkbenchSettings {
  nav: WorkbenchSettingsNavItem[];
  overview: WorkbenchSettingsOverview;
  providers: WorkbenchProvider[];
  modelRoles: WorkbenchModelRole[];
  knowledgeBases: WorkbenchKnowledgeBase[];
  skills: WorkbenchCapability[];
  tools: WorkbenchCapability[];
  mcpServers: WorkbenchCapability[];
  runtimePolicies: WorkbenchRuntimePolicy[];
  agentDefaults: WorkbenchAgentDefault[];
  agentContexts: WorkbenchAgentRuntimeContext[];
}

export interface WorkbenchSettingsNavItem {
  id: string;
  title: { zh: string; en: string };
  description: { zh: string; en: string };
}

export interface WorkbenchSettingsOverview {
  title: { zh: string; en: string };
  description: { zh: string; en: string };
  highlights: Array<{
    label: { zh: string; en: string };
    value: { zh: string; en: string };
    note: { zh: string; en: string };
  }>;
}

export interface WorkbenchProvider {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "not_configured";
  endpoint: string;
  defaultFor: string[];
  models: string[];
  note: { zh: string; en: string };
}

export interface WorkbenchModelRole {
  id: string;
  title: { zh: string; en: string };
  description: { zh: string; en: string };
  defaultMode: { zh: string; en: string };
  defaultModel: string;
  fallback: { zh: string; en: string };
  runtimeSignals: string[];
}

export interface WorkbenchKnowledgeBase {
  id: string;
  title: { zh: string; en: string };
  state: "ready" | "draft";
  embeddingRole: string;
  chunkStrategy: { zh: string; en: string };
  connectedAgents: string[];
  sources: string[];
  writeBackEnabled: boolean;
  writeBack: { zh: string; en: string };
  allowedArtifactTypes: string[];
}

export interface WorkbenchCapability {
  id: string;
  title: { zh: string; en: string };
  state: "enabled" | "review" | "planned";
  scope: { zh: string; en: string };
  source: { zh: string; en: string };
  note: { zh: string; en: string };
}

export interface WorkbenchRuntimePolicy {
  id: string;
  title: { zh: string; en: string };
  value: { zh: string; en: string };
  note: { zh: string; en: string };
}

export interface WorkbenchAgentDefault {
  agentId: string;
  title: { zh: string; en: string };
  modelRoles: string[];
  knowledgeBases: string[];
  skills: string[];
  tools: string[];
  mcpServers: string[];
  runtimeMode: { zh: string; en: string };
}

export interface WorkbenchAgentRuntimeContext {
  agentId: string;
  title: { zh: string; en: string };
  purpose: { zh: string; en: string };
  assemblyMode: { zh: string; en: string };
  modelRoles: string[];
  knowledgeBases: string[];
  skills: string[];
  tools: string[];
  mcpServers: string[];
  runtimeEvidence: string[];
  artifactPolicy: { zh: string; en: string };
  note: { zh: string; en: string };
}

export async function buildWorkbenchData(
  input: {
    tracesRoot?: string;
    artifactLimit?: number;
    prototypeRoot?: string;
    selectedRunId?: string;
    configPath?: string;
  } = {},
): Promise<WorkbenchData> {
  const tracesRoot = input.tracesRoot ?? "traces";
  const prototypeRoot = path.resolve(input.prototypeRoot ?? "ui/workbench-prototype");
  const artifactLimit = input.artifactLimit ?? 12;
  const runs = await listRunHistory({ tracesRoot, limit: 8 });
  const selectedRunId = input.selectedRunId || runs[0]?.id;
  const selectedRun = selectedRunId ? await getWorkbenchRun(selectedRunId, tracesRoot) : null;
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
    works: getWorkbenchWorks(runs, selectedRun),
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

function getWorkbenchWorks(runs: RunHistoryItem[], selectedRun: WorkbenchRun | null): WorkbenchWork[] {
  if (runs.length === 0) {
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
  return runs.map((run) => ({
    id: `run-${run.id}`,
    title: getWorkbenchWorkTitle(run, selectedRun),
    description: getWorkbenchWorkDescription(run),
    state: run.state,
    agentId: run.agentId,
    runId: run.id,
    updatedAt: run.startedAt,
    active: run.id === selectedRunId,
  }));
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

export async function buildWorkbenchSettings(
  input: {
    configPath?: string;
    knowledgeBaseConfig?: WorkspaceKnowledgeBaseConfig;
  } = {},
): Promise<WorkbenchSettings> {
  const knowledgeBaseConfig =
    input.knowledgeBaseConfig ?? (await readWorkspaceKnowledgeBaseConfig(input.configPath));

  return {
    nav: [
      {
        id: "overview",
        title: { zh: "架构总览", en: "Overview" },
        description: { zh: "默认配置、继承关系与闭环入口", en: "Defaults, inheritance, and closed loops" },
      },
      {
        id: "models",
        title: { zh: "模型管理", en: "Models" },
        description: { zh: "Provider、角色模型、运行时路由", en: "Providers, model roles, and runtime routing" },
      },
      {
        id: "agent-context",
        title: { zh: "Agent Context", en: "Agent Context" },
        description: { zh: "按 Agent 查看运行上下文装配", en: "Runtime context assembly by agent" },
      },
      {
        id: "knowledge",
        title: { zh: "知识库", en: "Knowledge" },
        description: { zh: "集合、切片、嵌入与产物回流", en: "Collections, chunking, embeddings, and write-back" },
      },
      {
        id: "skills",
        title: { zh: "Skills", en: "Skills" },
        description: { zh: "内置与受控生成 Skill", en: "Builtin and generated skills" },
      },
      {
        id: "tools",
        title: { zh: "工具", en: "Tools" },
        description: { zh: "内置工具与权限边界", en: "Builtin tools and permission boundaries" },
      },
      {
        id: "mcp",
        title: { zh: "MCP", en: "MCP" },
        description: { zh: "外部服务与工具协议", en: "External services and tool protocol" },
      },
      {
        id: "runtime",
        title: { zh: "运行策略", en: "Runtime" },
        description: { zh: "Agent 默认继承与运行时收集", en: "Agent inheritance and runtime collection" },
      },
    ],
    overview: {
      title: { zh: "设置中心不是杂项页，而是 Agent 架构面板", en: "Settings are the architecture control plane" },
      description: {
        zh: "模型、知识库、Skill、Tool 与 MCP 一起构成 Moyu 的可配置运行底座。Agent 默认继承 Workspace 配置，必要时再在运行时按状态采样与覆盖。",
        en: "Models, knowledge bases, skills, tools, and MCP form Moyu's configurable runtime substrate. Agents inherit workspace defaults first, then sample runtime state and override only when needed.",
      },
      highlights: [
        {
          label: { zh: "默认策略", en: "Default mode" },
          value: { zh: "先继承 Workspace，再按 Agent 覆盖", en: "Inherit workspace, then override per agent" },
          note: { zh: "避免把具体模型名写死进 Agent", en: "Avoid hard-coding model ids into agents" },
        },
        {
          label: { zh: "运行时收集", en: "Runtime collection" },
          value: { zh: "记录模型角色、路由命中、知识库来源", en: "Capture model roles, routing hits, and KB sources" },
          note: { zh: "为后续优化默认值与回归定位提供证据", en: "Feed later default tuning and regressions with evidence" },
        },
        {
          label: { zh: "知识闭环", en: "Knowledge loop" },
          value: { zh: "Agent 产物可回流到知识库", en: "Agent artifacts can flow back into knowledge bases" },
          note: { zh: "由集合规则和人工审核共同决定", en: "Governed by collection rules and human review" },
        },
      ],
    },
    providers: [
      {
        id: "openai-compat",
        name: "OpenAI-compatible relay",
        status: "healthy",
        endpoint: "https://relay.example.com/v1",
        defaultFor: ["conversation-primary", "image-generation"],
        models: ["gpt-4.1", "gpt-4.1-mini", "gpt-image-2"],
        note: {
          zh: "当前 v0.1 主链路。对话与生图都可从这里出发。",
          en: "Current v0.1 mainline. Conversation and image generation both start here.",
        },
      },
      {
        id: "anthropic",
        name: "Anthropic",
        status: "degraded",
        endpoint: "https://api.anthropic.com",
        defaultFor: ["planning-reasoning", "meta-agent"],
        models: ["claude-sonnet-4", "claude-opus-4"],
        note: {
          zh: "保留给规划、审稿、元智能体等强推理链路。",
          en: "Reserved for planning, review, and Meta Agent reasoning paths.",
        },
      },
      {
        id: "embedding-provider",
        name: "Embedding provider",
        status: "not_configured",
        endpoint: "workspace/default",
        defaultFor: ["knowledge-embedding"],
        models: ["bge-small-zh-v1.5", "text-embedding-3-large"],
        note: {
          zh: "知识库切片、召回与重建索引的默认来源。",
          en: "Default source for chunking, retrieval, and index rebuilds.",
        },
      },
    ],
    modelRoles: [
      {
        id: "conversation-primary",
        title: { zh: "对话主模型", en: "Conversation primary" },
        description: { zh: "普通 Work 会话、Agent 对话输入解释", en: "General work conversation and agent input interpretation" },
        defaultMode: { zh: "Workspace 默认，可按 Agent 覆盖", en: "Workspace default, overridable per agent" },
        defaultModel: "openai-compat / gpt-4.1",
        fallback: { zh: "降级到 gpt-4.1-mini，并在 Trace 记录原因", en: "Fallback to gpt-4.1-mini with Trace evidence" },
        runtimeSignals: ["prompt_length", "budget_cap", "provider_health"],
      },
      {
        id: "planning-reasoning",
        title: { zh: "规划/推理模型", en: "Planning / reasoning" },
        description: { zh: "Meta-Agent、复杂分解、验收与审稿", en: "Meta Agent, decomposition, review, and acceptance" },
        defaultMode: { zh: "强模型优先", en: "Prefer strong models" },
        defaultModel: "anthropic / claude-sonnet-4",
        fallback: { zh: "若 Provider 降级则提示人工确认", en: "Ask for human confirmation on degraded provider" },
        runtimeSignals: ["task_complexity", "retry_count", "monitor_suggestion"],
      },
      {
        id: "knowledge-embedding",
        title: { zh: "知识库切片/嵌入模型", en: "Knowledge chunking / embedding" },
        description: { zh: "文档切片、向量化、索引更新", en: "Document chunking, embeddings, and index refresh" },
        defaultMode: { zh: "集合级默认配置", en: "Collection-level default" },
        defaultModel: "embedding-provider / text-embedding-3-large",
        fallback: { zh: "不可用时保留待重建队列", en: "Queue for rebuild when unavailable" },
        runtimeSignals: ["mime_type", "chunk_density", "reindex_batch_size"],
      },
      {
        id: "image-generation",
        title: { zh: "生图模型", en: "Image generation" },
        description: { zh: "界面概念图、品牌图、视觉草图", en: "UI concepts, brand visuals, and sketches" },
        defaultMode: { zh: "按 Agent 选择默认 Provider", en: "Agent-selected provider default" },
        defaultModel: "openai-compat / gpt-image-2",
        fallback: { zh: "保留 prompt 与 Trace，允许重试或换 Provider", en: "Keep prompt and Trace for retry or provider switch" },
        runtimeSignals: ["style", "size", "count", "artifact_feedback"],
      },
    ],
    knowledgeBases: toWorkbenchKnowledgeBases(knowledgeBaseConfig),
    skills: [
      {
        id: "image_gen_via_relay",
        title: { zh: "图片中转生成 Skill", en: "Relay image generation skill" },
        state: "enabled",
        scope: { zh: "image-gen/prototype-v1 默认启用", en: "Enabled by default for image-gen/prototype-v1" },
        source: { zh: "agents/*/skills", en: "agents/*/skills" },
        note: { zh: "负责生图协议适配与 artifact 落盘。", en: "Handles image protocol adaptation and artifact persistence." },
      },
      {
        id: "meta-agent-skill-review",
        title: { zh: "Skill 审核流程", en: "Skill review flow" },
        state: "review",
        scope: { zh: "Meta-Agent 现造 Skill 前置", en: "Precondition for generated skills" },
        source: { zh: "受控生成流程", en: "Controlled generation flow" },
        note: { zh: "静态检查、沙箱试跑、人工审核后才可启用。", en: "Enable only after static checks, sandbox dry-run, and human review." },
      },
    ],
    tools: [
      {
        id: "artifact-write",
        title: { zh: "产物写入工具", en: "Artifact write tool" },
        state: "enabled",
        scope: { zh: "所有运行时默认可用", en: "Available to all runtime sessions" },
        source: { zh: "builtin runtime", en: "builtin runtime" },
        note: { zh: "统一落盘并带 Trace 元数据。", en: "Persists files with Trace metadata." },
      },
      {
        id: "trace-open",
        title: { zh: "Trace 打开工具", en: "Trace open tool" },
        state: "enabled",
        scope: { zh: "Workbench 检查器", en: "Workbench inspector" },
        source: { zh: "builtin ui/runtime", en: "builtin ui/runtime" },
        note: { zh: "把运行证据暴露给用户，而不是静默隐藏。", en: "Expose runtime evidence instead of hiding it." },
      },
      {
        id: "knowledge-ingest",
        title: { zh: "知识入库工具", en: "Knowledge ingest tool" },
        state: "planned",
        scope: { zh: "审核通过的 Agent 产物", en: "Reviewed agent artifacts" },
        source: { zh: "planned collection pipeline", en: "planned collection pipeline" },
        note: { zh: "把文档、摘要、图像描述写回知识库。", en: "Write documents, summaries, and image descriptions back to KBs." },
      },
    ],
    mcpServers: [
      {
        id: "filesystem-mcp",
        title: { zh: "Filesystem MCP", en: "Filesystem MCP" },
        state: "review",
        scope: { zh: "受限目录访问", en: "Restricted directory access" },
        source: { zh: "MCP server", en: "MCP server" },
        note: { zh: "用来替代直接暴露任意文件系统能力。", en: "Replaces arbitrary filesystem access with scoped access." },
      },
      {
        id: "web-search-mcp",
        title: { zh: "Web Search MCP", en: "Web Search MCP" },
        state: "planned",
        scope: { zh: "研究型 Agent 与运行时补证", en: "Research agents and runtime evidence gathering" },
        source: { zh: "MCP server", en: "MCP server" },
        note: { zh: "适合可追踪外部搜索，不与主运行链路硬耦合。", en: "Fits traceable external search without hard-coupling the main runtime." },
      },
    ],
    runtimePolicies: [
      {
        id: "inheritance",
        title: { zh: "继承顺序", en: "Inheritance order" },
        value: { zh: "Workspace 默认 → Agent 覆盖 → Run 临时参数", en: "Workspace defaults -> Agent override -> Run parameters" },
        note: { zh: "把稳定配置和即时输入拆开，避免污染 Agent 定义。", en: "Separate stable config from per-run inputs." },
      },
      {
        id: "runtime-capture",
        title: { zh: "运行时收集", en: "Runtime capture" },
        value: { zh: "记录实际模型角色、Provider、知识来源与产物去向", en: "Capture actual model roles, providers, KB sources, and artifact destinations" },
        note: { zh: "没有默认值时，先收集证据再决定沉淀成默认配置。", en: "When defaults are unclear, collect evidence first." },
      },
      {
        id: "artifact-writeback",
        title: { zh: "产物回流知识库", en: "Artifact write-back" },
        value: { zh: "默认关闭，按集合与 Agent 显式开启", en: "Off by default; enable per collection and agent" },
        note: { zh: "避免未经审核的垃圾产物污染知识库。", en: "Prevent noisy artifacts from polluting knowledge bases." },
      },
    ],
    agentDefaults: [
      {
        agentId: "meta/create-agent",
        title: { zh: "元智能体", en: "Meta Agent" },
        modelRoles: ["conversation-primary", "planning-reasoning"],
        knowledgeBases: ["workspace-product"],
        skills: ["meta-agent-skill-review"],
        tools: ["artifact-write", "trace-open"],
        mcpServers: ["filesystem-mcp"],
        runtimeMode: { zh: "强制记录路由决定与生成来源", en: "Always capture routing decisions and generation sources" },
      },
      {
        agentId: "image-gen/prototype-v1",
        title: { zh: "生图原型 Agent", en: "Image Prototype Agent" },
        modelRoles: ["conversation-primary", "image-generation"],
        knowledgeBases: ["workspace-visual"],
        skills: ["image_gen_via_relay"],
        tools: ["artifact-write"],
        mcpServers: [],
        runtimeMode: { zh: "记录 prompt、尺寸、风格与反馈信号", en: "Capture prompt, size, style, and feedback signals" },
      },
    ],
    agentContexts: [
      {
        agentId: "meta/create-agent",
        title: { zh: "元智能体上下文", en: "Meta Agent context" },
        purpose: {
          zh: "把自然语言需求转为 Agent 草案、审核材料和安装动作。",
          en: "Turn natural-language requirements into agent drafts, review materials, and install actions.",
        },
        assemblyMode: {
          zh: "Workspace 默认 + 元智能体强推理覆盖 + 文件系统 MCP 待审核",
          en: "Workspace defaults + Meta Agent reasoning override + filesystem MCP in review",
        },
        modelRoles: ["conversation-primary", "planning-reasoning"],
        knowledgeBases: ["workspace-product"],
        skills: ["meta-agent-skill-review"],
        tools: ["artifact-write", "trace-open"],
        mcpServers: ["filesystem-mcp"],
        runtimeEvidence: ["model_role", "provider", "draft_source", "install_state", "artifact_ids"],
        artifactPolicy: {
          zh: "Agent 草案先作为 Artifact 存证，人工确认后才安装到 agents/。",
          en: "Agent drafts are stored as artifacts first, then installed into agents/ after human approval.",
        },
        note: {
          zh: "借鉴 Yuxi 的 Harness 装配思路，但保留 Moyu 的本地文件与审核闭环。",
          en: "Borrow the Harness assembly idea while keeping Moyu's local files and review loop.",
        },
      },
      {
        agentId: "image-gen/prototype-v1",
        title: { zh: "生图 Agent 上下文", en: "Image Agent context" },
        purpose: {
          zh: "根据提示词生成 UI 概念图，并保存图片、Trace 与提示词。",
          en: "Generate UI concept images from prompts and persist images, traces, and prompts.",
        },
        assemblyMode: {
          zh: "Agent 继承 Workspace 对话模型，覆盖生图模型与视觉知识库。",
          en: "Agent inherits the workspace conversation model and overrides image model plus visual KB.",
        },
        modelRoles: ["conversation-primary", "image-generation"],
        knowledgeBases: ["workspace-visual"],
        skills: ["image_gen_via_relay"],
        tools: ["artifact-write"],
        mcpServers: [],
        runtimeEvidence: ["prompt", "size", "style", "count", "image_model", "artifact_feedback"],
        artifactPolicy: {
          zh: "默认只写 Artifact；被采纳的设计稿可经审核回流视觉知识库。",
          en: "Write artifacts by default; accepted drafts may flow back to the visual KB after review.",
        },
        note: {
          zh: "先保持轻量原型，不引入知识图谱或异步 Worker。",
          en: "Keep the prototype lightweight first; no knowledge graph or async worker yet.",
        },
      },
    ],
  };
}

function toWorkbenchKnowledgeBases(config: WorkspaceKnowledgeBaseConfig): WorkbenchKnowledgeBase[] {
  return Object.values(config.knowledgeBases).map(toWorkbenchKnowledgeBase);
}

function toWorkbenchKnowledgeBase(collection: KnowledgeBaseConfig): WorkbenchKnowledgeBase {
  return {
    id: collection.id,
    title: collection.title,
    state: collection.state,
    embeddingRole: collection.embeddingRole,
    chunkStrategy: collection.chunkStrategy,
    connectedAgents: collection.connectedAgents,
    sources: collection.sources,
    writeBackEnabled: collection.writeBack.enabled,
    writeBack: collection.writeBack.policy,
    allowedArtifactTypes: collection.writeBack.allowedArtifactTypes,
  };
}
