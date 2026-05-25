# 13 - Artifact 契约

> Moyu 的核心不是聊天结果，是**产物（Artifact）**。Artifact 是连接 Run 与用户价值的桥梁，也是质量反馈的最关键挂载点。
>
> 本文定义 Artifact 的类型、生命周期、版本、与 Run/Step/Trace 的关系，以及用户编辑作为质量信号的回流机制。
>
> 撰写日期：2026-05-20

---

## 1. 设计目标

1. **可识别**：任意时刻都能回答"这份 docx 是哪个 Agent 在哪个 Run 里生成的"。
2. **可对比**：同一 Task 的多个 Run 产出可 diff，看到迭代效果。
3. **可演化**：用户的人工编辑可被记录、被回流为质量信号、被 Monitor 学习。
4. **可信任**：产物可双向溯源到 Trace（含模型/Prompt/工具/原始输入）。
5. **可携带**：导出/分享单份产物时同时带走必要的上下文。

---

## 2. Artifact 是什么 / 不是什么

| 是 | 不是 |
| --- | --- |
| Run 产出的"用户可独立打开的文件" | 中间内存数据（那是 Step output） |
| 有明确类型、大小、哈希 | 一段聊天文本 |
| 与 Run / Step 强绑定 | 工作区里的随便一个文件 |
| 可被用户编辑、收藏、导出 | Trace 自身 |

---

## 3. 类型枚举（artifact.type）

