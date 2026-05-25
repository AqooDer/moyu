# 09 - MVP 路线图

> 用户明确"不考虑时间、按完整方案"。因此本路线图**按完成度阶梯组织**，每个里程碑描述：目标、范围、验收标准、依赖与降级、阶段风险。
> 时间不锁，但里程碑之间的**先后顺序是硬约束**（依赖决定）。
> 撰写日期：2026-05-20

---

## 0. 总览：完成度阶梯

```
v0.0  ─►  v0.1  ─►  v0.2  ─►  v0.3  ─►  v0.4  ─►  v0.5  ─►  v1.0
技术      单 Agent  元智能体  路由+L1   监控+学习  L2+MCP    产品化
尖刺      闭环      Recipe   沙箱      闭环      生态      发布
(CLI)    （写标书）  装配器
```

**核心铁律 1**：v0.0 必须先**证伪**首发场景的链路可行性(生图原型:prompt → openai-compat 中转站 → 一组候选图),跑不通就不投资 v0.1 全套基建。
**核心铁律 2**：v0.1 必须能让一个真实用户跑通"打开应用 → 配 Provider Key → 用 Meta-Agent 装配出生图原型 Agent → 输入 prompt → 拿到一组候选图(含 metadata + 单张重生成 + Trace)",否则不进 v0.2。
**核心铁律 3(2026-05-21 新增)**：v0.3 必须证明 Meta-Agent 真的能现造一个未预想过的 Skill(代码) + UI Schema(声明式 YAML),而不只是"在 Recipe 里挑装"。这是 ADR-008 "agent create agent" 的硬验收。

> 详细方案:
> - v0.0 完整规格 → `10-v0.0-技术尖刺.md`
> - **v0.1 首发场景 → `18-生图原型Recipe规格.md`(2026-05-21 替换原写标书)**
> - 写标书 Recipe(让位给 v0.2+ 候选) → `11-写标书Recipe规格.md`
> - Meta-Agent 生 UI/Skill 流程 → `15` / `16` / `17`
> - Trace 字段 → `12-Trace数据模型.md`
> - 产物契约 → `13-Artifact契约.md`

---

## 0.5 v0.0 — 技术尖刺（开工前先做）

### 0.5.1 目标
**在投资 v0.1 全套架构前,先用 CLI 跑通"prompt → openai-compat 中转站 → 一组 PNG → 落本地",回答 3 个核心问题**(详见 `18 §7`):
1. 当前 openai-compat 中转站 + gpt-image-1 在常见原型描述下,产出"可用"图的比例多少?
2. Node + 沙箱里 b64 解码 → 写文件 → 返回 artifact ref 稳不稳?
3. 一次 4 张图的真实成本与延迟?能否 60s 内完成?

### 0.5.2 范围(极度收窄)
- ✅ CLI 入口(commander):`moyu spike image-gen --prompt "..." --n 4`
- ✅ openai-compat provider 一家 + 单模型(gpt-image-1 或等价)
- ✅ b64 解码 → 写本地 PNG
- ✅ JSON Trace(字段与 §`12` 对齐)
- ❌ 任何 UI、Electron、Keychain、打包、Sandbox、Manifest、Meta-Agent、Router、Monitor

### 0.5.3 验收(DoD)
- [ ] 10 条人工挑的原型 prompt(登录页/列表页/卡片/图标/插画)都能跑出 PNG
- [ ] 主观评价 ≥ 6/10 的比例 ≥ 60%(自己看,且至少 1 位设计/产品同行交叉验证)
- [ ] 单次 4 张 < 60s、< $1
- [ ] Trace JSON 字段对齐 `12-Trace数据模型.md`
- [ ] 输出复盘文档:go / no-go 决策

### 0.5.4 时间盒
- **上限 1 天**(超出强制减范围;生图链路天然短)

### 0.5.5 退出条件
| 结果 | 下一步 |
| --- | --- |
| 质量达标 + 成本可接受 + 链路稳 | ✅ 进 v0.1 |
| 质量主观差 | 🟡 换 provider/model 再跑;实在不行回到"写标书"作为首发(回到 11 号文档) |
| 中转站接口不稳 | 🟡 v0.1 必须做 retry + 多 provider 备份 |
| 成本 > $0.5/张 | 🟡 v0.1 demo 限制默认 1 张,或加 mock 模式 |

