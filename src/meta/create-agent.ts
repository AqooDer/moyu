import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { stringify } from "yaml";
import { formatValidationResult, validateAgentFolder, type AgentValidationResult } from "../agent/validate.js";
import { readMetaAgentLlmConfig, type ChatCompletionConfig } from "../lib/env.js";
import { createChatCompletion } from "../lib/openai-compat-chat.js";
import { createArtifactDeliveryRecord } from "../runtime/artifact-delivery.js";
import { startInlineWorkerJob } from "../runtime/async-worker.js";
import { createMetaAgentExecutionMode } from "../runtime/execution-mode.js";
import { createMetaAgentMiddlewarePipeline } from "../runtime/middleware-pipeline.js";
import { createPolicyEvaluationRecord } from "../runtime/policy-gate.js";
import { createPlanRecord, formatPlanSummary } from "../runtime/plans.js";
import { finalizeFailedRun } from "../runtime/run-finalizer.js";
import { createRunSandboxFilesystem } from "../runtime/sandbox-filesystem.js";
import { runRuntimeStep } from "../runtime/step-runner.js";
import { RuntimeStore } from "../runtime/store.js";
import { createWorkIdFromRunId, recordRunConversation } from "../runtime/work-store.js";
import { writeAgentDraftRecord } from "./agent-draft.js";

export interface MetaCreateAgentOptions {
  prompt: string;
  agentId?: string;
  name?: string;
  description?: string;
  outDir?: string;
  rootDir?: string;
  persist?: boolean;
  force?: boolean;
}

export interface MetaCreateAgentResult {
  runId: string;
  agentId: string;
  agentPath: string;
  persisted: boolean;
  traceFile: string;
  files: string[];
  validation: AgentValidationResult;
  specSource: AgentSpecGeneration["source"];
}

interface AgentSpec {
  agentId: string;
  folderName: string;
  name: string;
  description: string;
  kind: "image" | "task";
  recipeRef: string;
  skillName: string;
  tags: string[];
  generation: AgentSpecGeneration;
}

interface AgentSpecGeneration {
  source: "llm" | "rule";
  llmConfigured: boolean;
  model: string | null;
  provider: string | null;
  durationMs: number | null;
  fallbackReason: string | null;
}

interface MetaAgentLlmDraft {
  agentId?: string;
  name?: string;
  description?: string;
  kind?: "image" | "task";
  tags?: string[];
}

