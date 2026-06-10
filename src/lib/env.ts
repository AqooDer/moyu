import {
  listModelRoles,
  listProviders,
  readProviderApiKey,
  type SqliteSettingsPaths,
} from "../settings/store/sqlite.js";

export interface ImageRelayConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  modelSource: "env" | "default";
  responseFormat: "b64_json" | "url";
}

export interface ChatCompletionConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  modelSource: "env" | "workspace_config" | "default";
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

export async function readMetaAgentLlmConfigFromStore(
  input: SqliteSettingsPaths = {},
): Promise<ChatCompletionConfig | null> {
  const providers = await listProviders(input);
  const roles = await listModelRoles(input);
  const conversationRole = roles.find((role) => role.id === "conversation-primary");
  const providerId = process.env.MOYU_LLM_PROVIDER_ID?.trim() || conversationRole?.providerId || "openai-compat";
  const provider = providers.find((item) => item.id === providerId);
  const baseUrl = process.env.MOYU_LLM_PROVIDER_BASE_URL?.trim() || provider?.baseUrl || "";
  const apiKey = process.env.MOYU_LLM_PROVIDER_API_KEY?.trim() || (provider ? await readProviderApiKey(provider.id, input) : "");
  const modelFromEnv = process.env.MOYU_LLM_PROVIDER_MODEL?.trim();
  const modelFromStore = conversationRole?.model || provider?.chatModels[0];
  const model = modelFromEnv || modelFromStore || "gpt-4.1-mini";

  if (!baseUrl || !apiKey) {
    return null;
  }

  return {
    baseUrl,
    apiKey,
    model,
    modelSource: modelFromEnv ? "env" : modelFromStore ? "workspace_config" : "default",
  };
}
