import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { listAgents } from "../agent/registry.js";
import { runImageAgent } from "../agent/run.js";
import { listAgentDraftRecords, readAgentDraftRecordByRun } from "../meta/agent-draft.js";
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
    assert.ok(draftArtifacts.some((artifact) => artifact.name === "agent-draft.json"));

    const draftRecord = await readAgentDraftRecordByRun(draft.runId);
    assert.equal(draftRecord?.state, "drafted");
    assert.equal(draftRecord?.agentId, "custom/image-prototype-v1");
    assert.equal(draftRecord?.revision, 1);
    assert.equal(draftRecord?.installedAt, null);

    const draftIndex = await listAgentDraftRecords();
    assert.equal(draftIndex.length, 1);
    assert.equal(draftIndex[0].runId, draft.runId);
    assert.equal(draftIndex[0].state, "drafted");
    assert.equal(draftIndex[0].revision, 1);

    const installed = await installAgentDraft({ runId: draft.runId });
    assert.equal(installed.installed, true);
    assert.equal(installed.agentId, "custom/image-prototype-v1");

    const installedDraftRecord = await readAgentDraftRecordByRun(draft.runId);
    assert.equal(installedDraftRecord?.state, "installed");
    assert.equal(installedDraftRecord?.revision, 2);
    assert.equal(installedDraftRecord?.targetPath, installed.targetPath);
    assert.equal(typeof installedDraftRecord?.installedAt, "string");

    const installedDraftIndex = await listAgentDraftRecords({ state: "installed" });
    assert.equal(installedDraftIndex.length, 1);
    assert.equal(installedDraftIndex[0].runId, draft.runId);
    assert.equal(installedDraftIndex[0].revision, 2);

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
    assert.equal(draftWorkbench.settings.nav.length > 0, true);
    assert.equal(draftWorkbench.settings.modelRoles.some((item) => item.id === "image-generation"), true);
    assert.equal(draftWorkbench.settings.knowledgeBases.some((item) => item.id === "workspace-product"), true);

    const runWorkbench = await buildWorkbenchData({ selectedRunId: runId });
    assert.equal(runWorkbench.selectedRun?.id, runId);
    assert.equal(runWorkbench.selectedRun?.agentId, "custom/image-prototype-v1");
    assert.equal(runWorkbench.selectedRun?.dryRun, true);
    assert.equal(runWorkbench.artifacts.length, 0);
    assert.equal(runWorkbench.works.find((work) => work.active)?.runId, runId);
    assert.equal(runWorkbench.works.find((work) => work.active)?.title.zh, "a clean app dashboard");
    assert.equal(runWorkbench.settings.providers.length >= 1, true);
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
