export interface ImageRelayConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  modelSource: "env" | "default";
  responseFormat: "b64_json" | "url";
}

export function readImageRelayConfig(): ImageRelayConfig | null {
  const baseUrl = process.env.MOYU_IMAGE_PROVIDER_BASE_URL?.trim();
  const apiKey = process.env.MOYU_IMAGE_PROVIDER_API_KEY?.trim();
  const modelFromEnv = process.env.MOYU_IMAGE_PROVIDER_MODEL?.trim();
  const model = modelFromEnv || "gpt-image-2";
  const responseFormat =
    process.env.MOYU_IMAGE_RESPONSE_FORMAT?.trim() === "url" ? "url" : "b64_json";

  if (!baseUrl || !apiKey) {
    return null;
  }

  return {
    baseUrl,
    apiKey,
    model,
    modelSource: modelFromEnv ? "env" : "default",
    responseFormat,
  };
}
