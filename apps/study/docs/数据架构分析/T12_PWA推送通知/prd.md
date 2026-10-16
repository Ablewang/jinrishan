# T12 · PWA 推送通知

**类型：** 新功能  
**优先级：** P3  
**估算工时：** 3–5天  
**UI改动：** 设置页推送通知开关；首次授权引导弹窗

---

## 背景

`reminder_time` 字段已存储用户偏好的提醒时间，但目前只是 UI 记忆，没有实际推送能力。实现每日定时提醒可以有效提升打卡率。

---

## 两种实现方案

### 方案A：纯前端 Periodic Background Sync（无后端）

**适用：** Android Chrome / Edge  
**限制：** iOS Safari 完全不支持；App 完全关闭时无法触发

**实现：**
- `public/sw.js` 注册 `periodicsync` 事件
- 在 SW 中检查 `reminder_time`，到时间则 `self.registration.showNotification()`

**推荐用于：** 快速验证推送效果，先上 Android

---

### 方案B：Web Push Protocol（推荐，需轻量后端）

**适用：** iOS Safari 16.4+、Android Chrome、桌面浏览器  

**架构：**
```
前端                      后端（Cloudflare Worker + D1）
  ├─ requestPermission()
  ├─ subscribe() ────────► 存储 {endpoint, keys, reminder_time, userId}
  │                                │
  │                    Cron 每分钟  │
  │◄── Push Message ───────────────┤ 匹配 reminder_time，发 Web Push
  │
  SW 收到 push
  showNotification：「古诗小课堂 · 今日打卡」
```

**后端技术栈：** Cloudflare Workers + D1 + `web-push` npm 包，近零成本

---

## 通知内容设计

- **标题：** 「古诗小课堂 · 今日打卡」
- **正文（按条件选一）：**
  - 有到期复习：「今天有 N 首待复习，别忘了」
  - 无复习但有连续天数：「连续第 X 天！坚持就是胜利」
  - 默认：「今天背首古诗吧」
- **点击行为：** 直达首页今日任务区

---

## 功能需求

1. 设置页新增"每日提醒"开关 + 时间选择器（复用现有 `reminder_time`）
2. 开启时触发系统权限请求，用户授权后完成订阅
3. 用户拒绝授权后，开关自动关闭，提示"请在系统设置中允许通知"
4. 关闭开关时，向后端发送取消订阅请求

---

## 实施顺序建议

1. 先上方案A（仅 Android），验证通知转化率
2. 根据数据决定是否投入方案B后端成本

---

## 验收标准

- [ ] 设置页可以打开/关闭推送通知
- [ ] 打开时系统弹出通知授权请求
- [ ] 到达设置时间时，锁屏/后台收到通知
- [ ] 点击通知跳转到 App 首页
- [ ] 方案A：Android Chrome 验证通过
- [ ] 方案B（如实施）：iOS Safari 16.4+ 验证通过
