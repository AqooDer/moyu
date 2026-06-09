import type { PlanRecord, StepKind } from "./types.js";

export interface CreatePlanInput {
  runId: string;
  workId: string;
  title: string;
  steps: Array<{
    id: string;
    title: string;
    kind: StepKind;
    summary: string;
    dependsOn?: string[];
  }>;
  createdAt?: string;
}

export function createPlanRecord(input: CreatePlanInput): PlanRecord {
  const createdAt = input.createdAt || new Date().toISOString();
  return {
    id: `plan-${input.runId}`,
    runId: input.runId,
    workId: input.workId,
    title: input.title,
    state: "drafted",
    steps: input.steps.map((step) => ({
      id: step.id,
      title: step.title,
      kind: step.kind,
      state: "pending",
      dependsOn: step.dependsOn ?? [],
      summary: step.summary,
    })),
    createdAt,
    updatedAt: createdAt,
  };
}

export function formatPlanSummary(plan: PlanRecord | null | undefined) {
  if (!plan) {
    return null;
  }

  const lines = [`计划：${plan.title}`];
  for (const [index, step] of plan.steps.entries()) {
    lines.push(`${index + 1}. ${step.title}：${step.summary}`);
  }
  return lines.join("\n");
}
