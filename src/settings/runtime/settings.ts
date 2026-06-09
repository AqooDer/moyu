import type {
  WorkbenchAgentDefault,
  WorkbenchAgentRuntimeContext,
  WorkbenchCapability,
  WorkbenchRuntimePolicy,
} from "../types.js";
import {
  listPluginCapabilities,
  listPluginRuntimePolicies,
  toWorkbenchCapability,
  toWorkbenchRuntimePolicy,
} from "../../plugins/registry.js";

export function getWorkbenchRuntimePolicies(): WorkbenchRuntimePolicy[] {
  return listPluginRuntimePolicies().map(toWorkbenchRuntimePolicy);
}

export function getWorkbenchPreviewers(): WorkbenchCapability[] {
  return listPluginCapabilities({ kind: "previewer" }).map(toWorkbenchCapability);
}

export function getWorkbenchMiddlewares(): WorkbenchCapability[] {
  return listPluginCapabilities({ kind: "middleware" }).map(toWorkbenchCapability);
}

export function getWorkbenchAgentDefaults(): WorkbenchAgentDefault[] {
  return [
    {
      agentId: "meta/create-agent",
      title: { zh: "元智能体", en: "Meta Agent" },
      modelRoles: ["conversation-primary", "planning-reasoning"],
      knowledgeBases: ["workspace-product"],
      skills: ["meta-agent-skill-review"],
      tools: ["artifact-write", "trace-open"],
      mcpServers: ["filesystem-mcp"],
      runtimeMode: { zh: "强制记录路由决定与生成来源", en: "Always capture routing decisions and generation sources" },
    },
    {
      agentId: "image-gen/prototype-v1",
      title: { zh: "生图原型 Agent", en: "Image Prototype Agent" },
      modelRoles: ["conversation-primary", "image-generation"],
      knowledgeBases: ["workspace-visual"],
      skills: ["image_gen_via_relay"],
      tools: ["artifact-write"],
      mcpServers: [],
      runtimeMode: { zh: "记录 prompt、尺寸、风格与反馈信号", en: "Capture prompt, size, style, and feedback signals" },
    },
  ];
}

export function getWorkbenchAgentContexts(): WorkbenchAgentRuntimeContext[] {
  return [
    {
      agentId: "meta/create-agent",
      title: { zh: "元智能体上下文", en: "Meta Agent context" },
      purpose: {
        zh: "把自然语言需求转为 Agent 草案、审核材料和安装动作。",
        en: "Turn natural-language requirements into agent drafts, review materials, and install actions.",
      },
      assemblyMode: {
        zh: "Workspace 默认 + 元智能体强推理覆盖 + 文件系统 MCP 待审核",
        en: "Workspace defaults + Meta Agent reasoning override + filesystem MCP in review",
      },
      modelRoles: ["conversation-primary", "planning-reasoning"],
      knowledgeBases: ["workspace-product"],
      skills: ["meta-agent-skill-review"],
      tools: ["artifact-write", "trace-open"],
      mcpServers: ["filesystem-mcp"],
      runtimeEvidence: ["model_role", "provider", "draft_source", "install_state", "artifact_ids"],
      artifactPolicy: {
        zh: "Agent 草案先作为 Artifact 存证，人工确认后才安装到 agents/。",
        en: "Agent drafts are stored as artifacts first, then installed into agents/ after human approval.",
      },
      note: {
        zh: "借鉴 Yuxi 的 Harness 装配思路，但保留 Moyu 的本地文件与审核闭环。",
        en: "Borrow the Harness assembly idea while keeping Moyu's local files and review loop.",
      },
    },
    {
      agentId: "image-gen/prototype-v1",
      title: { zh: "生图 Agent 上下文", en: "Image Agent context" },
      purpose: {
        zh: "根据提示词生成 UI 概念图，并保存图片、Trace 与提示词。",
        en: "Generate UI concept images from prompts and persist images, traces, and prompts.",
      },
      assemblyMode: {
        zh: "Agent 继承 Workspace 对话模型，覆盖生图模型与视觉知识库。",
        en: "Agent inherits the workspace conversation model and overrides image model plus visual KB.",
      },
      modelRoles: ["conversation-primary", "image-generation"],
      knowledgeBases: ["workspace-visual"],
      skills: ["image_gen_via_relay"],
      tools: ["artifact-write"],
      mcpServers: [],
      runtimeEvidence: ["prompt", "size", "style", "count", "image_model", "artifact_feedback"],
      artifactPolicy: {
        zh: "默认只写 Artifact；被采纳的设计稿可经审核回流视觉知识库。",
        en: "Write artifacts by default; accepted drafts may flow back to the visual KB after review.",
      },
      note: {
        zh: "先保持轻量原型，不引入知识图谱或异步 Worker。",
        en: "Keep the prototype lightweight first; no knowledge graph or async worker yet.",
      },
    },
  ];
}
