const messages = {
  zh: {
    currentWork: "创建生图原型 Agent",
    localWorkspace: "本地工作区 / moyu",
    engineRunning: "本地引擎运行中",
    engineStatic: "静态预览",
    engineDisconnected: "本地服务未连接",
    staticPreview: "静态预览模式",
    openLocalWorkbench: "打开本地服务",
    moyuStudio: "Moyu Studio",
    codeDriven: "代码驱动的智能体创建与运行平台",
    works: "任务",
    agents: "Agents",
    searchWorks: "搜索任务...",
    searchAgents: "搜索 Agent...",
    loadingWorks: "正在加载任务...",
    loadingAgents: "正在加载 Agents...",
    noWorks: "暂无任务记录",
    noAgents: "暂无可用 Agents",
    workFallbackDesc: "通过对话创建或运行 Agent 后会出现在这里",
    pptWork: "创建生图原型 Agent",
    pptWorkDesc: "Agent 产物 · 等待创建确认",
    visualWork: "制作平台介绍 PPT",
    visualWorkDesc: "调用多个 Agent · 规划中",
    researchWork: "竞品资料整理",
    researchWorkDesc: "研究 Agent · 进行中",
    newWork: "新建 Agent / 任务",
    agentMeta: "元智能体",
    agentMetaDesc: "通过对话创建、改造和验证 Agent",
    agentImage: "生图原型 Agent",
    agentImageDesc: "生成图片、界面概念与品牌视觉",
    agentDoc: "文档整理 Agent",
    agentDocDesc: "整理需求、Trace 与产物说明",
    agentCode: "代码执行 Agent",
    agentCodeDesc: "运行命令、生成代码并验证结果",
    settings: "设置",
    runtimeReady: "Moyu Core 0.3.1 已连接",
    workSession: "Agent 创建会话",
    recipeLoaded: "Recipe 已加载",
    progressContent: "需求澄清",
    progressVisual: "能力契约",
    progressOutline: "文件骨架",
    progressDeck: "验证发布",
    you: "你",
    userAsk: "帮我创建一个生图原型 Agent。它要能调用 gpt-image-2 中转接口，支持生成 3 张 UI 概念图，并把图片、Trace 和提示词都保存下来。",
    agentPlanIntro:
      "我会先把你的自然语言需求转成 Agent 契约，再生成代码文件、Recipe 和验证用例。这里的产物不是一次任务结果，而是一个可运行、可热加载的 Agent。",
    planMd: "澄清目标、输入和输出",
    planImage: "生成 Agent 能力契约",
    planOutline: "创建 Agent 文件骨架",
    planDeck: "运行验证并注册 Agent",
    orchestrationTitle: "元智能体正在规划",
    orchestrationDesc:
      "元智能体不会让你拖节点画布，而是通过对话生成 Agent 规格、代码和验证任务。生成后的 Agent 再由 Moyu Runtime 加载并参与后续任务编排。",
    recipeFile: "Recipe",
    callPolicy: "创建策略",
    callPolicyValue: "先生成契约，确认后写入 Agent 文件",
    imageAgent: "元智能体",
    imageAgentResult: "我已经整理出生图原型 Agent 的能力契约草案：输入是提示词与数量，输出是图片文件、Trace 和可复用提示词记录。",
    nextDelivery: "Agent 创建队列",
    nextDeliveryDesc: "确认后由元智能体继续生成 Agent 文件、Recipe、测试夹具，并把新 Agent 注册到本地运行时。",
    deliveryCover: "agent.yaml 能力契约",
    deliverySections: "handler.ts 执行入口",
    deliveryOutline: "recipe.ts 示例编排",
    deliveryDeck: "verification.trace.json 验证记录",
    confirmed: "已确认",
    runningOutline: "正在创建 Agent",
    createFailed: "创建失败",
    approveMessage: "确认，按这个能力契约创建生图原型 Agent。",
    runAdvanceReply: "已继续执行元智能体：Agent 契约、执行入口和示例 Recipe 已生成，运行时正在执行一次 dry-run 验证并准备注册这个 Agent。",
    realRunReply: "元智能体已经完成真实创建：Agent 文件、Recipe、Skill 与验证 Trace 已写入本地草案目录，右侧展示的是这次运行生成的真实产物。",
    apiUnavailableReply: "当前页面运行在静态服务下，我先按原型状态继续演示；启动 `npm run prototype:workbench` 后，这个按钮会真正调用本地元智能体。",
    createFailedReply: "元智能体创建失败，请查看本地终端或 Trace 后重试。",
    checkpointApprovedTitle: "能力契约已确认，元智能体正在创建 Agent",
    checkpointApprovedDesc: "文件骨架已经生成，下一步进入验证与注册。新增产物会作为这个 Agent 的版本化资产保留。",
    traceCoverCall: "生成 Agent 文件骨架",
    traceOutlineCall: "执行 Agent 验证",
    generatedAssets: "已生成 Agent 文件",
    outlineRunning: "验证运行中",
    checkpoint: "需要确认",
    checkpointTitle: "是否按这个契约创建新的生图原型 Agent？",
    checkpointDesc: "确认后我会自动选择未占用的 Agent ID，写入文件骨架、示例 Recipe 和验证 Trace，并把它加入待安装队列。",
    approve: "确认创建",
    adjust: "修改契约",
    composerHint: "描述你想创建的 Agent，或补充输入、输出、工具和验证要求",
    messageInput: "消息输入",
    composerPlaceholder: "告诉元智能体这个 Agent 应该具备什么能力...",
    selectedAgent: "当前：元智能体 / create-agent",
    send: "发送",
    sentMessage: "补充：这个 Agent 需要支持 raw-prompt，并且默认生成 3 张概念图。",
    queuedReply: "已收到，我会把补充要求合并进 Agent 契约，并重新检查输入参数、输出产物和验证用例。",
    inspector: "检查器",
    currentWorkArtifacts: "当前 Agent 的产物、Trace 与运行上下文",
    artifacts: "Agent 产物",
    trace: "Trace",
    context: "上下文",
    details: "详情",
    draftContent: "能力契约",
    traceStarted: "创建会话启动",
    traceAgentCall: "解析 Agent 需求",
    traceImageCall: "生成能力契约",
    traceCheckpoint: "等待用户确认",
    workspace: "工作区",
    contextFiles: "上下文文件",
    policy: "运行策略",
    policyValue: "元智能体生成代码，关键文件写入前人工确认",
    recipe: "Recipe",
    workId: "Agent ID",
    runId: "Run ID",
    state: "状态",
    waitingConfirm: "等待确认",
    model: "模型",
    duration: "累计耗时",
    prompt: "提示词",
    dryRun: "Dry run",
    startedAt: "开始时间",
    traceFile: "Trace 文件",
    artifactCount: "产物数",
    agentVersion: "Agent 版本",
    recipeId: "Recipe",
    yes: "是",
    no: "否",
    notAvailable: "-",
    openTrace: "打开原始 Trace",
    openTraceSucceeded: "已交给系统打开原始 Trace。",
    openTraceFailed: "打开 Trace 失败，请确认运行记录仍在本地。",
    openTraceApiUnavailable: "当前页面不是 Workbench API 服务，启动 `npm run prototype:workbench` 后再打开 Trace。",
    noArtifactsTitle: "本次运行没有产物",
    noArtifactsDesc: "这是一次 dry-run 或无输出运行。Trace 已记录执行过程，但没有写入文件产物。",
    noArtifactsTraceHint: "切到 Trace 标签查看这次运行的步骤、耗时和输入参数。",
    unknownSize: "未知大小",
    currentTask: "当前 Agent",
    generatedFromRun: "来自元智能体运行",
    completed: "已完成",
    selectedArtifact: "已选择产物",
    open: "打开",
    useAsContext: "作为上下文",
    openSucceeded: "已交给系统打开这个产物。",
    openFailed: "打开失败，请确认产物文件仍在本地。",
    artifactApiUnavailable: "当前页面不是 Workbench API 服务，启动 `npm run prototype:workbench` 并打开它打印的地址后再操作。",
    contextQueued: "已把这个产物加入当前对话上下文。",
    previewContent: "文件内容预览",
    loadingPreview: "正在读取...",
    previewStaticHint: "启动 `npm run prototype:workbench` 后可预览真实文件内容",
    binaryPreviewUnavailable: "二进制文件暂不提供文本预览",
    previewTruncated: "已截断显示",
    installAgent: "安装 Agent",
    installingAgent: "正在安装...",
    installSucceeded: "已安装到正式 Agents 目录，运行时可以加载这个 Agent。",
    installConflict: "正式 Agent 已存在，当前草案不会覆盖。下一步需要做版本更新或差异合并。",
    installConflictAction: "建议：创建新版本，或进入差异合并后再安装。",
    installFailed: "安装失败，请查看 Trace 或本地终端后重试。",
    installApiUnavailable: "当前页面不是 Workbench API 服务，启动 `npm run prototype:workbench` 后再安装。",
    actionHintMetaDraft: "当前是元智能体草案，可安装到正式 Agents；安装后可在左侧 Agents 里运行。",
    actionHintInstalledAgent: "当前是已安装 Agent 的运行记录，可直接运行；安装前请在左侧选择一个元智能体草案 Run。",
    actionHintSelectAgent: "请先在左侧选择一个已安装 Agent，或选择一个元智能体草案进行安装。",
    runAgent: "运行 Agent",
    runningAgent: "正在运行...",
    runAgentSucceeded: "Agent dry-run 已完成，Run 与 Trace 已刷新。",
    runAgentRealSucceeded: "Agent 真实运行已完成，Run、Trace 与产物已刷新。",
    runAgentFailed: "运行失败，请查看 Trace 或本地终端后重试。",
    runAgentApiUnavailable: "当前页面不是 Workbench API 服务，启动 `npm run prototype:workbench` 后再运行。",
    runAgentNoSelection: "请先在左侧选择一个已安装 Agent。",
    realRunMode: "真实运行",
    runCount: "数量",
    metaDesignTitle: "元智能体设计入口",
    metaDesignDesc: "你通过对话描述 Agent，元智能体负责澄清目标、生成契约、写入文件、运行验证，并在你确认后安装到本地 Agents。",
    metaDesignSpec: "规格",
    metaDesignFiles: "文件",
    metaDesignVerify: "验证",
    metaDesignInstall: "安装",
    agentRunTitle: "运行已安装 Agent",
    agentRunDesc: "运行也是对话的一部分。你可以在这里提交参数；右侧检查器只负责显示 Trace、产物和上下文。",
    settingsCenterEyebrow: "架构控制面板",
    settingsCenterTitle: "设置中心",
    settingsCenterDesc:
      "模型、知识库、Skills、工具与 MCP 共同构成 Agent 运行底座。优先声明默认角色，再允许 Agent 或运行时按状态覆盖。",
    backToWorkbench: "返回 Workbench",
    settingsOverviewFallback: "设置数据尚未准备好",
    settingsLoadingTitle: "正在加载设置数据",
    settingsLoadingDesc: "设置中心正在读取本地 Workbench API。",
    settingsEmptyTitle: "暂无设置数据",
    settingsEmptyDesc: "当前 Workspace 还没有可展示的模型、知识库、Skill、Tool、MCP 或运行策略。",
    settingsErrorTitle: "设置数据加载失败",
    settingsErrorDesc: "请确认已通过 `npm run prototype:workbench` 启动本地服务，或稍后重试。",
    settingsRetry: "重试加载",
    settingsSectionOverview: "架构总览",
    settingsSectionModels: "模型管理",
    settingsSectionAgentContext: "Agent Context",
    settingsSectionKnowledge: "知识库",
    settingsSectionSkills: "Skills",
    settingsSectionTools: "工具",
    settingsSectionMcp: "MCP",
    settingsSectionRuntime: "运行策略",
    settingsHighlights: "关键原则",
    providersHeading: "Provider 与健康状态",
    endpointLabel: "端点",
    providerDefaultFor: "默认用途",
    providerModels: "可用模型",
    modelRolesHeading: "模型角色与默认值",
    modelRoleMode: "默认方式",
    modelRoleFallback: "回退策略",
    modelRoleSignals: "运行时信号",
    agentContextHeading: "Agent 运行上下文装配",
    agentContextPurpose: "职责",
    agentContextAssembly: "装配方式",
    agentContextEvidence: "运行证据",
    agentContextArtifactPolicy: "产物策略",
    knowledgeHeading: "知识库与回流",
    embeddingRoleLabel: "嵌入角色",
    knowledgeChunk: "切片策略",
    knowledgeSources: "来源",
    knowledgeWriteBack: "回流策略",
    knowledgeAgents: "连接 Agent",
    skillsHeading: "Skills 基础层",
    toolsHeading: "工具基础层",
    mcpHeading: "MCP 基础层",
    scopeLabel: "作用范围",
    sourceLabel: "来源",
    runtimeHeading: "运行策略与继承",
    agentDefaultsHeading: "Agent 默认继承示例",
    agentDefaultModels: "模型角色",
    agentDefaultKnowledge: "知识库",
    agentDefaultSkills: "Skills",
    agentDefaultTools: "工具",
    agentDefaultMcp: "MCP",
    agentDefaultRuntime: "运行策略",
    statusHealthy: "健康",
    statusDegraded: "降级",
    statusNotConfigured: "未配置",
    stateReady: "可用",
    stateDraft: "草案",
    stateEnabled: "已启用",
    stateReview: "待审核",
    statePlanned: "规划中",
    settingsOpenHint: "设置中心展示的是 Workspace 默认配置，Agent 可继承后再覆盖。",
  },
  en: {
    currentWork: "Create Image Prototype Agent",
    localWorkspace: "Local workspace / moyu",
    engineRunning: "Local engine running",
    engineStatic: "Static preview",
    engineDisconnected: "Local service offline",
    staticPreview: "Static preview mode",
    openLocalWorkbench: "Open local service",
    moyuStudio: "Moyu Studio",
    codeDriven: "Code-driven agent creation and runtime platform",
    works: "Works",
    agents: "Agents",
    searchWorks: "Search works...",
    searchAgents: "Search agents...",
    loadingWorks: "Loading works...",
    loadingAgents: "Loading Agents...",
    noWorks: "No works yet",
    noAgents: "No Agents available",
    workFallbackDesc: "Created or run Agents will appear here",
    pptWork: "Create image prototype Agent",
    pptWorkDesc: "Agent artifact · waiting for approval",
    visualWork: "Create platform intro deck",
    visualWorkDesc: "Multi-Agent work · planning",
    researchWork: "Competitor research",
    researchWorkDesc: "Research Agent · running",
    newWork: "New Agent / Work",
    agentMeta: "Meta Agent",
    agentMetaDesc: "Create, revise, and verify Agents through dialogue",
    agentImage: "Image Prototype Agent",
    agentImageDesc: "Generate images, UI concepts, and brand visuals",
    agentDoc: "Documentation Agent",
    agentDocDesc: "Organize requirements, traces, and artifact notes",
    agentCode: "Code Execution Agent",
    agentCodeDesc: "Run commands, generate code, and verify results",
    settings: "Settings",
    runtimeReady: "Moyu Core 0.3.1 connected",
    workSession: "Agent Creation Session",
    recipeLoaded: "Recipe loaded",
    progressContent: "Clarify",
    progressVisual: "Contract",
    progressOutline: "Files",
    progressDeck: "Verify",
    you: "You",
    userAsk: "Help me create an image prototype Agent. It should call the gpt-image-2 relay, generate three UI concept images, and save images, trace, and prompts.",
    agentPlanIntro:
      "I will turn your natural-language request into an Agent contract, then generate code files, a Recipe, and verification fixtures. The output is a runnable Agent, not a one-off task result.",
    planMd: "Clarify goal, inputs, and outputs",
    planImage: "Draft Agent capability contract",
    planOutline: "Create Agent file skeleton",
    planDeck: "Verify and register Agent",
    orchestrationTitle: "Meta Agent is planning",
    orchestrationDesc:
      "The Meta Agent does not ask you to drag nodes. It creates Agent specs, code, and verification tasks through conversation. The generated Agent is then loaded by Moyu Runtime for future orchestration.",
    recipeFile: "Recipe",
    callPolicy: "Creation policy",
    callPolicyValue: "Draft contract first, then write Agent files after approval",
    imageAgent: "Meta Agent",
    imageAgentResult: "I drafted the capability contract for the image prototype Agent: inputs are prompt and count; outputs are image files, trace, and reusable prompt records.",
    nextDelivery: "Agent Creation Queue",
    nextDeliveryDesc: "After approval, the Meta Agent creates Agent files, a Recipe, test fixtures, and registers the Agent in the local runtime.",
    deliveryCover: "agent.yaml capability contract",
    deliverySections: "handler.ts execution entry",
    deliveryOutline: "recipe.ts sample orchestration",
    deliveryDeck: "verification.trace.json verification record",
    confirmed: "Confirmed",
    runningOutline: "Creating Agent",
    createFailed: "Creation failed",
    approveMessage: "Approved. Create the image prototype Agent from this contract.",
    runAdvanceReply: "Meta Agent execution continued: the Agent contract, execution entry, and sample Recipe are ready. The runtime is now running a dry-run verification before registering the Agent.",
    realRunReply: "The Meta Agent has completed a real creation run. Agent files, Recipe, Skill, and verification Trace were written to the local draft directory; the inspector now shows real artifacts from that run.",
    apiUnavailableReply: "This page is currently served as a static prototype, so I advanced the demo state. Start `npm run prototype:workbench` to make this button call the local Meta Agent.",
    createFailedReply: "Meta Agent creation failed. Check the local terminal or Trace, then try again.",
    checkpointApprovedTitle: "Contract approved. Meta Agent is creating the Agent",
    checkpointApprovedDesc: "The file skeleton is ready. Next comes verification and registration. New outputs stay versioned as assets of this Agent.",
    traceCoverCall: "Generated Agent file skeleton",
    traceOutlineCall: "Ran Agent verification",
    generatedAssets: "Agent files generated",
    outlineRunning: "Verification running",
    checkpoint: "Needs confirmation",
    checkpointTitle: "Create a new image prototype Agent from this contract?",
    checkpointDesc: "After approval I will choose an available Agent ID, write the skeleton, sample Recipe, and verification trace, then queue it for installation.",
    approve: "Create",
    adjust: "Revise contract",
    composerHint: "Describe the Agent you want to create, or add inputs, outputs, tools, and verification rules",
    messageInput: "Message input",
    composerPlaceholder: "Tell the Meta Agent what this Agent should do...",
    selectedAgent: "Current: Meta Agent / create-agent",
    send: "Send",
    sentMessage: "Add support for raw-prompt and default to three concept images.",
    queuedReply: "Got it. I will merge that into the Agent contract and re-check inputs, outputs, and verification cases.",
    inspector: "Inspector",
    currentWorkArtifacts: "Artifacts, trace, and runtime context for this Agent",
    artifacts: "Agent Artifacts",
    trace: "Trace",
    context: "Context",
    details: "Details",
    draftContent: "Capability contract",
    traceStarted: "Creation session started",
    traceAgentCall: "Parsed Agent requirement",
    traceImageCall: "Generated capability contract",
    traceCheckpoint: "Waiting for confirmation",
    workspace: "Workspace",
    contextFiles: "Context files",
    policy: "Run policy",
    policyValue: "Meta Agent generates code with human approval before key file writes",
    recipe: "Recipe",
    workId: "Agent ID",
    runId: "Run ID",
    state: "State",
    waitingConfirm: "Waiting for confirmation",
    model: "Model",
    duration: "Total duration",
    prompt: "Prompt",
    dryRun: "Dry run",
    startedAt: "Started at",
    traceFile: "Trace file",
    artifactCount: "Artifacts",
    agentVersion: "Agent version",
    recipeId: "Recipe",
    yes: "Yes",
    no: "No",
    notAvailable: "-",
    openTrace: "Open raw Trace",
    openTraceSucceeded: "Sent the raw Trace to the system opener.",
    openTraceFailed: "Failed to open Trace. Make sure the run still exists locally.",
    openTraceApiUnavailable: "This page is not served by the Workbench API. Start `npm run prototype:workbench` before opening Trace.",
    noArtifactsTitle: "No artifacts for this run",
    noArtifactsDesc: "This was a dry-run or no-output run. The Trace recorded execution, but no files were written.",
    noArtifactsTraceHint: "Open the Trace tab to inspect steps, timing, and input parameters.",
    unknownSize: "unknown size",
    currentTask: "Current Agent",
    generatedFromRun: "From Meta Agent run",
    completed: "Completed",
    selectedArtifact: "Selected artifact",
    open: "Open",
    useAsContext: "Use as context",
    openSucceeded: "Sent this artifact to the system opener.",
    openFailed: "Open failed. Make sure the artifact still exists locally.",
    artifactApiUnavailable: "This page is not served by the Workbench API. Start `npm run prototype:workbench` and open the printed URL before using this action.",
    contextQueued: "Added this artifact to the current conversation context.",
    previewContent: "File preview",
    loadingPreview: "Loading...",
    previewStaticHint: "Start `npm run prototype:workbench` to preview real file contents",
    binaryPreviewUnavailable: "Binary files do not have a text preview yet",
    previewTruncated: "Preview truncated",
    installAgent: "Install Agent",
    installingAgent: "Installing...",
    installSucceeded: "Installed into the formal Agents directory. The runtime can load this Agent.",
    installConflict: "A formal Agent already exists, so this draft was not overwritten. Next we need versioning or a diff-merge flow.",
    installConflictAction: "Suggested action: create a new version, or review a diff before installing.",
    installFailed: "Install failed. Check the Trace or local terminal, then retry.",
    installApiUnavailable: "This page is not served by the Workbench API. Start `npm run prototype:workbench` before installing.",
    actionHintMetaDraft: "This is a Meta Agent draft. Install it into formal Agents, then run it from the left Agents list.",
    actionHintInstalledAgent: "This is a run from an installed Agent. You can run it directly; select a Meta Agent draft before installing.",
    actionHintSelectAgent: "Select an installed Agent from the left panel, or select a Meta Agent draft to install.",
    runAgent: "Run Agent",
    runningAgent: "Running...",
    runAgentSucceeded: "Agent dry-run completed. Run and Trace were refreshed.",
    runAgentRealSucceeded: "Agent real run completed. Run, Trace, and artifacts were refreshed.",
    runAgentFailed: "Run failed. Check the Trace or local terminal, then retry.",
    runAgentApiUnavailable: "This page is not served by the Workbench API. Start `npm run prototype:workbench` before running.",
    runAgentNoSelection: "Select an installed Agent from the left panel first.",
    realRunMode: "Real run",
    runCount: "Count",
    metaDesignTitle: "Meta Agent design entry",
    metaDesignDesc: "Describe an Agent through conversation. The Meta Agent clarifies goals, generates the contract, writes files, runs verification, and installs it after your approval.",
    metaDesignSpec: "Spec",
    metaDesignFiles: "Files",
    metaDesignVerify: "Verify",
    metaDesignInstall: "Install",
    agentRunTitle: "Run installed Agent",
    agentRunDesc: "Running is part of the conversation. Submit parameters here; the inspector only shows Trace, artifacts, and context.",
    settingsCenterEyebrow: "Architecture control plane",
    settingsCenterTitle: "Settings Center",
    settingsCenterDesc:
      "Models, knowledge bases, skills, tools, and MCP shape the agent runtime substrate. Define default roles first, then let agents or runs override with evidence.",
    backToWorkbench: "Back to Workbench",
    settingsOverviewFallback: "Settings data is not ready yet",
    settingsLoadingTitle: "Loading settings data",
    settingsLoadingDesc: "The Settings Center is reading the local Workbench API.",
    settingsEmptyTitle: "No settings data yet",
    settingsEmptyDesc: "This Workspace has no models, knowledge bases, skills, tools, MCP servers, or runtime policies to show yet.",
    settingsErrorTitle: "Settings data failed to load",
    settingsErrorDesc: "Start `npm run prototype:workbench` for the local API, or retry in a moment.",
    settingsRetry: "Retry",
    settingsSectionOverview: "Overview",
    settingsSectionModels: "Models",
    settingsSectionAgentContext: "Agent Context",
    settingsSectionKnowledge: "Knowledge",
    settingsSectionSkills: "Skills",
    settingsSectionTools: "Tools",
    settingsSectionMcp: "MCP",
    settingsSectionRuntime: "Runtime",
    settingsHighlights: "Key principles",
    providersHeading: "Providers and health",
    endpointLabel: "Endpoint",
    providerDefaultFor: "Default for",
    providerModels: "Models",
    modelRolesHeading: "Model roles and defaults",
    modelRoleMode: "Default mode",
    modelRoleFallback: "Fallback",
    modelRoleSignals: "Runtime signals",
    agentContextHeading: "Agent runtime context assembly",
    agentContextPurpose: "Purpose",
    agentContextAssembly: "Assembly mode",
    agentContextEvidence: "Runtime evidence",
    agentContextArtifactPolicy: "Artifact policy",
    knowledgeHeading: "Knowledge bases and write-back",
    embeddingRoleLabel: "Embedding role",
    knowledgeChunk: "Chunking",
    knowledgeSources: "Sources",
    knowledgeWriteBack: "Write-back",
    knowledgeAgents: "Connected agents",
    skillsHeading: "Skills layer",
    toolsHeading: "Tools layer",
    mcpHeading: "MCP layer",
    scopeLabel: "Scope",
    sourceLabel: "Source",
    runtimeHeading: "Runtime policy and inheritance",
    agentDefaultsHeading: "Agent inheritance examples",
    agentDefaultModels: "Model roles",
    agentDefaultKnowledge: "Knowledge bases",
    agentDefaultSkills: "Skills",
    agentDefaultTools: "Tools",
    agentDefaultMcp: "MCP",
    agentDefaultRuntime: "Runtime mode",
    statusHealthy: "Healthy",
    statusDegraded: "Degraded",
    statusNotConfigured: "Not configured",
    stateReady: "Ready",
    stateDraft: "Draft",
    stateEnabled: "Enabled",
    stateReview: "In review",
    statePlanned: "Planned",
    settingsOpenHint: "The Settings Center shows workspace defaults first; agents can inherit and then override.",
  },
};

