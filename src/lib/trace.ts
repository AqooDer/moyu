import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface SpikeTrace {
  run_id: string;
  kind: string;
  status: string;
  input: Record<string, unknown>;
  outputs: Array<Record<string, unknown>>;
  notes: string[];
}

export async function writeTrace(runId: string, trace: SpikeTrace) {
  const traceDir = path.resolve("traces", runId);
  await mkdir(traceDir, { recursive: true });
  await writeFile(path.join(traceDir, "run.json"), JSON.stringify(trace, null, 2), "utf8");
  return path.join(traceDir, "run.json");
}

