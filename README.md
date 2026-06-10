# Moyu

> Local-first AI Agent creation and runtime platform.

[中文说明](./README.zh-CN.md) | [Engineering Notes](./docs/21-工程运行与状态.md)

Moyu is an early-stage open-source project for creating, running, and evolving AI Agents through conversation. Instead of asking users to manually draw workflow diagrams, Moyu aims to turn natural-language requirements into reviewable Agent folders, executable recipes, runtime traces, and reusable artifacts.

The name has two meanings in Chinese: **摸鱼**, a playful idea of making complex work feel lighter, and **墨鱼**, an octopus-like metaphor for coordinating many capabilities and outputs at once.

## Why Moyu

Many current Agent platforms focus on visual workflow builders. That is useful, but real work is often more fluid than a fixed graph.

A single task may involve several rounds of conversation, multiple intermediate outputs, and calls between specialized Agents. For example, creating a presentation may start with a Markdown brief, continue with background images and an outline, and end with a final slide deck. Moyu treats this as a task conversation with traceable artifacts, not just a static canvas.

## What Moyu Is Building

- **Conversation-driven Agent creation**: a Meta-Agent collects requirements through Workbench chat, turns user intent into Agent contracts, manifests, recipes, UI schemas, and validation records.
- **Code-driven orchestration**: Agents are connected through code, recipes, and runtime events instead of being limited to manual node graphs.
- **Multi-artifact task sessions**: one work session can produce documents, images, slide decks, traces, configuration files, and review reports.
- **Local-first runtime**: Agents, traces, artifacts, and configuration live in the local project by default, making them inspectable and versionable.
- **Reviewable generation**: generated Agents first land as drafts and can be reviewed before installation into the official `agents/` directory.
- **Workbench**: a Codex-inspired three-panel interface with conversation in the center, navigation on the left, and artifacts / traces / context on the right.

## Current Status

Moyu is currently maintained by a single developer and is still in active prototype development. It does not yet have a large user base, stars, or production releases. The project is intentionally being built in public from the foundation up.

The first end-to-end path is already working:

- `image-gen/prototype-v1` is the first local Agent.
- Runtime traces are modeled as `Run / Step / Artifact`.
- Artifacts can be listed, inspected, and opened from the CLI.
- The Meta-Agent can collect requirements through Workbench conversation, generate Agent drafts, install reviewed Agents, and use a configured OpenAI-compatible chat model for the first Agent specification draft.
- Work and conversation messages now persist in a local Workbench store for session recovery.
- The Workbench defaults to Chinese and supports English.
- The image generation path supports an OpenAI-compatible image API, currently tested with `gpt-image-2`.

## Quick Start

```bash
npm install
npm run dev -- help
npm run workbench:serve
```

The Workbench server prints the actual local URL, usually:

```text
http://127.0.0.1:4177/ui/workbench/
```

If port `4177` is already in use, Moyu automatically switches to the next available port.

## Try The First Agent

```bash
npm run dev -- agent list
npm run dev -- agent show image-gen/prototype-v1
npm run dev -- agent run image-gen/prototype-v1 \
  --prompt "a clean app dashboard" \
  --count 1 \
  --raw-prompt \
  --dry-run
```

Real image generation requires local `.env` configuration. See [Engineering Notes](./docs/21-工程运行与状态.md).

## Configure Meta-Agent LLM

To let `meta create-agent` use a real OpenAI-compatible chat model before falling back to local rules, configure:

```bash
MOYU_LLM_PROVIDER_BASE_URL=https://api.openai.com
MOYU_LLM_PROVIDER_API_KEY=your_api_key_here
MOYU_LLM_PROVIDER_MODEL=gpt-4.1-mini
```

Then run:

```bash
npm run dev -- meta create-agent \
  --prompt "Create a research notes organizer Agent"
```

The generated trace records whether the spec came from `llm` or the local `rule` fallback.

You can also start `npm run workbench:serve`, select **Meta Agent**, describe the Agent in the composer, and reply `confirm create` after the Meta-Agent asks for confirmation.

## Documentation

- [Documentation Guide](./docs/README.md)
- [Engineering Notes](./docs/21-工程运行与状态.md)
- [Core Concepts](./docs/03-核心概念定义.md)
- [Overall Architecture](./docs/04-总体架构.md)
- [Agent and Meta-Agent Design](./docs/05-元智能体设计.md)
- [Runtime and Data Model](./docs/06-运行时与沙箱.md)
- [Workbench and Information Architecture](./docs/14-UI原型与信息架构.md)
- [Collaboration and Coding Standards](./docs/24-协作与编码规范.md)

## License

Moyu is licensed under the Apache License 2.0.