export async function createAgentWithMeta(options: MetaCreateAgentOptions): Promise<MetaCreateAgentResult> {
  const spec = await deriveAgentSpec(options);
  const runId = createMetaRunId(spec);
  const workId = createWorkIdFromRunId(runId);
  const agentPath = resolveAgentPath(spec, runId, options);
  const runtime = RuntimeStore.createRun({
    id: runId,
    workId,
    agentId: "meta/create-agent",
    agentVersion: "0.1.0",
    recipeId: "recipes/meta/create-agent",
    dryRun: !options.persist,
    input: {
      prompt: options.prompt,
      target_agent_id: spec.agentId,
      persist: Boolean(options.persist),
      spec_source: spec.generation.source,
      llm_model: spec.generation.model,
    },
  });
  startInlineWorkerJob({
    runtime,
    queue: "meta.create-agent.inline",
    requestedBy: "meta/create-agent",
  });

  runtime.setPlan(
    createPlanRecord({
      runId,
      workId,
      title: "Meta-Agent 创建 Agent 计划",
      createdAt: runtime.snapshot.run.startedAt,
      steps: [
        {
          id: "intake",
          title: "接收需求",
          kind: "llm",
          summary: "整理用户目标、目标 Agent ID 和创建模式。",
        },
        {
          id: "spec-draft",
          title: "草拟 Agent 规格",
          kind: "llm",
          summary: "生成 manifest、UI、Skill 和基础目录结构的规格。",
          dependsOn: ["intake"],
        },
        {
          id: "persist",
          title: "写入 Agent 草案",
          kind: "tool",
          summary: "把可审核的 Agent 文件写入草案目录或正式目录。",
          dependsOn: ["spec-draft"],
        },
        {
          id: "validate",
          title: "校验 Agent 契约",
          kind: "tool",
          summary: "运行 Agent 文件夹校验并写入验证记录。",
          dependsOn: ["persist"],
        },
        {
          id: "register-artifacts",
          title: "登记草案产物",
          kind: "tool",
          summary: "把生成文件、验证记录和草案索引登记为 Artifact。",
          dependsOn: ["validate"],
        },
      ],
    }),
  );
  runtime.setSandboxFilesystem(
    await createRunSandboxFilesystem({
      run: runtime.snapshot.run,
      outputsDir: path.dirname(agentPath),
      createdAt: runtime.snapshot.run.startedAt,
    }),
  );
  const middleware = runtime.setMiddlewarePipeline(
    createMetaAgentMiddlewarePipeline({
      runId,
      workId,
      prompt: options.prompt,
      targetAgentId: spec.agentId,
      persist: Boolean(options.persist),
      createdAt: runtime.snapshot.run.startedAt,
    }),
  );
  runtime.setPolicyEvaluation(
    createPolicyEvaluationRecord({
      run: runtime.snapshot.run,
      middleware,
      title: "Meta-Agent 创建策略评估",
      createdAt: runtime.snapshot.run.startedAt,
    }),
  );
  runtime.setExecutionMode(
    createMetaAgentExecutionMode({
      run: runtime.snapshot.run,
      persist: Boolean(options.persist),
      createdAt: runtime.snapshot.run.startedAt,
    }),
  );
  runtime.setRunState("running");
  try {
    await runRuntimeStep({
      runtime,
      id: "intake",
      name: "INTAKE",
      kind: "llm",
      execute: () => ({
        outputSummary: {
          prompt_chars: options.prompt.length,
          target_agent_id: spec.agentId,
          llm_configured: spec.generation.llmConfigured,
        },
      }),
    });
    await runRuntimeStep({
      runtime,
      id: "spec-draft",
      name: "SPEC_DRAFT",
      kind: "llm",
      execute: () => ({
        outputSummary: {
          source: spec.generation.source,
          model: spec.generation.model,
          provider: spec.generation.provider,
          fallback_reason: spec.generation.fallbackReason,
          manifest: "manifest.yaml",
          ui: "ui.yaml",
          skill: spec.skillName,
        },
      }),
    });
    if (spec.generation.fallbackReason) {
      runtime.addNote(`Meta-Agent LLM draft fell back to local rules: ${spec.generation.fallbackReason}`);
    }

    const files = await runRuntimeStep<string[]>({
      runtime,
      id: "persist",
      name: "PERSIST",
      kind: "tool",
      inputSummary: {
        agent_path: agentPath,
        persisted: Boolean(options.persist),
      },
      execute: async () => {
        await assertWritableTarget(agentPath, Boolean(options.force));
        const scaffoldFiles = await writeAgentScaffold(agentPath, spec, options.prompt);
        return {
          outputSummary: { files: scaffoldFiles.length },
          value: scaffoldFiles,
        };
      },
    }).then((result) => result.value ?? []);

    const validationStep = await runRuntimeStep<{
      validation: AgentValidationResult;
      verificationFile: string;
    }>({
      runtime,
      id: "validate",
      name: "VALIDATE",
      kind: "tool",
      inputSummary: { agent_path: agentPath },
      execute: async () => {
        const validation = await validateAgentFolder(agentPath);
        const verificationFile = path.join(agentPath, "verification.trace.json");
        await writeFile(
          verificationFile,
          JSON.stringify(
            {
              schemaVersion: 1,
              runId,
              agentId: spec.agentId,
              state: validation.ok ? "validated" : "failed",
              validation,
              checkedAt: new Date().toISOString(),
            },
            null,
            2,
          ),
          "utf8",
        );
        return {
          state: validation.ok ? "succeeded" : "failed",
          outputSummary: {
            errors: validation.errors.length,
            warnings: validation.warnings.length,
          },
          error: validation.ok
            ? null
            : {
                code: "agent_validation_failed",
                message: `${validation.errors.length} validation error(s).`,
              },
          value: { validation, verificationFile },
        };
      },
    });
    const validation = validationStep.value?.validation ?? failedValidation("Agent validation did not return a result.");
    const verificationFile = path.join(agentPath, "verification.trace.json");
    files.push(validationStep.value?.verificationFile ?? verificationFile);

    const draftRecordFile = path.join(path.dirname(agentPath), "agent-draft.json");
    const draftCreatedAt = new Date().toISOString();
    await writeAgentDraftRecord(draftRecordFile, {
      schemaVersion: 1,
      revision: 1,
      runId,
      agentId: spec.agentId,
      draftPath: agentPath,
      targetPath: path.resolve(options.rootDir || "agents", spec.folderName),
      state: validation.ok ? "drafted" : "validation_failed",
      validation,
      createdAt: draftCreatedAt,
      updatedAt: draftCreatedAt,
      installedAt: null,
    });
    files.push(draftRecordFile);

    await runRuntimeStep({
      runtime,
      id: "register-artifacts",
      name: "REGISTER_ARTIFACTS",
      kind: "tool",
      inputSummary: { files: files.length },
      execute: async () => {
        for (const file of files) {
          await runtime.addArtifact({
            producerStepId: "persist",
            type: path.extname(file).slice(1) || "text",
            role: file.endsWith("verification.trace.json") ? "log" : "primary",
            filePath: file,
          });
        }
        return { outputSummary: { artifacts: runtime.snapshot.artifacts.length } };
      },
    });

    runtime.addNote(
      options.persist
        ? "Meta-Agent scaffold persisted into the local Agents root."
        : "Meta-Agent scaffold generated as a reviewable draft; pass --persist to install it.",
    );
    runtime.setRunState(validation.ok ? "succeeded" : "failed", validation.ok ? null : "agent validation failed");
    runtime.setArtifactDelivery(
      createArtifactDeliveryRecord({
        run: runtime.snapshot.run,
        artifacts: runtime.snapshot.artifacts,
        title: "Meta-Agent 草案交付清单",
        state: validation.ok ? "ready" : "partial",
        createdAt: runtime.snapshot.run.endedAt ?? runtime.snapshot.run.startedAt,
      }),
    );
    const traceFile = await runtime.writeTrace();
    await recordRunConversation({
      runId,
      workId,
      agentId: "meta/create-agent",
      title: options.prompt,
      state: validation.ok ? "waiting_user" : "completed",
      prompt: options.prompt,
      planSummary: formatPlanSummary(runtime.snapshot.plan),
      summary: validation.ok
        ? `已生成 Agent 草案 ${spec.agentId}，请审核产物后安装。`
        : `Agent 草案 ${spec.agentId} 校验失败，请查看验证结果。`,
      artifactIds: runtime.snapshot.artifacts.map((artifact) => artifact.id),
      startedAt: runtime.snapshot.run.startedAt,
      updatedAt: runtime.snapshot.run.endedAt,
    });

    return {
      runId,
      agentId: spec.agentId,
      agentPath,
      persisted: Boolean(options.persist),
      traceFile,
      files,
      validation,
      specSource: spec.generation.source,
    };
  } catch (error) {
    try {
      await finalizeFailedRun({
        runtime,
        workId,
        agentId: "meta/create-agent",
        title: options.prompt,
        prompt: options.prompt,
        error,
        summary: `Meta-Agent 创建 Agent ${spec.agentId} 失败。`,
      });
    } catch {
      // Keep CLI/API semantics anchored to the original execution failure.
    }
    throw error;
  }
}

