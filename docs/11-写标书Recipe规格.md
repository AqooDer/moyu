# 11 - 写标书 Recipe 规格

> **2026-05-21 重要让位通知**:
> - 原计划:本 Recipe 作为 **v0.1 首发场景**。
> - 现状:用户在 2026-05-21 review 中决定**首发场景切换到"生图原型 Agent"**(详见 `18-生图原型Recipe规格.md`),理由是写标书的物料准备成本与评价周期都太重,不适合首发证明 aca 可行性。
> - 本文档**保留为 v0.2+ 候选 Recipe**——v0.2 路线图(`09 §2`)明确把本 Recipe 与 PDF→PPT、长文翻译共同作为"扩 Recipe 库"的目标。所有验收标准、Skill 列表、数据契约仍按本文档执行,只是排程从 v0.1 推到 v0.2。
> - 写标书所需的 5 维质量验收(覆盖度 / 目录结构 / 占位标注 / 溯源 / 人工区分)迁移到 v0.2 DoD(`09 §2.3`)。
> - 后续若 v0.0 生图尖刺退化(`10 §8`)选择回退到写标书首发,本文档自动恢复 v0.1 角色,无需大改。

> 本文是 Moyu 第一个产品级 Recipe 的完整规格。它既是 v0.2 业务交付的契约,也是 v0.2 Meta-Agent 装配的模板原型。
>
> 与 `05-元智能体设计.md §4.3` 的 Recipe 概念对齐;与 `10-v0.0-技术尖刺.md` 的实验结论互相印证(注:`10` 在 2026-05-21 已切换到生图,本 Recipe 与 `10` 的关联减弱)。
>
> 撰写日期:2026-05-20(v0.1 首发) / 2026-05-21(让位为 v0.2+ 候选)

---

## 1. Recipe 元信息

| 字段 | 值 |
| --- | --- |
| `recipe_id` | `builtin/bidding/general-v1` |
| 名称 | 通用技术标撰写 |
| 适用范围 | 工程类（高速 / 航道 / 市政 / 房建 / 园林等）通用技术标 |
| 不适用 | 设备采购标、服务采购标、PPP/EPC 复杂联合体（v2+） |
| 推荐模型 Tier | `balanced-writing-model` × 长文 + `structured-extraction-model` × 解析 |
| 推荐 Sandbox | L1（章节并行写需要 worker） |
| 估算成本 | $3–$8 / 份（30 页招标） |
| 估算时长 | 8–20 分钟 / 份 |

---

## 2. 产品承诺（这就是 v0.1 的对外口径）

> **本 Agent 不替代投标工程师**，而是把你从"对着空白文档发呆"中解放出来。
>
> 产出一份**结构完整、评分点覆盖清晰、缺失信息明确标注、与招标文件可双向溯源**的技术标初稿。

明确**不承诺**：
- ❌ 直接交付（一定需要工程师审改）
- ❌ 业绩 / 数据真实性（不编造，缺则标 `[待填写]`）
- ❌ 排版完美（提供基础排版，最终格式可能需手工调）
- ❌ 中标率提升（这不是我们能保证的因变量）

---

## 3. 输入（Intake Slots）

Meta-Agent 在 INTAKE 阶段引导用户填以下槽位。**部分必填，部分推荐**。

| key | 中文 | 必填 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `tender_pdf` | 招标文件 PDF | ✅ | file | — | 文本型 PDF；扫描件 v0.5 OCR 后再支持 |
| `project_category` | 工程类别 | ✅ | enum | `auto` | `高速/航道/市政/房建/园林/auto` |
| `company_profile_id` | 公司档案 | ⭕ | ref | null | 用 Workspace 已存的公司档案；首次为空可跳过 |
| `target_word_count` | 目标字数 | ⭕ | int | 30000 | 用于章节长度分配；不强行凑字数 |
| `key_emphasis` | 突出强调 | ⭕ | text | "" | 用户描述本次投标重点（如"工期紧、安全要求高"）|
| `language_style` | 语言风格 | ⭕ | enum | `formal_zh` | `formal_zh` / `concise_zh`（后者去套话） |
| `forbid_data` | 禁用数据 | ⭕ | list<str> | [] | 不允许出现的关键词（如竞争对手名）|
| `outline_only` | 只出大纲 | ⭕ | bool | false | true 时跳过 Step 4，仅产出 outline.md |

**INTAKE 行为约束**：
- 槽位用**卡片式表单 + 自由对话双通道**呈现（详见 `05 §4.2`）
- 必填项未填不进入 SPEC_DRAFT；可让用户标记"稍后补"，进 PERSIST 时再确认

---

## 4. 输出（outputs_schema）

