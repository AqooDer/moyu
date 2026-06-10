import {
  appendConversationMessages,
  createMessageId,
  listConversationMessages,
  upsertWorkRecord,
  type WorkStoreOptions,
} from "../runtime/work-store.js";
import type { ConversationMessage, WorkState } from "../runtime/types.js";
import { createAgentWithMeta, type MetaCreateAgentResult } from "./create-agent.js";

export interface MetaConversationInput {
  message: string;
  workId?: string | null;
  agentId?: string;
  name?: string;
  description?: string;
  persist?: boolean;
}

export interface MetaConversationResult {
  workId: string;
  state: "collecting" | "ready_to_create" | "created";
  reply: string;
  messages: ConversationMessage[];
  result: MetaCreateAgentResult | null;
}

export async function sendMetaAgentConversationMessage(
  input: MetaConversationInput,
  options: WorkStoreOptions = {},
): Promise<MetaConversationResult> {
  const message = input.message.trim();
  if (!message) {
    throw new Error("message is required");
  }

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
  await upsertConversationWork({
    workId,
    title: deriveConversationTitle([...previousMessages, nextUserMessage]),
    state: "waiting_user",
    updatedAt: now,
  }, options);
  await appendConversationMessages([nextUserMessage], options);

  const conversation = [...previousMessages, nextUserMessage];
  const aggregatePrompt = buildAgentCreationPrompt(conversation);
  if (isCreateConfirmation(message) && hasMinimumAgentRequirement(aggregatePrompt)) {
    const result = await createAgentWithMeta({
      prompt: aggregatePrompt,
      agentId: input.agentId,
      name: input.name,
      description: input.description,
      persist: Boolean(input.persist),
      workId,
    });
    const messages = await listConversationMessages({ ...options, workId });
    return {
      workId,
      state: "created",
      reply: `已根据这段对话创建 Agent 草案 ${result.agentId}，请审核产物后安装。`,
      messages,
      result,
    };
  }

  const readiness = evaluateAgentRequirement(aggregatePrompt);
  const reply =
    readiness.ready
      ? buildReadyReply(aggregatePrompt)
      : buildClarifyingReply(readiness.missing);
  const replyMessage = createConversationMessage({
    id: createConversationMessageId(workId, readiness.ready ? "ready" : "clarify"),
    workId,
    runId: null,
    role: "agent",
    kind: readiness.ready ? "checkpoint" : "agent_message",
    content: reply,
    createdAt: addMilliseconds(now, 1),
  });
  await appendConversationMessages([replyMessage], options);
  const messages = await listConversationMessages({ ...options, workId });
  return {
    workId,
    state: readiness.ready ? "ready_to_create" : "collecting",
    reply,
    messages,
    result: null,
  };
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
  return [
    "Create a Moyu Agent from this conversation.",
    "",
    "User requirements:",
    ...lines,
  ].join("\n");
}

function isCreateConfirmation(message: string) {
  return /^(确认|可以|开始|创建|创建吧|按这个|就这样|没问题)(创建)?([，。,.!！\s]|$)/.test(message.trim()) ||
    /^(go|yes|confirm|create|proceed)([\s,.!]|$)/i.test(message.trim());
}

function hasMinimumAgentRequirement(prompt: string) {
  return evaluateAgentRequirement(prompt).ready;
}

function evaluateAgentRequirement(prompt: string) {
  const missing: string[] = [];
  if (prompt.replace(/\s+/g, " ").trim().length < 24) {
    missing.push("目标");
  }
  if (!/(输入|参数|prompt|文件|用户|input|source|topic|message)/i.test(prompt)) {
    missing.push("输入");
  }
  if (!/(输出|产出|生成|保存|图片|文档|报告|artifact|trace|output|save|generate|summary)/i.test(prompt)) {
    missing.push("输出");
  }
  if (!/(工具|调用|模型|api|mcp|大模型|接口|provider|tool|model|llm|fetch|search|runtime)/i.test(prompt)) {
    missing.push("能力或工具");
  }
  return {
    ready: missing.length === 0,
    missing,
  };
}

function buildReadyReply(prompt: string) {
  const summary = prompt
    .split("\n")
    .filter((line) => /^\d+\./.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .slice(0, 220);
  return [
    "我已经整理好 Agent 创建规格草案。",
    summary ? `当前需求摘要：${summary}` : null,
    "如果确认无误，请回复“确认创建”，我会生成可审核的 Agent 草案、Trace 和验证记录。",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildClarifyingReply(missing: string[]) {
  const fields = missing.length > 0 ? missing.join("、") : "目标、输入、输出和工具";
  return `我需要再补齐 ${fields}。请继续描述这个 Agent 要解决什么问题、接收什么输入、产出什么结果，以及需要调用哪些模型、工具或 MCP。`;
}

function addMilliseconds(value: string, milliseconds: number) {
  const time = new Date(value).getTime();
  return new Date(time + milliseconds).toISOString();
}
