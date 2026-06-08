import type { WorkbenchCapability } from "../types.js";

export function getWorkbenchSkills(): WorkbenchCapability[] {
  return [
    {
      id: "image_gen_via_relay",
      title: { zh: "图片中转生成 Skill", en: "Relay image generation skill" },
      state: "enabled",
      sourceType: "agent_local",
      scope: { zh: "image-gen/prototype-v1 默认启用", en: "Enabled by default for image-gen/prototype-v1" },
      source: { zh: "agents/*/skills", en: "agents/*/skills" },
      permissionBoundary: {
        zh: "仅允许读取当前 Agent 输入、调用配置好的图片中转 Provider，并写入本次 Run 的 Artifact 目录。",
        en: "May read current agent input, call the configured image relay provider, and write only to this run's artifact directory.",
      },
      approval: {
        zh: "随 Agent Manifest 一起审核；启用范围由 Agent 装配声明决定。",
        en: "Reviewed with the Agent manifest; enablement is scoped by agent assembly declarations.",
      },
      defaultEnabledFor: ["image-gen/prototype-v1"],
      riskLevel: "medium",
      note: { zh: "负责生图协议适配与 artifact 落盘。", en: "Handles image protocol adaptation and artifact persistence." },
    },
    {
      id: "meta-agent-skill-review",
      title: { zh: "Skill 审核流程", en: "Skill review flow" },
      state: "review",
      sourceType: "controlled_generated",
      scope: { zh: "Meta-Agent 现造 Skill 前置", en: "Precondition for generated skills" },
      source: { zh: "受控生成流程", en: "Controlled generation flow" },
      permissionBoundary: {
        zh: "生成的 Skill 默认不可执行；必须先通过静态检查、沙箱试跑和人工审核。",
        en: "Generated skills are not executable by default; they must pass static checks, sandbox dry-run, and human review first.",
      },
      approval: {
        zh: "人工审核通过后才可从 review 状态切换到 enabled。",
        en: "Human approval is required before moving from review to enabled.",
      },
      defaultEnabledFor: ["meta/create-agent"],
      riskLevel: "high",
      note: { zh: "静态检查、沙箱试跑、人工审核后才可启用。", en: "Enable only after static checks, sandbox dry-run, and human review." },
    },
  ];
}
