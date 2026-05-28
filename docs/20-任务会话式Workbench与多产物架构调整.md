# 20. 任务会话式 Workbench 与多产物架构调整

> 状态：v0.1 设计修正  
> 日期：2026-05-28  
> 背景：当前 Workbench 原型过度强调“当前产物预览”，容易把 Moyu 误解为 Artifact Viewer。实际产品应以“用户要完成的一件工作”为中心，通过对话驱动 Agent / 子 Agent / Tool 执行，并在过程中产生多个版本化产物。

## 1. 核心结论

Workbench 的中心不应该是“当前产物是什么”，而应该是：

**一个任务会话（Work Session）的对话与执行流。**

Moyu 的第一屏应更接近 Codex / Cursor / Claude Code 这类“对话 + 执行 + 右侧检查器”的工作台：

- 左侧：可收起，显示任务会话、Agent、项目入口。
- 中间：对话主线，用户和 Agent 围绕一个目标持续交互。
- 右侧：可收起，显示当前任务的 Artifacts、Trace、上下文、运行状态。

Artifact 不是中心对象，而是任务会话中的结果集合。

## 2. 概念边界重新定义

### 2.1 Workspace

Workspace 不是用户日常操作的第一层业务概念。

它是一个本地数据边界，类似：

- 本地根目录
- 模型 Key / Provider 配置范围
- 数据库与 artifacts 存储范围
- 权限、沙箱、缓存、日志的隔离范围

因此，Workspace 不应该在主界面左侧占据高频位置。它更适合放在顶栏或设置里作为当前环境：

```text
当前 Workspace: moyu-local
路径: ~/Moyu/workspaces/default
```

### 2.2 Project

Project 是用户组织工作的业务容器，例如：

- “公司官网改版”
- “XX 招标文件”
- “2026 产品发布 PPT”
- “Moyu UI 设计”

一个 Project 下可以有多个 Work。

### 2.3 Work / Task

Work 是 Moyu 的核心业务对象，表示“用户想完成的一件事”。

示例：

- “帮我做一份 20 页的产品介绍 PPT”
- “基于这份招标文件生成技术标”
- “帮我重构这个模块并补测试”
- “为这个 Agent 生成 3 版 UI 概念图”

一个 Work 包含：

- Conversation：用户与 Agent 的多轮对话
- Runs：一次或多次执行
- Artifacts：过程中生成的所有产物
- Context：输入文件、引用资料、用户补充信息
- Decisions：用户确认、选择、打回、重试记录

### 2.4 Run

Run 是某次实际执行。

一个 Work 可以有多个 Run：

- 第一次生成大纲
- 第二次补充资料后继续生成
- 第三次重新生成封面图
- 第四次导出最终 PPT

Run 可以是短任务，也可以是长任务。

### 2.5 Step

Step 是 Run 内的可观察执行单元：

- 调用模型
- 调用工具
- 调用 Skill
- 调用另一个 Agent
- 写出 Artifact
- 等待用户确认

子 Agent 调用不是特殊例外，应作为 Step 的一种类型记录：

```ts
type StepKind =
  | "llm"
  | "tool"
  | "skill"
  | "agent_call"
  | "control"
  | "user_checkpoint";
```

### 2.6 Artifact

Artifact 是 Work 的产物集合，不是全局混在一起的一堆文件。

默认视图应显示：

```text
当前 Work 的全部 Artifact
```

并提供筛选：

- 当前 Run
- 全部 Runs
- 仅最终产物
- 中间产物
- 报告 / 日志
- 全平台 Artifact Library

## 3. PPT 制作示例

用户目标：

> “帮我完成一份 Moyu 平台介绍 PPT。”

这个 Work 可能包含如下过程：

```text
Work: Moyu 平台介绍 PPT
├── Conversation
│   ├── 用户：我要做一份 20 页 PPT
│   ├── Agent：需要面向谁？商务还是技术？
│   ├── 用户：面向技术投资人，偏产品架构
│   ├── Agent：先生成大纲，请确认
│   └── 用户：第 3 部分加强本地优先
├── Runs
│   ├── Run 1: 收集需求 + 生成 outline.md
│   ├── Run 2: 生成背景图 / 图标素材
│   ├── Run 3: 生成 slide-plan.json
│   ├── Run 4: 生成 deck.pptx
│   └── Run 5: 用户打回后重排版式
├── Artifacts
│   ├── brief.md
│   ├── outline.md
│   ├── cover-bg.png
│   ├── architecture-diagram.png
│   ├── slide-plan.json
│   ├── draft.pptx
│   └── final.pptx
└── Agent Calls
    ├── ppt-agent
    ├── image-gen-agent
    ├── diagram-agent
    └── copywriting-agent
```

这说明 Moyu 的 UI 不能只围绕“一个当前产物”设计，而要围绕“一个 Work 的持续交付过程”设计。

## 4. 调整后的界面结构

### 4.1 顶层布局

