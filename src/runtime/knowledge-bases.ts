import { readFile } from "node:fs/promises";
import path from "node:path";

export type KnowledgeBaseState = "ready" | "draft";

export interface LocalizedText {
  zh: string;
  en: string;
}

export interface KnowledgeBaseWriteBackConfig {
  enabled: boolean;
  policy: LocalizedText;
  allowedArtifactTypes: string[];
}

export interface KnowledgeBaseConfig {
  id: string;
  title: LocalizedText;
  state: KnowledgeBaseState;
  embeddingRole: string;
  chunkStrategy: LocalizedText;
  connectedAgents: string[];
  sources: string[];
  writeBack: KnowledgeBaseWriteBackConfig;
}

export interface WorkspaceKnowledgeBaseConfig {
  knowledgeBases: Record<string, KnowledgeBaseConfig>;
  configuredCollectionIds: string[];
  source: "builtin_default" | "workspace_config";
}

interface RawWorkspaceConfig {
  knowledge_bases?: unknown;
}

export const DEFAULT_KNOWLEDGE_BASES: Record<string, KnowledgeBaseConfig> = {
  "workspace-product": {
    id: "workspace-product",
    title: { zh: "产品与架构知识库", en: "Product and architecture KB" },
    state: "ready",
    embeddingRole: "knowledge-embedding",
    chunkStrategy: { zh: "按文档段落 + 标题切片", en: "Chunk by headings and document paragraphs" },
    connectedAgents: ["meta/create-agent", "docs-organizer/draft"],
    sources: ["docs/*.md", "README*.md"],
    writeBack: {
      enabled: true,
      policy: { zh: "允许将审核后的规格与总结回流", en: "Allow reviewed specs and summaries to flow back" },
      allowedArtifactTypes: ["markdown", "spec", "summary"],
    },
  },
  "workspace-visual": {
    id: "workspace-visual",
    title: { zh: "视觉参考知识库", en: "Visual reference KB" },
    state: "draft",
    embeddingRole: "knowledge-embedding",
    chunkStrategy: { zh: "图文混合，图像描述单独建索引", en: "Multimodal with separate image-description index" },
    connectedAgents: ["image-gen/prototype-v1"],
    sources: ["brand/**", "artifacts/ui-concepts/**"],
    writeBack: {
      enabled: true,
      policy: { zh: "允许将被采纳的设计稿加入集合", en: "Accepted design drafts can be added back" },
      allowedArtifactTypes: ["image", "image-description", "design-note"],
    },
  },
};

export async function readWorkspaceKnowledgeBaseConfig(
  configPath = "moyu.config.json",
): Promise<WorkspaceKnowledgeBaseConfig> {
  const builtin = cloneKnowledgeBases(DEFAULT_KNOWLEDGE_BASES);
  const resolvedConfigPath = path.resolve(configPath);
  let raw: string;

  try {
    raw = await readFile(resolvedConfigPath, "utf8");
  } catch {
    return {
      knowledgeBases: builtin,
      configuredCollectionIds: [],
      source: "builtin_default",
    };
  }

  const parsed = JSON.parse(raw) as RawWorkspaceConfig;
  const knowledgeBases = readKnowledgeBaseMap(parsed.knowledge_bases, builtin);

  return {
    knowledgeBases: {
      ...builtin,
      ...knowledgeBases,
    },
    configuredCollectionIds: Object.keys(knowledgeBases),
    source: "workspace_config",
  };
}

function readKnowledgeBaseMap(
  value: unknown,
  builtin: Record<string, KnowledgeBaseConfig>,
): Record<string, KnowledgeBaseConfig> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const knowledgeBases: Record<string, KnowledgeBaseConfig> = {};
  for (const [collectionId, rawCollection] of Object.entries(value as Record<string, unknown>)) {
    const collection = readKnowledgeBaseConfig(collectionId, rawCollection, builtin[collectionId]);
    if (collection) {
      knowledgeBases[collectionId] = collection;
    }
  }
  return knowledgeBases;
}

function readKnowledgeBaseConfig(
  id: string,
  value: unknown,
  base?: KnowledgeBaseConfig,
): KnowledgeBaseConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const fallback = base ?? createDraftKnowledgeBase(id);
  return {
    id,
    title: readLocalizedText(raw.title, fallback.title),
    state: readState(raw.state, fallback.state),
    embeddingRole: readString(raw.embedding_role) ?? fallback.embeddingRole,
    chunkStrategy: readLocalizedText(raw.chunk_strategy, fallback.chunkStrategy),
    connectedAgents: readStringArray(raw.connected_agents, fallback.connectedAgents),
    sources: readStringArray(raw.sources, fallback.sources),
    writeBack: readWriteBackConfig(raw.write_back, raw.allowed_artifact_types, fallback.writeBack),
  };
}

function readWriteBackConfig(
  value: unknown,
  topLevelAllowedArtifactTypes: unknown,
  fallback: KnowledgeBaseWriteBackConfig,
): KnowledgeBaseWriteBackConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    const policy = readLocalizedText(value, fallback.policy);
    return {
      enabled: fallback.enabled,
      policy,
      allowedArtifactTypes: readStringArray(topLevelAllowedArtifactTypes, fallback.allowedArtifactTypes),
    };
  }

  const raw = value as Record<string, unknown>;
  return {
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : fallback.enabled,
    policy: readLocalizedText(raw.policy, fallback.policy),
    allowedArtifactTypes: readStringArray(
      raw.allowed_artifact_types ?? topLevelAllowedArtifactTypes,
      fallback.allowedArtifactTypes,
    ),
  };
}

function createDraftKnowledgeBase(id: string): KnowledgeBaseConfig {
  return {
    id,
    title: { zh: id, en: id },
    state: "draft",
    embeddingRole: "knowledge-embedding",
    chunkStrategy: { zh: "按默认段落切片", en: "Default paragraph chunking" },
    connectedAgents: [],
    sources: [],
    writeBack: {
      enabled: false,
      policy: { zh: "默认不允许产物回流", en: "Artifact write-back is disabled by default" },
      allowedArtifactTypes: [],
    },
  };
}

function readLocalizedText(value: unknown, fallback: LocalizedText): LocalizedText {
  const direct = readString(value);
  if (direct) {
    return { zh: direct, en: direct };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...fallback };
  }

  const raw = value as Record<string, unknown>;
  return {
    zh: readString(raw.zh) ?? fallback.zh,
    en: readString(raw.en) ?? fallback.en,
  };
}

function readState(value: unknown, fallback: KnowledgeBaseState): KnowledgeBaseState {
  return value === "ready" || value === "draft" ? value : fallback;
}

function readStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }
  const items = value.map(readString).filter((item): item is string => Boolean(item));
  return items;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cloneKnowledgeBases(knowledgeBases: Record<string, KnowledgeBaseConfig>) {
  return Object.fromEntries(
    Object.entries(knowledgeBases).map(([collectionId, collection]) => [
      collectionId,
      {
        ...collection,
        title: { ...collection.title },
        chunkStrategy: { ...collection.chunkStrategy },
        connectedAgents: [...collection.connectedAgents],
        sources: [...collection.sources],
        writeBack: {
          ...collection.writeBack,
          policy: { ...collection.writeBack.policy },
          allowedArtifactTypes: [...collection.writeBack.allowedArtifactTypes],
        },
      },
    ]),
  ) as Record<string, KnowledgeBaseConfig>;
}
