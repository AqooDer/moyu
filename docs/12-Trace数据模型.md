# 12 - Trace 数据模型

> Trace 是 Moyu 的中枢神经系统。监控、回放、成本分析、质量评估、调试——全部依赖它。
>
> 本文定义 Trace 的字段、表结构、存储策略、脱敏规则、保留策略、查询模式与演进规则。
>
> **关键原则**：Trace schema 在 v0.1 一开始就要尽量定死。后续可加字段，但**不要删字段、不要改语义**。
>
> 撰写日期：2026-05-20

---

## 1. 设计目标

1. **完整可回放**：任意一次 Run 的全部 Step IO、LLM prompt/response、Tool 调用、Artifact、用户反馈，都可在不依赖原 Provider 的情况下回放。
2. **成本可归因**：每个 token、每分美元都能追到具体 Run / Step / Agent / Recipe / Rule。
3. **质量可挂载**：用户的 👍/👎/重跑/编辑 信号都能挂到具体颗粒度上。
4. **隐私可控**：脱敏可配置；用户可手动 redact 任意 Run。
5. **存储有界**：默认保留策略；大对象不撑爆 SQLite。

---

## 2. 实体关系图

```
                 ┌──────────┐
                 │ Task     │ (1)
                 └────┬─────┘
                      │
                      ├──────────────────────┐
                      │ (N)                  │ (1, latest)
                 ┌────▼─────┐         ┌──────▼──────┐
                 │ Run      │ ────► (Workspace)
                 └────┬─────┘
                      │
        ┌─────────────┼──────────────┬──────────────┐
        │ (N)         │ (N)          │ (N)          │ (N)
   ┌────▼────┐   ┌────▼─────┐   ┌────▼─────┐   ┌────▼────────┐
   │ Step    │   │ Artifact │   │ Feedback │   │ SandboxEvent│
   └────┬────┘   └──────────┘   └──────────┘   └─────────────┘
        │
        ├────────────────┐
        │ (0-N)          │ (0-N)
   ┌────▼────────┐  ┌────▼───────┐
   │ LLMCall     │  │ ToolCall   │
   └─────────────┘  └────────────┘
```

- 一个 Step 可以包含 0-N 个 LLMCall（如重试、内部 sub-prompt）和 0-N 个 ToolCall。
- 一个 Artifact 必须挂 producer_step_id。
- Feedback 可挂 Run / Step / Artifact 任一层级。

---

## 3. 存储分层

| 层 | 用途 | 实现 |
| --- | --- | --- |
| **核心表**（结构化、可索引） | 元信息、状态、统计 | SQLite (`moyu.db`) |
| **大对象 blob** | Step IO、LLM messages、Tool args/result | 文件系统：`workspace/<wid>/traces/<run_id>/<obj_id>.json.zst` |
| **Artifact 文件** | 实际产物（docx/pptx 等） | 文件系统：`workspace/<wid>/artifacts/<run_id>/...` |
| **索引** | 全文检索、向量搜索（远期） | SQLite FTS5；远期 LanceDB |

**为什么不全部塞 SQLite？**
- 单 Run 的 LLM messages 总和可达 MB 级；几千 Run 就把 DB 撑到 GB，备份/查询都难受。
- 大对象单独存便于按 Run 整包归档/导出/删除。
- 走 `zstd` 压缩，典型 prompt/response 压缩比 5-10x。

**ref 字段约定**：核心表里存大对象时不存内容，存 `output_ref: "traces/<run_id>/s-12.json.zst"`。

---

## 4. 核心表 schema（SQLite，TypeScript 伪代码）

> 字段命名规则：`snake_case`，时间戳 ISO 8601 UTC，金额单位 USD（DECIMAL 文本存储）。

