import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import type {
  ArtifactRecord,
  ArtifactRole,
  ExecutionCapabilityState,
  ExecutionMode,
  ExecutionModeRecord,
  MiddlewarePipelineRecord,
  MiddlewarePipelineState,
  MiddlewareStageKind,
  MiddlewareStageState,
  PlanRecord,
  PlanState,
  PolicyCheckKind,
  PolicyDecisionState,
  PolicyEvaluationRecord,
  PolicyRiskLevel,
  RunRecord,
  RunState,
  RuntimeTrace,
  SandboxCleanupPolicy,
  SandboxDirectoryKind,
  SandboxFilesystemRecord,
  SandboxFilesystemState,
  StepKind,
  StepRecord,
  StepState,
  TraceEventKind,
  TraceEventRecord,
  WorkerJobMode,
  WorkerJobRecord,
  WorkerJobState,
  ModelRoleResolution,
  McpServerResolution,
} from "./types.js";

export class RuntimeStore {
  private trace: RuntimeTrace;

  constructor(run: RunRecord) {
    this.trace = {
      schemaVersion: 1,
      run,
      plan: null,
      middleware: null,
      policy: null,
      execution: null,
      sandbox: null,
      worker: null,
      events: [],
      steps: [],
      artifacts: [],
      knowledgeWriteBacks: [],
      notes: [],
    };
  }

  static createRun(input: {
    id: string;
    workId?: string | null;
    agentId: string;
    agentVersion: string;
    recipeId: string | null;
    dryRun: boolean;
    input: Record<string, unknown>;
    modelRoles?: ModelRoleResolution[];
    mcpServers?: McpServerResolution[];
  }) {
    return new RuntimeStore({
      id: input.id,
      workId: input.workId ?? null,
      agentId: input.agentId,
      agentVersion: input.agentVersion,
      recipeId: input.recipeId,
      state: "queued",
      dryRun: input.dryRun,
      startedAt: now(),
      endedAt: null,
      durationMs: null,
      input: input.input,
      reason: null,
      modelRoles: input.modelRoles ?? [],
      mcpServers: input.mcpServers ?? [],
    });
  }

  get runId() {
    return this.trace.run.id;
  }

  get snapshot() {
    return this.trace;
  }

  addNote(note: string) {
    this.trace.notes.push(note);
    this.recordEvent({
      kind: "note_added",
      title: "Runtime note added",
      summary: note,
    });
  }

  setPlan(plan: PlanRecord) {
    this.trace.plan = normalizePlan(plan, this.trace.run.id, this.trace.run.workId);
    this.recordEvent({
      kind: "plan_created",
      title: this.trace.plan.title,
      summary: `${this.trace.plan.steps.length} plan step(s) prepared.`,
      state: this.trace.plan.state,
      data: {
        planId: this.trace.plan.id,
        steps: this.trace.plan.steps.map((step) => step.id),
      },
    });
    return this.trace.plan;
  }

  setMiddlewarePipeline(pipeline: MiddlewarePipelineRecord) {
    this.trace.middleware = normalizeMiddlewarePipeline(pipeline, this.trace.run.id, this.trace.run.workId);
    this.recordEvent({
      kind: "middleware_created",
      title: this.trace.middleware.title,
      summary: `${this.trace.middleware.stages.length} middleware stage(s) captured.`,
      state: this.trace.middleware.state,
      data: {
        middlewareId: this.trace.middleware.id,
        stages: this.trace.middleware.stages.map((stage) => stage.id),
      },
    });
    return this.trace.middleware;
  }

  setPolicyEvaluation(policy: PolicyEvaluationRecord) {
    this.trace.policy = normalizePolicyEvaluation(policy, this.trace.run.id, this.trace.run.workId);
    this.recordEvent({
      kind: "policy_evaluated",
      title: this.trace.policy.title,
      summary: `${this.trace.policy.checks.length} policy check(s) evaluated.`,
      state: this.trace.policy.state,
      data: {
        policyId: this.trace.policy.id,
        summary: this.trace.policy.summary,
      },
    });
    return this.trace.policy;
  }

