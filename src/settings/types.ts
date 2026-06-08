export interface LocalizedText {
  zh: string;
  en: string;
}

export interface WorkbenchSettings {
  nav: WorkbenchSettingsNavItem[];
  overview: WorkbenchSettingsOverview;
  providers: WorkbenchProvider[];
  modelRoles: WorkbenchModelRole[];
  knowledgeBases: WorkbenchKnowledgeBase[];
  skills: WorkbenchCapability[];
  tools: WorkbenchCapability[];
  mcpServers: WorkbenchCapability[];
  runtimePolicies: WorkbenchRuntimePolicy[];
  agentDefaults: WorkbenchAgentDefault[];
  agentContexts: WorkbenchAgentRuntimeContext[];
}

export interface WorkbenchSettingsNavItem {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
}

export interface WorkbenchSettingsOverview {
  title: LocalizedText;
  description: LocalizedText;
  highlights: Array<{
    label: LocalizedText;
    value: LocalizedText;
    note: LocalizedText;
  }>;
}

export interface WorkbenchProvider {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "not_configured";
  endpoint: string;
  defaultFor: string[];
  models: string[];
  note: LocalizedText;
}

export interface WorkbenchModelRole {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  defaultMode: LocalizedText;
  defaultModel: string;
  fallback: LocalizedText;
  runtimeSignals: string[];
}

export interface WorkbenchKnowledgeBase {
  id: string;
  title: LocalizedText;
  state: "ready" | "draft";
  embeddingRole: string;
  chunkStrategy: LocalizedText;
  connectedAgents: string[];
  sources: string[];
  writeBackEnabled: boolean;
  writeBack: LocalizedText;
  allowedArtifactTypes: string[];
}

export interface WorkbenchCapability {
  id: string;
  title: LocalizedText;
  state: "enabled" | "review" | "planned";
  sourceType: "builtin" | "agent_local" | "controlled_generated" | "mcp_server" | "planned";
  scope: LocalizedText;
  source: LocalizedText;
  permissionBoundary: LocalizedText;
  approval: LocalizedText;
  defaultEnabledFor: string[];
  riskLevel: "low" | "medium" | "high";
  note: LocalizedText;
}

export interface WorkbenchRuntimePolicy {
  id: string;
  title: LocalizedText;
  value: LocalizedText;
  note: LocalizedText;
}

export interface WorkbenchAgentDefault {
  agentId: string;
  title: LocalizedText;
  modelRoles: string[];
  knowledgeBases: string[];
  skills: string[];
  tools: string[];
  mcpServers: string[];
  runtimeMode: LocalizedText;
}

export interface WorkbenchAgentRuntimeContext {
  agentId: string;
  title: LocalizedText;
  purpose: LocalizedText;
  assemblyMode: LocalizedText;
  modelRoles: string[];
  knowledgeBases: string[];
  skills: string[];
  tools: string[];
  mcpServers: string[];
  runtimeEvidence: string[];
  artifactPolicy: LocalizedText;
  note: LocalizedText;
}
