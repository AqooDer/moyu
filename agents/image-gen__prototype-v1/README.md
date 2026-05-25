# 原型生图 Agent

> 通过自然语言描述快速生成候选原型图。

## 用途

这个 Agent 是 Moyu 的第一个落地 Agent。它基于 OpenAI-compatible 图片中转站调用 `gpt-image-2`,用于验证从输入 prompt 到本地产物落盘的最小闭环。

## 输入

- `prompt`: 原型图描述
- `count`: 生成张数
- `style`: 风格,如写实、卡通、线稿、二次元
- `size`: 图片尺寸
- `raw_prompt`: 是否跳过 Moyu 的风格提示词增强

## 产出

- PNG 图片 artifact
- 运行 trace
- 生成元数据

## 当前状态

- v0.0 spike 已真实生成图片
- 当前目录是从 spike 固化出的第一个 Agent 文件夹
- 后续需要接入正式 Runtime、UI Schema 渲染和 L1 sandbox 审核流程

