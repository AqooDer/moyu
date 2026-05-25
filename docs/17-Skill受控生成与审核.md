# 17 - Skill 受控生成与审核

> ADR-008 决定 **Meta-Agent 可以按需生成 Skill 代码**,但 ADR-003(2026-05-21 修订版)钉了**"按需 + 受控 + 必审核"**。本文回答:**什么时候生?生什么?怎么审?跑在哪儿?坏了怎么办?**
>
> 撰写日期:2026-05-21

---

## 1. 设计原则

1. **优先复用,不轻易生**:Meta-Agent 先在 Skill Registry 找现成的;**找不到**才考虑生成。
2. **不生大代码,只生小 Skill**:单个生成 Skill 上限 ~150 行 TS;超出 → Meta-Agent 必须拆分或求助用户。
3. **强约束模板**:生成走固定骨架(输入校验 + Host API 调用 + 输出格式化),LLM 只填中间的业务逻辑。
4. **必走人工审核**:任何生成的 Skill 在持久化前必经用户 ✓ ;**默认不自动通过**。
5. **必跑 L1 沙箱**:Host API 是唯一的对外通道;没有 `require('fs')` 等任意能力。
6. **可观察可回滚**:Skill 的每一次生成 / 修改 / 启用 / 禁用都进 history(`15 §3.5`)与 Trace(`12 §4.9`)。

---

## 2. 触发时机

Meta-Agent 在 SPEC_DRAFT 阶段会决定"这个 Agent 需要哪些 Step";对每个 Step,按下面的决策树:

```
Step 需要的能力(由 prompt 推断)
   │
   ▼
1. Skill Registry 找 → 有匹配 → 直接引用 ✅
   │ 无
   ▼
2. 现有 Skill 能否"参数化"满足 → 能 → 引用 + 参数 ✅
   │ 不能
   ▼
3. 能否拆成几个现有 Skill 串联 → 能 → 走 sub-workflow ✅
   │ 不能
   ▼
4. **决定生成新 Skill** → 进 SKILL_REQUEST 子状态机(§3)
```

**"找不到"≠"立刻生"**:Meta-Agent 必须先向用户说明:"我需要一个新 Skill 来做 X,现有 Skill 库都不满足,我能不能现写一个?"——用户确认后才进 §3。

---

## 3. SKILL_REQUEST → SKILL_REVIEW 子状态机

(挂在 `05 §2` Meta-Agent 主状态机的 SPEC_DRAFT 之内)

```
                  ┌─────────────────┐
                  │ SKILL_REQUEST   │  用户已同意"可以生"
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ SKILL_DRAFT     │  填模板骨架(§4)
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ STATIC_CHECK    │  Type/lint/permission(§5)
                  └────────┬────────┘
              失败 ┌───────┴───────┐ 通过
                   ▼               ▼
          ┌──────────────┐  ┌─────────────────┐
          │ SELF_FIX     │  │ SANDBOX_DRY_RUN │  L1 沙箱 + minimal_input
          │ (限 3 次)    │  └────────┬────────┘
          └──────────────┘   失败 ┌──┴──┐ 通过
                                  ▼     ▼
                          ┌─────────────────┐
                          │ HUMAN_REVIEW    │  Diff 展示 + 沙箱报告
                          └────────┬────────┘
                          采纳 / 修改 / 拒绝
                                  │
                                  ▼
                          ┌─────────────────┐
                          │ PERSIST         │  写入 agents/<id>/skills/
                          └─────────────────┘
```

---

## 4. Skill 骨架(模板)

Meta-Agent 不写空白文件,而是按 `kind` 选骨架填空。

### 4.1 `kind: code` 骨架(TypeScript)