  setExecutionMode(execution: ExecutionModeRecord) {
    this.trace.execution = normalizeExecutionMode(execution, this.trace.run.id, this.trace.run.workId);
    this.recordEvent({
      kind: "execution_mode_selected",
      title: this.trace.execution.title,
      summary: this.trace.execution.reason,
      state: this.trace.execution.mode,
      data: {
        executionId: this.trace.execution.id,
        mode: this.trace.execution.mode,
        queue: this.trace.execution.queue,
        entrypoint: this.trace.execution.entrypoint,
        dryRunRequested: this.trace.execution.dryRunRequested,
        dryRunEffective: this.trace.execution.dryRunEffective,
      },
    });
    return this.trace.execution;
  }

  setSandboxFilesystem(sandbox: SandboxFilesystemRecord) {
    this.trace.sandbox = normalizeSandboxFilesystem(sandbox, this.trace.run.id, this.trace.run.workId);
    this.recordEvent({
      kind: "sandbox_created",
      title: "Sandbox filesystem prepared",
      summary: `${this.trace.sandbox.directories.length} sandbox directory snapshot(s) prepared.`,
      state: this.trace.sandbox.state,
      data: {
        sandboxId: this.trace.sandbox.id,
        scope: this.trace.sandbox.scope,
        root: this.trace.sandbox.root,
        directories: this.trace.sandbox.directories.map((directory) => ({
          kind: directory.kind,
          relativePath: directory.relativePath,
          writable: directory.writable,
          cleanupPolicy: directory.cleanupPolicy,
        })),
      },
    });
    return this.trace.sandbox;
  }

