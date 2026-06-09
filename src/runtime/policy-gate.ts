import {
  buildPluginRegistrySnapshot,
  type PluginCapabilityRecord,
  type PluginPermissionDeclaration,
  type PluginRiskLevel,
} from "../plugins/registry.js";
import type {
  McpServerResolution,
  MiddlewarePipelineRecord,
  ModelRoleResolution,
  PolicyCheckRecord,
  PolicyDecisionState,
  PolicyEvaluationRecord,
  PolicyRiskLevel,
  RunRecord,
} from "./types.js";

export interface CreatePolicyEvaluationInput {
  run: RunRecord;
  middleware: MiddlewarePipelineRecord | null;
  title: string;
  createdAt?: string;
}

export function createPolicyEvaluationRecord(input: CreatePolicyEvaluationInput): PolicyEvaluationRecord {
  const registry = buildPluginRegistrySnapshot();
  const createdAt = input.createdAt || new Date().toISOString();
  const capabilityById = new Map(registry.capabilities.map((capability) => [capability.id, capability]));
  const permissionById = new Map(registry.permissions.map((permission) => [permission.id, permission]));
  const capabilityIds = collectCapabilityIds(input.middleware);
  const permissionIds = collectPermissionIds({
    middleware: input.middleware,
    capabilities: capabilityIds.map((id) => capabilityById.get(id)).filter(isDefined),
    mcpServers: input.run.mcpServers,
  });

  const checks: PolicyCheckRecord[] = [
    ...capabilityIds.map((id) =>
      createCapabilityCheck({
        capabilityId: id,
        capability: capabilityById.get(id) ?? null,
        permissionById,
        mcpServers: input.run.mcpServers,
      }),
    ),
    ...permissionIds.map((id) =>
      createPermissionCheck({
        permissionId: id,
        permission: permissionById.get(id) ?? null,
        capabilityIds: findCapabilitiesForPermission(id, capabilityIds, capabilityById),
        mcpServers: input.run.mcpServers,
      }),
    ),
    ...input.run.mcpServers.map((server) => createMcpCheck(server, capabilityById, permissionById)),
    createModelRoleCheck(input.run.modelRoles),
    createRuntimeCaptureCheck(input.run),
  ];

  if (capabilityIds.includes("artifact-write") || permissionIds.includes("artifact.write.scoped")) {
    checks.push(createArtifactWriteCheck(capabilityById, permissionById));
  }

  return {
    id: `policy-${input.run.id}`,
    runId: input.run.id,
    workId: input.run.workId || `work-${input.run.id}`,
    title: input.title,
    state: summarizePolicyState(checks),
    summary: summarizeChecks(checks),
    checks,
    createdAt,
    updatedAt: createdAt,
  };
}

export function formatPolicyEvaluationSummary(policy: PolicyEvaluationRecord | null | undefined) {
  if (!policy) {
    return null;
  }

  const summary = policy.summary;
  const lines = [
    `策略评估：${policy.title}`,
    `状态：${policy.state}；allowed ${summary.allowed}，review ${summary.reviewRequired}，blocked ${summary.blocked}，unknown ${summary.unknown}`,
  ];
  for (const check of policy.checks) {
    lines.push(`- ${check.title} [${check.state}/${check.riskLevel}]：${check.summary}`);
  }
  return lines.join("\n");
}

function collectCapabilityIds(middleware: MiddlewarePipelineRecord | null) {
  const ids = new Set<string>();
  for (const stage of middleware?.stages ?? []) {
    for (const id of stage.capabilityIds) {
      ids.add(id);
    }
  }
  return [...ids].sort();
}

function collectPermissionIds(input: {
  middleware: MiddlewarePipelineRecord | null;
  capabilities: PluginCapabilityRecord[];
  mcpServers: McpServerResolution[];
}) {
  const ids = new Set<string>();
  for (const stage of input.middleware?.stages ?? []) {
    for (const id of stage.policyIds) {
      ids.add(id);
    }
  }
  for (const capability of input.capabilities) {
    for (const id of capability.permissionIds) {
      ids.add(id);
    }
  }
  for (const server of input.mcpServers) {
    for (const id of server.permissions) {
      ids.add(id);
    }
  }
  return [...ids].sort();
}