详见 `10-v0.0-技术尖刺.md`。

---

## 1. v0.1 — 单 Agent 闭环（生图原型,2026-05-21 替换原写标书)

### 1.1 目标
- 跑通**一个 Recipe-装配出来的 Agent**完整流程:用户描述需求 → Meta-Agent 装配 `image-gen/prototype-v1` → 用户填 prompt → 输出一组候选图 + metadata + 单张重生成。
- 不做完整 Meta-Agent UI/Skill 生成、不做路由、不做沙箱多级、不做监控。
- 目的是**把整条链路打通**,验证架构可行性,**且让 v0.3 "Meta-Agent 现造 Skill"有可对照的 baseline**。
- **v0.1 时 Meta-Agent = Recipe 装配器**(SKILL_REQUEST/UI_DRAFT 都跳过,走平台兜底 + 内置 `image_gen` Skill)。

### 1.2 范围
| 模块 | 包含 | 备注 |
| --- | --- | --- |
| Electron 桌面壳 | ✅ | 单窗口、菜单、自动更新先不做 |
| Renderer UI | ✅ 最小集 | "+ 新 Agent" → Meta-Agent 对话 → Agent 详情 → 填 prompt → Run → ImageGrid |
| **Provider Key Onboarding** | ✅ | 含 `openai-compat` provider 类型(支持中转站 base_url + key) |
| Core 子进程 | ✅ | HTTP/JSON-RPC,单端口 |
| Orchestration | ✅ 简版 | sequence + fanout per_count(并行生 N 张);无重试 |
| **Agent 文件夹形态** | ✅ | 按 `15-Agent文件夹结构与热加载.md` 落地;v0.1 暂不开热加载,但目录契约必须就位 |
| Meta-Agent | ✅ Recipe 装配器形态 | 内置 `image-gen/prototype-v1` Recipe,走 INTAKE → RECIPE_PICK → SPEC_DRAFT → VALIDATE → DRY_RUN → HUMAN_REVIEW → PERSIST |
| **ui.yaml 解释器** | ⚠ 兜底版 | v0.1 走 `16 §10` 平台兜底渲染(根据 inputs_schema/outputs_schema 自动生成 UI);完整 ui.yaml DSL 解析推到 v0.2/v0.3 |
| Skill | ✅ 写死 1 个内置 | `builtin/image-gen/openai-compat@1.x`(平台预置,不是 Meta-Agent 现造) |
| Provider | ✅ openai-compat 一家 | Key + base_url 走 OS Keychain;v0.3 再加 Anthropic/OpenAI 原生 |
| Router | ❌ | 写死单一 provider |
| Sandbox | ❌ | 全 L0;v0.1 不跑 L1(避免阻塞首发) |
| **isolated-vm 打包验证** | ✅ 提前 | 即使 v0.1 不用 L1,也在 v0.1 期做 macOS 三种 CPU 架构 prebuild 实验,避免到 v0.3 才发现卡构建链路 |
| Memory | ✅ Working only | SQLite 持久化 Run/Step/Trace;Trace 表结构对齐 `12-Trace数据模型.md` |
| **Artifact 契约** | ✅ | 按 `13-Artifact契约.md` 实现 role/version/sha256/UI 溯源;PNG 走 type:png + role:primary |
| MCP | ❌ | 仅接口预留(包结构占位) |
| Monitor | ❌ | |
| 自动更新 | ❌ | 手动安装 |
| 多平台 | macOS 优先 | Win/Linux 留后 |

### 1.3 验收标准(DoD)

**对外承诺收窄措辞**(参考 `18 §2`):
> v0.1 产出 **一组按用户描述生成的候选原型图,带 metadata、可下载、可对单张重生成、可看到完整 Trace**。不承诺商用级美学,不承诺一键定稿。

