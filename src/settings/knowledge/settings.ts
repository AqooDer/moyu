import type { WorkbenchKnowledgeBase } from "../types.js";
import type { KnowledgeBaseConfig, WorkspaceKnowledgeBaseConfig } from "./knowledge-bases.js";

export function getWorkbenchKnowledgeBases(config: WorkspaceKnowledgeBaseConfig): WorkbenchKnowledgeBase[] {
  return Object.values(config.knowledgeBases).map(toWorkbenchKnowledgeBase);
}

function toWorkbenchKnowledgeBase(collection: KnowledgeBaseConfig): WorkbenchKnowledgeBase {
  return {
    id: collection.id,
    title: collection.title,
    state: collection.state,
    embeddingRole: collection.embeddingRole,
    chunkStrategy: collection.chunkStrategy,
    connectedAgents: collection.connectedAgents,
    sources: collection.sources,
    writeBackEnabled: collection.writeBack.enabled,
    writeBack: collection.writeBack.policy,
    allowedArtifactTypes: collection.writeBack.allowedArtifactTypes,
  };
}
