import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  listConversationMessages,
  listWorkRecords,
  readWorkStore,
  recordRunConversation,
  resolveWorkStorePath,
  updateWorkStateForRun,
} from "./work-store.js";

test("work store persists and queries Work and Conversation messages", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-work-store-"));
  const storePath = path.join(workspace, "artifacts", "workbench", "work-store.json");

  try {
    const first = await recordRunConversation(
      {
        runId: "run-001",
        workId: "work-homepage",
        agentId: "custom/image-prototype-v1",
        title: "Create a homepage concept",
        state: "waiting_user",
        prompt: "Create a homepage concept",
        planSummary: "计划：生成首页概念\n1. 整理输入：确认目标和风格。",
        summary: "已生成草案，请审核。",
        artifactIds: ["art-run-001-1"],
        startedAt: "2026-06-09T00:00:00.000Z",
        updatedAt: "2026-06-09T00:00:02.000Z",
      },
      { storePath },
    );

    assert.equal(first.work.id, "work-homepage");
    assert.deepEqual(first.work.runIds, ["run-001"]);
    assert.equal(first.messages.length, 3);
    assert.equal(resolveWorkStorePath({ storePath }), storePath);

    const raw = JSON.parse(await readFile(storePath, "utf8"));
    assert.equal(raw.schemaVersion, 1);
    assert.equal(raw.works.length, 1);
    assert.equal(raw.messages.length, 3);

    await recordRunConversation(
      {
        runId: "run-001",
        workId: "work-homepage",
        agentId: "custom/image-prototype-v1",
        title: "Create a homepage concept",
        state: "running",
        prompt: "Create a homepage concept",
        summary: "运行中。",
        startedAt: "2026-06-09T00:00:00.000Z",
        updatedAt: "2026-06-09T00:00:03.000Z",
      },
      { storePath },
    );

    const updated = await updateWorkStateForRun(
      {
        runId: "run-001",
        state: "completed",
        summary: "已安装到正式 Agent。",
        updatedAt: "2026-06-09T00:00:04.000Z",
      },
      { storePath },
    );
    assert.equal(updated?.state, "completed");

    const completedWorks = await listWorkRecords({ storePath, state: "completed" });
    assert.equal(completedWorks.length, 1);
    assert.equal(completedWorks[0].id, "work-homepage");
    assert.deepEqual(completedWorks[0].runIds, ["run-001"]);

    const runMessages = await listConversationMessages({ storePath, runId: "run-001" });
    assert.equal(runMessages.length, 4);
    assert.equal(runMessages[0].kind, "user_message");
    assert.equal(runMessages[1].kind, "plan");
    assert.match(runMessages[1].content, /生成首页概念/);
    assert.equal(runMessages[2].content, "运行中。");
    assert.equal(runMessages[3].content, "已安装到正式 Agent。");

    const store = await readWorkStore({ storePath });
    assert.equal(store.works[0].state, "completed");
    assert.equal(store.messages.length, 4);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