**通用工程**:
- [ ] 一个用户能在一台干净的 mac 上下载 dmg 装好
- [ ] Onboarding 5 步内完成 Key 配置(openai-compat base_url + key) + 测试调用 + 看到模型可用性
- [ ] Meta-Agent 对话 5 分钟内装配出 `image-gen/prototype-v1` Agent
- [ ] Agent 详情页填 prompt + 张数 + 风格 → 60s 内出 4 张图
- [ ] Run 详情页能看到每个 Step 的 IO + Token + 模型 + 费用
- [ ] 对任一张图点"重生成这张" → 5~10s 内替换,其他 3 张保持
- [ ] 任意 Step 失败时,UI 显示明确错误(不是空白)
- [ ] 全程 0 崩溃,0 数据丢失
- [ ] isolated-vm 在 macOS (Intel + Apple Silicon) prebuild 通过;Win/Linux 至少有可行性结论

**生图 Recipe 质量验收(详见 `18 §3 acceptance_cases C-01~C-06`)**:
- [ ] **C-01 单图生成**:1 张图、20s p95、output schema 通过
- [ ] **C-02 批量生成**:4 张并行、45s p95、parallel_fanout 生效
- [ ] **C-03 单张重生成**:只重跑第 i 张,其他保持
- [ ] **C-04 入项目库**:推迟到 v0.3(workspace_views 是 v0.3 才有)
- [ ] **C-05 参考图理解**:可选(需 vision-capable provider)
- [ ] **C-06 失败回路**:错误优雅、错误分类、用户无误扣费

### 1.4 依赖
- v0.0 通过 go/no-go 决策(尤其是中转站链路稳定性)

### 1.5 风险与降级
| 风险 | 降级方案 |
| --- | --- |
| 中转站接口不稳/被限流 | v0.1 加 retry + 限流提示;v0.2 起加多 provider 备份 |
| 生图质量主观差 | 已通过 v0.0 验证;v0.1 时换 model 名(仍 openai 协议)继续跑 |
| 单张生图 > 30s | 加 LiveMetric 给用户预期;v0.3 起按 LiveMetric 学路由 |
| isolated-vm 跨平台 prebuild 失败 | 不阻塞 v0.1(v0.1 不实际启用 L1),但报告必须给 v0.3 决策依据 |
| Electron 打包签名复杂 | macOS 先用未签名 dmg + 公证脚本,等 v1.0 再上付费证书 |
| Onboarding 失败导致流失 | 失败原因必须明确分类(Key 格式 / base_url 不可达 / 余额 / 模型不存在),不能给"调用失败"四个字 |

### 1.6 产出物(除代码)
- [ ] `apps/desktop` 可打包 dmg
- [ ] `docs/getting-started.md`(最小使用教程:配 Key → 装 Agent → 生第一张图)
- [ ] `docs/onboarding-troubleshooting.md`(Key 配置常见问题,含中转站差异)
- [ ] 10 条原型 prompt 测试集 + 期望产出对照(验收回归)
- [ ] isolated-vm 跨平台 prebuild 报告

---

## 2. v0.2 — 元智能体扩 Recipe 库 + 完整 ui.yaml 解释器

### 2.1 目标
- **依然是 Recipe 装配器形态**(不是"造任意 Agent"),但 Recipe 库扩容到 4 个,且 `ui.yaml` 解释器完整上线(替换 v0.1 的兜底版)。
- 验证 Meta-Agent 工作流(INTAKE → RECIPE_PICK → SPEC_DRAFT → UI_DRAFT → VALIDATE → DRY_RUN → PERSIST) 在 4 种不同形态 Agent 上都稳定。
- **写标书 Recipe 在 v0.2 加入**(承接 `11-写标书Recipe规格.md`),作为"长链路 DAG + 多 Skill 装配"的代表性 Recipe。

> 完全自由的"Meta-Agent 凭空造 Agent"(含现造 Skill)推到 v0.3+;详见 ADR-008 / `17 §13`。

