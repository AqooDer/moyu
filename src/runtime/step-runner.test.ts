import assert from "node:assert/strict";
import test from "node:test";
import { createExecutionModeRecord } from "./execution-mode.js";
import { createMiddlewarePipelineRecord } from "./middleware-pipeline.js";
import { createPolicyEvaluationRecord } from "./policy-gate.js";
import { createPlanRecord } from "./plans.js";
import { startInlineWorkerJob } from "./async-worker.js";
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
  assert.deepEqual(
    runtime.snapshot.events.map((event) => event.kind),
    ["plan_created", "step_started", "step_finished"],
  );
  assert.equal(runtime.snapshot.events[1].stepId, "execute");
  assert.equal(runtime.snapshot.events[2].state, "succeeded");
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
  assert.equal(runtime.snapshot.events.some((event) => event.kind === "step_finished" && event.state === "skipped"), true);
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
  assert.equal(runtime.snapshot.events.some((event) => event.kind === "step_finished" && event.state === "failed"), true);
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
  assert.equal(runtime.snapshot.events.some((event) => event.kind === "step_finished" && event.state === "failed"), true);
});

test("runtime store records inline worker lifecycle events", () => {
  const runtime = createRuntimeWithPlan("run-worker");

  const worker = startInlineWorkerJob({
    runtime,
    queue: "test.inline",
    requestedBy: "test/runner",
  });
  runtime.setRunState("running");
  runtime.setRunState("succeeded");
  runtime.finishWorkerJob("succeeded");

  assert.equal(worker.id, "worker-run-worker");
  assert.equal(runtime.snapshot.worker?.queue, "test.inline");
  assert.equal(runtime.snapshot.worker?.state, "succeeded");
  assert.deepEqual(
    runtime.snapshot.events.map((event) => event.kind),
    [
      "plan_created",
      "worker_queued",
      "worker_started",
      "run_state_changed",
      "run_state_changed",
      "worker_finished",
    ],
  );
  assert.equal(runtime.snapshot.events[1].workerJobId, "worker-run-worker");
  assert.equal(runtime.snapshot.events[5].state, "succeeded");
});

test("runtime store records middleware pipeline snapshots", () => {
  const runtime = createRuntimeWithPlan("run-middleware");

  const pipeline = runtime.setMiddlewarePipeline(
    createMiddlewarePipelineRecord({
      runId: runtime.runId,
      workId: `work-${runtime.runId}`,
      title: "Test middleware pipeline",
      createdAt: runtime.snapshot.run.startedAt,
      stages: [
        {
          id: "capability-injection",
          title: "Capability injection",
          kind: "capability-injection",
          state: "ready",
          capabilityIds: ["artifact-write"],
          policyIds: ["artifact.write.scoped"],
          inputSummary: "Read registry.",
          outputSummary: "Injected artifact writer.",
          sources: ["plugin-registry"],
        },
      ],
    }),
  );

  assert.equal(runtime.snapshot.middleware?.id, `middleware-${runtime.runId}`);
  assert.equal(runtime.snapshot.middleware?.title, "Test middleware pipeline");
  assert.equal(runtime.snapshot.middleware?.state, "ready");
  assert.equal(pipeline.stages[0].kind, "capability-injection");
  assert.deepEqual(pipeline.stages[0].capabilityIds, ["artifact-write"]);
  assert.deepEqual(pipeline.stages[0].policyIds, ["artifact.write.scoped"]);
  assert.deepEqual(pipeline.stages[0].sources, ["plugin-registry"]);
});

test("runtime store records policy evaluation snapshots", () => {
  const runtime = createRuntimeWithPlan("run-policy");
  const middleware = runtime.setMiddlewarePipeline(
    createMiddlewarePipelineRecord({
      runId: runtime.runId,
      workId: `work-${runtime.runId}`,
      title: "Test middleware pipeline",
      createdAt: runtime.snapshot.run.startedAt,
      stages: [
        {
          id: "capability-injection",
          title: "Capability injection",
          kind: "capability-injection",
          state: "ready",
          capabilityIds: ["artifact-write", "artifact-preview-v1"],
          policyIds: ["artifact.write.scoped", "artifact.preview.read"],
          inputSummary: "Read registry.",
          outputSummary: "Injected artifact services.",
          sources: ["plugin-registry"],
        },
      ],
    }),
  );

  const policy = runtime.setPolicyEvaluation(
    createPolicyEvaluationRecord({
      run: runtime.snapshot.run,
      middleware,
      title: "Test policy evaluation",
      createdAt: runtime.snapshot.run.startedAt,
    }),
  );

  assert.equal(runtime.snapshot.policy?.id, `policy-${runtime.runId}`);
  assert.equal(runtime.snapshot.policy?.title, "Test policy evaluation");
  assert.equal(policy.state, "allowed");
  assert.equal(policy.summary.allowed > 0, true);
  assert.equal(policy.checks.some((check) => check.id === "permission-artifact.write.scoped"), true);
  assert.equal(policy.checks.some((check) => check.id === "artifact-write-scope"), true);
});