const layout = document.querySelector("[data-layout]");
const mobileLayoutQuery = "(max-width: 480px)";
const paneLimits = {
  left: { min: 220, max: 420, fallback: 292 },
  right: { min: 320, max: 720, fallback: 420 },
};
const layoutStorageVersion = "7";
let currentLang = localStorage.getItem("moyu.prototype.lang") || "zh";
let workbenchData = null;
let settingsState = {
  status: "idle",
  settings: null,
  error: "",
  requestId: 0,
};
let currentArtifacts = [];
const prototypeState = {
  phase: "waiting",
  baseArtifacts: getBaseAgentArtifacts(),
  baseTimeline: getBaseTimelineSteps(),
  selectedArtifactName: "",
  selectedArtifactId: "",
  usesRealRun: false,
  runState: "",
  apiAvailable: false,
  isSubmitting: false,
  isInstalling: false,
  isRunningAgent: false,
  selectedWorkId: "",
  selectedAgentId: "",
  selectedSettingsSection: "overview",
  centerView: "conversation",
  previewRequestId: 0,
  lastRuntimeMessageKey: "runAdvanceReply",
};

applySavedLayout();
bindLanguage();
bindTabs();
bindCollapse();
bindResizers();
bindComposer();
bindStaticSelection();
bindRunActions();
bindSettings();
syncViewFromHash({ render: false, load: false });
if (prototypeState.centerView === "settings") {
  loadSettingsData();
}
applyLanguage(currentLang);
loadWorkbenchData();
renderRuntimeMode();
renderCenterView();

