# 回归测试方案

本文档覆盖两轮重构的回归验证：
1. **数据架构重构**（Steps 1-10）：统一 SM-2 写入、新 key、迁移函数
2. **DataProvider 整合**：`useQueue` + `useRecitation` 合并进 `ProgressContext`

---

## 测试场景准备

### 场景 A：全新用户

清空所有本地数据，模拟第一次打开 App：

```bash
# 在浏览器 DevTools Console 执行
node scripts/seed-new-user.js
# 或直接在 DevTools Application → IndexedDB / localStorage → Clear All
```

见配套脚本 `scripts/seed-new-user.js`。

### 场景 B：老用户迁移

注入旧格式数据，模拟从旧版本升级：

```bash
node scripts/seed-legacy-user.js
```

见配套脚本 `scripts/seed-legacy-user.js`。

---

## 一、数据架构重构回归

### 1. 老用户迁移（场景 B）

| # | 操作 | 预期结果 |
|---|------|----------|
| 1.1 | 注入旧数据后刷新 App | 控制台无报错，`data_migration_v2 = 'done'` |
| 1.2 | 检查 `srs_schedules` key | 存在，包含从 `review_schedules` 转换的条目，字段 `nextDue` 非空 |
| 1.3 | 检查 `achievement_events` key | 存在，格式为数组 `[{id, unlockedAt}]` |
| 1.4 | 检查 `user_profile` key | 存在，包含 `nickname`、`onboardingDone` |
| 1.5 | 首页连续天数 | 与迁移前一致，未重置 |
| 1.6 | 首页「已背 N 首」 | 与迁移前一致，未归零 |
| 1.7 | 首页「待复习」列表 | 条目数量与迁移前一致 |

### 2. 背诵流程（场景 A/B 均需验证）

| # | 操作 | 预期结果 |
|---|------|----------|
| 2.1 | 选一首未背过的诗，完成背诵 | 首页「今日任务」状态更新 |
| 2.2 | 同上 | 热力图当天格子变红 |
| 2.3 | 同上 | 进度页「已背 N 首」+1 |
| 2.4 | 查 DevTools `recitation_sessions` | 有新记录，包含 `charCount`、`mode`、`stars` |
| 2.5 | 查 DevTools `srs_schedules` | 有对应条目，`nextDue` 为未来日期 |
| 2.6 | 背诵后待复习列表 | 该诗出现在「待复习」tab，显示正确的下次复习日 |

### 3. 复习流程

| # | 操作 | 预期结果 |
|---|------|----------|
| 3.1 | DevTools 手动将 `srs_schedules` 某条的 `nextDue` 改为今天，刷新 | 首页「今日复习」出现该诗 |
| 3.2 | 完成复习 | `srs_schedules` 该条 `nextDue` 更新为未来日期 |
| 3.3 | 查热力图详情 | 复习后该诗**只**出现在「复习」区，不在「背诵」区 |
| 3.4 | 当天既背又复习同一首诗 | 只出现在「背诵」区 |

### 4. 热力图详情

| # | 操作 | 预期结果 |
|---|------|----------|
| 4.1 | 点击有记录的日期格子 | 弹出 BottomSheet |
| 4.2 | BottomSheet「背诵」区 | 显示当天背的诗，有星级 |
| 4.3 | BottomSheet「复习」区 | 显示当天复习的诗，与背诵区不重叠 |

### 5. 勋章

| # | 操作 | 预期结果 |
|---|------|----------|
| 5.1 | 打开勋章页 | 迁移前已解锁的勋章仍显示为已解锁 |
| 5.2 | 背完第 1 首（若未解锁） | 「初入诗门」自动解锁 |
| 5.3 | 查 DevTools `achievement_events` | 新增条目，格式为 `{id, unlockedAt}` |

### 6. 周报

| # | 操作 | 预期结果 |
|---|------|----------|
| 6.1 | 进度页周报 | 本周背诵首数、打卡天数、汉字数不为零（场景 B） |
| 6.2 | 周报「最难的诗」 | 有数据时正常展示 |

### 7. 里程碑分享

| # | 操作 | 预期结果 |
|---|------|----------|
| 7.1 | 背完第 5/15/30 首时 | 弹出里程碑分享卡（非满星时触发） |

---

## 二、DataProvider 整合回归

### 8. 全局数据一致性

| # | 操作 | 预期结果 |
|---|------|----------|
| 8.1 | 背诵结束，不刷新页面，直接返回首页 | 首页数据实时更新（连续天数、已背首数） |
| 8.2 | 复习结束，不刷新页面，直接返回首页 | 待复习列表实时更新（该诗 `due` 变更） |
| 8.3 | 在队列页添加一首诗，返回首页 | 首页「今日新诗」立即反映新队列 |

### 9. 队列管理

| # | 操作 | 预期结果 |
|---|------|----------|
| 9.1 | 队列页添加/移除诗 | 首页「背诗计划」tab 实时同步 |
| 9.2 | 队列页拖拽排序 | 顺序持久化，刷新后不变 |
| 9.3 | 背完队列第一首 | 该诗从队列移除，`today_complete = true` |

### 10. 连续天数

| # | 操作 | 预期结果 |
|---|------|----------|
| 10.1 | 首页连续天数 chip | 与进度页、分享卡数值一致 |
| 10.2 | 连续天数计算来源 | 从 `recitation_sessions` distinct date 计算，非旧 `srs_streak_v2` |

### 11. 热力图（DataProvider 版）

| # | 操作 | 预期结果 |
|---|------|----------|
| 11.1 | 背诵后不刷新，进入进度页查看热力图 | 当天格子已变红（数据来自 context，无需重新读 IDB） |
| 11.2 | 切换月份 | 热力图正确渲染历史数据 |

### 12. 各页面独立验证

| 页面/组件 | 验证点 |
|----------|--------|
| `Home` | 连续天数、队列、今日复习列表正常 |
| `QueueScreen` | 添加/移除/排序正常 |
| `ProfilePage` | 连续天数、已背首数正常 |
| `AchievementsPage` | 勋章状态、连续天数正常 |
| `ShareCardModal` | 连续天数、已背首数正常 |
| `ProfileSheet` | 连续天数、已背首数正常 |
| `Onboarding` | 选诗加入队列正常 |

---

## DevTools 快速检查命令

在浏览器 Console 执行：

```js
// 查看所有关键 key
;['recitation_sessions','srs_schedules','poem_queue','achievement_events','user_profile','data_migration_v2']
  .forEach(k => console.log(k, localStorage.getItem(k)?.slice(0,100)))

// 查看 sessions 数量
JSON.parse(localStorage.getItem('recitation_sessions') || '[]').length

// 查看 srs_schedules 条目数
Object.keys(JSON.parse(localStorage.getItem('srs_schedules') || '{}')).length

// 强制重跑迁移（调试用）
localStorage.removeItem('data_migration_v2')
location.reload()
```
