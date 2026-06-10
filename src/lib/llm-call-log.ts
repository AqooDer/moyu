import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ChatCompletionMessage } from "./openai-compat-chat.js";

export interface LlmCallLogInput {
  id?: string;
  purpose?: string;
  provider: string;
  model: string;
  request: {
    messages: ChatCompletionMessage[];
    temperature: number;
  };
  response?: {
    model: string;
    content: string;
  } | null;
  error?: {
    message: string;
  } | null;
  durationMs: number;
  startedAt: string;
  endedAt: string;
}

export interface LlmCallLogRecord extends LlmCallLogInput {
  id: string;
  schemaVersion: 1;
}

export interface LlmCallLogPaths {
  logPath?: string;
}

const defaultLogFile = path.join(".moyu", "llm-calls.jsonl");

export function defaultLlmCallLogPath(rootDir = ".") {
  return path.resolve(rootDir, defaultLogFile);
}

export async function appendLlmCallLog(input: LlmCallLogInput, paths: LlmCallLogPaths = {}) {
  const record: LlmCallLogRecord = {
    schemaVersion: 1,
    id: input.id || createLlmCallId(input.startedAt),
    purpose: input.purpose,
    provider: input.provider,
    model: input.model,
    request: input.request,
    response: input.response ?? null,
    error: input.error ?? null,
    durationMs: input.durationMs,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
  };
  const logPath = path.resolve(paths.logPath ?? defaultLlmCallLogPath());
  await mkdir(path.dirname(logPath), { recursive: true });
  await writeFile(logPath, `${JSON.stringify(record)}\n`, { encoding: "utf8", flag: "a" });
  return record;
}

export async function listLlmCallLogs(input: { limit?: number } & LlmCallLogPaths = {}) {
  const logPath = path.resolve(input.logPath ?? defaultLlmCallLogPath());
  let raw = "";
  try {
    raw = await readFile(logPath, "utf8");
  } catch {
    return [];
  }
  const records = raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => parseLlmCallLogLine(line))
    .filter((record): record is LlmCallLogRecord => Boolean(record));
  records.sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime());
  return typeof input.limit === "number" ? records.slice(0, input.limit) : records;
}

function parseLlmCallLogLine(line: string) {
  try {
    const parsed = JSON.parse(line) as Partial<LlmCallLogRecord>;
    if (!parsed || parsed.schemaVersion !== 1 || !parsed.id || !parsed.startedAt) {
      return null;
    }
    return parsed as LlmCallLogRecord;
  } catch {
    return null;
  }
}

function createLlmCallId(startedAt: string) {
  const time = new Date(startedAt).getTime().toString(36);
  return `llm-call-${time}-${Math.random().toString(36).slice(2, 8)}`;
}
