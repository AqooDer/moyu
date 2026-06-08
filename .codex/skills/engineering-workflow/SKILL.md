---
name: engineering-workflow
description: Use when working on any software project feature, bug fix, refactor, workflow update, coding-standard decision, todo planning, or commit preparation. Enforces one feature or one bug per issue, checklist-first delivery, Karpathy-style simple and surgical changes, required verification, and commit format `<type>(<scope>): <subject>`.
---

# Engineering Workflow

Follow this skill whenever you change code, docs, UI, runtime behavior, architecture, tests, or workflow in any repository.

## Load Local Context First

Read project-local instructions before changing files when they exist:

- `README*`
- `AGENTS.md`, `CLAUDE.md`, `.codex/`, `.cursor/rules/`
- project docs for coding standards, architecture, task lists, bugs, tests, and release notes
- project checklists for feature delivery or bug fixes

Treat local project rules as the source of truth when they are stricter or more specific. If the project has no local process docs, use this skill as the default workflow.

## Non-Negotiable Rules

1. One feature per issue, or one bug per issue.
2. One closed loop per commit.
3. Write or update the checklist before coding.
4. Define acceptance criteria and verification before implementation.
5. Keep changes surgical. Do not smuggle unrelated cleanup into the task.
6. Record the commit link or hash in the issue, todo item, or final handoff when available.

## Commit Format

Use:

```text
<type>(<scope>): <subject>
```

`scope` is optional. If omitted, use:

```text
<type>: <subject>
```

Rules:

- There must be one space after the colon.
- `subject` is required and should be short.
- Chinese or English is acceptable.
- Prefer a concrete scope such as a module, layer, package, app, directory, or workflow area.

Allowed `type` values:

- `feat` - new feature
- `fix` - bug fix
- `docs` - documentation or comments
- `style` - formatting only, no runtime behavior change
- `refactor` - restructuring or optimization without feature or bug behavior change
- `perf` - performance optimization
- `test` - tests
- `chore` - build process, auxiliary tooling, or routine maintenance
- `revert` - revert
- `build` - packaging or build output

Examples:

```text
feat(settings): 增加模型角色配置
fix(runtime): 修复 dry-run 统计错误
docs(process): 补充需求与 bug 闭环规范
```

## Todo Lists

If the project does not already define a task system, maintain two project-local lists:

- Feature list: planned requirements, enhancements, and user-facing changes.
- Bugfix list: defects, regressions, quality fixes, and known verification gaps.

Each item should include:

- stable id
- type: feature or bug
- status
- scope and out-of-scope
- acceptance criteria
- verification plan
- linked commit message or commit hash after completion

Do not start implementation until the current item has a small delivery checklist that covers code, tests, verification, docs/config updates, and commit closure.

## Feature Workflow

Use this order:

1. Define scope, out-of-scope, acceptance criteria, affected modules, and verification.
2. Implement the minimum code that satisfies the current requirement.
3. Add or update tests when behavior changes.
4. Run verification and record the result.
5. Update docs, examples, config notes, or prototypes when relevant.
6. Close the loop with one standards-compliant commit.

## Bug Workflow

Use this order:

1. Reproduce or precisely describe the bug before fixing it.
2. Identify the root cause, not just the symptom.
3. Fix with the smallest change that removes the root cause.
4. Add a regression test when practical.
5. Re-run reproduction and regression verification.
6. Close the loop with one `fix(...)` commit.

## Karpathy-Style Guardrails

- Think before coding. Surface assumptions, tradeoffs, and uncertainty.
- Prefer the simplest thing that fully solves the task.
- Avoid speculative abstractions and unused configurability.
- Touch only lines that trace to the current request.
- If adjacent problems appear, record them for a later issue instead of expanding scope.
- Transform work into verifiable goals and keep looping until the defined checks pass or a real blocker is named.

## Architecture And Configuration Guardrails

When changing models, knowledge bases, agents, skills, tools, MCP, secrets, or integration settings:

- Define roles and responsibilities before binding concrete provider ids, model ids, tools, or storage backends.
- Prefer explicit precedence such as `Project defaults -> Component override -> Runtime parameters -> Local secrets`.
- Make fallback behavior visible and deterministic instead of silent.
- Capture runtime evidence when defaults are unclear, but ask before choices affect cost, data exposure, or security.
- Never commit secrets. Keep credentials in local env, secret stores, or documented deployment configuration.
- Do not write generated artifacts back into a knowledge base without explicit rules for permission, source metadata, deduplication, and rollback.

## Definition Of Done

The task is not done until the relevant items are closed:

- checklist
- code
- tests
- manual verification when needed
- docs, README, examples, config, or prototype data when affected
- issue/todo linkage
- standards-compliant commit