function createCapabilityCheck(input: {
  capabilityId: string;
  capability: PluginCapabilityRecord | null;
  permissionById: Map<string, PluginPermissionDeclaration>;
  mcpServers: McpServerResolution[];
}): PolicyCheckRecord {
  if (!input.capability) {
    const server = input.mcpServers.find((item) => item.id === input.capabilityId);
    return {
      id: `capability-${input.capabilityId}`,
      title: `Capability ${input.capabilityId}`,
      kind: server ? "mcp" : "capability",
      state: "unknown",
      riskLevel: "unknown",
      capabilityIds: [input.capabilityId],
      permissionIds: server?.permissions ?? [],
      subjects: server ? [`mcp:${server.id}`] : [input.capabilityId],
      summary: server
        ? "Agent manifest 声明了 MCP 能力，但 Plugin Registry 尚未登记对应 capability。"
        : "运行上下文引用了未登记 capability。",
      sources: server ? ["agent-manifest", "middleware"] : ["middleware"],
    };
  }

  const riskLevel = highestRisk(
    input.capability.permissionIds.map((id) => input.permissionById.get(id)?.riskLevel ?? "unknown"),
  );
  return {
    id: `capability-${input.capability.id}`,
    title: input.capability.title.zh || input.capability.id,
    kind: input.capability.kind === "mcp" ? "mcp" : "capability",
    state: decisionForCapability(input.capability, riskLevel),
    riskLevel,
    capabilityIds: [input.capability.id],
    permissionIds: [...input.capability.permissionIds],
    subjects: [input.capability.kind, input.capability.sourceType],
    summary: `Registry 状态为 ${input.capability.state}，默认范围 ${input.capability.defaultEnabledFor.join(", ") || "未默认启用"}。`,
    sources: ["plugin-registry", "middleware"],
  };
}

function createPermissionCheck(input: {
  permissionId: string;
  permission: PluginPermissionDeclaration | null;
  capabilityIds: string[];
  mcpServers: McpServerResolution[];
}): PolicyCheckRecord {
  if (!input.permission) {
    const mcpSubjects = input.mcpServers
      .filter((server) => server.permissions.includes(input.permissionId))
      .map((server) => `mcp:${server.id}`);
    return {
      id: `permission-${input.permissionId}`,
      title: `Permission ${input.permissionId}`,
      kind: mcpSubjects.length > 0 ? "mcp" : "permission",
      state: "unknown",
      riskLevel: "unknown",
      capabilityIds: input.capabilityIds,
      permissionIds: [input.permissionId],
      subjects: mcpSubjects.length > 0 ? mcpSubjects : [input.permissionId],
      summary: "权限 ID 尚未进入 Plugin Registry，当前只记录证据，不执行调用。",
      sources: mcpSubjects.length > 0 ? ["agent-manifest"] : ["middleware"],
    };
  }

  return {
    id: `permission-${input.permission.id}`,
    title: input.permission.title.zh || input.permission.id,
    kind: "permission",
    state: decisionForPermission(input.permission),
    riskLevel: input.permission.riskLevel,
    capabilityIds: input.capabilityIds,
    permissionIds: [input.permission.id],
    subjects: [input.permission.boundary.zh],
    summary: input.permission.approval.zh,
    sources: ["plugin-registry"],
  };
}

function createMcpCheck(
  server: McpServerResolution,
  capabilityById: Map<string, PluginCapabilityRecord>,
  permissionById: Map<string, PluginPermissionDeclaration>,
): PolicyCheckRecord {
  const capability = capabilityById.get(server.id);
  const permissions = server.permissions.map((id) => permissionById.get(id)).filter(isDefined);
  const riskLevel = highestRisk(permissions.map((permission) => permission.riskLevel));
  return {
    id: `mcp-${server.id}`,
    title: `MCP ${server.id}`,
    kind: "mcp",
    state: capability ? decisionForCapability(capability, riskLevel) : "unknown",
    riskLevel: capability ? riskLevel : "unknown",
    capabilityIds: [server.id],
    permissionIds: [...server.permissions],
    subjects: [server.transport || "transport:unknown", server.state || "state:unknown"],
    summary: capability
      ? `Manifest 装配 MCP，Registry 状态为 ${capability.state}。`
      : "Manifest 装配了未登记 MCP；本阶段仅写入 Trace，不启动 server。",
    sources: ["agent-manifest", capability ? "plugin-registry" : "policy-gate"],
  };
}

