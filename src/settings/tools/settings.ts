import type { WorkbenchCapability } from "../types.js";

export function getWorkbenchTools(): WorkbenchCapability[] {
  return [
    {
      id: "artifact-write",
      title: { zh: "产物写入工具", en: "Artifact write tool" },
      state: "enabled",
      scope: { zh: "所有运行时默认可用", en: "Available to all runtime sessions" },
      source: { zh: "builtin runtime", en: "builtin runtime" },
      note: { zh: "统一落盘并带 Trace 元数据。", en: "Persists files with Trace metadata." },
    },
    {
      id: "trace-open",
      title: { zh: "Trace 打开工具", en: "Trace open tool" },
      state: "enabled",
      scope: { zh: "Workbench 检查器", en: "Workbench inspector" },
      source: { zh: "builtin ui/runtime", en: "builtin ui/runtime" },
      note: { zh: "把运行证据暴露给用户，而不是静默隐藏。", en: "Expose runtime evidence instead of hiding it." },
    },
    {
      id: "knowledge-ingest",
      title: { zh: "知识入库工具", en: "Knowledge ingest tool" },
      state: "planned",
      scope: { zh: "审核通过的 Agent 产物", en: "Reviewed agent artifacts" },
      source: { zh: "planned collection pipeline", en: "planned collection pipeline" },
      note: { zh: "把文档、摘要、图像描述写回知识库。", en: "Write documents, summaries, and image descriptions back to KBs." },
    },
  ];
}
