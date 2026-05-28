const messages = {
  zh: {
    currentWork: "制作智能体平台介绍 PPT",
    localWorkspace: "本地工作区 / moyu",
    engineRunning: "本地引擎运行中",
    moyuStudio: "Moyu Studio",
    codeDriven: "代码驱动的智能体工作台",
    works: "任务",
    agents: "Agents",
    searchWorks: "搜索任务...",
    searchAgents: "搜索 Agent...",
    pptWork: "制作平台介绍 PPT",
    pptWorkDesc: "4 个产物 · 等待确认大纲",
    visualWork: "品牌视觉探索",
    visualWorkDesc: "生图 Agent · 已完成",
    researchWork: "竞品资料整理",
    researchWorkDesc: "研究 Agent · 进行中",
    newWork: "新建任务",
    agentImage: "生图原型 Agent",
    agentImageDesc: "生成图片、界面概念与品牌视觉",
    agentDoc: "文档整理 Agent",
    agentDocDesc: "整理需求、Trace 与产物说明",
    agentCode: "代码执行 Agent",
    agentCodeDesc: "运行命令、生成代码并验证结果",
    settings: "设置",
    runtimeReady: "Moyu Core 0.3.1 已连接",
    workSession: "任务会话",
    share: "分享",
    run: "运行",
    progressContent: "内容稿",
    progressVisual: "背景图",
    progressOutline: "大纲",
    progressDeck: "完整 PPT",
    you: "你",
    userAsk: "帮我制作一份 Moyu 智能体平台介绍 PPT。先整理内容，再生成背景图，最后输出完整 PPT。",
    agentPlanIntro:
      "我会把这个任务拆成一组可追踪的交付步骤，每一步都可以调用专门 Agent，并把产物沉淀在当前任务里。",
    planMd: "整理 Markdown 内容稿",
    planImage: "生成 PPT 背景图",
    planOutline: "输出 PPT 大纲",
    planDeck: "生成完整 PPT",
    orchestrationTitle: "代码编排正在运行",
    orchestrationDesc:
      "这个任务不是画布节点流，而是由 Recipe 和 Agent 代码串联：文档 Agent 产出内容稿，生图 Agent 生成视觉素材，演示文稿 Agent 汇总为 PPT。",
    recipeFile: "Recipe",
    callPolicy: "调用策略",
    callPolicyValue: "串行执行，关键节点等待确认",
    imageAgent: "生图 Agent",
    imageAgentResult: "背景视觉已生成 3 张，我建议选第一张作为主视觉，并继续生成封面与章节页版式。",
    checkpoint: "需要确认",
    checkpointTitle: "是否使用“墨鱼主视觉 + 代码运行平台”作为 PPT 主线？",
    checkpointDesc: "确认后我会继续调用图片 Agent 生成章节页背景，再调用演示文稿 Agent 输出完整 PPT。",
    approve: "确认继续",
    adjust: "调整方向",
    composerHint: "可直接描述任务，也可以指定 Agent 或引用已有产物",
    messageInput: "消息输入",
    composerPlaceholder: "告诉 Moyu 下一步要做什么...",
    selectedAgent: "当前：自动选择 Agent",
    send: "发送",
    sentMessage: "继续按这个方向生成封面页和章节页背景，并把结果放进当前任务。",
    queuedReply: "已收到，我会继续调用生图 Agent 生成封面页和章节页背景。新的产物会出现在右侧检查器里。",
    inspector: "检查器",
    currentWorkArtifacts: "当前任务的产物与运行上下文",
    artifacts: "产物",
    trace: "Trace",
    context: "上下文",
    details: "详情",
    draftContent: "内容稿",
    traceStarted: "任务启动",
    traceAgentCall: "调用文档 Agent",
    traceImageCall: "调用生图 Agent",
    traceCheckpoint: "等待用户确认",
    workspace: "工作区",
    contextFiles: "上下文文件",
    policy: "运行策略",
    policyValue: "自动路由 Agent，关键节点人工确认",
    recipe: "Recipe",
    workId: "任务 ID",
    state: "状态",
    waitingConfirm: "等待确认",
    model: "模型",
    duration: "累计耗时",
    openTrace: "打开原始 Trace",
    unknownSize: "未知大小",
    currentTask: "当前任务",
    generatedFromRun: "来自运行",
    completed: "已完成",
    selectedArtifact: "已选择产物",
    open: "打开",
    useAsContext: "作为上下文",
  },
  en: {
    currentWork: "Create Moyu Platform Intro Deck",
    localWorkspace: "Local workspace / moyu",
    engineRunning: "Local engine running",
    moyuStudio: "Moyu Studio",
    codeDriven: "Code-driven agent workbench",
    works: "Works",
    agents: "Agents",
    searchWorks: "Search works...",
    searchAgents: "Search agents...",
    pptWork: "Create platform intro deck",
    pptWorkDesc: "4 artifacts · waiting for outline approval",
    visualWork: "Brand visual exploration",
    visualWorkDesc: "Image Agent · completed",
    researchWork: "Competitor research",
    researchWorkDesc: "Research Agent · running",
    newWork: "New Work",
    agentImage: "Image Prototype Agent",
    agentImageDesc: "Generate images, UI concepts, and brand visuals",
    agentDoc: "Documentation Agent",
    agentDocDesc: "Organize requirements, traces, and artifact notes",
    agentCode: "Code Execution Agent",
    agentCodeDesc: "Run commands, generate code, and verify results",
    settings: "Settings",
    runtimeReady: "Moyu Core 0.3.1 connected",
    workSession: "Work Session",
    share: "Share",
    run: "Run",
    progressContent: "Content",
    progressVisual: "Visuals",
    progressOutline: "Outline",
    progressDeck: "Full deck",
    you: "You",
    userAsk: "Help me create an intro deck for the Moyu agent platform. Draft the content, generate backgrounds, then produce the full deck.",
    agentPlanIntro:
      "I will split this into traceable delivery steps. Each step can call a specialist Agent, and every artifact stays attached to this work session.",
    planMd: "Draft Markdown content",
    planImage: "Generate deck backgrounds",
    planOutline: "Create deck outline",
    planDeck: "Generate full deck",
    orchestrationTitle: "Code orchestration is running",
    orchestrationDesc:
      "This is not a node canvas. A Recipe and Agent code coordinate the work: Documentation Agent drafts content, Image Agent creates visuals, and Presentation Agent assembles the deck.",
    recipeFile: "Recipe",
    callPolicy: "Call policy",
    callPolicyValue: "Run serially with human checkpoints",
    imageAgent: "Image Agent",
    imageAgentResult: "Three background visuals are ready. I recommend the first as the hero direction, then generating cover and section layouts.",
    checkpoint: "Needs confirmation",
    checkpointTitle: "Use “cuttlefish visual + code runtime platform” as the main deck narrative?",
    checkpointDesc: "After approval I will call the Image Agent for section backgrounds, then the Presentation Agent for the full deck.",
    approve: "Approve",
    adjust: "Adjust",
    composerHint: "Describe a task, mention an Agent, or reference an artifact",
    messageInput: "Message input",
    composerPlaceholder: "Tell Moyu what to do next...",
    selectedAgent: "Current: auto-select Agent",
    send: "Send",
    sentMessage: "Continue in this direction and generate cover plus section backgrounds inside the current work.",
    queuedReply: "Got it. I will call the Image Agent for cover and section backgrounds. New artifacts will appear in the inspector.",
    inspector: "Inspector",
    currentWorkArtifacts: "Artifacts and runtime context for this work",
    artifacts: "Artifacts",
    trace: "Trace",
    context: "Context",
    details: "Details",
    draftContent: "Content draft",
    traceStarted: "Work started",
    traceAgentCall: "Called Documentation Agent",
    traceImageCall: "Called Image Agent",
    traceCheckpoint: "Waiting for confirmation",
    workspace: "Workspace",
    contextFiles: "Context files",
    policy: "Run policy",
    policyValue: "Auto-route Agents with human checkpoints",
    recipe: "Recipe",
    workId: "Work ID",
    state: "State",
    waitingConfirm: "Waiting for confirmation",
    model: "Model",
    duration: "Total duration",
    openTrace: "Open raw Trace",
    unknownSize: "unknown size",
    currentTask: "Current work",
    generatedFromRun: "From run",
    completed: "Completed",
    selectedArtifact: "Selected artifact",
    open: "Open",
    useAsContext: "Use as context",
  },
};

