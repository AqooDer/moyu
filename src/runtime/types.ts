export type RunState = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type WorkState = "active" | "waiting_user" | "running" | "completed" | "archived";
export type StepState = "pending" | "running" | "succeeded" | "failed" | "skipped";
export type StepKind = "llm" | "tool" | "skill" | "agent_call" | "control" | "user_checkpoint";
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

export interface WorkRecord {
  id: string;
  projectId: string | null;
  title: string;
  state: WorkState;
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
  steps: StepRecord[];
  artifacts: ArtifactRecord[];
  knowledgeWriteBacks: KnowledgeWriteBackRecord[];
  notes: string[];
}
