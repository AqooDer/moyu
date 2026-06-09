import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { AgentManifestSummary } from "./registry.js";
import { readImageRelayConfig } from "../lib/env.js";
import { generateImagesWithRelay } from "../lib/openai-compat-image.js";
import { createPlanRecord, formatPlanSummary } from "../runtime/plans.js";
import { RuntimeStore } from "../runtime/store.js";
import type { McpServerResolution } from "../runtime/types.js";
import { createWorkIdFromRunId, recordRunConversation } from "../runtime/work-store.js";
import { resolveAgentModelRoles } from "../settings/models/model-roles.js";

const AgentRunOptions = z.object({
  prompt: z.string().min(1),
  count: z.number().int().min(1).max(32),
  size: z.enum(["1024x1024", "1792x1024", "1024x1792"]),
  style: z.string().min(1),
  rawPrompt: z.boolean().default(false),
  dryRun: z.boolean().default(false),
  outDir: z.string().optional(),
});

export type AgentRunOptions = z.infer<typeof AgentRunOptions>;

export async function runImageAgent(agent: AgentManifestSummary, input: AgentRunOptions) {
  const options = AgentRunOptions.parse(input);
  const runId = createRunId(agent);
  const workId = createWorkIdFromRunId(runId);
  const outputDir = path.resolve(
    options.outDir ?? path.join("artifacts", "agent-runs", agent.folderName, runId),
  );
  await mkdir(outputDir, { recursive: true });

  const prompt = options.rawPrompt ? options.prompt : normalizePrompt(options.prompt, options.style);
  const config = readImageRelayConfig();
  const modelRoles = await resolveAgentModelRoles({
    agent,
    roleIds: ["conversation-primary", "image-generation"],
    imageRelayConfig: config,
  });
  const imageModelRole = modelRoles.find((role) => role.roleId === "image-generation");
  const imageConfig = config && imageModelRole ? { ...config, model: imageModelRole.model } : config;
  const mcpServers = resolveAgentMcpServers(agent);
  const runtime = RuntimeStore.createRun({
    id: runId,
    workId,
    agentId: agent.agentId,
    agentVersion: agent.version,
    recipeId: agent.recipeRef,
    dryRun: options.dryRun,
    input: {
      prompt,
      count: options.count,
      size: options.size,
      style: options.style,
      raw_prompt: options.rawPrompt,
    },
    modelRoles,
    mcpServers,
  });
  runtime.setPlan(
    createPlanRecord({
      runId,
      workId,
      title: "生图 Agent 运行计划",
      createdAt: runtime.snapshot.run.startedAt,
      steps: [
        {
          id: "input",
          title: "整理输入参数",
          kind: "control",
          summary: "规范 prompt、数量、尺寸和风格参数。",
        },
        {
          id: "resolve-context",
          title: "装配运行上下文",
          kind: "control",
          summary: "解析模型角色、MCP 装配快照和 Provider 配置。",
          dependsOn: ["input"],
        },
        {
          id: "step-image-gen",
          title: "执行图片生成",
          kind: "skill",
          summary: "调用生图能力，dry-run 时跳过外部 Provider 调用。",
          dependsOn: ["resolve-context"],
        },
        {
          id: "register-artifacts",
          title: "登记产物",
          kind: "tool",
          summary: "把生成图片登记为 Artifact，并保留摘要信息。",
          dependsOn: ["step-image-gen"],
        },
        {
          id: "write-trace",
          title: "写入 Trace 与对话记录",
          kind: "tool",
          summary: "输出 run.json，并把计划和总结写入 Work 会话。",
          dependsOn: ["register-artifacts"],
        },
      ],
    }),
  );
  runtime.updatePlanStep("input", "succeeded");
  runtime.updatePlanStep("resolve-context", "succeeded");
  runtime.setRunState("running");

  const step = runtime.startStep({
    id: "step-image-gen",
    name: "image_gen",
    kind: "skill",
    inputSummary: {
      prompt_chars: prompt.length,
      count: options.count,
      size: options.size,
      model_role: imageModelRole?.roleId ?? "image-generation",
      mcp_servers: mcpServers.map((server) => server.id),
    },
  });

  if (options.dryRun || !imageConfig) {
    runtime.addNote(
      options.dryRun
        ? "Dry-run requested; provider call skipped."
        : "Missing image relay config; provider call skipped.",
    );
    runtime.finishStep(step.id, "skipped", {
      reason: "provider call skipped",
      model_role: imageModelRole?.roleId ?? "image-generation",
      provider: imageModelRole?.provider,
      model: imageModelRole?.model,
      fallback_reason: imageModelRole?.fallbackReason,
      mcp_servers: mcpServers.map((server) => server.id),
    });
    runtime.updatePlanStep("register-artifacts", "skipped");
    runtime.updatePlanStep("write-trace", "succeeded");
    runtime.setRunState("succeeded");
    const traceFile = await runtime.writeTrace();
    const summary = formatRunSummary({
      agent,
      runId,
      prompt,
      count: options.count,
      size: options.size,
      status: "dry-run",
      traceFile,
      outputDir,
      files: [],
      provider: imageModelRole?.provider,
      model: imageModelRole?.model,
      fallbackReason: imageModelRole?.fallbackReason,
    });
    await writeFile(path.join(outputDir, "README.txt"), summary, "utf8");
    await recordRunConversation({
      runId,
      workId,
      agentId: agent.agentId,
      title: prompt,
      state: "completed",
      prompt,
      planSummary: formatPlanSummary(runtime.snapshot.plan),
      summary: `Agent ${agent.agentId} dry-run 已完成，Provider 调用已跳过。`,
      artifactIds: runtime.snapshot.artifacts.map((artifact) => artifact.id),
      startedAt: runtime.snapshot.run.startedAt,
      updatedAt: runtime.snapshot.run.endedAt,
    });
    return summary;
  }

  const result = await generateImagesWithRelay(imageConfig, {
    prompt,
    size: options.size,
    count: options.count,
    outDir: outputDir,
  });

  for (const file of result.files) {
    await runtime.addArtifact({
      producerStepId: step.id,
      type: "png",
      role: "primary",
      filePath: file,
    });
  }
  runtime.updatePlanStep("register-artifacts", "succeeded");
  runtime.finishStep(step.id, "succeeded", {
    files: result.files.length,
    model_role: imageModelRole?.roleId ?? "image-generation",
    model: result.model,
    provider: imageModelRole?.provider ?? result.provider,
    provider_endpoint: result.provider,
    fallback_reason: imageModelRole?.fallbackReason,
    duration_ms: result.durationMs,
    mcp_servers: mcpServers.map((server) => server.id),
  });
  runtime.addNote("Generated via agent runtime prototype.");
  runtime.updatePlanStep("write-trace", "succeeded");
  runtime.setRunState("succeeded");
  const traceFile = await runtime.writeTrace();
  const summary = formatRunSummary({
    agent,
    runId,
    prompt,
    count: options.count,
    size: options.size,
    status: "succeeded",
    traceFile,
    outputDir,
    files: result.files,
    provider: imageModelRole?.provider ?? result.provider,
    model: result.model,
    fallbackReason: imageModelRole?.fallbackReason,
  });
  await writeFile(path.join(outputDir, "README.txt"), summary, "utf8");
  await recordRunConversation({
    runId,
    workId,
    agentId: agent.agentId,
    title: prompt,
    state: "completed",
    prompt,
    planSummary: formatPlanSummary(runtime.snapshot.plan),
    summary: `Agent ${agent.agentId} 已完成运行，生成 ${result.files.length} 个产物。`,
    artifactIds: runtime.snapshot.artifacts.map((artifact) => artifact.id),
    startedAt: runtime.snapshot.run.startedAt,
    updatedAt: runtime.snapshot.run.endedAt,
  });
  return summary;
}

