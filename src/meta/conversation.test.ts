import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { readWorkStore } from "../runtime/work-store.js";
import { sendMetaAgentConversationMessage } from "./conversation.js";

test("Meta-Agent conversation requires real LLM provider configuration", async () => {
  const restore = captureLlmEnv();

  try {
    delete process.env.MOYU_LLM_PROVIDER_BASE_URL;
    delete process.env.MOYU_LLM_PROVIDER_API_KEY;
    delete process.env.MOYU_LLM_PROVIDER_MODEL;

    await assert.rejects(
      sendMetaAgentConversationMessage({
        message: "创建一个研究摘要 Agent",
      }),
      /requires MOYU_LLM_PROVIDER_BASE_URL and MOYU_LLM_PROVIDER_API_KEY/,
    );
  } finally {
    restore();
  }
});

test("Meta-Agent conversation fails instead of falling back when LLM provider fails", async () => {
  const previousCwd = process.cwd();
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-meta-conversation-failure-"));
  const restore = captureLlmEnv();
  const previousFetch = globalThis.fetch;

  try {
    process.chdir(workspace);
    setLlmEnv();
    globalThis.fetch = async () => new Response("provider unavailable", { status: 500 });

    await assert.rejects(
      sendMetaAgentConversationMessage({
        message:
          "创建一个研究摘要 Agent，输入 topic 和 docs，调用大模型和 search API，输出 markdown summary artifact 并保存 trace。",
      }),
      /Meta-Agent LLM conversation failed: chat completion request failed: 500 provider unavailable/,
    );

    const store = await readWorkStore();
    assert.equal(store.messages.length, 1);
    assert.equal(store.messages[0].role, "user");
    assert.equal(store.works[0].agentId, "meta/create-agent");
  } finally {
    globalThis.fetch = previousFetch;
    process.chdir(previousCwd);
    restore();
    await rm(workspace, { recursive: true, force: true });
  }
});

test("Meta-Agent conversation uses LLM decisions and strict LLM spec creation", async () => {
  const previousCwd = process.cwd();
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-meta-conversation-"));
  const restore = captureLlmEnv();
  const previousFetch = globalThis.fetch;
  const requestedBodies: Array<Record<string, unknown>> = [];
  const requestedUrls: string[] = [];

  try {
    process.chdir(workspace);
    setLlmEnv();
    globalThis.fetch = async (input, init) => {
      requestedUrls.push(String(input));
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      requestedBodies.push(body);
      const messages = body.messages as Array<{ role?: string; content?: string }>;
      const system = messages.find((message) => message.role === "system")?.content ?? "";

      if (system.includes("decide the next conversation action")) {
        const userPrompt = messages.find((message) => message.role === "user")?.content ?? "";
        const isConfirmed = userPrompt.includes("确认创建");
        return jsonChatResponse({
          action: isConfirmed ? "create" : "ready",
          reply: isConfirmed
            ? "收到确认，我会创建研究摘要 Agent 草案。"
            : "需求已足够。我将创建研究摘要 Agent：输入 topic 和 docs，调用大模型与 search API，输出 markdown summary artifact。确认请回复“确认创建”。",
          creation_prompt:
            "创建一个研究摘要 Agent，输入 topic 和 docs，调用大模型和 search API，输出 markdown summary artifact 并保存 trace。",
          missing: [],
        });
      }

      return jsonChatResponse({
        agent_id: "research/summary-agent-v1",
        name: "Research Summary Agent",
        description: "Summarize research materials into traceable markdown artifacts.",
        kind: "task",
        tags: ["research", "summary"],
      });
    };

    const draft = await sendMetaAgentConversationMessage({
      message:
        "创建一个研究摘要 Agent，输入 topic 和 docs，调用大模型和 search API，输出 markdown summary artifact 并保存 trace。",
    });

    assert.equal(draft.state, "ready_to_create");
    assert.equal(draft.result, null);
    assert.match(draft.reply, /确认创建/);
    assert.equal(draft.messages.length, 2);
    assert.equal(draft.messages[0].role, "user");
    assert.equal(draft.messages[1].kind, "checkpoint");

    const created = await sendMetaAgentConversationMessage({
      workId: draft.workId,
      message: "确认创建",
    });

    assert.equal(created.state, "created");
    assert.equal(created.result?.validation.ok, true);
    assert.equal(created.result?.specSource, "llm");
    assert.equal(created.result?.agentId, "research/summary-agent-v1");
    assert.equal(created.workId, draft.workId);
    assert.equal(requestedUrls.every((url) => url === "https://llm.example.com/v1/chat/completions"), true);
    assert.equal(requestedBodies.length, 3);

    const trace = JSON.parse(await readFile(path.join("traces", created.result!.runId, "run.json"), "utf8"));
    assert.equal(trace.run.workId, draft.workId);
    assert.match(trace.run.input.prompt, /研究摘要 Agent/);
    const specStep = trace.steps.find((step: { id?: string }) => step.id === "spec-draft");
    assert.equal(specStep.outputSummary.source, "llm");
    assert.equal(specStep.outputSummary.model, "meta-model");

    const store = await readWorkStore();
    const work = store.works.find((item) => item.id === draft.workId);
    assert.ok(work);
    assert.deepEqual(work.runIds, [created.result?.runId]);
    assert.equal(
      store.messages.some(
        (message) =>
          message.workId === draft.workId &&
          message.role === "user" &&
          message.content.includes("Create a Moyu Agent from this conversation."),
      ),
      false,
    );
    assert.equal(
      store.messages.some(
        (message) =>
          message.workId === draft.workId &&
          message.role === "agent" &&
          message.kind === "summary" &&
          /已生成 Agent 草案/.test(message.content),
      ),
      true,
    );
  } finally {
    globalThis.fetch = previousFetch;
    process.chdir(previousCwd);
    restore();
    await rm(workspace, { recursive: true, force: true });
  }
});

function jsonChatResponse(content: unknown) {
  return new Response(
    JSON.stringify({
      model: "meta-model",
      choices: [
        {
          message: {
            content: JSON.stringify(content),
          },
        },
      ],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function setLlmEnv() {
  process.env.MOYU_LLM_PROVIDER_BASE_URL = "https://llm.example.com/v1";
  process.env.MOYU_LLM_PROVIDER_API_KEY = "test-key";
  process.env.MOYU_LLM_PROVIDER_MODEL = "meta-model";
}

function captureLlmEnv() {
  const previousBaseUrl = process.env.MOYU_LLM_PROVIDER_BASE_URL;
  const previousApiKey = process.env.MOYU_LLM_PROVIDER_API_KEY;
  const previousModel = process.env.MOYU_LLM_PROVIDER_MODEL;
  return () => {
    restoreEnv("MOYU_LLM_PROVIDER_BASE_URL", previousBaseUrl);
    restoreEnv("MOYU_LLM_PROVIDER_API_KEY", previousApiKey);
    restoreEnv("MOYU_LLM_PROVIDER_MODEL", previousModel);
  };
}

function restoreEnv(name: string, value: string | undefined) {
  if (typeof value === "string") {
    process.env[name] = value;
  } else {
    delete process.env[name];
  }
}
