import { spawn } from "node:child_process";
import { platform } from "node:os";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type {
  ArtifactRecord,
  ExecutionCapabilityState,
  ExecutionMode,
  ExecutionModeRecord,
  KnowledgeWriteBackRecord,
  MiddlewarePipelineRecord,
  PolicyCheckKind,
  PolicyDecisionState,
  PolicyEvaluationRecord,
  PolicyRiskLevel,
  RuntimeTrace,
  PlanRecord,
  TraceEventKind,
  TraceEventRecord,
  WorkerJobMode,
  WorkerJobRecord,
  WorkerJobState,
} from "./types.js";

export interface RunHistoryItem {
  id: string;
  agentId: string;
  state: string;
  dryRun: boolean;
  startedAt: string | null;
  durationMs: number | null;
  artifactCount: number;
  prompt: string | null;
  traceFile: string;
  schema: "runtime-v1" | "legacy" | "unknown";
}

export interface RunHistoryDetail {
  item: RunHistoryItem;
  trace: RuntimeTrace | LegacyTrace | Record<string, unknown>;
}

interface LegacyTrace {
  run_id?: string;
  status?: string;
  prompt?: string;
  count?: number;
  size?: string;
  style?: string;
  output_dir?: string;
  outputs?: unknown[];
  started_at?: string;
  duration_ms?: number;
}

export async function listRunHistory(input: { tracesRoot?: string; limit?: number } = {}) {
  const tracesRoot = path.resolve(input.tracesRoot ?? "traces");
  const entries = await safeReadDir(tracesRoot);
  const items: RunHistoryItem[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const traceFile = path.join(tracesRoot, entry.name, "run.json");
    if (!(await fileExists(traceFile))) {
      continue;
    }

    const detail = await readRunTraceFile(traceFile);
    items.push(detail.item);
  }

  items.sort((left, right) => {
    const leftTime = left.startedAt ? new Date(left.startedAt).getTime() : 0;
    const rightTime = right.startedAt ? new Date(right.startedAt).getTime() : 0;
    return rightTime - leftTime;
  });

  return typeof input.limit === "number" ? items.slice(0, input.limit) : items;
}

export async function getRunHistoryDetail(
  runId: string,
  input: { tracesRoot?: string } = {},
): Promise<RunHistoryDetail | null> {
  const tracesRoot = path.resolve(input.tracesRoot ?? "traces");
  const directTraceFile = path.join(tracesRoot, runId, "run.json");

  if (await fileExists(directTraceFile)) {
    return readRunTraceFile(directTraceFile);
  }

  const items = await listRunHistory({ tracesRoot });
  const match = items.find((item) => item.id === runId);
  return match ? readRunTraceFile(match.traceFile) : null;
}

export async function openRunTrace(runId: string, input: { tracesRoot?: string } = {}) {
  const detail = await getRunHistoryDetail(runId, input);
  if (!detail) {
    return null;
  }

  await openFile(detail.item.traceFile);
  return detail.item;
}

export function formatRunHistoryList(items: RunHistoryItem[]) {
  if (items.length === 0) {
    return "No runs found.";
  }

  const rows = items.map((item) => [
    item.startedAt ?? "-",
    item.id,
    item.agentId,
    item.state,
    item.dryRun ? "yes" : "no",
    String(item.artifactCount),
    formatDuration(item.durationMs),
  ]);

  return formatTable(["started_at", "run_id", "agent", "state", "dry", "artifacts", "duration"], rows);
}