### 4.1 `runs`
```ts
{
  id: TEXT PK,                       // ulid
  task_id: TEXT FK,
  workspace_id: TEXT,
  agent_id: TEXT,
  agent_version: TEXT,
  recipe_id: TEXT NULL,

  state: TEXT,                       // queued/preparing/running/paused/cancelling/succeeded/failed/cancelled
  reason: TEXT NULL,                 // 失败/取消原因
  started_at: TEXT,
  ended_at: TEXT NULL,
  duration_ms: INTEGER NULL,
  parent_run_id: TEXT NULL,          // 重试链

  input_ref: TEXT,                   // blob 路径
  input_summary_json: TEXT,          // 结构化摘要（轻量，可索引）
  model_roles_json: TEXT,            // v0.1 文件 Trace 用 run.modelRoles 记录角色/provider/model/fallback

  cost_tokens_in: INTEGER DEFAULT 0,
  cost_tokens_out: INTEGER DEFAULT 0,
  cost_usd: TEXT DEFAULT '0',        // DECIMAL string
  step_count: INTEGER DEFAULT 0,

  trace_schema_version: INTEGER,     // ★ 用于 schema 迁移
  created_at, updated_at
}
INDEX: (workspace_id, started_at DESC), (task_id), (agent_id, state)
```

v0.1 文件 Trace 中，`run.modelRoles[]` 先作为轻量结构化字段落地，字段包含：

- `roleId`：模型用途角色，如 `conversation-primary` / `image-generation`
- `provider`：最终命中的 Provider 标识
- `model`：最终调用或计划调用的具体模型
- `source`：`builtin_default` / `workspace_config` / `agent_manifest` / `runtime_env`
- `fallbackReason`：缺配置、环境变量覆盖等回退原因；无回退时为 `null`
- `providerEndpoint`：可选，真实 Provider endpoint 或 `null`

### 4.2 `steps`
```ts
{
  id: TEXT PK,                       // ulid
  run_id: TEXT FK,
  parent_step_id: TEXT NULL,         // 嵌套（如 Skill 内部 LLM Step）
  ordinal: INTEGER,                  // 在 Run 内的序号（便于稳定排序）
  name: TEXT,                        // 'extract_pdf' / 'section_writer'
  kind: TEXT,                        // 'llm' | 'tool' | 'skill' | 'control'

  state: TEXT,
  attempt: INTEGER DEFAULT 1,
  sandbox_level: TEXT,               // 'L0' | 'L1' | 'L2'

  started_at: TEXT NULL,
  ended_at: TEXT NULL,
  duration_ms: INTEGER NULL,

  input_ref: TEXT NULL,
  output_ref: TEXT NULL,
  input_summary_json: TEXT,          // size, type, key fields
  output_summary_json: TEXT,

  error_code: TEXT NULL,
  error_message: TEXT NULL,
  error_retriable: INTEGER NULL,     // 0/1

  cpu_ms: INTEGER NULL,
  mem_peak_mb: INTEGER NULL,
  tokens_in: INTEGER DEFAULT 0,
  tokens_out: INTEGER DEFAULT 0,
  cost_usd: TEXT DEFAULT '0'
}
INDEX: (run_id, ordinal), (run_id, state), (name, state)
```

### 4.3 `llm_calls`
```ts
{
  id: TEXT PK,
  step_id: TEXT FK,
  run_id: TEXT,                      // 冗余便于直接按 run 聚合
  ordinal: INTEGER,                  // step 内序号

  provider: TEXT,                    // 'anthropic' / 'openai' / ...
  model: TEXT,                       // 实际模型名（不抽象）
  model_tier: TEXT,                  // tiny/small/medium/large/frontier
  router_rule_id: TEXT NULL,         // 命中的路由规则
  is_fallback: INTEGER DEFAULT 0,    // 是否是 fallback 调用

  messages_ref: TEXT,                // 完整 messages 走 blob
  messages_summary_json: TEXT,       // 角色数、字符数、是否含图等
  prompt_hash: TEXT,                 // sha256，用于发现重复 prompt
  response_ref: TEXT,
  response_summary_json: TEXT,

  tokens_in: INTEGER,
  tokens_out: INTEGER,
  tokens_cache_read: INTEGER DEFAULT 0,
  tokens_cache_write: INTEGER DEFAULT 0,
  cost_usd: TEXT,

  request_started_at: TEXT,
  first_token_at: TEXT NULL,         // TTFT
  request_ended_at: TEXT,
  ttft_ms: INTEGER NULL,
  duration_ms: INTEGER,

  finish_reason: TEXT NULL,          // 'stop'/'length'/'tool_use'/...
  error_code: TEXT NULL
}
INDEX: (run_id, ordinal), (model, request_started_at), (prompt_hash)
```

