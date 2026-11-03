# 知序 LearnLedger API

Node.js 22.13+、Express 与 Node 内置 SQLite。默认只监听 `127.0.0.1:3001`；首次启动创建示例学习任务，既有数据库采用增量迁移，保留任务与历史奖励。

```powershell
cd server
npm install
npm run dev
npm test
```

`PORT` 可修改端口，`DATA_DIR` 可指定独立数据库和图片目录，`AGENT_TIMEOUT_MS` 为 Agent 超时毫秒数（默认45000）。前端构建至 `client/dist` 后，服务端会托管该单页面应用。

## 任务和证据

- `GET /api/tasks` 返回 `{items}`，支持 `status`、`subject`、`q` 筛选。
- `POST /api/tasks`、`GET/PUT/DELETE /api/tasks/:id` 支持任务管理，详情含 `submissions`。
- `POST /api/tasks/:id/publish` 发布草稿。
- 任务字段：`title, description, content, subject, difficulty, status, points, duration, success_criteria, proof_types, tags`。状态为 `draft|published`，证明类型为 `screenshot|test`。
- Markdown 中的验收项：`<!-- sf:checkpoint id="counter-reset" title="证明重置按钮恢复为0" -->`。ID 必须唯一。
- `POST /api/uploads {name,dataUrl}` 存储 PNG/JPEG/GIF/WebP 图片（最多5MB，校验文件头）。返回 `{id,name,url,mime,size}`，`url` 为 `/api/uploads/:id/file`；`GET /api/uploads/:id` 获取元数据。
- `POST /api/tasks/:id/submit {answer,test_output,attachment_ids,checkpoint_ids}` 提交证据；必须提供有效截图或测试输出，草稿不允许提交。
- 提交返回 `pending|completed|needs_revision|error`，包含 `score, feedback, analysis, next_step, checkpoints, earnedCoins`。
- 未配置 Agent 时证据保存为 `pending`；连接失败或输出不合法为 `error`，不会发奖。`POST /api/submissions/:id/retry` 可重评待评估/异常记录。
- `GET /api/submissions` 返回含任务标题的 `{items}`；`GET /api/submissions/:id` 获取单条记录。

每个任务仅首次通过可获得一次金币。任务奖励与提交结果在同一事务写入，数据库唯一约束可防止重复或并发刷币。

## Agent 连接

`GET/PUT /api/agent/config`：

```json
{
  "provider": "openai-compatible",
  "endpoint": "https://your-provider.example/v1",
  "model": "vision-model",
  "enabled": true,
  "api_key": "write-only-secret",
  "system_prompt": "额外的学习教练要求"
}
```

`provider` 支持 `openai-compatible` 和 `webhook`。API Key 仅写入，不回显；读取返回 `has_api_key`。省略 `api_key` 保留原值，显式传空字符串清除。使用支持视觉输入的模型时，截图会作为真实 `image_url` data URL 发给模型。

OpenAI 兼容模式调用 `/chat/completions`，携带系统提示词、文本资料和真实图片，要求 JSON 输出。Webhook 模式 POST `{mode,model,system,task,submission,attachments}`，其中附件带 `dataUrl`。生成模式发送 `{mode:"generate",topic,subject,difficulty,count}`。

评估服务必须严格返回：

```json
{
  "completed": false,
  "score": 60,
  "feedback": "需要补充重置按钮的验证证据",
  "mistakes": ["当前截图只展示了加一后的结果"],
  "next_step": "点击重置并提交截图或对应测试输出",
  "checkpoints": [
    {"id":"counter-reset","completed":false,"feedback":"尚未找到重置结果"}
  ]
}
```

服务端会严格验证字段类型、分数范围、checkpoint ID 完整性与完成结论一致性。不会用文本长度或截图存在来替代真实判定。

`POST /api/agent/generate {topic,subject,difficulty,count}`（1到5个）调用已配置 Agent 生成任务，保存为草稿并返回 `{items}`。

## 外部 Agent 发布

在本地管理页面通过 `GET /api/agent/publish-token` 获取独立发布令牌。可通过 `AGENT_PUBLISH_TOKEN` 环境变量优先指定固定令牌；未设置时使用SQLite中自动生成的令牌。外部工具调用 `POST /api/agent/publish` 时添加 `Authorization: Bearer <token>`，正文为任务字段；默认发布，也可指定草稿。旧的无鉴权 `/api/agent/tasks` 已停用。

管理接口仅绑定本机，检查 Host 和 Origin，仅允许本机5173/服务端口的页面跨域访问。发布令牌是独立的权限范围，不能替代本机管理访问。

## 数据和成长

- `GET /api/dashboard`：金币、完成任务数、已发布任务数、连续学习天数、过去七天完成量与最近记录。
- `GET /api/coins`：总金币和交易记录。
- `GET /api/achievements`：按真实完成、连续学习、奖励、创建和纠错记录计算成就进度。
- `GET/PUT /api/settings`：`theme:light|dark|system`、十六进制 `accent`、布尔 `compact_mode`。
- `GET /api/export`：完整导出任务、提交、图片数据、金币、成就与设置；不含 API Key 和发布令牌。

测试使用临时独立数据库及本机 Agent 测试服务，涵盖数据库迁移、并发幂等奖励、错误判定、上传、发布令牌和 OpenAI 兼容图像协议，不接触开发数据库。