export function formatRunHistoryDetail(detail: RunHistoryDetail) {
  const { item, trace } = detail;
  const lines = [
    `run_id: ${item.id}`,
    `schema: ${item.schema}`,
    `agent: ${item.agentId}`,
    `state: ${item.state}`,
    `dry_run: ${item.dryRun ? "yes" : "no"}`,
    `started_at: ${item.startedAt ?? "-"}`,
    `duration: ${formatDuration(item.durationMs)}`,
    `trace: ${path.relative(process.cwd(), item.traceFile)}`,
  ];

  if (isRuntimeTrace(trace)) {
    lines.push("", "input:");
    lines.push(...formatObjectLines(trace.run.input));
    lines.push("", "plan:");
    lines.push(...formatPlanLines(trace.plan));
    lines.push("", "execution:");
    lines.push(...formatExecutionLines(trace.execution));
    lines.push("", "middleware:");
    lines.push(...formatMiddlewareLines(trace.middleware));
    lines.push("", "policy:");
    lines.push(...formatPolicyLines(trace.policy));
    lines.push("", "worker:");
    lines.push(...formatWorkerLines(trace.worker));
    lines.push("", "events:");
    lines.push(...formatEventLines(trace.events));
    lines.push("", "steps:");
    lines.push(...formatStepLines(trace));
    lines.push("", "artifacts:");
    lines.push(...formatArtifactLines(trace.artifacts));
    lines.push("", "knowledge_write_backs:");
    lines.push(...formatKnowledgeWriteBackLines(trace.knowledgeWriteBacks ?? []));
    if (trace.notes.length > 0) {
      lines.push("", "notes:");
      lines.push(...trace.notes.map((note) => `- ${note}`));
    }
    return lines.join("\n");
  }

  lines.push("", "legacy_trace:");
  lines.push(...formatObjectLines(trace));
  return lines.join("\n");
}

async function readRunTraceFile(traceFile: string): Promise<RunHistoryDetail> {
  const raw = await readFile(traceFile, "utf8");
  const parsed = JSON.parse(raw) as RuntimeTrace | LegacyTrace | Record<string, unknown>;
  const trace = isRuntimeTrace(parsed) ? normalizeRuntimeTrace(parsed) : parsed;
  return {
    item: summarizeTrace(trace, traceFile),
    trace,
  };
}

function summarizeTrace(
  trace: RuntimeTrace | LegacyTrace | Record<string, unknown>,
  traceFile: string,
): RunHistoryItem {
  if (isRuntimeTrace(trace)) {
    return {
      id: trace.run.id,
      agentId: trace.run.agentId,
      state: trace.run.state,
      dryRun: trace.run.dryRun,
      startedAt: trace.run.startedAt,
      durationMs: trace.run.durationMs,
      artifactCount: trace.artifacts.length,
      prompt: getRuntimePrompt(trace),
      traceFile,
      schema: "runtime-v1",
    };
  }

  if (isLegacyTrace(trace)) {
    return {
      id: trace.run_id ?? path.basename(path.dirname(traceFile)),
      agentId: "spike/image-gen",
      state: trace.status ?? "unknown",
      dryRun: trace.status === "dry-run",
      startedAt: trace.started_at ?? null,
      durationMs: trace.duration_ms ?? null,
      artifactCount: Array.isArray(trace.outputs) ? trace.outputs.length : 0,
      prompt: trace.prompt ?? null,
      traceFile,
      schema: "legacy",
    };
  }

  return {
    id: path.basename(path.dirname(traceFile)),
    agentId: "unknown",
    state: "unknown",
    dryRun: false,
    startedAt: null,
    durationMs: null,
    artifactCount: 0,
    prompt: null,
    traceFile,
    schema: "unknown",
  };
}

