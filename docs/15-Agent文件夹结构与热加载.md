# 15 - Agent 文件夹结构与热加载

> ADR-008 决定 Meta-Agent 要"实质性"地造 Agent,本文回答:**造出来的 Agent 长什么样、放哪儿、用户怎么改、平台怎么实时响应改动**。
>
> 核心契约:**单文件夹 = 单 Agent**,与平台解耦,可用任何编辑器打开,可 zip 分享、可 git 提交。
>
> 撰写日期:2026-05-21

---

## 1. 设计目标

1. **单一物理形态**:一个 Agent 就是一个文件夹,没有"隐藏在数据库里的部分"。
2. **可读、可改、可分享**:用任意编辑器(VSCode/Cursor/记事本)都能改,zip 一打就能传给同事。
3. **热加载**:用户在外部改了文件,平台**自动检测并 reload**,不需要重启。
4. **可回滚**:每次 Meta-Agent 改这个 Agent 都留一个 history 快照,坏了能退。
5. **git 友好**:文件夹本身就是一个可 git init 的工作树,二进制资源走 LFS(可选)。
6. **跨平台**:路径分隔符、文件名大小写、行尾符在 macOS/Win/Linux 都正常。

---

## 2. 目录契约(canonical)

```
workspace/<wid>/agents/<agent-id>/
├── manifest.yaml              ★ 必须:Agent 元信息 + 工作流 + 路由 + 引用
├── ui.yaml                    ★ 必须:声明式 UI Schema(详见 16)
├── prompts/                   ⭕ 推荐:提示词模板(Markdown,可被 Skill 引用)
│   ├── system.md
│   └── <skill_name>.md
├── skills/                    ⭕ 可选:自研 Skill(详见 17)
│   ├── <skill_name>/
│   │   ├── skill.yaml         # Skill 元信息 + I/O schema
│   │   ├── index.ts           # 入口(必须 default export)
│   │   ├── prompt.md          # 关联 prompt(若 LLM Skill)
│   │   └── tests/             # 单测(推荐)
│   └── ...
├── assets/                    ⭕ 可选:静态资源(参考图、模板 docx、字体等)
├── history/                   ★ 必须:Meta-Agent 修改快照
│   ├── <ts>-<reason>.patch    # unified diff
│   └── <ts>-<reason>.meta.json
├── README.md                  ★ 必须:Meta-Agent 自动生成的"这是什么 Agent"
└── .agentignore               ⭕ 可选:类 gitignore,告诉平台哪些文件不参与 reload
```

打 ★ 是必须;⭕ 是按需。**最简 Agent** = `manifest.yaml + ui.yaml + history/ + README.md`,共 3 个文件 1 个目录。

---

## 3. 各文件契约

### 3.1 `manifest.yaml`
- 完整 schema 见 `05-元智能体设计.md §3` + `16 §2.4`(`ui_ref` 字段)。
- 必含字段:`agent_id` / `version` / `recipe_ref`(可空) / `workflow` / `inputs_schema` / `outputs_schema` / `routing` / `permissions`。
- **不允许**包含 UI 字段——UI 走 `ui.yaml`,职责分离。

### 3.2 `ui.yaml`
- 完整 schema 见 `16-声明式UI Schema.md`。
- 分三段:`intake`(输入表单)/ `run`(运行时附加视图)/ `output`(产出展示) + 可选 `workspace_views`(Workspace 级页面贡献)。

### 3.3 `prompts/*.md`
- 纯 Markdown + Mustache 变量(`{{var}}`)。
- 顶部可带 frontmatter:
  ```yaml
  ---
  bound_to: skills.draft_section
  variables: [section_name, score_points, reference_text]
  ---
  ```
- Skill 通过 `loadPrompt('xxx.md')` 引用,避免散在代码里。

### 3.4 `skills/<name>/skill.yaml`
```yaml
name: my_custom_image_postprocess
kind: code            # code | llm
inputs:               # zod-like schema
  type: object
  required: [image_path, target_format]
  properties:
    image_path: { type: string }
    target_format: { type: string, enum: [png, jpg, webp] }
outputs:
  type: object
  properties:
    out_path: { type: string }
permissions:          # 受限调用,详见 17 §3
  fs.read: ["${input.image_path}"]
  fs.write: ["${workspace}/artifacts/${run_id}/**"]
  host.llm.call: false
sandbox: L1
generated_by: meta-agent
generated_at: 2026-05-21T14:22:11Z
reviewed_by: user
review_decision: accepted
```