### 2.2 范围
| 模块 | 新增 |
| --- | --- |
| Meta-Agent(Recipe 装配器形态) | ✅ 全套状态机(SKILL_REQUEST 仍跳过);UI_DRAFT 子状态首发 |
| **ui.yaml 完整解释器** | ✅ 替换 v0.1 兜底;支持 layout(form/grid/tabs/panel/split/conditional)+ 闭集控件(见 `16 §3 §4`) |
| Agent 文件夹热加载 | ✅ chokidar + history/ 记录(`15 §5 §6`) |
| Agent Manifest Zod schema | ✅ 完整 |
| Recipe 机制 | ✅ 内置 4 个 Recipe |
| **新增 Recipe** | ✅ `bidding/general-v1`(写标书,从 11)、`doc/pdf-to-ppt`、`doc/long-translate` |
| Skill / Tool Registry | ✅ |
| Validate + SelfFix | ✅ |
| DryRun | ✅(含 UI 渲染冒烟) |
| HumanReview UI | ✅ YAML 编辑器(monaco)+ ui.yaml preview |
| Agent CRUD UI | ✅ |
| Workflow 支持 | ✅ sequence + 完整 dag(含 fanout) |
| Skills | ✅ 在 v0.1 基础上扩到 ~12 个(含 PDF 解析/Word 渲染/PPT 渲染/翻译) |

### 2.3 验收标准
- [ ] 用户从空白 Workspace 出发,**走 Recipe 入口**,对话 5-10 分钟造出一个"PDF→PPT" Agent。
- [ ] 4 个内置 Recipe(生图 / 标书 / PDF→PPT / 长文翻译)都能 INTAKE → DRY_RUN 全流程跑通。
- [ ] 写标书 Recipe 满足 `11 §6 §7 §9` 的 5 维验收(覆盖度 ≥ 80% / 占位标注 / 溯源 / 人工区分 / 6 个 case)。
- [ ] 创建出的 Agent 立即可用,跑出真实产物。
- [ ] Meta-Agent 校验失败时能自我修复(3 次内)。
- [ ] HumanReview 页能直接编辑 YAML 并保存。
- [ ] Recipe 列表在 UI 可见,且**首屏即可见**(不是"自由对话"为默认入口)。
- [ ] 外部编辑器改 manifest.yaml 触发热加载(`15 §5`)。

### 2.4 依赖
- v0.1 完成(Run 引擎、Skill 体系、Trace、Agent 文件夹目录契约)

### 2.5 风险与降级
| 风险 | 降级 |
| --- | --- |
| 模型生成 Manifest 不稳定 | Recipe 模板尽量"填空式",降低生成自由度 |
| ui.yaml DSL 解释器 bug 多 | 兜底渲染始终可用(`16 §10`);出问题降级 |
| DRY_RUN 经常超时 | 提供"快速模式"(用更小 minimal input) |
| Skill 引用 schema 漂移导致 v0.1 老 Manifest 跑不了 | Manifest 加 `schema_version`,引擎按版本兼容 |
| 写标书 Recipe 太长容易超 budget | 章节级 fanout 分摊 token 压力 |

---

## 3. v0.3 — 模型路由 + L1 沙箱 + Meta-Agent 现造 LLM Skill

### 3.1 目标
- 引入 **Tier 抽象** + **规则路由**。
- 引入 **L1 Sandbox**(worker_threads + isolated-vm),开放"用户/Meta 写 Skill 脚本"。
- **重要里程碑(ADR-008 第一次硬验收)**:Meta-Agent 在对话中第一次成功"现造"一个新 Skill——v0.3 限定为 `kind: llm` Skill(走简化审核流,见 `17 §11`),证明状态机 SKILL_REQUEST → SKILL_REVIEW 跑得通。
- 同时:`workspace_views`(Agent 贡献 Workspace 级页面,见 `16 §6`)首发上线,生图 Recipe 的"原型项目库"页(C-04)在 v0.3 才可用。

### 3.2 范围
| 模块 | 新增 |
| --- | --- |
| Tier→Model 映射配置 | ✅ |
| Routing Rules 引擎 | ✅ |
| Provider 健康检测 | ✅ |
| Fallback Chain | ✅ |
| 成本预算(Workspace / Agent / Step) | ✅ |
| 国内 Provider | ✅ 通义、豆包接入 |
| Anthropic / OpenAI 原生 SDK | ✅ |
| L1 Sandbox | ✅ worker pool + isolated-vm |
| Host API(host.llm.call / host.fs.* / host.tool.call / host.network.fetch / host.artifact.write) | ✅(见 `17 §4.3`) |
| **Meta-Agent SKILL_REQUEST/SKILL_REVIEW**(LLM Skill only) | ✅ 走 `17 §3` 状态机的简化路径 |
| HUMAN_REVIEW UI 审核面板 | ✅ 4 tab:代码 / Permissions / 沙箱报告 / 静态警告 |
| 自定义 Skill 编辑器 UI(用户手写) | ✅ monaco + Schema 提示 |
| 能力授权 UI(首次越权弹窗) | ✅ |
| Workflow dag fanout | ✅ |
| **workspace_views 上线** | ✅ 生图 Recipe 的"原型项目库"首发 |
| ESLint plugin `@moyu/eslint-plugin-skill` | ✅ 5 条核心规则(见 `17 §5`) |