function bindLanguage() {
  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.addEventListener("click", () => {
      applyLanguage(button.getAttribute("data-lang") || "zh");
    });
  });
}

function applyLanguage(lang) {
  currentLang = lang;
  const dict = messages[lang] ?? messages.zh;
  document.documentElement.lang = lang === "en" ? "en" : "zh-CN";

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (key && dict[key]) {
      node.textContent = dict[key];
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    const key = node.getAttribute("data-i18n-placeholder");
    if (key && dict[key]) {
      node.setAttribute("placeholder", dict[key]);
    }
  });

  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.classList.toggle("active", button.getAttribute("data-lang") === lang);
  });

  localStorage.setItem("moyu.prototype.lang", lang);
  renderWorkbenchData();
  renderRuntimeMode();
  renderCenterView();
}

function bindTabs() {
  document.querySelectorAll("[data-left-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-left-tab");
      setActive(button, "[data-left-tab]");
      showPanel(`[data-left-panel="${target}"]`, "[data-left-panel]");
    });
  });

  document.querySelectorAll("[data-inspector-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-inspector-tab");
      setActive(button, "[data-inspector-tab]");
      showPanel(`[data-inspector-panel="${target}"]`, "[data-inspector-panel]");
    });
  });
}

function setActive(activeNode, selector) {
  document.querySelectorAll(selector).forEach((node) => node.classList.toggle("active", node === activeNode));
}

function showPanel(targetSelector, allSelector) {
  document.querySelectorAll(allSelector).forEach((node) => node.classList.toggle("active", node.matches(targetSelector)));
}

function bindCollapse() {
  document.querySelectorAll("[data-collapse]").forEach((button) => {
    button.addEventListener("click", () => {
      const side = button.getAttribute("data-collapse");
      if (window.matchMedia(mobileLayoutQuery).matches) {
        const className = `mobile-${side}-open`;
        layout.classList.toggle(className);
        if (side === "left") {
          layout.classList.remove("mobile-right-open");
        } else {
          layout.classList.remove("mobile-left-open");
        }
        return;
      }
      const className = `${side}-collapsed`;
      layout.classList.toggle(className);
      preventCrampedLayout(side);
      localStorage.setItem(`moyu.prototype.${className}`, layout.classList.contains(className) ? "1" : "0");
    });
  });
}

function applySavedLayout() {
  if (!layout) {
    return;
  }

  if (localStorage.getItem("moyu.prototype.layoutVersion") !== layoutStorageVersion) {
    [
      "moyu.prototype.leftWidth",
      "moyu.prototype.rightWidth",
      "moyu.prototype.left-collapsed",
      "moyu.prototype.right-collapsed",
    ].forEach((key) => localStorage.removeItem(key));
    localStorage.setItem("moyu.prototype.layoutVersion", layoutStorageVersion);
  }

  setPaneWidth("left", sanitizePaneWidth("left", localStorage.getItem("moyu.prototype.leftWidth")));
  setPaneWidth("right", sanitizePaneWidth("right", localStorage.getItem("moyu.prototype.rightWidth")));
  layout.classList.toggle("left-collapsed", localStorage.getItem("moyu.prototype.left-collapsed") === "1");
  layout.classList.toggle("right-collapsed", localStorage.getItem("moyu.prototype.right-collapsed") === "1");
  preventCrampedLayout();
}

function bindResizers() {
  document.querySelectorAll("[data-resizer]").forEach((handle) => {
    handle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      const side = handle.getAttribute("data-resizer");
      document.body.classList.add("resizing");
      handle.setPointerCapture(event.pointerId);

      const move = (moveEvent) => {
        if (side === "left") {
          setPaneWidth("left", clamp(moveEvent.clientX, paneLimits.left.min, paneLimits.left.max));
        } else {
          setPaneWidth("right", clamp(window.innerWidth - moveEvent.clientX, paneLimits.right.min, getPaneMax("right")));
        }
      };

      const stop = () => {
        document.body.classList.remove("resizing");
        localStorage.setItem("moyu.prototype.leftWidth", getComputedStyle(layout).getPropertyValue("--left-width").trim());
        localStorage.setItem("moyu.prototype.rightWidth", getComputedStyle(layout).getPropertyValue("--right-width").trim());
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop, { once: true });
    });
  });
}

window.addEventListener("resize", () => preventCrampedLayout());

function preventCrampedLayout(changedSide) {
  if (!layout || window.matchMedia(mobileLayoutQuery).matches) {
    return;
  }

  const rightWidth = readPaneWidth("right");
  let leftWidth = layout.classList.contains("left-collapsed") ? 0 : readPaneWidth("left");
  let availableCenter = window.innerWidth - leftWidth - rightWidth - 14;

  if (availableCenter < 520 && !layout.classList.contains("left-collapsed")) {
    layout.classList.add("left-collapsed");
    localStorage.setItem("moyu.prototype.left-collapsed", "1");
    leftWidth = 0;
    availableCenter = window.innerWidth - leftWidth - rightWidth - 14;
  }

  if (availableCenter < 120 && !layout.classList.contains("right-collapsed")) {
    layout.classList.add("right-collapsed");
    localStorage.setItem("moyu.prototype.right-collapsed", "1");
  } else if (changedSide === "right" && availableCenter >= 420) {
    localStorage.setItem("moyu.prototype.right-collapsed", layout.classList.contains("right-collapsed") ? "1" : "0");
  }
}

function setPaneWidth(side, width) {
  layout.style.setProperty(`--${side}-width`, `${width}px`);
}

function readPaneWidth(side) {
  const raw = getComputedStyle(layout).getPropertyValue(`--${side}-width`);
  return sanitizePaneWidth(side, raw);
}

function sanitizePaneWidth(side, rawValue) {
  const limits = paneLimits[side];
  const parsed = Number.parseFloat(String(rawValue || ""));
  if (!Number.isFinite(parsed)) {
    return clamp(limits.fallback, limits.min, getPaneMax(side));
  }
  return clamp(parsed, limits.min, getPaneMax(side));
}

function getPaneMax(side) {
  if (side === "right") {
    return Math.max(paneLimits.right.min, Math.min(paneLimits.right.max, Math.floor(window.innerWidth * 0.6)));
  }
  return paneLimits[side].max;
}

function bindComposer() {
  const composer = document.querySelector(".composer");
  const textarea = document.querySelector(".composer textarea");
  const sendButton = document.querySelector("[data-send-message]");

  const syncComposer = () => {
    if (!textarea) {
      return;
    }
    textarea.style.height = "38px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
    composer?.classList.toggle("has-content", textarea.value.trim().length > 0);
  };

  textarea?.addEventListener("focus", () => {
    composer?.classList.add("focused");
    syncComposer();
  });
  textarea?.addEventListener("blur", () => composer?.classList.remove("focused"));
  textarea?.addEventListener("input", syncComposer);
  textarea?.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      appendDemoExchange();
    }
  });
  sendButton?.addEventListener("click", appendDemoExchange);
  syncComposer();
}

function bindStaticSelection() {
  document.querySelectorAll(".work-item, .agent-item").forEach((item) => {
    item.addEventListener("click", () => {
      const selector = item.classList.contains("work-item") ? ".work-item" : ".agent-item";
      document.querySelectorAll(selector).forEach((node) => node.classList.toggle("active", node === item));
    });
  });
}

function bindRunActions() {
  document.querySelector("[data-run-action='approve']")?.addEventListener("click", advanceDemoRun);
  document.querySelector("[data-install-agent]")?.addEventListener("click", installAgentDraftFromCurrentRun);
  document.querySelector("[data-run-agent]")?.addEventListener("click", runSelectedAgentFromWorkbench);
  document.querySelector("[data-open-artifact]")?.addEventListener("click", openSelectedArtifact);
  document.querySelector("[data-open-trace]")?.addEventListener("click", openCurrentRunTrace);
  document.querySelector("[data-use-artifact-context]")?.addEventListener("click", useSelectedArtifactAsContext);
  document.querySelectorAll("[data-run-action='adjust']").forEach((button) => button.addEventListener("click", () => {
    const textarea = document.querySelector(".composer textarea");
    if (textarea) {
      textarea.value = currentLang === "en" ? "Revise the contract: add a provider health check and clearer failure messages." : "修改契约：增加 provider 健康检查，并把失败原因说清楚。";
      textarea.dispatchEvent(new Event("input"));
      textarea.focus();
    }
  }));
}

function bindSettings() {
  document.querySelector("[data-open-settings]")?.addEventListener("click", () => {
    openSettingsView("overview");
  });
  document.querySelector("[data-back-to-workbench]")?.addEventListener("click", () => {
    openConversationView();
  });
  window.addEventListener("hashchange", () => syncViewFromHash());
  window.addEventListener("popstate", () => syncViewFromHash());
}

function openSettingsView(sectionId) {
  writeSettingsHash(sectionId || prototypeState.selectedSettingsSection || "overview");
}

function openConversationView() {
  if (getSettingsModule().parseSettingsHash(location.hash).view === "settings") {
    history.pushState(null, "", `${location.pathname}${location.search}`);
  }
  prototypeState.centerView = "conversation";
  renderCenterView();
}

function syncViewFromHash(options = {}) {
  const shouldRender = options.render !== false;
  const shouldLoad = options.load !== false;
  const route = getSettingsModule().parseSettingsHash(location.hash);
  if (route.view === "settings") {
    prototypeState.centerView = "settings";
    prototypeState.selectedSettingsSection = route.sectionId || "overview";
    if (shouldLoad) {
      loadSettingsData();
    }
    if (shouldRender) {
      renderCenterView();
    }
    return;
  }

  prototypeState.centerView = "conversation";
  if (shouldRender) {
    renderCenterView();
  }
}

