import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { listAgents } from "../agent/registry.js";
import { runImageAgent } from "../agent/run.js";
import { listAgentDraftRecords, readAgentDraftRecordByRun } from "../meta/agent-draft.js";
import { createAgentWithMeta } from "../meta/create-agent.js";
import { installAgentDraft } from "../meta/install-agent.js";
import { listArtifacts } from "./artifacts.js";
import { readWorkStore } from "./work-store.js";
import { buildWorkbenchData } from "./workbench-data.js";

test("meta-created Agents can be installed, run, and selected in Workbench data", async () => {
  const previousCwd = process.cwd();
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-workbench-test-"));
  const previousImageProviderBaseUrl = process.env.MOYU_IMAGE_PROVIDER_BASE_URL;
  const previousImageProviderApiKey = process.env.MOYU_IMAGE_PROVIDER_API_KEY;
  const previousImageProviderModel = process.env.MOYU_IMAGE_PROVIDER_MODEL;

  try {
    process.chdir(workspace);
    delete process.env.MOYU_IMAGE_PROVIDER_BASE_URL;
    delete process.env.MOYU_IMAGE_PROVIDER_API_KEY;
    delete process.env.MOYU_IMAGE_PROVIDER_MODEL;

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

    const draftStore = await readWorkStore();
    assert.equal(draftStore.works.length, 1);
    assert.equal(draftStore.works[0].runIds[0], draft.runId);
    assert.equal(draftStore.works[0].state, "waiting_user");
    assert.equal(draftStore.messages.length, 3);
    assert.equal(draftStore.messages[0].content, "Create an image prototype Agent that stores traceable UI concept artifacts");
    assert.equal(draftStore.messages[1].kind, "plan");
    assert.match(draftStore.messages[1].content, /Meta-Agent 创建 Agent 计划/);

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

    const installedStore = await readWorkStore();
    assert.equal(installedStore.works[0].state, "completed");
    assert.equal(installedStore.messages.length, 4);
    assert.match(installedStore.messages[3].content, /已安装到正式目录/);

    const installedManifestPath = path.join(installed.targetPath, "manifest.yaml");
    const installedManifest = await readFile(installedManifestPath, "utf8");
    await writeFile(
      installedManifestPath,
      installedManifest.replace(
        "mcp_servers: []",
        [
          "mcp_servers:",
          "  - id: analytics-db-mcp",
          "    transport: stdio",
          "    state: review",
          "    description: Read-only analytics query gateway",
          "    permissions: [database.query.read]",
        ].join("\n"),
      ),
      "utf8",
    );

    const agents = await listAgents();
    assert.deepEqual(
      agents.map((agent) => agent.agentId),
      ["custom/image-prototype-v1"],
    );
    assert.deepEqual(agents[0].mcpServers, [
      {
        id: "analytics-db-mcp",
        transport: "stdio",
        state: "review",
        description: "Read-only analytics query gateway",
        permissions: ["database.query.read"],
      },
    ]);

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
    const runTrace = JSON.parse(await readFile(path.join("traces", runId, "run.json"), "utf8"));
    assert.match(runTrace.run.workId, /^work-run-custom__image-prototype-v1-/);
    assert.equal(runTrace.plan.title, "生图 Agent 运行计划");
    assert.equal(runTrace.plan.state, "succeeded");
    assert.deepEqual(
      runTrace.plan.steps.map((step: { id: string; state: string }) => [step.id, step.state]),
      [
        ["input", "succeeded"],
        ["resolve-context", "succeeded"],
        ["step-image-gen", "skipped"],
        ["register-artifacts", "skipped"],
        ["write-trace", "succeeded"],
      ],
    );
    assert.deepEqual(runTrace.run.modelRoles, [
      {
        roleId: "conversation-primary",
        provider: "openai-compat",
        model: "gpt-4.1",
        source: "builtin_default",
        fallbackReason: null,
      },
      {
        roleId: "image-generation",
        provider: "openai-compat",
        model: "gpt-image-2",
        source: "agent_manifest",
        fallbackReason: "missing_image_provider_config",
        providerEndpoint: null,
      },
    ]);
    assert.deepEqual(runTrace.run.mcpServers, [
      {
        id: "analytics-db-mcp",
        transport: "stdio",
        state: "review",
        description: "Read-only analytics query gateway",
        permissions: ["database.query.read"],
        source: "agent_manifest",
      },
    ]);
    assert.equal(runTrace.steps[0].outputSummary.model_role, "image-generation");
    assert.deepEqual(runTrace.steps[0].inputSummary.mcp_servers, ["analytics-db-mcp"]);
    assert.deepEqual(runTrace.steps[0].outputSummary.mcp_servers, ["analytics-db-mcp"]);
    assert.equal(runTrace.steps[0].outputSummary.provider, "openai-compat");
    assert.equal(runTrace.steps[0].outputSummary.model, "gpt-image-2");
    assert.equal(runTrace.steps[0].outputSummary.fallback_reason, "missing_image_provider_config");

    const draftWorkbench = await buildWorkbenchData({ selectedRunId: draft.runId });
    assert.equal(draftWorkbench.selectedRun?.id, draft.runId);
    assert.equal(draftWorkbench.selectedRun?.agentId, "meta/create-agent");
    assert.equal(draftWorkbench.selectedRun?.workId, installedStore.works[0].id);
    assert.equal(draftWorkbench.selectedRun?.plan?.title, "Meta-Agent 创建 Agent 计划");
    assert.equal(draftWorkbench.selectedRun?.plan?.state, "succeeded");
    assert.equal(draftWorkbench.artifacts.length, draft.files.length);
    const draftWork = draftWorkbench.works.find((work) => work.active);
    assert.equal(draftWork?.runId, draft.runId);
    assert.equal(draftWork?.currentRunId, draft.runId);
    assert.deepEqual(draftWork?.runIds, [draft.runId]);
    assert.equal(draftWork?.state, "completed");
    assert.equal(draftWork?.storedState, "completed");
    assert.equal(draftWork?.lifecycle.source, "run_trace");
    assert.equal(draftWork?.lifecycle.runState, "succeeded");
    assert.equal(draftWork?.lifecycle.planState, "succeeded");
    assert.equal(draftWork?.progress.percent, 100);
    assert.equal(draftWork?.progress.totalSteps, 5);
    assert.equal(draftWork?.artifactCount, draft.files.length);
    assert.equal(draftWorkbench.messages.length, 4);
    assert.equal(draftWorkbench.messages[0].role, "user");
    assert.equal(draftWorkbench.messages[1].kind, "plan");
    assert.match(draftWorkbench.messages[1].content, /草拟 Agent 规格/);
    assert.match(draftWorkbench.messages[3].content, /已安装到正式目录/);
    assert.equal(draftWorkbench.settings.nav.length > 0, true);
    assert.equal(draftWorkbench.settings.nav.some((item) => item.id === "agent-context"), true);
    assert.equal(draftWorkbench.settings.modelRoles.some((item) => item.id === "image-generation"), true);
    assert.equal(draftWorkbench.settings.knowledgeBases.some((item) => item.id === "workspace-product"), true);
    assert.equal(
      draftWorkbench.settings.agentContexts.some(
        (item) => item.agentId === "meta/create-agent" && item.mcpServers.includes("filesystem-mcp"),
      ),
      true,
    );

    const runWorkbench = await buildWorkbenchData({ selectedRunId: runId });
    assert.equal(runWorkbench.selectedRun?.id, runId);
    assert.equal(runWorkbench.selectedRun?.agentId, "custom/image-prototype-v1");
    assert.equal(runWorkbench.selectedRun?.dryRun, true);
    assert.match(runWorkbench.selectedRun?.workId || "", /^work-run-custom__image-prototype-v1-/);
    assert.equal(runWorkbench.selectedRun?.modelRoles[1]?.roleId, "image-generation");
    assert.equal(runWorkbench.selectedRun?.modelRoles[1]?.source, "agent_manifest");
    assert.deepEqual(runWorkbench.selectedRun?.mcpServers.map((server) => server.id), ["analytics-db-mcp"]);
    assert.equal(runWorkbench.selectedRun?.plan?.title, "生图 Agent 运行计划");
    assert.equal(runWorkbench.selectedRun?.plan?.steps.find((step) => step.id === "step-image-gen")?.state, "skipped");
    assert.deepEqual(
      runWorkbench.agents.find((agent) => agent.id === "custom/image-prototype-v1")?.mcpServers.map((server) => server.id),
      ["analytics-db-mcp"],
    );
    assert.equal(runWorkbench.artifacts.length, 0);
    const imageWork = runWorkbench.works.find((work) => work.active);
    assert.equal(imageWork?.runId, runId);
    assert.equal(imageWork?.currentRunId, runId);
    assert.equal(imageWork?.title.zh, "a clean app dashboard");
    assert.equal(imageWork?.state, "completed");
    assert.equal(imageWork?.storedState, "completed");
    assert.equal(imageWork?.dryRun, true);
    assert.equal(imageWork?.lifecycle.source, "run_trace");
    assert.equal(imageWork?.lifecycle.runState, "succeeded");
    assert.equal(imageWork?.lifecycle.planState, "succeeded");
    assert.equal(imageWork?.progress.totalSteps, 5);
    assert.equal(imageWork?.progress.skippedSteps, 2);
    assert.equal(imageWork?.progress.percent, 100);
    assert.equal(runWorkbench.messages.length, 3);
    assert.equal(runWorkbench.messages[0].content, "a clean app dashboard");
    assert.equal(runWorkbench.messages[1].kind, "plan");
    assert.match(runWorkbench.messages[1].content, /执行图片生成/);
    assert.match(runWorkbench.messages[2].content, /dry-run 已完成/);
    assert.equal(runWorkbench.settings.providers.length >= 1, true);
    assert.equal(
      runWorkbench.settings.agentContexts.some(
        (item) => item.agentId === "image-gen/prototype-v1" && item.runtimeEvidence.includes("image_model"),
      ),
      true,
    );
  } finally {
    process.chdir(previousCwd);
    restoreEnv("MOYU_IMAGE_PROVIDER_BASE_URL", previousImageProviderBaseUrl);
    restoreEnv("MOYU_IMAGE_PROVIDER_API_KEY", previousImageProviderApiKey);
    restoreEnv("MOYU_IMAGE_PROVIDER_MODEL", previousImageProviderModel);
    await rm(workspace, { recursive: true, force: true });
  }
});

function readSummaryValue(summary: string, key: string) {
  const prefix = `${key}: `;
  const line = summary.split("\n").find((item) => item.startsWith(prefix));
  assert.ok(line, `summary should include ${key}`);
  return line.slice(prefix.length);
}

function restoreEnv(key: string, value: string | undefined) {
  if (typeof value === "undefined") {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
