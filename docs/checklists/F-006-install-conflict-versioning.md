# F-006 安装冲突的版本化处理路径

## 基本信息

- Issue / 任务编号：F-006
- 需求标题：安装冲突的版本化处理路径
- 提出日期：2026-06-08
- 负责人：Codex
- 关联模块 / scope：meta

## 1. 需求定义

- [x] 目标用户 / 使用场景已写清：用户安装 Meta-Agent 生成的 Agent 草案时，如果正式目录已有同名 Agent，需要能安全继续。
- [x] 需求背景已写清：现有 `install_conflict` 只提示冲突，缺少“创建新版本 / 查看差异”的明确下一步。
- [x] 本次范围（In Scope）已写清：新增冲突响应结构、版本化安装 API、Workbench 冲突操作入口、自动化测试。
- [x] 非本次范围（Out of Scope）已写清：不实现完整文件级 diff UI，不允许静默覆盖，不改变 Agent 运行装配逻辑。
- [x] 依赖 / 前置条件已确认：依赖现有 Meta-Agent 草案记录、Agent manifest 校验和 Workbench API。

## 2. 验收标准

- [x] 验收标准 1：冲突响应能看到冲突 Agent、源路径、目标路径。
- [x] 验收标准 2：冲突响应和前端提供“创建新版本”与“查看差异”的明确入口。
- [x] 验收标准 3：默认安装不静默覆盖，只有版本化安装会写入未占用的新 Agent 目录。

## 3. 设计与影响范围

- [x] 受影响页面 / 命令 / Agent / 模块已列出：`src/meta/install-agent.ts`、`src/ui/server.ts`、`ui/workbench-prototype/*`。
- [x] 数据结构 / 配置变更已列出：冲突响应新增 `nextActions`，版本安装返回新 `agentId` 与 `targetPath`。
- [x] 是否影响 README / docs / 示例：是，更新 Workbench 原型 API 说明。
- [x] 是否影响测试用例：是，更新 API 与前端交互测试。

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

- 验证命令：`npm run typecheck`；`npm test`；`npm run build`；`git diff --check`
- 验证环境：macOS / Node.js 20+
- 验证输入：创建同名 Agent 草案后执行安装冲突与创建新版本
- 预期结果：冲突不覆盖已有 Agent，可安装为下一个未占用版本
- 实际结果：类型检查通过；11 个自动化测试通过；构建通过；空白 diff 检查通过。Workbench 浏览器点击工具在当前会话未暴露，已用 API 集成测试和前端 helper 测试覆盖等价点击行为。

## 6. 文档同步

- [x] README / README.zh-CN 已同步
- [x] `docs/` 相关文档已同步
- [x] 示例数据 / 原型数据已同步

## 7. 提交闭环

- [x] Commit 已按规范编写
- [x] Commit type：feat
- [x] Commit scope：meta
- [x] Commit subject：增加安装冲突版本化处理
- [x] Commit hash：325017f
- [x] 已在本清单记录最终结果

## 8. 完成说明

- 结果摘要：安装冲突现在返回结构化下一步动作、差异摘要，并支持把草案安装为下一个未占用 Agent 版本；Workbench 冲突状态会展示路径、拟创建版本并启用“创建新版本”入口。
- 遗留问题：当前只提供文件级差异摘要，尚未实现完整可视化 diff 合并界面。
- 后续 Issue 建议：为“查看差异”增加正式 UI 面板和逐文件合并策略。
