import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { readWorkStore } from "../runtime/work-store.js";
import { sendMetaAgentConversationMessage } from "./conversation.js";

test("Meta-Agent conversation collects requirements before confirmed creation", async () => {
  const previousCwd = process.cwd();
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-meta-conversation-"));
  const restore = captureLlmEnv();

  try {
    process.chdir(workspace);
    delete process.env.MOYU_LLM_PROVIDER_BASE_URL;
    delete process.env.MOYU_LLM_PROVIDER_API_KEY;
    delete process.env.MOYU_LLM_PROVIDER_MODEL;

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
    assert.equal(created.result?.agentId, "custom/agent-v1");
    assert.equal(created.workId, draft.workId);

    const trace = JSON.parse(await readFile(path.join("traces", created.result!.runId, "run.json"), "utf8"));
    assert.equal(trace.run.workId, draft.workId);
    assert.match(trace.run.input.prompt, /研究摘要 Agent/);

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
    process.chdir(previousCwd);
    restore();
    await rm(workspace, { recursive: true, force: true });
  }
});

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