### 3.3 验收标准
- [ ] 同一个 Agent 在"省钱套餐"和"高质套餐"下都能跑,命中规则可见。
- [ ] Provider 故意拔网,能在 5s 内 fallback 到另一家。
- [ ] 一个用户写的 Skill 脚本,在 L1 沙箱里跑通,且尝试 `require('fs')` 失败。
- [ ] DAG fanout per_section 能并行跑 4 章节,比 sequence 至少快 2 倍。
- [ ] **新硬验收(ADR-008)**:用一个"需求边界刚好超出现有 Skill 库"的对话(预先设计 1-2 个 case),Meta-Agent 真的现造出一个 LLM Skill,过审核 + 沙箱试跑 + 用户采纳 + 落到 `agents/<id>/skills/`。
- [ ] 生图 Recipe 的 C-04(项目库)跑通 — ImageGrid 一键"加入项目库",`workspace.image_gen.projects.<P1>.images` 长度 +1。
- [ ] Skill 审核拒绝率统计上线(为 ADR-008 触发重审条件做数据)。

### 3.4 依赖
- v0.2(Manifest schema 已含 Routing/Sandbox 字段;ui.yaml 解释器已就位;Agent 文件夹热加载就绪)

### 3.5 风险与降级
| 风险 | 降级 |
| --- | --- |
| `isolated-vm` 跨平台 prebuild 难 | 提供"无脚本模式"开关,临时关掉用户 Skill 入口 |
| 路由规则越来越多难管 | 规则上限 100 条;超出强制走 Monitor 合并 |
| Meta-Agent 现造 LLM Skill 反复失败 | 模板 few-shot 不够好;临时把"造 Skill"按钮在 UI 隐藏,用户继续走"求助手写" |
| workspace_views 数据归属混乱 | 严格按 Agent 命名空间隔离(`workspace.<agent-ns>.*`),删 Agent 时弹窗问"是否一并清数据" |

---

## 4. v0.4 — 监控智能体 + 学习闭环 + Meta-Agent 现造 code Skill

### 4.1 目标
- 上线 **Monitor-Agent**，离线分析 Trace，给出路由 + Manifest 优化建议。
- 提供"待审核 - 一键采纳"流。
- **ADR-008 第二次硬验收**:Meta-Agent 现造 `kind: code` Skill(TS 代码 < 150 行 + L1 沙箱 + 完整 STATIC_CHECK + HUMAN_REVIEW),把 v0.3 的 LLM-only 限制解除。

### 4.2 范围
| 模块 | 新增 |
| --- | --- |
| Monitor-Agent 工作流 | ✅（详见 `07`） |
| 指标计算（成本/延迟/失败/重试） | ✅ |
| LLM 分析 Prompt 与 Few-shot | ✅ |
| 建议结构化输出 + 校验 | ✅ |
| 待审核队列 UI | ✅ |
| A/B 试跑机制 | ✅（仅自动化任务） |
| 质量信号收集（👍/👎/重跑/编辑率） | ✅ |
| Recipe 自带"评分 Skill"（标书评分等） | ✅ |
| 用量仪表盘 | ✅ |
| **Meta-Agent 现造 code Skill** | ✅ 走 `17 §3 §4 §5 §6` 完整流程;模板锁定 + AST 扫描 + 沙箱试跑 + 必审 |
| Monitor 收"被频繁修改的生成 Skill" → 反馈模板库 | ✅ 为 v0.5 Skill 模板库扩充攒数据 |

### 4.3 验收标准
- [ ] 连续使用 7 天后，Monitor 至少给出 3 条可解释建议。
- [ ] 用户采纳"降级到 medium"建议后，连续 100 次 Run 质量信号无显著恶化。
- [ ] 建议带证据（关联 Run id 可点开 Trace）。
- [ ] 任何被采纳的建议都可一键回滚。

