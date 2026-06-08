# F-007 Work / Message 持久化数据层

## 基本信息

- Issue / 任务编号：F-007
- 需求标题：Work / Message 持久化数据层
- 提出日期：2026-06-08
- 负责人：Codex
- 关联模块 / scope：runtime

## 1. 需求定义

- [x] 目标用户 / 使用场景已写清：用户在 Workbench 中查看任务会话时，需要从真实存储恢复任务列表和对话消息，而不是依赖静态原型状态。
- [x] 需求背景已写清：当前 Work 列表由 Run Trace 临时推导，中心消息仍是静态 DOM，后续搜索、筛选和状态恢复缺少基础数据层。
- [x] 本次范围（In Scope）已写清：新增本地 JSON Work / Message store，接入 Meta-Agent 创建和 Agent 运行，Workbench API 返回 `works` 与 `messages`。
- [x] 非本次范围（Out of Scope）已写清：不引入 SQLite，不实现全文搜索 UI，不实现复杂多项目权限模型，不迁移完整前端工程。
- [x] 依赖 / 前置条件已确认：依赖现有 Run Trace、Artifact 查询和 Workbench API。

## 2. 验收标准

- [x] 验收标准 1：Work、Message 有独立持久化结构。
- [x] 验收标准 2：Workbench 左侧列表与中间会话来自真实存储，并能从 Run 恢复。
- [x] 验收标准 3：数据结构支持后续搜索、筛选和状态恢复。

## 3. 设计与影响范围

- [x] 受影响页面 / 命令 / Agent / 模块已列出：`src/runtime/*`、`src/meta/create-agent.ts`、`src/agent/run.ts`、`src/ui/server.ts`、`ui/workbench-prototype/app.js`。
- [x] 数据结构 / 配置变更已列出：新增 `artifacts/workbench/work-store.json` 本地索引，Workbench API 新增 `messages` 字段。
- [x] 是否影响 README / docs / 示例：是，同步工程运行状态与原型 API 说明。
- [x] 是否影响测试用例：是，新增数据层测试并更新 Workbench API 测试。

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

- 验证命令：`npm run typecheck`；`npm test`；`npm run build`；`git diff --check`；`node -e "JSON.parse(require('fs').readFileSync('ui/workbench-prototype/data/workbench.json','utf8'))"`
- 验证环境：macOS / Node.js 20+
- 验证输入：Meta-Agent 创建草案、Agent dry-run、Workbench API 查询
- 预期结果：Work / Message 写入本地 store，Workbench API 返回可恢复任务和消息
- 实际结果：类型检查通过；12 个自动化测试通过；构建通过；空白 diff 检查通过；静态 Workbench JSON 解析通过。

## 6. 文档同步

- [x] README / README.zh-CN 已同步
- [x] `docs/` 相关文档已同步
- [x] 示例数据 / 原型数据已同步

## 7. 提交闭环

- [x] Commit 已按规范编写
- [x] Commit type：feat
- [x] Commit scope：runtime
- [x] Commit subject：增加 Work 与 Message 持久化层
- [ ] Commit hash：
- [x] 已在本清单记录最终结果

## 8. 完成说明

- 结果摘要：新增本地 Work / Message JSON store，Meta-Agent 创建、Agent 运行和安装动作会写入会话数据；Workbench API 返回真实 `works` / `messages`，并新增 `/api/works`、`/api/messages` 查询入口。
- 遗留问题：当前是 JSON store，不包含全文搜索索引；后续可升级为 SQLite 或专用索引层。
- 后续 Issue 建议：增加 Work 搜索 / 筛选 UI，并把消息写入扩展到运行过程中的 step progress。
