# F-009 Agent 运行上下文装配视图

## 基本信息

- Issue / 任务编号：F-009
- 需求标题：参考 Yuxi 补齐 Agent 运行上下文装配视图
- 提出日期：2026-06-09
- 负责人：Codex
- 关联模块 / scope：workbench

## 1. 需求定义

- [x] 目标用户 / 使用场景已写清：用户需要在 Workbench 设置中心理解一个 Agent 运行时会继承哪些模型、知识库、Skill、Tool、MCP 与产物策略。
- [x] 需求背景已写清：Yuxi 把模型、知识库、Skills、MCP、工具、子智能体、沙盒与中间件作为 Harness 能力统一装配，Moyu 需要以轻量方式呈现同类运行上下文。
- [x] 本次范围（In Scope）已写清：增加原型 API 数据结构、设置中心分组与前端渲染，并补充测试断言。
- [x] 非本次范围（Out of Scope）已写清：不实现真实知识库索引，不实现 MCP 服务启停，不实现 Skill 安装 / 审核后端。
- [x] 依赖 / 前置条件已确认：复用 Settings 数据入口、Workbench 设置中心和当前 Agent / Runtime 数据。

## 2. 验收标准

- [x] 验收标准 1：Settings 中出现 Agent Context 分组。
- [x] 验收标准 2：可看到 Meta-Agent 与生图 Agent 的运行上下文装配。
- [x] 验收标准 3：API / 原型测试覆盖该数据结构。

## 3. 设计与影响范围

- [x] 受影响页面 / 命令 / Agent / 模块已列出：`src/settings/`、`src/runtime/workbench-data.ts`、`src/ui/server.test.ts`、`src/runtime/workbench-data.test.ts`、Workbench Settings 前端。
- [x] 数据结构 / 配置变更已列出：新增 `settings.agentContexts` 数据，并在 `settings.nav` 中加入 `agent-context`。
- [x] 是否影响 README / docs / 示例：是，需求清单和参考文档已同步。
- [x] 是否影响测试用例：是，补充 Settings nav、Agent Context 数据和 Workbench API 断言。

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

- 验证命令：`npm run typecheck`；`npm test`；`npm run build`
- 验证环境：macOS / Node.js 20+
- 验证输入：Settings → Agent Context、Meta-Agent 上下文、生图 Agent 上下文
- 预期结果：Settings 中可见 Agent Context，API 和静态数据包含 `agentContexts`
- 实际结果：历史闭环 commit 已完成实现；F-008 迁移后复核仍通过类型检查、13 个自动化测试和构建，`rg` 确认正式 Workbench 前端、静态数据、Settings API 和 runtime 测试均包含 `agent-context` / `agentContexts`。

## 6. 文档同步

- [x] README / README.zh-CN 已同步
- [x] `docs/` 相关文档已同步
- [x] 示例数据 / 原型数据已同步

## 7. 提交闭环

- [x] Commit 已按规范编写
- [x] Commit type：feat
- [x] Commit scope：workbench
- [x] Commit subject：增加 Agent 运行上下文装配视图
- [x] Commit hash：38b54fa
- [x] 已在本清单记录最终结果

## 8. 完成说明

- 结果摘要：Workbench Settings 已增加 Agent Context 分组，可把模型角色、知识库、Skill、Tool、MCP、运行证据和产物策略按 Agent 维度串起来。
- 遗留问题：当前是可视化装配说明，不负责真实 MCP 服务启停、Skill 审核安装或知识库索引执行。
- 后续 Issue 建议：把 Agent Context 与真实运行事件和配置覆盖链路绑定，展示每次运行实际命中的能力版本与权限边界。
