# Moyu Workbench

这是 Moyu v0.1 的本地 Workbench 前端，默认中文，支持 English 切换。

## 定位

- 产品方向：代码驱动的智能体创建平台 + 智能体运行平台
- 核心对象：任务会话（Work / Task Session），不是单个产物
- 中心区域：对话式协作界面，承载多轮交付、用户确认、Agent 调用和产物卡片
- 左侧区域：任务会话与 Agent 入口
- 右侧区域：当前任务的产物、Trace、上下文和详情
- 暂不做节点画布编辑器；Agent 调用 Agent 以运行步骤和 Trace 呈现
- 当前演示主线：用户通过对话让“元智能体”创建一个可运行的 `image-gen/prototype-v1` Agent，产物是 Agent 契约、执行入口、示例 Recipe 与验证 Trace
- 当前已补充“设置中心”原型：围绕 Models / Knowledge / Skills / Tools / MCP / Runtime 展示 Workspace 默认配置与 Agent 继承关系

## 打开方式

建议从仓库根目录启动带本地 API 的 Workbench 服务：

```bash
npm run workbench:serve
```

然后访问：

```text
http://127.0.0.1:4177/ui/workbench/
```

如果 `4177` 已被普通静态服务占用，命令会自动换到下一个可用端口，并在终端打印真实地址，例如：

```text
port 4177 is busy, using 4178 instead
workbench: http://127.0.0.1:4178/ui/workbench/
```

此时必须打开终端打印的 `workbench:` 地址；继续停留在旧的 `4177` 静态页面时，创建、打开和安装 Agent 的 API 动作不会生效。

如果只想看静态页面，也可以启动普通静态服务：

```bash
python3 -m http.server 4177 --bind 127.0.0.1
```

然后访问：

```text
http://127.0.0.1:4177/ui/workbench/
```

也可以先导出运行数据：

```bash
npm run workbench:export-data
```

`workbench:export-data` 会生成 `ui/workbench/public/data/workbench.json`。Workbench 页面会优先读取这份数据；如果没有生成数据，则使用页面内置的静态演示内容。

旧脚本 `prototype:workbench` 和 `prototype:export-data` 仍保留为兼容别名。

`prototype:workbench` 会额外提供本地 API：

- `GET /api/workbench`：读取最新 Run、Trace、Plan、Execution Mode、Sandbox Filesystem、Worker、TraceEvent 和产物
- `GET /api/settings`：读取设置中心数据，覆盖模型角色、知识库、Skill、Tool、MCP、运行策略与 Agent 默认继承关系
- `GET /api/plugins`：读取 Plugin Registry 能力、权限和运行策略声明
- `GET /api/policies`：读取权限声明与 runtime policy 子集
- `GET /api/works`：读取本地持久化 Work 会话，可按 `state` 筛选
- `GET /api/messages?workId=<work_id>|runId=<run_id>`：读取持久化 Conversation Message
- `GET /api/runs/:id`：读取原始 Run Trace，包含 plan、execution、sandbox、middleware、policy、worker 和 events 快照
- `GET /api/artifact-preview?id=<artifact_id>`：读取统一产物预览响应
- `GET /api/artifact-content?id=<artifact_id>`：读取文本产物内容，用于右侧检查器审核草案文件
- `POST /api/artifact/open`：用系统默认应用打开某个本地产物文件
- `POST /api/meta/create-agent`：通过元智能体创建 Agent 草案，并返回最新 Workbench 数据
- `POST /api/meta/install-agent`：把某次元智能体 Run 生成的 Agent 草案安装到正式 `agents/`；默认拒绝覆盖已存在的 Agent
- `POST /api/meta/install-agent/version`：当安装冲突时，把草案安装为下一个未占用 Agent 版本
- `GET /api/meta/install-agent/diff?runId=<run_id>`：查看草案与正式 Agent 目录的文件级差异摘要

## 元智能体创建 Agent

原型里的“确认创建”现在对应一个最小可执行的 CLI 闭环：

```bash
npm run dev -- meta create-agent \
  --prompt "创建一个生图原型 Agent，调用 gpt-image-2 中转接口，默认生成 3 张 UI 概念图，保存图片、Trace 和提示词" \
  --id custom/meta-image-prototype-v1 \
  --name "元智能体生成的生图 Agent" \
  --out /private/tmp/moyu-meta-create-agent \
  --force
```

默认生成的是可审核草案，不会直接写入 `agents/`。审核通过后使用安装命令把草案复制到正式 `agents/`，目标目录由 `--root agents` 控制：

```bash
npm run dev -- meta install-agent --run <meta_create_run_id>
```

如果正式 Agent 已存在，Workbench 会显示冲突信息，并给出“创建新版本”“查看差异”和“放弃安装”的下一步入口；默认不会静默覆盖。只有在明确接受覆盖风险时才使用 `--force`。

生成后可以用现有校验器验证：

```bash
npm run dev -- agent validate /private/tmp/moyu-meta-create-agent/custom__meta-image-prototype-v1
```

## 当前范围

- Codex 式三栏工作台
- 左右侧栏折叠，折叠后保留稳定窄轨道
- 左右区域拖拽调整宽度
- 中心任务会话与 Codex 风格消息输入框，既保留输入呼吸感，也尽量把纵向空间留给对话流
- 会话内展示元智能体驱动的下一步 Agent 创建队列
- 点击确认后推进创建状态：更新队列、Trace、会话消息和当前 Agent 产物
- 前端使用集中式 `prototypeState` 驱动阶段、产物、Trace 和选中产物渲染
- 当前 Agent 产物列表
- 当前 Agent 创建 Trace
- Agent 上下文、Policy Evaluation 与运行详情
- 设置中心：通过独立 `/api/settings` 读取模型角色、知识库、Skill、Tool、MCP 与运行策略
- 设置中心支持 `#settings/<section>` 直达分组，例如 `#settings/models`、`#settings/knowledge`、`#settings/mcp`
- 设置中心具备独立加载态、空态、失败态与重试，不依赖 Workbench 会话状态
- 中英文切换
- 读取 `public/data/workbench.json` 中的运行与产物数据

## 视觉方向

- 桌面应用质感，轻量毛玻璃和细边框，不做卡片堆叠式仪表盘
- 字体优先使用 `Inter`、`SF Pro`、`PingFang SC` 等系统级高质量字体
- 保持中文默认体验，英文作为国际化能力补充
- 交互上强调“丝滑”：布局尺寸持久化、折叠状态持久化、拖拽即时反馈