### 4.4 依赖
- v0.3（路由规则可被 Monitor 修改）
- v0.1 起就有的完整 Trace（v0.1 必须把 Trace 字段设计齐，否则到 v0.4 没数据）

### 4.5 风险与降级
| 风险 | 降级 |
| --- | --- |
| LLM 建议不靠谱 | 默认强制 "需用户审核"，不自动生效 |
| 自动评测 Skill 失准 | 优先用显式信号（👍/👎/重跑） |
| Monitor 自身消耗大 | 限定 frontier 模型仅在 Monitor 用；用量在 UI 明示 |

---

## 5. v0.5 — L2 沙箱 + MCP 生态

### 5.1 目标
- 引入 **L2 Docker 沙箱**，解锁文件系统、外部 CLI、网络访问。
- 成为"最容易接 MCP 的桌面平台"。

### 5.2 范围
| 模块 | 新增 |
| --- | --- |
| L2 Docker 沙箱 | ✅ 镜像缓存、资源限额、网络白名单 |
| 标准镜像 | ✅ node:20-alpine + pandoc + ffmpeg + libreoffice |
| 网络授权 UI | ✅ |
| MCP Client 增强 | ✅ 多服务并行、健康检测 |
| MCP Server 一键添加 UI | ✅ 内置目录（FS / Web / GitHub / Notion） |
| OCR Skill | ✅（pdfocr + tesseract，跑 L2） |
| 用户 Skill 申请升级 L2 流程 | ✅ |
| 长期记忆（Episodic + Semantic） | ✅ LanceDB |
| Workspace 知识库 UI | ✅ |

### 5.3 验收标准
- [ ] 用户不装 Docker 也能用全部 L0/L1 功能。
- [ ] 装了 Docker 的用户能跑一个"扫描件 PDF→Word"的 OCR Agent。
- [ ] 接入 3 个外部 MCP Server，都在 UI 可视。
- [ ] Episodic 记忆能让 Agent "记得"用户上次的偏好。

### 5.4 依赖
- v0.4（监控帮助评估 L2 是否值得用）

### 5.5 风险与降级
| 风险 | 降级 |
| --- | --- |
| Docker 跨平台体验差 | 提供详细安装文档；首次启动失败弹窗给指引 |
| MCP 协议演进破坏兼容 | 锁定 SDK 版本；新版本走 feature flag |

---

## 6. v1.0 — 产品化发布

### 6.1 目标
- 从"工程师能用"到"可以拿出去发布"。
- 自动更新、崩溃报告、文档站、付费 / 开源策略明确。

### 6.2 范围
| 模块 | 新增 |
| --- | --- |
| 代码签名 + 公证（Mac/Win） | ✅ |
| electron-updater 全量启用 | ✅ |
| sentry-electron（默认关，可开） | ✅ |
| 用户 Onboarding 流（首启动 3 步配置） | ✅ |
| 中英文 i18n | ✅ |
| 文档站（VitePress） | ✅ 用户文档 + 开发者文档 + Skill 编写指南 |
| 落地页 + 下载 | ✅ |
| Recipe 与 Skill 的"导出 / 导入"格式 | ✅（铺垫远期 Marketplace） |
| Workspace 备份/恢复 | ✅ |
| Crash recovery（启动检测异常 Run） | ✅ |
| License 与定价模型 | ✅ 决策（见 §7） |
| 反馈渠道（应用内 + GitHub） | ✅ |
| Win + Linux 全平台构建 | ✅ |

### 6.3 验收标准
- [ ] 一个完全陌生用户照着 Onboarding 5 分钟内能跑出第一个 Run。
- [ ] 自动更新闭环：发新版本 → 用户客户端检测到 → 提示 → 一键升级 → 数据迁移无损。
- [ ] 任意崩溃后下次启动能恢复未完成 Run。
- [ ] 文档站完整覆盖：用户指南 / Skill 开发指南 / API 参考 / FAQ。

### 6.4 依赖
- v0.5（功能完整）

### 6.5 风险与降级
- 详见 §7、§8。

---

## 7. 产品化关键决策（v1.0 前必须定）

