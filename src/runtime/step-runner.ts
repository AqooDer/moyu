import { RuntimeStore } from "./store.js";
import type { StepKind, StepRecord, StepState } from "./types.js";

type RuntimeStepTerminalState = Extract<StepState, "succeeded" | "failed" | "skipped">;

export interface RuntimeStepResult<T = undefined> {
  state?: RuntimeStepTerminalState;
  outputSummary?: Record<string, unknown>;
  error?: { code: string; message: string } | null;
  value?: T;
}

export interface RuntimeStepContext {
  step: StepRecord;
  runtime: RuntimeStore;
}

export interface RunRuntimeStepInput<T> {
  runtime: RuntimeStore;
  id: string;
  name: string;
  kind: StepKind;
  inputSummary?: Record<string, unknown>;
  execute: (context: RuntimeStepContext) => Promise<RuntimeStepResult<T>> | RuntimeStepResult<T>;
}

export interface FinishedRuntimeStep<T = undefined> {
  step: StepRecord;
  state: RuntimeStepTerminalState;
  outputSummary: Record<string, unknown>;
  value: T | undefined;
}

export async function runRuntimeStep<T = undefined>(
  input: RunRuntimeStepInput<T>,
): Promise<FinishedRuntimeStep<T>> {
  const step = input.runtime.startStep({
    id: input.id,
    name: input.name,
    kind: input.kind,
    inputSummary: input.inputSummary,
  });

  try {
    const result = await input.execute({ runtime: input.runtime, step });
    return finishRuntimeStep(input.runtime, step, result);
  } catch (error) {
    input.runtime.finishStep(step.id, "failed", {}, toRuntimeStepError(error));
    throw error;
  }
}

export function finishRuntimeStep<T = undefined>(
  runtime: RuntimeStore,
  step: StepRecord,
  result: RuntimeStepResult<T> = {},
): FinishedRuntimeStep<T> {
  const state = result.state ?? "succeeded";
  const outputSummary = result.outputSummary ?? {};
  const error = state === "failed" ? result.error ?? defaultStepFailure() : null;
  runtime.finishStep(step.id, state, outputSummary, error);
  return {
    step,
    state,
    outputSummary,
    value: result.value,
  };
}

export function toRuntimeStepError(error: unknown) {
  if (error && typeof error === "object") {
    const maybeCode = "code" in error ? error.code : null;
    const maybeMessage = "message" in error ? error.message : null;
    return {
      code: typeof maybeCode === "string" && maybeCode ? maybeCode : "runtime_step_error",
      message: typeof maybeMessage === "string" && maybeMessage ? maybeMessage : String(error),
    };
  }

  return {
    code: "runtime_step_error",
    message: String(error),
  };
}

function defaultStepFailure() {
  return {
    code: "runtime_step_failed",
    message: "Runtime step returned failed state.",
  };
}