### 4.4 `tool_calls`
```ts
{
  id: TEXT PK,
  step_id: TEXT FK,
  run_id: TEXT,
  ordinal: INTEGER,

  tool_ref: TEXT,                    // 'builtin/fs/read-file' / 'mcp://web-search/search'
  source: TEXT,                      // 'builtin' / 'mcp' / 'user_skill'
  mcp_server_id: TEXT NULL,

  args_ref: TEXT,
  args_summary_json: TEXT,
  result_ref: TEXT,
  result_summary_json: TEXT,

  duration_ms: INTEGER,
  error_code: TEXT NULL,
  error_message: TEXT NULL,
  idempotency_key: TEXT NULL         // 用于跨重试去重
}
INDEX: (run_id, ordinal), (tool_ref), (idempotency_key)
```

### 4.5 `artifacts`
> 详细契约见 `13-Artifact契约.md`。Trace 这里只存索引字段。
```ts
{
  id: TEXT PK,
  run_id: TEXT FK,
  producer_step_id: TEXT,
  task_id: TEXT,                     // 冗余便于跨 Run 检索同 Task 的所有 artifact

  type: TEXT,                        // docx/pptx/pdf/json/md/csv/png/...
  role: TEXT,                        // 'primary' | 'intermediate' | 'report' | 'log'
  name: TEXT,
  path: TEXT,
  size_bytes: INTEGER,
  sha256: TEXT,

  version_seq: INTEGER,              // 同 task 同 name 下的版本号
  parent_artifact_id: TEXT NULL,     // 编辑后的新版指向旧版

  created_at: TEXT
}
INDEX: (run_id, role), (task_id, name, version_seq), (sha256)
```

### 4.6 `feedback`
```ts
{
  id: TEXT PK,
  workspace_id: TEXT,

  target_kind: TEXT,                 // 'run' | 'step' | 'artifact'
  target_id: TEXT,

  signal: TEXT,                      // 'thumb_up' | 'thumb_down' | 'rerun'
                                     // | 'edit' | 'comment' | 'star'
  payload_json: TEXT NULL,           // 评论文本 / 编辑统计等

  source: TEXT,                      // 'user' | 'auto_scorer'
  scorer_skill_ref: TEXT NULL,       // 来自自动评分 Skill 时

  created_at: TEXT
}
INDEX: (target_kind, target_id), (workspace_id, created_at DESC)
```

### 4.7 `sandbox_events`
```ts
{
  id: TEXT PK,
  step_id: TEXT FK,
  run_id: TEXT,
  ts: TEXT,

  kind: TEXT,                        // 'spawn' / 'capability_request' / 'capability_grant'
                                     // / 'capability_deny' / 'quota_exceeded' / 'oom' / 'timeout'
  level: TEXT,                       // L0/L1/L2
  payload_json: TEXT
}
INDEX: (run_id, ts), (kind, ts)
```

### 4.8 `router_decisions`
```ts
{
  id: TEXT PK,
  llm_call_id: TEXT FK,
  rule_id: TEXT,                     // 命中规则
  tier_requested: TEXT,
  tier_actual: TEXT,                 // 可能因预算/健康降级
  candidate_chain_json: TEXT,        // 完整 fallback 链
  notes_json: TEXT
}
INDEX: (llm_call_id), (rule_id)
```

### 4.9 `meta_agent_sessions`
> Meta-Agent 自己的对话也走 Trace（详见 `05 §12`），便于复盘"为什么 Meta-Agent 造出了这样的 Agent"。
```ts
{
  id: TEXT PK,
  workspace_id: TEXT,
  produced_agent_id: TEXT NULL,
  state: TEXT,                       // INTAKE/SPEC_DRAFT/...
  transcript_ref: TEXT,              // blob
  validate_attempts: INTEGER,
  dry_run_attempts: INTEGER,
  outcome: TEXT,                     // 'persisted' | 'abandoned' | 'failed'
  ...
}
```

---

## 5. 大对象 Blob 规范

