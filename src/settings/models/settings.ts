import type { WorkbenchModelRole, WorkbenchProvider } from "../types.js";

export function getWorkbenchProviders(): WorkbenchProvider[] {
  return [
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
  ];
}

export function getWorkbenchModelRoles(): WorkbenchModelRole[] {
  return [
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
  ];
}
