# 16 - 声明式 UI Schema

> ADR-008 决定 Meta-Agent 要让每个 Agent "看起来不一样",但不能让 LLM 自由写 React 代码。本文定义"声明式 UI Schema"——**一个 YAML DSL**,Meta-Agent 写它、平台解释执行,渲染成实际界面。
>
> 思路对齐 Streamlit / Gradio / Retool:**数据驱动的 UI,不是代码驱动**。
>
> 撰写日期:2026-05-21

---

## 1. 设计原则

1. **DSL 而非代码**:Meta-Agent 输出 YAML,不输出 JSX/TSX/CSS。
2. **平台解释执行**:平台运行时把 YAML 映射到 React + shadcn 组件,Meta-Agent 不感知具体实现。
3. **可手编辑**:YAML 可读,用户可在编辑器直接改(对应 `15`)。
4. **闭集控件 + 可扩展**:控件目录是闭集,新增控件需平台升级 + ADR;但**布局**和**绑定表达式**是开放的。
5. **数据流单向**:UI → 触发 Action → Core 执行 → Run 状态/产物 → 回流 UI;UI 内部不持业务状态。
6. **降级渲染**:遇到未知控件或绑定错误,渲染"占位 + 错误说明"而不是白屏。

---

## 2. 三段结构

每个 Agent 的 `ui.yaml` 由三段(可选 + 一段 Workspace 贡献)组成:

```yaml
# ui.yaml
schema_version: 1

intake:     # ★ 必须:用户启动 Run 前的输入表单
  ...

run:        # ⭕ 可选:Run 进行中的附加视图(默认走平台时间轴)
  ...

output:     # ★ 必须:Run 完成后的产物展示
  ...

workspace_views:   # ⭕ 可选:Agent 向 Workspace 贡献的导航页(如"项目库")
  ...
```

### 2.1 三段为什么这么切?

| 段 | 时机 | 默认平台已提供 | Agent 可定制原因 |
| --- | --- | --- | --- |
| `intake` | Task 创建/Run 启动前 | 通用表单 | 不同 Agent 输入差异巨大 |
| `run` | Run 运行中 | 时间轴 + Step 树 | 多数 Agent 不需要,生图等想看进度网格的可加 |
| `output` | Run 完成后 | Artifact 卡片列表 | 不同产物类型(图集/文档/数据)展示天差地别 |
| `workspace_views` | 任意时刻 | — | 生图 Agent 想加"项目库"页面这类长效视图 |

### 2.2 与 `manifest.yaml` 的关系

- `manifest.yaml` 声明 `inputs_schema` 与 `outputs_schema`(数据契约)
- `ui.yaml` 声明这些数据**怎么收集 / 怎么展示**
- 两者必须一致(平台启动 Run 前校验:`ui.intake` 涉及的字段必须在 `inputs_schema` 中)

### 2.3 完整最小示例

```yaml
schema_version: 1

intake:
  layout:
    kind: form
    title: 新建生图任务
    fields:
      - bind: input.prompt
        control: TextArea
        label: 提示词
        required: true
        placeholder: "describe what you want to generate"
        max_chars: 2000
      - bind: input.count
        control: NumberInput
        label: 生成张数
        default: 4
        min: 1
        max: 12
      - bind: input.style
        control: Select
        label: 风格
        default: realistic
        options:
          - { value: realistic, label: 写实 }
          - { value: cartoon,   label: 卡通 }
          - { value: sketch,    label: 线稿 }
      - bind: input.reference
        control: FileUpload
        label: 参考图(可选)
        accept: ["image/*"]
        max_files: 1
  submit:
    label: ▶ 生成
    estimate: true   # 提交前显示"预计 X 张图、Y 秒、$Z"

output:
  layout:
    kind: tabs
    items:
      - label: 图集
        content:
          control: ImageGrid
          bind: output.images       # outputs_schema 中声明的 array<Artifact>
          columns: 4
          actions: [download, regenerate_one, copy_prompt, star]
      - label: 用了什么
        content:
          control: KeyValueTable
          bind: output.metadata
```

---

## 3. 布局原语(Layout)

布局是"控件的容器"。闭集。

| `kind` | 含义 | 关键字段 |
| --- | --- | --- |
| `form` | 上下排列的字段表单 | `title` / `description` / `fields[]` |
| `grid` | 网格布局 | `columns` / `cells[]`(每个 cell 指定 `row`/`col`/`span`) |
| `tabs` | 标签页 | `items[]`(每项 `label` + `content`) |
| `panel` | 单容器 + 标题/折叠 | `title` / `collapsible` / `content` |
| `split` | 左右/上下分屏 | `direction: horizontal\|vertical` / `panes[]` |
| `conditional` | 条件渲染 | `when`(表达式) / `then`(布局) / `else`? |
| `repeat` | 列表渲染 | `each: <array-bind>` / `as: <var>` / `content`(布局) |

