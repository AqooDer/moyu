import { readMetaAgentLlmConfigFromStore, type ChatCompletionConfig } from "../lib/env.js";
import { createChatCompletion } from "../lib/openai-compat-chat.js";
import type { ConversationMessage, WorkState } from "../runtime/types.js";
import {
  appendConversationMessages,
  createMessageId,
  listConversationMessages,
  upsertWorkRecord,
  type WorkStoreOptions,
} from "../runtime/work-store.js";
import { createAgentWithMeta, type MetaCreateAgentResult } from "./create-agent.js";

export interface MetaConversationInput {
  message: string;
  workId?: string | null;
  agentId?: string;
  name?: string;
  description?: string;
  persist?: boolean;
  configPath?: string;
  settingsDbPath?: string;
  settingsKeyPath?: string;
  llmCallLogPath?: string;
}

export interface MetaConversationResult {
  workId: string;
  state: "collecting" | "ready_to_create" | "created";
  reply: string;
  messages: ConversationMessage[];
  result: MetaCreateAgentResult | null;
}

type MetaConversationAction = "ask" | "ready" | "create";

interface MetaConversationDecision {
  action: MetaConversationAction;
  reply: string;
  creationPrompt: string | null;
  missing: string[];
}

export class MetaAgentConversationError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, input: { statusCode: number; code: string }) {
    super(message);
    this.name = "MetaAgentConversationError";
    this.statusCode = input.statusCode;
    this.code = input.code;
  }
}

export async function sendMetaAgentConversationMessage(
  input: MetaConversationInput,
  options: WorkStoreOptions = {},
): Promise<MetaConversationResult> {
  const message = input.message.trim();
  if (!message) {
    throw new Error("message is required");
  }
  const config = await readRequiredMetaConversationLlmConfig(input);

  const now = new Date().toISOString();
  const workId = input.workId?.trim() || createMetaConversationWorkId();
  const previousMessages = await listConversationMessages({ ...options, workId });
  const nextUserMessage = createConversationMessage({
    id: createConversationMessageId(workId, "user"),
    workId,
    runId: null,
    role: "user",
    kind: "user_message",
    content: message,
    createdAt: now,
  });
  await upsertConversationWork(
    {
      workId,
      title: deriveConversationTitle([...previousMessages, nextUserMessage]),
      state: "waiting_user",
      updatedAt: now,
    },
    options,
  );
  await appendConversationMessages([nextUserMessage], options);

  const conversation = [...previousMessages, nextUserMessage];
  const decision = await requestMetaConversationDecision(conversation, config, input.llmCallLogPath);
  const creationPrompt = decision.creationPrompt || buildAgentCreationPrompt(conversation);
  if (decision.action === "create") {
    const result = await createAgentWithMeta({
      prompt: creationPrompt,
      agentId: input.agentId,
      name: input.name,
      description: input.description,
      persist: Boolean(input.persist),
      workId,
      recordPromptMessage: false,
      requireLlmSpec: true,
      configPath: input.configPath,
      settingsDbPath: input.settingsDbPath,
      settingsKeyPath: input.settingsKeyPath,
      llmCallLogPath: input.llmCallLogPath,
    });
    const messages = await listConversationMessages({ ...options, workId });
    return {
      workId,
      state: "created",
      reply: decision.reply || `已根据这段对话创建 Agent 草案 ${result.agentId}，请审核产物后安装。`,
      messages,
      result,
    };
  }

  const replyMessage = createConversationMessage({
    id: createConversationMessageId(workId, decision.action === "ready" ? "ready" : "clarify"),
    workId,
    runId: null,
    role: "agent",
    kind: decision.action === "ready" ? "checkpoint" : "agent_message",
    content: decision.reply,
    createdAt: addMilliseconds(now, 1),
  });
  await appendConversationMessages([replyMessage], options);
  const messages = await listConversationMessages({ ...options, workId });
  return {
    workId,
    state: decision.action === "ready" ? "ready_to_create" : "collecting",
    reply: decision.reply,
    messages,
    result: null,
  };
}

async function readRequiredMetaConversationLlmConfig(input: MetaConversationInput) {
  const config = await readMetaAgentLlmConfigFromStore({
    dbPath: input.settingsDbPath,
    keyPath: input.settingsKeyPath,
  });
  if (!config) {
    throw new MetaAgentConversationError(
      "Meta-Agent conversation requires a real OpenAI-compatible chat model in local SQLite settings or MOYU_LLM_PROVIDER_* env overrides. Run `npm run dev -- settings configure-llm` before creating Agents through conversation.",
      { statusCode: 503, code: "missing_llm_provider_config" },
    );
  }
  return config;
}

