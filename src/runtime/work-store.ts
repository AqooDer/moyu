import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ConversationMessage,
  ConversationMessageKind,
  ConversationRole,
  WorkRecord,
  WorkState,
} from "./types.js";

export interface WorkStoreFile {
  schemaVersion: 1;
  updatedAt: string;
  works: WorkRecord[];
  messages: ConversationMessage[];
}

export interface WorkStoreOptions {
  storePath?: string;
}

export interface RecordRunConversationInput {
  runId: string;
  workId?: string | null;
  agentId: string;
  title: string;
  state: WorkState;
  prompt?: string | null;
  planSummary?: string | null;
  summary?: string | null;
  artifactIds?: string[];
  startedAt?: string | null;
  updatedAt?: string | null;
  projectId?: string | null;
}

export async function readWorkStore(options: WorkStoreOptions = {}): Promise<WorkStoreFile> {
  const filePath = resolveWorkStorePath(options);
  try {
    const raw = JSON.parse(await readFile(filePath, "utf8")) as WorkStoreFile;
    return normalizeWorkStoreFile(raw);
  } catch {
    return emptyWorkStore();
  }
}

export async function writeWorkStore(store: WorkStoreFile, options: WorkStoreOptions = {}) {
  const filePath = resolveWorkStorePath(options);
  const normalized = normalizeWorkStoreFile({
    ...store,
    updatedAt: new Date().toISOString(),
  });
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return filePath;
}

export async function upsertWorkRecord(work: WorkRecord, options: WorkStoreOptions = {}) {
  const store = await readWorkStore(options);
  const normalizedWork = normalizeWorkRecord(work);
  const existing = store.works.find((item) => item.id === normalizedWork.id);
  const merged: WorkRecord = existing
    ? {
        ...existing,
        ...normalizedWork,
        createdAt: existing.createdAt || normalizedWork.createdAt,
        runIds: mergeUnique([...existing.runIds, ...normalizedWork.runIds]),
      }
    : normalizedWork;
  const works = store.works.filter((item) => item.id !== merged.id);
  works.push(merged);
  works.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  await writeWorkStore({ ...store, works }, options);
  return merged;
}

