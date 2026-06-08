import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  formatKnowledgeWriteBackList,
  listKnowledgeWriteBacks,
  markArtifactForKnowledgeBase,
} from "./artifact-writebacks.js";
import { formatRunHistoryDetail, getRunHistoryDetail } from "./history.js";
import { RuntimeStore } from "./store.js";

test("approved artifacts can be marked for knowledge-base write-back and queried from trace", async () => {
  const previousCwd = process.cwd();
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-artifact-writeback-"));

  try {
    process.chdir(workspace);
    const artifactPath = path.join(workspace, "proposal-summary.md");
    await writeFile(artifactPath, "# Proposal summary\n\nAccepted by reviewer.\n", "utf8");

    const runtime = RuntimeStore.createRun({
      id: "run-writeback-test",
      agentId: "docs/summary-agent",
      agentVersion: "0.1.0",
      recipeId: "docs-summary",
      dryRun: false,
      input: { prompt: "summarize accepted proposal" },
    });
    runtime.setRunState("running");
    const step = runtime.startStep({
      id: "step-summary",
      name: "summary",
      kind: "skill",
    });
    const artifact = await runtime.addArtifact({
      producerStepId: step.id,
      type: "markdown",
      role: "report",
      filePath: artifactPath,
    });
    runtime.finishStep(step.id, "succeeded", { artifacts: 1 });
    runtime.setRunState("succeeded");
    const traceFile = await runtime.writeTrace();

    const result = await markArtifactForKnowledgeBase({
      artifactId: artifact.id,
      collectionId: "workspace-product",
      reviewer: "Yuxi",
      note: "Accepted proposal summary can seed future drafting.",
    });

    assert.ok(result);
    assert.equal(result.created, true);
    assert.equal(result.record.artifactId, artifact.id);
    assert.equal(result.record.collectionId, "workspace-product");
    assert.equal(result.record.agentId, "docs/summary-agent");
    assert.equal(result.record.source.artifactPath, artifactPath);
    assert.equal(result.record.source.artifactSha256, artifact.sha256);
    assert.equal(result.record.review.decision, "approved");
    assert.equal(result.record.review.reviewer, "Yuxi");
    assert.equal(result.traceFile, traceFile);

    const repeated = await markArtifactForKnowledgeBase({
      artifactId: artifact.id,
      collectionId: "workspace-product",
      reviewer: "Another reviewer",
      note: "Should not duplicate the same artifact and collection.",
    });
    assert.ok(repeated);
    assert.equal(repeated.created, false);
    assert.equal(repeated.record.id, result.record.id);
    assert.equal(repeated.record.review.reviewer, "Yuxi");

    const records = await listKnowledgeWriteBacks({ collectionId: "workspace-product" });
    assert.equal(records.length, 1);
    assert.equal(records[0].id, result.record.id);
    assert.equal(records[0].traceFile, traceFile);

    const runRecords = await listKnowledgeWriteBacks({ runId: "run-writeback-test" });
    assert.deepEqual(
      runRecords.map((record) => record.artifactId),
      [artifact.id],
    );

    const trace = JSON.parse(await readFile(traceFile, "utf8"));
    assert.equal(trace.knowledgeWriteBacks.length, 1);
    assert.equal(trace.knowledgeWriteBacks[0].collectionId, "workspace-product");

    const detail = await getRunHistoryDetail("run-writeback-test");
    assert.ok(detail);
    const formatted = formatRunHistoryDetail(detail);
    assert.match(formatted, /knowledge_write_backs:/);
    assert.match(formatted, /collection=workspace-product/);

    const listOutput = formatKnowledgeWriteBackList(records);
    assert.match(listOutput, /workspace-product/);
    assert.match(listOutput, /proposal-summary\.md/);
  } finally {
    process.chdir(previousCwd);
    await rm(workspace, { recursive: true, force: true });
  }
});

test("marking a missing artifact returns null", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-artifact-writeback-missing-"));

  try {
    const result = await markArtifactForKnowledgeBase({
      artifactId: "art-missing",
      collectionId: "workspace-product",
      reviewer: "Yuxi",
      tracesRoot: path.join(workspace, "traces"),
    });

    assert.equal(result, null);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test("knowledge-base write-back policy blocks disabled or disallowed targets", async () => {
  const previousCwd = process.cwd();
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-artifact-writeback-policy-"));

  try {
    process.chdir(workspace);
    const artifactPath = path.join(workspace, "concept.png");
    await writeFile(artifactPath, "fake image bytes", "utf8");

    const runtime = RuntimeStore.createRun({
      id: "run-writeback-policy-test",
      agentId: "image/concept-agent",
      agentVersion: "0.1.0",
      recipeId: "image-concept",
      dryRun: false,
      input: { prompt: "accepted concept" },
    });
    runtime.setRunState("running");
    const step = runtime.startStep({
      id: "step-image",
      name: "image",
      kind: "skill",
    });
    const artifact = await runtime.addArtifact({
      producerStepId: step.id,
      type: "png",
      role: "primary",
      filePath: artifactPath,
    });
    runtime.finishStep(step.id, "succeeded", { artifacts: 1 });
    runtime.setRunState("succeeded");
    await runtime.writeTrace();

    await assert.rejects(
      markArtifactForKnowledgeBase({
        artifactId: artifact.id,
        collectionId: "workspace-product",
        reviewer: "Yuxi",
      }),
      /Artifact type "png" is not allowed/,
    );

    const visualResult = await markArtifactForKnowledgeBase({
      artifactId: artifact.id,
      collectionId: "workspace-visual",
      reviewer: "Yuxi",
    });
    assert.ok(visualResult);
    assert.equal(visualResult.created, true);
    assert.equal(visualResult.record.collectionId, "workspace-visual");

    await assert.rejects(
      markArtifactForKnowledgeBase({
        artifactId: artifact.id,
        collectionId: "workspace-visual-disabled",
        reviewer: "Yuxi",
        knowledgeBaseConfig: {
          source: "workspace_config",
          configuredCollectionIds: ["workspace-visual-disabled"],
          knowledgeBases: {
            "workspace-visual-disabled": {
              id: "workspace-visual-disabled",
              title: { zh: "禁用视觉库", en: "Disabled visual KB" },
              state: "ready",
              embeddingRole: "knowledge-embedding",
              chunkStrategy: { zh: "默认切片", en: "Default chunking" },
              connectedAgents: [],
              sources: [],
              writeBack: {
                enabled: false,
                policy: { zh: "禁止回流", en: "Write-back disabled" },
                allowedArtifactTypes: ["image"],
              },
            },
          },
        },
      }),
      /Knowledge base write-back is disabled/,
    );
  } finally {
    process.chdir(previousCwd);
    await rm(workspace, { recursive: true, force: true });
  }
});
