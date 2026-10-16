# T12 · PWA 推送通知

## 背景

`reminder_time` 字段已存，用户可在设置页选择每日提醒时间，但目前只是 UI 记忆，完全没有实际推送能力。纯前端的 Periodic Background Sync 仅支持 Android Chrome，iOS Safari 不支持。真正跨平台的推送需要 Web Push Protocol + 轻量后端。

## 目标

- 用户授权后，每天在设定时间收到学习提醒通知
- 通知内容个性化（今日复习数、连续天数）
- 后端极轻量，接近零成本（Cloudflare Workers + D1）

## 不在范围内

- iOS Safari 的推送支持（目前 iOS 16.4+ 已支持 PWA 推送，但需要添加到主屏幕）
- 通知的点击深链接跳转到具体功能页

## 功能需求

### 1. 前端：推送订阅

在设置页「学习提醒」区块：
- 当前：只有时间选择器，无实际推送
- 改为：「开启提醒」开关 → 点击触发 `Notification.requestPermission()`
- 授权后调用 `pushManager.subscribe()`，将 subscription 发送到后端

Service Worker 文件 `public/sw.js`：
- 监听 `push` 事件，展示通知
- 监听 `notificationclick`，打开 App

### 2. 后端：Cloudflare Workers + D1

**数据库表：**
```sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  reminder_time TEXT NOT NULL,  -- "HH:MM"
  timezone TEXT NOT NULL,        -- "Asia/Shanghai"
  created_at TEXT NOT NULL
);
```

**API 端点：**
- `POST /subscribe` — 保存/更新订阅
- `DELETE /subscribe` — 取消订阅

**定时任务（Cron Trigger）：**
- 每分钟执行一次
- 查询 `reminder_time` 匹配当前时间（考虑时区）的订阅
- 调用 `web-push` 发送通知

### 3. 通知内容设计

通知正文从以下模板随机选取（数据由前端预计算后存入 `poem_push_payload`，后端直接读取）：

| 场景 | 文案 |
|---|---|
| 有到期复习 | 「今天有 N 首诗到期复习，趁热打铁！」 |
| 连续打卡中 | 「连续第 X 天！别让今天中断」 |
| 普通提醒 | 「古诗小课堂来了，今天背一首？」 |
| 长时间未打开 | 「好久不见！你的诗还在等你」 |

### 4. 设置页 UI 改版

原型图见 → [prototype.md](prototype.md)

## 验收标准

- [ ] Android Chrome：授权后，到达设定时间收到推送通知
- [ ] iOS Safari（添加到主屏幕后）：同上
- [ ] 关闭提醒开关后，后端删除订阅，不再推送
- [ ] Cloudflare Workers 日均成本 < $0.01
- [ ] 通知点击后打开 App

## 工作量估算

5–7 天（含后端部署）

## 技术选型

- 后端：Cloudflare Workers（无服务器，免费额度足够）
- 数据库：Cloudflare D1（SQLite，免费额度足够）
- 推送库：`web-push` npm 包
- VAPID Key 生成：`web-push generate-vapid-keys`
