# 生图原型 Agent

> 通过 OpenAI-compatible 图片中转接口生成 UI 概念图，并保存可追踪产物。

## 用途

这个 Agent 由 Moyu 元智能体根据用户需求生成。当前版本是可审核的最小文件夹骨架，包含 Manifest、UI Schema、Skill 壳、Recipe 示例与验证记录。

## 原始需求

帮我创建一个生图原型 Agent。它要能调用 gpt-image-2 中转接口，支持生成 3 张 UI 概念图，并把图片、Trace 和提示词都保存下来。

## 输入

- `prompt`: 用户任务或生成描述
- `count`: 需要生成或处理的候选数量
- `raw_prompt`: 是否跳过 Moyu 的提示词增强

## 产出

- `artifacts`: 当前 Run 生成的产物列表
- `metadata`: Trace、提示词和运行信息

## 由 Meta-Agent 生成

- Recipe: image-gen/prototype-v1
- 创建时间: 2026-06-02T06:33:34.093Z
- 最近修改: 2026-06-02T06:33:34.093Z