```yaml
outputs_schema:
  type: object
  required: [docx, outline, coverage_report, traceability]
  properties:
    docx:                            # 主产物
      type: object
      properties:
        path: { type: string, format: file-path }
        sections: { type: integer }
        word_count: { type: integer }
    outline:                          # 中间产物，独立 artifact
      type: object
      properties:
        path: { type: string }
        nodes: { type: array }
    scoring_matrix:                   # 评分矩阵抽取结果，可独立查看
      type: object
    coverage_report:                  # ★ 质量自评（见 §6）
      type: object
      properties:
        path: { type: string }
        scoring_points_total: { type: integer }
        scoring_points_covered: { type: integer }
        coverage_ratio: { type: number }
        missing_data_flags: { type: array, items: { type: object } }
        sections_needing_human_review: { type: array }
    traceability:                     # ★ 溯源映射（见 §7）
      type: object
      properties:
        path: { type: string }
        section_to_source_pages: { type: object }
```

注意：`coverage_report` 与 `traceability` **不是可选的**——它们是 Moyu 对"产品化"承诺的可验证证据。

---

## 5. 工作流（DAG）

```
                    ┌── extract_pdf ──┐
                    │                  │
                    │                  ▼
                    │       parse_scoring_matrix
                    │                  │
                    │                  ▼
                    └────► generate_outline ────► validate_outline_against_scoring
                                       │                            │
                                       │                            │ 失败 → 修
                                       │                            ▼
                                       │              ┌─ section_writer (fanout per_section)
                                       │              │   ┌─ collect_company_data
                                       │              │   ├─ draft_section
                                       │              │   └─ self_check (评分点 / 禁用词 / 占位)
                                       │              └────────────┬────────────
                                       │                           │
                                       │                           ▼
                                       └─────────────► render_docx ──► artifact: result.docx
                                                                ├──► artifact: outline.md
                                                                ├──► artifact: scoring.json
                                                                ├──► artifact: coverage.md
                                                                └──► artifact: traceability.json
```

### Step 详解

| Step | Skill | Tier | 关键逻辑 |
| --- | --- | --- | --- |
| `extract_pdf` | `builtin/pdf/extract-sections@1.x` | `tiny` | pdf-parse + 段落语义切分 |
| `parse_scoring_matrix` | `builtin/bidding/parse-scoring-matrix@1.x` | `structured-extraction-model` | 结构化抽取评分维度、权重、得分点 |
| `generate_outline` | `builtin/bidding/generate-outline@1.x` | `balanced-writing-model` | 按评分维度生成章节，挂得分点引用 |
| `validate_outline_against_scoring` | 纯代码 | — | 检查每个评分点是否至少落到一个章节；缺失则要求 outline 修 |
| `section_writer` | `builtin/bidding/section-writer@1.x` | `balanced-writing-model`（章节）；`frontier-reasoning-model`（核心章节，由 Manifest 覆盖） | 按章节并行 |
| `collect_company_data` | `builtin/bidding/company-data@1.x` | `structured-extraction-model` | 从 company_profile 抽取相关数据；缺 → 占位 |
| `draft_section` | `builtin/bidding/draft-section@1.x` | `balanced-writing-model` | 写正文 |
| `self_check` | `builtin/bidding/section-self-check@1.x` | `tiny` | 检查：得分点是否提到 / 禁用词是否出现 / 是否标 [待填写] / 是否引用原文 |
| `render_docx` | `builtin/docx/render@1.x` | — | 应用模板 → docx |

**并行度**：section_writer 默认 fanout = 4，可由用户在 Manifest 调整。

---

## 6. 质量自评（coverage_report）

这是 user review #2 建议的核心交付物。**没有这个，v0.1 等于黑盒**。

### 6.1 评分点覆盖
```markdown
# Coverage Report — 高速公路 XX 项目技术标

## 1. 评分点覆盖
- 评分项总数: 26
- 已覆盖: 23 (88%)
- ⚠ 未覆盖（3）:
  - [§4.2.3 安全监理体系] —— 评分 5 分，建议在 7.3 节补充
  - [§4.3.1 BIM 应用] —— 评分 3 分，company_profile 无相关业绩
  - [§5.1.2 绿色施工] —— 评分 4 分，部分覆盖（仅提及未展开）

## 2. 章节字数分布
| 章节 | 评分权重 | 当前字数 | 建议字数 | 状态 |
| ... |
```

### 6.2 缺失数据标记
扫描整篇 docx，列出所有 `[待填写]` 占位：

