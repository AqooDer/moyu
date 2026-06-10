import { createArtifactDeliveryRecord } from "./artifact-delivery.js";
import { formatPlanSummary } from "./plans.js";
import { toRuntimeStepError } from "./step-runner.js";
import { RuntimeStore } from "./store.js";
import { recordRunConversation } from "./work-store.js";

export interface FailedRunFinalizerInput {
  runtime: RuntimeStore;
  workId: string;
  agentId: string;
  title: string;
  error: unknown;
  prompt?: string | null;
  summary?: string | null;
}

export async function finalizeFailedRun(input: FailedRunFinalizerInput) {
  const runtimeError = toRuntimeStepError(input.error);
  const summary = input.summary
    ? `${input.summary}\n错误：${runtimeError.message}`
    : `运行失败：${runtimeError.message}`;
  input.runtime.addNote(`Run failed: ${runtimeError.code}: ${runtimeError.message}`);
  input.runtime.setRunState("failed", runtimeError.message);
  input.runtime.setArtifactDelivery(
    createArtifactDeliveryRecord({
      run: input.runtime.snapshot.run,
      artifacts: input.runtime.snapshot.artifacts,
      title: "Failed run artifact delivery manifest",
      state: input.runtime.snapshot.artifacts.length > 0 ? "partial" : "failed",
      createdAt: input.runtime.snapshot.run.endedAt ?? input.runtime.snapshot.run.startedAt,
    }),
  );
  const traceFile = await input.runtime.writeTrace();
  await recordRunConversation({
    runId: input.runtime.runId,
    workId: input.workId,
    agentId: input.agentId,
    title: input.title,
    state: "completed",
    prompt: input.prompt,
    planSummary: formatPlanSummary(input.runtime.snapshot.plan),
    summary,
    artifactIds: input.runtime.snapshot.artifacts.map((artifact) => artifact.id),
    startedAt: input.runtime.snapshot.run.startedAt,
    updatedAt: input.runtime.snapshot.run.endedAt,
  });
  return {
    traceFile,
    error: runtimeError,
  };
}