export function formatMetaCreateAgentResult(result: MetaCreateAgentResult) {
  const lines = [
    `run_id: ${result.runId}`,
    `agent_id: ${result.agentId}`,
    `agent_dir: ${path.relative(process.cwd(), result.agentPath)}`,
    `persisted: ${result.persisted ? "yes" : "no"}`,
    `spec_source: ${result.specSource}`,
    `trace: ${path.relative(process.cwd(), result.traceFile)}`,
    `validation: ${result.validation.ok ? "ok" : "failed"}`,
    "",
    "files:",
    ...result.files.map((file) => `  - ${path.relative(result.agentPath, file)}`),
  ];

  if (!result.validation.ok || result.validation.warnings.length > 0) {
    lines.push("", formatValidationResult(result.validation));
  }

  return lines.join("\n");
}

async function deriveAgentSpec(options: MetaCreateAgentOptions): Promise<AgentSpec> {
  const prompt = options.prompt.trim();
  const llmDraft = await tryDraftAgentSpecWithLlm(options);
  const name = options.name?.trim() || llmDraft.draft?.name || inferName(prompt);
  const isImageAgent = llmDraft.draft?.kind === "image" || /image|图片|生图|gpt-image|视觉|ui/i.test(prompt);
  const baseSlug = isImageAgent ? "image-prototype" : slugify(name || prompt);
  const llmAgentId = options.agentId ? null : tryNormalizeAgentId(llmDraft.draft?.agentId);
  const requestedAgentId = normalizeAgentId(options.agentId || llmAgentId || `custom/${baseSlug}-v1`);
  const agentId = options.agentId
    ? requestedAgentId
    : await chooseAvailableAgentId(requestedAgentId, options.rootDir || "agents");
  const skillName = isImageAgent ? "image_gen_via_relay" : "run_task";
  const defaultTags = isImageAgent ? ["image-generation", "prototype", "meta-agent-generated"] : ["meta-agent-generated"];
  const tags = normalizeTags(llmDraft.draft?.tags ?? defaultTags, defaultTags);

  return {
    agentId,
    folderName: agentIdToFolderName(agentId),
    name,
    description: options.description?.trim() || llmDraft.draft?.description || inferDescription(prompt),
    kind: isImageAgent ? "image" : "task",
    recipeRef: isImageAgent ? "image-gen/prototype-v1" : "custom/generated-agent-v1",
    skillName,
    tags,
    generation: llmDraft.generation,
  };
}