  createWorkerJob(input: {
    queue: string;
    mode?: WorkerJobMode;
    requestedBy?: string;
    maxAttempts?: number;
  }) {
    const timestamp = now();
    const job: WorkerJobRecord = {
      id: `worker-${this.trace.run.id}`,
      runId: this.trace.run.id,
      workId: this.trace.run.workId || `work-${this.trace.run.id}`,
      queue: input.queue,
      mode: input.mode ?? "inline",
      state: "queued",
      attempt: 1,
      maxAttempts: input.maxAttempts ?? 1,
      requestedBy: input.requestedBy ?? this.trace.run.agentId,
      cancelRequested: false,
      startedAt: null,
      endedAt: null,
      durationMs: null,
      error: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.trace.worker = job;
    this.recordEvent({
      kind: "worker_queued",
      title: "Worker job queued",
      summary: `${job.queue} accepted ${this.trace.run.id}.`,
      state: job.state,
      workerJobId: job.id,
      data: {
        queue: job.queue,
        mode: job.mode,
        attempt: job.attempt,
        maxAttempts: job.maxAttempts,
      },
    });
    return job;
  }

  startWorkerJob() {
    const worker = this.ensureWorkerJob();
    const timestamp = now();
    worker.state = "running";
    worker.startedAt = worker.startedAt ?? timestamp;
    worker.updatedAt = timestamp;
    this.recordEvent({
      kind: "worker_started",
      title: "Worker job started",
      summary: `${worker.queue} started attempt ${worker.attempt}.`,
      state: worker.state,
      workerJobId: worker.id,
      data: {
        queue: worker.queue,
        attempt: worker.attempt,
      },
    });
    return worker;
  }

  finishWorkerJob(
    state: Exclude<WorkerJobState, "queued" | "running">,
    error: { code: string; message: string } | null = null,
  ) {
    const worker = this.ensureWorkerJob();
    const timestamp = now();
    worker.state = state;
    worker.error = error;
    worker.endedAt = timestamp;
    worker.durationMs = worker.startedAt ? elapsed(worker.startedAt, worker.endedAt) : null;
    worker.updatedAt = timestamp;
    this.recordEvent({
      kind: "worker_finished",
      title: "Worker job finished",
      summary: error ? `${state}: ${error.message}` : `${worker.queue} finished with ${state}.`,
      state: worker.state,
      workerJobId: worker.id,
      data: {
        queue: worker.queue,
        attempt: worker.attempt,
        durationMs: worker.durationMs,
        error,
      },
    });
    return worker;
  }

  updatePlanStep(stepId: string, state: StepState) {
    if (!this.trace.plan) {
      return null;
    }

    const step = this.trace.plan.steps.find((item) => item.id === stepId);
    if (!step) {
      return null;
    }

    step.state = state;
    this.trace.plan.updatedAt = now();
    return step;
  }

  setRunState(state: RunState, reason: string | null = null) {
    this.trace.run.state = state;
    this.trace.run.reason = reason;
    if (this.trace.plan) {
      this.trace.plan.state = toPlanState(state, this.trace.plan.state);
      this.trace.plan.updatedAt = now();
    }
    if (state === "succeeded" || state === "failed" || state === "cancelled") {
      this.trace.run.endedAt = now();
      this.trace.run.durationMs = elapsed(this.trace.run.startedAt, this.trace.run.endedAt);
    }
    this.recordEvent({
      kind: "run_state_changed",
      title: "Run state changed",
      summary: reason ? `${state}: ${reason}` : `Run is ${state}.`,
      state,
      data: {
        reason,
        durationMs: this.trace.run.durationMs,
      },
    });
  }

  startStep(input: {
    id: string;
    name: string;
    kind: StepKind;
    inputSummary?: Record<string, unknown>;
  }) {
    const step: StepRecord = {
      id: input.id,
      runId: this.trace.run.id,
      name: input.name,
      kind: input.kind,
      state: "running",
      startedAt: now(),
      endedAt: null,
      durationMs: null,
      inputSummary: input.inputSummary ?? {},
      outputSummary: {},
      error: null,
    };
    this.trace.steps.push(step);
    this.updatePlanStep(step.id, "running");
    this.recordEvent({
      kind: "step_started",
      title: step.name,
      summary: `${step.kind} step started.`,
      state: step.state,
      stepId: step.id,
      data: {
        kind: step.kind,
        inputSummary: step.inputSummary,
      },
    });
    return step;
  }

  finishStep(
    stepId: string,
    state: StepState,
    outputSummary: Record<string, unknown> = {},
    error: { code: string; message: string } | null = null,
  ) {
    const step = this.findStep(stepId);
    step.state = state;
    step.outputSummary = outputSummary;
    step.error = error;
    step.endedAt = now();
    step.durationMs = step.startedAt ? elapsed(step.startedAt, step.endedAt) : null;
    this.updatePlanStep(step.id, state);
    this.recordEvent({
      kind: "step_finished",
      title: step.name,
      summary: error ? `${state}: ${error.message}` : `${step.kind} step finished with ${state}.`,
      state: step.state,
      stepId: step.id,
      data: {
        kind: step.kind,
        durationMs: step.durationMs,
        outputSummary: step.outputSummary,
        error,
      },
    });
  }

  async addArtifact(input: {
    producerStepId: string;
    type: string;
    role: ArtifactRole;
    filePath: string;
  }) {
    const absolutePath = path.resolve(input.filePath);
    const info = await stat(absolutePath);
    const bytes = await readFile(absolutePath);
    const artifact: ArtifactRecord = {
      id: `art-${this.trace.run.id}-${this.trace.artifacts.length + 1}`,
      runId: this.trace.run.id,
      producerStepId: input.producerStepId,
      type: input.type,
      role: input.role,
      name: path.basename(absolutePath),
      path: absolutePath,
      sizeBytes: info.size,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      createdAt: now(),
    };
    this.trace.artifacts.push(artifact);
    this.recordEvent({
      kind: "artifact_created",
      title: artifact.name,
      summary: `${artifact.type}/${artifact.role} artifact registered.`,
      state: "created",
      stepId: artifact.producerStepId,
      artifactId: artifact.id,
      data: {
        path: artifact.path,
        sizeBytes: artifact.sizeBytes,
        sha256: artifact.sha256,
      },
    });
    return artifact;
  }

  async writeTrace() {
    const traceDir = path.resolve("traces", this.trace.run.id);
    await mkdir(traceDir, { recursive: true });
    const filePath = path.join(traceDir, "run.json");
    this.finishOpenWorkerFromRunState();
    this.recordEvent({
      kind: "trace_written",
      title: "Trace written",
      summary: path.relative(process.cwd(), filePath),
      state: this.trace.run.state,
      data: {
        filePath,
      },
    });
    await writeFile(filePath, JSON.stringify(this.trace, null, 2), "utf8");
    return filePath;
  }

  recordEvent(input: {
    kind: TraceEventKind;
    title: string;
    summary?: string;
    state?: string | null;
    stepId?: string | null;
    artifactId?: string | null;
    workerJobId?: string | null;
    data?: Record<string, unknown>;
  }): TraceEventRecord {
    const sequence = this.trace.events.length + 1;
    const event: TraceEventRecord = {
      id: `evt-${this.trace.run.id}-${String(sequence).padStart(4, "0")}`,
      runId: this.trace.run.id,
      workId: this.trace.run.workId ?? null,
      sequence,
      kind: input.kind,
      title: input.title,
      summary: input.summary ?? "",
      state: input.state ?? null,
      stepId: input.stepId ?? null,
      artifactId: input.artifactId ?? null,
      workerJobId: input.workerJobId ?? this.trace.worker?.id ?? null,
      createdAt: now(),
      data: input.data ?? {},
    };
    this.trace.events.push(event);
    return event;
  }

  private findStep(stepId: string) {
    const step = this.trace.steps.find((item) => item.id === stepId);
    if (!step) {
      throw new Error(`Step not found: ${stepId}`);
    }
    return step;
  }

  private ensureWorkerJob() {
    if (!this.trace.worker) {
      return this.createWorkerJob({
        queue: "runtime.inline",
        mode: "inline",
        requestedBy: this.trace.run.agentId,
      });
    }
    return this.trace.worker;
  }

  private finishOpenWorkerFromRunState() {
    const worker = this.trace.worker;
    if (!worker || (worker.state !== "queued" && worker.state !== "running")) {
      return;
    }

    if (this.trace.run.state === "succeeded") {
      this.finishWorkerJob("succeeded");
      return;
    }

    if (this.trace.run.state === "failed") {
      this.finishWorkerJob("failed", {
        code: "run_failed",
        message: this.trace.run.reason ?? "Run failed.",
      });
      return;
    }

    if (this.trace.run.state === "cancelled") {
      this.finishWorkerJob("cancelled");
    }
  }
}

function now() {
  return new Date().toISOString();
}

function elapsed(start: string, end: string) {
  return new Date(end).getTime() - new Date(start).getTime();
}

function normalizePlan(plan: PlanRecord, runId: string, workId?: string | null): PlanRecord {
  const updatedAt = typeof plan.updatedAt === "string" && plan.updatedAt ? plan.updatedAt : now();
  return {
    id: plan.id || `plan-${runId}`,
    runId,
    workId: workId || plan.workId || `work-${runId}`,
    title: plan.title || "Untitled plan",
    state: normalizePlanState(plan.state),
    steps: Array.isArray(plan.steps)
      ? plan.steps.map((step) => ({
          id: step.id,
          title: step.title,
          kind: step.kind,
          state: step.state,
          dependsOn: Array.isArray(step.dependsOn) ? step.dependsOn : [],
          summary: step.summary,
        }))
      : [],
    createdAt: typeof plan.createdAt === "string" && plan.createdAt ? plan.createdAt : updatedAt,
    updatedAt,
  };
}

function normalizePlanState(value: unknown): PlanState {
  return ["drafted", "running", "succeeded", "failed", "cancelled"].includes(String(value))
    ? (value as PlanState)
    : "drafted";
}

function normalizeMiddlewarePipeline(
  pipeline: MiddlewarePipelineRecord,
  runId: string,
  workId?: string | null,
): MiddlewarePipelineRecord {
  const updatedAt =
    typeof pipeline.updatedAt === "string" && pipeline.updatedAt ? pipeline.updatedAt : now();
  return {
    id: pipeline.id || `middleware-${runId}`,
    runId,
    workId: workId || pipeline.workId || `work-${runId}`,
    title: pipeline.title || "Runtime context pipeline",
    state: normalizeMiddlewarePipelineState(pipeline.state),
    stages: Array.isArray(pipeline.stages)
      ? pipeline.stages.map((stage) => ({
          id: stage.id,
          title: stage.title,
          kind: normalizeMiddlewareStageKind(stage.kind),
          state: normalizeMiddlewareStageState(stage.state),
          capabilityIds: normalizeStringList(stage.capabilityIds),
          policyIds: normalizeStringList(stage.policyIds),
          inputSummary: typeof stage.inputSummary === "string" ? stage.inputSummary : "",
          outputSummary: typeof stage.outputSummary === "string" ? stage.outputSummary : "",
          sources: normalizeStringList(stage.sources),
        }))
      : [],
    createdAt:
      typeof pipeline.createdAt === "string" && pipeline.createdAt ? pipeline.createdAt : updatedAt,
    updatedAt,
  };
}

function normalizeMiddlewarePipelineState(value: unknown): MiddlewarePipelineState {
  return ["ready", "partial", "skipped", "failed"].includes(String(value))
    ? (value as MiddlewarePipelineState)
    : "ready";
}

function normalizeMiddlewareStageState(value: unknown): MiddlewareStageState {
  return ["ready", "partial", "skipped", "planned", "failed"].includes(String(value))
    ? (value as MiddlewareStageState)
    : "planned";
}

function normalizeMiddlewareStageKind(value: unknown): MiddlewareStageKind {
  return [
    "attachment-intake",
    "history-summary",
    "knowledge-context",
    "capability-injection",
  ].includes(String(value))
    ? (value as MiddlewareStageKind)
    : "capability-injection";
}

function normalizePolicyEvaluation(
  policy: PolicyEvaluationRecord,
  runId: string,
  workId?: string | null,
): PolicyEvaluationRecord {
  const updatedAt = typeof policy.updatedAt === "string" && policy.updatedAt ? policy.updatedAt : now();
  const checks = Array.isArray(policy.checks)
    ? policy.checks.map((check) => ({
        id: check.id,
        title: check.title,
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
    id: policy.id || `policy-${runId}`,
    runId,
    workId: workId || policy.workId || `work-${runId}`,
    title: policy.title || "Runtime policy evaluation",
    state: normalizePolicyDecisionState(policy.state),
    summary: normalizePolicySummary(policy.summary, checks),
    checks,
    createdAt: typeof policy.createdAt === "string" && policy.createdAt ? policy.createdAt : updatedAt,
    updatedAt,
  };
}

function normalizePolicySummary(
  summary: PolicyEvaluationRecord["summary"] | undefined,
  checks: PolicyEvaluationRecord["checks"],
): PolicyEvaluationRecord["summary"] {
  if (summary && typeof summary === "object") {
    return {
      allowed: normalizeCount(summary.allowed),
      reviewRequired: normalizeCount(summary.reviewRequired),
      blocked: normalizeCount(summary.blocked),
      unknown: normalizeCount(summary.unknown),
      lowRisk: normalizeCount(summary.lowRisk),
      mediumRisk: normalizeCount(summary.mediumRisk),
      highRisk: normalizeCount(summary.highRisk),
    };
  }

  return {
    allowed: checks.filter((check) => check.state === "allowed").length,
    reviewRequired: checks.filter((check) => check.state === "review_required").length,
    blocked: checks.filter((check) => check.state === "blocked").length,
    unknown: checks.filter((check) => check.state === "unknown").length,
    lowRisk: checks.filter((check) => check.riskLevel === "low").length,
    mediumRisk: checks.filter((check) => check.riskLevel === "medium").length,
    highRisk: checks.filter((check) => check.riskLevel === "high").length,
  };
}

function normalizePolicyCheckKind(value: unknown): PolicyCheckKind {
  return ["capability", "permission", "mcp", "runtime", "model", "artifact"].includes(String(value))
    ? (value as PolicyCheckKind)
    : "runtime";
}

function normalizeExecutionMode(
  execution: ExecutionModeRecord,
  runId: string,
  workId?: string | null,
): ExecutionModeRecord {
  const updatedAt =
    typeof execution.updatedAt === "string" && execution.updatedAt ? execution.updatedAt : now();
  return {
    id: execution.id || `execution-${runId}`,
    runId,
    workId: workId || execution.workId || `work-${runId}`,
    title: execution.title || "Runtime execution mode",
    mode: normalizeExecutionModeValue(execution.mode),
    dispatch: execution.dispatch === "background" ? "background" : "inline",
    queue: execution.queue || "runtime.inline",
    entrypoint: execution.entrypoint || "runtime",
    requestedBy: execution.requestedBy || "unknown",
    dryRunRequested: Boolean(execution.dryRunRequested),
    dryRunEffective: Boolean(execution.dryRunEffective),
    replayOfRunId:
      typeof execution.replayOfRunId === "string" && execution.replayOfRunId ? execution.replayOfRunId : null,
    reason: typeof execution.reason === "string" ? execution.reason : "",
    capabilities: Array.isArray(execution.capabilities)
      ? execution.capabilities.map((capability) => ({
          id: capability.id,
          title: capability.title,
          state: normalizeExecutionCapabilityState(capability.state),
          summary: typeof capability.summary === "string" ? capability.summary : "",
          sources: normalizeStringList(capability.sources),
        }))
      : [],
    constraints: normalizeStringList(execution.constraints),
    createdAt:
      typeof execution.createdAt === "string" && execution.createdAt ? execution.createdAt : updatedAt,
    updatedAt,
  };
}

function normalizeExecutionModeValue(value: unknown): ExecutionMode {
  return ["dry_run", "live", "replay"].includes(String(value)) ? (value as ExecutionMode) : "dry_run";
}

function normalizeExecutionCapabilityState(value: unknown): ExecutionCapabilityState {
  return ["enabled", "planned", "skipped", "blocked"].includes(String(value))
    ? (value as ExecutionCapabilityState)
    : "planned";
}

function normalizeSandboxFilesystem(
  sandbox: SandboxFilesystemRecord,
  runId: string,
  workId?: string | null,
): SandboxFilesystemRecord {
  const updatedAt = typeof sandbox.updatedAt === "string" && sandbox.updatedAt ? sandbox.updatedAt : now();
  return {
    id: sandbox.id || `sandbox-${runId}`,
    runId,
    workId: workId || sandbox.workId || `work-${runId}`,
    root: typeof sandbox.root === "string" ? sandbox.root : "",
    relativeRoot: typeof sandbox.relativeRoot === "string" ? sandbox.relativeRoot : "",
    scope: typeof sandbox.scope === "string" && sandbox.scope ? sandbox.scope : "run",
    state: normalizeSandboxFilesystemState(sandbox.state),
    directories: Array.isArray(sandbox.directories)
      ? sandbox.directories.map((directory) => ({
          id: directory.id || `sandbox-${runId}-${directory.kind}`,
          kind: normalizeSandboxDirectoryKind(directory.kind),
          path: typeof directory.path === "string" ? directory.path : "",
          relativePath: typeof directory.relativePath === "string" ? directory.relativePath : "",
          writable: Boolean(directory.writable),
          cleanupPolicy: normalizeSandboxCleanupPolicy(directory.cleanupPolicy),
          created: Boolean(directory.created),
          summary: typeof directory.summary === "string" ? directory.summary : "",
        }))
      : [],
    constraints: normalizeStringList(sandbox.constraints),
    createdAt:
      typeof sandbox.createdAt === "string" && sandbox.createdAt ? sandbox.createdAt : updatedAt,
    updatedAt,
  };
}

function normalizeSandboxFilesystemState(value: unknown): SandboxFilesystemState {
  return ["ready", "partial", "skipped", "failed"].includes(String(value))
    ? (value as SandboxFilesystemState)
    : "ready";
}

function normalizeSandboxDirectoryKind(value: unknown): SandboxDirectoryKind {
  return ["workspace", "uploads", "outputs", "temp", "traces"].includes(String(value))
    ? (value as SandboxDirectoryKind)
    : "workspace";
}

function normalizeSandboxCleanupPolicy(value: unknown): SandboxCleanupPolicy {
  return ["keep", "ephemeral", "manual"].includes(String(value))
    ? (value as SandboxCleanupPolicy)
    : "keep";
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

function normalizeCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

function normalizeStringList(values: unknown) {
  return Array.isArray(values)
    ? values.filter((item): item is string => typeof item === "string" && Boolean(item))
    : [];
}

function toPlanState(runState: RunState, current: PlanState): PlanState {
  if (runState === "running") {
    return "running";
  }
  if (runState === "succeeded") {
    return "succeeded";
  }
  if (runState === "failed") {
    return "failed";
  }
  if (runState === "cancelled") {
    return "cancelled";
  }
  return current;
}
