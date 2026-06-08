# F-008 Workbench 原型迁移到正式前端工程

## 基本信息

- Issue / 任务编号：F-008
- 需求标题：Workbench 原型迁移到正式前端工程
- 提出日期：2026-06-09
- 负责人：Codex
- 关联模块 / scope：frontend

## 1. 需求定义

- [x] 目标用户 / 使用场景已写清：开发者需要在正式前端目录中维护 Workbench，而不是继续把所有文件堆在 `workbench-prototype` 根目录。
- [x] 需求背景已写清：当前原型已有设置中心、Agent 创建、安装、运行、Work/Message 数据层，继续使用扁平原型目录会阻碍组件化和后续构建。
- [x] 本次范围（In Scope）已写清：迁移到 `ui/workbench/`，形成 `src`、`src/modules`、`public/data` 结构，更新服务入口、文档和测试。
- [x] 非本次范围（Out of Scope）已写清：不引入 React/Vite 等新框架，不重写 UI 视觉，不实现新的业务功能。
- [x] 依赖 / 前置条件已确认：复用现有 Workbench API、设置模块、安装模块和静态资源。

## 2. 验收标准

- [x] 验收标准 1：具备独立工程结构、组件划分、状态管理模块入口。
- [x] 验收标准 2：原型当前功能无明显回退，旧 `workbench-prototype` 路径有兼容入口。
- [x] 验收标准 3：新设置中心被纳入正式工程，并保留 hash 路由。

## 3. 设计与影响范围

- [x] 受影响页面 / 命令 / Agent / 模块已列出：`ui/workbench/`、`ui/workbench-prototype/`、`src/ui/server.ts`、前端模块测试和文档。
- [x] 数据结构 / 配置变更已列出：不新增后端数据结构；静态数据移动到 `ui/workbench/public/data/workbench.json`。
- [x] 是否影响 README / docs / 示例：是，同步 Workbench 路径和 API 说明。
- [x] 是否影响测试用例：是，更新模块加载路径并新增前端结构 / 静态入口验证。

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

- 验证命令：`npm run typecheck`；`npm test`；`npm run build`；`git diff --check`；`node -e "JSON.parse(require('fs').readFileSync('ui/workbench/public/data/workbench.json','utf8'))"`
- 验证环境：macOS / Node.js 20+
- 验证输入：Workbench 正式路径、旧原型路径、Settings hash 路由、关键安装/运行模块测试
- 预期结果：`/ui/workbench/` 可作为正式入口，旧路径可跳转，设置中心与关键交互测试通过
- 实际结果：类型检查通过；13 个自动化测试通过；构建通过；空白 diff 检查通过；静态 Workbench JSON 解析通过；新增静态路由测试覆盖 `/ui/workbench/` 与旧 `/ui/workbench-prototype/` 兼容入口。

## 6. 文档同步

- [x] README / README.zh-CN 已同步
- [x] `docs/` 相关文档已同步
- [x] 示例数据 / 原型数据已同步

## 7. 提交闭环

- [x] Commit 已按规范编写
- [x] Commit type：refactor
- [x] Commit scope：frontend
- [x] Commit subject：迁移 Workbench 正式前端结构
- [x] Commit hash：cececb3
- [x] 已在本清单记录最终结果

## 8. 完成说明

- 结果摘要：Workbench 已从扁平 `ui/workbench-prototype/` 迁移到 `ui/workbench/`，形成 `src/`、`src/modules/`、`public/data/` 结构；本地服务默认入口改为 `/ui/workbench/`，旧路径保留跳转入口；设置模块、安装模块、静态数据、文档和测试均已同步。
- 遗留问题：当前仍是无打包器的静态前端，大文件 `src/app.js` 后续需要继续拆分为更清晰的状态与视图模块。
- 后续 Issue 建议：新增 Workbench 前端组件化拆分任务，优先拆出 Work list、Conversation、Inspector 与 Settings shell。