async function tryDraftAgentSpecWithLlm(options: MetaCreateAgentOptions): Promise<{
  draft: MetaAgentLlmDraft | null;
  generation: AgentSpecGeneration;
}> {
  const config = readMetaAgentLlmConfig();
  if (!config) {
    return {
      draft: null,
      generation: {
        source: "rule",
        llmConfigured: false,
        model: null,
        provider: null,
        durationMs: null,
        fallbackReason: "missing_llm_provider_config",
      },
    };
  }

  try {
    const result = await requestMetaAgentDraft(options, config);
    return {
      draft: result.draft,
      generation: {
        source: "llm",
        llmConfigured: true,
        model: result.model,
        provider: result.provider,
        durationMs: result.durationMs,
        fallbackReason: null,
      },
    };
  } catch (error) {
    return {
      draft: null,
      generation: {
        source: "rule",
        llmConfigured: true,
        model: config.model,
        provider: config.baseUrl,
        durationMs: null,
        fallbackReason: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

async function requestMetaAgentDraft(
  options: MetaCreateAgentOptions,
  config: ChatCompletionConfig,
): Promise<{
  draft: MetaAgentLlmDraft;
  model: string;
  provider: string;
  durationMs: number;
}> {
  const response = await createChatCompletion(config, {
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: [
          "You are Moyu Meta-Agent. Draft a small, reviewable local Agent specification.",
          "Return JSON only. Do not include markdown.",
          "Use stable, lowercase IDs and keep the result conservative.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          `Requirement: ${options.prompt.trim()}`,
          "",
          "Return this JSON object:",
          "{",
          '  "agent_id": "domain/name-v1",',
          '  "name": "short display name",',
          '  "description": "one sentence description",',
          '  "kind": "image" | "task",',
          '  "tags": ["short-tag"]',
          "}",
          "",
          "Rules:",
          "- If the requirement involves image generation, UI visuals, product visuals, or gpt-image, use kind=image.",
          "- Otherwise use kind=task.",
          "- agent_id must match lowercase letters, numbers, dash, and slash only.",
          "- Keep tags short and implementation-neutral.",
        ].join("\n"),
      },
    ],
  });

  return {
    draft: normalizeMetaAgentLlmDraft(parseJsonObject(response.content)),
    model: response.model,
    provider: response.provider,
    durationMs: response.durationMs,
  };
}

function parseJsonObject(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(content.slice(start, end + 1));
    }
    throw new Error("LLM draft was not valid JSON");
  }
}

