# F-010 Settings Domain Structure Checklist

## 基本信息

- Issue / 任务编号：F-010
- 需求标题：拆分设置领域源码目录
- 提出日期：2026-06-08
- 负责人：Codex
- 关联模块 / scope：`structure`

## 1. 需求定义

- [x] 目标用户 / 使用场景已写清：维护者需要从目录上区分 runtime 执行层与 settings 配置层。
- [x] 需求背景已写清：当前 `runtime/workbench-data.ts` 混放 Settings 配置数据，后续 MCP、Skill、Tool、Model 管理会继续放大混乱。
- [x] 本次范围（In Scope）已写清：只做源码目录拆分、导入路径更新、文档同步与验证。
- [x] 非本次范围（Out of Scope）已写清：不删除仓库杂项，不改变 API 行为，不实现新设置编辑能力。
- [x] 依赖 / 前置条件已确认：F-001、F-002、F-003、F-004、F-009 已完成。

## 2. 验收标准

- [x] `src/settings/` 下形成 models、knowledge、skills、tools、mcp 子目录。
- [x] 模型角色和知识库配置读取不再位于 `src/runtime/`。
- [x] `/api/settings` 与 Workbench 数据结构保持兼容。

## 3. 设计与影响范围

- [x] 受影响页面 / 命令 / Agent / 模块已列出：Workbench API、Agent run 模型角色解析、Artifact 知识库回流校验、设置测试。
- [x] 数据结构 / 配置变更已列出：不改变外部 JSON schema，只移动 TS 类型与构建逻辑。
- [x] 是否影响 README / docs / 示例：是，需同步当前目录说明。
- [x] 是否影响测试用例：是，更新模型角色与知识库配置测试路径。

## 4. 实现清单

- [x] 代码实现完成
- [x] 空态 / 加载 / 失败 / 正常态已覆盖：本次不新增 UI 状态，保留既有覆盖。
- [x] 默认值与回退路径已处理：保留原模型角色与知识库默认值。
- [x] 无关改动未混入

## 5. 测试与验证

- [x] 自动化测试已新增或更新
- [x] 类型检查通过
- [x] 构建通过
- [x] 手工验证已完成

### 验证记录

- 验证命令：`npm run typecheck`；`npm test`；`npm run build`；`git diff --check`
- 验证环境：macOS / Node.js 本地仓库
- 验证输入：默认配置与测试内临时 Workspace
- 预期结果：测试、类型检查、构建和 diff 检查通过；API 数据结构不变。
- 实际结果：全部通过；`npm test` 共 8 个子测试通过，`/api/settings`、Workbench 数据、模型角色解析和知识库回流策略均无回退。

## 6. 文档同步

- [x] README / README.zh-CN 已同步：本次不涉及 README 用户入口变化。
- [x] `docs/` 相关文档已同步
- [x] 示例数据 / 原型数据已同步：本次不改变示例配置。

## 7. 提交闭环

- [x] Commit 已按规范编写
- [x] Commit type：`refactor`
- [x] Commit scope：`structure`
- [x] Commit subject：`拆分设置领域源码目录`
- [x] Commit hash：提交后见最终回复
- [x] 已在本清单记录最终结果

## 8. 完成说明

- 结果摘要：新增 `src/settings/` 领域目录，拆出模型、知识库、Skill、Tool、MCP 与设置聚合逻辑；`src/runtime/` 回到 Run / Step / Trace / Artifact 执行数据职责。
- 遗留问题：无。
- 后续 Issue 建议：仓库顶层目录清理应单独闭环，不与本次源码分层混合。