```text
┌────────────────────────────────────────────────────────────────────┐
│ Top Bar: Moyu / 当前 Project / 当前 Work / 本地运行状态 / 设置       │
├───────────────┬────────────────────────────────────┬───────────────┤
│ Left Panel    │ Center Conversation                 │ Right Panel   │
│ 可收起         │                                    │ 可收起         │
│               │  用户消息                           │               │
│ Work 列表      │  Agent 回复                         │ Artifacts     │
│ Agent 库       │  执行计划                           │ Trace         │
│ 最近 Runs      │  运行进度                           │ Context       │
│               │  检查点 / 用户确认                   │ Run Details   │
│               │  产物卡片摘要                        │               │
└───────────────┴────────────────────────────────────┴───────────────┘
```

### 4.2 左侧面板

左侧不应只叫 Agent Library。

建议结构：

```text
左侧 Panel
├── Work Sessions
│   ├── Moyu UI 方案调整
│   ├── 产品介绍 PPT
│   └── 生图原型测试
├── Agents
│   ├── 生图原型 Agent
│   ├── PPT 生成 Agent
│   ├── 文档整理 Agent
│   └── 代码审查 Agent
└── Runs / Recent
```

v0.1 可以先做两个 Tab：

- `任务`
- `Agents`

### 4.3 中间主区域

中间主区域是 Conversation，而不是 Preview。

消息类型至少包括：

```ts
type ConversationMessageKind =
  | "user_message"
  | "agent_message"
  | "plan"
  | "run_started"
  | "step_progress"
  | "artifact_created"
  | "checkpoint"
  | "error"
  | "summary";
```

Artifact 在中间以“消息内产物卡片”出现，例如：

```text
Agent:
已生成第一版大纲，请确认结构。

[outline.md]
类型: Markdown
角色: intermediate
操作: 打开 / 预览 / 作为上下文继续
```

### 4.4 右侧面板

右侧是 Inspector，可收起，可切换 Tab：

- Artifacts：当前 Work 的产物树
- Trace：当前 Run 的 Step / Agent Call 时间线
- Context：输入文件、用户补充信息、引用资料
- Details：Run 元数据、成本、耗时、模型调用

Artifacts 默认不是全平台产物，而是：

```text
当前 Work 的 Artifacts
```

全平台产物应放在独立页面 `Artifact Library`。

## 5. 多 Agent 调用模型

Agent 调用 Agent 应成为一等能力，但 UI 不必用画布表达。

推荐数据模型：

```ts
interface AgentCallStep {
  kind: "agent_call";
  callee_agent_id: string;
  callee_run_id: string;
  input_summary: Record<string, unknown>;
  output_artifact_ids: string[];
}
```

在 Trace 里展示为嵌套：

```text
Run: 生成 PPT
├── Step 1 需求澄清
├── Step 2 生成大纲
├── Step 3 调用 image-gen-agent
│   ├── image Step 1 prompt normalize
│   ├── image Step 2 generate
│   └── image Artifact cover-bg.png
├── Step 4 调用 diagram-agent
└── Step 5 render pptx
```

右侧 Trace Inspector 应支持展开 / 折叠子 Agent Run。

## 6. 数据模型需要新增的核心实体

当前已有 `Run / Step / Artifact`，但还缺 `Work` 和 `Conversation`。

建议新增：

```ts
interface WorkRecord {
  id: string;
  projectId: string | null;
  title: string;
  state: "active" | "waiting_user" | "running" | "completed" | "archived";
  createdAt: string;
  updatedAt: string;
}

interface ConversationMessage {
  id: string;
  workId: string;
  runId: string | null;
  role: "user" | "agent" | "system";
  kind: ConversationMessageKind;
  content: string;
  artifactIds: string[];
  createdAt: string;
}
```

并调整关系：

```text
Workspace
└── Project
    └── Work
        ├── ConversationMessage[]
        ├── Run[]
        │   └── Step[]
        └── Artifact[]
```

## 7. 对当前原型的修改方向

当前原型需要改：

1. 左右两栏都支持收起。
2. 左侧从“Agent Library 为主”改为“任务会话 + Agents”。
3. 中间从“大图预览为主”改为“对话流为主”。
4. 主产物预览降级为消息中的 Artifact 卡片，或右侧 Artifacts Tab。
5. 右侧 Inspector 增加 Tab：Artifacts / Trace / Context / Details。
6. Workspaces 从主界面高频区移走，只在顶栏或设置中显示当前本地数据空间。
7. Artifact Gallery 默认显示当前 Work 的产物，不显示全平台所有产物。

## 8. MVP 顺序调整

旧顺序偏 Run / Artifact。

新顺序建议：

1. 定义 `WorkRecord` 与 `ConversationMessage`。
2. Workbench 静态原型改成“对话中心 + 可折叠左右栏”。
3. `agent run` 结果挂到一个 Work 下。
4. 运行过程中生成 Conversation event。
5. 右侧 Inspector 显示当前 Work 的 Artifacts / Trace。
6. 支持多 Run 持续交付。
7. 支持 `agent_call` Step。
8. 再做独立 Artifact Library / Run History 页面。

## 9. 产品心智

Moyu 不是：

```text
选择 Agent -> 输入参数 -> 查看一个产物
```

Moyu 应该是：

```text
开启一个 Work -> 与 Agent 协作 -> Agent 调用工具/子 Agent -> 持续生成多个产物 -> 用户确认/打回/继续 -> 形成最终交付物
```

这才符合“智能体创建平台 + 智能体运行平台”的定位。
