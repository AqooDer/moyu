import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { readWorkspaceKnowledgeBaseConfig } from "./knowledge-bases.js";

test("workspace knowledge base config falls back to builtin defaults", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-knowledge-default-"));

  try {
    const config = await readWorkspaceKnowledgeBaseConfig(path.join(workspace, "moyu.config.json"));
    assert.equal(config.source, "builtin_default");
    assert.deepEqual(config.configuredCollectionIds, []);
    assert.equal(config.knowledgeBases["workspace-product"].embeddingRole, "knowledge-embedding");
    assert.deepEqual(config.knowledgeBases["workspace-product"].writeBack.allowedArtifactTypes, [
      "markdown",
      "spec",
      "summary",
    ]);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test("workspace knowledge base config overrides builtin collections and adds new collections", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "moyu-knowledge-config-"));

  try {
    const configPath = path.join(workspace, "moyu.config.json");
    await writeFile(
      configPath,
      JSON.stringify({
        knowledge_bases: {
          "workspace-product": {
            title: {
              zh: "团队产品知识库",
              en: "Team product KB",
            },
            chunk_strategy: "按标题和代码块切片",
            connected_agents: ["meta/create-agent", "research/draft"],
            write_back: {
              enabled: false,
              policy: {
                zh: "仅允许人工审核后回流",
                en: "Only reviewed outputs can flow back",
              },
              allowed_artifact_types: [],
            },
          },
          "workspace-research": {
            title: "研究资料知识库",
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
              policy: "允许研究摘要回流",
              allowed_artifact_types: ["summary", "citation-note"],
            },
          },
        },
      }),
      "utf8",
    );

    const config = await readWorkspaceKnowledgeBaseConfig(configPath);
    assert.equal(config.source, "workspace_config");
    assert.deepEqual(config.configuredCollectionIds, ["workspace-product", "workspace-research"]);

    const product = config.knowledgeBases["workspace-product"];
    assert.equal(product.title.zh, "团队产品知识库");
    assert.equal(product.title.en, "Team product KB");
    assert.equal(product.embeddingRole, "knowledge-embedding");
    assert.equal(product.chunkStrategy.zh, "按标题和代码块切片");
    assert.deepEqual(product.connectedAgents, ["meta/create-agent", "research/draft"]);
    assert.equal(product.writeBack.enabled, false);
    assert.deepEqual(product.writeBack.allowedArtifactTypes, []);

    const research = config.knowledgeBases["workspace-research"];
    assert.equal(research.state, "ready");
    assert.equal(research.title.zh, "研究资料知识库");
    assert.equal(research.title.en, "研究资料知识库");
    assert.equal(research.chunkStrategy.en, "Chunk by source and summary");
    assert.deepEqual(research.sources, ["research/**/*.md"]);
    assert.deepEqual(research.writeBack.allowedArtifactTypes, ["summary", "citation-note"]);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
