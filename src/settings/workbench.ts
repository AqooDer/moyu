import {
  readWorkspaceKnowledgeBaseConfig,
  type WorkspaceKnowledgeBaseConfig,
} from "./knowledge/knowledge-bases.js";
import { getWorkbenchKnowledgeBases } from "./knowledge/settings.js";
import { getWorkbenchMcpServers } from "./mcp/settings.js";
import { getWorkbenchModelRoles, getWorkbenchProviders } from "./models/settings.js";
import {
  getWorkbenchAgentContexts,
  getWorkbenchAgentDefaults,
  getWorkbenchMiddlewares,
  getWorkbenchPreviewers,
  getWorkbenchRuntimePolicies,
} from "./runtime/settings.js";
import { getWorkbenchSkills } from "./skills/settings.js";
import { getWorkbenchTools } from "./tools/settings.js";
import type { WorkbenchSettings } from "./types.js";
import { buildPluginRegistrySnapshot } from "../plugins/registry.js";
import type { SqliteSettingsPaths } from "./store/sqlite.js";

export type { WorkbenchSettings } from "./types.js";

export async function buildWorkbenchSettings(
  input: {
    configPath?: string;
    settingsStore?: SqliteSettingsPaths;
    knowledgeBaseConfig?: WorkspaceKnowledgeBaseConfig;
  } = {},
): Promise<WorkbenchSettings> {
  const knowledgeBaseConfig =
    input.knowledgeBaseConfig ?? (await readWorkspaceKnowledgeBaseConfig(input.configPath));
  const pluginRegistry = buildPluginRegistrySnapshot();

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
    pluginRegistry: pluginRegistry.summary,
    providers: await getWorkbenchProviders(input.settingsStore),
    modelRoles: await getWorkbenchModelRoles(input.settingsStore),
    knowledgeBases: getWorkbenchKnowledgeBases(knowledgeBaseConfig),
    skills: getWorkbenchSkills(),
    tools: getWorkbenchTools(),
    mcpServers: getWorkbenchMcpServers(),
    previewers: getWorkbenchPreviewers(),
    middlewares: getWorkbenchMiddlewares(),
    runtimePolicies: getWorkbenchRuntimePolicies(),
    agentDefaults: getWorkbenchAgentDefaults(),
    agentContexts: getWorkbenchAgentContexts(),
  };
}
