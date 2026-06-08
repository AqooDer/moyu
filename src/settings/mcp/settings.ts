import type { WorkbenchCapability } from "../types.js";

export function getWorkbenchMcpServers(): WorkbenchCapability[] {
  return [
    {
      id: "filesystem-mcp",
      title: { zh: "Filesystem MCP", en: "Filesystem MCP" },
      state: "review",
      sourceType: "mcp_server",
      scope: { zh: "受限目录访问", en: "Restricted directory access" },
      source: { zh: "MCP server", en: "MCP server" },
      permissionBoundary: {
        zh: "只允许访问用户显式授权的 Workspace 路径，禁止默认暴露全盘文件系统。",
        en: "May access only explicitly authorized workspace paths; full filesystem exposure is blocked by default.",
      },
      approval: { zh: "启用前需要用户确认目录白名单。", en: "User must approve directory allowlists before enabling." },
      defaultEnabledFor: ["meta/create-agent"],
      riskLevel: "high",
      note: { zh: "用来替代直接暴露任意文件系统能力。", en: "Replaces arbitrary filesystem access with scoped access." },
    },
    {
      id: "web-search-mcp",
      title: { zh: "Web Search MCP", en: "Web Search MCP" },
      state: "planned",
      sourceType: "mcp_server",
      scope: { zh: "研究型 Agent 与运行时补证", en: "Research agents and runtime evidence gathering" },
      source: { zh: "MCP server", en: "MCP server" },
      permissionBoundary: {
        zh: "只允许可追踪的外部搜索调用，结果必须进入 Trace 或 Artifact 证据链。",
        en: "Allows only traceable external search calls; results must be captured in trace or artifact evidence.",
      },
      approval: { zh: "接入前需要声明网络域名范围和引用记录策略。", en: "Domain scope and citation policy must be declared before integration." },
      defaultEnabledFor: [],
      riskLevel: "medium",
      note: { zh: "适合可追踪外部搜索，不与主运行链路硬耦合。", en: "Fits traceable external search without hard-coupling the main runtime." },
    },
  ];
}
