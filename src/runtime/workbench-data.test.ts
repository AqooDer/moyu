import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { AgentManifestSummary } from "../agent/registry.js";
import { listAgents } from "../agent/registry.js";
import { runImageAgent } from "../agent/run.js";
import { listAgentDraftRecords, readAgentDraftRecordByRun } from "../meta/agent-draft.js";
import { createAgentWithMeta } from "../meta/create-agent.js";
import { installAgentDraft } from "../meta/install-agent.js";
import { listArtifacts } from "./artifacts.js";
import { formatRunHistoryDetail, getRunHistoryDetail } from "./history.js";
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
    const draftTrace = JSON.parse(await readFile(path.join("traces", draft.runId, "run.json"), "utf8"));
    assert.equal(draftTrace.steps.find((step: { id?: string }) => step.id === "register-artifacts")?.state, "succeeded");
    assert.equal(draftTrace.middleware.title, "Meta-Agent 上下文装配管线");
    assert.equal(draftTrace.middleware.state, "partial");
    assert.equal(draftTrace.policy.title, "Meta-Agent 创建策略评估");
    assert.equal(draftTrace.policy.state, "review_required");
    assert.equal(draftTrace.policy.summary.reviewRequired > 0, true);
    assert.equal(
      draftTrace.policy.checks.some(
        (check: { permissionIds?: string[]; state?: string; riskLevel?: string }) =>
          check.permissionIds?.includes("filesystem.scoped") &&
          check.state === "review_required" &&
          check.riskLevel === "high",
      ),
      true,
    );
    assert.deepEqual(
      draftTrace.middleware.stages.map((stage: { id: string; state: string }) => [stage.id, stage.state]),
      [
        ["attachment-intake", "skipped"],
        ["history-summary", "ready"],
        ["knowledge-context", "planned"],
        ["capability-injection", "ready"],
      ],
    );
    assert.equal(
      draftTrace.artifacts.every((artifact: { producerStepId?: string }) => artifact.producerStepId === "persist"),
      true,
    );
    assert.equal(draftTrace.worker.queue, "meta.create-agent.inline");
    assert.equal(draftTrace.worker.state, "succeeded");
    assert.equal(
      draftTrace.events.some(
        (event: { kind?: string; stepId?: string }) =>
          event.kind === "step_started" && event.stepId === "intake",
      ),
      true,
    );
    assert.equal(
      draftTrace.events.some((event: { kind?: string }) => event.kind === "artifact_created"),
      true,
    );
    assert.equal(draftTrace.events[draftTrace.events.length - 1].kind, "trace_written");

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
    assert.equal(runTrace.middleware.title, "Agent 运行上下文装配管线");
    assert.equal(runTrace.middleware.state, "partial");
    assert.equal(runTrace.policy.title, "Agent 运行策略评估");
    assert.equal(runTrace.policy.state, "unknown");
    assert.equal(runTrace.policy.summary.unknown > 0, true);
    assert.equal(
      runTrace.policy.checks.some(
        (check: { id?: string; permissionIds?: string[]; state?: string }) =>
          check.id === "permission-database.query.read" &&
          check.permissionIds?.includes("database.query.read") &&
          check.state === "unknown",
      ),
      true,
    );
    assert.deepEqual(
      runTrace.middleware.stages.find((stage: { id: string }) => stage.id === "capability-injection")?.capabilityIds,
      [
        "image_gen_via_relay",
        "artifact-write",
        "artifact-preview-v1",
        "context-pack-middleware",
        "analytics-db-mcp",
      ],
    );
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
    assert.equal(runTrace.worker.queue, "agent.run.inline");
    assert.equal(runTrace.worker.state, "succeeded");
    assert.equal(
      runTrace.events.some((event: { kind?: string; state?: string }) => event.kind === "worker_finished" && event.state === "succeeded"),
      true,
    );
    assert.equal(
      runTrace.events.some((event: { kind?: string }) => event.kind === "note_added"),
      true,
    );
    assert.equal(runTrace.events[runTrace.events.length - 1].kind, "trace_written");

    const draftWorkbench = await buildWorkbenchData({ selectedRunId: draft.runId });
    assert.equal(draftWorkbench.selectedRun?.id, draft.runId);
    assert.equal(draftWorkbench.selectedRun?.agentId, "meta/create-agent");
    assert.equal(draftWorkbench.selectedRun?.workId, installedStore.works[0].id);
    assert.equal(draftWorkbench.selectedRun?.plan?.title, "Meta-Agent 创建 Agent 计划");
    assert.equal(draftWorkbench.selectedRun?.plan?.state, "succeeded");
    assert.equal(draftWorkbench.selectedRun?.middleware?.title, "Meta-Agent 上下文装配管线");
    assert.equal(draftWorkbench.selectedRun?.middleware?.stages[2]?.state, "planned");
    assert.equal(draftWorkbench.selectedRun?.policy?.title, "Meta-Agent 创建策略评估");
    assert.equal(draftWorkbench.selectedRun?.policy?.state, "review_required");
    assert.equal(draftWorkbench.selectedRun?.worker?.queue, "meta.create-agent.inline");
    assert.equal(draftWorkbench.selectedRun?.worker?.state, "succeeded");
    assert.equal(
      draftWorkbench.selectedRun?.events.some((event) => event.kind === "worker_finished"),
      true,
    );
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
    assert.equal(runWorkbench.selectedRun?.middleware?.title, "Agent 运行上下文装配管线");
    assert.equal(runWorkbench.selectedRun?.policy?.title, "Agent 运行策略评估");
    assert.equal(runWorkbench.selectedRun?.policy?.state, "unknown");
    assert.equal(runWorkbench.selectedRun?.worker?.queue, "agent.run.inline");
    assert.equal(runWorkbench.selectedRun?.worker?.state, "succeeded");
    assert.equal(
      runWorkbench.selectedRun?.events.some((event) => event.kind === "trace_written"),
      true,
    );
    assert.equal(
      runWorkbench.selectedRun?.policy?.checks.some((check) => check.id === "mcp-analytics-db-mcp"),
      true,
    );
    assert.deepEqual(
      runWorkbench.selectedRun?.middleware?.stages.find((stage) => stage.id === "capability-injection")?.sources,
      ["agent-manifest", "plugin-registry"],
    );
    const runDetail = await getRunHistoryDetail(runId);
    assert.ok(runDetail);
    const formattedRun = formatRunHistoryDetail(runDetail);
    assert.match(formattedRun, /policy:/);
    assert.match(formattedRun, /Agent 运行策略评估/);
    assert.match(formattedRun, /permission-database\.query\.read/);
    assert.match(formattedRun, /worker:/);
    assert.match(formattedRun, /agent\.run\.inline/);
    assert.match(formattedRun, /events:/);
    assert.match(formattedRun, /worker_finished/);
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

