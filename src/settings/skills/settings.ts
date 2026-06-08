import type { WorkbenchCapability } from "../types.js";

export function getWorkbenchSkills(): WorkbenchCapability[] {
  return [
    {
      id: "image_gen_via_relay",
      title: { zh: "图片中转生成 Skill", en: "Relay image generation skill" },
      state: "enabled",
      scope: { zh: "image-gen/prototype-v1 默认启用", en: "Enabled by default for image-gen/prototype-v1" },
      source: { zh: "agents/*/skills", en: "agents/*/skills" },
      note: { zh: "负责生图协议适配与 artifact 落盘。", en: "Handles image protocol adaptation and artifact persistence." },
    },
    {
      id: "meta-agent-skill-review",
      title: { zh: "Skill 审核流程", en: "Skill review flow" },
      state: "review",
      scope: { zh: "Meta-Agent 现造 Skill 前置", en: "Precondition for generated skills" },
      source: { zh: "受控生成流程", en: "Controlled generation flow" },
      note: { zh: "静态检查、沙箱试跑、人工审核后才可启用。", en: "Enable only after static checks, sandbox dry-run, and human review." },
    },
  ];
}