function writeSettingsHash(sectionId, options = {}) {
  const nextHash = getSettingsModule().toSettingsHash(sectionId || "overview");
  if (location.hash === nextHash) {
    syncViewFromHash();
    return;
  }
  if (options.replace) {
    history.replaceState(null, "", `${location.pathname}${location.search}${nextHash}`);
    syncViewFromHash();
    return;
  }
  location.hash = nextHash;
}

function renderCenterView() {
  document.querySelectorAll("[data-center-view]").forEach((node) => {
    node.classList.toggle("active", node.getAttribute("data-center-view") === prototypeState.centerView);
  });
  document.querySelector("[data-open-settings]")?.classList.toggle("active", prototypeState.centerView === "settings");
  if (prototypeState.centerView === "settings") {
    renderSettingsCenter();
  }
}

async function loadSettingsData(options = {}) {
  const force = Boolean(options.force);
  if (!force && settingsState.status === "loading") {
    return;
  }
  if (!force && settingsState.status === "ready" && settingsState.settings) {
    return;
  }

  const requestId = settingsState.requestId + 1;
  settingsState = {
    ...settingsState,
    status: "loading",
    error: "",
    requestId,
  };
  renderCenterView();

  const apiSettings = await loadSettingsDataFromApi();
  if (settingsState.requestId !== requestId) {
    return;
  }

  const fallbackSettings = getPreviewSettingsData();
  const shouldUseFallback = !apiSettings && canUsePreviewSettingsFallback({ status: "error" });
  const settings = apiSettings || (shouldUseFallback ? fallbackSettings : null);
  settingsState = {
    status: settings ? "ready" : "error",
    settings,
    error: settings ? "" : "settings api unavailable",
    requestId,
  };
  renderCenterView();
  renderRuntimeMode();
}

async function loadSettingsDataFromApi() {
  if (!canUseLocalApi()) {
    return null;
  }

  try {
    const response = await fetch("/api/settings", { cache: "no-store" });
    const data = await response.json().catch(() => null);
    const settings = getSettingsModule().normalizeSettingsPayload(data);
    if (!response.ok || !settings) {
      return null;
    }
    prototypeState.apiAvailable = true;
    return settings;
  } catch {
    return null;
  }
}

function getPreviewSettingsData() {
  const module = getSettingsModule();
  return module.normalizeSettingsPayload(workbenchData?.settings) || module.normalizeSettingsPayload(workbenchData);
}

function hydrateSettingsFromWorkbenchData() {
  if (settingsState.status === "ready" || settingsState.status === "loading") {
    return;
  }
  if (!canUsePreviewSettingsFallback(settingsState)) {
    return;
  }
  const settings = getPreviewSettingsData();
  if (!settings) {
    return;
  }
  settingsState = {
    ...settingsState,
    status: "ready",
    settings,
    error: "",
  };
}

function canUsePreviewSettingsFallback(state = settingsState) {
  return getSettingsModule().shouldUsePreviewSettingsFallback({
    status: state.status,
    canUseLocalApi: canUseLocalApi(),
    apiAvailable: prototypeState.apiAvailable,
  });
}

function getSettingsModule() {
  return window.MoyuSettingsModule;
}