test("failed image Agent runs still persist trace, plan, and Workbench conversation", async () => {
  const previousCwd = process.cwd();
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-workbench-failed-image-"));
  const previousImageProviderBaseUrl = process.env.MOYU_IMAGE_PROVIDER_BASE_URL;
  const previousImageProviderApiKey = process.env.MOYU_IMAGE_PROVIDER_API_KEY;
  const previousImageProviderModel = process.env.MOYU_IMAGE_PROVIDER_MODEL;
  const previousFetch = globalThis.fetch;

  try {
    process.chdir(workspace);
    globalThis.fetch = async () => new Response("provider unavailable", { status: 500 });
    process.env.MOYU_IMAGE_PROVIDER_BASE_URL = "http://image-provider.test";
    process.env.MOYU_IMAGE_PROVIDER_API_KEY = "test-key";
    process.env.MOYU_IMAGE_PROVIDER_MODEL = "gpt-image-2";

    const agent = createImageAgentSummary();
    await writeMinimalAgentManifest(agent);
    await assert.rejects(
      () =>
        runImageAgent(agent, {
          prompt: "a clean app dashboard",
          count: 1,
          size: "1024x1024",
          style: "realistic",
          rawPrompt: true,
          dryRun: false,
        }),
      /image relay request failed: 500 provider unavailable/,
    );

    const runId = await findOnlyRunId();
    const trace = await readTrace(runId);
    assert.equal(trace.run.state, "failed");
    assert.match(trace.run.reason, /image relay request failed: 500 provider unavailable/);
    assert.equal(trace.plan.title, "生图 Agent 运行计划");
    assert.equal(trace.plan.state, "failed");
    assert.equal(trace.middleware.title, "Agent 运行上下文装配管线");
    assert.equal(trace.middleware.state, "partial");
    assert.equal(trace.policy.title, "Agent 运行策略评估");
    assert.equal(trace.policy.state, "unknown");
    assert.equal(trace.worker.queue, "agent.run.inline");
    assert.equal(trace.worker.state, "failed");
    assert.equal(trace.worker.error.code, "run_failed");
    assert.equal(
      trace.events.some((event: { kind?: string; state?: string }) => event.kind === "worker_finished" && event.state === "failed"),
      true,
    );
    assert.equal(trace.events[trace.events.length - 1].kind, "trace_written");
    assert.equal(trace.plan.steps.find((step: { id: string }) => step.id === "step-image-gen")?.state, "failed");
    assert.equal(trace.plan.steps.find((step: { id: string }) => step.id === "register-artifacts")?.state, "pending");
    assert.equal(trace.steps.find((step: { id: string }) => step.id === "step-image-gen")?.state, "failed");
    assert.equal(
      trace.steps.find((step: { id: string }) => step.id === "step-image-gen")?.error?.code,
      "runtime_step_error",
    );
    assert.match(
      trace.steps.find((step: { id: string }) => step.id === "step-image-gen")?.error?.message,
      /provider unavailable/,
    );
    assert.ok(trace.notes.some((note: string) => note.includes("Run failed: runtime_step_error")));

    const workbench = await buildWorkbenchData({ selectedRunId: runId });
    assert.equal(workbench.selectedRun?.id, runId);
    assert.equal(workbench.selectedRun?.state, "failed");
    assert.equal(workbench.selectedRun?.plan?.state, "failed");
    assert.equal(workbench.selectedRun?.middleware?.title, "Agent 运行上下文装配管线");
    assert.equal(workbench.selectedRun?.policy?.title, "Agent 运行策略评估");
    assert.equal(workbench.selectedRun?.worker?.state, "failed");
    assert.equal(
      workbench.selectedRun?.events.some((event) => event.kind === "worker_finished" && event.state === "failed"),
      true,
    );
    const activeWork = workbench.works.find((work) => work.active);
    assert.equal(activeWork?.state, "failed");
    assert.equal(activeWork?.storedState, "completed");
    assert.equal(activeWork?.lifecycle.runState, "failed");
    assert.equal(activeWork?.lifecycle.planState, "failed");
    assert.equal(activeWork?.progress.failedSteps, 1);
    assert.equal(workbench.messages.length, 3);
    assert.equal(workbench.messages[0].role, "user");
    assert.equal(workbench.messages[1].kind, "plan");
    assert.match(workbench.messages[1].content, /执行图片生成/);
    assert.equal(workbench.messages[2].kind, "summary");
    assert.match(workbench.messages[2].content, /运行失败/);
    assert.match(workbench.messages[2].content, /provider unavailable/);
  } finally {
    globalThis.fetch = previousFetch;
    process.chdir(previousCwd);
    restoreEnv("MOYU_IMAGE_PROVIDER_BASE_URL", previousImageProviderBaseUrl);
    restoreEnv("MOYU_IMAGE_PROVIDER_API_KEY", previousImageProviderApiKey);
    restoreEnv("MOYU_IMAGE_PROVIDER_MODEL", previousImageProviderModel);
    await rm(workspace, { recursive: true, force: true });
  }
});

