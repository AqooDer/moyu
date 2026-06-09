import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createPlanRecord } from "./plans.js";
import { RuntimeStore } from "./store.js";
import { listWorkSummaries } from "./work-manager.js";
import { upsertWorkRecord } from "./work-store.js";

test("work manager projects lifecycle and progress from the latest runtime trace", async () => {
  const previousCwd = process.cwd();
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-work-manager-"));
  const storePath = path.join(workspace, "artifacts", "workbench", "work-store.json");

  try {
    process.chdir(workspace);

    const runtime = RuntimeStore.createRun({
      id: "run-lifecycle-001",
      workId: "work-lifecycle",
      agentId: "custom/lifecycle-agent",
      agentVersion: "0.1.0",
      recipeId: "custom/lifecycle",
      dryRun: true,
      input: { prompt: "summarize lifecycle" },
    });
    runtime.setPlan(
      createPlanRecord({
        runId: runtime.runId,
        workId: "work-lifecycle",
        title: "生命周期测试计划",
        createdAt: runtime.snapshot.run.startedAt,
        steps: [
          {
            id: "input",
            title: "整理输入",
            kind: "control",
            summary: "读取用户请求。",
          },
          {
            id: "execute",
            title: "执行任务",
            kind: "skill",
            summary: "dry-run 时跳过真实执行。",
            dependsOn: ["input"],
          },
        ],
      }),
    );
    runtime.updatePlanStep("input", "succeeded");
    runtime.updatePlanStep("execute", "skipped");
    runtime.setRunState("succeeded");
    await runtime.writeTrace();

    await upsertWorkRecord(
      {
        id: "work-lifecycle",
        projectId: null,
        title: "Stale lifecycle work",
        state: "active",
        agentId: "custom/lifecycle-agent",
        runIds: [runtime.runId],
        createdAt: "2026-06-09T00:00:00.000Z",
        updatedAt: "2026-06-09T00:00:01.000Z",
      },
      { storePath },
    );

    const summaries = await listWorkSummaries({
      tracesRoot: path.join(workspace, "traces"),
      storePath,
    });

    assert.equal(summaries.length, 1);
    assert.equal(summaries[0].id, "work-lifecycle");
    assert.equal(summaries[0].storedState, "active");
    assert.equal(summaries[0].state, "completed");
    assert.equal(summaries[0].lifecycle.source, "run_trace");
    assert.equal(summaries[0].lifecycle.runState, "succeeded");
    assert.equal(summaries[0].lifecycle.planState, "succeeded");
    assert.equal(summaries[0].currentRunId, runtime.runId);
    assert.deepEqual(summaries[0].runIds, [runtime.runId]);
    assert.equal(summaries[0].progress.totalSteps, 2);
    assert.equal(summaries[0].progress.completedSteps, 2);
    assert.equal(summaries[0].progress.skippedSteps, 1);
    assert.equal(summaries[0].progress.percent, 100);

    const completed = await listWorkSummaries({
      tracesRoot: path.join(workspace, "traces"),
      storePath,
      state: "completed",
    });
    assert.deepEqual(
      completed.map((work) => work.id),
      ["work-lifecycle"],
    );

    const active = await listWorkSummaries({
      tracesRoot: path.join(workspace, "traces"),
      storePath,
      state: "active",
    });
    assert.deepEqual(active, []);
  } finally {
    process.chdir(previousCwd);
    await rm(workspace, { recursive: true, force: true });
  }
});