const layout = document.querySelector("[data-layout]");
const paneLimits = {
  left: { min: 220, max: 420, fallback: 292 },
  right: { min: 300, max: 460, fallback: 340 },
};
let currentLang = localStorage.getItem("moyu.prototype.lang") || "zh";
let workbenchData = null;

applySavedLayout();
bindLanguage();
bindTabs();
bindCollapse();
bindResizers();
bindComposer();
bindStaticSelection();
applyLanguage(currentLang);
loadWorkbenchData();

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
      if (window.matchMedia("(max-width: 1080px)").matches) {
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
          setPaneWidth("right", clamp(window.innerWidth - moveEvent.clientX, paneLimits.right.min, paneLimits.right.max));
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
  if (!layout || window.matchMedia("(max-width: 1080px)").matches) {
    return;
  }

  const rightWidth = readPaneWidth("right");
  const leftWidth = layout.classList.contains("left-collapsed") ? 0 : readPaneWidth("left");
  const availableCenter = window.innerWidth - leftWidth - rightWidth - 14;

  if (availableCenter < 620 && !layout.classList.contains("right-collapsed")) {
    layout.classList.add("right-collapsed");
    localStorage.setItem("moyu.prototype.right-collapsed", "1");
  } else if (changedSide === "right" && availableCenter >= 700) {
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
    return limits.fallback;
  }
  return clamp(parsed, limits.min, limits.max);
}

