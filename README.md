# Moyu

> Moyu = 摸鱼 / 墨鱼。一个本地优先的 AI Agent 平台，首发验证场景是「生图原型 Agent」。

## 目录约定

- `docs/` -> 设计文档目录，已迁移为代码项目内的真实目录
- `src/` -> 应用源码
- `agents/` -> 本地 Agent 文件夹,一个 Agent 一个目录
- `traces/` -> Spike / 运行时 Trace 输出
- `artifacts/` -> 本地产物输出
- `assets/` -> 品牌资源、图标、README 图
- `brand/` -> 品牌素材、Logo、图标与横幅

## 当前结构

```text
moyu/
├── docs/
├── agents/
│   └── image-gen__prototype-v1/
│       ├── manifest.yaml
│       ├── ui.yaml
│       ├── skills/
│       ├── history/
│       └── README.md
├── src/
│   ├── cli.ts
│   ├── config/
│   ├── lib/
│   └── spike/
├── brand/
│   ├── logo/
│   ├── icons/
│   ├── source/
│   └── banners/
├── traces/
├── artifacts/
└── assets/
```

## 开发目标

1. 先跑通 `moyu spike image-gen` 的最小闭环。
2. 将 spike 固化为 `agents/image-gen__prototype-v1`。
3. 再扩展到 Agent manifest 校验、UI schema、热加载与桌面壳。
4. 设计文档全部保留在 `docs/`，不再通过软链接引用外部目录。

## 运行方式

```bash
pnpm install
pnpm dev -- help
pnpm dev -- spike image-gen --prompt "..." --count 4
pnpm dev -- agent list
pnpm dev -- agent show image-gen/prototype-v1
pnpm dev -- agent validate agents/image-gen__prototype-v1
pnpm dev -- agent run image-gen/prototype-v1 --prompt "a clean app dashboard" --count 1 --raw-prompt --dry-run
pnpm dev -- run list
pnpm dev -- run show <run_id>
pnpm dev -- artifact list
pnpm dev -- artifact list --run <run_id>
pnpm dev -- artifact show <artifact_id>
pnpm dev -- artifact open <artifact_id>
pnpm dev -- ui export-data
pnpm prototype:export-data
pnpm prototype:workbench
```

## Image Relay 配置

当前 spike 使用 OpenAI-compatible 图片协议，默认模型是 `gpt-image-2`。
`gpt-image-*` 模型默认返回 `b64_json`，CLI 不会向这类模型发送 `response_format` 参数；该参数仅保留给 DALL·E 2/3 兼容场景。

```bash
cp .env.example .env
# 填入你的中转站 Key 后运行：
npm run dev -- spike image-gen --prompt "a clean app dashboard" --count 1 --raw-prompt
npm run dev -- agent run image-gen/prototype-v1 --prompt "a clean app dashboard" --count 1 --raw-prompt
```

`.env` 会被 CLI 自动读取,并已被 `.gitignore` 忽略，不能提交真实 Key。
CLI 启动时会让项目内 `.env` 覆盖同名 shell 环境变量，避免终端里残留的旧 Key 抢先被使用。

## 当前开发状态

- `spike image-gen` 已真实跑通并产出 PNG
- `agents/image-gen__prototype-v1` 已固化为第一个 Agent 文件夹
- `agent list` / `agent show` / `agent validate` 已可用
- `agent run image-gen/prototype-v1` 已接入 Runtime 原型
- Runtime trace 已拆成 `Run / Step / Artifact` 结构
- 真实图片输出已注册为 Artifact,包含路径、大小、sha256
- `run list` / `run show <run_id>` 已可查询 Run 历史与 Artifact 明细
- `artifact list` / `artifact show` / `artifact open` 已可查询和打开本地产物
- Workbench 静态原型已建立在 `ui/workbench-prototype/`,默认中文,支持中文 / English 切换
- `ui export-data` 已可把 Runtime 数据导出给 Workbench 原型读取
- 下一步：把 Workbench 原型迁入真实前端框架,复用现有 Run 与 Artifact 查询层
