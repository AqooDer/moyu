import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { formatAgentDetails, readAgentSummary } from "./registry.js";
import { validateAgentFolder } from "./validate.js";

test("Agent manifest can declare MCP servers as runtime capabilities", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-agent-mcp-"));

  try {
    const agentPath = path.join(workspace, "agents", "ask-data-agent");
    await mkdir(path.join(agentPath, "history"), { recursive: true });
    await mkdir(path.join(agentPath, "skills", "ask_data"), { recursive: true });
    await writeFile(path.join(agentPath, "README.md"), "# Ask Data Agent\n", "utf8");
    await writeFile(
      path.join(agentPath, "ui.yaml"),
      ["schema_version: 1", "intake:", "  layout: form", "output:", "  layout: tabs", ""].join("\n"),
      "utf8",
    );
    await writeFile(
      path.join(agentPath, "manifest.yaml"),
      [
        'schema_version: "1"',
        "agent_id: data/ask",
        "name: Ask Data Agent",
        "description: Query business data through approved MCP servers.",
        "version: 0.1.0",
        "recipe_ref: data/ask",
        "ui_ref: ./ui.yaml",
        "tags: [data, mcp]",
        "mcp_servers:",
        "  - analytics-db-mcp",
        "  - id: warehouse-mcp",
        "    transport: stdio",
        "    state: review",
        "    description: Read-only warehouse query gateway",
        "    permissions: [database.query.read]",
        "inputs_schema:",
        "  type: object",
        "outputs_schema:",
        "  type: object",
        "workflow:",
        "  kind: sequence",
        "  steps: []",
        "",
      ].join("\n"),
      "utf8",
    );

    const validation = await validateAgentFolder(agentPath);
    assert.equal(validation.ok, true);

    const summary = await readAgentSummary(agentPath);
    assert.equal(summary.agentId, "data/ask");
    assert.deepEqual(summary.mcpServers, [
      {
        id: "analytics-db-mcp",
        transport: null,
        state: null,
        description: null,
        permissions: [],
      },
      {
        id: "warehouse-mcp",
        transport: "stdio",
        state: "review",
        description: "Read-only warehouse query gateway",
        permissions: ["database.query.read"],
      },
    ]);
    assert.match(formatAgentDetails(summary), /mcp_servers: analytics-db-mcp, warehouse-mcp/);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test("Agent manifest rejects malformed MCP server declarations", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-agent-mcp-invalid-"));

  try {
    const agentPath = path.join(workspace, "agents", "bad-agent");
    await mkdir(path.join(agentPath, "history"), { recursive: true });
    await mkdir(path.join(agentPath, "skills"), { recursive: true });
    await writeFile(path.join(agentPath, "README.md"), "# Bad Agent\n", "utf8");
    await writeFile(
      path.join(agentPath, "ui.yaml"),
      ["schema_version: 1", "intake:", "  layout: form", "output:", "  layout: tabs", ""].join("\n"),
      "utf8",
    );
    await writeFile(
      path.join(agentPath, "manifest.yaml"),
      [
        'schema_version: "1"',
        "agent_id: bad/agent",
        "workflow:",
        "  kind: sequence",
        "inputs_schema:",
        "  type: object",
        "outputs_schema:",
        "  type: object",
        "mcp_servers:",
        "  - id: bad-mcp",
        "    permissions: database.query.read",
        "",
      ].join("\n"),
      "utf8",
    );

    const validation = await validateAgentFolder(agentPath);
    assert.equal(validation.ok, false);
    assert.match(validation.errors.join("\n"), /permissions must be a string array/);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
