import type { WorkbenchCapability } from "../types.js";

export function getWorkbenchMcpServers(): WorkbenchCapability[] {
  return [
    {
      id: "filesystem-mcp",
      title: { zh: "Filesystem MCP", en: "Filesystem MCP" },
      state: "review",
      scope: { zh: "受限目录访问", en: "Restricted directory access" },
      source: { zh: "MCP server", en: "MCP server" },
      note: { zh: "用来替代直接暴露任意文件系统能力。", en: "Replaces arbitrary filesystem access with scoped access." },
    },
    {
      id: "web-search-mcp",
      title: { zh: "Web Search MCP", en: "Web Search MCP" },
      state: "planned",
      scope: { zh: "研究型 Agent 与运行时补证", en: "Research agents and runtime evidence gathering" },
      source: { zh: "MCP server", en: "MCP server" },
      note: { zh: "适合可追踪外部搜索，不与主运行链路硬耦合。", en: "Fits traceable external search without hard-coupling the main runtime." },
    },
  ];
}