```ts
// skills/<name>/index.ts
import type { SkillContext, SkillResult } from '@moyu/skill-sdk';
import { z } from 'zod';

// ─── INPUT/OUTPUT SCHEMA ──────────────────────────────────────────
export const inputSchema = z.object({
  /* Meta-Agent 填这里 */
});

export const outputSchema = z.object({
  /* Meta-Agent 填这里 */
});

// ─── HOST API USAGE DECLARATION ───────────────────────────────────
export const permissions = {
  /* Meta-Agent 填这里。例:
   *   "host.fs.read": ["${input.image_path}"],
   *   "host.fs.write": ["${workspace}/artifacts/${run_id}/**"],
   *   "host.llm.call": false,
   *   "host.network.fetch": ["api.openai-relay.example.com"],
   */
};

// ─── BUSINESS LOGIC ───────────────────────────────────────────────
export default async function run(
  input: z.infer<typeof inputSchema>,
  ctx: SkillContext,
): Promise<SkillResult<z.infer<typeof outputSchema>>> {
  /* Meta-Agent 填这里。
   * 只允许 await ctx.host.* 调用外部副作用。
   * 普通 JS 表达式 / 数据结构 / Array 方法都可以用。
   */
}
```

Meta-Agent 的 prompt 模板要求**只允许修改 4 个标注区域**;其余结构(import、export default 签名、permissions 字段名)由模板锁定。

### 4.2 `kind: llm` 骨架

更简单,几乎就是一个 prompt:

```yaml
# skills/<name>/skill.yaml
kind: llm
tier: balanced-writing
input_to_prompt:
  template: file:./prompt.md
  variables: [...]
output_parser:
  kind: json
  schema: ...
```

LLM Skill **不涉及任意代码执行**,只涉及 prompt 文本与 schema 校验,安全风险低,审核流程简化(详见 §6)。

### 4.3 Host API 白名单(`@moyu/skill-sdk`)

| API | 描述 | 默认 |
| --- | --- | --- |
| `ctx.host.fs.read(path)` | 读文件;path 必须匹配 `permissions["host.fs.read"]` 模式 | 关 |
| `ctx.host.fs.write(path, buf)` | 写文件;同上 | 关 |
| `ctx.host.fs.tmpDir()` | 申请临时目录(自动清理) | 开 |
| `ctx.host.llm.call(req)` | 调 LLM(走 Router) | 默认开 |
| `ctx.host.tool.call(toolRef, args)` | 调用现有 Tool/MCP | 默认开,具体 tool 走 permissions |
| `ctx.host.network.fetch(url, init)` | HTTP;`url` host 必须在 `permissions["host.network.fetch"]` 中 | 默认关 |
| `ctx.host.log(level, msg, fields)` | 写 Trace | 开 |
| `ctx.host.artifact.write(meta, buf)` | 产生 Artifact(详见 13) | 开,scope 限本 Run |
| `ctx.host.workspace.get(key) / set(key, val)` | Workspace 命名空间数据(对应 16 §6.2) | 开,scope 限本 Agent 命名空间 |

**绝对禁止**:`require` / `import()` 动态加载、`process` / `fs` / `child_process` / `worker_threads` 直接访问、`globalThis.*` 改写、网络绕过 host.network。

---

## 5. 静态检查(STATIC_CHECK)

并行跑:

| 项 | 工具 | 不通过即拒 |
| --- | --- | --- |
| 类型检查 | `tsc --noEmit` 单文件模式 | ✅ |
| Lint(危险用法) | ESLint + 自定义规则集 `@moyu/eslint-plugin-skill` | ✅ |
| 禁用 API 扫描 | AST 扫描(babel parser):禁见 `require/import/process/fs/...` | ✅ |
| Permission 一致性 | 静态扫描代码里实际用到的 host.*,与 declared permissions 取交集等价 | ✅ |
| 行数上限 | < 150 行业务区(模板区不计) | ⚠ 警告,允许人工放过 |
| 圈复杂度 | < 12 | ⚠ |
| TODO/FIXME | 不允许出现 | ⚠ |
| Schema 完整 | `inputSchema` / `outputSchema` 非空 | ✅ |

