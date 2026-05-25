# Moyu

> Moyu = 摸鱼 / 墨鱼。一个本地优先的 AI Agent 平台，首发验证场景是「生图原型 Agent」。

## 目录约定

- `docs/` -> 设计文档目录，已迁移为代码项目内的真实目录
- `src/` -> 应用源码
- `traces/` -> Spike / 运行时 Trace 输出
- `artifacts/` -> 本地产物输出
- `assets/` -> 品牌资源、图标、README 图
- `brand/` -> 品牌素材、Logo、图标与横幅

## 当前结构

```text
moyu/
├── docs/
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
2. 再扩展到 Agent manifest、UI schema、热加载与桌面壳。
3. 设计文档全部保留在 `docs/`，不再通过软链接引用外部目录。

## 运行方式

```bash
pnpm install
pnpm dev -- help
pnpm dev -- spike image-gen --prompt "..." --count 4
```

## Image Relay 配置

当前 spike 使用 OpenAI-compatible 图片协议，默认模型是 `gpt-image-2`。

```bash
cp .env.example .env
# 填入你的中转站 Key 后运行：
MOYU_IMAGE_PROVIDER_BASE_URL=https://www.aiartmirror.com \
MOYU_IMAGE_PROVIDER_API_KEY=... \
MOYU_IMAGE_PROVIDER_MODEL=gpt-image-2 \
npm run dev -- spike image-gen --prompt "a clean app dashboard" --count 1 --raw-prompt
```

`.env` 已被 `.gitignore` 忽略，不能提交真实 Key。