function getRuntimePrompt(trace: RuntimeTrace) {
  const prompt = trace.run.input.prompt;
  return typeof prompt === "string" ? prompt : null;
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

function isLegacyTrace(trace: unknown): trace is LegacyTrace {
  return Boolean(trace && typeof trace === "object" && "status" in trace);
}

function formatStepLines(trace: RuntimeTrace) {
  if (trace.steps.length === 0) {
    return ["- none"];
  }

  return trace.steps.map((step) => {
    const suffix = step.error ? ` error=${step.error.code}` : "";
    return `- ${step.id} ${step.name} [${step.kind}] ${step.state} ${formatDuration(step.durationMs)}${suffix}`;
  });
}

function formatPlanLines(plan: PlanRecord | null) {
  if (!plan) {
    return ["- none"];
  }

  const lines = [`- ${plan.id} ${plan.title} ${plan.state}`];
  for (const step of plan.steps) {
    const dependsOn = step.dependsOn.length > 0 ? ` depends_on=${step.dependsOn.join(",")}` : "";
    lines.push(`  - ${step.id} [${step.kind}] ${step.state}${dependsOn}: ${step.title}`);
  }
  return lines;
}

function formatArtifactLines(artifacts: ArtifactRecord[]) {
  if (artifacts.length === 0) {
    return ["- none"];
  }

  return artifacts.map((artifact) => {
    const relativePath = path.relative(process.cwd(), artifact.path);
    return `- ${artifact.id} ${artifact.name} ${artifact.type}/${artifact.role} ${formatBytes(
      artifact.sizeBytes,
    )} sha256=${artifact.sha256} path=${relativePath}`;
  });
}

function normalizeRuntimeTrace(trace: RuntimeTrace): RuntimeTrace {
  return {
    ...trace,
    plan: normalizePlan(trace.plan),
    middleware: normalizeMiddlewarePipeline(trace.middleware),
    policy: normalizePolicyEvaluation(trace.policy),
    execution: normalizeExecutionMode(trace.execution),
    worker: normalizeWorkerJob(trace.worker),
    events: normalizeTraceEvents(trace.events),
    run: {
      ...trace.run,
      modelRoles: trace.run.modelRoles ?? [],
      mcpServers: trace.run.mcpServers ?? [],
    },
    steps: Array.isArray(trace.steps) ? trace.steps : [],
    artifacts: Array.isArray(trace.artifacts) ? trace.artifacts : [],
    knowledgeWriteBacks: Array.isArray(trace.knowledgeWriteBacks) ? trace.knowledgeWriteBacks : [],
    notes: Array.isArray(trace.notes) ? trace.notes : [],
  };
}

function normalizePlan(plan: unknown): PlanRecord | null {
  if (!plan || typeof plan !== "object") {
    return null;
  }
  const raw = plan as PlanRecord;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `plan-${raw.runId || "unknown"}`,
    runId: typeof raw.runId === "string" && raw.runId ? raw.runId : "run-unknown",
    workId: typeof raw.workId === "string" && raw.workId ? raw.workId : "work-unknown",
    title: typeof raw.title === "string" && raw.title ? raw.title : "Untitled plan",
    state: ["drafted", "running", "succeeded", "failed", "cancelled"].includes(String(raw.state))
      ? raw.state
      : "drafted",
    steps: Array.isArray(raw.steps)
      ? raw.steps.map((step) => ({
          id: typeof step.id === "string" && step.id ? step.id : "step-unknown",
          title: typeof step.title === "string" && step.title ? step.title : "Untitled step",
          kind: ["llm", "tool", "skill", "agent_call", "control", "user_checkpoint"].includes(String(step.kind))
            ? step.kind
            : "control",
          state: ["pending", "running", "succeeded", "failed", "skipped"].includes(String(step.state))
            ? step.state
            : "pending",
          dependsOn: Array.isArray(step.dependsOn)
            ? step.dependsOn.filter((item): item is string => typeof item === "string" && Boolean(item))
            : [],
          summary: typeof step.summary === "string" ? step.summary : "",
        }))
      : [],
    createdAt: typeof raw.createdAt === "string" && raw.createdAt ? raw.createdAt : new Date(0).toISOString(),
    updatedAt: typeof raw.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : new Date(0).toISOString(),
  };
}

function normalizeMiddlewarePipeline(pipeline: unknown): MiddlewarePipelineRecord | null {
  if (!pipeline || typeof pipeline !== "object") {
    return null;
  }
  const raw = pipeline as MiddlewarePipelineRecord;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `middleware-${raw.runId || "unknown"}`,
    runId: typeof raw.runId === "string" && raw.runId ? raw.runId : "run-unknown",
    workId: typeof raw.workId === "string" && raw.workId ? raw.workId : "work-unknown",
    title: typeof raw.title === "string" && raw.title ? raw.title : "Runtime context pipeline",
    state: ["ready", "partial", "skipped", "failed"].includes(String(raw.state)) ? raw.state : "ready",
    stages: Array.isArray(raw.stages)
      ? raw.stages.map((stage) => ({
          id: typeof stage.id === "string" && stage.id ? stage.id : "stage-unknown",
          title: typeof stage.title === "string" && stage.title ? stage.title : "Untitled stage",
          kind: [
            "attachment-intake",
            "history-summary",
            "knowledge-context",
            "capability-injection",
          ].includes(String(stage.kind))
            ? stage.kind
            : "capability-injection",
          state: ["ready", "partial", "skipped", "planned", "failed"].includes(String(stage.state))
            ? stage.state
            : "planned",
          capabilityIds: Array.isArray(stage.capabilityIds)
            ? stage.capabilityIds.filter((item): item is string => typeof item === "string" && Boolean(item))
            : [],
          policyIds: Array.isArray(stage.policyIds)
            ? stage.policyIds.filter((item): item is string => typeof item === "string" && Boolean(item))
            : [],
          inputSummary: typeof stage.inputSummary === "string" ? stage.inputSummary : "",
          outputSummary: typeof stage.outputSummary === "string" ? stage.outputSummary : "",
          sources: Array.isArray(stage.sources)
            ? stage.sources.filter((item): item is string => typeof item === "string" && Boolean(item))
            : [],
        }))
      : [],
    createdAt: typeof raw.createdAt === "string" && raw.createdAt ? raw.createdAt : new Date(0).toISOString(),
    updatedAt: typeof raw.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : new Date(0).toISOString(),
  };
}

