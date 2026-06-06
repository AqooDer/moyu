# 007-docs-moyu

> 项目代号：**Moyu(摸鱼)** —— 一个让"完成一件事"变得像摸鱼一样轻松的智能体平台。
>
> **2026-05-21 重大方向修订**:首发场景由"写标书"切换到"生图原型 Agent"(详见 `18-生图原型Recipe规格.md`);ADR-008 立项,Meta-Agent 从"装配现有 Skill"扩展为"现造 Skill + 声明式 UI"(详见 `04 §8 ADR-008` 与 `15/16/17` 新增文档)。
>
> 代码目录: `/Users/zlj/code/my_github/moyu`
> 文档目录: `/Users/zlj/code/my_github/moyu/docs`
> 迁移说明: 设计文档已从 `007-docs-moyu` 迁入代码项目,不再通过软链接引用外部目录。
> 工程状态: 项目已进入原型实现阶段,运行命令与当前状态见 `21-工程运行与状态.md`。

## 1. 项目目标

设计一个**个人桌面端智能体平台**(前期设计阶段,仅产出文档),核心能力:

1. **平台框架**:提供智能体的管理、配置、运行、监控能力。
2. **元智能体(Meta-Agent)**:通过对话即可创建新的业务智能体(包括其记忆、工具、Skill、MCP、模型选择等配置)。**v0.3 起,Meta-Agent 可受控生成新 Skill 代码 + 声明式 UI Schema,而不仅仅是装配现有能力**(ADR-008)。
3. **业务智能体运行时**:创建出的智能体可以在平台上**直接被使用**,独立完成一项具体任务(如生图原型、写标书、PDF 转 PPT 等)。
4. **多 AI 聚合**:单个智能体可调用多种 AI 能力(文本、图像、文档、代码等)。
5. **模型动态路由**:根据任务复杂度自动/手动切换底层模型(便宜模型 vs 强模型),由**监控智能体**辅助决策。
6. **沙箱执行**:智能体运行隔离,保障安全与稳定。
7. **Agent = 文件夹**(ADR-008):每个 Agent 是 `agents/<id>/` 下的文件夹(manifest.yaml + ui.yaml + skills/ + history/ + ...),用户可在外部编辑器直接修改、平台自动热加载(详见 `15`)。

## 2. 技术栈

> 当前已进入**原型实现阶段**。技术栈已与用户对齐:**产品化定位、Node/TS 单语言栈、云 API、首发任务"生图原型"(2026-05-21 切换)、按完整方案推进**。实际运行命令与工程状态见 `21-工程运行与状态.md`。

| 维度 | 选型 | 备注 |
| --- | --- | --- |
| 桌面壳 | **Electron** | 与 Node/TS 栈一致;包体积代价可接受 |
| UI | **React + TypeScript + Tailwind + shadcn/ui** | 生态最熟、组件齐全 |
| UI Schema | **声明式 YAML DSL**(自研,闭集控件) | Meta-Agent 不生成 JSX,只生成 ui.yaml;平台解释渲染(详见 `16`) |
| 状态管理 | **Zustand** | 轻量、TS 友好 |
| 本地服务 | **Node.js + TypeScript**(独立子进程) | 与 Electron 主进程解耦,避免阻塞 UI |
| 智能体编排 | **自研轻量编排引擎**(事件 + 状态机) | 不引入 LangGraph/CrewAI(Python 强势) |
| 模型接入 | **Provider 抽象**:openai-compat(中转站) / Anthropic / OpenAI / 通义 / 豆包 | 用户自带 API Key(BYO Key);v0.1 首发只支持 openai-compat |
| 沙箱 | L0 主进程 / **L1 worker_threads + isolated-vm** / L2 Docker(按需) | 默认 L0+L1,无需 Docker 也能跑;生成 Skill 强制 L1 |
| 存储 | **better-sqlite3** + **LanceDB**(向量) + 本地文件系统 | 全本地,零依赖外部服务 |
| 协议 | **MCP**(官方 TypeScript SDK) | v0.5+ 工具协议一等公民 |
| 自动更新 | **electron-updater** | 产品化 day 1 必须 |
| 日志 | **pino**(结构化) | |
| 测试 | **Vitest** | |
| Skill 受控生成 | tsc + ESLint(@moyu/eslint-plugin-skill) + AST 扫描 + 沙箱试跑 + 强制 HUMAN_REVIEW | 详见 `17` |