function bindComposer() {
  const composer = document.querySelector(".composer");
  const textarea = document.querySelector(".composer textarea");
  const sendButton = document.querySelector("[data-send-message]");

  textarea?.addEventListener("focus", () => composer?.classList.add("focused"));
  textarea?.addEventListener("blur", () => composer?.classList.remove("focused"));
  textarea?.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      appendDemoExchange();
    }
  });
  sendButton?.addEventListener("click", appendDemoExchange);
}

function bindStaticSelection() {
  document.querySelectorAll(".work-item, .agent-item").forEach((item) => {
    item.addEventListener("click", () => {
      const selector = item.classList.contains("work-item") ? ".work-item" : ".agent-item";
      document.querySelectorAll(selector).forEach((node) => node.classList.toggle("active", node === item));
    });
  });
}

async function loadWorkbenchData() {
  try {
    const response = await fetch("./data/workbench.json", { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    if (data && data.schemaVersion === 1) {
      workbenchData = data;
      renderWorkbenchData();
    }
  } catch {
    // The prototype still works as a static mock when exported runtime data is absent.
  }
}

function renderWorkbenchData() {
  if (!workbenchData) {
    return;
  }

  const artifacts = Array.isArray(workbenchData.artifacts) ? workbenchData.artifacts : [];
  const run = workbenchData.selectedRun;
  const prompt = run?.prompt;

  renderAgents(workbenchData.agents || []);
  renderArtifacts(artifacts);
  renderConversationArtifacts(artifacts);
  updateArtifactDetail(artifacts[0] || null);
  renderTimeline(run);

  if (prompt) {
    const ask = document.querySelector("[data-i18n='userAsk']");
    if (ask) {
      ask.textContent = prompt;
    }
  }
}

function renderAgents(agents) {
  const list = document.querySelector("[data-agent-list]");
  if (!list || agents.length === 0) {
    return;
  }

  list.replaceChildren(
    ...agents.map((agent, index) => {
      const button = document.createElement("button");
      button.className = `agent-item${index === 0 ? " active" : ""}`;
      button.type = "button";

      const mark = document.createElement("span");
      mark.className = `agent-mark${index === 1 ? " dark" : index === 2 ? " blue" : ""}`;
      mark.textContent = getAgentInitial(agent);

      const body = document.createElement("span");
      body.append(createText("strong", localize(agent.title, agent.id)), createText("small", localize(agent.description, agent.id)));
      button.append(mark, body);
      return button;
    }),
  );
}

function renderArtifacts(artifacts) {
  const list = document.querySelector("[data-artifact-list]");
  if (!list || artifacts.length === 0) {
    return;
  }

  list.replaceChildren(
    ...artifacts.slice(0, 12).map((artifact, index) => {
      const row = document.createElement("article");
      row.className = `artifact-row${index === 0 ? " selected" : ""}`;
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      row.addEventListener("click", () => selectArtifact(row, artifact));
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectArtifact(row, artifact);
        }
      });

      if (isImageArtifact(artifact)) {
        const image = document.createElement("img");
        image.src = artifact.url;
        image.alt = "";
        row.append(image);
      } else {
        const file = document.createElement("span");
        file.className = "file-preview";
        file.textContent = getFileIconLabel(artifact);
        row.append(file);
      }

      const body = document.createElement("span");
      body.append(
        createText("strong", artifact.name),
        createText("small", `${artifact.type.toUpperCase()} · ${formatBytes(artifact.sizeBytes)} · ${messages[currentLang].currentTask}`),
      );
      row.append(body);
      return row;
    }),
  );
}

function selectArtifact(row, artifact) {
  document.querySelectorAll(".artifact-row").forEach((node) => node.classList.toggle("selected", node === row));
  updateArtifactDetail(artifact);
}

function updateArtifactDetail(artifact) {
  const detail = document.querySelector("[data-artifact-detail]");
  if (!detail || !artifact) {
    return;
  }

  const preview = detail.querySelector(".artifact-detail-preview");
  const title = detail.querySelector(".artifact-detail-body strong");
  const meta = detail.querySelector(".artifact-detail-body small");

  if (preview) {
    preview.replaceChildren();
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
  }
  scroll.scrollTop = scroll.scrollHeight;
}

function createMessage(kind, author, text) {
  const article = document.createElement("article");
  article.className = `message ${kind === "user" ? "user-message" : "agent-message"} new-message`;

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
  if (!strip || artifacts.length === 0) {
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

function renderTimeline(run) {
  if (!run || !Array.isArray(run.steps) || run.steps.length === 0) {
    return;
  }

  const timeline = document.querySelector("[data-timeline]");
  if (!timeline) {
    return;
  }

  timeline.replaceChildren(
    ...run.steps.map((step, index) => {
      const item = document.createElement("li");
      item.className = index === run.steps.length - 1 ? "active" : "done";
      const dot = document.createElement("span");
      const body = document.createElement("div");
      body.append(createText("strong", step.name), createText("small", step.state));
      item.append(dot, body, createText("em", formatDuration(step.durationMs)));
      return item;
    }),
  );
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
  const extension = artifact.name.includes(".") ? artifact.name.split(".").pop() : artifact.type;
  return String(extension || "FILE").slice(0, 4).toUpperCase();
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
