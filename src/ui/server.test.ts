import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
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
    const relaySkill = response.settings.skills.find(
      (item: { id?: string }) => item.id === "image_gen_via_relay",
    );
    assert.equal(relaySkill.sourceType, "agent_local");
    assert.equal(relaySkill.riskLevel, "medium");
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

    const created = await postJson(apiUrl(server.url, "/api/meta/create-agent"), {
      prompt: "Create an image prototype Agent that stores traceable UI concept artifacts",
      name: "Image Prototype Agent",
      description: "Generate UI concept images and keep traceable artifacts.",
    });
    assert.equal(created.status, 200);
    assert.equal(created.body.ok, true);
    assert.equal(created.body.result.agentId, "custom/image-prototype-v1");
    assert.equal(created.body.workbench.works.find((work: { runId?: string }) => work.runId === created.body.result.runId)?.state, "waiting_user");
    assert.equal(created.body.workbench.messages.length, 2);
    assert.equal(created.body.workbench.messages[0].role, "user");
    assert.match(created.body.workbench.messages[1].content, /已生成 Agent 草案/);

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

    const draftRun = await getJson(apiUrl(server.url, `/api/runs/${encodeURIComponent(created.body.result.runId)}`));
    assert.equal(draftRun.ok, true);
    assert.equal(draftRun.item.id, created.body.result.runId);
    assert.equal(draftRun.trace.run.agentId, "meta/create-agent");

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
    assert.equal(installed.body.workbench.messages.length, 3);
    assert.match(installed.body.workbench.messages[2].content, /已安装到正式目录/);

    const completedWorks = await getJson(apiUrl(server.url, "/api/works?state=completed"));
    assert.equal(completedWorks.ok, true);
    assert.equal(
      completedWorks.works.some((work: { runIds?: string[] }) => work.runIds?.includes(created.body.result.runId)),
      true,
    );

    const draftMessages = await getJson(
      apiUrl(server.url, `/api/messages?runId=${encodeURIComponent(created.body.result.runId)}`),
    );
    assert.equal(draftMessages.ok, true);
    assert.equal(draftMessages.messages.length, 3);

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
    assert.equal(run.body.workbench.messages.length, 2);
    assert.equal(run.body.workbench.messages[0].content, "a clean app dashboard");
    assert.match(run.body.workbench.messages[1].content, /dry-run 已完成/);

    const runMessages = await getJson(
      apiUrl(server.url, `/api/messages?runId=${encodeURIComponent(run.body.result.run_id)}`),
    );
    assert.equal(runMessages.ok, true);
    assert.equal(runMessages.messages.length, 2);

    const selectedDraft = await getJson(
      apiUrl(server.url, `/api/workbench?runId=${encodeURIComponent(created.body.result.runId)}`),
    );
    assert.equal(selectedDraft.selectedRun.id, created.body.result.runId);
    assert.equal(selectedDraft.selectedRun.agentId, "meta/create-agent");
    assert.equal(typeof selectedDraft.selectedRun.workId, "string");
    assert.equal(selectedDraft.artifacts.length, created.body.result.files.length);
    assert.equal(selectedDraft.messages.length, 3);
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
    assert.equal(selectedRun.artifacts.length, 0);
    assert.equal(selectedRun.messages.length, 2);
    assert.equal(selectedRun.settings.agentDefaults.some((item: { agentId?: string }) => item.agentId === "image-gen/prototype-v1"), true);
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