| 决策 | 选项 | 建议（待用户决定） |
| --- | --- | --- |
| **License** | MIT / GPL / 商业 / 双 License | 核心开源（MIT or Apache 2.0），高级功能商业 |
| **付费模式** | 免费 / 一次性买断 / 订阅 / 按 Recipe 售卖 | 个人版免费 + Pro 订阅（高级 Recipe + 同步 + Marketplace 销售分成） |
| **同步服务** | 自营云 / 用户自带 S3/OSS / 不做 | v1.0 不做；远期"用户自带云存储" |
| **Marketplace** | v1.0 含 / 远期做 | 远期；v1.0 先做导入/导出 |
| **官方支持渠道** | Discord / GitHub Issues / 小红书 / 公众号 | GitHub + 1 个中文社区平台 |
| **遥测** | 强制 / 默认开 / 默认关 | 默认关、可选开 + 明确告知收集范围 |

---

## 8. 全程贯穿的非功能性工程任务

这些不在某个 vX 里独立做，而是**每个版本都要带着推进**：

| 任务 | 说明 |
| --- | --- |
| 测试覆盖 | v0.1 起就用 Vitest 写单测；Playwright 跑 E2E（至少覆盖每个 v 的 DoD 路径） |
| CI/CD | GitHub Actions：lint + test + 三平台构建；PR 必过 |
| 文档同步 | 每加一个 Skill / Recipe / Manifest 字段 → 同步文档 |
| 性能基线 | 维护一个 perf-bench 脚本，每版跑：冷启动、Run 启动、Step 调度耗时 |
| 数据迁移 | Manifest schema 演进必带 migration；SQLite schema 用 better-sqlite3-migrations |
| 安全审计 | 每个 v 上线前过一遍：依赖漏洞扫描、权限边界检查、Provider Key 落盘审计 |
| ADR 维护 | 每次重大决策追加一条到 `04-总体架构.md §8` |

---

## 9. 关键依赖关系图

```
v0.1 ─► v0.2 ─► v0.3 ─► v0.4 ─► v0.5 ─► v1.0
 │       │       │       │       │       
 │       │       │       │       │       
 ▼       │       │       │       │       
Trace   Manifest │       │       │       
完整    Schema   │       │       │       
设计    完整     │       │       │       
        ▼       │       │       │       
        Recipe  │       │       │       
        机制    │       │       │       
                ▼       │       │       
                Tier    │       │       
                抽象    │       │       
                Sandbox │       │       
                抽象    │       │       
                        ▼       │       
                        指标   │       
                        收集器 │       
                                ▼       
                                MCP 抽象 
                                Memory   
                                持久化   
```

**关键点**：v0.1 看似最简单，但**字段设计必须前瞻到 v1.0**（Trace 字段、Manifest schema、IPC 协议版本号）。返工成本最高的是 schema/协议变更。

---

## 10. 给后续工作的执行 Checklist

短期（开工前）：
- [ ] 与用户对齐产品化关键决策（§7）
- [ ] **准备 1 个 openai-compat 中转站测试 Key** + base_url(本人手动配,不入仓库;ref CLAUDE.md 11)
- [ ] 选定 10 条原型 prompt 测试集(用于 v0.0 + v0.1 DoD 回归)
- [ ] 开新仓库 `008-node-moyu-mvp`（按 CLAUDE.md 规范）
- [ ] 锁定 Node / Electron / 主要依赖大版本

v0.1 启动后：
- [ ] 第一周专注 Electron + Core 子进程通信骨架，不写业务
- [ ] 第二周做 Provider(openai-compat) + 1 个最简 Skill(image_gen)跑通
- [ ] 持续保持"任何时候 main 分支都能 dmg 打包成功"

长期：
- [ ] 每周一次设计回顾，更新 `004 / 006 / 07` 等文档
- [ ] 每个 vX 结束后写一份 retrospective 到 docs/

---

## 11. 不在路线图内的事（明确排除）

- 模型训练 / 微调
- 移动端
- 浏览器版
- 团队多用户 / 协作
- 实时语音 Agent
- 自营推理服务

这些会在远期单独评估，不进 v1.0 之前的路线。

---

> **结束语**：路线图不是承诺时间表，是承诺顺序。允许某个 vX 做得更深、更慢，但不允许跳过依赖。一个版本 DoD 不达标，不进下一个版本——这是单人产品化最重要的纪律。
