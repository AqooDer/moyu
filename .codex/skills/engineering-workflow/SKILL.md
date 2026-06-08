---
name: engineering-workflow
description: 通用工程工作流 / engineering workflow。用于任意项目的需求 feature、bug/fix、refactor、test、docs、todo、编码规范和 commit；要求一个需求或 bug 一个闭环、清单先行、Karpathy-style 简洁改动、验证后提交，并采用 Conventional Commits。
---

# 通用工程工作流

改代码、文档、测试、配置或流程时使用。项目本地规范优先；没有本地规范时，以此 Skill 为默认规则。

## 先读上下文

改动前优先查看项目内已有说明：

- `README*`
- `AGENTS.md`, `CLAUDE.md`, `.codex/`, `.cursor/rules/`
- 编码规范、架构、任务清单、缺陷清单、测试、发布说明等文档

若本 Skill 与项目规范冲突，遵循更具体、更严格的项目规范。

## 硬规则

1. 一个需求一个 issue，一个 bug 一个 issue。
2. 一个任务闭环一个 commit；不要夹带无关清理。
3. 先写或更新清单，再动代码。
4. 先定义验收标准和验证方式，再实现。
5. 完成后把 commit message 或 hash 回填到 issue/todo/交付说明。

## 提交规范

采用 Conventional Commits 简化版：

```text
<type>(<scope>): <subject>
```

`scope` 可省略；冒号后必须有空格；`subject` 必填，可中英文。

允许的 `type`：

- `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`, `build`

```text
feat(settings): 增加模型角色配置
fix(runtime): 修复 dry-run 统计错误
docs(process): 补充需求与 bug 闭环规范
```

## 清单

如果项目没有任务系统，维护两个本地清单：

- 需求清单：功能、增强、体验改进。
- Bug 清单：缺陷、回归、质量问题、验证缺口。

每项至少记录：id、类型、状态、范围/非范围、验收标准、验证方式、完成后的 commit。

## 执行流程

需求：

1. 明确范围、非范围、验收标准、影响模块、验证方式。
2. 用最小改动实现当前需求。
3. 补测试，跑验证，更新相关文档/示例/配置。
4. 回填清单并提交。

Bug：

1. 先复现或精确定义问题。
2. 找根因，不只修症状。
3. 用最小改动修复，尽量补回归测试。
4. 复跑复现步骤和回归验证。
5. 回填清单并用 `fix(...)` 提交。

## Karpathy-style 约束

- 先想清楚再写代码；说出假设、取舍和不确定性。
- 优先选择能完整解决问题的最简单方案。
- 不做投机抽象，不加暂时用不到的配置。
- 只改和当前任务有因果关系的代码。
- 相邻问题先记入后续 issue，不扩大本次范围。

## 完成定义

清单、代码、测试/验证、相关文档、issue/todo 回填、规范提交全部完成后，任务才算结束。
