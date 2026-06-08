---
name: moyu-engineering-workflow
description: Use when working in the Moyu repository on a feature, bug fix, workflow update, commit planning, todo creation, or coding-standard decision. Enforces one feature or one bug per issue, checklist-first execution, Karpathy-style simple and surgical changes, required verification, and commit format `<type>(<scope>): <subject>`.
---

# Moyu Engineering Workflow

Follow this skill whenever you are changing code, docs, UI, runtime behavior, or workflow in the Moyu repo.

## Load the source of truth

Read these files first:

- `docs/24-协作与编码规范.md`
- `docs/25-当前需求任务清单.md` for feature work
- `docs/26-当前缺陷与质量修复清单.md` for bug or quality fixes
- `docs/checklists/feature-delivery-checklist.md` or `docs/checklists/bugfix-delivery-checklist.md`

## Non-negotiable rules

1. One feature per issue, or one bug per issue.
2. One closed loop per commit.
3. Write the checklist first, then code.
4. Define verification before implementation.
5. Keep changes surgical. Do not smuggle unrelated cleanup.

## Commit format

Use:

```text
<type>(<scope>): <subject>
```

Examples:

```text
feat(workbench): 增加设置中心与模型角色配置原型
fix(runtime): 修复 dry-run 下 artifact 数量统计错误
docs(process): 补充需求与 bug 闭环协作规范
```

Allowed `type`:

- `feat`
- `fix`
- `docs`
- `style`
- `refactor`
- `perf`
- `test`
- `chore`
- `revert`
- `build`

## Feature workflow

Use the feature checklist and do this in order:

1. Define scope, out-of-scope, acceptance criteria, and affected modules.
2. Implement the minimum code that satisfies the current request.
3. Add or update tests when behavior changes.
4. Run verification and record the result.
5. Sync docs, examples, and config notes.
6. Close the loop with one standards-compliant commit.

## Bug workflow

Use the bugfix checklist and do this in order:

1. Reproduce the bug first.
2. Identify the root cause, not just the symptom.
3. Fix with the smallest change that removes the root cause.
4. Add a regression test when practical.
5. Re-run reproduction and regression verification.
6. Close the loop with one `fix(...)` commit.

## Karpathy-style engineering guardrails

- Think before coding. Surface assumptions and tradeoffs.
- Prefer the simplest thing that fully solves the task.
- Avoid speculative abstractions and unused configurability.
- Touch only lines that trace to the current request.
- If you notice adjacent problems, record them for a later issue instead of expanding scope.

## Moyu-specific architecture rules

When changing models, knowledge bases, skills, tools, or MCP:

- Define model roles before binding concrete model ids.
- Prefer `Workspace defaults -> Agent override -> Run parameters`.
- Make fallback behavior explicit instead of silent.
- Capture runtime evidence when defaults are unclear.
- Do not allow artifact write-back into knowledge bases without explicit rules.

## Definition of done

The task is not done until all relevant items are closed:

- Code
- Tests
- Manual verification when needed
- Docs / README / prototype data
- Checklist closure
- Standards-compliant commit
