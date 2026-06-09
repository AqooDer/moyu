import { getRunHistoryDetail, listRunHistory, type RunHistoryItem } from "./history.js";
import type { RuntimeTrace, StepState, WorkRecord, WorkState } from "./types.js";
import {
  createWorkIdFromRunId,
  listWorkRecords,
  type WorkStoreOptions,
} from "./work-store.js";

export type WorkLifecycleState = WorkState | "failed" | "cancelled" | "unknown";
export type WorkLifecycleSource = "run_trace" | "work_store" | "fallback_trace";

export interface WorkProgress {
  totalSteps: number;
  completedSteps: number;
  runningSteps: number;
  failedSteps: number;
  skippedSteps: number;
  pendingSteps: number;
  percent: number;
}

export interface WorkLifecycle {
  state: WorkLifecycleState;
  source: WorkLifecycleSource;
  currentRunId: string | null;
  runState: string | null;
  planState: string | null;
  progress: WorkProgress;
  updatedAt: string | null;
}

export interface WorkSummary {
  id: string;
  projectId: string | null;
  title: string;
  state: WorkLifecycleState;
  storedState: WorkState | null;
  agentId: string | null;
  runIds: string[];
  currentRunId: string | null;
  artifactCount: number;
  dryRun: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  lifecycle: WorkLifecycle;
  progress: WorkProgress;
}

export async function listWorkSummaries(
  input: WorkStoreOptions & {
    tracesRoot?: string;
    limit?: number;
    state?: WorkLifecycleState;
  } = {},
) {
  const runs = await listRunHistory({ tracesRoot: input.tracesRoot });
  const storedWorks = await listWorkRecords({ storePath: input.storePath });
  const summaries = await buildWorkSummaries({ runs, storedWorks, tracesRoot: input.tracesRoot });
  const filtered = input.state ? summaries.filter((work) => work.state === input.state) : summaries;
  return typeof input.limit === "number" ? filtered.slice(0, input.limit) : filtered;
}

export async function buildWorkSummaries(input: {
  runs: RunHistoryItem[];
  storedWorks: WorkRecord[];
  tracesRoot?: string;
}) {
  const referencedRuns = new Set(input.storedWorks.flatMap((work) => work.runIds));
  const storedSummaries = await Promise.all(
    input.storedWorks.map((work) => summarizeStoredWork(work, input.runs, input.tracesRoot)),
  );
  const fallbackSummaries = await Promise.all(
    input.runs
      .filter((run) => !referencedRuns.has(run.id))
      .map((run) => summarizeFallbackRun(run, input.tracesRoot)),
  );

  return [...storedSummaries, ...fallbackSummaries].sort((left, right) =>
    (right.updatedAt || "").localeCompare(left.updatedAt || ""),
  );
}

async function summarizeStoredWork(
  work: WorkRecord,
  runs: RunHistoryItem[],
  tracesRoot?: string,
): Promise<WorkSummary> {
  const latestRun = findLatestRunForWork(work.runIds, runs);
  const trace = latestRun ? await readRuntimeTrace(latestRun.id, tracesRoot) : null;
  const lifecycle = buildLifecycle({
    storedState: work.state,
    storedUpdatedAt: work.updatedAt,
    run: latestRun,
    trace,
    source: latestRun ? "run_trace" : "work_store",
  });
  return {
    id: work.id,
    projectId: work.projectId,
    title: work.title,
    state: lifecycle.state,
    storedState: work.state,
    agentId: work.agentId || latestRun?.agentId || null,
    runIds: work.runIds,
    currentRunId: lifecycle.currentRunId,
    artifactCount: latestRun?.artifactCount ?? trace?.artifacts.length ?? 0,
    dryRun: latestRun?.dryRun ?? trace?.run.dryRun ?? false,
    createdAt: work.createdAt,
    updatedAt: lifecycle.updatedAt || work.updatedAt,
    lifecycle,
    progress: lifecycle.progress,
  };
}

