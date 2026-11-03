# 知序 LearnLedger

一个面向个人的学习工作台。用 Markdown 设计任务，提交截图或测试结果，通过 Agent 获得验收结论与错题分析，用金币和成就记录成长。

## 快速启动

需要 **Node.js 24.12+**（使用内置 `node:sqlite`，推荐 Node 24 LTS 或更新版本）。

```powershell
cd E:\WebStuioOnline
npm install
npm run dev
```

- 页面：<http://127.0.0.1:5173>
- 后端：<http://127.0.0.1:3001/api/health>
- 管理后台：页面左侧「管理工作台」。Agent 连接位于「偏好设置 → Agent 配置」。

根目录安装脚本会分别安装 `client/` 和 `server/` 依赖。也可单独运行 `npm --prefix client install` 与 `npm --prefix server install`。

```powershell
npm run build  # 生成 client/dist
npm start      # 同一后端提供生产页面和 API，访问 http://127.0.0.1:3001
npm test       # 隔离数据库的 API 集成测试
```

## 已实现

- Vue 3 SPA，Element Plus 组件，Bootstrap Icons；GitHub 风格，响应式布局，深色模式与自定义主题色。
- 学习总览、任务搜索和筛选、任务创建/编辑/删除、草稿和发布、独立管理工作台。
- Markdown 导入/导出、编辑/预览/分栏视图、工具栏、浏览器自动暂存与恢复。
- 图片选择、粘贴、拖入后上传到本地，正文插入占位符；宽度可调，高度始终 auto，保持原始比例。
- 可验证检查点，截图与测试输出提交，逐项 Agent 评审、错题分析、下一步建议与提交历史。
- OpenAI 兼容 Chat Completions 或自定义 Webhook；后台配置 Endpoint、模型、API Key 与预置教练提示词。
- Agent 根据主题生成学习任务草稿；外部 Agent 使用专属令牌调用发布 API。
- 金币账本、首次完成/连学/累计完成/纠错等成就，SQLite 持久化，任务奖励幂等。
- JSON 完整数据导出，含本地图片 data URL，不含 Agent API Key 或发布令牌。

## 图片与检查点语法

```markdown
# 任务：完成计数器

- 实现加一和重置按钮。

<!-- sf:checkpoint id="counter" title="证明加一和重置均工作正常" -->

[[image:上传后生成的UUID|width=600]]
```

`checkpoint id` 在单个任务内必须唯一，只含字母、数字、下划线或短横线。系统不会把勾选当作通过：学习者必须提交证据，Agent 仍要逐项验收。

图片占位符可在编辑器右侧调整宽度，预览始终以 `height:auto` 等比缩放。支持 PNG/JPEG/WebP/GIF，每张最多 5 MB。Markdown 导出只含正文和引用，完整导出会包含附件。

## Agent 接入

1. 打开「偏好设置 → Agent 配置」。
2. 选择协议。OpenAI 兼容接口可填写完整 `https://服务商/v1/chat/completions` 地址（也支持 `/v1` 基地址）。
3. 填写模型名和 Key；截图评审需要支持视觉输入的模型。
4. 检查预置提示词，启用并保存。服务端不会向前端返回已存 Key。
5. 在「管理工作台」生成任务；在「提交与错题」对已有待评审记录点击「重新评审」。

未配置 Agent 时，提交状态为 `pending`；连接失败或响应格式无效为 `error`，证据会保留，可重试。系统不会使用本地字数规则自动通过，也不会在错误时发币。真实服务可能产生调用费用，由配置的服务商决定。

Webhook 接收 `{mode,model,system,task,submission,attachments}`；截图附件包含 `dataUrl`。评审响应格式：

```json
{
  "completed": false,
  "score": 60,
  "feedback": "加一功能已完成，重置行为仍需要验证。",
  "mistakes": ["当前截图未展示重置后的数值，请补充该步骤。"],
  "next_step": "运行重置测试并再次提交。",
  "checkpoints": [
    {"id": "counter", "completed": false, "feedback": "重置证据不足"}
  ]
}
```

必须完整返回所有检查点，`completed` 必须是布尔值，分数为 0–100。总评通过且所有检查点通过，才记录完成并奖励金币；同一任务重复或并发通过也只发放一次任务奖励。生成模式 `mode=generate` 返回 `{ "tasks": [任务对象] }`，任务先保存为草稿。

## 外部 Agent 发布

到「偏好设置 → 开放 API」获取本地发布令牌，将其传给你信任的 Agent。令牌仅授权 `POST /api/agent/publish`。

```javascript
const response = await fetch('http://127.0.0.1:3001/api/agent/publish', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.LEARNLEDGER_TOKEN}`
  },
  body: JSON.stringify({
    title: '掌握 JavaScript 事件循环',
    subject: 'JavaScript', difficulty: '进阶', points: 40, duration: 30,
    status: 'published',
    content: '# 目标\n解释输出顺序并提供测试输出。\n\n<!-- sf:checkpoint id="event-loop" title="正确解释并验证输出顺序" -->',
    success_criteria: '说明同步代码、微任务与宏任务的执行顺序。'
  })
})
console.log(await response.json())
```

其他主要接口：

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET / POST | `/api/tasks` | 查询 / 创建任务 |
| GET / PUT / DELETE | `/api/tasks/:id` | 查看 / 编辑 / 删除任务 |
| POST | `/api/tasks/:id/submit` | 提交 `{answer,test_output,attachment_ids,checkpoint_ids}` |
| POST | `/api/submissions/:id/retry` | 重新评审 pending/error 提交 |
| GET | `/api/submissions` | 提交与错题记录 |
| POST | `/api/uploads` | 上传 `{name,dataUrl}` 图片 |
| GET | `/api/uploads/:id` | 图片元数据 |
| GET | `/api/uploads/:id/file` | 图片文件 |
| GET / PUT | `/api/agent/config` | 读取 / 保存 Agent 配置 |
| POST | `/api/agent/generate` | 生成任务 `{topic,subject,difficulty,count:1到5}` |
| GET | `/api/dashboard` | 真实学习统计与近七天完成记录 |
| GET | `/api/coins` / `/api/achievements` | 奖励与成就 |
| GET / PUT | `/api/settings` | theme、accent、compact_mode |
| GET | `/api/export` | 完整 JSON 备份 |

## 存储与运行范围

- `client/`：Vue 3 + Vite + Element Plus + Bootstrap Icons。
- `server/src/`：Express API、SQLite 建表与增量迁移、Agent 适配。
- `server/data/studyforge.sqlite`：数据库（保留初稿数据库文件名，避免覆盖已有记录）。
- `server/data/uploads/`：上传图片；完整备份时与数据库一起保留。
- `server/test/api.test.mjs`：测试使用临时数据库，不会改动日常学习记录。

默认绑定 `127.0.0.1`，定位为单人本机应用。管理接口检查本机 Host 和 Origin；这不是多人登录系统。若未来发布到公网，应先加入账户认证、权限和 HTTPS。浏览器 Markdown 经过 DOMPurify 清理后再显示。

可通过启动进程环境变量设置 `PORT`、`DATA_DIR`、`AGENT_TIMEOUT_MS`、`AGENT_PUBLISH_TOKEN`；`DATA_DIR` 包含数据库和上传文件。开发代理默认后端为 3001，若更改端口请同步 `client/vite.config.js`。用户偏好存入 SQLite，外观即时预览也缓存在浏览器。

页面图标与主题方案参考 [Bootstrap Icons](https://icons.getbootstrap.com/) 和 [Element Plus](https://element-plus.org/en-US/guide/dark-mode)。

