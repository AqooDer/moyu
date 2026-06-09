import type { LocalizedText, WorkbenchCapability, WorkbenchRuntimePolicy } from "../settings/types.js";

export type PluginCapabilityKind = "skill" | "tool" | "mcp" | "previewer" | "middleware";
export type PluginCapabilityState = "enabled" | "review" | "planned";
export type PluginSourceType = "builtin" | "agent_local" | "controlled_generated" | "mcp_server" | "planned";
export type PluginRiskLevel = "low" | "medium" | "high";

export interface PluginPermissionDeclaration {
  id: string;
  title: LocalizedText;
  boundary: LocalizedText;
  approval: LocalizedText;
  riskLevel: PluginRiskLevel;
}

export interface PluginCapabilityRecord {
  id: string;
  kind: PluginCapabilityKind;
  title: LocalizedText;
  state: PluginCapabilityState;
  sourceType: PluginSourceType;
  scope: LocalizedText;
  source: LocalizedText;
  permissionIds: string[];
  defaultEnabledFor: string[];
  note: LocalizedText;
}

export interface PluginRuntimePolicyRecord {
  id: string;
  title: LocalizedText;
  value: LocalizedText;
  note: LocalizedText;
  permissionIds: string[];
}

export interface PluginRegistrySnapshot {
  schemaVersion: 1;
  generatedAt: string;
  capabilities: PluginCapabilityRecord[];
  permissions: PluginPermissionDeclaration[];
  runtimePolicies: PluginRuntimePolicyRecord[];
  summary: PluginRegistrySummary;
}

export interface PluginRegistrySummary {
  total: number;
  enabled: number;
  review: number;
  planned: number;
  highRisk: number;
  byKind: Record<PluginCapabilityKind, number>;
}

const permissions: PluginPermissionDeclaration[] = [
  {
    id: "artifact.write.scoped",
    title: { zh: "受限产物写入", en: "Scoped artifact write" },
    boundary: {
      zh: "只能写入 Runtime 分配的 Artifact 路径，并记录 Trace 元数据。",
      en: "Can write only to runtime-assigned artifact paths and must record trace metadata.",
    },
    approval: { zh: "内置工具默认启用，无需逐项审核。", en: "Builtin tool enabled by default; no per-run approval required." },
    riskLevel: "low",
  },
  {
    id: "trace.read.registered",
    title: { zh: "已登记 Trace 读取", en: "Registered trace read" },
    boundary: {
      zh: "只打开当前 Workspace 内已登记的 Trace 文件，不接受任意路径。",
      en: "Can open only registered trace files inside the current workspace; arbitrary paths are not accepted.",
    },
    approval: { zh: "内置只读检查工具默认启用。", en: "Builtin read-only inspection tool enabled by default." },
    riskLevel: "low",
  },
  {
    id: "provider.image.call",
    title: { zh: "图片 Provider 调用", en: "Image provider call" },
    boundary: {
      zh: "仅允许读取当前 Agent 输入、调用配置好的图片中转 Provider，并写入本次 Run 的 Artifact 目录。",
      en: "May read current agent input, call the configured image relay provider, and write only to this run's artifact directory.",
    },
    approval: {
      zh: "随 Agent Manifest 一起审核；启用范围由 Agent 装配声明决定。",
      en: "Reviewed with the Agent manifest; enablement is scoped by agent assembly declarations.",
    },
    riskLevel: "medium",
  },
  {
    id: "skill.generated.review",
    title: { zh: "生成 Skill 审核", en: "Generated skill review" },
    boundary: {
      zh: "生成的 Skill 默认不可执行；必须先通过静态检查、沙箱试跑和人工审核。",
      en: "Generated skills are not executable by default; they must pass static checks, sandbox dry-run, and human review first.",
    },
    approval: {
      zh: "人工审核通过后才可从 review 状态切换到 enabled。",
      en: "Human approval is required before moving from review to enabled.",
    },
    riskLevel: "high",
  },
  {
    id: "filesystem.scoped",
    title: { zh: "受限文件系统访问", en: "Scoped filesystem access" },
    boundary: {
      zh: "只允许访问用户显式授权的 Workspace 路径，禁止默认暴露全盘文件系统。",
      en: "May access only explicitly authorized workspace paths; full filesystem exposure is blocked by default.",
    },
    approval: { zh: "启用前需要用户确认目录白名单。", en: "User must approve directory allowlists before enabling." },
    riskLevel: "high",
  },
  {
    id: "network.search.traceable",
    title: { zh: "可追踪外部搜索", en: "Traceable external search" },
    boundary: {
      zh: "只允许可追踪的外部搜索调用，结果必须进入 Trace 或 Artifact 证据链。",
      en: "Allows only traceable external search calls; results must be captured in trace or artifact evidence.",
    },
    approval: { zh: "接入前需要声明网络域名范围和引用记录策略。", en: "Domain scope and citation policy must be declared before integration." },
    riskLevel: "medium",
  },
  {
    id: "artifact.preview.read",
    title: { zh: "产物预览读取", en: "Artifact preview read" },
    boundary: {
      zh: "只能读取已登记 Artifact，文本截断预览，HTML 按源码展示且不执行。",
      en: "Can read only registered artifacts, text is truncated, and HTML is shown as source without execution.",
    },
    approval: { zh: "内置只读预览默认启用。", en: "Builtin read-only preview is enabled by default." },
    riskLevel: "low",
  },
  {
    id: "knowledge.writeback.reviewed",
    title: { zh: "审核后知识回流", en: "Reviewed knowledge write-back" },
    boundary: {
      zh: "只能处理已审核的 Artifact，并受知识库集合 allowedArtifactTypes 约束。",
      en: "Can process only reviewed artifacts and must obey each collection's allowedArtifactTypes policy.",
    },
    approval: { zh: "每次入库都需要审核人、审核说明和目标集合记录。", en: "Each ingestion requires reviewer, review note, and target collection records." },
    riskLevel: "medium",
  },
  {
    id: "middleware.context.inject",
    title: { zh: "上下文注入", en: "Context injection" },
    boundary: {
      zh: "只能把已授权附件、历史摘要或知识片段注入当前 Work 上下文。",
      en: "May inject only authorized attachments, history summaries, or knowledge snippets into the current work context.",
    },
    approval: { zh: "当前为规划中能力，启用前需要记录注入来源。", en: "Planned capability; enablement requires recording injection sources." },
    riskLevel: "medium",
  },
];