function normalizePolicyEvaluation(policy: unknown): PolicyEvaluationRecord | null {
  if (!policy || typeof policy !== "object") {
    return null;
  }
  const raw = policy as PolicyEvaluationRecord;
  const checks = Array.isArray(raw.checks)
    ? raw.checks.map((check) => ({
        id: typeof check.id === "string" && check.id ? check.id : "policy-check-unknown",
        title: typeof check.title === "string" && check.title ? check.title : "Untitled policy check",
        kind: normalizePolicyCheckKind(check.kind),
        state: normalizePolicyDecisionState(check.state),
        riskLevel: normalizePolicyRiskLevel(check.riskLevel),
        capabilityIds: normalizeStringList(check.capabilityIds),
        permissionIds: normalizeStringList(check.permissionIds),
        subjects: normalizeStringList(check.subjects),
        summary: typeof check.summary === "string" ? check.summary : "",
        sources: normalizeStringList(check.sources),
      }))
    : [];
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `policy-${raw.runId || "unknown"}`,
    runId: typeof raw.runId === "string" && raw.runId ? raw.runId : "run-unknown",
    workId: typeof raw.workId === "string" && raw.workId ? raw.workId : "work-unknown",
    title: typeof raw.title === "string" && raw.title ? raw.title : "Runtime policy evaluation",
    state: normalizePolicyDecisionState(raw.state),
    summary: normalizePolicySummary(raw.summary, checks),
    checks,
    createdAt: typeof raw.createdAt === "string" && raw.createdAt ? raw.createdAt : new Date(0).toISOString(),
    updatedAt: typeof raw.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : new Date(0).toISOString(),
  };
}

function normalizeExecutionMode(execution: unknown): ExecutionModeRecord | null {
  if (!execution || typeof execution !== "object") {
    return null;
  }
  const raw = execution as ExecutionModeRecord;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `execution-${raw.runId || "unknown"}`,
    runId: typeof raw.runId === "string" && raw.runId ? raw.runId : "run-unknown",
    workId: typeof raw.workId === "string" && raw.workId ? raw.workId : "work-unknown",
    title: typeof raw.title === "string" && raw.title ? raw.title : "Runtime execution mode",
    mode: normalizeExecutionModeValue(raw.mode),
    dispatch: normalizeWorkerJobMode(raw.dispatch),
    queue: typeof raw.queue === "string" && raw.queue ? raw.queue : "runtime.inline",
    entrypoint: typeof raw.entrypoint === "string" && raw.entrypoint ? raw.entrypoint : "runtime",
    requestedBy: typeof raw.requestedBy === "string" && raw.requestedBy ? raw.requestedBy : "unknown",
    dryRunRequested: Boolean(raw.dryRunRequested),
    dryRunEffective: Boolean(raw.dryRunEffective),
    replayOfRunId:
      typeof raw.replayOfRunId === "string" && raw.replayOfRunId ? raw.replayOfRunId : null,
    reason: typeof raw.reason === "string" ? raw.reason : "",
    capabilities: Array.isArray(raw.capabilities)
      ? raw.capabilities.map((capability) => ({
          id: typeof capability.id === "string" && capability.id ? capability.id : "capability-unknown",
          title:
            typeof capability.title === "string" && capability.title
              ? capability.title
              : "Untitled capability",
          state: normalizeExecutionCapabilityState(capability.state),
          summary: typeof capability.summary === "string" ? capability.summary : "",
          sources: normalizeStringList(capability.sources),
        }))
      : [],
    constraints: normalizeStringList(raw.constraints),
    createdAt:
      typeof raw.createdAt === "string" && raw.createdAt ? raw.createdAt : new Date(0).toISOString(),
    updatedAt:
      typeof raw.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : new Date(0).toISOString(),
  };
}

