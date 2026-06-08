# F-005 Skill / Tool / MCP Settings Checklist

## 基本信息

- Issue / 任务编号：F-005
- 需求标题：Skill / Tool / MCP 基础设置与权限边界
- 提出日期：2026-06-08
- 负责人：Codex
- 关联模块 / scope：`settings`

## 1. 需求定义

- [x] 目标用户 / 使用场景已写清：Workspace 管理者需要在设置中心看清 Agent 可继承哪些 Skill、Tool、MCP，以及它们的来源和权限边界。
- [x] 需求背景已写清：当前 Settings 已有列表，但缺少来源类型、审核门槛、风险等级和权限边界等治理信息。
- [x] 本次范围（In Scope）已写清：扩展 API 数据模型和设置页渲染，补测试与文档。
- [x] 非本次范围（Out of Scope）已写清：不做编辑保存、不启动 MCP、不实现真实 Skill 安装启停。
- [x] 依赖 / 前置条件已确认：F-001 设置中心、F-009 Agent Context、F-010 settings 目录拆分已完成。

## 2. 验收标准

- [x] Settings 中可查看 Skill / Tool / MCP 列表。
- [x] 每项可看到来源、状态、作用范围、权限边界、审核要求和风险等级。
- [x] 受控生成 Skill 与 Agent 本地 Skill / 内置 Tool / MCP Server 有清晰区分。

## 3. 设计与影响范围

- [x] 受影响页面 / 命令 / Agent / 模块已列出：`GET /api/settings`、Workbench Settings → Skills / Tools / MCP、settings 类型定义。
- [x] 数据结构 / 配置变更已列出：`WorkbenchCapability` 增加 `sourceType`、`permissionBoundary`、`approval`、`defaultEnabledFor`、`riskLevel`。
- [x] 是否影响 README / docs / 示例：是，同步任务清单与交付清单。
- [x] 是否影响测试用例：是，补 API 数据模型和前端渲染断言。

## 4. 实现清单

- [x] 代码实现完成
- [x] 空态 / 加载 / 失败 / 正常态已覆盖：沿用 F-001 设置中心状态覆盖。
- [x] 默认值与回退路径已处理：现有能力项均显式声明权限与审核状态。
- [x] 无关改动未混入

## 5. 测试与验证

- [x] 自动化测试已新增或更新
- [x] 类型检查通过
- [x] 构建通过
- [x] 手工验证已完成

### 验证记录

- 验证命令：`npm run typecheck`；`npm test`；`npm run build`；`git diff --check`
- 验证环境：macOS / Node.js 本地仓库
- 验证输入：默认 Workbench Settings API 数据
- 预期结果：Skill / Tool / MCP 数据包含权限边界和审核字段，设置页渲染这些字段，验证命令通过。
- 实际结果：全部通过；`npm test` 共 9 个子测试通过。构建生成的 `dist/` 已在验证后清理。

## 6. 文档同步

- [x] README / README.zh-CN 已同步：本次不改变用户入口。
- [x] `docs/` 相关文档已同步
- [x] 示例数据 / 原型数据已同步：本次由 API 生成，静态导出不是必要范围。

## 7. 提交闭环

- [x] Commit 已按规范编写
- [x] Commit type：`feat`
- [x] Commit scope：`settings`
- [x] Commit subject：`补齐能力设置权限边界`
- [x] Commit hash：dc4833f
- [x] 已在本清单记录最终结果

## 8. 完成说明

- 结果摘要：Settings 中 Skill / Tool / MCP 能力项新增来源类型、权限边界、审核要求、默认启用范围和风险等级，并同步前端卡片渲染与静态预览数据。
- 遗留问题：无。
- 后续 Issue 建议：后续可在真实设置编辑能力中接入启停和 MCP 健康检查。
