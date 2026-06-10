import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { serveWorkbench } from "./server.js";

test("Settings API exposes the Workbench settings center independently", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-ui-settings-test-"));
  const server = await serveWorkbench({ port: 0, rootDir: workspace });

  try {
    const response = await getJson(apiUrl(server.url, "/api/settings"));
    assert.equal(response.ok, true);
    assert.equal(response.schemaVersion, 1);
    assert.equal(Array.isArray(response.settings.nav), true);

    const navIds = response.settings.nav.map((item: { id?: string }) => item.id);
    assert.deepEqual(navIds, [
      "overview",
      "models",
      "agent-context",
      "knowledge",
      "skills",
      "tools",
      "mcp",
      "runtime",
    ]);
    assert.equal(response.settings.modelRoles.some((item: { id?: string }) => item.id === "knowledge-embedding"), true);
    assert.equal(response.settings.modelRoles.some((item: { id?: string }) => item.id === "image-generation"), true);
    assert.equal(response.settings.knowledgeBases.some((item: { id?: string }) => item.id === "workspace-product"), true);
    assert.equal(response.settings.pluginRegistry.byKind.previewer, 1);
    assert.equal(response.settings.pluginRegistry.byKind.middleware, 1);
    assert.equal(response.settings.previewers.some((item: { id?: string }) => item.id === "artifact-preview-v1"), true);
    assert.equal(response.settings.middlewares.some((item: { id?: string }) => item.id === "context-pack-middleware"), true);
    const relaySkill = response.settings.skills.find(
      (item: { id?: string }) => item.id === "image_gen_via_relay",
    );
    assert.equal(relaySkill.sourceType, "agent_local");
    assert.equal(relaySkill.riskLevel, "medium");
    assert.deepEqual(relaySkill.permissionIds, ["provider.image.call", "artifact.write.scoped"]);
    assert.deepEqual(relaySkill.defaultEnabledFor, ["image-gen/prototype-v1"]);
    assert.match(relaySkill.permissionBoundary.zh, /Artifact/);

    const generatedSkill = response.settings.skills.find(
      (item: { id?: string }) => item.id === "meta-agent-skill-review",
    );
    assert.equal(generatedSkill.sourceType, "controlled_generated");
    assert.equal(generatedSkill.state, "review");
    assert.equal(generatedSkill.riskLevel, "high");

    const artifactTool = response.settings.tools.find(
      (item: { id?: string }) => item.id === "artifact-write",
    );
    assert.equal(artifactTool.sourceType, "builtin");
    assert.equal(artifactTool.riskLevel, "low");
    assert.match(artifactTool.approval.zh, /默认启用/);

    const filesystemMcp = response.settings.mcpServers.find(
      (item: { id?: string }) => item.id === "filesystem-mcp",
    );
    assert.equal(filesystemMcp.sourceType, "mcp_server");
    assert.equal(filesystemMcp.riskLevel, "high");
    assert.match(filesystemMcp.permissionBoundary.zh, /路径/);
    assert.equal(response.settings.runtimePolicies.length > 0, true);
    assert.equal(
      response.settings.runtimePolicies.some(
        (item: { id?: string; permissionIds?: string[] }) =>
          item.id === "plugin-permission-first" && item.permissionIds?.includes("artifact.preview.read"),
      ),
      true,
    );
  } finally {
    await server.close();
    await rm(workspace, { recursive: true, force: true });
  }
});

test("Settings API exposes workspace knowledge base config", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-ui-settings-kb-test-"));
  await writeFile(
    path.join(workspace, "moyu.config.json"),
    JSON.stringify({
      knowledge_bases: {
        "workspace-research": {
          title: {
            zh: "研究资料知识库",
            en: "Research KB",
          },
          state: "ready",
          embedding_role: "knowledge-embedding",
          chunk_strategy: {
            zh: "按来源和摘要切片",
            en: "Chunk by source and summary",
          },
          connected_agents: ["research/draft"],
          sources: ["research/**/*.md"],
          write_back: {
            enabled: true,
            policy: {
              zh: "允许审核后的研究摘要回流",
              en: "Allow reviewed research summaries to flow back",
            },
            allowed_artifact_types: ["summary", "citation-note"],
          },
        },
      },
    }),
    "utf8",
  );
  const server = await serveWorkbench({ port: 0, rootDir: workspace });

  try {
    const response = await getJson(apiUrl(server.url, "/api/settings"));
    const researchKb = response.settings.knowledgeBases.find(
      (item: { id?: string }) => item.id === "workspace-research",
    );
    assert.equal(researchKb.title.zh, "研究资料知识库");
    assert.equal(researchKb.state, "ready");
    assert.equal(researchKb.embeddingRole, "knowledge-embedding");
    assert.equal(researchKb.chunkStrategy.en, "Chunk by source and summary");
    assert.deepEqual(researchKb.connectedAgents, ["research/draft"]);
    assert.deepEqual(researchKb.sources, ["research/**/*.md"]);
    assert.equal(researchKb.writeBackEnabled, true);
    assert.equal(researchKb.writeBack.zh, "允许审核后的研究摘要回流");
    assert.deepEqual(researchKb.allowedArtifactTypes, ["summary", "citation-note"]);
  } finally {
    await server.close();
    await rm(workspace, { recursive: true, force: true });
  }
});