test("failed Meta-Agent persist step still persists trace, plan, and Workbench conversation", async () => {
  const previousCwd = process.cwd();
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-workbench-failed-meta-"));

  try {
    process.chdir(workspace);
    await mkdir(path.join("agents", "custom__image-prototype-v1"), { recursive: true });

    await assert.rejects(
      () =>
        createAgentWithMeta({
          prompt: "Create an image prototype Agent",
          agentId: "custom/image-prototype-v1",
          persist: true,
        }),
      /Target Agent folder already exists/,
    );

    const runId = await findOnlyRunId();
    const trace = await readTrace(runId);
    assert.equal(trace.run.state, "failed");
    assert.match(trace.run.reason, /Target Agent folder already exists/);
    assert.equal(trace.plan.title, "Meta-Agent 创建 Agent 计划");
    assert.equal(trace.plan.state, "failed");
    assert.equal(trace.middleware.title, "Meta-Agent 上下文装配管线");
    assert.equal(trace.policy.title, "Meta-Agent 创建策略评估");
    assert.equal(trace.policy.state, "review_required");
    assert.equal(trace.worker.queue, "meta.create-agent.inline");
    assert.equal(trace.worker.state, "failed");
    assert.equal(trace.worker.error.code, "run_failed");
    assert.equal(
      trace.events.some((event: { kind?: string; state?: string }) => event.kind === "worker_finished" && event.state === "failed"),
      true,
    );
    assert.equal(trace.events[trace.events.length - 1].kind, "trace_written");
    assert.equal(trace.plan.steps.find((step: { id: string }) => step.id === "intake")?.state, "succeeded");
    assert.equal(trace.plan.steps.find((step: { id: string }) => step.id === "spec-draft")?.state, "succeeded");
    assert.equal(trace.plan.steps.find((step: { id: string }) => step.id === "persist")?.state, "failed");
    assert.equal(trace.plan.steps.find((step: { id: string }) => step.id === "validate")?.state, "pending");
    assert.match(
      trace.steps.find((step: { id: string }) => step.id === "persist")?.error?.message,
      /Target Agent folder already exists/,
    );

    const workbench = await buildWorkbenchData({ selectedRunId: runId });
    assert.equal(workbench.selectedRun?.id, runId);
    assert.equal(workbench.selectedRun?.agentId, "meta/create-agent");
    assert.equal(workbench.selectedRun?.state, "failed");
    assert.equal(workbench.selectedRun?.plan?.state, "failed");
    assert.equal(workbench.selectedRun?.middleware?.title, "Meta-Agent 上下文装配管线");
    assert.equal(workbench.selectedRun?.policy?.title, "Meta-Agent 创建策略评估");
    assert.equal(workbench.selectedRun?.worker?.state, "failed");
    assert.equal(
      workbench.selectedRun?.events.some((event) => event.kind === "worker_finished" && event.state === "failed"),
      true,
    );
    const activeWork = workbench.works.find((work) => work.active);
    assert.equal(activeWork?.state, "failed");
    assert.equal(activeWork?.storedState, "completed");
    assert.equal(activeWork?.lifecycle.runState, "failed");
    assert.equal(activeWork?.progress.failedSteps, 1);
    assert.equal(workbench.messages.length, 3);
    assert.equal(workbench.messages[1].kind, "plan");
    assert.match(workbench.messages[1].content, /写入 Agent 草案/);
    assert.equal(workbench.messages[2].kind, "summary");
    assert.match(workbench.messages[2].content, /Meta-Agent 创建 Agent custom\/image-prototype-v1 失败/);
    assert.match(workbench.messages[2].content, /Target Agent folder already exists/);
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

function restoreEnv(key: string, value: string | undefined) {
  if (typeof value === "undefined") {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}

function createImageAgentSummary(): AgentManifestSummary {
  const agentPath = path.resolve("agents", "custom__image-prototype-v1");
  return {
    agentId: "custom/image-prototype-v1",
    name: "Image Prototype Agent",
    description: "Generate UI concept images and keep traceable artifacts.",
    version: "0.1.0",
    recipeRef: "image-gen/prototype-v1",
    uiRef: "./ui.yaml",
    folderName: "custom__image-prototype-v1",
    path: agentPath,
    tags: ["image-generation"],
    mcpServers: [
      {
        id: "analytics-db-mcp",
        transport: "stdio",
        state: "review",
        description: "Read-only analytics query gateway",
        permissions: ["database.query.read"],
      },
    ],
  };
}

async function findOnlyRunId() {
  const entries = await readdir("traces", { withFileTypes: true });
  const runIds = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  assert.equal(runIds.length, 1);
  return runIds[0];
}

async function readTrace(runId: string) {
  return JSON.parse(await readFile(path.join("traces", runId, "run.json"), "utf8"));
}

async function writeMinimalAgentManifest(agent: AgentManifestSummary) {
  await mkdir(agent.path, { recursive: true });
  await writeFile(
    path.join(agent.path, "manifest.yaml"),
    [
      'schema_version: "1"',
      `agent_id: ${agent.agentId}`,
      `name: ${agent.name}`,
      `description: ${agent.description}`,
      `version: ${agent.version}`,
      `recipe_ref: ${agent.recipeRef}`,
      "routing:",
      "  model_roles:",
      "    image-generation:",
      "      provider: openai-compat",
      "      model: gpt-image-2",
      "",
    ].join("\n"),
    "utf8",
  );
}
