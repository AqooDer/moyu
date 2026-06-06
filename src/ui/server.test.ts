import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { serveWorkbench } from "./server.js";

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

    const artifactId = created.body.workbench.artifacts.find(
      (artifact: { name?: string }) => artifact.name === "manifest.yaml",
    )?.id;
    assert.equal(typeof artifactId, "string");

    const manifest = await getJson(apiUrl(server.url, `/api/artifact-content?id=${encodeURIComponent(artifactId)}`));
    assert.equal(manifest.ok, true);
    assert.equal(manifest.binary, false);
    assert.match(manifest.text, /agent_id: custom\/image-prototype-v1/);

    const installed = await postJson(apiUrl(server.url, "/api/meta/install-agent"), {
      runId: created.body.result.runId,
    });
    assert.equal(installed.status, 200);
    assert.equal(installed.body.ok, true);
    assert.equal(installed.body.result.installed, true);

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

    const selectedDraft = await getJson(
      apiUrl(server.url, `/api/workbench?runId=${encodeURIComponent(created.body.result.runId)}`),
    );
    assert.equal(selectedDraft.selectedRun.id, created.body.result.runId);
    assert.equal(selectedDraft.selectedRun.agentId, "meta/create-agent");
    assert.equal(selectedDraft.artifacts.length, created.body.result.files.length);

    const selectedRun = await getJson(
      apiUrl(server.url, `/api/workbench?runId=${encodeURIComponent(run.body.result.run_id)}`),
    );
    assert.equal(selectedRun.selectedRun.id, run.body.result.run_id);
    assert.equal(selectedRun.selectedRun.agentId, "custom/image-prototype-v1");
    assert.equal(selectedRun.selectedRun.dryRun, true);
    assert.equal(selectedRun.artifacts.length, 0);
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