test("runtime store records execution mode snapshots", () => {
  const runtime = createRuntimeWithPlan("run-execution-mode");

  const execution = runtime.setExecutionMode(
    createExecutionModeRecord({
      run: runtime.snapshot.run,
      title: "Test execution mode",
      mode: "dry_run",
      dispatch: "inline",
      queue: "test.inline",
      entrypoint: "test.runner",
      requestedBy: "test/runner",
      dryRunEffective: true,
      reason: "Test requested dry-run execution.",
      createdAt: runtime.snapshot.run.startedAt,
      capabilities: [
        {
          id: "test-capability",
          title: "Test capability",
          state: "skipped",
          summary: "Skipped during dry-run.",
          sources: ["test"],
        },
      ],
      constraints: ["No external calls."],
    }),
  );

  assert.equal(runtime.snapshot.execution?.id, "execution-run-execution-mode");
  assert.equal(runtime.snapshot.execution?.title, "Test execution mode");
  assert.equal(execution.mode, "dry_run");
  assert.equal(execution.queue, "test.inline");
  assert.equal(execution.dryRunRequested, true);
  assert.equal(execution.dryRunEffective, true);
  assert.equal(execution.capabilities[0].state, "skipped");
  assert.equal(
    runtime.snapshot.events.some(
      (event) => event.kind === "execution_mode_selected" && event.state === "dry_run",
    ),
    true,
  );
  const event = runtime.snapshot.events.find((item) => item.kind === "execution_mode_selected");
  assert.equal(event?.data.queue, "test.inline");
  assert.equal(event?.data.entrypoint, "test.runner");
});

test("runtime store records sandbox filesystem snapshots", () => {
  const runtime = createRuntimeWithPlan("run-sandbox");

  const sandbox = runtime.setSandboxFilesystem({
    id: "sandbox-run-sandbox",
    runId: runtime.runId,
    workId: `work-${runtime.runId}`,
    root: "/workspace/artifacts/sandboxes/run-sandbox",
    relativeRoot: "artifacts/sandboxes/run-sandbox",
    scope: "run",
    state: "ready",
    directories: [
      {
        id: "sandbox-run-sandbox-workspace",
        kind: "workspace",
        path: "/workspace/artifacts/sandboxes/run-sandbox/workspace",
        relativePath: "artifacts/sandboxes/run-sandbox/workspace",
        writable: true,
        cleanupPolicy: "keep",
        created: true,
        summary: "Run workspace.",
      },
      {
        id: "sandbox-run-sandbox-outputs",
        kind: "outputs",
        path: "/workspace/artifacts/agent-runs/test/runner/run-sandbox",
        relativePath: "artifacts/agent-runs/test/runner/run-sandbox",
        writable: true,
        cleanupPolicy: "keep",
        created: true,
        summary: "Run outputs.",
      },
    ],
    constraints: ["No process isolation in v1."],
    createdAt: runtime.snapshot.run.startedAt,
    updatedAt: runtime.snapshot.run.startedAt,
  });

  assert.equal(runtime.snapshot.sandbox?.id, "sandbox-run-sandbox");
  assert.equal(sandbox.state, "ready");
  assert.deepEqual(
    sandbox.directories.map((directory) => directory.kind),
    ["workspace", "outputs"],
  );
  assert.equal(sandbox.directories[0].writable, true);
  assert.equal(
    runtime.snapshot.events.some(
      (event) => event.kind === "sandbox_created" && event.state === "ready",
    ),
    true,
  );
  const event = runtime.snapshot.events.find((item) => item.kind === "sandbox_created");
  assert.equal(event?.data.scope, "run");
  assert.deepEqual(event?.data.directories, [
    {
      kind: "workspace",
      relativePath: "artifacts/sandboxes/run-sandbox/workspace",
      writable: true,
      cleanupPolicy: "keep",
    },
    {
      kind: "outputs",
      relativePath: "artifacts/agent-runs/test/runner/run-sandbox",
      writable: true,
      cleanupPolicy: "keep",
    },
  ]);
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
