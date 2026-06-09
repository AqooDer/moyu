export type RunState = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type WorkState = "active" | "waiting_user" | "running" | "completed" | "archived";
export type PlanState = "drafted" | "running" | "succeeded" | "failed" | "cancelled";
export type StepState = "pending" | "running" | "succeeded" | "failed" | "skipped";
export type StepKind = "llm" | "tool" | "skill" | "agent_call" | "control" | "user_checkpoint";
export type MiddlewarePipelineState = "ready" | "partial" | "skipped" | "failed";
export type MiddlewareStageState = "ready" | "partial" | "skipped" | "planned" | "failed";
export type MiddlewareStageKind =
  | "attachment-intake"
  | "history-summary"
  | "knowledge-context"
  | "capability-injection";
export type PolicyDecisionState = "allowed" | "review_required" | "blocked" | "unknown";
export type PolicyRiskLevel = "low" | "medium" | "high" | "unknown";
export type PolicyCheckKind = "capability" | "permission" | "mcp" | "runtime" | "model" | "artifact";
export type WorkerJobState = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type WorkerJobMode = "inline" | "background";
export type TraceEventKind =
  | "worker_queued"
  | "worker_started"
  | "worker_finished"
  | "run_state_changed"
  | "plan_created"
  | "middleware_created"
  | "policy_evaluated"
  | "step_started"
  | "step_finished"
  | "artifact_created"
  | "trace_written"
  | "note_added";
export type ArtifactRole = "primary" | "intermediate" | "report" | "log";
export type ConversationRole = "user" | "agent" | "system";
export type ModelRoleResolutionSource =
  | "builtin_default"
  | "workspace_config"
  | "agent_manifest"
  | "runtime_env";
export type ConversationMessageKind =
  | "user_message"
  | "agent_message"
  | "plan"
  | "run_started"
  | "step_progress"
  | "artifact_created"
  | "checkpoint"
  | "error"
  | "summary";

export interface ModelRoleResolution {
  roleId: string;
  provider: string;
  model: string;
  source: ModelRoleResolutionSource;
  fallbackReason: string | null;
  providerEndpoint?: string | null;
}

export interface McpServerResolution {
  id: string;
  transport: string | null;
  state: string | null;
  description: string | null;
  permissions: string[];
  source: "agent_manifest";
}

export interface WorkRecord {
  id: string;
  projectId: string | null;
  title: string;
  state: WorkState;
  agentId: string | null;
  runIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  workId: string;
  runId: string | null;
  role: ConversationRole;
  kind: ConversationMessageKind;
  content: string;
  artifactIds: string[];
  createdAt: string;
}

export interface RunRecord {
  id: string;
  workId?: string | null;
  agentId: string;
  agentVersion: string;
  recipeId: string | null;
  state: RunState;
  dryRun: boolean;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  input: Record<string, unknown>;
  reason: string | null;
  modelRoles: ModelRoleResolution[];
  mcpServers: McpServerResolution[];
}

export interface PlanStepRecord {
  id: string;
  title: string;
  kind: StepKind;
  state: StepState;
  dependsOn: string[];
  summary: string;
}

export interface PlanRecord {
  id: string;
  runId: string;
  workId: string;
  title: string;
  state: PlanState;
  steps: PlanStepRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface MiddlewareStageRecord {
  id: string;
  title: string;
  kind: MiddlewareStageKind;
  state: MiddlewareStageState;
  capabilityIds: string[];
  policyIds: string[];
  inputSummary: string;
  outputSummary: string;
  sources: string[];
}

export interface MiddlewarePipelineRecord {
  id: string;
  runId: string;
  workId: string;
  title: string;
  state: MiddlewarePipelineState;
  stages: MiddlewareStageRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface PolicyEvaluationSummary {
  allowed: number;
  reviewRequired: number;
  blocked: number;
  unknown: number;
  lowRisk: number;
  mediumRisk: number;
  highRisk: number;
}

export interface PolicyCheckRecord {
  id: string;
  title: string;
  kind: PolicyCheckKind;
  state: PolicyDecisionState;
  riskLevel: PolicyRiskLevel;
  capabilityIds: string[];
  permissionIds: string[];
  subjects: string[];
  summary: string;
  sources: string[];
}

export interface PolicyEvaluationRecord {
  id: string;
  runId: string;
  workId: string;
  title: string;
  state: PolicyDecisionState;
  summary: PolicyEvaluationSummary;
  checks: PolicyCheckRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkerJobRecord {
  id: string;
  runId: string;
  workId: string;
  queue: string;
  mode: WorkerJobMode;
  state: WorkerJobState;
  attempt: number;
  maxAttempts: number;
  requestedBy: string;
  cancelRequested: boolean;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  error: { code: string; message: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface TraceEventRecord {
  id: string;
  runId: string;
  workId: string | null;
  sequence: number;
  kind: TraceEventKind;
  title: string;
  summary: string;
  state: string | null;
  stepId: string | null;
  artifactId: string | null;
  workerJobId: string | null;
  createdAt: string;
  data: Record<string, unknown>;
}

export interface StepRecord {
  id: string;
  runId: string;
  name: string;
  kind: StepKind;
  state: StepState;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  inputSummary: Record<string, unknown>;
  outputSummary: Record<string, unknown>;
  error: { code: string; message: string } | null;
}

export interface ArtifactRecord {
  id: string;
  runId: string;
  producerStepId: string;
  type: string;
  role: ArtifactRole;
  name: string;
  path: string;
  sizeBytes: number;
  sha256: string;
  createdAt: string;
}

export type KnowledgeWriteBackDecision = "approved";

export interface KnowledgeWriteBackRecord {
  id: string;
  artifactId: string;
  runId: string;
  agentId: string;
  collectionId: string;
  source: {
    producerStepId: string;
    artifactType: string;
    artifactRole: ArtifactRole;
    artifactName: string;
    artifactPath: string;
    artifactSizeBytes: number;
    artifactSha256: string;
    artifactCreatedAt: string;
  };
  review: {
    decision: KnowledgeWriteBackDecision;
    reviewer: string;
    note: string | null;
    reviewedAt: string;
  };
  createdAt: string;
}

export interface RuntimeTrace {
  schemaVersion: 1;
  run: RunRecord;
  plan: PlanRecord | null;
  middleware: MiddlewarePipelineRecord | null;
  policy: PolicyEvaluationRecord | null;
  worker: WorkerJobRecord | null;
  events: TraceEventRecord[];
  steps: StepRecord[];
  artifacts: ArtifactRecord[];
  knowledgeWriteBacks: KnowledgeWriteBackRecord[];
  notes: string[];
}