test("Workbench static routes expose the formal frontend and prototype compatibility entry", async () => {
  const server = await serveWorkbench({ port: 0, rootDir: path.resolve(".") });

  try {
    assert.match(server.url, /\/ui\/workbench\/$/);

    const workbench = await getText(apiUrl(server.url, "/ui/workbench/"));
    assert.match(workbench, /Moyu Workbench/);
    assert.match(workbench, /\.\/src\/app\.js/);
    assert.match(workbench, /\.\/src\/modules\/settings-module\.js/);
    assert.match(workbench, /data-download-artifact/);
    assert.match(workbench, /data-install-agent-diff/);
    assert.match(workbench, /data-discard-install-conflict/);

    const compatibility = await getText(apiUrl(server.url, "/ui/workbench-prototype/"));
    assert.match(compatibility, /ui\/workbench\//);
  } finally {
    await server.close();
  }
});

test("Workbench API creates, installs, runs, and selects Agent runs", async () => {
  const previousCwd = process.cwd();
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-ui-server-test-"));
  process.chdir(workspace);

  const server = await serveWorkbench({ port: 0, rootDir: workspace });

  try {
    const health = await getJson(apiUrl(server.url, "/api/health"));
    assert.equal(health.ok, true);

    const plugins = await getJson(apiUrl(server.url, "/api/plugins"));
    assert.equal(plugins.ok, true);
    assert.equal(plugins.registry.summary.byKind.previewer, 1);
    assert.equal(
      plugins.registry.capabilities.some(
        (item: { id?: string; permissionIds?: string[] }) =>
          item.id === "filesystem-mcp" && item.permissionIds?.includes("filesystem.scoped"),
      ),
      true,
    );

    const policies = await getJson(apiUrl(server.url, "/api/policies"));
    assert.equal(policies.ok, true);
    assert.equal(policies.permissions.some((item: { id?: string }) => item.id === "artifact.preview.read"), true);
    assert.equal(policies.runtimePolicies.some((item: { id?: string }) => item.id === "plugin-permission-first"), true);

    const created = await postJson(apiUrl(server.url, "/api/meta/create-agent"), {
      prompt: "Create an image prototype Agent that stores traceable UI concept artifacts",
      name: "Image Prototype Agent",
      description: "Generate UI concept images and keep traceable artifacts.",
    });
    assert.equal(created.status, 200);
    assert.equal(created.body.ok, true);
    assert.equal(created.body.result.agentId, "custom/image-prototype-v1");
    assert.equal(created.body.workbench.works.find((work: { runId?: string }) => work.runId === created.body.result.runId)?.state, "waiting_user");
    assert.equal(created.body.workbench.selectedRun.plan.title, "Meta-Agent 创建 Agent 计划");
    assertRunSandbox({
      sandbox: created.body.workbench.selectedRun.sandbox,
      runId: created.body.result.runId,
      outputsPath: `artifacts/meta-agent-runs/${created.body.result.runId}`,
    });
    assert.equal(created.body.workbench.selectedRun.middleware.title, "Meta-Agent 上下文装配管线");
    assert.equal(created.body.workbench.selectedRun.middleware.stages.length, 4);
    assert.equal(created.body.workbench.selectedRun.policy.title, "Meta-Agent 创建策略评估");
    assert.equal(created.body.workbench.selectedRun.policy.state, "review_required");
    assert.equal(created.body.workbench.selectedRun.execution.title, "Meta-Agent 创建执行模式");
    assert.equal(created.body.workbench.selectedRun.execution.mode, "dry_run");
    assert.equal(created.body.workbench.selectedRun.execution.queue, "meta.create-agent.inline");
    assert.equal(created.body.workbench.selectedRun.delivery.title, "Meta-Agent 草案交付清单");
    assert.equal(created.body.workbench.selectedRun.delivery.state, "ready");
    assert.equal(created.body.workbench.selectedRun.delivery.totalArtifacts, created.body.result.files.length);
    assert.equal(created.body.workbench.selectedRun.worker.queue, "meta.create-agent.inline");
    assert.equal(created.body.workbench.selectedRun.worker.state, "succeeded");
    assert.equal(
      created.body.workbench.selectedRun.events.some(
        (event: { kind?: string; state?: string }) =>
          event.kind === "worker_finished" && event.state === "succeeded",
      ),
      true,
    );
    assert.equal(created.body.workbench.messages.length, 3);
    assert.equal(created.body.workbench.messages[0].role, "user");
    assert.equal(created.body.workbench.messages[1].kind, "plan");
    assert.match(created.body.workbench.messages[1].content, /草拟 Agent 规格/);
    assert.match(created.body.workbench.messages[2].content, /已生成 Agent 草案/);

    const artifactId = created.body.workbench.artifacts.find(
      (artifact: { name?: string }) => artifact.name === "manifest.yaml",
    )?.id;
    assert.equal(typeof artifactId, "string");

    const manifest = await getJson(apiUrl(server.url, `/api/artifact-content?id=${encodeURIComponent(artifactId)}`));
    assert.equal(manifest.ok, true);
    assert.equal(manifest.binary, false);
    assert.match(manifest.text, /agent_id: custom\/image-prototype-v1/);

    const artifact = await getJson(apiUrl(server.url, `/api/artifacts/${encodeURIComponent(artifactId)}`));
    assert.equal(artifact.ok, true);
    assert.equal(artifact.artifact.name, "manifest.yaml");
    assert.equal(artifact.artifact.preview.kind, "text");
    assert.equal(artifact.artifact.preview.canInline, true);
    assert.equal(artifact.artifact.preview.sandbox.scope, "artifacts");

    const manifestPreview = await getJson(apiUrl(server.url, `/api/artifact-preview?id=${encodeURIComponent(artifactId)}`));
    assert.equal(manifestPreview.ok, true);
    assert.equal(manifestPreview.preview.kind, "text");
    assert.equal(manifestPreview.binary, false);
    assert.match(manifestPreview.text, /agent_id: custom\/image-prototype-v1/);
    assert.match(manifestPreview.preview.sandbox.relativePath, /^artifacts\/meta-agent-runs\//);

    const manifestDownload = await fetch(
      apiUrl(server.url, `/api/artifacts/${encodeURIComponent(artifactId)}/download`),
    );
    assert.equal(manifestDownload.status, 200);
    assert.match(manifestDownload.headers.get("content-type") || "", /text\/yaml/);
    assert.match(manifestDownload.headers.get("content-disposition") || "", /filename="manifest.yaml"/);
    assert.equal(manifestDownload.headers.get("x-moyu-artifact-id"), artifactId);
    assert.match(await manifestDownload.text(), /agent_id: custom\/image-prototype-v1/);

    const draftRun = await getJson(apiUrl(server.url, `/api/runs/${encodeURIComponent(created.body.result.runId)}`));
    assert.equal(draftRun.ok, true);
    assert.equal(draftRun.item.id, created.body.result.runId);
    assert.equal(draftRun.trace.run.agentId, "meta/create-agent");
    assert.equal(draftRun.trace.plan.title, "Meta-Agent 创建 Agent 计划");
    assertRunSandbox({
      sandbox: draftRun.trace.sandbox,
      runId: created.body.result.runId,
      outputsPath: `artifacts/meta-agent-runs/${created.body.result.runId}`,
    });
    assert.equal(draftRun.trace.middleware.title, "Meta-Agent 上下文装配管线");
    assert.equal(draftRun.trace.policy.title, "Meta-Agent 创建策略评估");
    assert.equal(draftRun.trace.policy.state, "review_required");
    assert.equal(draftRun.trace.execution.title, "Meta-Agent 创建执行模式");
    assert.equal(draftRun.trace.execution.mode, "dry_run");
    assert.equal(draftRun.trace.execution.queue, "meta.create-agent.inline");
    assert.equal(draftRun.trace.delivery.title, "Meta-Agent 草案交付清单");
    assert.equal(draftRun.trace.delivery.state, "ready");
    assert.equal(draftRun.trace.delivery.totalArtifacts, created.body.result.files.length);
    assert.equal(draftRun.trace.worker.queue, "meta.create-agent.inline");
    assert.equal(draftRun.trace.worker.state, "succeeded");
    assert.equal(
      draftRun.trace.events.some((event: { kind?: string }) => event.kind === "trace_written"),
      true,
    );
    assert.equal(
      draftRun.trace.middleware.stages.find((stage: { id?: string }) => stage.id === "capability-injection")?.capabilityIds.includes("filesystem-mcp"),
      true,
    );
    assert.equal(draftRun.trace.plan.steps.find((step: { id?: string }) => step.id === "validate")?.state, "succeeded");

    const draftIndex = await getJson(apiUrl(server.url, "/api/meta/agent-drafts"));
    assert.equal(draftIndex.ok, true);
    assert.equal(draftIndex.drafts.length, 1);
    assert.equal(draftIndex.drafts[0].runId, created.body.result.runId);
    assert.equal(draftIndex.drafts[0].state, "drafted");
    assert.equal(draftIndex.drafts[0].revision, 1);

    const installed = await postJson(apiUrl(server.url, "/api/meta/install-agent"), {
      runId: created.body.result.runId,
    });
    assert.equal(installed.status, 200);
    assert.equal(installed.body.ok, true);
    assert.equal(installed.body.result.installed, true);
    assert.equal(installed.body.workbench.works.find((work: { runId?: string }) => work.runId === created.body.result.runId)?.state, "completed");
    assert.equal(installed.body.workbench.messages.length, 4);
    assert.match(installed.body.workbench.messages[3].content, /已安装到正式目录/);

    const completedWorks = await getJson(apiUrl(server.url, "/api/works?state=completed"));
    assert.equal(completedWorks.ok, true);
    const completedDraftWork = completedWorks.works.find((work: { runIds?: string[] }) =>
      work.runIds?.includes(created.body.result.runId),
    );
    assert.ok(completedDraftWork);
    assert.equal(completedDraftWork.state, "completed");
    assert.equal(completedDraftWork.storedState, "completed");
    assert.equal(completedDraftWork.currentRunId, created.body.result.runId);
    assert.equal(completedDraftWork.lifecycle.source, "run_trace");
    assert.equal(completedDraftWork.lifecycle.runState, "succeeded");
    assert.equal(completedDraftWork.lifecycle.planState, "succeeded");
    assert.equal(completedDraftWork.progress.percent, 100);
    assert.equal(completedDraftWork.progress.totalSteps, 5);

    const draftMessages = await getJson(
      apiUrl(server.url, `/api/messages?runId=${encodeURIComponent(created.body.result.runId)}`),
    );
    assert.equal(draftMessages.ok, true);
    assert.equal(draftMessages.messages.length, 4);
    assert.equal(draftMessages.messages[1].kind, "plan");

    const repeatedInstall = await postJson(apiUrl(server.url, "/api/meta/install-agent"), {
      runId: created.body.result.runId,
    });
    assert.equal(repeatedInstall.status, 200);
    assert.equal(repeatedInstall.body.ok, true);
    assert.equal(repeatedInstall.body.result.installed, true);

    const agents = await getJson(apiUrl(server.url, "/api/agents"));
    assert.equal(agents.ok, true);
    assert.deepEqual(
      agents.agents.map((agent: { agentId: string }) => agent.agentId),
      ["custom/image-prototype-v1"],
    );

    const conflictingDraft = await postJson(apiUrl(server.url, "/api/meta/create-agent"), {
      prompt: "Create another image prototype Agent with the same id",
      agentId: "custom/image-prototype-v1",
      name: "Conflicting Image Agent",
    });
    assert.equal(conflictingDraft.status, 200);
    assert.equal(conflictingDraft.body.ok, true);

    const draftRecordId = conflictingDraft.body.workbench.artifacts.find(
      (artifact: { name?: string }) => artifact.name === "agent-draft.json",
    )?.id;
    assert.equal(typeof draftRecordId, "string");

    const conflict = await postJson(apiUrl(server.url, "/api/meta/install-agent"), {
      runId: conflictingDraft.body.result.runId,
    });
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.code, "agent_exists");
    assert.equal(conflict.body.agentId, "custom/image-prototype-v1");
    assert.equal(typeof conflict.body.sourcePath, "string");
    assert.equal(typeof conflict.body.targetPath, "string");
    assert.equal(conflict.body.suggestion, "create_new_version_or_diff_merge");
    assert.equal(conflict.body.nextActions.createVersion.endpoint, "/api/meta/install-agent/version");
    assert.equal(conflict.body.nextActions.createVersion.method, "POST");
    assert.deepEqual(conflict.body.nextActions.createVersion.payload, {
      runId: conflictingDraft.body.result.runId,
    });
    assert.equal(conflict.body.nextActions.createVersion.proposedAgentId, "custom/image-prototype-v2");
    assert.match(conflict.body.nextActions.createVersion.proposedTargetPath, /custom__image-prototype-v2$/);
    assert.match(conflict.body.nextActions.viewDiff.endpoint, /^\/api\/meta\/install-agent\/diff\?runId=/);
    assert.equal(typeof conflict.body.diffSummary.changed, "number");

    const diff = await getJson(
      apiUrl(server.url, `/api/meta/install-agent/diff?runId=${encodeURIComponent(conflictingDraft.body.result.runId)}`),
    );
    assert.equal(diff.ok, true);
    assert.equal(diff.diff.agentId, "custom/image-prototype-v1");
    assert.equal(diff.diff.targetExists, true);
    assert.equal(Array.isArray(diff.diff.files.changed), true);

    const conflictDraftRecord = await getJson(
      apiUrl(server.url, `/api/artifact-content?id=${encodeURIComponent(draftRecordId)}`),
    );
    assert.match(conflictDraftRecord.text, /"state": "install_conflict"/);

    const conflictDraftIndex = await getJson(apiUrl(server.url, "/api/meta/agent-drafts?state=install_conflict"));
    assert.equal(conflictDraftIndex.ok, true);
    assert.equal(conflictDraftIndex.drafts.length, 1);
    assert.equal(conflictDraftIndex.drafts[0].runId, conflictingDraft.body.result.runId);
    assert.equal(conflictDraftIndex.drafts[0].state, "install_conflict");
    assert.equal(conflictDraftIndex.drafts[0].revision, 2);

    const versionedInstall = await postJson(apiUrl(server.url, "/api/meta/install-agent/version"), {
      runId: conflictingDraft.body.result.runId,
    });
    assert.equal(versionedInstall.status, 200);
    assert.equal(versionedInstall.body.ok, true);
    assert.equal(versionedInstall.body.result.installed, true);
    assert.equal(versionedInstall.body.result.versioned, true);
    assert.equal(versionedInstall.body.result.originalAgentId, "custom/image-prototype-v1");
    assert.equal(versionedInstall.body.result.agentId, "custom/image-prototype-v2");

    const versionedAgents = await getJson(apiUrl(server.url, "/api/agents"));
    assert.deepEqual(
      versionedAgents.agents.map((agent: { agentId: string }) => agent.agentId),
      ["custom/image-prototype-v1", "custom/image-prototype-v2"],
    );

    const installedVersionDraftRecord = await getJson(
      apiUrl(server.url, `/api/artifact-content?id=${encodeURIComponent(draftRecordId)}`),
    );
    assert.match(installedVersionDraftRecord.text, /"agentId": "custom\/image-prototype-v2"/);
    assert.match(installedVersionDraftRecord.text, /"state": "installed"/);

    const run = await postJson(apiUrl(server.url, "/api/agent/run"), {
      agentId: "custom/image-prototype-v1",
      prompt: "a clean app dashboard",
      count: 1,
      rawPrompt: true,
      dryRun: true,
    });
    assert.equal(run.status, 200);
    assert.equal(run.body.ok, true);
    assert.match(run.body.result.run_id, /^run-custom__image-prototype-v1-/);
    assert.equal(run.body.workbench.selectedRun.plan.title, "生图 Agent 运行计划");
    assertRunSandbox({
      sandbox: run.body.workbench.selectedRun.sandbox,
      runId: run.body.result.run_id,
      outputsPath: `artifacts/agent-runs/custom__image-prototype-v1/${run.body.result.run_id}`,
    });
    assert.equal(run.body.workbench.selectedRun.middleware.title, "Agent 运行上下文装配管线");
    assert.equal(run.body.workbench.selectedRun.policy.title, "Agent 运行策略评估");
    assert.equal(run.body.workbench.selectedRun.policy.state, "review_required");
    assert.equal(run.body.workbench.selectedRun.execution.title, "Agent 运行执行模式");
    assert.equal(run.body.workbench.selectedRun.execution.mode, "dry_run");
    assert.equal(run.body.workbench.selectedRun.execution.queue, "agent.run.inline");
    assert.equal(run.body.workbench.selectedRun.execution.dryRunEffective, true);
    assert.equal(run.body.workbench.selectedRun.delivery.title, "Agent 产物交付清单");
    assert.equal(run.body.workbench.selectedRun.delivery.state, "empty");
    assert.equal(run.body.workbench.selectedRun.delivery.totalArtifacts, 0);
    assert.equal(run.body.workbench.selectedRun.worker.queue, "agent.run.inline");
    assert.equal(run.body.workbench.selectedRun.worker.state, "succeeded");
    assert.equal(
      run.body.workbench.selectedRun.events.some(
        (event: { kind?: string; state?: string }) =>
          event.kind === "worker_finished" && event.state === "succeeded",
      ),
      true,
    );
    assert.equal(run.body.workbench.messages.length, 3);
    assert.equal(run.body.workbench.messages[0].content, "a clean app dashboard");
    assert.equal(run.body.workbench.messages[1].kind, "plan");
    assert.match(run.body.workbench.messages[1].content, /执行图片生成/);
    assert.match(run.body.workbench.messages[2].content, /dry-run 已完成/);

    const runDetail = await getJson(apiUrl(server.url, `/api/runs/${encodeURIComponent(run.body.result.run_id)}`));
    assert.equal(runDetail.ok, true);
    assert.equal(runDetail.trace.plan.title, "生图 Agent 运行计划");
    assertRunSandbox({
      sandbox: runDetail.trace.sandbox,
      runId: run.body.result.run_id,
      outputsPath: `artifacts/agent-runs/custom__image-prototype-v1/${run.body.result.run_id}`,
    });
    assert.equal(runDetail.trace.middleware.title, "Agent 运行上下文装配管线");
    assert.equal(runDetail.trace.policy.title, "Agent 运行策略评估");
    assert.equal(runDetail.trace.policy.state, "review_required");
    assert.equal(runDetail.trace.execution.title, "Agent 运行执行模式");
    assert.equal(runDetail.trace.execution.mode, "dry_run");
    assert.equal(runDetail.trace.execution.queue, "agent.run.inline");
    assert.equal(runDetail.trace.execution.dryRunEffective, true);
    assert.equal(runDetail.trace.delivery.title, "Agent 产物交付清单");
    assert.equal(runDetail.trace.delivery.state, "empty");
    assert.equal(runDetail.trace.delivery.totalArtifacts, 0);
    assert.equal(runDetail.trace.worker.queue, "agent.run.inline");
    assert.equal(runDetail.trace.worker.state, "succeeded");
    assert.equal(
      runDetail.trace.events.some((event: { kind?: string }) => event.kind === "trace_written"),
      true,
    );
    assert.equal(runDetail.trace.middleware.stages.find((stage: { id?: string }) => stage.id === "knowledge-context")?.state, "planned");
    assert.equal(runDetail.trace.plan.steps.find((step: { id?: string }) => step.id === "step-image-gen")?.state, "skipped");

    const completedWorksAfterRun = await getJson(apiUrl(server.url, "/api/works?state=completed"));
    const completedImageWork = completedWorksAfterRun.works.find((work: { runIds?: string[] }) =>
      work.runIds?.includes(run.body.result.run_id),
    );
    assert.ok(completedImageWork);
    assert.equal(completedImageWork.currentRunId, run.body.result.run_id);
    assert.equal(completedImageWork.dryRun, true);
    assert.equal(completedImageWork.lifecycle.source, "run_trace");
    assert.equal(completedImageWork.lifecycle.runState, "succeeded");
    assert.equal(completedImageWork.progress.skippedSteps, 2);
    assert.equal(completedImageWork.progress.percent, 100);

    const runMessages = await getJson(
      apiUrl(server.url, `/api/messages?runId=${encodeURIComponent(run.body.result.run_id)}`),
    );
    assert.equal(runMessages.ok, true);
    assert.equal(runMessages.messages.length, 3);
    assert.equal(runMessages.messages[1].kind, "plan");

    const selectedDraft = await getJson(
      apiUrl(server.url, `/api/workbench?runId=${encodeURIComponent(created.body.result.runId)}`),
    );
    assert.equal(selectedDraft.selectedRun.id, created.body.result.runId);
    assert.equal(selectedDraft.selectedRun.agentId, "meta/create-agent");
    assert.equal(typeof selectedDraft.selectedRun.workId, "string");
    assert.equal(selectedDraft.selectedRun.plan.title, "Meta-Agent 创建 Agent 计划");
    assertRunSandbox({
      sandbox: selectedDraft.selectedRun.sandbox,
      runId: created.body.result.runId,
      outputsPath: `artifacts/meta-agent-runs/${created.body.result.runId}`,
    });
    assert.equal(selectedDraft.selectedRun.middleware.title, "Meta-Agent 上下文装配管线");
    assert.equal(selectedDraft.selectedRun.policy.title, "Meta-Agent 创建策略评估");
    assert.equal(selectedDraft.selectedRun.execution.title, "Meta-Agent 创建执行模式");
    assert.equal(selectedDraft.selectedRun.execution.mode, "dry_run");
    assert.equal(selectedDraft.selectedRun.execution.queue, "meta.create-agent.inline");
    assert.equal(selectedDraft.selectedRun.delivery.state, "ready");
    assert.equal(selectedDraft.selectedRun.delivery.totalArtifacts, created.body.result.files.length);
    assert.equal(selectedDraft.selectedRun.worker.queue, "meta.create-agent.inline");
    assert.equal(selectedDraft.selectedRun.worker.state, "succeeded");
    assert.equal(
      selectedDraft.selectedRun.events.some((event: { kind?: string }) => event.kind === "worker_finished"),
      true,
    );
    assert.equal(selectedDraft.artifacts.length, created.body.result.files.length);
    assert.equal(selectedDraft.artifacts.find((item: { id?: string }) => item.id === artifactId)?.preview.kind, "text");
    assert.equal(selectedDraft.messages.length, 4);
    assert.equal(Array.isArray(selectedDraft.settings.nav), true);
    assert.equal(selectedDraft.settings.nav.some((item: { id?: string }) => item.id === "models"), true);
    assert.equal(selectedDraft.settings.nav.some((item: { id?: string }) => item.id === "agent-context"), true);
    assert.equal(
      selectedDraft.settings.agentContexts.some(
        (item: { agentId?: string; tools?: string[] }) =>
          item.agentId === "meta/create-agent" && item.tools?.includes("artifact-write"),
      ),
      true,
    );

    const selectedRun = await getJson(
      apiUrl(server.url, `/api/workbench?runId=${encodeURIComponent(run.body.result.run_id)}`),
    );
    assert.equal(selectedRun.selectedRun.id, run.body.result.run_id);
    assert.equal(selectedRun.selectedRun.agentId, "custom/image-prototype-v1");
    assert.equal(selectedRun.selectedRun.dryRun, true);
    assert.match(selectedRun.selectedRun.workId, /^work-run-custom__image-prototype-v1-/);
    assert.equal(selectedRun.selectedRun.plan.title, "生图 Agent 运行计划");
    assertRunSandbox({
      sandbox: selectedRun.selectedRun.sandbox,
      runId: run.body.result.run_id,
      outputsPath: `artifacts/agent-runs/custom__image-prototype-v1/${run.body.result.run_id}`,
    });
    assert.equal(selectedRun.selectedRun.middleware.title, "Agent 运行上下文装配管线");
    assert.equal(selectedRun.selectedRun.middleware.stages.length, 4);
    assert.equal(selectedRun.selectedRun.policy.title, "Agent 运行策略评估");
    assert.equal(selectedRun.selectedRun.policy.state, "review_required");
    assert.equal(selectedRun.selectedRun.execution.title, "Agent 运行执行模式");
    assert.equal(selectedRun.selectedRun.execution.mode, "dry_run");
    assert.equal(selectedRun.selectedRun.execution.queue, "agent.run.inline");
    assert.equal(selectedRun.selectedRun.execution.dryRunEffective, true);
    assert.equal(selectedRun.selectedRun.delivery.state, "empty");
    assert.equal(selectedRun.selectedRun.delivery.totalArtifacts, 0);
    assert.equal(selectedRun.selectedRun.worker.queue, "agent.run.inline");
    assert.equal(selectedRun.selectedRun.worker.state, "succeeded");
    assert.equal(
      selectedRun.selectedRun.events.some((event: { kind?: string }) => event.kind === "trace_written"),
      true,
    );
    assert.equal(selectedRun.artifacts.length, 0);
    assert.equal(selectedRun.messages.length, 3);
    assert.equal(selectedRun.settings.agentDefaults.some((item: { agentId?: string }) => item.agentId === "image-gen/prototype-v1"), true);
    assert.equal(selectedRun.settings.pluginRegistry.enabled >= 4, true);
    assert.equal(
      selectedRun.settings.agentContexts.some(
        (item: { agentId?: string; modelRoles?: string[] }) =>
          item.agentId === "image-gen/prototype-v1" && item.modelRoles?.includes("image-generation"),
      ),
      true,
    );
  } finally {
    await server.close();
    process.chdir(previousCwd);
    await rm(workspace, { recursive: true, force: true });
  }
});

test("Artifact preview API returns metadata-only responses for Office-like binary files", async () => {
  const previousCwd = process.cwd();
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-ui-preview-test-"));
  process.chdir(workspace);

  const server = await serveWorkbench({ port: 0, rootDir: workspace });

  try {
    await mkdir("artifacts/manual", { recursive: true });
    await mkdir(path.join("traces", "run-preview-office"), { recursive: true });
    const docxPath = path.resolve("artifacts/manual/report.docx");
    await writeFile(docxPath, Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    await writeFile(
      path.join("traces", "run-preview-office", "run.json"),
      JSON.stringify(
        {
          schemaVersion: 1,
          run: {
            id: "run-preview-office",
            workId: "work-preview-office",
            agentId: "test/preview",
            agentVersion: "0.1.0",
            recipeId: null,
            state: "succeeded",
            dryRun: false,
            startedAt: "2026-01-01T00:00:00.000Z",
            endedAt: "2026-01-01T00:00:01.000Z",
            durationMs: 1000,
            input: { prompt: "preview office" },
            reason: null,
            modelRoles: [],
            mcpServers: [],
          },
          plan: null,
          execution: null,
          steps: [],
          artifacts: [
            {
              id: "art-run-preview-office-1",
              runId: "run-preview-office",
              producerStepId: "manual",
              type: "docx",
              role: "report",
              name: "report.docx",
              path: docxPath,
              sizeBytes: 4,
              sha256: "sha",
              createdAt: "2026-01-01T00:00:00.500Z",
            },
            {
              id: "art-run-preview-external-1",
              runId: "run-preview-office",
              producerStepId: "manual",
              type: "json",
              role: "external",
              name: "package.json",
              path: path.join(previousCwd, "package.json"),
              sizeBytes: null,
              sha256: "sha",
              createdAt: "2026-01-01T00:00:00.600Z",
            },
          ],
          knowledgeWriteBacks: [],
          notes: [],
        },
        null,
        2,
      ),
      "utf8",
    );

    const preview = await getJson(
      apiUrl(server.url, "/api/artifact-preview?id=art-run-preview-office-1"),
    );
    assert.equal(preview.ok, true);
    assert.equal(preview.preview.kind, "office");
    assert.equal(preview.preview.canInline, false);
    assert.equal(preview.preview.canOpenExternal, true);
    assert.equal(preview.binary, true);
    assert.equal(preview.text, null);

    const download = await fetch(apiUrl(server.url, "/api/artifacts/art-run-preview-office-1/download"));
    assert.equal(download.status, 200);
    assert.match(download.headers.get("content-type") || "", /wordprocessingml\.document/);
    assert.equal(download.headers.get("content-length"), "4");
    assert.match(download.headers.get("content-disposition") || "", /filename="report.docx"/);
    assert.equal(download.headers.get("x-moyu-artifact-id"), "art-run-preview-office-1");
    assert.deepEqual([...new Uint8Array(await download.arrayBuffer())], [0x50, 0x4b, 0x03, 0x04]);

    const externalDownload = await fetch(apiUrl(server.url, "/api/artifacts/art-run-preview-external-1/download"));
    assert.equal(externalDownload.status, 403);
    assert.match(await externalDownload.text(), /outside the download sandbox/);

    const workbench = await getJson(apiUrl(server.url, "/api/workbench?runId=run-preview-office"));
    assert.equal(workbench.artifacts[0].preview.kind, "office");
    assert.equal(workbench.artifacts[0].preview.sandbox.scope, "artifacts");
    assert.equal(workbench.selectedRun.middleware, null);
    assert.equal(workbench.selectedRun.sandbox, null);
    assert.equal(workbench.selectedRun.policy, null);
    assert.equal(workbench.selectedRun.execution, null);
    assert.equal(workbench.selectedRun.delivery, null);
    assert.equal(workbench.selectedRun.worker, null);
    assert.deepEqual(workbench.selectedRun.events, []);

    const run = await getJson(apiUrl(server.url, "/api/runs/run-preview-office"));
    assert.equal(run.ok, true);
    assert.equal(run.trace.middleware, null);
    assert.equal(run.trace.sandbox, null);
    assert.equal(run.trace.policy, null);
    assert.equal(run.trace.execution, null);
    assert.equal(run.trace.delivery, null);
    assert.equal(run.trace.worker, null);
    assert.deepEqual(run.trace.events, []);
  } finally {
    await server.close();
    process.chdir(previousCwd);
    await rm(workspace, { recursive: true, force: true });
  }
});

function apiUrl(serverUrl: string, pathname: string) {
  return new URL(pathname, serverUrl).toString();
}

async function getJson(url: string) {
  const response = await fetch(url);
  assert.equal(response.ok, true, `${url} should return ${response.status}`);
  return response.json();
}

async function getText(url: string) {
  const response = await fetch(url);
  assert.equal(response.ok, true, `${url} should return ${response.status}`);
  return response.text();
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return {
    status: response.status,
    body: await response.json(),
  };
}

function assertRunSandbox(input: { sandbox: any; runId: string; outputsPath: string }) {
  const { sandbox, runId, outputsPath } = input;
  assert.ok(sandbox, "sandbox should be present");
  assert.equal(sandbox.id, `sandbox-${runId}`);
  assert.equal(sandbox.runId, runId);
  assert.equal(sandbox.scope, "run");
  assert.equal(sandbox.state, "ready");
  assert.equal(sandbox.relativeRoot, `artifacts/sandboxes/${runId}`);
  assert.deepEqual(
    sandbox.directories.map((directory: { kind: string }) => directory.kind),
    ["workspace", "uploads", "outputs", "temp", "traces"],
  );
  assert.equal(findSandboxDirectory(sandbox, "workspace").relativePath, `artifacts/sandboxes/${runId}/workspace`);
  assert.equal(findSandboxDirectory(sandbox, "uploads").relativePath, `artifacts/sandboxes/${runId}/uploads`);
  assert.equal(findSandboxDirectory(sandbox, "outputs").relativePath, outputsPath);
  assert.equal(findSandboxDirectory(sandbox, "outputs").cleanupPolicy, "keep");
  assert.equal(findSandboxDirectory(sandbox, "temp").cleanupPolicy, "ephemeral");
  assert.equal(findSandboxDirectory(sandbox, "traces").relativePath, `traces/${runId}`);
  assert.equal(
    sandbox.directories.every((directory: { writable?: boolean; created?: boolean }) => directory.writable && directory.created),
    true,
  );
  assert.equal(sandbox.constraints.some((item: string) => item.includes("No process isolation")), true);
}

function findSandboxDirectory(sandbox: any, kind: string) {
  const directory = sandbox.directories.find((item: { kind?: string }) => item.kind === kind);
  assert.ok(directory, `sandbox should include ${kind}`);
  return directory;
}
