import type { WorkbenchModelRole, WorkbenchProvider } from "../types.js";
import { DEFAULT_MODEL_ROLES } from "./model-roles.js";
import { listModelRoles, listProviders, type SqliteSettingsPaths } from "../store/sqlite.js";

export async function getWorkbenchProviders(paths: SqliteSettingsPaths = {}): Promise<WorkbenchProvider[]> {
  const providers = await listProviders(paths);
  return providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    status: provider.baseUrl && provider.secretConfigured ? "healthy" : "not_configured",
    endpoint: provider.baseUrl,
    defaultFor: provider.defaultFor,
    models: provider.models,
    secretConfigured: provider.secretConfigured,
    note: {
      zh: provider.secretConfigured ? "来自本地 SQLite Settings，加密 key 已配置。" : "来自本地 SQLite Settings，尚未配置加密 key。",
      en: provider.secretConfigured
        ? "Loaded from local SQLite settings with an encrypted key."
        : "Loaded from local SQLite settings without an encrypted key.",
    },
  }));
}

export async function getWorkbenchModelRoles(paths: SqliteSettingsPaths = {}): Promise<WorkbenchModelRole[]> {
  const configuredRoles = await listModelRoles(paths);
  const configuredById = new Map(configuredRoles.map((role) => [role.id, role]));
  return Object.entries(DEFAULT_MODEL_ROLES).map(([roleId]) => {
    const configured = configuredById.get(roleId);
    const provider = configured?.providerId;
    const model = configured?.model;
    const fallbackModel = configured?.fallbackModel;
    return {
      id: roleId,
      ...getRoleCopy(roleId),
      defaultModel: provider && model ? `${provider} / ${model}` : "未配置 / Not configured",
      providerId: provider,
      model,
      fallbackModel: fallbackModel || null,
      configured: Boolean(configured),
      fallback: fallbackModel && configured
        ? {
            zh: `可降级到 ${fallbackModel}，并在 Trace 记录原因`,
            en: `Fallback to ${fallbackModel} with Trace evidence`,
          }
        : configured
          ? { zh: "无自动降级模型", en: "No automatic fallback model" }
          : {
              zh: "尚未在 SQLite Settings 配置真实模型。",
              en: "No real model configured in SQLite settings.",
            },
    };
  });
}

function getRoleCopy(roleId: string) {
  const copy: Record<string, Omit<WorkbenchModelRole, "id" | "defaultModel" | "fallback">> = {
    "conversation-primary": {
      title: { zh: "对话主模型", en: "Conversation primary" },
      description: { zh: "普通 Work 会话、Agent 对话输入解释", en: "General work conversation and agent input interpretation" },
      defaultMode: { zh: "Workspace 默认，可按 Agent 覆盖", en: "Workspace default, overridable per agent" },
      runtimeSignals: ["prompt_length", "budget_cap", "provider_health"],
    },
    "planning-reasoning": {
      title: { zh: "规划/推理模型", en: "Planning / reasoning" },
      description: { zh: "Meta-Agent、复杂分解、验收与审稿", en: "Meta Agent, decomposition, review, and acceptance" },
      defaultMode: { zh: "强模型优先", en: "Prefer strong models" },
      runtimeSignals: ["task_complexity", "retry_count", "monitor_suggestion"],
    },
    "knowledge-embedding": {
      title: { zh: "知识库切片/嵌入模型", en: "Knowledge chunking / embedding" },
      description: { zh: "文档切片、向量化、索引更新", en: "Document chunking, embeddings, and index refresh" },
      defaultMode: { zh: "集合级默认配置", en: "Collection-level default" },
      runtimeSignals: ["mime_type", "chunk_density", "reindex_batch_size"],
    },
    "image-generation": {
      title: { zh: "生图模型", en: "Image generation" },
      description: { zh: "界面概念图、品牌图、视觉草图", en: "UI concepts, brand visuals, and sketches" },
      defaultMode: { zh: "按 Agent 选择默认 Provider", en: "Agent-selected provider default" },
      runtimeSignals: ["style", "size", "count", "artifact_feedback"],
    },
  };
  return copy[roleId] || {
    title: { zh: roleId, en: roleId },
    description: { zh: "自定义模型角色", en: "Custom model role" },
    defaultMode: { zh: "Workspace 配置", en: "Workspace configured" },
    runtimeSignals: [],
  };
}