## 3. 启动与运行

工程已具备可运行 CLI 与 Workbench 原型。常用入口:

```bash
npm install
npm run dev -- help
npm run prototype:workbench
```

完整命令见 `21-工程运行与状态.md`。

## 4. 测试

当前以 TypeScript 类型检查和构建检查为主:

```bash
npm run typecheck
npm run build
```

## 5. 目录结构

```
007-docs-moyu/
├── README.md                       # 本文件,项目总览
├── 01-原始需求.md                  # 用户提出的原始需求(保真记录)+ 8 个待澄清问题
├── 02-初步分析与建议.md            # 总体判断、术语建议、架构草图、风险、给用户的 6 个问题
├── 03-核心概念定义.md              # 统一术语词表(Agent / Meta-Agent / Skill / Tool / Tier / Sandbox …)
├── 04-总体架构.md                  # 分层架构、模块清单、进程模型、数据流、技术栈定稿、ADR-001~008
├── 05-元智能体设计.md              # Meta-Agent 工作流、Manifest schema、Recipe、自我修复、UI/Skill 生成子流(v0.3+)
├── 06-运行时与沙箱.md              # Task/Run/Step 模型、三种 workflow、L0/L1/L2 沙箱、Trace/回放
├── 07-模型路由与监控智能体.md      # Tier 抽象、规则引擎、Monitor 异步分析、反馈闭环
├── 08-竞品与参考.md                # Dify/Coze/Cherry Studio/LangGraph 等对比;Moyu 差异化定位
├── 09-MVP-路线图.md                # v0.0→v1.0 完成度阶梯(不锁时间,锁顺序;含 ADR-008 硬验收)
├── 10-v0.0-技术尖刺.md             # CLI 验证:prompt → openai-compat 中转站 → PNG 跑通后再投资 v0.1(2026-05-21 改为生图)
├── 11-写标书Recipe规格.md          # v0.2+ 候选 Recipe(2026-05-21 让位,从首发降级);intake/输出契约/质量自评/溯源/验收
├── 12-Trace数据模型.md             # SQLite + blob 双层;9 张核心表 schema;脱敏/保留/演进规则
├── 13-Artifact契约.md              # 产物类型/角色/版本树;用户编辑作为质量信号;导出/溯源
├── 14-UI原型与信息架构.md          # 信息架构 + 18 个屏幕 ASCII 线框(含 S-18 Agent 文件夹浏览器)+ 5 个关键流程
├── 15-Agent文件夹结构与热加载.md   # ★ ADR-008 落地:agents/<id>/ 目录契约 + chokidar 热加载 + history + 导出
├── 16-声明式UI Schema.md           # ★ ui.yaml DSL 规格:闭集控件 + layout + Action 绑定 + 兜底渲染
├── 17-Skill受控生成与审核.md       # ★ Meta-Agent 现造 Skill 全流程:STATIC_CHECK + SANDBOX_DRY_RUN + HUMAN_REVIEW
├── 18-生图原型Recipe规格.md        # ★ 2026-05-21 新首发 Recipe:image-gen/prototype-v1 + 6 个验收 case
├── 19-产品定位与界面方案调整.md    # ★ 2026-05-26 UI 概念图后收敛:代码驱动 Agent 创建/运行平台,画布降级为可选观察视图
├── 20-任务会话式Workbench与多产物架构调整.md # ★ 2026-05-28 修正:Workbench 以 Work Conversation 为中心,Artifact/Trace 进入右侧 Inspector
├── 21-工程运行与状态.md            # ★ 从根 README 迁移出的工程入口:目录、命令、配置、当前实现状态
├── 22-v0.1-alpha闭环规格.md        # ★ v0.1-alpha 主线:元智能体创建/审核/安装/运行 Agent 的最小闭环
├── logo                            # 项目素材
└── ...
```