```markdown
## 3. 缺失数据 (missing_data_flags)
| 位置 | 类型 | 当前占位 | 建议提供 |
| 2.1 拟投入项目经理 | 人员 | [待填写：项目经理姓名及证书号] | 公司档案 → 人员库 |
| 3.2 类似业绩三项 | 业绩 | [待填写：3 个类似工程业绩] | 公司档案 → 业绩库 |
| 5.4 主要施工机械 | 设备 | [待填写：机械清单] | 公司档案 → 设备库 |
```

### 6.3 章节人工审核建议
```markdown
## 4. 建议人工重点审核
- 7.3 安全管理 —— 自评信心 60%（评分权重高 + 行业特定）
- 9.2 质量保证 —— 自评信心 70%（涉及具体施工工艺）
```

### 6.4 自评信心机制
- section_self_check Skill 给每节打个 0-100 的"信心分"（基于：评分点覆盖、引用密度、占位数）
- < 70 的章节自动进"建议人工审核"列表
- 高权重评分点对应章节如果信心 < 80，也进列表

---

## 7. 溯源（traceability）

> 让用户能从"标书章节"反查"招标文件原文"，建立信任。

### 7.1 数据结构
```json
{
  "sections": {
    "7.3.1 安全责任制": {
      "source_pages": [12, 13],
      "source_quotes": [
        { "page": 12, "text": "...投标人应建立安全生产责任制...", "score_point_id": "sp-014" }
      ],
      "score_points_addressed": ["sp-014", "sp-015"],
      "confidence": 85
    },
    ...
  },
  "score_points": {
    "sp-014": {
      "raw_text": "...安全生产责任制...",
      "weight": 3,
      "addressed_by_sections": ["7.3.1"]
    }
  }
}
```

### 7.2 UI 呈现（v0.1 至少有简化版）
- Run 详情页里点章节标题 → 高亮原 PDF 对应页
- 评分点未覆盖 → 红色徽章 + 建议补充章节

---

## 8. minimal_input（用于 DRY_RUN）

为支持 Meta-Agent 试运行，Recipe 必带 minimal_input：

```yaml
minimal_input:
  tender_pdf: "${recipe_dir}/samples/mini-tender-5pages.pdf"   # 5 页迷你招标
  project_category: "市政"
  outline_only: true                                           # 只跑到 outline，省钱
```

DRY_RUN 因此控制在 30 秒内、$0.1 以内。

---

## 9. 验收用例（v0.1 必跑）

| Case | 输入 | 期望 |
| --- | --- | --- |
| C-01 | 30 页高速公路招标，无公司档案 | docx 输出；所有公司数据占位；coverage ≥ 80% |
| C-02 | 50 页航道招标，含完整公司档案 | docx 输出；公司数据自动填入；coverage ≥ 85% |
| C-03 | 20 页市政招标 + `outline_only=true` | 仅产出 outline.md，无 docx；耗时 < 3 分钟 |
| C-04 | 损坏 PDF | Run failed，错误信息清晰指明 "PDF 不是文本型 / 文件损坏" |
| C-05 | 评分维度极不清晰的招标 | parse_scoring_matrix 返回"识别失败"，触发 Meta-Agent 提示用户手动补 |
| C-06 | 公司档案里有禁用关键词 | 标书中无禁用词；coverage_report 标注被替换的位置 |

---

## 10. 与其他文档的引用

- Manifest 完整示例：见 `05-元智能体设计.md §3.2`
- Trace 字段：见 `12-Trace数据模型.md`
- Artifact 类型：见 `13-Artifact契约.md`
- 模型 Tier 抽象：见 `07-模型路由与监控智能体.md §2`

---

## 11. 演进路线

| 版本 | 增量 |
| --- | --- |
| v0.1 | 本规格全部交付 |
| v0.2 | 公司档案引入 Episodic Memory；多次投标的偏好沉淀 |
| v0.3 | 章节级路由（核心章节升 frontier，套话章节降 cheap） |
| v0.4 | Monitor 学习"用户编辑率高的章节" → 推荐 Manifest 调整 |
| v0.5 | OCR Skill 接入 → 支持扫描件招标 |
| v1.0 | 行业模板分化（高速 v1、航道 v1 各自微调） |

---

## 12. 给后续工作的 Checklist

- [ ] 与 1-2 位真实投标工程师评审本规格
- [ ] 至少准备 6 份匿名化的真实招标 PDF（覆盖 §9 的 case）
- [ ] 准备 2 份"公司档案模板"（含人员/业绩/设备/资质）
- [ ] 写自动化评分 Skill（解析 docx 是否覆盖评分点）
- [ ] 找一份"中标过的标书"做对比基准（不发布，仅内部用）
- [ ] 准备一组"禁用词清单"通用样例（合规友好）