async function loadWorkbenchData() {
  const apiData = await loadWorkbenchDataFromApi();
  if (apiData) {
    workbenchData = apiData;
    hydrateSettingsFromWorkbenchData();
    renderWorkbenchData();
    renderRuntimeMode();
    return;
  }

  try {
    const response = await fetch("./data/workbench.json", { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    if (data && data.schemaVersion === 1) {
      workbenchData = data;
      hydrateSettingsFromWorkbenchData();
      renderWorkbenchData();
      renderRuntimeMode();
    }
  } catch {
    // The prototype still works as a static mock when exported runtime data is absent.
  }
}

function renderRuntimeMode() {
  const dict = messages[currentLang] ?? messages.zh;
  const engine = document.querySelector("[data-engine-pill]");
  const label = document.querySelector("[data-engine-label]");
  const staticBanner = document.querySelector("[data-static-banner]");
  const isStaticFile = location.protocol === "file:";

  staticBanner?.toggleAttribute("hidden", !isStaticFile);
  engine?.classList.toggle("static", isStaticFile);
  engine?.classList.toggle("offline", !isStaticFile && !prototypeState.apiAvailable);

  if (label) {
    label.textContent = isStaticFile
      ? dict.engineStatic
      : prototypeState.apiAvailable
        ? dict.engineRunning
        : dict.engineDisconnected;
  }
}

async function loadWorkbenchDataFromApi() {
  if (!canUseLocalApi()) {
    prototypeState.apiAvailable = false;
    return null;
  }

  try {
    const response = await fetch(getWorkbenchApiUrl(), { cache: "no-store" });
    if (!response.ok) {
      prototypeState.apiAvailable = false;
      return null;
    }
    const data = await response.json();
    const isWorkbenchData = data && data.schemaVersion === 1;
    prototypeState.apiAvailable = Boolean(isWorkbenchData);
    return isWorkbenchData ? data : null;
  } catch {
    prototypeState.apiAvailable = false;
    return null;
  }
}

function getWorkbenchApiUrl(runId) {
  const selectedRunId = runId || getSelectedWorkRunId();
  return selectedRunId ? `/api/workbench?runId=${encodeURIComponent(selectedRunId)}` : "/api/workbench";
}

function renderWorkbenchData() {
  if (!workbenchData) {
    return;
  }

  const run = workbenchData.selectedRun;
  const realArtifacts = normalizeWorkbenchArtifacts(workbenchData.artifacts || []);
  const realTimeline = getTimelineFromRun(run);

  syncSelectedWorkWithRun(run, workbenchData.works || []);
  prototypeState.usesRealRun = Boolean(run && (realArtifacts.length > 0 || realTimeline.length > 0));
  prototypeState.runState = run?.state || "";
  if (prototypeState.usesRealRun) {
    prototypeState.phase = run?.state === "created" || run?.state === "running" ? "waiting" : "outline";
    prototypeState.baseArtifacts = realArtifacts;
    prototypeState.baseTimeline = realTimeline.length > 0 ? realTimeline : getBaseTimelineSteps(run);
  } else {
    prototypeState.baseArtifacts = getBaseAgentArtifacts();
    prototypeState.baseTimeline = getBaseTimelineSteps(run);
  }
  currentArtifacts = getVisibleArtifacts();
  renderWorks(workbenchData.works || []);
  renderAgents(workbenchData.agents || []);
  renderArtifacts(currentArtifacts);
  renderConversationArtifacts(currentArtifacts);
  updateArtifactDetail(getSelectedArtifact(currentArtifacts));
  renderTimelineSteps(getVisibleTimelineSteps());
  renderRunDetails(run, currentArtifacts);
  renderRunState();
  renderStateMessages();
  renderActionHint();
  renderSettingsCenter();
}

function syncSelectedWorkWithRun(run, works) {
  if (!run?.id || !Array.isArray(works) || works.length === 0) {
    return;
  }

  const matchingWork = works.find((work) => work.runId === run.id);
  if (matchingWork) {
    prototypeState.selectedWorkId = matchingWork.id;
  }
}

async function advanceDemoRun() {
  if (prototypeState.phase !== "waiting") {
    return;
  }

  prototypeState.isSubmitting = true;
  renderRunState();

  const apiResult = await createAgentViaApi();
  prototypeState.isSubmitting = false;
  if (apiResult?.workbench) {
    workbenchData = apiResult.workbench;
    prototypeState.lastRuntimeMessageKey = "realRunReply";
    renderWorkbenchData();
    setActiveInspectorTab("artifacts");
    scrollMessagesToBottom();
    return;
  }

  if (apiResult?.error) {
    prototypeState.phase = "waiting";
    prototypeState.lastRuntimeMessageKey = "createFailedReply";
    renderRunState();
    renderStateMessages();
    scrollMessagesToBottom();
    return;
  }

  prototypeState.lastRuntimeMessageKey = "apiUnavailableReply";
  prototypeState.phase = "outline";

  currentArtifacts = getVisibleArtifacts();
  renderArtifacts(currentArtifacts);
  renderConversationArtifacts(currentArtifacts);
  updateArtifactDetail(getSelectedArtifact(currentArtifacts));
  renderTimelineSteps(getVisibleTimelineSteps());
  renderRunState();
  renderStateMessages();
  setActiveInspectorTab("artifacts");
  scrollMessagesToBottom();
}

function renderStateMessages() {
  const scroll = document.querySelector("[data-message-scroll]");
  if (!scroll) {
    return;
  }

  scroll.querySelectorAll("[data-state-message]").forEach((node) => node.remove());
  if (prototypeState.phase !== "outline" && prototypeState.lastRuntimeMessageKey !== "createFailedReply") {
    return;
  }

  const dict = messages[currentLang] ?? messages.zh;
  if (prototypeState.lastRuntimeMessageKey !== "createFailedReply") {
    scroll.append(createMessage("user", dict.you, dict.approveMessage, { stateMessage: true }));
  }
  scroll.append(createRunResultMessage(dict[prototypeState.lastRuntimeMessageKey] || dict.runAdvanceReply));
}

function renderRunState() {
  const dict = messages[currentLang] ?? messages.zh;
  if (prototypeState.isSubmitting) {
    renderApprovedCheckpoint(dict);
    renderProgress("outline");
    renderDeliveryQueue("outline");
    renderSessionState(dict.runningOutline, "runningOutline");
    setCheckpointActionsDisabled(true);
    return;
  }

  setCheckpointActionsDisabled(false);
  if (prototypeState.phase === "outline") {
    renderApprovedCheckpoint(dict);
    renderProgress(prototypeState.usesRealRun && prototypeState.runState === "succeeded" ? "deck" : "outline");
    renderDeliveryQueue("outline");
    renderSessionState(
      prototypeState.usesRealRun && prototypeState.runState === "succeeded" ? dict.completed : dict.runningOutline,
      prototypeState.usesRealRun && prototypeState.runState === "succeeded" ? "completed" : "runningOutline",
    );
    return;
  }

  renderWaitingCheckpoint(dict);
  renderProgress("visual");
  renderDeliveryQueue("waiting");
  renderSessionState(dict.waitingConfirm, "waitingConfirm");
}

function setCheckpointActionsDisabled(disabled) {
  document.querySelectorAll("[data-run-action]").forEach((button) => {
    button.disabled = disabled;
  });
}

function renderWaitingCheckpoint(dict) {
  const card = document.querySelector(".checkpoint-card");
  if (!card) {
    return;
  }

  card.classList.remove("approved");
  const label = card.querySelector(".checkpoint-label");
  const title = card.querySelector("strong");
  const description = card.querySelector("p");

  if (label) {
    label.textContent = dict.checkpoint;
    label.setAttribute("data-i18n", "checkpoint");
  }
  if (title) {
    title.textContent = dict.checkpointTitle;
    title.setAttribute("data-i18n", "checkpointTitle");
  }
  if (description) {
    description.textContent = dict.checkpointDesc;
    description.setAttribute("data-i18n", "checkpointDesc");
  }
}

function renderApprovedCheckpoint(dict) {
  const card = document.querySelector(".checkpoint-card");
  if (!card) {
    return;
  }

  card.classList.add("approved");
  const label = card.querySelector(".checkpoint-label");
  const title = card.querySelector("strong");
  const description = card.querySelector("p");

  if (label) {
    label.textContent = dict.confirmed;
    label.setAttribute("data-i18n", "confirmed");
  }
  if (title) {
    title.textContent = dict.checkpointApprovedTitle;
    title.setAttribute("data-i18n", "checkpointApprovedTitle");
  }
  if (description) {
    description.textContent = dict.checkpointApprovedDesc;
    description.setAttribute("data-i18n", "checkpointApprovedDesc");
  }
}

function renderProgress(activeStep) {
  const steps = Array.from(document.querySelectorAll(".work-progress span"));
  const doneByStep = {
    content: [],
    visual: ["content"],
    outline: ["content", "visual"],
    deck: ["content", "visual", "outline"],
  };
  steps.forEach((step, index) => {
    const stepName = ["content", "visual", "outline", "deck"][index];
    const doneSteps = doneByStep[activeStep] || ["content"];
    step.classList.toggle("done", doneSteps.includes(stepName));
    step.classList.toggle("active", stepName === activeStep);
  });
}

function renderSessionState(text, i18nKey) {
  const state = document.querySelector(".session-meta span:first-child");
  if (state) {
    state.textContent = text;
    state.setAttribute("data-i18n", i18nKey);
  }
}

function renderDeliveryQueue(phase) {
  document.querySelectorAll("[data-delivery-step]").forEach((item) => {
    const step = item.getAttribute("data-delivery-step");
    const isOutlinePhase = phase === "outline";
    item.classList.toggle("done", isOutlinePhase && (step === "cover" || step === "sections"));
    item.classList.toggle("active", isOutlinePhase && step === "outline");
  });
}

function getBaseTimelineSteps(run) {
  return [
    { titleKey: "traceStarted", subtitle: "10:20:31", duration: "0ms", status: "done" },
    { titleKey: "traceAgentCall", subtitle: "meta/create-agent", duration: "1.6s", status: "done" },
    { titleKey: "traceImageCall", subtitle: "agent-spec", duration: "4.2s", status: "active" },
    { titleKey: "traceCheckpoint", subtitle: "checkpoint", duration: "-", status: "" },
  ];
}

function getVisibleTimelineSteps() {
  if (prototypeState.usesRealRun) {
    return prototypeState.baseTimeline;
  }

  if (prototypeState.phase !== "outline") {
    return prototypeState.baseTimeline;
  }

  return [
    ...prototypeState.baseTimeline.map((step) => (step.status === "active" ? { ...step, status: "done" } : step)),
    { titleKey: "traceCoverCall", subtitle: "agents/image-gen/prototype-v1", duration: "6.8s", status: "done" },
    { titleKey: "traceOutlineCall", subtitle: "runtime dry-run", duration: "running", status: "active" },
  ];
}

function renderTimelineSteps(steps) {
  const timeline = document.querySelector("[data-timeline]");
  if (!timeline) {
    return;
  }

  timeline.replaceChildren(...steps.map(createTimelineItem));
}

function createTimelineItem(step) {
  const item = document.createElement("li");
  item.className = step.status || "";
  const dot = document.createElement("span");
  const body = document.createElement("div");
  const title = step.titleKey ? messages[currentLang][step.titleKey] : step.title;
  body.append(createText("strong", title), createText("small", step.subtitle));
  item.append(dot, body, createText("em", step.duration));
  return item;
}

function renderRunDetails(run, artifacts) {
  const list = document.querySelector("[data-run-details]");
  const button = document.querySelector("[data-open-trace]");
  if (!list) {
    return;
  }

  const dict = messages[currentLang] ?? messages.zh;
  if (!run) {
    list.replaceChildren(
      createRunDetailItem(dict.workId, "meta/create-agent"),
      createRunDetailItem(dict.state, dict.waitingConfirm),
      createRunDetailItem(dict.duration, dict.notAvailable),
      createRunDetailItem(dict.traceFile, dict.notAvailable),
    );
    if (button) {
      button.disabled = true;
    }
    return;
  }

  const artifactCount =
    typeof run.artifactCount === "number" ? run.artifactCount : Array.isArray(artifacts) ? artifacts.length : 0;
  list.replaceChildren(
    createRunDetailItem(dict.workId, run.agentId || dict.notAvailable),
    createRunDetailItem(dict.runId, run.id || dict.notAvailable),
    createRunDetailItem(dict.state, run.state || dict.notAvailable),
    createRunDetailItem(dict.dryRun, run.dryRun ? dict.yes : dict.no),
    createRunDetailItem(dict.prompt, run.prompt || dict.notAvailable),
    createRunDetailItem(dict.traceFile, run.tracePath || dict.notAvailable),
    createRunDetailItem(dict.artifactCount, String(artifactCount)),
    createRunDetailItem(dict.startedAt, formatDateTime(run.startedAt)),
    createRunDetailItem(dict.agentVersion, run.agentVersion || dict.notAvailable),
    createRunDetailItem(dict.recipeId, run.recipeId || dict.notAvailable),
    createRunDetailItem(dict.duration, formatDuration(run.durationMs)),
  );
  if (button) {
    button.disabled = !run.id || !canUseWorkbenchApi();
  }
}

function createRunDetailItem(label, value) {
  const item = document.createElement("div");
  item.append(createText("dt", label), createText("dd", value));
  return item;
}

function getBaseAgentArtifacts() {
  return [
    {
      name: "agent.yaml",
      type: "yaml",
      sizeBytes: 2400,
    },
    {
      name: "handler.ts",
      type: "ts",
      sizeBytes: 7800,
    },
    {
      name: "agent.recipe.ts",
      type: "ts",
      sizeBytes: 4300,
    },
  ];
}

function getVisibleArtifacts() {
  if (prototypeState.usesRealRun) {
    return prototypeState.baseArtifacts.slice();
  }

  if (prototypeState.phase === "outline") {
    return mergeGeneratedArtifacts(prototypeState.baseArtifacts);
  }
  return prototypeState.baseArtifacts.slice();
}

function getSelectedArtifact(artifacts) {
  if (prototypeState.selectedArtifactId) {
    return artifacts.find((artifact) => artifact.id === prototypeState.selectedArtifactId) || artifacts[0] || null;
  }
  if (prototypeState.selectedArtifactName) {
    return artifacts.find((artifact) => artifact.name === prototypeState.selectedArtifactName) || artifacts[0] || null;
  }
  return artifacts[0] || null;
}

function mergeGeneratedArtifacts(artifacts) {
  const generated = getGeneratedArtifacts();
  const names = new Set(generated.map((artifact) => artifact.name));
  return [...generated, ...artifacts.filter((artifact) => !names.has(artifact.name))];
}

function getGeneratedArtifacts() {
  return [
    {
      name: "verification.trace.json",
      type: "json",
      sizeBytes: 6200,
    },
    {
      name: "README.agent.md",
      type: "md",
      sizeBytes: 3100,
    },
  ];
}

function createRunResultMessage(text) {
  const article = createMessage("agent", "Moyu Runtime", text, { stateMessage: true });
  const body = article.querySelector(".message-body");
  const artifacts = document.createElement("div");
  artifacts.className = "artifact-strip compact";
  const visibleArtifacts = getVisibleArtifacts().slice(0, 3);
  artifacts.append(
    ...(visibleArtifacts.length > 0
      ? visibleArtifacts.map((artifact, index) => createMiniArtifact(artifact, index === 0))
      : [
          createMiniArtifact({ name: "agent.yaml", type: "yaml", sizeBytes: 2400 }, true),
          createMiniArtifact({ name: "handler.ts", type: "ts", sizeBytes: 7800 }, false),
          createMiniArtifact({ name: "verification.trace.json", type: "json", sizeBytes: 6200 }, false),
        ]),
  );
  body?.append(artifacts);
  return article;
}

async function createAgentViaApi() {
  if (!canUseWorkbenchApi()) {
    return null;
  }

  try {
    const response = await fetch("/api/meta/create-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getMetaCreatePayload()),
    });

    if (response.status === 404 || response.status === 405) {
      return null;
    }

    const data = await response.json();
    if (!response.ok || !data?.ok) {
      return { error: data?.error || "create failed" };
    }
    return data;
  } catch {
    return null;
  }
}

function getMetaCreatePayload() {
  const promptNode = document.querySelector("[data-i18n='userAsk']");
  return {
    prompt: promptNode?.textContent?.trim() || messages.zh.userAsk,
    name: currentLang === "en" ? "Image Prototype Agent" : "生图原型 Agent",
    description:
      currentLang === "en"
        ? "Generate UI concept images through an OpenAI-compatible image relay and keep traceable artifacts."
        : "通过 OpenAI-compatible 图片中转接口生成 UI 概念图，并保存可追踪产物。",
    persist: false,
  };
}

function canUseLocalApi() {
  return location.protocol === "http:" || location.protocol === "https:";
}

function canUseWorkbenchApi() {
  return canUseLocalApi() && prototypeState.apiAvailable;
}

function scrollMessagesToBottom() {
  const scroll = document.querySelector("[data-message-scroll]");
  if (scroll) {
    scroll.scrollTop = scroll.scrollHeight;
  }
}

function isMetaAgentRun(run) {
  return Boolean(run && (run.agentId === "meta/create-agent" || String(run.id || "").startsWith("meta-create-")));
}

function normalizeWorkbenchArtifacts(artifacts) {
  return artifacts
    .filter((artifact) => artifact && typeof artifact.name === "string")
    .map((artifact) => ({
      ...artifact,
      type: artifact.type || getExtension(artifact.name) || "file",
      sizeBytes: typeof artifact.sizeBytes === "number" ? artifact.sizeBytes : null,
      url: artifact.url || "",
    }));
}

function getTimelineFromRun(run) {
  if (!run || !Array.isArray(run.steps)) {
    return [];
  }

  return run.steps.map((step) => ({
    title: step.name || step.id || "STEP",
    subtitle: step.state || "-",
    duration: formatDuration(step.durationMs),
    status: getTimelineStatus(step.state),
  }));
}

function getTimelineStatus(state) {
  if (state === "succeeded") {
    return "done";
  }
  if (state === "running") {
    return "active";
  }
  if (state === "failed") {
    return "active";
  }
  return "";
}

function createMiniArtifact(artifact, selected) {
  const card = document.createElement("article");
  card.className = `mini-artifact${selected ? " selected" : ""}`;

  if (isImageArtifact(artifact)) {
    const image = document.createElement("img");
    image.src = artifact.url;
    image.alt = "";
    card.append(image);
  } else {
    const file = document.createElement("span");
    file.className = "file-preview";
    file.textContent = getFileIconLabel(artifact);
    card.append(file);
  }

  card.append(createText("strong", artifact.name), createText("small", `${artifact.type.toUpperCase()} · ${formatBytes(artifact.sizeBytes)}`));
  return card;
}

function setActiveInspectorTab(target) {
  const button = document.querySelector(`[data-inspector-tab="${target}"]`);
  if (!button) {
    return;
  }
  setActive(button, "[data-inspector-tab]");
  showPanel(`[data-inspector-panel="${target}"]`, "[data-inspector-panel]");
}

function renderWorks(works) {
  const list = document.querySelector("[data-work-list]");
  if (!list) {
    return;
  }

  if (!Array.isArray(works) || works.length === 0) {
    list.replaceChildren(createListEmptyState("noWorks", "workFallbackDesc"));
    renderCurrentWork(null);
    return;
  }

  if (!prototypeState.selectedWorkId || !works.some((work) => work.id === prototypeState.selectedWorkId)) {
    prototypeState.selectedWorkId = works.find((work) => work.active)?.id || works[0].id;
  }

  const selectedWork = works.find((work) => work.id === prototypeState.selectedWorkId) || works[0];
  list.replaceChildren(...works.map((work, index) => createWorkListItem(work, index, work.id === selectedWork.id)));
  renderCurrentWork(selectedWork);
}

function createWorkListItem(work, index, selected) {
  const button = document.createElement("button");
  button.className = `work-item${selected ? " active" : ""}`;
  button.type = "button";
  button.dataset.workId = work.id;
  if (work.runId) {
    button.dataset.runId = work.runId;
  }

  const icon = document.createElement("span");
  icon.className = `work-icon${index % 3 === 1 ? " soft" : index % 3 === 2 ? " warm" : ""}`;
  icon.textContent = getWorkInitial(work, index);

  const body = document.createElement("span");
  body.append(createText("strong", localize(work.title, work.id)), createText("small", localize(work.description, work.state || "")));
  button.append(icon, body);
  button.addEventListener("click", () => {
    selectWorkbenchWork(work);
  });
  return button;
}

async function selectWorkbenchWork(work) {
  openConversationView();
  prototypeState.selectedWorkId = work.id;
  if (work.agentId) {
    prototypeState.selectedAgentId = work.agentId;
  }
  renderWorks(workbenchData?.works || []);
  renderAgents(workbenchData?.agents || []);

  if (!work.runId || !canUseWorkbenchApi()) {
    return;
  }

  try {
    const response = await fetch(getWorkbenchApiUrl(work.runId), { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.schemaVersion !== 1) {
      return;
    }
    workbenchData = data;
    prototypeState.selectedWorkId = work.id;
    prototypeState.selectedAgentId = data.selectedRun?.agentId || prototypeState.selectedAgentId;
    prototypeState.selectedArtifactId = "";
    prototypeState.selectedArtifactName = "";
    renderWorkbenchData();
  } catch {
    // Keep the current view; the local service may have stopped while the static prototype remains usable.
  }
}

function getSelectedWorkRunId() {
  const selectedWork = workbenchData?.works?.find((work) => work.id === prototypeState.selectedWorkId);
  return selectedWork?.runId || "";
}

function renderCurrentWork(work) {
  const dict = messages[currentLang] ?? messages.zh;
  const title = work ? localize(work.title, work.id) : dict.currentWork;
  const description = work ? localize(work.description, dict.localWorkspace) : dict.localWorkspace;

  document.querySelectorAll("[data-i18n='currentWork']").forEach((node) => {
    node.textContent = title;
  });

  const switcherDescription = document.querySelector(".work-switcher small");
  if (switcherDescription) {
    switcherDescription.textContent = description;
  }
}

function renderSettingsCenter() {
  const navRoot = document.querySelector("[data-settings-nav]");
  const contentRoot = document.querySelector("[data-settings-content]");
  if (!navRoot || !contentRoot) {
    return;
  }

  const settings = settingsState.settings;
  const dict = messages[currentLang] ?? messages.zh;
  const renderState = getSettingsModule().resolveSettingsRenderState(settingsState);
  if (renderState !== "ready") {
    navRoot.replaceChildren();
    contentRoot.replaceChildren(createSettingsStateCard(renderState, settingsState.error));
    return;
  }

  if (!settings.nav.some((item) => item.id === prototypeState.selectedSettingsSection)) {
    prototypeState.selectedSettingsSection = settings.nav[0]?.id || "overview";
    writeSettingsHash(prototypeState.selectedSettingsSection, { replace: true });
    return;
  }

  navRoot.replaceChildren(...settings.nav.map((item) => createSettingsNavButton(item)));
  contentRoot.replaceChildren(renderSettingsContent(settings));
}

function createSettingsStateCard(state, error) {
  const dict = messages[currentLang] ?? messages.zh;
  const keyMap = {
    loading: ["settingsLoadingTitle", "settingsLoadingDesc"],
    empty: ["settingsEmptyTitle", "settingsEmptyDesc"],
    error: ["settingsErrorTitle", "settingsErrorDesc"],
  };
  const [titleKey, descriptionKey] = keyMap[state] || keyMap.empty;
  const card = document.createElement("section");
  card.className = `settings-state-card ${state}`;
  card.setAttribute("aria-live", state === "loading" ? "polite" : "assertive");
  card.append(createText("strong", dict[titleKey]), createText("p", dict[descriptionKey]));
  if (error && state === "error") {
    card.append(createText("small", error));
  }
  if (state === "error") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost-button settings-retry-button";
    button.textContent = dict.settingsRetry;
    button.addEventListener("click", () => loadSettingsData({ force: true }));
    card.append(button);
  }
  return card;
}

function createSettingsNavButton(item) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `settings-nav-item${item.id === prototypeState.selectedSettingsSection ? " active" : ""}`;
  button.append(
    createText("strong", localize(item.title, item.id)),
    createText("small", localize(item.description, item.id)),
  );
  button.addEventListener("click", () => {
    writeSettingsHash(item.id);
  });
  return button;
}