| type | MIME | 用途 | v0.1 是否支持 |
| --- | --- | --- | --- |
| `docx` | application/vnd.openxmlformats-officedocument.wordprocessingml.document | Word 文档（标书等） | ✅ |
| `pptx` | application/vnd.openxmlformats-officedocument.presentationml.presentation | PPT | v0.2 |
| `xlsx` | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | Excel | v0.3 |
| `pdf` | application/pdf | 通用文档/扫描件 | v0.2 |
| `md` | text/markdown | 大纲、报告、笔记 | ✅ |
| `json` | application/json | 结构化数据（scoring_matrix、traceability） | ✅ |
| `csv` | text/csv | 表格数据 | v0.2 |
| `png` / `jpg` / `svg` | image/* | 图像产出（图表、生成图） | v0.3 |
| `txt` | text/plain | 通用文本 | ✅ |
| `html` | text/html | 富文本报告 | v0.3 |
| `mp3` / `wav` | audio/* | 语音输出（远期） | v1.x |
| `mp4` | video/* | 视频（远期） | v1.x |
| `zip` | application/zip | 多文件打包 | v0.4 |
| `other` | application/octet-stream | 兜底 | ✅ |

**type 是闭集**：新增类型必须走 PR 修本表。

---

## 4. role（产物角色）

一次 Run 通常产出多个 Artifact，按用途分 role：

| role | 含义 | 默认保留 | 用户可见层 |
| --- | --- | --- | --- |
| `primary` | 用户最终想要的主产物 | 永久 | Task 详情页顶部突出 |
| `intermediate` | 中间产物（outline / scoring_matrix 等） | 30 天 | Run 详情页折叠列出 |
| `report` | 自动生成的报告（coverage_report / traceability） | 永久（与 primary 同周期） | Task 详情页"质量报告"卡片 |
| `log` | 调试/日志（sandbox stdout 等） | 7 天 | Run 详情页"高级"展开 |

**以"写标书"为例**：

| Artifact | role |
| --- | --- |
| `result.docx` | `primary` |
| `outline.md` | `intermediate` |
| `scoring_matrix.json` | `intermediate` |
| `coverage_report.md` | `report` |
| `traceability.json` | `report` |
| `sandbox_stdout_step-4.log` | `log` |

---

## 5. 标识与命名

```ts
interface ArtifactId {
  id: string;                     // ulid，全局唯一
  task_id: string;                // 所属 Task
  run_id: string;                 // 由哪个 Run 产出
  producer_step_id: string;       // 由哪个 Step 写出（必填）
  version_seq: number;            // 同 task + 同逻辑名下的版本号，从 1 开始
}
```

**逻辑名（`name`）规则**：
- `name` 是稳定的"业务名"，跨 Run 一致（如 `result.docx`、`outline.md`）。
- `path` 是物理路径，每次新版本不同（避免覆盖）。

**物理路径模板**：
```
workspace/<wid>/artifacts/<task_id>/v<version_seq>/<name>
```

示例：
```
workspace/abc/artifacts/task-7/v1/result.docx
workspace/abc/artifacts/task-7/v1/outline.md
workspace/abc/artifacts/task-7/v2/result.docx   ← 第二次 Run 产出
```

---

## 6. 版本（Version）

### 6.1 版本递增规则
| 场景 | 行为 |
| --- | --- |
| 同 Task 的新 Run 产出同名 Artifact | `version_seq +1`，`parent_artifact_id` 指向上版 |
| 同 Run 重写同名 Artifact | ❌ 不允许；同 Run 内 name 必须唯一 |
| 用户在 UI 内编辑产物 | 见 §7，产生新 version 但 producer_step_id 为空、`edited_from_artifact_id` 指向源 |
| 用户重命名产物 | 等价于新 logical name，version_seq 从 1 开始 |

### 6.2 版本树示例
```
task-7
 ├── result.docx
 │    ├── v1  (Run r1, step s-4)
 │    ├── v2  (Run r2, step s-4)         ← 重跑
 │    └── v3  (User edit, from v2)       ← 人工编辑
 └── outline.md
      ├── v1  (Run r1, step s-3)
      └── v2  (Run r2, step s-3)
```

UI 应能呈现这种树，并支持版本间 diff（详见 §10）。

---

## 7. 用户编辑作为质量信号

这是 Monitor-Agent 评估"AI 写得好不好"最重要的隐式信号。

### 7.1 编辑入口
- Run 详情页打开 primary artifact → 内置编辑器（docx 用 docx-preview + 简单 patch；md 用 monaco）
- 也可"在外部应用打开"，编辑后回拖文件覆盖

### 7.2 编辑事件记录
每次编辑保存生成 `edit_event`：

```ts
{
  id: string;
  artifact_id: string;             // 编辑前 artifact
  new_artifact_id: string;         // 编辑后新生成的 artifact (v+1)
  editor: 'in_app' | 'external';
  diff_summary: {
    chars_added: number;
    chars_removed: number;
    edit_distance: number;         // Levenshtein 或近似
    sections_touched: string[];    // 标书场景：触及哪些章节
  };
  diff_blob_ref: string;           // 完整 diff（unified format）走 blob
  saved_at: string;
}
```

### 7.3 编辑率作为质量信号
派生指标：
- **edit_ratio = edit_distance / original_length**
  - < 5% → 高质量
  - 5%-20% → 中等
  - 20% → 低质量
- **section_edit_distribution**：哪些章节被改最多
  - 例如"7.3 安全管理"长期被大改 → Monitor 提示 Manifest 把该章节路由到 frontier tier

### 7.4 写入 feedback 表
- `feedback.target_kind = 'artifact'`
- `feedback.signal = 'edit'`
- `feedback.payload_json = diff_summary`
- `feedback.source = 'user'`

---

## 8. 与 Trace 的关系

每个 Artifact 必须可双向追溯：

```
Artifact
   │ ↑
   │ │ producer_step_id
   ▼ │
  Step ─► LLM/Tool Calls ─► messages/args
   │
   ▼
  Run ─► Input
```

### 8.1 UI 侧呈现
- 打开一份 docx → 点"溯源" → 跳转 Run 详情页 → 按 Step 时间线查看每一段是怎么生成的
- 对于业务 Recipe（如写标书），溯源应进一步精细到**章节级**：
  - 点章节标题 → 跳到 `section_writer` 的某次 LLM Call → 看 prompt 和 response
  - 点章节里的引用 → 跳回招标 PDF 对应页

### 8.2 多 Artifact 一致性
当 primary artifact 与 report artifact 不一致（如 coverage_report 说覆盖了 88%，但 docx 实际未覆盖）：
- 这是平台 bug，必须在 render 阶段做 cross-check
- 校验失败 → Run 进入 `failed`，error_code = `artifact_consistency_violation`

---

## 9. 存储与完整性

| 属性 | 实现 |
| --- | --- |
| 路径 | 见 §5 模板，强制 normalize；阻 `..` |
| 大小 | `size_bytes` 必填；写入时核对 |
| 哈希 | `sha256` 必填；写入完成后计算并落库 |
| 一致性 | DB 记录在 → 文件必须在；启动时做扫描，孤儿文件移到 `.orphan/` 待处理 |
| 完整性校验 | 用户主动"校验工作区"时按 sha256 重算 |
| 大文件 | > 100MB 警告；> 500MB 阻断（Workspace 设置可改） |
| 压缩 | 默认不压；`type=log` 强制 zstd |

**孤儿处理**：
- DB 有记录但文件丢失 → 标 `state='missing'`；UI 标灰；Monitor 报告
- 文件存在但 DB 无记录 → 移到 `.orphan/<date>/`；不自动删除

---

## 10. 跨版本 Diff

### 10.1 文本类（md/json/csv/txt）
- 直接 unified diff
- UI 高亮添加/删除

### 10.2 docx
- 借助 `mammoth` 或 LibreOffice headless 转 markdown → 走文本 diff
- v0.5 接入 LibreOffice 后可做"原生 docx track changes"

### 10.3 pptx / xlsx
- v0.3+ 按需实现

### 10.4 二进制（png 等）
- 仅展示元信息差异（大小、尺寸、像素直方图）
- 远期上图像感知 diff

---

## 11. 导出与分享

### 11.1 单 Artifact 导出
- 一键"导出当前版本"：复制到用户选定目录
- "导出 + 溯源":生成一个 zip，含：
  - artifact 本体
  - 相关 Step Trace（脱敏后）
  - coverage_report / traceability（如有）
  - 一个 README.md 说明这是什么、怎么生成的

### 11.2 Task 整包导出
- 一个 Task 的所有 Artifact 全部版本 + 所有 Run Trace → tar.zst
- 用于备份/迁移/给同事看

### 11.3 与 §12-Trace §9 的关系
- Artifact 导出与 Run 导出共用底层 packer 模块
- Artifact 导出是 Run 导出的子集 + 重排呈现

---

## 12. API（Core 层暴露给 UI）

```ts
interface ArtifactAPI {
  // CRUD
  get(id: string): Promise<Artifact>;
  listByTask(task_id: string, opts?: { role?: ArtifactRole }): Promise<Artifact[]>;
  listByRun(run_id: string): Promise<Artifact[]>;
  delete(id: string, opts?: { cascadeNewerVersions?: boolean }): Promise<void>;

  // 内容
  readContent(id: string): Promise<Buffer>;
  writeNewVersion(input: {
    base_artifact_id: string;
    content: Buffer;
    editor: 'in_app' | 'external';
    diff_summary?: DiffSummary;
  }): Promise<Artifact>;

  // 关系
  getProducerStep(id: string): Promise<Step>;
  getVersionTree(task_id: string, name: string): Promise<ArtifactVersionTree>;
  diff(a: string, b: string): Promise<UnifiedDiff>;

  // 反馈
  recordEdit(id: string, diff_summary: DiffSummary): Promise<void>;
  star(id: string, value: boolean): Promise<void>;

  // 导出
  export(id: string, options: ExportOptions): Promise<{ zipPath: string }>;
}
```

---

## 13. 边界与反例

| 错误用法 | 正确用法 |
| --- | --- |
| 把 Step output JSON 当 Artifact 存 | 仅当用户需要独立打开/编辑/分享时才升格为 Artifact |
| 把日志当 primary | log 必须是 `role='log'`；primary 仅留给用户产出 |
| 同 Run 两次写同名 Artifact | ❌ name 在 Run 内唯一；要多份 → 不同 name |
| 删除老版本以"省空间" | 老版本不可删（除非用户主动），它是版本树的祖先 |
| Artifact 路径写到 Workspace 之外 | ❌ 强制校验路径在 Workspace 内 |
| 编辑后丢弃旧版 | 编辑产生新版，**永远保留旧版**（保留质量信号源） |

---

## 14. v0.x 实施分阶段

| 版本 | 增量 |
| --- | --- |
| v0.0 | 仅 `result.docx`、`run.trace.json`，无契约（写在文件系统） |
| v0.1 | 全部 §4 §5 §6 §8 §9；UI 有"在文件管理器中显示"按钮 |
| v0.2 | role 体系完整；in-app md 编辑器；edit_event 记录 |
| v0.3 | docx in-app 预览；版本 diff（文本类） |
| v0.4 | 自动评分 Skill 写入 feedback；docx diff |
| v0.5 | OCR/图像 Artifact；ZIP 多文件打包 |
| v1.0 | 导出+溯源 zip；脱敏导出；Workspace 校验工具 |

---

## 15. 给后续工作的 Checklist

- [ ] §4 type 表加入代码常量文件（`artifact-types.ts`），UI/Core/Skill 共用
- [ ] 路径模板做成纯函数 + 单测；任何越界写入直接 throw
- [ ] 写入流水：先写临时 → fsync → 改名 → 入库（避免半写文件被记入 DB）
- [ ] sha256 用流式计算，避免大文件一次性入内存
- [ ] UI 删除前必弹"将删除 N 个版本"确认
- [ ] 让 Recipe 在 manifest 里声明它**承诺产出**哪些 Artifact（带 type + role），平台启动 Run 前先校验产出契约
- [ ] 提供"产物对比" UI：选两个版本 → 并排展示