async function summarizeFallbackRun(run: RunHistoryItem, tracesRoot?: string): Promise<WorkSummary> {
  const trace = await readRuntimeTrace(run.id, tracesRoot);
  const lifecycle = buildLifecycle({
    storedState: null,
    storedUpdatedAt: null,
    run,
    trace,
    source: "fallback_trace",
  });
  return {
    id: trace?.run.workId || createWorkIdFromRunId(run.id),
    projectId: null,
    title: run.prompt || `${run.agentId} run`,
    state: lifecycle.state,
    storedState: null,
    agentId: run.agentId,
    runIds: [run.id],
    currentRunId: run.id,
    artifactCount: run.artifactCount,
    dryRun: run.dryRun,
    createdAt: run.startedAt,
    updatedAt: lifecycle.updatedAt,
    lifecycle,
    progress: lifecycle.progress,
  };
}

function buildLifecycle(input: {
  storedState: WorkState | null;
  storedUpdatedAt: string | null;
  run: RunHistoryItem | null;
  trace: RuntimeTrace | null;
  source: WorkLifecycleSource;
}): WorkLifecycle {
  const runState = input.trace?.run.state ?? input.run?.state ?? null;
  const planState = input.trace?.plan?.state ?? null;
  const progress = buildProgress(input.trace, runState);
  return {
    state: resolveLifecycleState(input.storedState, runState),
    source: input.source,
    currentRunId: input.trace?.run.id ?? input.run?.id ?? null,
    runState,
    planState,
    progress,
    updatedAt:
      input.trace?.run.endedAt ||
      input.trace?.plan?.updatedAt ||
      input.run?.startedAt ||
      input.storedUpdatedAt ||
      null,
  };
}

function resolveLifecycleState(
  storedState: WorkState | null,
  runState: string | null,
): WorkLifecycleState {
  if (storedState === "archived") {
    return "archived";
  }
  if (runState === "failed") {
    return "failed";
  }
  if (runState === "cancelled") {
    return "cancelled";
  }
  if (runState === "queued" || runState === "running") {
    return "running";
  }
  if (storedState === "waiting_user") {
    return "waiting_user";
  }
  if (runState === "succeeded") {
    return "completed";
  }
  return storedState ?? "unknown";
}

function buildProgress(trace: RuntimeTrace | null, runState: string | null): WorkProgress {
  const stepStates = trace?.plan?.steps.map((step) => step.state) ?? trace?.steps.map((step) => step.state) ?? [];
  if (stepStates.length === 0) {
    const percent = runState === "succeeded" ? 100 : runState === "running" || runState === "queued" ? 50 : 0;
    return emptyProgress(percent);
  }

  const counts = countStepStates(stepStates);
  const completedSteps = counts.succeeded + counts.skipped;
  return {
    totalSteps: stepStates.length,
    completedSteps,
    runningSteps: counts.running,
    failedSteps: counts.failed,
    skippedSteps: counts.skipped,
    pendingSteps: counts.pending,
    percent: Math.round((completedSteps / stepStates.length) * 100),
  };
}

function countStepStates(states: StepState[]) {
  return {
    pending: states.filter((state) => state === "pending").length,
    running: states.filter((state) => state === "running").length,
    succeeded: states.filter((state) => state === "succeeded").length,
    failed: states.filter((state) => state === "failed").length,
    skipped: states.filter((state) => state === "skipped").length,
  };
}

function emptyProgress(percent: number): WorkProgress {
  return {
    totalSteps: 0,
    completedSteps: 0,
    runningSteps: 0,
    failedSteps: 0,
    skippedSteps: 0,
    pendingSteps: 0,
    percent,
  };
}

function findLatestRunForWork(runIds: string[], runs: RunHistoryItem[]) {
  return runs
    .filter((run) => runIds.includes(run.id))
    .sort((left, right) => (right.startedAt || "").localeCompare(left.startedAt || ""))[0] ?? null;
}

async function readRuntimeTrace(runId: string, tracesRoot?: string) {
  const detail = await getRunHistoryDetail(runId, { tracesRoot });
  return detail && isRuntimeTrace(detail.trace) ? detail.trace : null;
}

function isRuntimeTrace(trace: unknown): trace is RuntimeTrace {
  return Boolean(
    trace &&
      typeof trace === "object" &&
      "schemaVersion" in trace &&
      (trace as { schemaVersion?: unknown }).schemaVersion === 1 &&
      "run" in trace &&
      "steps" in trace &&
      "artifacts" in trace,
  );
}