function normalizeWorkerJob(worker: unknown): WorkerJobRecord | null {
  if (!worker || typeof worker !== "object") {
    return null;
  }
  const raw = worker as WorkerJobRecord;
  const startedAt = typeof raw.startedAt === "string" && raw.startedAt ? raw.startedAt : null;
  const endedAt = typeof raw.endedAt === "string" && raw.endedAt ? raw.endedAt : null;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `worker-${raw.runId || "unknown"}`,
    runId: typeof raw.runId === "string" && raw.runId ? raw.runId : "run-unknown",
    workId: typeof raw.workId === "string" && raw.workId ? raw.workId : "work-unknown",
    queue: typeof raw.queue === "string" && raw.queue ? raw.queue : "runtime.inline",
    mode: normalizeWorkerJobMode(raw.mode),
    state: normalizeWorkerJobState(raw.state),
    attempt: normalizePositiveCount(raw.attempt, 1),
    maxAttempts: normalizePositiveCount(raw.maxAttempts, 1),
    requestedBy: typeof raw.requestedBy === "string" && raw.requestedBy ? raw.requestedBy : "unknown",
    cancelRequested: Boolean(raw.cancelRequested),
    startedAt,
    endedAt,
    durationMs: normalizeNullableDuration(raw.durationMs),
    error: normalizeError(raw.error),
    createdAt: typeof raw.createdAt === "string" && raw.createdAt ? raw.createdAt : new Date(0).toISOString(),
    updatedAt: typeof raw.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : endedAt ?? startedAt ?? new Date(0).toISOString(),
  };
}

function normalizeTraceEvents(events: unknown): TraceEventRecord[] {
  if (!Array.isArray(events)) {
    return [];
  }
  return events.map((event, index) => {
    const raw = event as TraceEventRecord;
    const sequence = normalizePositiveCount(raw.sequence, index + 1);
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : `evt-${raw.runId || "unknown"}-${String(sequence).padStart(4, "0")}`,
      runId: typeof raw.runId === "string" && raw.runId ? raw.runId : "run-unknown",
      workId: typeof raw.workId === "string" && raw.workId ? raw.workId : null,
      sequence,
      kind: normalizeTraceEventKind(raw.kind),
      title: typeof raw.title === "string" && raw.title ? raw.title : "Runtime event",
      summary: typeof raw.summary === "string" ? raw.summary : "",
      state: typeof raw.state === "string" && raw.state ? raw.state : null,
      stepId: typeof raw.stepId === "string" && raw.stepId ? raw.stepId : null,
      artifactId: typeof raw.artifactId === "string" && raw.artifactId ? raw.artifactId : null,
      workerJobId: typeof raw.workerJobId === "string" && raw.workerJobId ? raw.workerJobId : null,
      createdAt: typeof raw.createdAt === "string" && raw.createdAt ? raw.createdAt : new Date(0).toISOString(),
      data: raw.data && typeof raw.data === "object" && !Array.isArray(raw.data) ? raw.data : {},
    };
  });
}

function formatMiddlewareLines(pipeline: MiddlewarePipelineRecord | null) {
  if (!pipeline) {
    return ["- none"];
  }

  const lines = [`- ${pipeline.id} ${pipeline.title} ${pipeline.state}`];
  for (const stage of pipeline.stages) {
    const capabilities = stage.capabilityIds.length > 0 ? ` capabilities=${stage.capabilityIds.join(",")}` : "";
    const policies = stage.policyIds.length > 0 ? ` policies=${stage.policyIds.join(",")}` : "";
    lines.push(`  - ${stage.id} [${stage.kind}] ${stage.state}${capabilities}${policies}: ${stage.title}`);
  }
  return lines;
}

