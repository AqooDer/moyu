import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import type { AgentManifestSummary } from "../../agent/registry.js";
import { readImageRelayConfig, type ImageRelayConfig } from "../../lib/env.js";
import type { ModelRoleResolution, ModelRoleResolutionSource } from "../../runtime/types.js";

export const DEFAULT_MODEL_ROLES: Record<string, ModelRoleConfig> = {
  "conversation-primary": {
    provider: "openai-compat",
    model: "gpt-4.1",
    fallbackModel: "gpt-4.1-mini",
  },
  "planning-reasoning": {
    provider: "anthropic",
    model: "claude-sonnet-4",
  },
  "knowledge-embedding": {
    provider: "embedding-provider",
    model: "text-embedding-3-large",
    fallbackModel: "bge-small-zh-v1.5",
  },
  "image-generation": {
    provider: "openai-compat",
    model: "gpt-image-2",
  },
};

export interface ModelRoleConfig {
  provider: string;
  model: string;
  fallbackModel?: string;
}

export interface WorkspaceModelRoleConfig {
  modelRoles: Record<string, ModelRoleConfig>;
  configuredRoleIds: string[];
  source: "builtin_default" | "workspace_config";
}

interface RawWorkspaceConfig {
  model_roles?: unknown;
}

interface RawAgentManifest {
  routing?: {
    model_roles?: unknown;
  };
}

interface ResolveModelRolesOptions {
  agent: AgentManifestSummary;
  roleIds: string[];
  workspaceConfig?: WorkspaceModelRoleConfig;
  imageRelayConfig?: ImageRelayConfig | null;
}

export async function readWorkspaceModelRoleConfig(
  configPath = "moyu.config.json",
): Promise<WorkspaceModelRoleConfig> {
  const builtin = cloneModelRoles(DEFAULT_MODEL_ROLES);
  const resolvedConfigPath = path.resolve(configPath);
  let raw: string;

  try {
    raw = await readFile(resolvedConfigPath, "utf8");
  } catch {
    return {
      modelRoles: builtin,
      configuredRoleIds: [],
      source: "builtin_default",
    };
  }

  const parsed = JSON.parse(raw) as RawWorkspaceConfig;
  const modelRoles = readModelRoleMap(parsed.model_roles);
  return {
    modelRoles: {
      ...builtin,
      ...modelRoles,
    },
    configuredRoleIds: Object.keys(modelRoles),
    source: "workspace_config",
  };
}

export async function readAgentModelRoleOverrides(agent: AgentManifestSummary) {
  const manifestPath = path.join(agent.path, "manifest.yaml");
  const raw = await readFile(manifestPath, "utf8");
  const manifest = parse(raw) as RawAgentManifest;
  return readModelRoleMap(manifest.routing?.model_roles);
}

export async function resolveAgentModelRoles(
  options: ResolveModelRolesOptions,
): Promise<ModelRoleResolution[]> {
  const workspaceConfig = options.workspaceConfig ?? (await readWorkspaceModelRoleConfig());
  const agentOverrides = await readAgentModelRoleOverrides(options.agent);
  const imageRelayConfig = options.imageRelayConfig ?? readImageRelayConfig();

  return options.roleIds.map((roleId) => {
    const workspaceRole = workspaceConfig.modelRoles[roleId] ?? readUnknownRole(roleId);
    const agentRole = agentOverrides[roleId];
    const baseRole = agentRole ?? workspaceRole;
    const source: ModelRoleResolutionSource = agentRole
      ? "agent_manifest"
      : workspaceConfig.configuredRoleIds.includes(roleId)
        ? "workspace_config"
        : "builtin_default";

    if (roleId === "image-generation") {
      return resolveImageGenerationRole(baseRole, source, imageRelayConfig);
    }

    return {
      roleId,
      provider: baseRole.provider,
      model: baseRole.model,
      source,
      fallbackReason: null,
    };
  });
}

function resolveImageGenerationRole(
  role: ModelRoleConfig,
  source: ModelRoleResolutionSource,
  imageRelayConfig: ImageRelayConfig | null,
): ModelRoleResolution {
  if (!imageRelayConfig) {
    return {
      roleId: "image-generation",
      provider: role.provider,
      model: role.fallbackModel ?? role.model,
      source,
      fallbackReason: "missing_image_provider_config",
      providerEndpoint: null,
    };
  }

  const configuredModel = imageRelayConfig.model.trim();
  return {
    roleId: "image-generation",
    provider: role.provider,
    model: imageRelayConfig.modelSource === "env" && configuredModel ? configuredModel : role.model,
    source: imageRelayConfig.modelSource === "env" && configuredModel !== role.model ? "runtime_env" : source,
    fallbackReason:
      imageRelayConfig.modelSource === "env" && configuredModel !== role.model ? "env_model_override" : null,
    providerEndpoint: imageRelayConfig.baseUrl,
  };
}

function readModelRoleMap(value: unknown): Record<string, ModelRoleConfig> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const roles: Record<string, ModelRoleConfig> = {};
  for (const [roleId, rawRole] of Object.entries(value as Record<string, unknown>)) {
    const role = readModelRoleConfig(rawRole);
    if (role) {
      roles[roleId] = role;
    }
  }
  return roles;
}

function readModelRoleConfig(value: unknown): ModelRoleConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const provider = readString(raw.provider);
  const model = readString(raw.model);
  if (!provider || !model) {
    return null;
  }

  const fallbackModel = readString(raw.fallback_model);
  return fallbackModel ? { provider, model, fallbackModel } : { provider, model };
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readUnknownRole(roleId: string): ModelRoleConfig {
  return {
    provider: "unconfigured",
    model: roleId,
  };
}

function cloneModelRoles(modelRoles: Record<string, ModelRoleConfig>) {
  return Object.fromEntries(
    Object.entries(modelRoles).map(([roleId, role]) => [
      roleId,
      { ...role },
    ]),
  ) as Record<string, ModelRoleConfig>;
}