## 6. 当前进度

- [x] 创建项目骨架与 README
- [x] 记录原始需求(`01-原始需求.md`)
- [x] 输出初步分析与建议(`02-初步分析与建议.md`)
- [x] 与用户对齐:产品化定位、Node/TS 栈、云 API、按完整方案推进
- [x] 完成 `03-核心概念定义.md`
- [x] 完成 `04-总体架构.md`(含技术栈定稿与 ADR-001~007)
- [x] 完成 `05-元智能体设计.md`
- [x] 完成 `06-运行时与沙箱.md`
- [x] 完成 `07-模型路由与监控智能体.md`(Tier 抽象化,不绑模型名)
- [x] 完成 `08-竞品与参考.md`
- [x] 完成 `09-MVP-路线图.md`(含 v0.0 技术尖刺前置门槛)
- [x] 完成 `10-v0.0-技术尖刺.md`
- [x] 完成 `11-写标书Recipe规格.md`(后让位为 v0.2+ 候选)
- [x] 完成 `12-Trace数据模型.md`
- [x] 完成 `13-Artifact契约.md`
- [x] 完成 `14-UI原型与信息架构.md`
- [x] 第二轮 review 已落地:v0.0 前置 / v0.2 收窄为 Recipe 装配器 / Trace 字段锁 v0.1 / isolated-vm 提前验证 / MCP 推后 / Tier 抽象 / BYO Key Onboarding / Artifact 契约
- [x] **2026-05-21 ADR-008 立项**:Meta-Agent 从"装配现有 Skill"扩展为"现造 Skill + 声明式 UI";物理形态 = 单 Agent 一个文件夹
- [x] 改 `04 §8` 加 ADR-003 修订版 + ADR-003a(不生成 JSX)+ ADR-008(agent create agent);改 §1 第 3 条原则为"配置驱动 + 受控代码生成"
- [x] 改 `05` Meta-Agent 加 UI_DRAFT / SKILL_REQUEST / SKILL_REVIEW 子状态;按 v0.2/v0.3/v0.4 分阶段开放
- [x] 新建 `15-Agent文件夹结构与热加载.md`(目录契约 + 热加载 + history + 导出)
- [x] 新建 `16-声明式UI Schema.md`(ui.yaml DSL 闭集 + 兜底渲染)
- [x] 新建 `17-Skill受控生成与审核.md`(STATIC_CHECK + SANDBOX_DRY_RUN + HUMAN_REVIEW)
- [x] 新建 `18-生图原型Recipe规格.md`(新首发 Recipe + 6 个 case)
- [x] 新建 `19-产品定位与界面方案调整.md`(基于 9 张 UI 概念图,收敛为代码驱动的 Agent 创建平台 + Agent 运行平台;画布不作为 MVP 主路径)
- [x] 新建 `20-任务会话式Workbench与多产物架构调整.md`(修正 Workbench 方向:对话中心、左右可收起、Artifact 归属当前 Work、多 Agent 调用进入 Trace)
- [x] 根目录 `README.md` 改为面向大众的项目介绍;原工程运行内容迁移到 `21-工程运行与状态.md`
- [x] 新建 `22-v0.1-alpha闭环规格.md`(锁定元智能体创建 Agent 的最小可用闭环)
- [x] 建立 Workbench 静态原型 `ui/workbench-prototype/`,默认中文,支持中文 / English 切换
- [x] 改 `09-MVP-路线图.md`:加核心铁律 3(ADR-008 硬验收);v0.0 改为生图尖刺;v0.1 首发改为生图原型;v0.2 把写标书 Recipe 纳入;v0.3 加 Meta-Agent 现造 LLM Skill;v0.4 加现造 code Skill
- [x] 改 `10-v0.0-技术尖刺.md`:从 PDF→docx 换为 prompt → openai-compat 中转站 → PNG;时间盒从 1 周压到 1 天
- [x] 改 `11-写标书Recipe规格.md`:顶部加 banner,从 v0.1 首发让位为 v0.2+ 候选 Recipe
- [x] 改 `14-UI原型与信息架构.md`:S-10 Meta-Agent 屏加 v0.3+ 扩展面板(ui.yaml 实时预览 + Skill 审核 Drawer 4 Tab);新增 S-18 Agent 文件夹浏览屏;F-01 改为生图首发 happy path;新增 F-02b 现造 Skill 流程