function formatExecutionLines(execution: ExecutionModeRecord | null) {
  if (!execution) {
    return ["- none"];
  }

  const lines = [
    `- ${execution.id} ${execution.title} mode=${execution.mode} dispatch=${execution.dispatch} queue=${execution.queue} requested_by=${execution.requestedBy} dry_requested=${execution.dryRunRequested ? "yes" : "no"} dry_effective=${execution.dryRunEffective ? "yes" : "no"}`,
  ];
  if (execution.reason) {
    lines.push(`  reason: ${execution.reason}`);
  }
  for (const capability of execution.capabilities) {
    const sources = capability.sources.length > 0 ? ` sources=${capability.sources.join(",")}` : "";
    lines.push(`  - ${capability.id} ${capability.state}${sources}: ${capability.title}`);
  }
  if (execution.constraints.length > 0) {
    lines.push(`  constraints: ${execution.constraints.join(" / ")}`);
  }
  return lines;
}

function formatWorkerLines(worker: WorkerJobRecord | null) {
  if (!worker) {
    return ["- none"];
  }

  const error = worker.error ? ` error=${worker.error.code}` : "";
  return [
    `- ${worker.id} ${worker.queue} ${worker.state} mode=${worker.mode} attempt=${worker.attempt}/${worker.maxAttempts} duration=${formatDuration(worker.durationMs)}${error}`,
  ];
}

function formatEventLines(events: TraceEventRecord[]) {
  if (events.length === 0) {
    return ["- none"];
  }

  return events.map((event) => {
    const state = event.state ? ` ${event.state}` : "";
    const step = event.stepId ? ` step=${event.stepId}` : "";
    const artifact = event.artifactId ? ` artifact=${event.artifactId}` : "";
    return `- #${event.sequence} ${event.kind}${state}${step}${artifact}: ${event.title}`;
  });
}

function formatPolicyLines(policy: PolicyEvaluationRecord | null) {
  if (!policy) {
    return ["- none"];
  }

  const lines = [
    `- ${policy.id} ${policy.title} ${policy.state} allowed=${policy.summary.allowed} review=${policy.summary.reviewRequired} blocked=${policy.summary.blocked} unknown=${policy.summary.unknown}`,
  ];
  for (const check of policy.checks) {
    const capabilities = check.capabilityIds.length > 0 ? ` capabilities=${check.capabilityIds.join(",")}` : "";
    const permissions = check.permissionIds.length > 0 ? ` permissions=${check.permissionIds.join(",")}` : "";
    lines.push(
      `  - ${check.id} [${check.kind}] ${check.state}/${check.riskLevel}${capabilities}${permissions}: ${check.title}`,
    );
  }
  return lines;
}

function formatKnowledgeWriteBackLines(writeBacks: KnowledgeWriteBackRecord[]) {
  if (writeBacks.length === 0) {
    return ["- none"];
  }

  return writeBacks.map(
    (item) =>
      `- ${item.id} artifact=${item.artifactId} collection=${item.collectionId} reviewer=${item.review.reviewer} reviewed_at=${item.review.reviewedAt}`,
  );
}

function formatObjectLines(value: unknown) {
  if (!value || typeof value !== "object") {
    return [`- ${String(value)}`];
  }

  return Object.entries(value as Record<string, unknown>).map(
    ([key, item]) => `- ${key}: ${formatScalar(item)}`,
  );
}

function formatScalar(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null || typeof value === "undefined") {
    return "-";
  }
  return JSON.stringify(value);
}

function normalizePolicySummary(
  summary: unknown,
  checks: PolicyEvaluationRecord["checks"],
): PolicyEvaluationRecord["summary"] {
  const raw = summary && typeof summary === "object" ? (summary as Record<string, unknown>) : {};
  return {
    allowed: normalizeCount(raw.allowed, checks.filter((check) => check.state === "allowed").length),
    reviewRequired: normalizeCount(
      raw.reviewRequired,
      checks.filter((check) => check.state === "review_required").length,
    ),
    blocked: normalizeCount(raw.blocked, checks.filter((check) => check.state === "blocked").length),
    unknown: normalizeCount(raw.unknown, checks.filter((check) => check.state === "unknown").length),
    lowRisk: normalizeCount(raw.lowRisk, checks.filter((check) => check.riskLevel === "low").length),
    mediumRisk: normalizeCount(raw.mediumRisk, checks.filter((check) => check.riskLevel === "medium").length),
    highRisk: normalizeCount(raw.highRisk, checks.filter((check) => check.riskLevel === "high").length),
  };
}

