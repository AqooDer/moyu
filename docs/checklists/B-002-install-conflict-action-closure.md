# B-002 安装冲突操作闭环

## 基本信息

- Issue / Bug 编号：B-002
- Bug 标题：安装冲突仅有结构化提示，没有明确操作闭环
- 发现日期：2026-06-09
- 负责人：Codex
- 关联模块 / scope：workbench

## 1. 问题定义

- [x] 现象描述已写清：安装 Meta-Agent 草案遇到同名 Agent 时，Workbench 只展示冲突文本和“创建新版本”按钮，用户无法在界面内查看差异，也没有明确的放弃 / 关闭冲突路径。
- [x] 复现步骤已写清：创建并安装 `custom/image-prototype-v1` 后，再创建同 ID 草案并点击“安装 Agent”，触发 `install_conflict`。
- [x] 期望行为已写清：冲突出现后，用户能在同一界面选择“创建新版本”“查看差异”“放弃安装 / 关闭冲突”。
- [x] 实际行为已写清：当前只有文本摘要和“创建新版本”，差异查看 API 已存在但没有前端操作入口，放弃路径只能靠切换任务间接清除。
- [x] 影响范围已评估：影响 Workbench 安装草案冲突处理，不影响后端安装、Agent 运行或真实文件合并。

## 2. 根因分析

- [x] 根因已确认，不是只修表象
- [x] 是否有历史回归因素：否
- [x] 是否需要补日志 / Trace / 提示信息：是

### 根因说明

- 根因：F-006 已补后端 `nextActions.viewDiff` 与版本化安装 API，但前端只消费 `createVersion`，没有把 `viewDiff` 和 discard 行为渲染为用户可操作路径。
- 触发条件：安装同 ID Agent 草案且正式 `agents/` 已存在目标目录。
- 为什么之前没挡住：已有测试覆盖后端 diff API 和版本化安装，但前端 helper 测试没有要求 View Diff / Discard action。

## 3. 修复方案

- [x] 修复策略已明确：在 Workbench 安装冲突状态下增加“查看差异”和“放弃安装”按钮，查看差异调用现有 diff API 并渲染文件清单；放弃安装仅清除前端冲突态。
- [x] 最小改动路径已确认：复用 `MoyuInstallModule` 解析 action，不新增后端接口，不实现文件级合并器。
- [x] 回归风险已评估：主要风险是按钮启停和状态提示污染正常安装 / 运行路径，通过 helper 测试和 Workbench API 回归测试覆盖。
- [x] 无关重构未混入

## 4. 回归保护

- [x] 已新增或更新自动化回归测试
- [x] 无法自动化时已补手工验证方案

## 5. 测试与验证

- [x] 原问题可稳定复现
- [x] 修复后复现步骤已通过
- [x] 类型检查通过
- [x] 构建通过
- [x] 关键回归场景已验证

### 验证记录

- 复现命令 / 步骤：`npm test` 中 Workbench 冲突流程已能稳定构造同 ID 草案并触发 409；代码审计确认前端仅渲染“创建新版本”。
- 修复后验证命令 / 步骤：`npm run typecheck`；`npm test`；`npm run build`；`git diff --check`；`node -e "JSON.parse(require('fs').readFileSync('ui/workbench/public/data/workbench.json','utf8'))"`；浏览器打开 `http://127.0.0.1:4178/ui/workbench/` 检查冲突操作按钮存在且默认隐藏。
- 验证环境：macOS / Node.js 20+
- 预期结果：冲突后可创建新版本、查看差异清单、放弃安装并恢复提示。
- 实际结果：类型检查通过；14 个自动化测试通过；构建通过；空白 diff 检查通过；Workbench JSON 解析通过；浏览器验收确认 `data-install-agent-diff` 与 `data-discard-install-conflict` 按钮存在，默认无冲突时隐藏。

## 6. 文档同步

- [x] 用户可见行为变化已同步文档
- [x] 命令 / 配置 / 说明已同步
- [x] 若无需文档同步，已说明原因：无新增命令或配置，已同步 Workbench README、工程状态、验收记录和缺陷清单。

## 7. 提交闭环

- [x] Commit 已按规范编写
- [x] Commit type：`fix`
- [x] Commit scope：workbench
- [x] Commit subject：补齐安装冲突操作闭环
- [x] Commit hash：提交后见最终回复
- [x] 已在本清单记录最终结果

## 8. 完成说明

- 修复摘要：Workbench 安装冲突态新增“查看差异”和“放弃安装”路径；查看差异复用现有 diff API 并在右侧预览区展示文件清单，放弃安装只清除前端冲突态。
- 风险与观察项：本次不实现逐文件合并器，不改变后端草案状态语义；后续仍可扩展为正式 diff merge UI。
- 后续 Issue 建议：为安装冲突增加逐文件可视化合并器与覆盖前二次确认。