function createModelRoleCheck(modelRoles: ModelRoleResolution[]): PolicyCheckRecord {
  return {
    id: "model-roles",
    title: "模型角色解析",
    kind: "model",
    state: "allowed",
    riskLevel: "low",
    capabilityIds: [],
    permissionIds: [],
    subjects: modelRoles.map((role) => `${role.roleId}:${role.provider}/${role.model}`),
    summary: modelRoles.length > 0 ? "模型角色已解析并写入 Run Trace。" : "本次 Run 未声明模型角色。",
    sources: modelRoles.map((role) => role.source),
  };
}

function createRuntimeCaptureCheck(run: RunRecord): PolicyCheckRecord {
  return {
    id: "runtime-capture",
    title: "运行证据收集",
    kind: "runtime",
    state: "allowed",
    riskLevel: "low",
    capabilityIds: ["trace-open"],
    permissionIds: ["trace.read.registered"],
    subjects: [run.dryRun ? "dry-run" : "live-run", run.agentId],
    summary: "Run 输入、计划、上下文、策略、步骤和产物会写入本地 Trace。",
    sources: ["runtime-store"],
  };
}

function createArtifactWriteCheck(
  capabilityById: Map<string, PluginCapabilityRecord>,
  permissionById: Map<string, PluginPermissionDeclaration>,
): PolicyCheckRecord {
  const capability = capabilityById.get("artifact-write");
  const permission = permissionById.get("artifact.write.scoped");
  return {
    id: "artifact-write-scope",
    title: "Artifact 写入边界",
    kind: "artifact",
    state: capability && permission ? "allowed" : "unknown",
    riskLevel: permission?.riskLevel ?? "unknown",
    capabilityIds: ["artifact-write"],
    permissionIds: ["artifact.write.scoped"],
    subjects: ["artifacts/", "traces/"],
    summary: permission?.boundary.zh ?? "Artifact 写入权限未登记。",
    sources: ["plugin-registry", "runtime-store"],
  };
}

function findCapabilitiesForPermission(
  permissionId: string,
  capabilityIds: string[],
  capabilityById: Map<string, PluginCapabilityRecord>,
) {
  return capabilityIds.filter((id) => capabilityById.get(id)?.permissionIds.includes(permissionId));
}

function decisionForCapability(
  capability: PluginCapabilityRecord,
  riskLevel: PolicyRiskLevel,
): PolicyDecisionState {
  if (capability.state === "enabled" && riskLevel !== "high") {
    return "allowed";
  }
  return "review_required";
}

function decisionForPermission(permission: PluginPermissionDeclaration): PolicyDecisionState {
  return permission.riskLevel === "low" ? "allowed" : "review_required";
}

function summarizePolicyState(checks: PolicyCheckRecord[]): PolicyDecisionState {
  if (checks.some((check) => check.state === "blocked")) {
    return "blocked";
  }
  if (checks.some((check) => check.state === "unknown")) {
    return "unknown";
  }
  if (checks.some((check) => check.state === "review_required")) {
    return "review_required";
  }
  return "allowed";
}

function summarizeChecks(checks: PolicyCheckRecord[]): PolicyEvaluationRecord["summary"] {
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

function highestRisk(risks: Array<PluginRiskLevel | "unknown">): PolicyRiskLevel {
  if (risks.includes("unknown")) {
    return "unknown";
  }
  if (risks.includes("high")) {
    return "high";
  }
  if (risks.includes("medium")) {
    return "medium";
  }
  return "low";
}

function isDefined<T>(value: T | null | undefined): value is T {
  return Boolean(value);
}
