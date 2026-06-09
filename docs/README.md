# Moyu 文档入口

> 本目录只保留对当前仓库仍然有效的产品、架构、运行和协作文档。早期讨论稿、尖刺计划、阶段验收记录和已完成交付 checklist 已合并到下列当前文档，避免多份文档同时描述同一件事。

## 当前阅读路径

1. [03 - 核心概念定义](./03-核心概念定义.md)
   先读这里，统一 `Workspace / Agent / Work / Run / Step / Artifact / Skill / Tool / MCP / Trace` 等词。
2. [04 - 总体架构](./04-总体架构.md)
   当前项目的分层架构、源码目录、关键数据流、已实现能力与保留设计方向。
3. [05 - Agent 与 Meta-Agent 设计](./05-元智能体设计.md)
   Agent 文件夹契约、`manifest.yaml`、`ui.yaml`、Skill、Meta-Agent 创建/安装/冲突处理流程。
4. [06 - 运行时与数据模型](./06-运行时与沙箱.md)
   Run / Step / Artifact / Work / Message / Settings / Knowledge write-back 的当前实现，以及沙箱演进边界。
5. [14 - Workbench 与信息架构](./14-UI原型与信息架构.md)
   当前 Workbench 三栏结构、设置中心、静态预览、API 与前端目录。
6. [21 - 工程运行与状态](./21-工程运行与状态.md)
   本地命令、环境变量、目录约定、配置文件与当前实现状态。
7. [24 - 协作与编码规范](./24-协作与编码规范.md)
   本仓库需求、缺陷、验证、提交和文档同步规则。

## 当前清单

- [25 - 当前需求任务清单](./25-当前需求任务清单.md)
- [26 - 当前缺陷与质量修复清单](./26-当前缺陷与质量修复清单.md)
- [Feature Delivery Checklist 模板](./checklists/feature-delivery-checklist.md)
- [Bugfix Delivery Checklist 模板](./checklists/bugfix-delivery-checklist.md)

清单只维护仍需推进或对当前状态有解释价值的事项。已完成任务的详细 checklist 不再长期保留在主文档树中；如需追溯，以 git history 和 commit message 为准。

## 文档边界

- 根目录 `README.md` / `README.zh-CN.md`：面向外部读者的项目介绍和快速开始。
- `docs/`：面向开发者和后续智能体的当前事实、架构约束和协作流程。
- `agents/*/README.md`：单个 Agent 的使用说明。
- `ui/workbench/README.md`：Workbench 前端本身的局部说明。

## 已整合的历史内容

以下主题已经并入当前文档，不再单独保留文件：

- 原始需求、初步分析、竞品参考和旧路线图：并入 `03`、`04` 和根 README。
- v0.0 生图尖刺、v0.1-alpha 闭环规格与验收记录：并入 `21` 的当前状态和 `25/26` 的清单。
- Trace 数据模型、Artifact 契约、Agent 文件夹、声明式 UI、Skill 受控生成：并入 `05` 和 `06`。
- 产品定位、Workbench 调整和旧 UI 线框：并入 `14`。

维护原则：当实现已经落地，以源码和当前文档为准；当文档描述未来方向，必须明确标注“设计方向”或“未实现”。