| 文件 | 内容 | 压缩 |
| --- | --- | --- |
| `traces/<run_id>/run-input.json.zst` | Run 完整输入 | zstd L3 |
| `traces/<run_id>/s-<step_id>.in.json.zst` | Step 输入 | zstd L3 |
| `traces/<run_id>/s-<step_id>.out.json.zst` | Step 输出 | zstd L3 |
| `traces/<run_id>/llm-<call_id>.msgs.json.zst` | LLM messages 数组 | zstd L3 |
| `traces/<run_id>/llm-<call_id>.resp.json.zst` | LLM 响应 | zstd L3 |
| `traces/<run_id>/tool-<call_id>.args.json.zst` | Tool 参数 | zstd L3 |
| `traces/<run_id>/tool-<call_id>.result.json.zst` | Tool 结果 | zstd L3 |
| `traces/<run_id>/sandbox-stdout-<step_id>.log.zst` | Sandbox 输出日志 | zstd L3 |

**规则**：
- 单文件 > 5MB → 写入前警告（可能是 prompt 设计有问题）
- 单 Run 总 blob > 100MB → 写入前阻断，要求用户调整
- 文件名严格 ASCII，避免跨平台问题

---

## 6. 摘要字段（`*_summary_json`）

Summary 是**为了不读 blob 就能做大多数查询和列表展示**而存在的轻量结构。

| 摘要字段 | 关键字段 |
| --- | --- |
| `runs.input_summary_json` | `{ type, size, file_count, top_keys, ... }` |
| `steps.input_summary_json` | `{ char_count, role_breakdown, has_image }` |
| `llm_calls.messages_summary_json` | `{ role_counts, total_chars, image_count, tool_use_count }` |
| `llm_calls.response_summary_json` | `{ text_chars, tool_use_count, stop_reason }` |
| `artifacts` | type/size/sha256 直接是列，无 summary |

**规则**：Summary 是衍生数据，**不作为 Source of Truth**。Blob 才是。

---

## 7. 脱敏（Redaction）

### 7.1 默认行为
- **不主动脱敏**——用户数据全本地，默认保留完整 prompt/response。
- 用户可在 Workspace 设置开启脱敏规则。

### 7.2 可配置规则
```yaml
# workspace_settings.redaction
enabled: false
rules:
  - kind: regex
    pattern: '\d{17}[0-9X]'           # 身份证
    replacement: '[REDACTED:idcard]'
  - kind: regex
    pattern: '1[3-9]\d{9}'           # 手机
    replacement: '[REDACTED:phone]'
  - kind: keyword
    list: ["我们公司内部代号 X"]
    replacement: '[REDACTED:internal]'
scope:
  - llm_messages
  - tool_args
  - artifacts                          # 是否对产物也脱敏（默认 false）
```

### 7.3 手动 redact
- Run 详情页提供"redact"按钮 → 在 blob 文件中替换对应文本 → 在 `runs` 表加 `redacted_at` 标记。
- 操作不可逆；UI 二次确认。

### 7.4 导出脱敏
- 用户导出 Run 包时可选"脱敏模式"，强制按规则脱敏后再打包。
- 用于"分享给同事查看 Trace"场景。

---

## 8. 用户反馈挂载策略

| 信号 | 默认挂载 | 多次触发行为 |
| --- | --- | --- |
| 👍 / 👎 | Run | 后写覆盖前写 |
| `rerun` | Run | 每次新 feedback |
| `edit` artifact | Artifact | 累计写入 edit_log |
| 文字 comment | Step（或 Run，由 UI 选择） | 每次新 feedback |
| `star` (收藏) | Run | toggle |

**自动评分 Skill 写的 feedback**：
- `source = 'auto_scorer'`
- `scorer_skill_ref` 指明哪个 Skill
- 与用户显式反馈分开聚合，避免互相污染统计

---

## 9. 保留与归档

### 9.1 默认策略（Workspace 设置可改）
| 数据 | 默认保留 |
| --- | --- |
| `runs` / `steps` / `llm_calls` / `tool_calls` 元数据 | 永久 |
| Blob 大对象 | 90 天后压成 tar 归档；180 天后删（除非有 feedback） |
| Artifact (`role='primary'`) | 永久（除非用户删 Task） |
| Artifact (`role='intermediate'`) | 30 天 |
| `sandbox_events` | 30 天 |
| `meta_agent_sessions` | 永久（用于 Meta-Agent 自身优化） |

