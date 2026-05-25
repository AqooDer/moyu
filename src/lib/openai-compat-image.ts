import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ImageRelayConfig } from "./env.js";

export interface ImageGenerationRequest {
  prompt: string;
  size: "1024x1024" | "1792x1024" | "1024x1792";
  count: number;
  outDir: string;
}

export interface ImageGenerationResult {
  files: string[];
  model: string;
  provider: string;
  durationMs: number;
}

export async function generateImagesWithRelay(
  config: ImageRelayConfig,
  request: ImageGenerationRequest,
): Promise<ImageGenerationResult> {
  const start = Date.now();
  const endpoint = toImageEndpoint(config.baseUrl);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      prompt: request.prompt,
      size: request.size,
      n: request.count,
      response_format: config.responseFormat,
    }),
  });

  if (!response.ok) {
    throw new Error(`image relay request failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
    model?: string;
  };
  const items = payload.data ?? [];
  if (items.length === 0) {
    throw new Error("image relay returned no image data");
  }

  await mkdir(request.outDir, { recursive: true });
  const files: string[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item) {
      continue;
    }
    const buffer = await imageItemToBuffer(item);
    const fileName = `image-${String(index + 1).padStart(2, "0")}.png`;
    const filePath = path.join(request.outDir, fileName);
    await writeFile(filePath, buffer);
    files.push(filePath);
  }

  return {
    files,
    model: payload.model ?? config.model,
    provider: endpoint,
    durationMs: Date.now() - start,
  };
}

function toImageEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.endsWith("/images/generations")) {
    return trimmed;
  }
  if (trimmed.endsWith("/v1")) {
    return `${trimmed}/images/generations`;
  }
  return `${trimmed}/v1/images/generations`;
}

async function imageItemToBuffer(item: { b64_json?: string; url?: string }): Promise<Buffer> {
  if (item.b64_json) {
    return Buffer.from(item.b64_json, "base64");
  }

  if (item.url) {
    const response = await fetch(item.url);
    if (!response.ok) {
      throw new Error(`failed to download generated image: ${response.status} ${item.url}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  throw new Error("image item has neither b64_json nor url");
}