function createRunId(agent: AgentManifestSummary) {
  const slug = agent.folderName.replace(/[^a-z0-9_-]/gi, "-");
  return `run-${slug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePrompt(prompt: string, style: string) {
  const styleHints: Record<string, string> = {
    realistic: "clean product-like render, crisp UI-friendly composition",
    cartoon: "simple cartoon illustration, readable silhouette",
    sketch: "sketch-like line art, light structure, prototype feel",
    anime: "stylized anime-like illustration, polished and clear",
  };

  const hint = styleHints[style] ?? "clean polished composition";
  return `${prompt}. Style hint: ${hint}.`;
}

function resolveAgentMcpServers(agent: AgentManifestSummary): McpServerResolution[] {
  return agent.mcpServers.map((server) => ({
    id: server.id,
    transport: server.transport,
    state: server.state,
    description: server.description,
    permissions: server.permissions,
    source: "agent_manifest",
  }));
}

function formatRunSummary(input: {
  agent: AgentManifestSummary;
  runId: string;
  prompt: string;
  count: number;
  size: string;
  status: string;
  traceFile: string;
  outputDir: string;
  files: string[];
  provider?: string;
  model?: string;
  fallbackReason?: string | null;
}) {
  const lines = [
    `run_id: ${input.runId}`,
    `agent_id: ${input.agent.agentId}`,
    `agent_version: ${input.agent.version}`,
    `status: ${input.status}`,
    `prompt: ${input.prompt}`,
    `count: ${input.count}`,
    `size: ${input.size}`,
    `trace: ${path.relative(process.cwd(), input.traceFile)}`,
    `output_dir: ${path.relative(process.cwd(), input.outputDir)}`,
  ];

  if (input.files.length > 0) {
    lines.push(`files: ${input.files.map((file) => path.relative(process.cwd(), file)).join(", ")}`);
  }
  if (input.provider) {
    lines.push(`provider: ${input.provider}`);
  }
  if (input.model) {
    lines.push(`model: ${input.model}`);
  }
  if (input.fallbackReason) {
    lines.push(`fallback_reason: ${input.fallbackReason}`);
  }

  return lines.join("\n");
}