function normalizePolicyCheckKind(value: unknown): PolicyCheckKind {
  return ["capability", "permission", "mcp", "runtime", "model", "artifact"].includes(String(value))
    ? (value as PolicyCheckKind)
    : "runtime";
}

function normalizePolicyDecisionState(value: unknown): PolicyDecisionState {
  return ["allowed", "review_required", "blocked", "unknown"].includes(String(value))
    ? (value as PolicyDecisionState)
    : "unknown";
}

function normalizePolicyRiskLevel(value: unknown): PolicyRiskLevel {
  return ["low", "medium", "high", "unknown"].includes(String(value))
    ? (value as PolicyRiskLevel)
    : "unknown";
}

function normalizeStringList(values: unknown) {
  return Array.isArray(values)
    ? values.filter((item): item is string => typeof item === "string" && Boolean(item))
    : [];
}

function normalizeCount(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function normalizePositiveCount(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function normalizeNullableDuration(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function normalizeError(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as { code?: unknown; message?: unknown };
  return {
    code: typeof raw.code === "string" && raw.code ? raw.code : "runtime_error",
    message: typeof raw.message === "string" && raw.message ? raw.message : "",
  };
}

function normalizeWorkerJobState(value: unknown): WorkerJobState {
  return ["queued", "running", "succeeded", "failed", "cancelled"].includes(String(value))
    ? (value as WorkerJobState)
    : "queued";
}

function normalizeWorkerJobMode(value: unknown): WorkerJobMode {
  return ["inline", "background"].includes(String(value)) ? (value as WorkerJobMode) : "inline";
}

function normalizeExecutionModeValue(value: unknown): ExecutionMode {
  return ["dry_run", "live", "replay"].includes(String(value)) ? (value as ExecutionMode) : "dry_run";
}

function normalizeExecutionCapabilityState(value: unknown): ExecutionCapabilityState {
  return ["enabled", "planned", "skipped", "blocked"].includes(String(value))
    ? (value as ExecutionCapabilityState)
    : "planned";
}

function normalizeTraceEventKind(value: unknown): TraceEventKind {
  return [
    "execution_mode_selected",
    "worker_queued",
    "worker_started",
    "worker_finished",
    "run_state_changed",
    "plan_created",
    "middleware_created",
    "policy_evaluated",
    "step_started",
    "step_finished",
    "artifact_created",
    "trace_written",
    "note_added",
  ].includes(String(value))
    ? (value as TraceEventKind)
    : "run_state_changed";
}

function formatTable(headers: string[], rows: string[][]) {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index].length)),
  );
  const formatRow = (row: string[]) =>
    row.map((cell, index) => cell.padEnd(widths[index])).join("  ").trimEnd();

  return [formatRow(headers), formatRow(widths.map((width) => "-".repeat(width))), ...rows.map(formatRow)].join(
    "\n",
  );
}

function formatDuration(durationMs: number | null) {
  if (durationMs === null) {
    return "-";
  }
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes}B`;
  }
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)}KB`;
  }
  return `${(sizeBytes / 1024 / 1024).toFixed(1)}MB`;
}

async function safeReadDir(dirPath: string) {
  try {
    return await readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    if (isNotFound(error)) {
      return [];
    }
    throw error;
  }
}

async function fileExists(filePath: string) {
  try {
    const info = await stat(filePath);
    return info.isFile();
  } catch (error) {
    if (isNotFound(error)) {
      return false;
    }
    throw error;
  }
}

async function openFile(filePath: string) {
  const opener = platform() === "darwin" ? "open" : platform() === "win32" ? "cmd" : "xdg-open";
  const args = platform() === "win32" ? ["/c", "start", "", filePath] : [filePath];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(opener, args, {
      detached: true,
      stdio: "ignore",
    });
    child.on("error", reject);
    child.unref();
    resolve();
  });
}

function isNotFound(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
