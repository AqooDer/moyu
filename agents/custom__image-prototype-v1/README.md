# 生图原型 Agent

> Create an image prototype Agent that supports raw prompts and saves traceable artifacts

## 用途

这个 Agent 由 Moyu 元智能体根据用户需求生成。当前版本是可审核的最小文件夹骨架，包含 Manifest、UI Schema、Skill 壳、Recipe 示例与验证记录。

## 原始需求

Create an image prototype Agent that supports raw prompts and saves traceable artifacts

## 输入

- `prompt`: 用户任务或生成描述
- `count`: 需要生成或处理的候选数量
- `raw_prompt`: 是否跳过 Moyu 的提示词增强

## 产出

- `artifacts`: 当前 Run 生成的产物列表
- `metadata`: Trace、提示词和运行信息

## 由 Meta-Agent 生成

- Recipe: image-gen/prototype-v1
- 创建时间: 2026-06-02T06:10:33.695Z
- 最近修改: 2026-06-02T06:10:33.695Z