function normalizeMetaAgentLlmDraft(raw: unknown): MetaAgentLlmDraft {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("LLM draft JSON must be an object");
  }

  const value = raw as Record<string, unknown>;
  const kind = readString(value.kind);
  return {
    agentId: readString(value.agent_id) ?? readString(value.agentId),
    name: readString(value.name),
    description: readString(value.description),
    kind: kind === "image" ? "image" : "task",
    tags: Array.isArray(value.tags)
      ? value.tags.map((tag) => readString(tag)).filter((tag): tag is string => Boolean(tag))
      : undefined,
  };
}

async function chooseAvailableAgentId(baseAgentId: string, rootDir: string) {
  for (let index = 1; index <= 50; index += 1) {
    const candidate =
      index === 1 ? baseAgentId : baseAgentId.replace(/-v\d+$/, "") + `-v${index}`;
    const folder = path.resolve(rootDir, agentIdToFolderName(candidate));
    if (!(await exists(folder))) {
      return candidate;
    }
  }
  throw new Error(`Unable to find an available Agent id for base id: ${baseAgentId}`);
}

function resolveAgentPath(spec: AgentSpec, runId: string, options: MetaCreateAgentOptions) {
  if (options.persist) {
    return path.resolve(options.rootDir || "agents", spec.folderName);
  }
  return path.resolve(options.outDir || path.join("artifacts", "meta-agent-runs", runId), spec.folderName);
}

async function assertWritableTarget(agentPath: string, force: boolean) {
  try {
    await access(agentPath);
    if (!force) {
      throw new Error(`Target Agent folder already exists: ${agentPath}. Pass --force to overwrite draft files.`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Target Agent folder already exists")) {
      throw error;
    }
  }
}

async function exists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeAgentScaffold(agentPath: string, spec: AgentSpec, prompt: string) {
  const now = new Date().toISOString();
  const files: string[] = [];
  await mkdir(path.join(agentPath, "history"), { recursive: true });
  await mkdir(path.join(agentPath, "prompts"), { recursive: true });
  await mkdir(path.join(agentPath, "skills", spec.skillName), { recursive: true });

  await writeTrackedFile(files, path.join(agentPath, "manifest.yaml"), buildManifest(spec, now));
  await writeTrackedFile(files, path.join(agentPath, "ui.yaml"), buildUiSchema(spec));
  await writeTrackedFile(files, path.join(agentPath, "README.md"), buildReadme(spec, prompt, now));
  await writeTrackedFile(files, path.join(agentPath, ".agentignore"), "node_modules/\n.DS_Store\n*.log\n*.tsbuildinfo\n");
  await writeTrackedFile(files, path.join(agentPath, "prompts", "system.md"), buildSystemPrompt(spec, prompt));
  await writeTrackedFile(files, path.join(agentPath, "agent.recipe.ts"), buildRecipeExample(spec));
  await writeTrackedFile(files, path.join(agentPath, "skills", spec.skillName, "skill.yaml"), buildSkillYaml(spec, now));
  await writeTrackedFile(files, path.join(agentPath, "skills", spec.skillName, "index.ts"), buildSkillEntry(spec));

  const historyPrefix = now.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  await writeTrackedFile(
    files,
    path.join(agentPath, "history", `${historyPrefix}-initial-create.meta.json`),
    JSON.stringify(
      {
        author: "meta-agent",
        reason: "initial-create",
        session_id: `meta-${historyPrefix}`,
        parent: null,
        agent_id: spec.agentId,
      },
      null,
      2,
    ),
  );
  await writeTrackedFile(
    files,
    path.join(agentPath, "history", `${historyPrefix}-initial-create.patch`),
    [
      "# Initial scaffold generated by Moyu Meta-Agent.",
      "# A full unified diff will be produced after git-backed history lands.",
      `agent_id: ${spec.agentId}`,
      "",
    ].join("\n"),
  );

  return files;
}

async function writeTrackedFile(files: string[], filePath: string, content: string) {
  await writeFile(filePath, content, "utf8");
  files.push(filePath);
}

function buildManifest(spec: AgentSpec, now: string) {
  const modelRoleId = spec.kind === "image" ? "image-generation" : "conversation-primary";
  const defaultModel = spec.kind === "image" ? "gpt-image-2" : "gpt-4.1-mini";
  return stringify({
    schema_version: "1",
    agent_id: spec.agentId,
    name: spec.name,
    description: spec.description,
    version: "0.1.0",
    recipe_ref: spec.recipeRef,
    ui_ref: "./ui.yaml",
    tags: spec.tags,
    inputs_schema: {
      type: "object",
      required: ["prompt"],
      properties: {
        prompt: { type: "string", minLength: 1, maxLength: 2000 },
        count: { type: "integer", minimum: 1, maximum: 12, default: 3 },
        raw_prompt: { type: "boolean", default: false },
      },
    },
    outputs_schema: {
      type: "object",
      required: ["artifacts", "metadata"],
      properties: {
        artifacts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              artifact_ref: { type: "string" },
              role: { type: "string" },
              mime: { type: "string" },
            },
          },
        },
        metadata: {
          type: "object",
          properties: {
            trace_ref: { type: "string" },
            prompt_used: { type: "string" },
          },
        },
      },
    },
    routing: {
      model_tiers: ["medium", modelRoleId],
      default_model: defaultModel,
      model_roles: {
        [modelRoleId]: {
          provider: "openai-compat",
          model: defaultModel,
        },
      },
    },
    mcp_servers: [],
    permissions: {
      "host.network.fetch": ["${agent.config.provider.base_url}"],
      "host.artifact.write": { scope: "run" },
    },
    workflow: {
      kind: "sequence",
      steps: [
        {
          id: spec.skillName,
          skill: `./skills/${spec.skillName}`,
        },
      ],
    },
    created_by: "meta-agent",
    created_at: now,
    updated_at: now,
  });
}

