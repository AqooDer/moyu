import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { listAgents } from "../agent/registry.js";
import { runImageAgent } from "../agent/run.js";
import { createAgentWithMeta } from "../meta/create-agent.js";
import { installAgentDraft } from "../meta/install-agent.js";
import { listArtifacts } from "./artifacts.js";
import { buildWorkbenchData } from "./workbench-data.js";

test("meta-created Agents can be installed, run, and selected in Workbench data", async () => {
  const previousCwd = process.cwd();
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-workbench-test-"));

  try {
    process.chdir(workspace);

    const draft = await createAgentWithMeta({
      prompt: "Create an image prototype Agent that stores traceable UI concept artifacts",
      name: "Image Prototype Agent",
      description: "Generate UI concept images and keep traceable artifacts.",
    });

    assert.equal(draft.validation.ok, true);
    assert.equal(draft.persisted, false);

    const draftArtifacts = await listArtifacts({ runId: draft.runId });
    assert.equal(draftArtifacts.length, draft.files.length);
    assert.ok(draftArtifacts.some((artifact) => artifact.name === "manifest.yaml"));

    const installed = await installAgentDraft({ runId: draft.runId });
    assert.equal(installed.installed, true);
    assert.equal(installed.agentId, "custom/image-prototype-v1");

    const agents = await listAgents();
    assert.deepEqual(
      agents.map((agent) => agent.agentId),
      ["custom/image-prototype-v1"],
    );

    const summary = await runImageAgent(agents[0], {
      prompt: "a clean app dashboard",
      count: 1,
      size: "1024x1024",
      style: "realistic",
      rawPrompt: true,
      dryRun: true,
    });
    const runId = readSummaryValue(summary, "run_id");
    assert.match(runId, /^run-custom__image-prototype-v1-/);

    const draftWorkbench = await buildWorkbenchData({ selectedRunId: draft.runId });
    assert.equal(draftWorkbench.selectedRun?.id, draft.runId);
    assert.equal(draftWorkbench.selectedRun?.agentId, "meta/create-agent");
    assert.equal(draftWorkbench.artifacts.length, draft.files.length);
    assert.equal(draftWorkbench.works.find((work) => work.active)?.runId, draft.runId);

    const runWorkbench = await buildWorkbenchData({ selectedRunId: runId });
    assert.equal(runWorkbench.selectedRun?.id, runId);
    assert.equal(runWorkbench.selectedRun?.agentId, "custom/image-prototype-v1");
    assert.equal(runWorkbench.selectedRun?.dryRun, true);
    assert.equal(runWorkbench.artifacts.length, 0);
    assert.equal(runWorkbench.works.find((work) => work.active)?.runId, runId);
    assert.equal(runWorkbench.works.find((work) => work.active)?.title.zh, "a clean app dashboard");
  } finally {
    process.chdir(previousCwd);
    await rm(workspace, { recursive: true, force: true });
  }
});

function readSummaryValue(summary: string, key: string) {
  const prefix = `${key}: `;
  const line = summary.split("\n").find((item) => item.startsWith(prefix));
  assert.ok(line, `summary should include ${key}`);
  return line.slice(prefix.length);
}