const capabilities: PluginCapabilityRecord[] = [
  {
    id: "image_gen_via_relay",
    kind: "skill",
    title: { zh: "图片中转生成 Skill", en: "Relay image generation skill" },
    state: "enabled",
    sourceType: "agent_local",
    scope: { zh: "image-gen/prototype-v1 默认启用", en: "Enabled by default for image-gen/prototype-v1" },
    source: { zh: "agents/*/skills", en: "agents/*/skills" },
    permissionIds: ["provider.image.call", "artifact.write.scoped"],
    defaultEnabledFor: ["image-gen/prototype-v1"],
    note: { zh: "负责生图协议适配与 artifact 落盘。", en: "Handles image protocol adaptation and artifact persistence." },
  },
  {
    id: "meta-agent-skill-review",
    kind: "skill",
    title: { zh: "Skill 审核流程", en: "Skill review flow" },
    state: "review",
    sourceType: "controlled_generated",
    scope: { zh: "Meta-Agent 现造 Skill 前置", en: "Precondition for generated skills" },
    source: { zh: "受控生成流程", en: "Controlled generation flow" },
    permissionIds: ["skill.generated.review"],
    defaultEnabledFor: ["meta/create-agent"],
    note: { zh: "静态检查、沙箱试跑、人工审核后才可启用。", en: "Enable only after static checks, sandbox dry-run, and human review." },
  },
  {
    id: "artifact-write",
    kind: "tool",
    title: { zh: "产物写入工具", en: "Artifact write tool" },
    state: "enabled",
    sourceType: "builtin",
    scope: { zh: "所有运行时默认可用", en: "Available to all runtime sessions" },
    source: { zh: "builtin runtime", en: "builtin runtime" },
    permissionIds: ["artifact.write.scoped"],
    defaultEnabledFor: ["meta/create-agent", "image-gen/prototype-v1"],
    note: { zh: "统一落盘并带 Trace 元数据。", en: "Persists files with Trace metadata." },
  },
  {
    id: "trace-open",
    kind: "tool",
    title: { zh: "Trace 打开工具", en: "Trace open tool" },
    state: "enabled",
    sourceType: "builtin",
    scope: { zh: "Workbench 检查器", en: "Workbench inspector" },
    source: { zh: "builtin ui/runtime", en: "builtin ui/runtime" },
    permissionIds: ["trace.read.registered"],
    defaultEnabledFor: ["meta/create-agent"],
    note: { zh: "把运行证据暴露给用户，而不是静默隐藏。", en: "Expose runtime evidence instead of hiding it." },
  },
  {
    id: "knowledge-ingest",
    kind: "tool",
    title: { zh: "知识入库工具", en: "Knowledge ingest tool" },
    state: "planned",
    sourceType: "planned",
    scope: { zh: "审核通过的 Agent 产物", en: "Reviewed agent artifacts" },
    source: { zh: "planned collection pipeline", en: "planned collection pipeline" },
    permissionIds: ["knowledge.writeback.reviewed"],
    defaultEnabledFor: [],
    note: { zh: "把文档、摘要、图像描述写回知识库。", en: "Write documents, summaries, and image descriptions back to KBs." },
  },
  {
    id: "filesystem-mcp",
    kind: "mcp",
    title: { zh: "Filesystem MCP", en: "Filesystem MCP" },
    state: "review",
    sourceType: "mcp_server",
    scope: { zh: "受限目录访问", en: "Restricted directory access" },
    source: { zh: "MCP server", en: "MCP server" },
    permissionIds: ["filesystem.scoped"],
    defaultEnabledFor: ["meta/create-agent"],
    note: { zh: "用来替代直接暴露任意文件系统能力。", en: "Replaces arbitrary filesystem access with scoped access." },
  },
  {
    id: "web-search-mcp",
    kind: "mcp",
    title: { zh: "Web Search MCP", en: "Web Search MCP" },
    state: "planned",
    sourceType: "mcp_server",
    scope: { zh: "研究型 Agent 与运行时补证", en: "Research agents and runtime evidence gathering" },
    source: { zh: "MCP server", en: "MCP server" },
    permissionIds: ["network.search.traceable"],
    defaultEnabledFor: [],
    note: { zh: "适合可追踪外部搜索，不与主运行链路硬耦合。", en: "Fits traceable external search without hard-coupling the main runtime." },
  },
  {
    id: "artifact-preview-v1",
    kind: "previewer",
    title: { zh: "Artifact Previewer v1", en: "Artifact Previewer v1" },
    state: "enabled",
    sourceType: "builtin",
    scope: { zh: "已登记 Artifact", en: "Registered artifacts" },
    source: { zh: "builtin runtime previewer", en: "builtin runtime previewer" },
    permissionIds: ["artifact.preview.read"],
    defaultEnabledFor: ["meta/create-agent", "image-gen/prototype-v1"],
    note: { zh: "支持文本、图片和二进制元数据预览。", en: "Supports text, image, and binary metadata previews." },
  },
  {
    id: "context-pack-middleware",
    kind: "middleware",
    title: { zh: "上下文打包 Middleware", en: "Context packing middleware" },
    state: "planned",
    sourceType: "planned",
    scope: { zh: "附件、历史摘要与 RAG 注入", en: "Attachments, history summaries, and RAG injection" },
    source: { zh: "planned middleware pipeline", en: "planned middleware pipeline" },
    permissionIds: ["middleware.context.inject"],
    defaultEnabledFor: [],
    note: { zh: "后续负责把文件解析、历史压缩和知识检索统一注入对话。", en: "Will unify file parsing, history compression, and knowledge retrieval injection." },
  },
];