function buildUiSchema(spec: AgentSpec) {
  return stringify({
    schema_version: 1,
    intake: {
      layout: {
        kind: "form",
        title: `运行 ${spec.name}`,
        fields: [
          { bind: "input.prompt", control: "PromptEditor", label: "提示词", required: true, rows: 4 },
          { bind: "input.count", control: "Slider", label: "数量", min: 1, max: 12, default: 3 },
          { bind: "input.raw_prompt", control: "Switch", label: "使用原始提示词", default: false },
        ],
      },
      submit: { label: "运行", estimate: true },
    },
    output: {
      layout: {
        kind: "tabs",
        items: [
          { label: "产物", content: { control: "ArtifactList", bind: "output.artifacts" } },
          { label: "元数据", content: { control: "KeyValueTable", bind: "output.metadata" } },
        ],
      },
    },
  });
}

function buildReadme(spec: AgentSpec, prompt: string, now: string) {
  return [
    `# ${spec.name}`,
    "",
    `> ${spec.description}`,
    "",
    "## 用途",
    "",
    "这个 Agent 由 Moyu 元智能体根据用户需求生成。当前版本是可审核的最小文件夹骨架，包含 Manifest、UI Schema、Skill 壳、Recipe 示例与验证记录。",
    "",
    "## 原始需求",
    "",
    prompt,
    "",
    "## 输入",
    "",
    "- `prompt`: 用户任务或生成描述",
    "- `count`: 需要生成或处理的候选数量",
    "- `raw_prompt`: 是否跳过 Moyu 的提示词增强",
    "",
    "## 产出",
    "",
    "- `artifacts`: 当前 Run 生成的产物列表",
    "- `metadata`: Trace、提示词和运行信息",
    "",
    "## 由 Meta-Agent 生成",
    "",
    `- Recipe: ${spec.recipeRef}`,
    `- 创建时间: ${now}`,
    `- 最近修改: ${now}`,
    "",
  ].join("\n");
}

