# F-011 Repository Local Cleanup Checklist

## 基本信息

- Issue / 任务编号：F-011
- 需求标题：清理仓库本地环境与生成物目录
- 提出日期：2026-06-08
- 负责人：Codex
- 关联模块 / scope：`structure`

## 1. 需求定义

- [x] 目标用户 / 使用场景已写清：维护者需要清晰区分源码、项目资产、本地环境配置和生成物。
- [x] 需求背景已写清：`.idea/`、`.codex/skills/`、`dist/`、`artifacts/`、`traces/` 等内容会干扰工程目录判断。
- [x] 本次范围（In Scope）已写清：移除已跟踪的 IDE / 本地 skill 痕迹，补 `.gitignore`，清理低风险本地生成目录。
- [x] 非本次范围（Out of Scope）已写清：不删除历史 Agent 版本、品牌候选素材和 `node_modules/`。
- [x] 依赖 / 前置条件已确认：F-010 已完成源码 settings 分层。

## 2. 验收标准

- [x] `.idea/` 不再被 Git 跟踪。
- [x] `.codex/skills/` 不再被 Git 跟踪。
- [x] `dist/`、`artifacts/`、`traces/` 被清理且仍被忽略。
- [x] 自动化验证通过。

## 3. 设计与影响范围

- [x] 受影响页面 / 命令 / Agent / 模块已列出：不影响业务模块，只影响仓库文件组织和忽略规则。
- [x] 数据结构 / 配置变更已列出：`.gitignore` 增加本地环境与生成物规则。
- [x] 是否影响 README / docs / 示例：是，同步工程运行文档和任务清单。
- [x] 是否影响测试用例：否。

## 4. 实现清单

- [x] 代码实现完成
- [x] 空态 / 加载 / 失败 / 正常态已覆盖：本次不涉及 UI。
- [x] 默认值与回退路径已处理：本次不涉及运行配置。
- [x] 无关改动未混入

## 5. 测试与验证

- [x] 自动化测试已新增或更新
- [x] 类型检查通过
- [x] 构建通过
- [x] 手工验证已完成

### 验证记录

- 验证命令：`npm run typecheck`；`npm test`；`npm run build`；`git diff --check`
- 验证环境：macOS / Node.js 本地仓库
- 验证输入：清理后的源码树和默认测试数据
- 预期结果：测试、类型检查、构建和 diff 检查通过；本地生成目录不会重新进入 Git 状态。
- 实际结果：全部通过；`npm test` 共 8 个子测试通过。构建生成的 `dist/` 已在验证后再次清理。

## 6. 文档同步

- [x] README / README.zh-CN 已同步：本次不涉及用户入口变化。
- [x] `docs/` 相关文档已同步
- [x] 示例数据 / 原型数据已同步：本次不改变示例配置。

## 7. 提交闭环

- [x] Commit 已按规范编写
- [x] Commit type：`chore`
- [x] Commit scope：`structure`
- [x] Commit subject：`清理本地环境与生成物目录`
- [x] Commit hash：提交后见最终回复
- [x] 已在本清单记录最终结果

## 8. 完成说明

- 结果摘要：移除版本库中的 `.idea/` 与项目内 `.codex/skills/engineering-workflow`，补齐本地环境和生成物忽略规则，并清理 `dist/`、`artifacts/`、`traces/`。
- 遗留问题：历史 Agent 版本和品牌候选素材需单独确认后再归档或删除。
- 后续 Issue 建议：如确认 `custom__image-prototype-v*` 已无保留价值，可单独创建 Agent 归档/清理任务。