function renderSettingsContent(settings) {
  const section = prototypeState.selectedSettingsSection;
  switch (section) {
    case "models":
      return createSettingsSection([
        createSettingsSectionHeader("providersHeading", "settingsOpenHint"),
        createSettingsCardGrid(settings.providers.map(createProviderCard)),
        createSettingsSectionHeader("modelRolesHeading"),
        createSettingsCardGrid(settings.modelRoles.map(createModelRoleCard)),
      ]);
    case "agent-context":
      return createSettingsSection([
        createSettingsSectionHeader("agentContextHeading", "settingsOpenHint"),
        createSettingsCardGrid((settings.agentContexts || []).map(createAgentContextCard)),
      ]);
    case "knowledge":
      return createSettingsSection([
        createSettingsSectionHeader("knowledgeHeading"),
        createSettingsCardGrid(settings.knowledgeBases.map(createKnowledgeCard)),
      ]);
    case "skills":
      return createSettingsSection([
        createSettingsSectionHeader("skillsHeading"),
        createSettingsCardGrid(settings.skills.map(createCapabilityCard)),
      ]);
    case "tools":
      return createSettingsSection([
        createSettingsSectionHeader("toolsHeading"),
        createSettingsCardGrid(settings.tools.map(createCapabilityCard)),
      ]);
    case "mcp":
      return createSettingsSection([
        createSettingsSectionHeader("mcpHeading"),
        createSettingsCardGrid(settings.mcpServers.map(createCapabilityCard)),
      ]);
    case "runtime":
      return createSettingsSection([
        createSettingsSectionHeader("runtimeHeading"),
        createSettingsCardGrid(settings.runtimePolicies.map(createRuntimePolicyCard)),
        createSettingsSectionHeader("agentDefaultsHeading"),
        createSettingsCardGrid(settings.agentDefaults.map(createAgentDefaultCard)),
      ]);
    case "overview":
    default:
      return createSettingsSection([
        createSettingsOverviewHero(settings.overview),
        createSettingsSectionHeader("settingsHighlights"),
        createSettingsCardGrid(settings.overview.highlights.map(createOverviewHighlightCard)),
      ]);
  }
}

function createSettingsSection(children) {
  const container = document.createElement("div");
  container.className = "settings-section";
  container.append(...children);
  return container;
}

function createSettingsSectionHeader(titleKey, noteKey) {
  const dict = messages[currentLang] ?? messages.zh;
  const block = document.createElement("div");
  block.className = "settings-section-head";
  block.append(createText("strong", dict[titleKey] || titleKey));
  if (noteKey) {
    block.append(createText("small", dict[noteKey] || noteKey));
  }
  return block;
}

function createSettingsOverviewHero(overview) {
  const card = document.createElement("section");
  card.className = "settings-hero-card";
  card.append(
    createText("strong", localize(overview.title, "")),
    createText("p", localize(overview.description, "")),
  );
  return card;
}

function createOverviewHighlightCard(item) {
  const card = document.createElement("article");
  card.className = "settings-card compact";
  card.append(
    createText("span", localize(item.label, "")),
    createText("strong", localize(item.value, "")),
    createText("p", localize(item.note, "")),
  );
  return card;
}

function createProviderCard(provider) {
  const card = document.createElement("article");
  card.className = "settings-card";
  const head = document.createElement("div");
  head.className = "settings-card-head";
  head.append(createText("strong", provider.name), createStatusBadge(provider.status, "provider"));

  card.append(
    head,
    createLabeledText("endpointLabel", provider.endpoint),
    createLabeledTags("providerDefaultFor", provider.defaultFor),
    createLabeledTags("providerModels", provider.models),
    createText("p", localize(provider.note, "")),
  );
  return card;
}

function createModelRoleCard(role) {
  const card = document.createElement("article");
  card.className = "settings-card";
  card.append(
    createText("strong", localize(role.title, role.id)),
    createText("p", localize(role.description, "")),
    createLabeledText("modelRoleMode", localize(role.defaultMode, "")),
    createLabeledText("model", role.defaultModel),
    createLabeledText("modelRoleFallback", localize(role.fallback, "")),
    createLabeledTags("modelRoleSignals", role.runtimeSignals),
  );
  return card;
}

function createKnowledgeCard(item) {
  const card = document.createElement("article");
  card.className = "settings-card";
  const head = document.createElement("div");
  head.className = "settings-card-head";
  head.append(createText("strong", localize(item.title, item.id)), createStatusBadge(item.state, "capability"));

  card.append(
    head,
    createLabeledText("embeddingRoleLabel", item.embeddingRole),
    createLabeledText("knowledgeChunk", localize(item.chunkStrategy, "")),
    createLabeledTags("knowledgeAgents", item.connectedAgents),
    createLabeledTags("knowledgeSources", item.sources),
    createLabeledText("knowledgeWriteBack", localize(item.writeBack, "")),
  );
  return card;
}

function createCapabilityCard(item) {
  const card = document.createElement("article");
  card.className = "settings-card";
  const head = document.createElement("div");
  head.className = "settings-card-head";
  head.append(createText("strong", localize(item.title, item.id)), createStatusBadge(item.state, "capability"));

  card.append(
    head,
    createLabeledText("scopeLabel", localize(item.scope, "")),
    createLabeledText("sourceLabel", localize(item.source, "")),
    createText("p", localize(item.note, "")),
  );
  return card;
}

function createRuntimePolicyCard(item) {
  const card = document.createElement("article");
  card.className = "settings-card";
  card.append(
    createText("strong", localize(item.title, item.id)),
    createText("p", localize(item.value, "")),
    createText("small", localize(item.note, "")),
  );
  return card;
}

function createAgentContextCard(item) {
  const card = document.createElement("article");
  card.className = "settings-card agent-context-card";
  card.append(
    createText("strong", `${localize(item.title, item.agentId)} · ${item.agentId}`),
    createText("p", localize(item.purpose, "")),
    createLabeledText("agentContextAssembly", localize(item.assemblyMode, "")),
    createLabeledTags("agentDefaultModels", item.modelRoles),
    createLabeledTags("agentDefaultKnowledge", item.knowledgeBases),
    createLabeledTags("agentDefaultSkills", item.skills),
    createLabeledTags("agentDefaultTools", item.tools),
    createLabeledTags("agentDefaultMcp", item.mcpServers),
    createLabeledTags("agentContextEvidence", item.runtimeEvidence),
    createLabeledText("agentContextArtifactPolicy", localize(item.artifactPolicy, "")),
    createText("small", localize(item.note, "")),
  );
  return card;
}

function createAgentDefaultCard(item) {
  const card = document.createElement("article");
  card.className = "settings-card";
  card.append(
    createText("strong", `${localize(item.title, item.agentId)} · ${item.agentId}`),
    createLabeledTags("agentDefaultModels", item.modelRoles),
    createLabeledTags("agentDefaultKnowledge", item.knowledgeBases),
    createLabeledTags("agentDefaultSkills", item.skills),
    createLabeledTags("agentDefaultTools", item.tools),
    createLabeledTags("agentDefaultMcp", item.mcpServers),
    createLabeledText("agentDefaultRuntime", localize(item.runtimeMode, "")),
  );
  return card;
}

function createSettingsCardGrid(cards) {
  const grid = document.createElement("div");
  grid.className = "settings-card-grid";
  grid.append(...cards);
  return grid;
}

function createLabeledText(labelKey, value) {
  const row = document.createElement("div");
  row.className = "settings-inline-block";
  row.append(createText("span", resolveSettingsLabel(labelKey)), createText("strong", value || "-"));
  return row;
}

function createLabeledTags(labelKey, values) {
  const row = document.createElement("div");
  row.className = "settings-inline-block";
  row.append(createText("span", resolveSettingsLabel(labelKey)));
  const tags = document.createElement("div");
  tags.className = "settings-tag-list";
  (Array.isArray(values) && values.length > 0 ? values : ["-"]).forEach((value) => {
    const tag = document.createElement("span");
    tag.className = "settings-tag";
    tag.textContent = value;
    tags.append(tag);
  });
  row.append(tags);
  return row;
}

function createStatusBadge(value, kind) {
  const badge = document.createElement("span");
  badge.className = "settings-badge";
  badge.dataset.variant = value;
  badge.textContent = kind === "provider" ? resolveProviderStatus(value) : resolveCapabilityState(value);
  return badge;
}

function resolveProviderStatus(value) {
  const dict = messages[currentLang] ?? messages.zh;
  const keyMap = {
    healthy: "statusHealthy",
    degraded: "statusDegraded",
    not_configured: "statusNotConfigured",
  };
  return dict[keyMap[value] || "notAvailable"] || value;
}

function resolveCapabilityState(value) {
  const dict = messages[currentLang] ?? messages.zh;
  const keyMap = {
    ready: "stateReady",
    draft: "stateDraft",
    enabled: "stateEnabled",
    review: "stateReview",
    planned: "statePlanned",
  };
  return dict[keyMap[value] || "notAvailable"] || value;
}

function resolveSettingsLabel(labelKey) {
  const dict = messages[currentLang] ?? messages.zh;
  return dict[labelKey] || labelKey;
}

function createListEmptyState(titleKey, descriptionKey) {
  const dict = messages[currentLang] ?? messages.zh;
  const state = document.createElement("div");
  state.className = "list-loading empty";
  state.append(createText("strong", dict[titleKey]), createText("small", dict[descriptionKey]));
  return state;
}

function getWorkInitial(work, index) {
  const title = localize(work.title, work.id).trim();
  if (!title) {
    return String(index + 1);
  }
  return title.slice(0, 1).toUpperCase();
}