export async function appendConversationMessages(
  messages: ConversationMessage[],
  options: WorkStoreOptions = {},
) {
  if (messages.length === 0) {
    return [];
  }

  const store = await readWorkStore(options);
  const normalizedMessages = messages.map(normalizeConversationMessage);
  const existingIds = new Set(normalizedMessages.map((message) => message.id));
  const nextMessages = [
    ...store.messages.filter((message) => !existingIds.has(message.id)),
    ...normalizedMessages,
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  await writeWorkStore({ ...store, messages: nextMessages }, options);
  return normalizedMessages;
}

export async function recordRunConversation(
  input: RecordRunConversationInput,
  options: WorkStoreOptions = {},
) {
  const updatedAt = input.updatedAt || new Date().toISOString();
  const createdAt = input.startedAt || updatedAt;
  const workId = input.workId || createWorkIdFromRunId(input.runId);
  const work = await upsertWorkRecord(
    {
      id: workId,
      projectId: input.projectId ?? null,
      title: input.title,
      state: input.state,
      agentId: input.agentId,
      runIds: [input.runId],
      createdAt,
      updatedAt,
    },
    options,
  );

  const messages: ConversationMessage[] = [];
  if (input.prompt) {
    messages.push(
      createConversationMessage({
        id: createMessageId(input.runId, "user"),
        workId,
        runId: input.runId,
        role: "user",
        kind: "user_message",
        content: input.prompt,
        createdAt,
      }),
    );
  }
  if (input.planSummary) {
    messages.push(
      createConversationMessage({
        id: createMessageId(input.runId, "plan"),
        workId,
        runId: input.runId,
        role: "agent",
        kind: "plan",
        content: input.planSummary,
        createdAt: addMilliseconds(createdAt, 1),
      }),
    );
  }
  if (input.summary) {
    const summaryCreatedAt = input.planSummary
      ? maxIsoTimestamp(updatedAt, addMilliseconds(createdAt, 2))
      : updatedAt;
    messages.push(
      createConversationMessage({
        id: createMessageId(input.runId, "summary"),
        workId,
        runId: input.runId,
        role: "agent",
        kind: "summary",
        content: input.summary,
        artifactIds: input.artifactIds ?? [],
        createdAt: summaryCreatedAt,
      }),
    );
  }

  await appendConversationMessages(messages, options);
  return { work, messages };
}

export async function updateWorkStateForRun(
  input: {
    runId: string;
    state: WorkState;
    summary?: string | null;
    artifactIds?: string[];
    updatedAt?: string | null;
  },
  options: WorkStoreOptions = {},
) {
  const store = await readWorkStore(options);
  const work = store.works.find((item) => item.runIds.includes(input.runId));
  if (!work) {
    return null;
  }

  const updatedAt = input.updatedAt || new Date().toISOString();
  const updated = await upsertWorkRecord(
    {
      ...work,
      state: input.state,
      updatedAt,
    },
    options,
  );

  if (input.summary) {
    await appendConversationMessages(
      [
        createConversationMessage({
          id: createMessageId(input.runId, input.state),
          workId: work.id,
          runId: input.runId,
          role: "agent",
          kind: "summary",
          content: input.summary,
          artifactIds: input.artifactIds ?? [],
          createdAt: updatedAt,
        }),
      ],
      options,
    );
  }
  return updated;
}

export async function listWorkRecords(options: WorkStoreOptions & { limit?: number; state?: WorkState } = {}) {
  const store = await readWorkStore(options);
  const works = store.works
    .filter((work) => !options.state || work.state === options.state)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return typeof options.limit === "number" ? works.slice(0, options.limit) : works;
}

export async function listConversationMessages(
  input: WorkStoreOptions & {
    workId?: string;
    runId?: string;
    limit?: number;
  } = {},
) {
  const store = await readWorkStore(input);
  const messages = store.messages
    .filter((message) => !input.workId || message.workId === input.workId)
    .filter((message) => !input.runId || message.runId === input.runId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return typeof input.limit === "number" ? messages.slice(-input.limit) : messages;
}

export function createWorkIdFromRunId(runId: string) {
  return `work-${runId}`;
}

export function createMessageId(runId: string, suffix: string) {
  return `msg-${runId}-${suffix.replace(/[^a-z0-9_-]/gi, "-")}`;
}

export function resolveWorkStorePath(options: WorkStoreOptions = {}) {
  return path.resolve(options.storePath ?? path.join("artifacts", "workbench", "work-store.json"));
}

function createConversationMessage(input: {
  id: string;
  workId: string;
  runId: string | null;
  role: ConversationRole;
  kind: ConversationMessageKind;
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

function emptyWorkStore(): WorkStoreFile {
  return {
    schemaVersion: 1,
    updatedAt: new Date(0).toISOString(),
    works: [],
    messages: [],
  };
}

function normalizeWorkStoreFile(raw: WorkStoreFile): WorkStoreFile {
  return {
    schemaVersion: 1,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date(0).toISOString(),
    works: Array.isArray(raw.works) ? raw.works.map(normalizeWorkRecord) : [],
    messages: Array.isArray(raw.messages) ? raw.messages.map(normalizeConversationMessage) : [],
  };
}

function normalizeWorkRecord(raw: WorkRecord): WorkRecord {
  const updatedAt =
    typeof raw.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : new Date().toISOString();
  return {
    id: readString(raw.id, "work-unknown"),
    projectId: typeof raw.projectId === "string" && raw.projectId ? raw.projectId : null,
    title: readString(raw.title, "Untitled work"),
    state: normalizeWorkState(raw.state),
    agentId: typeof raw.agentId === "string" && raw.agentId ? raw.agentId : null,
    runIds: Array.isArray(raw.runIds) ? mergeUnique(raw.runIds.filter((item): item is string => typeof item === "string")) : [],
    createdAt: typeof raw.createdAt === "string" && raw.createdAt ? raw.createdAt : updatedAt,
    updatedAt,
  };
}

function normalizeConversationMessage(raw: ConversationMessage): ConversationMessage {
  return {
    id: readString(raw.id, "msg-unknown"),
    workId: readString(raw.workId, "work-unknown"),
    runId: typeof raw.runId === "string" && raw.runId ? raw.runId : null,
    role: normalizeConversationRole(raw.role),
    kind: normalizeConversationKind(raw.kind),
    content: readString(raw.content, ""),
    artifactIds: Array.isArray(raw.artifactIds)
      ? mergeUnique(raw.artifactIds.filter((item): item is string => typeof item === "string"))
      : [],
    createdAt: typeof raw.createdAt === "string" && raw.createdAt ? raw.createdAt : new Date().toISOString(),
  };
}

function normalizeWorkState(value: unknown): WorkState {
  return ["active", "waiting_user", "running", "completed", "archived"].includes(String(value))
    ? (value as WorkState)
    : "active";
}

function normalizeConversationRole(value: unknown): ConversationRole {
  return ["user", "agent", "system"].includes(String(value)) ? (value as ConversationRole) : "system";
}

function normalizeConversationKind(value: unknown): ConversationMessageKind {
  return [
    "user_message",
    "agent_message",
    "plan",
    "run_started",
    "step_progress",
    "artifact_created",
    "checkpoint",
    "error",
    "summary",
  ].includes(String(value))
    ? (value as ConversationMessageKind)
    : "summary";
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function mergeUnique(values: string[]) {
  return [...new Set(values)];
}

function addMilliseconds(value: string, milliseconds: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Date(date.getTime() + milliseconds).toISOString();
}

function maxIsoTimestamp(left: string, right: string) {
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
    return left;
  }
  return leftTime >= rightTime ? left : right;
}