**自定义 ESLint 规则示例**:
- `no-dynamic-import`
- `no-process-global`
- `no-fs-direct`
- `require-permission-declaration`
- `no-eval`
- `no-implicit-network`

---

## 6. 沙箱试跑(SANDBOX_DRY_RUN)

- 跑 L1(worker_threads + isolated-vm)
- 输入 = Meta-Agent 给的 `minimal_input`(每个 Skill 必带,模板要求)
- 资源限额:CPU 2s、内存 128MB、网络 5 次、文件 IO 50 次
- 越权(尝试调未声明的 host API)→ 立刻终止,记进沙箱事件(`12 §4.7`)
- 输出 = JSON,必须通过 `outputSchema` 校验

**沙箱试跑报告**(进 HUMAN_REVIEW 时展示):
```
✅ 类型检查通过
✅ 静态扫描:无禁用 API
✅ Permission 一致
✅ 沙箱试跑成功
   Input:  { ... }
   Output: { ... }
   耗时:  342ms
   CPU:    180ms
   Mem:    23MB
   Host API 调用:
     - host.network.fetch("api.openai-relay.example.com/v1/images/generations") × 1
     - host.artifact.write({ type: "png", role: "primary" }) × 4
```

---

## 7. HUMAN_REVIEW(用户审核 UI)

唤起一个 Drawer/Modal,展示:

```
┌─────────────────────────────────────────────────────────────────┐
│ 审核 Meta-Agent 想新增的 Skill                                    │
│ ────────────────────────────────────────────────────────────────  │
│ Skill 名:image_gen_via_relay                                     │
│ 来由:Agent "image-gen/prototype-v1" Step `image_gen` 需要        │
│                                                                  │
│ Tab:[📄 代码] [📜 Permissions] [🧪 沙箱报告] [⚠ 静态警告]         │
│                                                                  │
│  ┌─ 代码(只读) ───────────────────────────────────────────────┐ │
│  │ + export const inputSchema = z.object({ ... });             │ │
│  │ + export default async function run(input, ctx) {           │ │
│  │ +   const resp = await ctx.host.network.fetch(...);         │ │
│  │ +   ...                                                      │ │
│  │ + }                                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─ Permissions ──────────────────────────────────────────────┐ │
│  │ host.network.fetch: ["api.openai-relay.example.com"]       │ │
│  │ host.artifact.write: { scope: run }                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  审核选项:                                                       │
│  [✓ 采纳]  [✎ 修改后采纳]  [↻ 让 Meta-Agent 重写]  [✗ 拒绝]      │
└─────────────────────────────────────────────────────────────────┘
```

**采纳前必看**:沙箱报告里调了哪些 Host API,与 Permissions 是否一致(UI 标红不一致项)。

**修改后采纳**:打开内嵌 monaco 编辑器,用户改完点保存 → 走一遍 §5 + §6 → 通过才落库。

**拒绝**:Meta-Agent 收到拒绝 + 用户反馈 → 退回 §3 SELF_FIX 或向用户求助。

---

## 8. 持久化(PERSIST)

落到 Agent 文件夹:
```
agents/<agent-id>/skills/<skill_name>/
  skill.yaml            # 元信息(§4.1 skill.yaml 示例)
  index.ts              # 业务代码
  prompt.md             # (若 LLM Skill)
  minimal_input.json    # 沙箱试跑用的最小输入
  review.json           # 审核记录:{ reviewer, decision, timestamp, ... }
```

同时:
- `agents/<agent-id>/history/<ts>-add-skill.patch` 记录这次变更
- Manifest 的 `skills_used` 加入新 Skill 引用
- Trace 写 `meta_agent_sessions.skill_generation` 子事件

---

## 9. 失败回路

