import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { readImageRelayConfig } from "../lib/env.js";
import { generateImagesWithRelay } from "../lib/openai-compat-image.js";
import { writeTrace } from "../lib/trace.js";

const SpikeOptions = z.object({
  prompt: z.string().min(1),
  count: z.number().int().min(1).max(32),
  size: z.enum(["1024x1024", "1792x1024", "1024x1792"]),
  style: z.string().min(1),
  rawPrompt: z.boolean().default(false),
  outDir: z.string().min(1),
});

export type SpikeOptions = z.infer<typeof SpikeOptions>;

export async function runImageGenSpike(input: SpikeOptions) {
  const options = SpikeOptions.parse(input);
  const runId = createRunId();
  const outDir = path.resolve(options.outDir);
  const config = readImageRelayConfig();
  await mkdir(outDir, { recursive: true });

  const trace = {
    run_id: runId,
    kind: "spike-image-gen",
    status: "running",
    input: options,
    notes: [] as string[],
    outputs: [] as Array<Record<string, unknown>>,
  };

  if (!config) {
    trace.status = "dry-run";
    trace.notes.push(
      "Missing MOYU_IMAGE_PROVIDER_BASE_URL or MOYU_IMAGE_PROVIDER_API_KEY; run in dry-run mode.",
      "Set provider env vars to enable actual image generation.",
    );
    const traceFile = await writeTrace(runId, trace);
    const summary = [
      `run_id: ${runId}`,
      `prompt: ${options.prompt}`,
      `count: ${options.count}`,
      `size: ${options.size}`,
      `style: ${options.style}`,
      `trace: ${path.relative(process.cwd(), traceFile)}`,
      `output_dir: ${path.relative(process.cwd(), outDir)}`,
      "status: dry-run",
    ].join("\n");
    await writeFile(path.join(outDir, "README.txt"), summary, "utf8");
    console.log(summary);
    return;
  }

  const fullPrompt = options.rawPrompt ? options.prompt : normalizePrompt(options.prompt, options.style);
  const result = await generateImagesWithRelay(config, {
    prompt: fullPrompt,
    size: options.size,
    count: options.count,
    outDir,
  });

  trace.status = "succeeded";
  trace.notes.push("Generated via openai-compatible relay.");
  trace.outputs.push(
    ...result.files.map((file) => ({
      kind: "image",
      file,
      model: result.model,
      provider: result.provider,
      duration_ms: result.durationMs,
    })),
  );
  const traceFile = await writeTrace(runId, trace);

  const summary = [
    `run_id: ${runId}`,
    `prompt: ${fullPrompt}`,
    `count: ${options.count}`,
    `size: ${options.size}`,
    `style: ${options.style}`,
    `trace: ${path.relative(process.cwd(), traceFile)}`,
    `output_dir: ${path.relative(process.cwd(), outDir)}`,
    `files: ${result.files.map((file) => path.relative(process.cwd(), file)).join(", ")}`,
    `provider: ${result.provider}`,
    `model: ${result.model}`,
  ].join("\n");

  await writeFile(path.join(outDir, "README.txt"), summary, "utf8");
  console.log(summary);
}

function createRunId(): string {
  return `spike-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePrompt(prompt: string, style: string): string {
  const styleHints: Record<string, string> = {
    realistic: "clean product-like render, crisp UI-friendly composition",
    cartoon: "simple cartoon illustration, readable silhouette",
    sketch: "sketch-like line art, light structure, prototype feel",
    anime: "stylized anime-like illustration, polished and clear",
  };

  const hint = styleHints[style] ?? "clean polished composition";
  return `${prompt}. Style hint: ${hint}.`;
}
