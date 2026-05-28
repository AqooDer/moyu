# Moyu Workbench Prototype

这是 Moyu v0.1 的静态 Workbench 原型，默认中文，支持 English 切换。

## 定位

- 产品方向：代码驱动的智能体创建平台 + 智能体运行平台
- 核心对象：任务会话（Work / Task Session），不是单个产物
- 中心区域：对话式协作界面，承载多轮交付、用户确认、Agent 调用和产物卡片
- 左侧区域：任务会话与 Agent 入口
- 右侧区域：当前任务的产物、Trace、上下文和详情
- 暂不做节点画布编辑器；Agent 调用 Agent 以运行步骤和 Trace 呈现

## 打开方式

建议从仓库根目录启动本地静态服务：

```bash
python3 -m http.server 4177 --bind 127.0.0.1
```

然后访问：

```text
http://127.0.0.1:4177/ui/workbench-prototype/
```

也可以先导出运行数据：

```bash
npm run prototype:export-data
```

`prototype:export-data` 会生成 `ui/workbench-prototype/data/workbench.json`。原型页面会优先读取这份数据；如果没有生成数据，则使用页面内置的静态演示内容。

## 原型范围

- Codex 式三栏工作台
- 左右侧栏折叠，折叠后保留稳定窄轨道
- 左右区域拖拽调整宽度
- 中心任务会话与消息输入框
- 会话内展示 Recipe 驱动的下一步交付队列
- 当前任务产物列表
- 当前任务 Trace
- 任务上下文与运行详情
- 中英文切换
- 读取 `data/workbench.json` 中的运行与产物数据

## 视觉方向

- 桌面应用质感，轻量毛玻璃和细边框，不做卡片堆叠式仪表盘
- 字体优先使用 `Inter`、`SF Pro`、`PingFang SC` 等系统级高质量字体
- 保持中文默认体验，英文作为国际化能力补充
- 交互上强调“丝滑”：布局尺寸持久化、折叠状态持久化、拖拽即时反馈
