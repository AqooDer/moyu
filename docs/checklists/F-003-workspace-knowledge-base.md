# Feature Delivery Checklist - F-003 Workspace 知识库基础层

> 用于“一次只做一个需求闭环”。开始编码前先补全内容后再进入实现。

## 基本信息

- Issue / 任务编号：F-003
- 需求标题：Workspace 知识库基础层
- 提出日期：2026-06-08
- 负责人：Codex
- 关联模块 / scope：`knowledge`

## 1. 需求定义

- [x] 目标用户 / 使用场景已写清：Workspace 管理者需要声明可供 Agent 使用的知识库集合，并在设置中心查看默认装配。
- [x] 需求背景已写清：模型角色已经具备 Workspace 默认配置，知识库仍停留在静态原型字段，无法作为后续 RAG、回流与审核的基础。
- [x] 本次范围（In Scope）已写清：配置读取、默认值、API/UI 展示、测试与文档。
- [x] 非本次范围（Out of Scope）已写清：真实切片、索引、召回、写回执行与审核 UI。
- [x] 依赖 / 前置条件已确认：复用 `moyu.config.json` 与 Workbench 设置中心。

## 2. 验收标准

- [x] 验收标准 1：`moyu.config.json` 可声明或覆盖 Workspace 知识库集合。
- [x] 验收标准 2：集合可绑定嵌入角色、切片策略、来源、连接 Agent 与允许回流产物类型。
- [x] 验收标准 3：`/api/settings` 和 Settings → Knowledge 展示最终生效的知识库配置。

## 3. 设计与影响范围

- [x] 受影响页面 / 命令 / Agent / 模块已列出：Workbench Settings、`/api/settings`、`ui export-data`、运行时配置层。
- [x] 数据结构 / 配置变更已列出：新增 `knowledge_bases` 配置段。
- [x] 是否影响 README / docs / 示例：是。
- [x] 是否影响测试用例：是。

## 4. 实现清单

- [x] 代码实现完成
- [x] 空态 / 加载 / 失败 / 正常态已覆盖：沿用设置中心状态层，Knowledge 数据缺失时仍走已有空态 / 失败 / 回退。
- [x] 默认值与回退路径已处理：缺少 `moyu.config.json` 时使用内置默认知识库集合。
- [x] 无关改动未混入

## 5. 测试与验证

- [x] 自动化测试已新增或更新
- [x] 类型检查通过
- [x] 构建通过
- [x] 手工验证已完成

### 验证记录

- 验证命令：`npm test`；`npm run typecheck`；`npm run build`；`git diff --check`；`npm run prototype:workbench -- --port 4178`
- 验证环境：macOS / Node.js 20+ / 本地 Moyu workspace
- 验证输入：默认配置与含 `knowledge_bases` 的临时 Workspace 配置
- 预期结果：配置可读取，API 与 UI 可展示，默认与覆盖路径均稳定
- 实际结果：全部通过；浏览器打开 `http://127.0.0.1:4178/ui/workbench-prototype/#settings/knowledge`，可见“知识库与回流”、默认知识库、“回流启用”、“允许产物类型”、`markdown` 与 `image-description`。

## 6. 文档同步

- [x] README / README.zh-CN 已同步或确认无需同步：本次为工程配置层，已同步工程文档，无需改根 README。
- [x] `docs/` 相关文档已同步
- [x] 示例数据 / 原型数据已同步

## 7. 提交闭环

- [x] Commit 已按规范编写
- [x] Commit type：`feat`
- [x] Commit scope：`knowledge`
- [x] Commit subject：`增加 Workspace 知识库配置层`
- [ ] Commit hash：
- [x] 已在本清单记录最终结果

## 8. 完成说明

- 结果摘要：新增 Workspace 知识库配置读取层，并接入 Workbench `/api/settings`、静态数据与 Settings → Knowledge 展示。
- 遗留问题：真实切片、索引、召回和审核后写回不在 F-003 范围。
- 后续 Issue 建议：F-004 实现审核后的 Agent 产物真实回流知识库。