const runtimePolicies: PluginRuntimePolicyRecord[] = [
  {
    id: "inheritance",
    title: { zh: "继承顺序", en: "Inheritance order" },
    value: { zh: "Workspace 默认 → Agent 覆盖 → Run 临时参数", en: "Workspace defaults -> Agent override -> Run parameters" },
    note: { zh: "把稳定配置和即时输入拆开，避免污染 Agent 定义。", en: "Separate stable config from per-run inputs." },
    permissionIds: [],
  },
  {
    id: "runtime-capture",
    title: { zh: "运行时收集", en: "Runtime capture" },
    value: { zh: "记录实际模型角色、Provider、知识来源与产物去向", en: "Capture actual model roles, providers, KB sources, and artifact destinations" },
    note: { zh: "没有默认值时，先收集证据再决定沉淀成默认配置。", en: "When defaults are unclear, collect evidence first." },
    permissionIds: [],
  },
  {
    id: "artifact-writeback",
    title: { zh: "产物回流知识库", en: "Artifact write-back" },
    value: { zh: "默认关闭，按集合与 Agent 显式开启", en: "Off by default; enable per collection and agent" },
    note: { zh: "避免未经审核的垃圾产物污染知识库。", en: "Prevent noisy artifacts from polluting knowledge bases." },
    permissionIds: ["knowledge.writeback.reviewed"],
  },
  {
    id: "plugin-permission-first",
    title: { zh: "插件权限优先", en: "Plugin permission first" },
    value: { zh: "所有外接能力先声明权限，再进入 Agent 装配", en: "External capabilities declare permissions before agent assembly" },
    note: { zh: "当前只做 registry 声明，不执行真实安装或逐次审批。", en: "Current phase records registry declarations only; no install flow or per-call approval yet." },
    permissionIds: ["filesystem.scoped", "network.search.traceable", "artifact.preview.read"],
  },
];