布局可以嵌套:`tabs > split > form > fields > ...`。

---

## 4. 控件目录(Controls)

闭集。每个控件有固定的 props 与绑定语义。

### 4.1 输入控件(intake 用)

| 控件 | 绑定类型 | 关键 props |
| --- | --- | --- |
| `TextInput` | string | placeholder/max_chars/pattern |
| `TextArea` | string | rows/max_chars |
| `NumberInput` | number | min/max/step |
| `Slider` | number | min/max/step/marks |
| `Switch` | boolean | |
| `Checkbox` | boolean | |
| `Select` | string | options[]/multi(boolean) |
| `Radio` | string | options[] |
| `DatePicker` | string(ISO) | |
| `FileUpload` | array<file ref> | accept/max_files/max_size |
| `ImagePicker` | string(file ref) | from: upload\|library |
| `ColorPicker` | string(#hex) | |
| `JsonEditor` | object | schema(可选) |
| `PromptEditor` | string | 带变量补全的 TextArea |
| `RefSelector` | ref | kind: agent\|recipe\|skill\|artifact |

### 4.2 展示控件(output 用)

| 控件 | 绑定类型 | 关键 props |
| --- | --- | --- |
| `Text` | string | markdown(boolean) |
| `Markdown` | string | |
| `Code` | string | language |
| `JsonView` | object | collapsed |
| `KeyValueTable` | object | |
| `Table` | array<object> | columns[] |
| `Image` | file ref | width/height/zoomable |
| `ImageGrid` | array<file ref> | columns/actions[] |
| `FileCard` | file ref | actions[] |
| `FileList` | array<file ref> | actions[] |
| `Chart` | object(spec) | kind: bar\|line\|pie(vega-lite 子集) |
| `DiffViewer` | { a, b } | mode: text\|json |
| `Iframe` | string(url) | 受限:仅 localhost 与白名单 host |

### 4.3 运行时控件(run 段用)

| 控件 | 用途 |
| --- | --- |
| `StepTimeline` | 平台默认就有,Agent 可换样式 |
| `ProgressGrid` | 生图等 fanout 场景:N 格子,每格一个并行 Step 状态 |
| `StreamingText` | 长文本流式输出 |
| `LiveLog` | sandbox stdout |
| `LiveMetric` | tokens/cost/duration 实时 |

### 4.4 通用 Action 控件

| 控件 | 用途 |
| --- | --- |
| `Button` | label/action/style |
| `ActionMenu` | label/items[]:[{label, action}] |
| `Toast` | message/level(只能由 action 触发,不能直接放在布局里) |

---

## 5. 绑定与表达式

### 5.1 绑定语法
- `input.<field>` — Manifest inputs_schema 字段
- `output.<field>` — Manifest outputs_schema 字段
- `run.state` / `run.duration` / `run.cost` — Run 元信息
- `run.steps[<name>].state` / `.output`
- `workspace.<key>` — Workspace 级数据(如项目列表)
- `agent.config.<key>` — Agent Manifest 中的配置

### 5.2 表达式(用于 `when` / 默认值 / 简单变换)
- 子集 JS 表达式(jsep + 沙箱 eval),**只读**
- 允许:`==` `!=` `&&` `||` `!` `?:` `+ - * /`、字段访问、字面量
- 禁止:函数调用、循环、I/O、`eval`、`require`
- 例:`input.count > 4`、`run.state == 'succeeded'`、`output.images.length`

### 5.3 Action 语法
```yaml
- control: Button
  label: 重生成第 3 张
  action:
    kind: rerun_step          # 平台预置 action 类型
    args:
      step: image_gen
      override:
        index: 2
        prompt: "${input.prompt} + more colorful"
```

Action 类型(闭集):
- `submit` — 提交 intake,启动 Run
- `cancel` / `pause` / `resume` — Run 控制
- `rerun` / `rerun_step`
- `download` / `copy_to_clipboard` / `open_external`
- `set_workspace_field` — 把产物写入 Workspace 级数据(用于 workspace_views)
- `navigate` — 路由跳转
- `meta_agent_dialog` — 唤起 Meta-Agent 改本 Agent

---

## 6. Workspace 级视图(workspace_views)

让 Agent 给 Workspace 加一个**长效页面**(不是单次 Run 的产出)。生图 Agent 的"项目库"页面就是这种。

### 6.1 声明
```yaml
workspace_views:
  - id: image_gen_projects
    title: 原型项目库
    icon: 📁
    nav_section: tools         # 出现在左 Nav 哪一组(home/tasks/tools/settings)
    page:
      layout:
        kind: split
        direction: horizontal
        panes:
          - size: 30
            content:
              control: Table
              bind: workspace.image_gen.projects
              columns: [name, image_count, last_modified]
              actions: [open, rename, delete]
          - size: 70
            content:
              layout:
                kind: conditional
                when: workspace.selected_project != null
                then:
                  control: ImageGrid
                  bind: workspace.selected_project.images
                  columns: 4
                  actions: [open, regenerate, delete, copy_prompt]
```

### 6.2 数据归属
- `workspace.image_gen.*` 是 Agent 命名空间下的 Workspace 数据
- 由 Agent 通过 Skill / Action 写入(`set_workspace_field`)
- 删除 Agent → 询问用户:`a) 同时清掉 workspace.image_gen.*` 或 `b) 保留(数据孤儿)`
- 平台为每个 Agent 独立的 `workspace.<ns>` 提供 SQLite 表 + 简单 schema 校验

### 6.3 多 Agent 同 nav_section 处理
- 如果两个 Agent 都贡献 `nav_section: tools`,平台在 nav 显示为两条
- 同 `id` 冲突 → 后装的报错,提示用户改名

---

## 7. Manifest 引用(ui_ref)

Manifest 加一行就够:
```yaml
# manifest.yaml
ui_ref: ./ui.yaml   # 相对 Agent 文件夹
```

未声明 `ui_ref` 时,平台**根据 `inputs_schema` + `outputs_schema` 自动生成**最简 UI(平台兜底,见 §10)。

---

## 8. 完整示例:生图原型 Agent 的 ui.yaml

```yaml
schema_version: 1

intake:
  layout:
    kind: tabs
    items:
      - label: 单次生成
        content:
          layout:
            kind: form
            fields:
              - bind: input.prompt
                control: PromptEditor
                label: 提示词
                required: true
                rows: 4
              - bind: input.count
                control: Slider
                label: 张数
                min: 1
                max: 12
                default: 4
                marks: [1, 4, 8, 12]
              - bind: input.style
                control: Select
                label: 风格
                default: realistic
                options:
                  - { value: realistic, label: 写实 }
                  - { value: cartoon,   label: 卡通 }
                  - { value: sketch,    label: 线稿 }
                  - { value: anime,     label: 二次元 }
              - bind: input.size
                control: Select
                label: 尺寸
                default: "1024x1024"
                options:
                  - { value: "1024x1024", label: 方形 1024 }
                  - { value: "1792x1024", label: 横版 1792 }
                  - { value: "1024x1792", label: 竖版 1792 }
              - bind: input.reference
                control: FileUpload
                label: 参考图(可选)
                accept: ["image/*"]
                max_files: 1
              - bind: input.project
                control: Select
                label: 归入项目
                bind_options: workspace.image_gen.projects
                allow_create: true
      - label: 批量(prompt 列表)
        content:
          layout:
            kind: form
            fields:
              - bind: input.prompts
                control: JsonEditor
                label: 多个 prompt(数组)
                schema:
                  type: array
                  items: { type: string }

run:
  layout:
    kind: split
    direction: vertical
    panes:
      - size: 60
        content:
          control: ProgressGrid
          bind: run.steps.image_gen.fanout_status
          columns: 4
      - size: 40
        content:
          control: LiveMetric
          fields: [duration, tokens_out, cost, eta]

output:
  layout:
    kind: tabs
    items:
      - label: 图集
        content:
          control: ImageGrid
          bind: output.images
          columns: 4
          actions:
            - { kind: download,    label: 下载 }
            - { kind: regenerate_one, label: 重生成这张 }
            - { kind: copy_prompt, label: 复制 prompt }
            - { kind: star,        label: 收藏 }
            - { kind: set_workspace_field,
                label: 加入项目库,
                args: { field: "workspace.image_gen.projects.${input.project}.images" } }
      - label: 用了什么
        content:
          control: KeyValueTable
          bind: output.metadata
      - label: Trace
        content:
          control: Iframe
          src: "internal://trace/${run.id}"

workspace_views:
  - id: image_gen_projects
    title: 原型项目库
    icon: 📁
    nav_section: tools
    page:
      layout:
        kind: split
        direction: horizontal
        panes:
          - size: 30
            content:
              control: Table
              bind: workspace.image_gen.projects
              columns: [name, image_count, last_modified]
              actions: [open, rename, delete]
          - size: 70
            content:
              layout:
                kind: conditional
                when: workspace.selected_project != null
                then:
                  control: ImageGrid
                  bind: workspace.selected_project.images
                  columns: 4
                  actions: [open, regenerate, delete, copy_prompt]
```

---

## 9. Zod schema(节选)

```ts
const ControlBase = z.object({
  control: z.enum(['TextInput', 'TextArea', 'NumberInput', ...]),
  bind: z.string().optional(),
  label: z.string().optional(),
  required: z.boolean().optional(),
  // ... 控件公共 props
});

const Layout = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('form'),  title: z.string().optional(),
             fields: z.array(ControlBase) }),
  z.object({ kind: z.literal('grid'),  columns: z.number(),
             cells: z.array(z.object({ row: z.number(), col: z.number(),
                                       span: z.number().optional(),
                                       content: z.lazy(() => Item) })) }),
  z.object({ kind: z.literal('tabs'),  items: z.array(z.object({
             label: z.string(), content: z.lazy(() => Item) })) }),
  // ...
]);

const Item = z.union([ControlBase, z.object({ layout: Layout })]);

export const UISchema = z.object({
  schema_version: z.literal(1),
  intake: z.object({ layout: Layout, submit: z.object({...}).optional() }),
  run:    z.object({ layout: Layout }).optional(),
  output: z.object({ layout: Layout }),
  workspace_views: z.array(z.object({...})).optional(),
});
```

完整定义放 `packages/types/ui-schema.ts`。

---

## 10. 平台兜底(无 ui.yaml 时)

若 Agent 没声明 `ui_ref`,平台按 `inputs_schema` + `outputs_schema` 自动生成:

| inputs_schema 字段类型 | 自动渲染 |
| --- | --- |
| `string` | TextInput / TextArea(超 200 字符) |
| `number` | NumberInput |
| `boolean` | Switch |
| `enum` | Select |
| `file` | FileUpload |
| `array<file>` | FileUpload(多文件) |
| `object` | JsonEditor |

| outputs_schema 字段类型 | 自动渲染 |
| --- | --- |
| `string` | Text/Markdown |
| `file (image/*)` | Image |
| `array<file (image/*)>` | ImageGrid |
| `file (其他)` | FileCard |
| `object` | JsonView |
| `array<object>` | Table(尝试推断列) |

这是"原 14 号文档"里讨论的 v0.1 默认 UI——**v0.1 大部分 Agent 不写 ui.yaml,走兜底就够;Agent 想"看起来不一样"再写**。

---

## 11. 与 14-UI 文档的关系

- `14` 描述的是**平台 Shell 的固定屏幕**(Onboarding/Workspace/Settings/Library)
- `16` 描述的是**Agent 自己的可变 UI**(intake/run/output/workspace_views)
- 两者通过路由 + Shell 的"Agent 视图区"组合渲染

具体:
- S-05 Task 创建 → 实际由当前 Agent 的 `intake` 渲染填充
- S-06 Run 详情 → 平台 Shell + Agent 的 `run`(若有)
- S-07 Artifact 详情 → Agent 的 `output` 渲染
- 左 Nav 的"tools"分组 → 由所有 Agent 的 `workspace_views` 注册

---

## 12. v0.x 实施分阶段

| 版本 | 增量 |
| --- | --- |
| v0.1 | 仅"平台兜底"(§10),不解析 ui.yaml |
| v0.2 | 完整 §3 §4 §5 §7;`workspace_views` 暂不支持 |
| v0.3 | `workspace_views`;`Action` 完整;`ProgressGrid` 等 run 段控件 |
| v0.4 | UI dry-run(Meta-Agent 写完先在沙箱内预览渲染) |
| v0.5 | UI 模板包(用户从社区导入一份 ui.yaml 套到自己 agent) |
| v1.0 | 可视化编辑器(拖拽 → 反推 ui.yaml);schema_version 升级与迁移 |

---

## 13. 不在本文范围(明确排除)

- ❌ 自定义 React 组件(若需要,走"自定义 Skill 渲染一段 HTML 给 Iframe",非主线)
- ❌ 复杂动画/过渡(平台统一默认)
- ❌ 国际化文案(`label` 暂只支持单语;v1.0 加 `label_i18n`)
- ❌ 主题/配色定制(用平台主题)
- ❌ 通用 SPA 路由(workspace_views 是有限的注册式视图,不是任意路由)

---

## 14. 给后续工作的 Checklist

- [ ] 把 §4 控件目录落成 `controls.ts` 注册表,运行时 dispatch
- [ ] 写一个 `ui-schema-validator` CLI:`moyu ui validate ui.yaml`
- [ ] 表达式求值器选定:`jsep` + 自实现安全 eval(白名单 AST)
- [ ] 给 Meta-Agent 准备 few-shot 库:每个 Recipe 一份示例 ui.yaml
- [ ] 文档:写 "ui.yaml 速查手册",1 页 A4,贴在 README
- [ ] 平台 UI 必须给"未知 control / 绑定失败"的优雅降级