### 9.2 归档格式
- `archives/<year>-<month>/<run_id>.tar.zst`
- 元数据表加 `archived_at`，blob 路径透明指向 tar 内 entry
- 读取走透明解压（牺牲一点性能换存储）

### 9.3 用户操作
- 一键删除 Task → 级联删除其全部 Run / Step / Blob / Artifact
- 一键导出 Run → tar.zst 包含元数据 JSON + 全部 blob + artifact

---

## 10. 查询模式（典型 SQL 形态）

```sql
-- 最近 7 天总成本与请求量
SELECT model, SUM(tokens_in+tokens_out), SUM(CAST(cost_usd AS REAL))
FROM llm_calls
WHERE request_started_at > datetime('now','-7 day')
GROUP BY model;

-- 某 Agent 失败率
SELECT
  ROUND(100.0 * SUM(state='failed') / COUNT(*), 2) AS fail_pct
FROM runs WHERE agent_id = ?;

-- 命中规则 Top 10
SELECT router_rule_id, COUNT(*) c
FROM llm_calls JOIN router_decisions ON router_decisions.llm_call_id = llm_calls.id
GROUP BY router_rule_id ORDER BY c DESC LIMIT 10;

-- 一个 Task 的产物版本树
SELECT version_seq, name, path, created_at
FROM artifacts WHERE task_id = ? ORDER BY version_seq;

-- Monitor 输入：同 Step 在不同 Tier 上的对比
SELECT model_tier, AVG(duration_ms), AVG(CAST(cost_usd AS REAL))
FROM llm_calls JOIN steps ON steps.id = llm_calls.step_id
WHERE steps.name = ? AND steps.run_id IN (SELECT id FROM runs WHERE agent_id = ?)
GROUP BY model_tier;
```

---

## 11. Schema 演进规则

| 操作 | 是否允许 | 备注 |
| --- | --- | --- |
| 加新列（nullable / 有 default） | ✅ | 走 migration；`trace_schema_version` +1 |
| 加新表 | ✅ | 同上 |
| 加新索引 | ✅ | |
| 删除列 | ❌ | 改为标记 `deprecated`，停止写入但保留读取 |
| 重命名列 | ❌ | 新增 + 双写过渡期 + 老列 deprecate |
| 改列语义 | ❌（严格禁止） | 新加一列，老列保留 |
| 改 enum 取值含义 | ❌ | 新枚举值，老值标 `legacy_` 前缀 |

**Migration 工具**：
- `better-sqlite3-migrations`，文件命名 `NNNN_description.sql`
- 每次升级 App 启动时自动检测并迁移
- 失败回滚 + 备份原 DB

---

## 12. v0.x 实施分阶段

| 版本 | Trace 实现层次 |
| --- | --- |
| v0.0 (尖刺) | 单 JSON 文件，字段名已对齐本规范 |
| v0.1 | SQLite 表全部建立；写入 runs/steps/llm_calls/artifacts/sandbox_events |
| v0.2 | + feedback（v0.2 UI 才有 👍/👎 按钮） |
| v0.3 | + router_decisions（v0.3 有 Router 才有意义） |
| v0.4 | + meta_agent_sessions 已存在但开始被 Monitor 消费；归档机制启用 |
| v0.5 | + LanceDB 向量索引（用于"语义查找历史 Run"） |
| v1.0 | + 用户导出/导入 zip；脱敏 UI |

---

## 13. 给后续工作的 Checklist

- [ ] 在 v0.0 阶段就把 JSON 字段名敲定，写在 `trace-types.ts`，v0.1 迁移到 SQLite 时直接复用类型
- [ ] migration 0001 必须建全 §4 中的所有表（哪怕 v0.1 不写入某些表，结构先建好）
- [ ] 每个写 Trace 的接口都要有"开关"，便于测试与压测
- [ ] 写 Trace 不能阻塞业务路径：用 WAL + 异步队列
- [ ] Blob 写入失败不可丢——失败要把对象暂存到 `traces/.pending/`，定时重试
- [ ] 给 CLI 提供 `moyu trace show <run_id>` 和 `moyu trace replay <run_id>`
- [ ] 写一份 "Trace 字段含义对照表" 给将来调试的人
