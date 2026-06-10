import type { ChatCompletionConfig } from "./env.js";

export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatCompletionMessage[];
  temperature?: number;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  provider: string;
  durationMs: number;
}

interface ChatCompletionPayload {
  model?: string;
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
}

export async function createChatCompletion(
  config: ChatCompletionConfig,
  request: ChatCompletionRequest,
): Promise<ChatCompletionResult> {
  const start = Date.now();
  const endpoint = toChatCompletionsEndpoint(config.baseUrl);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`chat completion request failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as ChatCompletionPayload;
  const content = readAssistantContent(payload);
  if (!content) {
    throw new Error("chat completion returned no assistant content");
  }

  return {
    content,
    model: payload.model ?? config.model,
    provider: endpoint,
    durationMs: Date.now() - start,
  };
}

export function toChatCompletionsEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) {
    return trimmed;
  }
  if (trimmed.endsWith("/v1")) {
    return `${trimmed}/chat/completions`;
  }
  return `${trimmed}/v1/chat/completions`;
}

function readAssistantContent(payload: ChatCompletionPayload) {
  const raw = payload.choices?.[0]?.message?.content;
  if (typeof raw === "string") {
    return raw;
  }
  if (Array.isArray(raw)) {
    return raw
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .join("")
      .trim();
  }
  return "";
}