> **前期设计阶段交付完成**(含 2026-05-21 ADR-008 方向修订)。下一步建议先做 v0.0 技术尖刺(`10` + `18 §7`),用 1 天验证 prompt → openai-compat 中转站 → PNG 链路,出 go/no-go 决策后再开 v0.1。

> **2026-05-22 代码启动**:正式代码目录已建立,并落下最小 CLI spike 骨架(`moyu spike image-gen`)。

## 7. TODO(实现阶段)

### v1.0 前必须由用户拍板的产品化决策(详见 `09-MVP-路线图.md §7`)
- [ ] License:开源协议(建议 MIT 或 Apache 2.0)
- [ ] 付费模式:免费 / 一次性 / 订阅 / 按 Recipe
- [ ] 同步服务:v1.0 是否做?
- [ ] 遥测:默认开 / 默认关
- [ ] 官方社区渠道:GitHub + 中文平台选哪个

### v0.0 技术尖刺(详见 `10-v0.0-技术尖刺.md` + `18 §7`,2026-05-21 改为生图)
- [ ] 准备 1 个 openai-compat 中转站测试 Key + base_url(本人手动配,不入仓库;严守 CLAUDE.md 第 11 条)
- [ ] 准备 10 条原型 prompt 测试集(登录页/列表页/卡片/图标/插画 各 2 条)
- [ ] 找 1 位设计/产品同行做主观评分交叉验证
- [x] 建立正式代码目录 `/Users/zlj/code/my_github/moyu`
- [x] 将设计文档迁移为代码项目内真实目录,取消双向软链
- [x] 落下最小 CLI spike 骨架
- [ ] 锁定中转站预算上限(可设 $20 hard cap)
- [ ] 跑通"prompt → openai-compat → b64 解码 → 写本地 PNG → JSON Trace"链路,回答:质量上限 / 链路稳定性 / 单次成本与时延 三个核心问题
- [ ] 出 go/no-go 决策报告(决定是否投资 v0.1 全套基建,或回退到写标书首发)
- [ ] 时间盒上限 **1 天**(超出强制减范围)

### v0.1 启动前的准备
- [ ] 按 CLAUDE.md 规范开新仓库 `008-node-moyu-mvp`
- [ ] 锁定 Node 20 / Electron / 主要依赖大版本
- [ ] 准备 openai-compat 中转站正式 Key(可选:Anthropic + OpenAI 备用测试 Key,v0.3+ 才用到)
- [ ] 把 v0.0 沉淀的 10 条 prompt 测试集纳入 v0.1 DoD 回归
- [ ] isolated-vm 在 macOS (Intel + Apple Silicon) 完成 prebuild 验证(即使 v0.1 不启用 L1,也要为 v0.3 验证可行性)

### v0.2+ 准备(写标书 Recipe 复活时使用)
- [ ] 准备 3 份不同行业的匿名化招标 PDF(覆盖 `11 §9` C-01~C-06)
- [ ] 找 1-2 位投标工程师做规格评审 + 后续主观评价
- [ ] 准备 2 份"公司档案模板"(含人员/业绩/设备/资质)
- [ ] 准备"禁用词清单"通用样例(合规友好)

### v0.3 准备(ADR-008 第一次硬验收)
- [ ] 设计 1-2 个"现有 Skill 库刚好覆盖不到"的 case 用于验证 Meta-Agent SKILL_REQUEST 全流程跑通
- [ ] 配置 `@moyu/eslint-plugin-skill` 的 5 条核心规则(`17 §5`)
- [ ] 准备 Skill 模板库 few-shot 样本(供 Meta-Agent 学样)

### 持续维护
- [ ] 每次重大架构决策追加 ADR 到 `04-总体架构.md §8`
- [ ] 每个 vX 结束后写一份 retrospective
- [ ] 每加一个 Skill / Recipe / Manifest 字段 → 同步对应规格文档
