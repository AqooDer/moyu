import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";

export interface AgentManifestSummary {
  agentId: string;
  name: string;
  description: string;
  version: string;
  recipeRef: string | null;
  uiRef: string | null;
  folderName: string;
  path: string;
  tags: string[];
}

interface RawAgentManifest {
  agent_id?: unknown;
  name?: unknown;
  description?: unknown;
  version?: unknown;
  recipe_ref?: unknown;
  ui_ref?: unknown;
  tags?: unknown;
}

export async function listAgents(rootDir = "agents"): Promise<AgentManifestSummary[]> {
  const root = path.resolve(rootDir);
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const agents: AgentManifestSummary[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const agentPath = path.join(root, entry.name);
    const manifestPath = path.join(agentPath, "manifest.yaml");
    if (!(await fileExists(manifestPath))) {
      continue;
    }

    agents.push(await readAgentSummary(agentPath));
  }

  return agents.sort((a, b) => a.agentId.localeCompare(b.agentId));
}

export async function findAgent(identifier: string, rootDir = "agents") {
  const agents = await listAgents(rootDir);
  return agents.find((agent) => {
    return (
      agent.agentId === identifier ||
      agent.folderName === identifier ||
      path.resolve(identifier) === agent.path
    );
  });
}

export async function readAgentSummary(agentPath: string): Promise<AgentManifestSummary> {
  const resolved = path.resolve(agentPath);
  const manifestPath = path.join(resolved, "manifest.yaml");
  const content = await readFile(manifestPath, "utf8");
  const manifest = parse(content) as RawAgentManifest;

  return {
    agentId: readString(manifest.agent_id, "unknown"),
    name: readString(manifest.name, path.basename(resolved)),
    description: readString(manifest.description, ""),
    version: readString(manifest.version, "0.0.0"),
    recipeRef: readNullableString(manifest.recipe_ref),
    uiRef: readNullableString(manifest.ui_ref),
    folderName: path.basename(resolved),
    path: resolved,
    tags: readStringArray(manifest.tags),
  };
}

export function formatAgentList(agents: AgentManifestSummary[]) {
  if (agents.length === 0) {
    return "No agents found.";
  }

  return agents
    .map((agent) => {
      const recipe = agent.recipeRef ? ` recipe=${agent.recipeRef}` : "";
      return `${agent.agentId}  v${agent.version}  ${agent.name}${recipe}`;
    })
    .join("\n");
}

export function formatAgentDetails(agent: AgentManifestSummary) {
  const lines = [
    `agent_id: ${agent.agentId}`,
    `name: ${agent.name}`,
    `version: ${agent.version}`,
    `description: ${agent.description || "-"}`,
    `recipe_ref: ${agent.recipeRef ?? "-"}`,
    `ui_ref: ${agent.uiRef ?? "-"}`,
    `tags: ${agent.tags.length > 0 ? agent.tags.join(", ") : "-"}`,
    `folder: ${agent.folderName}`,
    `path: ${agent.path}`,
  ];

  return lines.join("\n");
}

async function fileExists(filePath: string) {
  try {
    const info = await stat(filePath);
    return info.isFile();
  } catch {
    return false;
  }
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

