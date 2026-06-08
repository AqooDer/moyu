import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import type {
  ArtifactRecord,
  ArtifactRole,
  RunRecord,
  RunState,
  RuntimeTrace,
  StepKind,
  StepRecord,
  StepState,
  ModelRoleResolution,
} from "./types.js";

export class RuntimeStore {
  private trace: RuntimeTrace;

  constructor(run: RunRecord) {
    this.trace = {
      schemaVersion: 1,
      run,
      steps: [],
      artifacts: [],
      knowledgeWriteBacks: [],
      notes: [],
    };
  }

  static createRun(input: {
    id: string;
    agentId: string;
    agentVersion: string;
    recipeId: string | null;
    dryRun: boolean;
    input: Record<string, unknown>;
    modelRoles?: ModelRoleResolution[];
  }) {
    return new RuntimeStore({
      id: input.id,
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

  setRunState(state: RunState, reason: string | null = null) {
    this.trace.run.state = state;
    this.trace.run.reason = reason;
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