### 3.5 `history/`
每次任何写操作落一对文件:
- `<ts>-<reason>.patch` — 对该 Agent 文件夹的 unified diff
- `<ts>-<reason>.meta.json` — `{ author: "meta-agent" | "user", reason, session_id, parent: "<prev-ts>" }`

**reason 枚举**:`initial-create` / `intake-edit` / `add-skill` / `update-ui` / `user-edit-external` / `rollback`。

UI 可呈现为时间线,一键回滚 = 反向 apply。

### 3.6 `README.md`
Meta-Agent 自动生成,用户可改。模板:
```markdown
# {{agent_name}}

> {{one_line_description}}

## 用途
{{detailed_description}}

## 输入
- {{input_field_1}}: {{description}}
- ...

## 产出
- {{output_field_1}}: {{description}}

## 使用提示
{{usage_notes}}

## 由 Meta-Agent 生成
- Recipe: {{recipe_ref or "无(从零造)"}}
- 创建时间: {{created_at}}
- 最近修改: {{last_modified}}
```

### 3.7 `.agentignore`
跟 `.gitignore` 同语法。默认平台 ignore:`node_modules/` / `.DS_Store` / `*.log` / `tests/` / `*.tsbuildinfo`。

---

## 4. 命名与 ID

### 4.1 `agent_id`(逻辑名)
- 格式:`<recipe_namespace>/<slug>-<version>` 或 `custom/<slug>`
- 例:`image-gen/prototype-v1`、`custom/my-summarizer`
- 大小写:全小写;分隔符 `/` 与 `-`
- 限制:仅 `[a-z0-9/-]`,不超过 64 字符
- **不可改**:改 `agent_id` 视为新建 Agent

### 4.2 文件夹名(物理)
- = `<agent_id>` 把 `/` 换成 `__`
- 例:`image-gen/prototype-v1` → `image-gen__prototype-v1/`
- 跨平台安全(避免大小写敏感问题用全小写,避免冒号/星号等保留字)

### 4.3 `version`
- semver(`1.0.2`)
- Meta-Agent 改 Manifest 时按 patch 自动 +1
- 用户在 UI 里"重大升级"按钮 = 询问改 minor 还是 major

---

## 5. 热加载机制

### 5.1 监听
- `chokidar` 监听 `workspace/<wid>/agents/<agent-id>/**`
- 排除 `.agentignore` + 平台默认 ignore
- debounce 300ms(避免编辑器写入中途触发)

### 5.2 reload 流程
```
文件变化事件 (debounced)
   │
   ▼
1. 检查变化文件类型
   ├── manifest.yaml / ui.yaml → 走 schema 校验
   ├── skills/*/skill.yaml      → 走 Skill schema 校验
   ├── skills/*/index.ts        → 走 TypeScript 编译 + lint
   ├── prompts/*.md             → 仅校验 frontmatter
   └── README.md / assets/      → 直接 reload(无需校验)
   │
   ▼
2. 校验通过?
   ├── 是 → 走 atomic reload(见 §5.3)
   └── 否 → UI 显示错误徽章 + 错误详情;不影响正在跑的 Run
   │
   ▼
3. atomic reload 完成
   ├── 通知 UI:Agent 已更新,显示 toast"Agent xxx 已 reload"
   └── 已选中该 Agent 的页面自动刷新
```

### 5.3 atomic reload
- 新版本 Agent 装配 → 内存中构造新 `AgentRuntime` 实例
- 旧版本仍在跑的 Run **不打断**(Run 引用的是创建时的快照)
- 新 Run 一律用最新版本

### 5.4 编辑冲突
- 平台正写文件 + 用户同时改 → 平台写入前比较 mtime;mtime 不一致 → 弹"外部已修改,要 a) 覆盖,b) 合并,c) 取消"
- "合并"走 git 三方合并(`isomorphic-git`)

---

## 6. 用户编辑流程

### 6.1 入口
- Agent 详情页右上角 [📂 在外部编辑器打开]
  - macOS:`open <folder>` 用默认 Finder;若装了 VSCode/Cursor,`code <folder>` 或 `cursor <folder>` 二选一
  - Win/Linux:类似
- 设置 → 通用 → "外部编辑器" 可指定默认命令

### 6.2 编辑后回流
- 平台自动监听 → 校验 → reload(§5)
- 用户在外部改了不合法的文件 → UI 红色徽章 + 错误堆栈,Agent 不可跑直到修好
- "回退到上一个有效版本":一键从 `history/` 最近一条 patch 反向 apply

