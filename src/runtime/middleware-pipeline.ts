import type { MiddlewarePipelineRecord, MiddlewareStageRecord, McpServerResolution } from "./types.js";

export interface CreateMiddlewarePipelineInput {
  runId: string;
  workId: string;
  title: string;
  stages: Array<Omit<MiddlewareStageRecord, "capabilityIds" | "policyIds" | "sources"> & {
    capabilityIds?: string[];
    policyIds?: string[];
    sources?: string[];
  }>;
  createdAt?: string;
}

export function createMiddlewarePipelineRecord(
  input: CreateMiddlewarePipelineInput,
): MiddlewarePipelineRecord {
  const createdAt = input.createdAt || new Date().toISOString();
  const stages = input.stages.map((stage) => ({
    id: stage.id,
    title: stage.title,
    kind: stage.kind,
    state: stage.state,
    capabilityIds: stage.capabilityIds ?? [],
    policyIds: stage.policyIds ?? [],
    inputSummary: stage.inputSummary,
    outputSummary: stage.outputSummary,
    sources: stage.sources ?? [],
  }));
  return {
    id: `middleware-${input.runId}`,
    runId: input.runId,
    workId: input.workId,
    title: input.title,
    state: summarizePipelineState(stages),
    stages,
    createdAt,
    updatedAt: createdAt,
  };
}

export function createMetaAgentMiddlewarePipeline(input: {
  runId: string;
  workId: string;
  prompt: string;
  targetAgentId: string;
  persist: boolean;
  createdAt?: string;
}) {
  return createMiddlewarePipelineRecord({
    runId: input.runId,
    workId: input.workId,
    title: "Meta-Agent 上下文装配管线",
    createdAt: input.createdAt,
    stages: [
      {
        id: "attachment-intake",
        title: "附件入口",
        kind: "attachment-intake",
        state: "skipped",
        capabilityIds: ["context-pack-middleware"],
        policyIds: ["middleware.context.inject"],
        inputSummary: "本次创建请求未携带上传附件。",
        outputSummary: "上下文仅使用用户自然语言需求。",
        sources: [],
      },
      {
        id: "history-summary",
        title: "历史摘要",
        kind: "history-summary",
        state: "ready",
        capabilityIds: ["context-pack-middleware"],
        policyIds: ["middleware.context.inject"],
        inputSummary: `接收 ${input.prompt.length} 字符的创建需求。`,
        outputSummary: `锁定目标 Agent ${input.targetAgentId}，创建模式 ${input.persist ? "persist" : "draft"}。`,
        sources: ["work-store"],
      },
      {
        id: "knowledge-context",
        title: "知识上下文",
        kind: "knowledge-context",
        state: "planned",
        capabilityIds: ["context-pack-middleware"],
        policyIds: ["middleware.context.inject"],
        inputSummary: "当前未执行真实知识检索。",
        outputSummary: "后续接入 Agent contract、Skill 模板和项目知识库。",
        sources: ["planned-rag"],
      },
      {
        id: "capability-injection",
        title: "能力注入",
        kind: "capability-injection",
        state: "ready",
        capabilityIds: [
          "meta-agent-skill-review",
          "artifact-write",
          "artifact-preview-v1",
          "context-pack-middleware",
          "filesystem-mcp",
        ],
        policyIds: [
          "skill.generated.review",
          "artifact.write.scoped",
          "artifact.preview.read",
          "middleware.context.inject",
          "filesystem.scoped",
        ],
        inputSummary: "从 Plugin Registry 读取 Meta-Agent 默认能力声明。",
        outputSummary: "注入草案生成、Artifact 写入、预览和待审核 filesystem MCP 能力快照。",
        sources: ["plugin-registry"],
      },
    ],
  });
}

export function createImageAgentMiddlewarePipeline(input: {
  runId: string;
  workId: string;
  prompt: string;
  mcpServers: McpServerResolution[];
  dryRun: boolean;
  createdAt?: string;
}) {
  const mcpIds = input.mcpServers.map((server) => server.id);
  return createMiddlewarePipelineRecord({
    runId: input.runId,
    workId: input.workId,
    title: "Agent 运行上下文装配管线",
    createdAt: input.createdAt,
    stages: [
      {
        id: "attachment-intake",
        title: "附件入口",
        kind: "attachment-intake",
        state: "skipped",
        capabilityIds: ["context-pack-middleware"],
        policyIds: ["middleware.context.inject"],
        inputSummary: "本次 Agent 运行未携带上传附件。",
        outputSummary: "图片生成仅使用对话 prompt 与运行参数。",
        sources: [],
      },
      {
        id: "history-summary",
        title: "历史摘要",
        kind: "history-summary",
        state: "ready",
        capabilityIds: ["context-pack-middleware"],
        policyIds: ["middleware.context.inject"],
        inputSummary: `读取当前 prompt，长度 ${input.prompt.length} 字符。`,
        outputSummary: "形成单轮运行摘要，后续可接入跨轮压缩记忆。",
        sources: ["work-store"],
      },
      {
        id: "knowledge-context",
        title: "知识上下文",
        kind: "knowledge-context",
        state: "planned",
        capabilityIds: ["context-pack-middleware", "knowledge-ingest"],
        policyIds: ["middleware.context.inject", "knowledge.writeback.reviewed"],
        inputSummary: "当前未执行真实 RAG 检索。",
        outputSummary: "保留知识注入位置，后续支持引用片段和文件解析结果。",
        sources: ["planned-rag"],
      },
      {
        id: "capability-injection",
        title: "能力注入",
        kind: "capability-injection",
        state: "ready",
        capabilityIds: [
          "image_gen_via_relay",
          "artifact-write",
          "artifact-preview-v1",
          "context-pack-middleware",
          ...mcpIds,
        ],
        policyIds: [
          "provider.image.call",
          "artifact.write.scoped",
          "artifact.preview.read",
          "middleware.context.inject",
          ...input.mcpServers.flatMap((server) => server.permissions),
        ],
        inputSummary: "从 Agent manifest、模型角色和 Plugin Registry 读取运行能力。",
        outputSummary: mcpIds.length > 0
          ? `注入生图 Skill、Artifact 服务和 MCP 能力：${mcpIds.join(", ")}。`
          : `注入生图 Skill 和 Artifact 服务；${input.dryRun ? "dry-run 跳过 Provider 调用" : "准备调用 Provider"}。`,
        sources: ["agent-manifest", "plugin-registry"],
      },
    ],
  });
}

export function formatMiddlewarePipelineSummary(pipeline: MiddlewarePipelineRecord | null | undefined) {
  if (!pipeline) {
    return null;
  }

  const lines = [`上下文管线：${pipeline.title}`];
  for (const [index, stage] of pipeline.stages.entries()) {
    lines.push(`${index + 1}. ${stage.title} [${stage.state}]：${stage.outputSummary}`);
  }
  return lines.join("\n");
}

function summarizePipelineState(stages: MiddlewareStageRecord[]): MiddlewarePipelineRecord["state"] {
  if (stages.some((stage) => stage.state === "failed")) {
    return "failed";
  }
  if (stages.some((stage) => stage.state === "partial" || stage.state === "planned")) {
    return "partial";
  }
  if (stages.length > 0 && stages.every((stage) => stage.state === "skipped")) {
    return "skipped";
  }
  return "ready";
}