export function listPluginCapabilities(input: { kind?: PluginCapabilityKind; state?: PluginCapabilityState } = {}) {
  return capabilities
    .filter((item) => !input.kind || item.kind === input.kind)
    .filter((item) => !input.state || item.state === input.state)
    .map(cloneCapability);
}

export function listPluginPermissions() {
  return permissions.map((permission) => ({ ...permission }));
}

export function listPluginRuntimePolicies() {
  return runtimePolicies.map((policy) => ({ ...policy, permissionIds: [...policy.permissionIds] }));
}

export function buildPluginRegistrySnapshot(): PluginRegistrySnapshot {
  const capabilityRecords = listPluginCapabilities();
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    capabilities: capabilityRecords,
    permissions: listPluginPermissions(),
    runtimePolicies: listPluginRuntimePolicies(),
    summary: summarizeCapabilities(capabilityRecords),
  };
}

export function toWorkbenchCapability(record: PluginCapabilityRecord): WorkbenchCapability {
  const resolvedPermissions = resolvePermissions(record.permissionIds);
  const primaryPermission = resolvedPermissions[0];
  const riskLevel = highestRisk(resolvedPermissions.map((permission) => permission.riskLevel));
  return {
    id: record.id,
    title: record.title,
    state: record.state,
    sourceType: record.sourceType,
    scope: record.scope,
    source: record.source,
    permissionBoundary: primaryPermission?.boundary ?? emptyText(),
    approval: primaryPermission?.approval ?? emptyText(),
    defaultEnabledFor: [...record.defaultEnabledFor],
    riskLevel,
    note: record.note,
    kind: record.kind,
    permissionIds: [...record.permissionIds],
  };
}

export function toWorkbenchRuntimePolicy(record: PluginRuntimePolicyRecord): WorkbenchRuntimePolicy {
  return {
    id: record.id,
    title: record.title,
    value: record.value,
    note: record.note,
    permissionIds: [...record.permissionIds],
  };
}

function summarizeCapabilities(records: PluginCapabilityRecord[]): PluginRegistrySummary {
  return {
    total: records.length,
    enabled: records.filter((item) => item.state === "enabled").length,
    review: records.filter((item) => item.state === "review").length,
    planned: records.filter((item) => item.state === "planned").length,
    highRisk: records.filter((item) => {
      const resolvedPermissions = resolvePermissions(item.permissionIds);
      return highestRisk(resolvedPermissions.map((permission) => permission.riskLevel)) === "high";
    }).length,
    byKind: {
      skill: records.filter((item) => item.kind === "skill").length,
      tool: records.filter((item) => item.kind === "tool").length,
      mcp: records.filter((item) => item.kind === "mcp").length,
      previewer: records.filter((item) => item.kind === "previewer").length,
      middleware: records.filter((item) => item.kind === "middleware").length,
    },
  };
}

function resolvePermissions(permissionIds: string[]) {
  return permissionIds
    .map((id) => permissions.find((permission) => permission.id === id))
    .filter((item): item is PluginPermissionDeclaration => Boolean(item));
}

function highestRisk(risks: PluginRiskLevel[]): PluginRiskLevel {
  if (risks.includes("high")) {
    return "high";
  }
  if (risks.includes("medium")) {
    return "medium";
  }
  return "low";
}

function cloneCapability(record: PluginCapabilityRecord): PluginCapabilityRecord {
  return {
    ...record,
    permissionIds: [...record.permissionIds],
    defaultEnabledFor: [...record.defaultEnabledFor],
  };
}

function emptyText(): LocalizedText {
  return { zh: "", en: "" };
}