### 6.3 与 Meta-Agent 改写的协同
- 用户外部改了文件 → 平台标 `human-edit-pending`
- 之后用户在 UI 唤起 Meta-Agent 继续改这个 Agent → Meta-Agent 必须 **先读最新文件 + 把人工改动作为上下文**,不能用陈旧快照
- 每次 Meta-Agent 写入也在 history/ 加一条,reason = `meta-agent-modify` + session_id 关联

---

## 7. import / export / 分享

### 7.1 export
- 单 Agent 导出 = `tar.zst <agent-id>__<ts>.tar.zst`,含整文件夹 + 一份 `EXPORT_MANIFEST.json`(平台版本、依赖 Skill 版本、ZodSchema 版本)
- "导出脱敏":自动剔除 `assets/` 中含 EXIF/水印的图、prompts 中匹配脱敏规则的文本

### 7.2 import
- 拖一个 `.tar.zst` 到 Workspace → 平台:
  1. 解压到临时目录
  2. 验签(可选,v1.0)
  3. 校验 `EXPORT_MANIFEST.json` 平台版本兼容
  4. 校验 Manifest/UI/Skill schema
  5. **冲突检查**:`agent_id` 已存在 → 询问 a) 跳过,b) 覆盖(老的进 history),c) 改名为 `<agent_id>-imported`
  6. Skill 代码二次审核(同 17 §4)
  7. 落到 `workspace/<wid>/agents/`

### 7.3 git
- 用户可以 `git init` 这个文件夹(平台不主动 init)
- 平台不接管 commit;用户自己 git
- 推荐 `.gitattributes`:`assets/*.png filter=lfs diff=lfs merge=lfs`

---

## 8. 与 Workspace 的关系

| 维度 | Workspace | Agent 文件夹 |
| --- | --- | --- |
| 范围 | 一个用户的全部数据 | 一个具体 Agent 的全部 |
| 持有者 | 平台 | Agent 自己 |
| 跨 Workspace 可移 | — | ✅ tar 一打就走 |
| 编辑器 | 平台 UI | 外部编辑器 + 平台 UI 双通道 |
| git | 一般不 git(含数据库) | 推荐用户自己 git |

Workspace 数据库(SQLite)只存"哪些 Agent 在我这里 + 索引",**不存** Agent 内容本身。删除 Workspace 不会删 `agents/` 文件夹(留给用户回收)。

---

## 9. 跨平台细节

| 问题 | 处理 |
| --- | --- |
| Win 大小写不敏感 | `agent_id` 全小写,文件夹/文件名全小写 |
| Win 路径分隔符 | 平台内部统一用 `/`,IO 时用 `path.posix.normalize` |
| Win 保留字符 | `agent_id` 禁 `:*?"<>|` |
| 行尾符 | `.gitattributes` 推荐 `* text=auto eol=lf` |
| 长路径 | Win 默认 260 字符限制,Agent 文件夹路径 + Skill 名 + history 文件名要预算 |
| 符号链接 | 平台不创建符号链接(Win 权限麻烦) |

---

## 10. v0.x 实施分阶段

| 版本 | 增量 |
| --- | --- |
| v0.0 | CLI 直接读 yaml,不实现热加载;手改后重启即可 |
| v0.1 | 完整目录契约;chokidar 热加载;history/ 写入;外部编辑器入口 |
| v0.2 | Meta-Agent 写入走 history/;协同冲突弹窗;UI 看 history 时间线 |
| v0.3 | Skill 生成走 17 流程,落到 skills/ |
| v0.5 | import/export tar.zst;脱敏导出 |
| v1.0 | 验签 + 平台版本兼容矩阵;git LFS 文档 |

---

## 11. 与其他文档的引用

- Manifest schema → `05 §3`
- UI Schema → `16` 全文
- Skill 生成与审核 → `17` 全文
- Artifact 与 Agent 文件夹的关系 → `13 §11`(产物在 `workspace/<wid>/artifacts/`,与 Agent 文件夹**分离**;Agent 不持有自己跑出的产物)
- Trace 与 Agent 版本关联 → `12 §4.1`(`runs.agent_version` 记录跑那次的版本)

---

## 12. 给后续工作的 Checklist

- [ ] 写一份 `agent-folder-types.ts` 把 §3 全部 schema 落 TS 类型,UI/Core 共用
- [ ] chokidar 在 macOS 大文件夹上的性能 baseline 测试(>1000 files)
- [ ] `history/` 累计超 1000 条要不要归档?(默认不归档,文档化容量预期)
- [ ] 写一个 `moyu agent validate <path>` CLI,给外部编辑者用
- [ ] VSCode 扩展(远期):Agent yaml schema 自动补全 + 跳转 prompt 引用
- [ ] 用户首次进 Agent 文件夹给一个 README + 一个 `.agentignore` 示例
