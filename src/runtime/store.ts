import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import type {
  ArtifactRecord,
  ArtifactRole,
  MiddlewarePipelineRecord,
  MiddlewarePipelineState,
  MiddlewareStageKind,
  MiddlewareStageState,
  PlanRecord,
  PlanState,
  RunRecord,
  RunState,
  RuntimeTrace,
  StepKind,
  StepRecord,
  StepState,
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
  }

  setPlan(plan: PlanRecord) {
    this.trace.plan = normalizePlan(plan, this.trace.run.id, this.trace.run.workId);
    return this.trace.plan;
  }

  setMiddlewarePipeline(pipeline: MiddlewarePipelineRecord) {
    this.trace.middleware = normalizeMiddlewarePipeline(pipeline, this.trace.run.id, this.trace.run.workId);
    return this.trace.middleware;
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
    return artifact;
  }

  async writeTrace() {
    const traceDir = path.resolve("traces", this.trace.run.id);
    await mkdir(traceDir, { recursive: true });
    const filePath = path.join(traceDir, "run.json");
    await writeFile(filePath, JSON.stringify(this.trace, null, 2), "utf8");
    return filePath;
  }

  private findStep(stepId: string) {
    const step = this.trace.steps.find((item) => item.id === stepId);
    if (!step) {
      throw new Error(`Step not found: ${stepId}`);
    }
    return step;
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
