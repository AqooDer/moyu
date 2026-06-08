# Moyu

> 本地优先的 AI Agent 创建与运行平台。

[English](./README.md) | [工程运行与状态](./docs/21-工程运行与状态.md)

Moyu 是一个早期开源项目，用来通过对话创建、运行和演进 AI Agent。它不希望用户一开始就手动画复杂工作流，而是把自然语言需求沉淀为可审查的 Agent 文件夹、可执行的 Recipe、运行 Trace 和可复用产物。

它的中文名字可以理解为 **摸鱼**，也可以理解为 **墨鱼**。前者是轻松、灵活、把复杂工作交给智能体；后者是多触手协作、面向多产物生成的 Agent 运行平台。

## 为什么做 Moyu

今天很多 Agent 工具把重点放在「画工作流」上，这当然有价值，但真实工作往往不是一张固定流程图。

一次任务可能需要多轮对话、多个中间产物、多个 Agent 互相调用。比如做一个 PPT，可能先写 Markdown 内容，再生成背景图、整理大纲，最后输出完整幻灯片。Moyu 更关注这种“任务会话 + 多产物 + 可追踪运行过程”，而不是只把 Agent 做成静态画布。

## 核心能力

- **通过对话创建 Agent**：元智能体把自然语言需求转成 Agent 契约、Manifest、Recipe、UI Schema 和验证记录。
- **代码驱动编排**：Agent 之间通过代码、Recipe 和 Runtime 事件串联，不依赖手工节点画布。
- **多产物任务会话**：一个 Work 可以包含文档、图片、PPT、Trace、配置文件、审核报告等多种产物。
- **本地优先运行**：Agent、Trace、Artifact 和配置默认保存在本地项目中，便于审查、版本化和迁移。
- **可审查的生成流程**：生成的 Agent 先进入草案目录，用户审核后再安装到正式 `agents/`。
- **Workbench 原型**：类似 Codex 的三栏工作台，中间是对话，左侧是导航，右侧是产物、Trace 和上下文检查器。

## 当前状态

Moyu 目前由单人维护，仍处于活跃原型开发阶段。它还没有大规模用户、star 或生产版本，但已经开始从底层能力公开构建。

目前已经跑通第一条端到端链路：

- `image-gen/prototype-v1` 是首个本地 Agent。
- Runtime Trace 已拆成 `Run / Step / Artifact` 结构。
- 产物可以通过 CLI 查询、查看和打开。
- 元智能体可以生成 Agent 草案，并安装审核后的 Agent。
- Workbench 原型默认中文，支持 English 切换。
- 生图链路支持 OpenAI-compatible 图片接口，当前验证模型为 `gpt-image-2`。

## 快速开始

```bash
npm install
npm run dev -- help
npm run prototype:workbench
```

Workbench 服务会在终端输出真实本地地址，通常是：

```text
http://127.0.0.1:4177/ui/workbench-prototype/
```

如果 `4177` 被占用，服务会自动切换到下一个可用端口。

## 试运行第一个 Agent

```bash
npm run dev -- agent list
npm run dev -- agent show image-gen/prototype-v1
npm run dev -- agent run image-gen/prototype-v1 \
  --prompt "a clean app dashboard" \
  --count 1 \
  --raw-prompt \
  --dry-run
```

真实调用图片中转服务前，需要先配置本地 `.env`。配置说明见 [工程运行与状态](./docs/21-工程运行与状态.md)。

## 文档

- [工程运行与状态](./docs/21-工程运行与状态.md)
- [核心概念定义](./docs/03-核心概念定义.md)
- [总体架构](./docs/04-总体架构.md)
- [元智能体设计](./docs/05-元智能体设计.md)
- [Trace 数据模型](./docs/12-Trace数据模型.md)
- [Artifact 契约](./docs/13-Artifact契约.md)
- [任务会话式 Workbench 与多产物架构调整](./docs/20-任务会话式Workbench与多产物架构调整.md)
- [协作与编码规范](./docs/24-协作与编码规范.md)

## 协议

Moyu 使用 Apache License 2.0 开源协议。
