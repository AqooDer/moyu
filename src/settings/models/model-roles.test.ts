import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { AgentManifestSummary } from "../../agent/registry.js";
import {
  readWorkspaceModelRoleConfig,
  resolveAgentModelRoles,
} from "./model-roles.js";

test("workspace model role config overrides builtin defaults", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-model-roles-"));

  try {
    const configPath = path.join(workspace, "moyu.config.json");
    await writeFile(
      configPath,
      JSON.stringify({
        model_roles: {
          "conversation-primary": {
            provider: "local-llm",
            model: "qwen-local",
            fallback_model: "qwen-small",
          },
        },
      }),
      "utf8",
    );

    const config = await readWorkspaceModelRoleConfig(configPath);
    assert.equal(config.source, "workspace_config");
    assert.deepEqual(config.configuredRoleIds, ["conversation-primary"]);
    assert.equal(config.modelRoles["conversation-primary"].provider, "local-llm");
    assert.equal(config.modelRoles["conversation-primary"].model, "qwen-local");
    assert.equal(config.modelRoles["image-generation"].model, "gpt-image-2");
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test("Agent manifest overrides workspace model roles and records missing image fallback", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-agent-model-roles-"));

  try {
    const agentPath = path.join(workspace, "agents", "image-agent");
    await mkdir(agentPath, { recursive: true });
    await writeFile(
      path.join(agentPath, "manifest.yaml"),
      [
        "schema_version: \"1\"",
        "agent_id: image/agent",
        "name: Image Agent",
        "description: Test agent",
        "version: 0.1.0",
        "routing:",
        "  model_roles:",
        "    image-generation:",
        "      provider: openai-compat",
        "      model: gpt-image-custom",
        "",
      ].join("\n"),
      "utf8",
    );

    const agent: AgentManifestSummary = {
      agentId: "image/agent",
      name: "Image Agent",
      description: "Test agent",
      version: "0.1.0",
      recipeRef: null,
      uiRef: null,
      folderName: "image-agent",
      path: agentPath,
      tags: [],
      mcpServers: [],
    };

    const roles = await resolveAgentModelRoles({
      agent,
      roleIds: ["conversation-primary", "image-generation"],
      workspaceConfig: {
        source: "workspace_config",
        configuredRoleIds: ["conversation-primary"],
        modelRoles: {
          "conversation-primary": {
            provider: "local-llm",
            model: "qwen-local",
          },
          "image-generation": {
            provider: "workspace-image",
            model: "workspace-image-model",
          },
        },
      },
      imageRelayConfig: null,
    });

    assert.deepEqual(roles[0], {
      roleId: "conversation-primary",
      provider: "local-llm",
      model: "qwen-local",
      source: "workspace_config",
      fallbackReason: null,
    });
    assert.deepEqual(roles[1], {
      roleId: "image-generation",
      provider: "openai-compat",
      model: "gpt-image-custom",
      source: "agent_manifest",
      fallbackReason: "missing_image_provider_config",
      providerEndpoint: null,
    });
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
