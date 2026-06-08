import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { AgentManifestSummary } from "./registry.js";
import { readImageRelayConfig } from "../lib/env.js";
import { generateImagesWithRelay } from "../lib/openai-compat-image.js";
import { RuntimeStore } from "../runtime/store.js";
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
  const runtime = RuntimeStore.createRun({
    id: runId,
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
  });
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
    });
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
  runtime.finishStep(step.id, "succeeded", {
    files: result.files.length,
    model_role: imageModelRole?.roleId ?? "image-generation",
    model: result.model,
    provider: imageModelRole?.provider ?? result.provider,
    provider_endpoint: result.provider,
    fallback_reason: imageModelRole?.fallbackReason,
    duration_ms: result.durationMs,
  });
  runtime.addNote("Generated via agent runtime prototype.");
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
