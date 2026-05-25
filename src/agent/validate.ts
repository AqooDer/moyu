import { access, readFile } from "node:fs/promises";
import path from "node:path";

export interface AgentValidationResult {
  ok: boolean;
  agentPath: string;
  errors: string[];
  warnings: string[];
}

export async function validateAgentFolder(agentPath: string): Promise<AgentValidationResult> {
  const resolved = path.resolve(agentPath);
  const result: AgentValidationResult = {
    ok: true,
    agentPath: resolved,
    errors: [],
    warnings: [],
  };

  await requireFile(result, "manifest.yaml");
  await requireFile(result, "ui.yaml");
  await requireFile(result, "README.md");
  await requireDir(result, "history");
  await requireDir(result, "skills");

  const manifest = await readTextIfExists(path.join(resolved, "manifest.yaml"));
  if (manifest) {
    requireText(result, manifest, "manifest.yaml", "schema_version:");
    requireText(result, manifest, "manifest.yaml", "agent_id:");
    requireText(result, manifest, "manifest.yaml", "workflow:");
    requireText(result, manifest, "manifest.yaml", "inputs_schema:");
    requireText(result, manifest, "manifest.yaml", "outputs_schema:");
  }

  const ui = await readTextIfExists(path.join(resolved, "ui.yaml"));
  if (ui) {
    requireText(result, ui, "ui.yaml", "schema_version:");
    requireText(result, ui, "ui.yaml", "intake:");
    requireText(result, ui, "ui.yaml", "output:");
  }

  result.ok = result.errors.length === 0;
  return result;
}

export function formatValidationResult(result: AgentValidationResult) {
  const lines = [
    `agent: ${result.agentPath}`,
    `status: ${result.ok ? "ok" : "failed"}`,
  ];

  if (result.errors.length > 0) {
    lines.push("errors:");
    lines.push(...result.errors.map((error) => `  - ${error}`));
  }

  if (result.warnings.length > 0) {
    lines.push("warnings:");
    lines.push(...result.warnings.map((warning) => `  - ${warning}`));
  }

  return lines.join("\n");
}

async function requireFile(result: AgentValidationResult, relativePath: string) {
  const filePath = path.join(result.agentPath, relativePath);
  try {
    await access(filePath);
  } catch {
    result.errors.push(`missing required file: ${relativePath}`);
  }
}

async function requireDir(result: AgentValidationResult, relativePath: string) {
  const dirPath = path.join(result.agentPath, relativePath);
  try {
    await access(dirPath);
  } catch {
    result.errors.push(`missing required directory: ${relativePath}`);
  }
}

async function readTextIfExists(filePath: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

function requireText(
  result: AgentValidationResult,
  content: string,
  fileName: string,
  needle: string,
) {
  if (!content.includes(needle)) {
    result.errors.push(`${fileName} missing "${needle}"`);
  }
}

