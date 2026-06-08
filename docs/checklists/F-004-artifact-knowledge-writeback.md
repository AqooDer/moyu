# Feature Delivery Checklist - F-004 Agent 产物回流知识库

> 用于“一次只做一个需求闭环”。本分支在独立 worktree 中完成，避免触碰 F-003 主工作区改动。

## 基本信息

- Issue / 任务编号：F-004
- 需求标题：Agent 产物回流知识库
- 提出日期：2026-06-08
- 负责人：Codex
- 关联模块 / scope：`artifact`

## 1. 需求定义

- [x] 目标用户 / 使用场景已写清：用户审核并采纳 Agent 产物后，需要把该产物标记为可进入某个知识库集合。
- [x] 需求背景已写清：Workbench 已把“产物回流知识库”作为运行上下文能力展示，但运行时 Trace 还没有可审计的回流记录。
- [x] 本次范围（In Scope）已写清：
  - 增加 Artifact → Knowledge Base write-back 记录结构
  - 支持通过运行时函数和 CLI 标记已审核产物加入目标集合
  - 写回记录包含来源 Artifact、目标集合与审核记录
  - Run Trace 与 `run show` 可看到 write-back 事件
  - 支持按 run / artifact / collection 查询回流记录
  - 接入 F-003 Workspace 知识库配置，校验目标集合、回流启用状态与允许产物类型
- [x] 非本次范围（Out of Scope）已写清：
  - 不实现真实切片、嵌入、向量索引或召回
  - 不实现设置中心 UI 编辑或审核弹窗
  - 不实现产物内容写入真实索引或后台 Worker
- [x] 依赖 / 前置条件已确认：F-003 已完成，F-004 已基于其 `knowledge_bases` 配置层完成策略校验接线。

## 2. 验收标准

- [x] 验收标准 1：产物可标记“加入知识库”。
- [x] 验收标准 2：写回动作有来源、目标集合、审核记录。
- [x] 验收标准 3：Trace 中可看到 write-back 事件。

## 3. 设计与影响范围

- [x] 受影响页面 / 命令 / Agent / 模块已列出：`artifact write-back`、`artifact write-backs`、Run Trace、Runtime Store、Workspace Knowledge Base Config。
- [x] 数据结构 / 配置变更已列出：`RuntimeTrace.knowledgeWriteBacks` 新增 write-back ledger。
- [x] 是否影响 README / docs / 示例：是，新增本 checklist。
- [x] 是否影响测试用例：是，新增 `src/runtime/artifact-writebacks.test.ts`。

## 4. 实现清单

- [x] 代码实现完成
- [x] 空态 / 加载 / 失败 / 正常态已覆盖
- [x] 默认值与回退路径已处理
- [x] 无关改动未混入

## 5. 测试与验证

- [x] 自动化测试已新增或更新
- [x] 类型检查通过
- [x] 构建通过
- [x] 手工验证已完成

### 验证记录

- 验证命令：`/Users/zlj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --import tsx --test src/**/*.test.ts`
- 验证命令：`/Users/zlj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --import tsx --test src/runtime/artifact-writebacks.test.ts`
- 验证命令：`npm run typecheck`
- 验证命令：`npm run build`
- 验证命令：`git diff --check`
- 验证环境：macOS，本地 `/private/tmp/moyu-f004` worktree
- 验证输入：临时 Runtime Trace + markdown Artifact + `workspace-product` collection id
- 预期结果：Artifact 可被幂等标记为知识库回流，Trace 中存在 write-back 记录，并可查询。
- 实际结果：通过。完整测试 12/12 通过；F-004 单测 3/3 通过；类型检查、构建与 diff 空白检查通过。系统 `node` 为 v16，直接 `npm test` 会因不支持 `--import` 失败，因此使用 bundled Node v24 执行同等测试命令。

## 6. 文档同步

- [x] README / README.zh-CN 已同步或确认无需同步：本次为运行时与 CLI 基础能力，暂不更新 README。
- [x] `docs/` 相关文档已同步
- [x] 示例数据 / 原型数据已同步或确认无需同步：未改动 UI 示例数据，F-004 当前通过 CLI 和 Trace 暴露。

## 7. 提交闭环

- [x] Commit 已按规范编写
- [x] Commit type：`feat`
- [x] Commit scope：`artifact`
- [x] Commit subject：`增加产物知识库回流记录`
- [x] Commit hash：`3cf898a`、`f2f4cfb`
- [x] 已在本清单记录最终结果

## 8. 完成说明

- 结果摘要：新增 Artifact → Knowledge Base write-back ledger、CLI 标记/查询入口、Run Trace 展示、Workspace 知识库回流策略校验和自动化测试。
- 遗留问题：真实切片、嵌入、向量索引、召回与审核 UI 不在本次范围。
- 后续 Issue 建议：为 Workbench 增加产物“加入知识库”审核 UI。