function renderAgents(agents) {
  const list = document.querySelector("[data-agent-list]");
  if (!list) {
    return;
  }

  const visibleAgents = [
    {
      id: "meta/create-agent",
      title: { zh: messages.zh.agentMeta, en: messages.en.agentMeta },
      description: { zh: messages.zh.agentMetaDesc, en: messages.en.agentMetaDesc },
    },
    ...agents.filter((agent) => agent.id !== "meta/create-agent"),
  ];
  if (!prototypeState.selectedAgentId || !visibleAgents.some((agent) => agent.id === prototypeState.selectedAgentId)) {
    const currentRunAgentId = workbenchData?.selectedRun?.agentId;
    const runAgent = visibleAgents.find((agent) => agent.id === currentRunAgentId);
    const imageAgent = visibleAgents.find(
      (agent) => agent.id.startsWith("custom/") || agent.id.startsWith("image-gen/"),
    );
    prototypeState.selectedAgentId =
      runAgent?.id || imageAgent?.id || visibleAgents.find((agent) => agent.id !== "meta/create-agent")?.id || "meta/create-agent";
  }

  list.replaceChildren(
    ...visibleAgents.map((agent, index) => {
      const button = document.createElement("button");
      button.className = `agent-item${agent.id === prototypeState.selectedAgentId ? " active" : ""}`;
      button.type = "button";
      button.dataset.agentId = agent.id;

      const mark = document.createElement("span");
      mark.className = `agent-mark${index === 1 ? " dark" : index === 2 ? " blue" : ""}`;
      mark.textContent = getAgentInitial(agent);

      const body = document.createElement("span");
      body.append(createText("strong", localize(agent.title, agent.id)), createText("small", localize(agent.description, agent.id)));
      button.append(mark, body);
      button.addEventListener("click", () => {
        prototypeState.selectedAgentId = agent.id;
        document.querySelectorAll(".agent-item").forEach((node) => node.classList.toggle("active", node === button));
        syncRunAgentButton();
        renderActionHint();
      });
      return button;
    }),
  );
  syncRunAgentButton();
}

function renderArtifacts(artifacts) {
  const list = document.querySelector("[data-artifact-list]");
  if (!list) {
    return;
  }

  if (artifacts.length === 0) {
    list.replaceChildren(createEmptyArtifactState());
    return;
  }

  const selectedArtifact = getSelectedArtifact(artifacts);
  const tree = buildArtifactTree(artifacts.slice(0, 24));
  const root = createArtifactFolderRow(tree.rootName, 0, artifacts.length);
  list.replaceChildren(root, ...tree.children.flatMap((node) => renderArtifactTreeNode(node, selectedArtifact, 1)));
}

function createEmptyArtifactState() {
  const dict = messages[currentLang] ?? messages.zh;
  const state = document.createElement("article");
  state.className = "artifact-empty-state";
  state.append(createText("strong", dict.noArtifactsTitle), createText("small", dict.noArtifactsDesc));
  return state;
}

function selectArtifact(row, artifact) {
  prototypeState.selectedArtifactId = artifact.id || "";
  prototypeState.selectedArtifactName = artifact.name;
  document.querySelectorAll(".artifact-file-row").forEach((node) => node.classList.toggle("selected", node === row));
  updateArtifactDetail(artifact);
}

function buildArtifactTree(artifacts) {
  const entries = artifacts.map((artifact) => ({
    artifact,
    parts: getArtifactDisplayParts(artifact),
  }));
  const common = getCommonDirectoryParts(entries.map((entry) => entry.parts));
  const rootName = common.at(-1) || "agent-draft";
  const root = { folders: new Map(), files: [] };

  entries.forEach((entry) => {
    const relativeParts = entry.parts.slice(common.length);
    const parts = relativeParts.length > 0 ? relativeParts : [entry.artifact.name];
    insertArtifactNode(root, parts, entry.artifact);
  });

  return {
    rootName,
    children: sortArtifactNodes(root),
  };
}

function insertArtifactNode(root, parts, artifact) {
  let cursor = root;
  parts.forEach((part, index) => {
    const isFile = index === parts.length - 1;
    if (isFile) {
      cursor.files.push({ type: "file", name: part, artifact });
      return;
    }
    if (!cursor.folders.has(part)) {
      cursor.folders.set(part, { type: "folder", name: part, folders: new Map(), files: [] });
    }
    cursor = cursor.folders.get(part);
  });
}

function sortArtifactNodes(node) {
  const files = node.files.sort((a, b) => a.name.localeCompare(b.name));
  const folders = Array.from(node.folders.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((folder) => ({ ...folder, children: sortArtifactNodes(folder) }));
  return [...files, ...folders];
}

function renderArtifactTreeNode(node, selectedArtifact, depth) {
  if (node.type === "folder") {
    return [
      createArtifactFolderRow(node.name, depth, node.children.length),
      ...node.children.flatMap((child) => renderArtifactTreeNode(child, selectedArtifact, depth + 1)),
    ];
  }
  return [createArtifactFileRow(node.artifact, selectedArtifact, depth)];
}

function createArtifactFolderRow(name, depth, count) {
  const row = document.createElement("div");
  row.className = "artifact-folder-row";
  row.style.setProperty("--tree-depth", String(depth));
  row.append(createText("span", "▾"), createText("strong", name), createText("small", `${count}`));
  return row;
}

function createArtifactFileRow(artifact, selectedArtifact, depth) {
  const row = document.createElement("article");
  row.className = `artifact-row artifact-file-row${artifact.id === selectedArtifact?.id || (!selectedArtifact && depth === 1) ? " selected" : ""}`;
  row.style.setProperty("--tree-depth", String(depth));
  row.tabIndex = 0;
  row.setAttribute("role", "button");
  row.addEventListener("click", () => selectArtifact(row, artifact));
  row.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectArtifact(row, artifact);
    }
  });

  const file = document.createElement("span");
  file.className = "tree-file-icon";
  file.textContent = getFileGlyph(artifact);

  const body = document.createElement("span");
  body.append(
    createText("strong", artifact.name),
    createText("small", `${artifact.type.toUpperCase()} · ${formatBytes(artifact.sizeBytes)}`),
  );
  row.append(file, body);
  return row;
}

function getArtifactDisplayParts(artifact) {
  const source = artifact.path || artifact.url || artifact.name;
  const clean = decodeURIComponent(String(source).split("?")[0].split("#")[0]);
  const rawParts = clean.split(/[\\/]/).filter((part) => part && part !== "." && part !== "..");
  if (rawParts.length === 0) {
    return [artifact.name];
  }
  if (rawParts.at(-1) !== artifact.name) {
    rawParts.push(artifact.name);
  }
  return rawParts;
}

function getCommonDirectoryParts(paths) {
  const directories = paths.map((parts) => parts.slice(0, -1)).filter((parts) => parts.length > 0);
  if (directories.length === 0) {
    return [];
  }
  const common = [];
  const shortest = Math.min(...directories.map((parts) => parts.length));
  for (let index = 0; index < shortest; index += 1) {
    const value = directories[0][index];
    if (directories.every((parts) => parts[index] === value)) {
      common.push(value);
    } else {
      break;
    }
  }
  return common;
}

function updateArtifactDetail(artifact) {
  const detail = document.querySelector("[data-artifact-detail]");
  if (!detail) {
    return;
  }

  if (!artifact) {
    renderEmptyArtifactDetail(detail);
    return;
  }

  detail.classList.remove("empty-artifact-detail");
  detail.querySelector("[data-empty-artifact-note]")?.remove();
  const preview = detail.querySelector(".artifact-detail-preview");
  const title = detail.querySelector(".artifact-detail-body strong");
  const meta = detail.querySelector(".artifact-detail-body small");
  const codePanel = detail.querySelector(".artifact-code-panel");
  const code = detail.querySelector("[data-artifact-code]");
  const previewStatus = detail.querySelector("[data-artifact-preview-status]");

  if (preview) {
    preview.replaceChildren();
    detail.classList.toggle("image-artifact", isImageArtifact(artifact));
    if (isImageArtifact(artifact)) {
      const image = document.createElement("img");
      image.src = artifact.url;
      image.alt = artifact.name;
      preview.append(image);
    } else {
      const file = document.createElement("span");
      file.className = "file-preview large";
      file.textContent = getFileIconLabel(artifact);
      preview.append(file);
    }
  }

  if (title) {
    title.textContent = artifact.name;
  }
  if (meta) {
    meta.textContent = `${artifact.type.toUpperCase()} · ${formatBytes(artifact.sizeBytes)} · ${messages[currentLang].generatedFromRun}`;
  }

  loadArtifactPreview(artifact, { codePanel, code, previewStatus });
  setArtifactActionDisabled(false);
  syncInstallButton();
  syncRunAgentButton();
}

function renderEmptyArtifactDetail(detail) {
  const dict = messages[currentLang] ?? messages.zh;
  const preview = detail.querySelector(".artifact-detail-preview");
  const title = detail.querySelector(".artifact-detail-body strong");
  const meta = detail.querySelector(".artifact-detail-body small");
  const codePanel = detail.querySelector(".artifact-code-panel");
  const code = detail.querySelector("[data-artifact-code]");
  const previewStatus = detail.querySelector("[data-artifact-preview-status]");

  detail.classList.remove("image-artifact");
  detail.classList.add("empty-artifact-detail");
  preview?.replaceChildren(createText("span", "TRACE"));
  if (title) {
    title.textContent = dict.noArtifactsTitle;
  }
  if (meta) {
    meta.textContent = dict.noArtifactsDesc;
  }
  if (codePanel) {
    codePanel.hidden = true;
  }
  if (code) {
    code.textContent = "";
  }
  if (previewStatus) {
    previewStatus.textContent = "";
  }
  renderEmptyArtifactNote(detail, dict);
  setArtifactActionDisabled(true);
  syncInstallButton();
  syncRunAgentButton();
}

function renderEmptyArtifactNote(detail, dict) {
  const body = detail.querySelector(".artifact-detail-body");
  if (!body) {
    return;
  }
  body.querySelector("[data-empty-artifact-note]")?.remove();
  const note = document.createElement("div");
  note.className = "empty-artifact-note";
  note.dataset.emptyArtifactNote = "true";
  note.append(createText("strong", dict.trace), createText("small", dict.noArtifactsTraceHint));
  body.append(note);
}

function setArtifactActionDisabled(disabled) {
  document.querySelector("[data-open-artifact]")?.toggleAttribute("disabled", disabled);
  document.querySelector("[data-use-artifact-context]")?.toggleAttribute("disabled", disabled);
}

async function loadArtifactPreview(artifact, nodes) {
  const dict = messages[currentLang] ?? messages.zh;
  const requestId = ++prototypeState.previewRequestId;
  const { codePanel, code, previewStatus } = nodes;
  if (!codePanel || !code || !previewStatus) {
    return;
  }

  if (isImageArtifact(artifact)) {
    codePanel.hidden = true;
    code.textContent = "";
    previewStatus.textContent = "";
    return;
  }

  codePanel.hidden = false;
  if (!canUseWorkbenchApi() || !artifact.id) {
    code.textContent = dict.previewStaticHint;
    previewStatus.textContent = "";
    return;
  }

  code.textContent = dict.loadingPreview;
  previewStatus.textContent = "";
  try {
    const response = await fetch(`/api/artifact-content?id=${encodeURIComponent(artifact.id)}`, { cache: "no-store" });
    const data = await response.json();
    if (requestId !== prototypeState.previewRequestId) {
      return;
    }
    if (!response.ok || !data?.ok) {
      code.textContent = data?.error || dict.installFailed;
      return;
    }
    if (data.binary) {
      code.textContent = dict.binaryPreviewUnavailable;
      return;
    }
    code.textContent = data.text || "";
    previewStatus.textContent = data.truncated ? dict.previewTruncated : "";
  } catch {
    if (requestId === prototypeState.previewRequestId) {
      code.textContent = dict.previewStaticHint;
    }
  }
}

