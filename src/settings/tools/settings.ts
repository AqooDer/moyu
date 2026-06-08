import type { WorkbenchCapability } from "../types.js";

export function getWorkbenchTools(): WorkbenchCapability[] {
  return [
    {
      id: "artifact-write",
      title: { zh: "产物写入工具", en: "Artifact write tool" },
      state: "enabled",
      sourceType: "builtin",
      scope: { zh: "所有运行时默认可用", en: "Available to all runtime sessions" },
      source: { zh: "builtin runtime", en: "builtin runtime" },
      permissionBoundary: {
        zh: "只能写入 Runtime 分配的 Artifact 路径，并记录 Trace 元数据。",
        en: "Can write only to runtime-assigned artifact paths and must record trace metadata.",
      },
      approval: { zh: "内置工具默认启用，无需逐项审核。", en: "Builtin tool enabled by default; no per-run approval required." },
      defaultEnabledFor: ["meta/create-agent", "image-gen/prototype-v1"],
      riskLevel: "low",
      note: { zh: "统一落盘并带 Trace 元数据。", en: "Persists files with Trace metadata." },
    },
    {
      id: "trace-open",
      title: { zh: "Trace 打开工具", en: "Trace open tool" },
      state: "enabled",
      sourceType: "builtin",
      scope: { zh: "Workbench 检查器", en: "Workbench inspector" },
      source: { zh: "builtin ui/runtime", en: "builtin ui/runtime" },
      permissionBoundary: {
        zh: "只打开当前 Workspace 内已登记的 Trace 文件，不接受任意路径。",
        en: "Can open only registered trace files inside the current workspace; arbitrary paths are not accepted.",
      },
      approval: { zh: "内置只读检查工具默认启用。", en: "Builtin read-only inspection tool enabled by default." },
      defaultEnabledFor: ["meta/create-agent"],
      riskLevel: "low",
      note: { zh: "把运行证据暴露给用户，而不是静默隐藏。", en: "Expose runtime evidence instead of hiding it." },
    },
    {
      id: "knowledge-ingest",
      title: { zh: "知识入库工具", en: "Knowledge ingest tool" },
      state: "planned",
      sourceType: "planned",
      scope: { zh: "审核通过的 Agent 产物", en: "Reviewed agent artifacts" },
      source: { zh: "planned collection pipeline", en: "planned collection pipeline" },
      permissionBoundary: {
        zh: "只能处理已审核的 Artifact，并受知识库集合 allowedArtifactTypes 约束。",
        en: "Can process only reviewed artifacts and must obey each collection's allowedArtifactTypes policy.",
      },
      approval: { zh: "每次入库都需要审核人、审核说明和目标集合记录。", en: "Each ingestion requires reviewer, review note, and target collection records." },
      defaultEnabledFor: [],
      riskLevel: "medium",
      note: { zh: "把文档、摘要、图像描述写回知识库。", en: "Write documents, summaries, and image descriptions back to KBs." },
    },
  ];
}