async function requestMetaConversationDecision(
  messages: ConversationMessage[],
  config: ChatCompletionConfig,
  llmCallLogPath?: string,
): Promise<MetaConversationDecision> {
  let responseContent = "";
  try {
    const response = await createChatCompletion(config, {
      purpose: "meta.conversation.decision",
      logPath: llmCallLogPath,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: buildMetaConversationSystemPrompt(),
        },
        {
          role: "user",
          content: buildMetaConversationDecisionPrompt(messages),
        },
      ],
    });
    responseContent = response.content;
    return normalizeMetaConversationDecision(parseJsonObject(response.content));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new MetaAgentConversationError(
      `Meta-Agent LLM conversation failed: ${detail}${responseContent ? `; content=${responseContent.slice(0, 240)}` : ""}`,
      { statusCode: 502, code: "llm_conversation_failed" },
    );
  }
}

function buildMetaConversationSystemPrompt() {
  return [
    "You are Moyu Meta-Agent, a real LLM agent that creates local Moyu Agents through conversation.",
    "You must decide the next conversation action from the full transcript.",
    "Return JSON only. Do not include markdown or extra prose.",
    "",
    "Return this JSON object:",
    "{",
    '  "action": "ask" | "ready" | "create",',
    '  "reply": "message to show the user",',
    '  "creation_prompt": "complete requirement for Agent generation, required for ready/create, null for ask",',
    '  "missing": ["short missing field names"]',
    "}",
    "",
    "Action rules:",
    "- Use ask when the target, inputs, outputs, capabilities/tools, or acceptance criteria are still unclear.",
    "- Use ready when the requirement is clear enough but the latest user message has not confirmed creation.",
    "- Use create only when the latest user message clearly confirms creating the Agent from the prior requirement.",
    "- The reply for ready must ask the user to confirm creation.",
    "- The creation_prompt must summarize only the user's Agent requirement and must be suitable for generating a Moyu Agent spec.",
    "- Do not pretend to create files. The host runtime will create files only after action=create.",
  ].join("\n");
}

function buildMetaConversationDecisionPrompt(messages: ConversationMessage[]) {
  const transcript = messages
    .map((message, index) => {
      const role = message.role === "agent" ? "assistant" : message.role;
      return `${index + 1}. ${role} (${message.kind}): ${message.content.trim()}`;
    })
    .join("\n");
  return ["Conversation transcript:", transcript, "", "Decide the next Meta-Agent action now."].join("\n");
}

function normalizeMetaConversationDecision(raw: unknown): MetaConversationDecision {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("LLM conversation decision JSON must be an object");
  }

  const value = raw as Record<string, unknown>;
  const action = readAction(value.action);
  const reply = readString(value.reply);
  const creationPrompt = readString(value.creation_prompt) ?? readString(value.creationPrompt);
  if (!reply) {
    throw new Error("LLM conversation decision must include reply");
  }
  if ((action === "ready" || action === "create") && !creationPrompt) {
    throw new Error("LLM conversation decision must include creation_prompt for ready/create");
  }

  return {
    action,
    reply,
    creationPrompt: creationPrompt ?? null,
    missing: Array.isArray(value.missing)
      ? value.missing.map((item) => readString(item)).filter((item): item is string => Boolean(item))
      : [],
  };
}

function readAction(raw: unknown): MetaConversationAction {
  if (raw === "ask" || raw === "ready" || raw === "create") {
    return raw;
  }
  throw new Error("LLM conversation decision action must be ask, ready, or create");
}

function upsertConversationWork(
  input: {
    workId: string;
    title: string;
    state: WorkState;
    updatedAt: string;
  },
  options: WorkStoreOptions,
) {
  return upsertWorkRecord(
    {
      id: input.workId,
      projectId: null,
      title: input.title,
      state: input.state,
      agentId: "meta/create-agent",
      runIds: [],
      createdAt: input.updatedAt,
      updatedAt: input.updatedAt,
    },
    options,
  );
}

function createConversationMessage(input: {
  id: string;
  workId: string;
  runId: string | null;
  role: ConversationMessage["role"];
  kind: ConversationMessage["kind"];
  content: string;
  artifactIds?: string[];
  createdAt: string;
}): ConversationMessage {
  return {
    id: input.id,
    workId: input.workId,
    runId: input.runId,
    role: input.role,
    kind: input.kind,
    content: input.content,
    artifactIds: input.artifactIds ?? [],
    createdAt: input.createdAt,
  };
}

function createMetaConversationWorkId() {
  return `work-meta-conversation-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createConversationMessageId(workId: string, suffix: string) {
  return createMessageId(`${workId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, suffix);
}

function deriveConversationTitle(messages: ConversationMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user")?.content || "Agent 创建会话";
  return firstUserMessage.replace(/\s+/g, " ").trim().slice(0, 80) || "Agent 创建会话";
}

function buildAgentCreationPrompt(messages: ConversationMessage[]) {
  const lines = messages
    .filter((message) => message.role === "user")
    .map((message, index) => `${index + 1}. ${message.content.trim()}`)
    .filter(Boolean);
  return ["Create a Moyu Agent from this conversation.", "", "User requirements:", ...lines].join("\n");
}

function parseJsonObject(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(content.slice(start, end + 1));
    }
    throw new Error("LLM conversation decision was not valid JSON");
  }
}

function readString(raw: unknown) {
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function addMilliseconds(value: string, milliseconds: number) {
  const time = new Date(value).getTime();
  return new Date(time + milliseconds).toISOString();
}
