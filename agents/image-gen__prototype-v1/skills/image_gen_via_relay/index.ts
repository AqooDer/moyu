import type { SkillContext, SkillResult } from "@moyu/skill-sdk";
import { z } from "zod";

export const inputSchema = z.object({
  prompt: z.string().min(1).max(2000),
  size: z.enum(["1024x1024", "1792x1024", "1024x1792"]).default("1024x1024"),
  style: z.string().default("realistic"),
  raw_prompt: z.boolean().default(false),
});

export const outputSchema = z.object({
  artifact_ref: z.string(),
  width: z.number(),
  height: z.number(),
  prompt_used: z.string(),
  provider: z.string(),
  model: z.string(),
  duration_ms: z.number(),
});

export const permissions = {
  "host.network.fetch": ["${agent.config.provider.base_url}"],
  "host.artifact.write": { scope: "run" },
};

export default async function run(
  input: z.infer<typeof inputSchema>,
  ctx: SkillContext,
): Promise<SkillResult<z.infer<typeof outputSchema>>> {
  const start = Date.now();
  const parsed = inputSchema.parse(input);
  const provider = ctx.agent.config.provider;
  const prompt = parsed.raw_prompt ? parsed.prompt : normalizePrompt(parsed.prompt, parsed.style);
  const response = await ctx.host.network.fetch(`${provider.base_url}/v1/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.api_key}`,
    },
    body: JSON.stringify({
      model: provider.model ?? "gpt-image-2",
      prompt,
      size: parsed.size,
      n: 1,
      response_format: provider.response_format ?? "b64_json",
    }),
  });

  if (!response.ok) {
    return { ok: false, error: { kind: "provider_error", message: await response.text() } };
  }

  const body = await response.json();
  const first = body.data?.[0];
  if (!first?.b64_json) {
    return { ok: false, error: { kind: "provider_error", message: "missing b64_json" } };
  }

  const buffer = Buffer.from(first.b64_json, "base64");
  const artifact = await ctx.host.artifact.write(
    { type: "png", role: "primary", mime: "image/png" },
    buffer,
  );
  const [width, height] = parsed.size.split("x").map(Number);

  return {
    ok: true,
    output: {
      artifact_ref: artifact.ref,
      width,
      height,
      prompt_used: prompt,
      provider: provider.base_url,
      model: provider.model ?? "gpt-image-2",
      duration_ms: Date.now() - start,
    },
  };
}

function normalizePrompt(prompt: string, style: string) {
  const styleHints: Record<string, string> = {
    realistic: "clean product-like render, crisp UI-friendly composition",
    cartoon: "simple cartoon illustration, readable silhouette",
    sketch: "sketch-like line art, light structure, prototype feel",
    anime: "stylized anime-like illustration, polished and clear",
  };
  return `${prompt}. Style hint: ${styleHints[style] ?? "clean polished composition"}.`;
}