async function installAgentDraftFromCurrentRun() {
  const dict = messages[currentLang] ?? messages.zh;
  if (!canUseWorkbenchApi() || !workbenchData?.selectedRun?.id || prototypeState.isInstalling) {
    setInstallStatus(dict.installApiUnavailable, "warning");
    return;
  }

  prototypeState.isInstalling = true;
  syncInstallButton();
  setInstallStatus(dict.installingAgent, "info");

  try {
    const response = await fetch("/api/meta/install-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId: workbenchData.selectedRun.id }),
    });
    if (response.status === 404 || response.status === 405) {
      setInstallStatus(dict.installApiUnavailable, "warning");
      return;
    }

    let data = null;
    try {
      data = await response.json();
    } catch {
      setInstallStatus(dict.installFailed, "error");
      return;
    }

    if (response.status === 409 || data?.code === "agent_exists") {
      setInstallStatus(formatInstallConflict(data, dict), "warning");
      return;
    }
    if (!response.ok || !data?.ok) {
      setInstallStatus(data?.error || dict.installFailed, "error");
      return;
    }
    if (data.workbench) {
      workbenchData = data.workbench;
      prototypeState.selectedAgentId = data.result?.agentId || prototypeState.selectedAgentId;
      renderWorkbenchData();
    }
    setInstallStatus(dict.installSucceeded, "success");
  } catch {
    setInstallStatus(dict.installFailed, "error");
  } finally {
    prototypeState.isInstalling = false;
    syncInstallButton();
  }
}

function formatInstallConflict(data, dict) {
  const parts = [dict.installConflict];
  if (data?.agentId) {
    parts.push(data.agentId);
  }
  if (data?.targetPath) {
    parts.push(data.targetPath);
  }
  parts.push(dict.installConflictAction);
  return parts.join("\n");
}

function syncInstallButton() {
  const button = document.querySelector("[data-install-agent]");
  if (!button) {
    return;
  }
  const dict = messages[currentLang] ?? messages.zh;
  const canInstall = isMetaAgentRun(workbenchData?.selectedRun);
  button.textContent = prototypeState.isInstalling ? dict.installingAgent : dict.installAgent;
  button.disabled = prototypeState.isInstalling || !canInstall;
  button.title = !canUseWorkbenchApi()
    ? dict.installApiUnavailable
    : canInstall
      ? dict.actionHintMetaDraft
      : dict.actionHintInstalledAgent;
}

async function runSelectedAgentFromWorkbench() {
  const dict = messages[currentLang] ?? messages.zh;
  const agentId = prototypeState.selectedAgentId;
  if (!canUseWorkbenchApi()) {
    setInstallStatus(dict.runAgentApiUnavailable, "warning");
    return;
  }
  if (!agentId || agentId === "meta/create-agent") {
    setInstallStatus(dict.runAgentNoSelection, "warning");
    return;
  }
  if (prototypeState.isRunningAgent) {
    return;
  }

  prototypeState.isRunningAgent = true;
  syncRunAgentButton();
  setInstallStatus(dict.runningAgent, "info");

  try {
    const runOptions = getAgentRunOptions();
    const response = await fetch("/api/agent/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId,
        prompt: getRunPrompt(),
        count: runOptions.count,
        size: "1024x1024",
        style: "realistic",
        rawPrompt: true,
        dryRun: runOptions.dryRun,
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      setInstallStatus(data?.error || dict.runAgentFailed, "error");
      return;
    }
    if (data.workbench) {
      workbenchData = data.workbench;
      prototypeState.selectedAgentId = agentId;
      prototypeState.selectedArtifactId = "";
      prototypeState.selectedArtifactName = "";
      renderWorkbenchData();
      setActiveInspectorTab("trace");
    }
    setInstallStatus(runOptions.dryRun ? dict.runAgentSucceeded : dict.runAgentRealSucceeded, "success");
  } catch {
    setInstallStatus(dict.runAgentFailed, "error");
  } finally {
    prototypeState.isRunningAgent = false;
    syncRunAgentButton();
  }
}

function syncRunAgentButton() {
  const button = document.querySelector("[data-run-agent]");
  if (!button) {
    return;
  }
  const dict = messages[currentLang] ?? messages.zh;
  const disabled =
    prototypeState.isRunningAgent ||
    !canUseWorkbenchApi() ||
    !prototypeState.selectedAgentId ||
    prototypeState.selectedAgentId === "meta/create-agent";
  button.textContent = prototypeState.isRunningAgent ? dict.runningAgent : dict.runAgent;
  button.disabled = disabled;
  button.title = !canUseWorkbenchApi()
    ? dict.runAgentApiUnavailable
    : disabled
      ? dict.actionHintSelectAgent
      : dict.actionHintInstalledAgent;
  document.querySelector("[data-run-real]")?.toggleAttribute("disabled", disabled);
  document.querySelector("[data-run-count]")?.toggleAttribute("disabled", disabled);
}

function renderActionHint() {
  if (prototypeState.isInstalling || prototypeState.isRunningAgent) {
    return;
  }

  const dict = messages[currentLang] ?? messages.zh;
  const selectedAgentId = prototypeState.selectedAgentId;
  if (!canUseWorkbenchApi()) {
    setInstallStatus(dict.installApiUnavailable, "hint");
    return;
  }
  if (isMetaAgentRun(workbenchData?.selectedRun)) {
    setInstallStatus(dict.actionHintMetaDraft, "hint");
    return;
  }
  if (selectedAgentId && selectedAgentId !== "meta/create-agent") {
    setInstallStatus(dict.actionHintInstalledAgent, "hint");
    return;
  }
  setInstallStatus(dict.actionHintSelectAgent, "hint");
}

function getRunPrompt() {
  const textarea = document.querySelector(".composer textarea");
  const promptNode = document.querySelector("[data-i18n='userAsk']");
  return textarea?.value.trim() || promptNode?.textContent?.trim() || messages.zh.userAsk;
}

function getAgentRunOptions() {
  const realRun = document.querySelector("[data-run-real]");
  const countInput = document.querySelector("[data-run-count]");
  const count = Number(countInput?.value);
  return {
    dryRun: !realRun?.checked,
    count: Number.isFinite(count) && count > 0 ? Math.min(Math.floor(count), 12) : 1,
  };
}

async function openCurrentRunTrace() {
  const dict = messages[currentLang] ?? messages.zh;
  const runId = workbenchData?.selectedRun?.id;
  if (!runId || !canUseWorkbenchApi()) {
    setRunDetailStatus(dict.openTraceApiUnavailable, "warning");
    return;
  }

  setRunDetailStatus(dict.loadingPreview, "info");
  try {
    const response = await fetch("/api/run/open-trace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      setRunDetailStatus(data?.error || dict.openTraceFailed, "error");
      return;
    }
    setRunDetailStatus(dict.openTraceSucceeded, "success");
  } catch {
    setRunDetailStatus(dict.openTraceFailed, "error");
  }
}

async function openSelectedArtifact() {
  const dict = messages[currentLang] ?? messages.zh;
  const artifact = getSelectedArtifact(currentArtifacts);
  if (!artifact?.id || !canUseWorkbenchApi()) {
    setInstallStatus(dict.artifactApiUnavailable, "warning");
    return;
  }

  setInstallStatus(messages[currentLang].loadingPreview, "info");
  try {
    const response = await fetch("/api/artifact/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artifactId: artifact.id }),
    });
    if (response.status === 404 || response.status === 405 || response.status === 501) {
      setInstallStatus(dict.artifactApiUnavailable, "warning");
      return;
    }

    let data = null;
    try {
      data = await response.json();
    } catch {
      setInstallStatus(dict.openFailed, "error");
      return;
    }

    setInstallStatus(response.ok && data?.ok ? dict.openSucceeded : data?.error || dict.openFailed, response.ok && data?.ok ? "success" : "error");
  } catch {
    setInstallStatus(dict.openFailed, "error");
  }
}

function useSelectedArtifactAsContext() {
  const dict = messages[currentLang] ?? messages.zh;
  const artifact = getSelectedArtifact(currentArtifacts);
  if (!artifact) {
    return;
  }
  setInstallStatus(dict.contextQueued, "success");
}

function setInstallStatus(text, variant) {
  const status = document.querySelector("[data-install-status]");
  if (!status) {
    return;
  }
  status.textContent = text;
  status.dataset.variant = variant || "";
}

function setRunDetailStatus(text, variant) {
  const status = document.querySelector("[data-run-detail-status]");
  if (!status) {
    return;
  }
  status.textContent = text;
  status.dataset.variant = variant || "";
}

function appendDemoExchange() {
  const scroll = document.querySelector("[data-message-scroll]");
  const textarea = document.querySelector(".composer textarea");
  if (!scroll) {
    return;
  }

  const value = textarea?.value.trim() || messages[currentLang].sentMessage;
  scroll.append(createMessage("user", messages[currentLang].you, value));
  scroll.append(createMessage("agent", "Moyu", messages[currentLang].queuedReply));
  if (textarea) {
    textarea.value = "";
    textarea.dispatchEvent(new Event("input"));
  }
  scroll.scrollTop = scroll.scrollHeight;
}

function createMessage(kind, author, text, options = {}) {
  const article = document.createElement("article");
  article.className = `message ${kind === "user" ? "user-message" : "agent-message"} new-message`;
  if (options.stateMessage) {
    article.setAttribute("data-state-message", "true");
  }

  const avatar = document.createElement("div");
  avatar.className = `avatar-bubble${kind === "agent" ? " moyu" : ""}`;
  avatar.textContent = kind === "agent" ? "墨" : "Z";

  const body = document.createElement("div");
  body.className = "message-body";
  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.append(createText("strong", author), createText("span", getCurrentTime()));
  body.append(meta, createText("p", text));
  article.append(avatar, body);
  return article;
}

function renderConversationArtifacts(artifacts) {
  const strip = document.querySelector("[data-conversation-artifacts]");
  if (!strip) {
    return;
  }

  if (artifacts.length === 0) {
    strip.replaceChildren(createEmptyMiniArtifact());
    return;
  }

  strip.replaceChildren(
    ...artifacts.slice(0, 3).map((artifact, index) => {
      const card = document.createElement("article");
      card.className = `mini-artifact${index === 0 ? " selected" : ""}`;

      if (isImageArtifact(artifact)) {
        const image = document.createElement("img");
        image.src = artifact.url;
        image.alt = "";
        card.append(image);
      } else {
        const file = document.createElement("span");
        file.className = "file-preview";
        file.textContent = getFileIconLabel(artifact);
        card.append(file);
      }

      card.append(createText("strong", artifact.name), createText("small", `${artifact.type.toUpperCase()} · ${formatBytes(artifact.sizeBytes)}`));
      return card;
    }),
  );
}

function createEmptyMiniArtifact() {
  const dict = messages[currentLang] ?? messages.zh;
  const card = document.createElement("article");
  card.className = "mini-artifact selected artifact-empty-mini";
  const preview = document.createElement("span");
  preview.className = "file-preview";
  preview.textContent = "TRACE";
  card.append(preview, createText("strong", dict.noArtifactsTitle), createText("small", dict.noArtifactsDesc));
  return card;
}

function localize(value, fallback) {
  if (!value || typeof value !== "object") {
    return fallback;
  }
  return value[currentLang] || value.zh || value.en || fallback;
}

function getAgentInitial(agent) {
  const title = localize(agent.title, agent.id);
  return title.trim().slice(0, 1).toUpperCase();
}

function isImageArtifact(artifact) {
  return /image|png|jpe?g|webp|gif/i.test(artifact.type || artifact.name || "");
}

function getFileIconLabel(artifact) {
  const extension = getExtension(artifact.name) || artifact.type;
  return String(extension || "FILE").slice(0, 4).toUpperCase();
}

function getFileGlyph(artifact) {
  const extension = getExtension(artifact.name) || artifact.type;
  if (/ya?ml/i.test(extension)) {
    return "Y";
  }
  if (/tsx?|jsx?/i.test(extension)) {
    return "T";
  }
  if (/json/i.test(extension)) {
    return "{}";
  }
  if (/md|markdown/i.test(extension)) {
    return "M";
  }
  if (/patch|diff/i.test(extension)) {
    return "±";
  }
  return "•";
}

function getExtension(fileName) {
  if (!fileName || !fileName.includes(".")) {
    return "";
  }
  return fileName.split(".").pop();
}

function formatDuration(durationMs) {
  if (typeof durationMs !== "number") {
    return "-";
  }
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString(currentLang === "en" ? "en-US" : "zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatBytes(sizeBytes) {
  if (typeof sizeBytes !== "number") {
    return messages[currentLang].unknownSize;
  }
  if (sizeBytes < 1024) {
    return `${sizeBytes}B`;
  }
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)}KB`;
  }
  return `${(sizeBytes / 1024 / 1024).toFixed(1)}MB`;
}

function createText(tagName, text) {
  const node = document.createElement(tagName);
  node.textContent = text;
  return node;
}

function getCurrentTime() {
  return new Intl.DateTimeFormat(currentLang === "en" ? "en-US" : "zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
