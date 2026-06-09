import assert from "node:assert/strict";
import test from "node:test";
import { createPlanRecord } from "./plans.js";
import { runRuntimeStep } from "./step-runner.js";
import { RuntimeStore } from "./store.js";

test("runtime step runner records succeeded steps and syncs plan state", async () => {
  const runtime = createRuntimeWithPlan("run-step-success");

  const result = await runRuntimeStep({
    runtime,
    id: "execute",
    name: "EXECUTE",
    kind: "tool",
    inputSummary: { input: "ok" },
    execute: () => ({
      outputSummary: { files: 2 },
      value: ["a.md", "b.md"],
    }),
  });

  assert.deepEqual(result.value, ["a.md", "b.md"]);
  assert.equal(result.state, "succeeded");
  assert.equal(runtime.snapshot.steps.length, 1);
  assert.equal(runtime.snapshot.steps[0].state, "succeeded");
  assert.deepEqual(runtime.snapshot.steps[0].inputSummary, { input: "ok" });
  assert.deepEqual(runtime.snapshot.steps[0].outputSummary, { files: 2 });
  assert.equal(runtime.snapshot.steps[0].error, null);
  assert.equal(runtime.snapshot.plan?.steps.find((step) => step.id === "execute")?.state, "succeeded");
});

test("runtime step runner records skipped steps", async () => {
  const runtime = createRuntimeWithPlan("run-step-skipped");

  await runRuntimeStep({
    runtime,
    id: "execute",
    name: "EXECUTE",
    kind: "skill",
    execute: () => ({
      state: "skipped",
      outputSummary: { reason: "dry-run" },
    }),
  });

  assert.equal(runtime.snapshot.steps[0].state, "skipped");
  assert.deepEqual(runtime.snapshot.steps[0].outputSummary, { reason: "dry-run" });
  assert.equal(runtime.snapshot.steps[0].error, null);
  assert.equal(runtime.snapshot.plan?.steps.find((step) => step.id === "execute")?.state, "skipped");
});

test("runtime step runner records failed steps before rethrowing", async () => {
  const runtime = createRuntimeWithPlan("run-step-failed");
  const error = Object.assign(new Error("provider refused request"), {
    code: "provider_refused",
  });

  await assert.rejects(
    runRuntimeStep({
      runtime,
      id: "execute",
      name: "EXECUTE",
      kind: "tool",
      execute: () => {
        throw error;
      },
    }),
    /provider refused request/,
  );

  assert.equal(runtime.snapshot.steps.length, 1);
  assert.equal(runtime.snapshot.steps[0].state, "failed");
  assert.deepEqual(runtime.snapshot.steps[0].outputSummary, {});
  assert.deepEqual(runtime.snapshot.steps[0].error, {
    code: "provider_refused",
    message: "provider refused request",
  });
  assert.equal(runtime.snapshot.plan?.steps.find((step) => step.id === "execute")?.state, "failed");
});

test("runtime step runner accepts explicit failed results without throwing", async () => {
  const runtime = createRuntimeWithPlan("run-step-explicit-failed");

  const result = await runRuntimeStep({
    runtime,
    id: "execute",
    name: "EXECUTE",
    kind: "tool",
    execute: () => ({
      state: "failed",
      outputSummary: { validation_errors: 2 },
      error: {
        code: "validation_failed",
        message: "Validation failed.",
      },
    }),
  });

  assert.equal(result.state, "failed");
  assert.equal(runtime.snapshot.steps[0].state, "failed");
  assert.deepEqual(runtime.snapshot.steps[0].outputSummary, { validation_errors: 2 });
  assert.deepEqual(runtime.snapshot.steps[0].error, {
    code: "validation_failed",
    message: "Validation failed.",
  });
  assert.equal(runtime.snapshot.plan?.steps.find((step) => step.id === "execute")?.state, "failed");
});

function createRuntimeWithPlan(runId: string) {
  const runtime = RuntimeStore.createRun({
    id: runId,
    workId: `work-${runId}`,
    agentId: "test/runner",
    agentVersion: "0.1.0",
    recipeId: "test/runner",
    dryRun: true,
    input: { prompt: "test runner" },
  });
  runtime.setPlan(
    createPlanRecord({
      runId,
      workId: `work-${runId}`,
      title: "Runner test plan",
      createdAt: runtime.snapshot.run.startedAt,
      steps: [
        {
          id: "execute",
          title: "Execute",
          kind: "tool",
          summary: "Run one step.",
        },
      ],
    }),
  );
  return runtime;
}