function buildSystemPrompt(spec: AgentSpec, prompt: string) {
  return [
    `# ${spec.name} System Prompt`,
    "",
    "You are a Moyu Agent generated by the Meta-Agent.",
    "Follow the manifest contract exactly and keep all outputs traceable.",
    "",
    "Original user requirement:",
    prompt,
    "",
  ].join("\n");
}

function buildRecipeExample(spec: AgentSpec) {
  return [
    `// Example orchestration for ${spec.agentId}.`,
    "export default {",
    `  agentId: ${JSON.stringify(spec.agentId)},`,
    `  recipeRef: ${JSON.stringify(spec.recipeRef)},`,
    "  steps: [",
    `    { id: ${JSON.stringify(spec.skillName)}, kind: \"skill\" },`,
    "  ],",
    "};",
    "",
  ].join("\n");
}

function buildSkillYaml(spec: AgentSpec, now: string) {
  return stringify({
    name: spec.skillName,
    kind: "code",
    inputs: {
      type: "object",
      required: ["prompt"],
      properties: {
        prompt: { type: "string" },
        count: { type: "integer", default: 3 },
        raw_prompt: { type: "boolean", default: false },
      },
    },
    outputs: {
      type: "object",
      properties: {
        artifacts: { type: "array" },
        metadata: { type: "object" },
      },
    },
    permissions: {
      "host.artifact.write": { scope: "run" },
    },
    sandbox: "L1",
    generated_by: "meta-agent",
    generated_at: now,
    reviewed_by: "pending",
    review_decision: "pending",
  });
}

function buildSkillEntry(spec: AgentSpec) {
  return [
    "interface SkillInput {",
    "  prompt: string;",
    "  count?: number;",
    "  raw_prompt?: boolean;",
    "}",
    "",
    "export default async function run(input: SkillInput) {",
    "  const count = input.count ?? 3;",
    "  return {",
    "    ok: true,",
    "    output: {",
    "      artifacts: [],",
    "      metadata: {",
    `        agent_id: ${JSON.stringify(spec.agentId)},`,
    "        prompt_used: input.prompt,",
    "        count,",
    "        dry_run: true,",
    "      },",
    "    },",
    "  };",
    "}",
    "",
  ].join("\n");
}

function failedValidation(message: string): AgentValidationResult {
  return {
    ok: false,
    agentPath: "",
    errors: [message],
    warnings: [],
  };
}

function createMetaRunId(spec: AgentSpec) {
  const slug = spec.folderName.replace(/[^a-z0-9_-]/gi, "-");
  return `meta-create-${slug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeAgentId(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9/-]+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/-+/g, "-")
    .replace(/(^[-/]+|[-/]+$)/g, "");

  if (!normalized || !/^[a-z0-9][a-z0-9/-]{1,62}[a-z0-9]$/.test(normalized)) {
    throw new Error(`Invalid agent id: ${value}`);
  }
  return normalized;
}

function tryNormalizeAgentId(value: string | undefined) {
  if (!value) {
    return null;
  }
  try {
    return normalizeAgentId(value);
  } catch {
    return null;
  }
}

function agentIdToFolderName(agentId: string) {
  return agentId.replace(/\//g, "__");
}

function inferName(prompt: string) {
  if (/image|图片|生图|gpt-image|视觉|ui/i.test(prompt)) {
    return "生图原型 Agent";
  }
  return "自定义 Agent";
}

function inferDescription(prompt: string) {
  const compact = prompt.replace(/\s+/g, " ").trim();
  if (compact.length <= 120) {
    return compact;
  }
  return `${compact.slice(0, 117)}...`;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return slug || "generated-agent";
}

function normalizeTags(tags: string[], fallback: string[]) {
  const normalized = tags
    .map((tag) =>
      tag
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, ""),
    )
    .filter(Boolean);
  const unique = [...new Set([...normalized, "meta-agent-generated"])];
  return unique.length > 0 ? unique.slice(0, 8) : fallback;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