| 场景 | 处理 |
| --- | --- |
| STATIC_CHECK 反复失败(3 次) | Meta-Agent 向用户报告:"自动生成失败,建议手写或换思路",**不允许**强行落库 |
| SANDBOX_DRY_RUN 输出与 outputSchema 不一致 | 同上 |
| HUMAN_REVIEW 用户拒绝 + 给出文字反馈 | 反馈进 SELF_FIX 上下文,再来一次(限 3 次) |
| HUMAN_REVIEW 用户始终不满 | 提示"切换到手写 Skill 模式 / 退回到无新 Skill 的方案" |
| 落库后用户跑出问题 | 在 Agent 详情页一键"禁用此 Skill"(不删,改 `skill.yaml.disabled: true`);Manifest 引用该 Skill 的 Step fallback 到错误状态 |

---

## 10. Skill 升级与替换

- 同名 Skill 更新 = 走完整 §3 流程,只是 `skill.yaml.version` +1
- 历史版本保留在 `skills/<name>/.archive/<version>/`(占空间不大)
- Run 时 Step 指定 `skill_version: "1.0.x"`(默认最新)
- 平台跨 Workspace 升级 Skill SDK 时,需对所有自研 Skill 做兼容性扫描(Meta-Agent 离线跑一遍 STATIC_CHECK)

---

## 11. 与 LLM Skill 的差异化处理

LLM Skill(`kind: llm`)风险面小很多:
- 没有任意代码执行
- 走 Router 的 LLM 调用计费已被监控
- 审核只看 prompt 文本与 schema

**简化审核流程**:
- 跳过 §5 静态检查(无代码)
- §6 沙箱试跑仍跑(用 minimal_input 调一次 LLM 看返回是否解析得到)
- §7 用户审核只看 prompt 文本 + 一次试跑结果

---

## 12. 与 ADR 的关系

| ADR | 内容 | 本文如何兑现 |
| --- | --- | --- |
| ADR-003(修订) | 配置驱动 + **受控**代码生成 | 强约束模板 + 必审 + 沙箱 |
| ADR-005 | 沙箱 L1 用 isolated-vm | §6 直接采用 |
| ADR-008 | 把"agent create agent"做实 | §3 子状态机就是 ADR-008 的实施 |

---

## 13. v0.x 实施分阶段

| 版本 | 增量 |
| --- | --- |
| v0.0~v0.1 | **不允许 Skill 生成**;Meta-Agent 只装配现有 Skill |
| v0.2 | LLM Skill 生成上线(风险低);走 §11 简化流程 |
| v0.3 | code Skill 生成上线(完整 §3~§9);沙箱 L1 必须已就绪 |
| v0.4 | Monitor 学习"哪些生成的 Skill 被频繁修改",反馈给模板库 |
| v0.5 | Skill 模板库扩充(图像处理、文件转换等);减少全新生成 |
| v1.0 | Skill 签名 + 跨 Workspace 分享时的可信链 |

---

## 14. 不在本文范围(明确排除)

- ❌ 用户**自己手写** Skill 的开发文档(放 `docs/skill-dev.md`,v1.0 前补)
- ❌ Marketplace 模型(远期)
- ❌ Skill 跨 Agent 共享(v0.x 都是 Agent 局部 Skill;共享走 Skill Registry,与本文无关)
- ❌ 多语言 Skill(只 TS;Python skill 用 MCP 包裹后通过 Tool 调,不走本文流程)

---

## 15. 给后续工作的 Checklist

- [ ] `@moyu/skill-sdk` 类型 + Host API 一比一对齐本文
- [ ] `@moyu/eslint-plugin-skill` 写 5 条核心规则(§5)
- [ ] Meta-Agent 的 SKILL_DRAFT prompt 模板做 few-shot:**每个 Host API 各一份正反例**
- [ ] HUMAN_REVIEW UI 与 14 号文档同步(挂在 S-10 Meta-Agent 对话屏的 Drawer)
- [ ] 沙箱试跑超时/越权事件要在 Trace 高亮(`12 §4.7`)
- [ ] 文档:写一份"Skill 审核 5 分钟速通"给用户(放 `docs/skill-review-guide.md`)
- [ ] 跑通"image-gen Recipe 触发生成一个 image_gen Skill"作为 v0.3 demo case
