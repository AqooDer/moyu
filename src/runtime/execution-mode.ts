import type {
  ExecutionCapabilityRecord,
  ExecutionCapabilityState,
  ExecutionMode,
  ExecutionModeRecord,
  McpServerResolution,
  RunRecord,
  WorkerJobMode,
} from "./types.js";

export interface CreateExecutionModeRecordInput {
  run: RunRecord;
  title: string;
  mode: ExecutionMode;
  dispatch: WorkerJobMode;
  queue: string;
  entrypoint: string;
  requestedBy: string;
  dryRunEffective: boolean;
  reason: string;
  capabilities: ExecutionCapabilityRecord[];
  constraints?: string[];
  replayOfRunId?: string | null;
  createdAt?: string;
}

export function createExecutionModeRecord(input: CreateExecutionModeRecordInput): ExecutionModeRecord {
  const timestamp = input.createdAt ?? new Date().toISOString();
  return {
    id: `execution-${input.run.id}`,
    runId: input.run.id,
    workId: input.run.workId || `work-${input.run.id}`,
    title: input.title,
    mode: input.mode,
    dispatch: input.dispatch,
    queue: input.queue,
    entrypoint: input.entrypoint,
    requestedBy: input.requestedBy,
    dryRunRequested: input.run.dryRun,
    dryRunEffective: input.dryRunEffective,
    replayOfRunId: input.replayOfRunId ?? null,
    reason: input.reason,
    capabilities: input.capabilities,
    constraints: input.constraints ?? [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createImageAgentExecutionMode(input: {
  run: RunRecord;
  providerConfigured: boolean;
  mcpServers: McpServerResolution[];
  createdAt?: string;
}) {
  const dryRunEffective = input.run.dryRun || !input.providerConfigured;
  const mode: ExecutionMode = dryRunEffective ? "dry_run" : "live";
  const reason = input.run.dryRun
    ? "用户请求 dry-run，跳过外部图片 Provider 调用。"
    : input.providerConfigured
      ? "Provider 配置已就绪，本次按 live 模式调用外部图片能力。"
      : "图片 Provider 配置缺失，本次自动降级为 effective dry-run。";

  return createExecutionModeRecord({
    run: input.run,
    title: "Agent 运行执行模式",
    mode,
    dispatch: "inline",
    queue: "agent.run.inline",
    entrypoint: "agent.run.image",
    requestedBy: input.run.agentId,
    dryRunEffective,
    reason,
    createdAt: input.createdAt,
    capabilities: [
      capability(
        "conversation-orchestrator",
        "Conversation Orchestrator",
        "enabled",
        "Plan、Work 对话和 Trace 由框架层统一记录。",
        ["runtime"],
      ),
      capability(
        "inline-worker",
        "Inline Worker",
        "enabled",
        "同步入口被包裹为可追踪 worker envelope。",
        ["runtime", "worker"],
      ),
      capability(
        "image-provider-call",
        "Image Provider call",
        dryRunEffective ? "skipped" : "enabled",
        dryRunEffective ? "本次不调用外部图片 Provider。" : "本次允许调用已配置的图片 Provider。",
        ["model-role", "provider-config"],
      ),
      capability(
        "artifact-registration",
        "Artifact registration",
        "enabled",
        "生成文件会登记为 Artifact，dry-run 时保留 Trace 和摘要。",
        ["artifact-service"],
      ),
      capability(
        "mcp-assembly",
        "MCP assembly",
        input.mcpServers.length > 0 ? "planned" : "skipped",
        input.mcpServers.length > 0
          ? "MCP 声明进入上下文快照，但本阶段不启动 Server 或执行 MCP call。"
          : "当前 Agent 未声明 MCP Server。",
        ["agent-manifest", "plugin-registry"],
      ),
    ],
    constraints: [
      "不支持真实取消、重试、暂停或恢复执行。",
      "MCP 仅记录装配快照，不执行外部调用。",
      dryRunEffective ? "不会产生真实图片 Provider 输出。" : "外部 Provider 调用失败会进入 failed trace finalizer。",
    ],
  });
}

export function createMetaAgentExecutionMode(input: {
  run: RunRecord;
  persist: boolean;
  createdAt?: string;
}) {
  return createExecutionModeRecord({
    run: input.run,
    title: "Meta-Agent 创建执行模式",
    mode: input.persist ? "live" : "dry_run",
    dispatch: "inline",
    queue: "meta.create-agent.inline",
    entrypoint: "meta.create-agent",
    requestedBy: "meta/create-agent",
    dryRunEffective: !input.persist,
    reason: input.persist
      ? "用户选择直接持久化到 Agents root。"
      : "默认生成可审核草案，不直接安装到 Agents root。",
    createdAt: input.createdAt,
    capabilities: [
      capability(
        "conversation-orchestrator",
        "Conversation Orchestrator",
        "enabled",
        "创建需求、计划和总结会写入 Work 对话。",
        ["runtime"],
      ),
      capability(
        "inline-worker",
        "Inline Worker",
        "enabled",
        "Meta-Agent 创建流程以 inline worker envelope 执行。",
        ["runtime", "worker"],
      ),
      capability(
        "agent-scaffold-write",
        "Agent scaffold write",
        "enabled",
        input.persist ? "文件写入正式 Agents root。" : "文件写入可审核草案目录。",
        ["meta-agent", "filesystem"],
      ),
      capability(
        "agent-contract-validation",
        "Agent contract validation",
        "enabled",
        "生成后立即校验 manifest、UI 和目录契约。",
        ["agent-validator"],
      ),
      capability(
        "install-review",
        "Install review",
        input.persist ? "skipped" : "planned",
        input.persist ? "本次跳过草案安装审核，直接写入目标目录。" : "草案需要后续安装审核后进入 Agents root。",
        ["meta-agent", "workbench"],
      ),
    ],
    constraints: [
      "Meta-Agent 当前是规则化脚手架生成器，不是动态 LLM 代码生成器。",
      "不执行生成 Agent 的 sandbox dry-run。",
      "安装审核、diff 合并和版本化安装由后续动作处理。",
    ],
  });
}

function capability(
  id: string,
  title: string,
  state: ExecutionCapabilityState,
  summary: string,
  sources: string[],
): ExecutionCapabilityRecord {
  return {
    id,
    title,
    state,
    summary,
    sources,
  };
}
