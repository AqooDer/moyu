import { RuntimeStore } from "./store.js";

export interface StartInlineWorkerJobInput {
  runtime: RuntimeStore;
  queue: string;
  requestedBy?: string;
  maxAttempts?: number;
}

export function startInlineWorkerJob(input: StartInlineWorkerJobInput) {
  const job = input.runtime.createWorkerJob({
    queue: input.queue,
    mode: "inline",
    requestedBy: input.requestedBy,
    maxAttempts: input.maxAttempts,
  });
  input.runtime.startWorkerJob();
  return job;
}
