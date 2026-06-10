import type { ChatCompletionConfig } from "./env.js";
import { appendLlmCallLog } from "./llm-call-log.js";

export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatCompletionMessage[];
  temperature?: number;
  purpose?: string;
  logPath?: string;
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
  const startedAt = new Date(start).toISOString();
  const endpoint = toChatCompletionsEndpoint(config.baseUrl);
  const temperature = request.temperature ?? 0.2;
  let responseModel = config.model;
  let responseContent = "";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: request.messages,
        temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`chat completion request failed: ${response.status} ${await response.text()}`);
    }

    const payload = (await response.json()) as ChatCompletionPayload;
    responseModel = payload.model ?? config.model;
    responseContent = readAssistantContent(payload);
    if (!responseContent) {
      throw new Error("chat completion returned no assistant content");
    }

    const durationMs = Date.now() - start;
    await safeAppendLlmCallLog(
      {
        purpose: request.purpose,
        provider: endpoint,
        model: config.model,
        request: {
          messages: request.messages,
          temperature,
        },
        response: {
          model: responseModel,
          content: responseContent,
        },
        durationMs,
        startedAt,
        endedAt: new Date().toISOString(),
      },
      { logPath: request.logPath },
    );

    return {
      content: responseContent,
      model: responseModel,
      provider: endpoint,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - start;
    await safeAppendLlmCallLog(
      {
        purpose: request.purpose,
        provider: endpoint,
        model: config.model,
        request: {
          messages: request.messages,
          temperature,
        },
        response: responseContent ? { model: responseModel, content: responseContent } : null,
        error: {
          message: error instanceof Error ? error.message : String(error),
        },
        durationMs,
        startedAt,
        endedAt: new Date().toISOString(),
      },
      { logPath: request.logPath },
    );
    throw error;
  }
}

async function safeAppendLlmCallLog(
  input: Parameters<typeof appendLlmCallLog>[0],
  paths: Parameters<typeof appendLlmCallLog>[1],
) {
  try {
    await appendLlmCallLog(input, paths);
  } catch {
    // LLM call logs are diagnostic evidence; logging failure must not change runtime behavior.
  }
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
