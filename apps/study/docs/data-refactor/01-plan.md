# 用户数据架构重构计划（v2）

> 基于全站调研报告（research.md）修订。

---

## 核心问题

1. **三套 streak 并存**：`poem_streak`、`srs_streak_v2`、`poem_queue.streak_count`，不同页面显示不同值
2. **两套复习系统并行**：`poem_review_cards`（ProgressContext）和 `review_schedules`（useRecitation），逻辑重叠
3. **背诵和复习耦合**：`handleReciteDone` 同时调 `markMemorized + markReviewed`，导致 `lastDate` 被污染，背诵被误判为复习
4. **无复习历史**：`poem_review_cards` 只存当前状态，每次覆盖
5. **统计数据冗余**：`poem_total_chars`、`poem_memorize_history` 与 `recitation_sessions` 重叠，容易不一致
6. **storageMonitor.pruneOldSessions 绕过 IDB 适配层**，IDB 用户清理无效

---

## 目标数据结构

### 保留并扩展

**`recitation_sessions`**（追加只写，永不删除）
```ts
interface RecitationSession {
  id: string           // `${poemId}_${timestamp}`
  poemId: number
  mode: 'parent' | 'child'
  date: string         // YYYY-MM-DD
  timestamp: number
  lines: { passed: boolean; hintCount: number }[]
  stars: number        // 1|2|3
  hintRate: number
  passRate: number
  qScore: number
  charCount: number    // 新增
}
```

**`review_schedules`**（每首诗一条，SM-2 调度状态，结构不变）

### 新增

**`review_sessions`**（追加只写，每次复习记录一条）
```ts
interface ReviewSession {
  id: string
  poemId: number
  date: string         // YYYY-MM-DD
  timestamp: number
  passed: boolean
  levelBefore: number
  levelAfter: number
}
```

**`user_profile`**（合并 poem_nickname、avatar_gender、reminder_time）
```ts
interface UserProfile {
  nickname: string
  gender?: 'male' | 'female'
  reminderTime?: string  // HH:MM
  createdAt: string
}
```

### 废弃（迁移后只读，下个版本删除）

| 废弃 Key | 替代方案 |
|---------|---------|
| `poem_progress` | 从 `recitation_sessions` 实时计算 memorized/bestStars |
| `poem_review_cards` | 拆为 `review_sessions`（历史）+ `review_schedules`（状态）|
| `poem_memorize_history` | 从 `recitation_sessions` 实时查询 |
| `poem_total_chars` | 从 `recitation_sessions.charCount` 求和 |
| `poem_streak` | 从 `recitation_sessions` distinct date 实时计算 |
| `srs_streak_v2` | 同上废弃，改为实时计算 |
| `poem_queue.streak_count` | 同上 |

---

## 统计数据计算方式（不再存储）

| 统计项 | 计算来源 |
|--------|---------|
| 已背诵首数 | `recitation_sessions` distinct poemId |
| bestStars | 该诗所有 sessions 中 stars 最大值 |
| 是否已背 | poemId 在 sessions 中存在 |
| 总字数 | `recitation_sessions.charCount` 求和 |
| 连续天数 | `recitation_sessions` distinct date 排序计算连续性 |
| 热力图 | 按 date 聚合 `recitation_sessions` |
| 当天背诵详情 | `recitation_sessions` where date === selectedDate |
| 当天复习详情 | `review_sessions` where date === selectedDate |
| 待复习列表 | `review_schedules` where due <= today && level < 5 |
| 已掌握数 | `review_schedules` where level === 5 |
| 难诗排行 | `review_schedules` ef 值排序 |
| 最佳时段 | `recitation_sessions` 按 timestamp 小时聚合 |

---

## 迁移方案

### 迁移标识
`storage.get('data_migration_v2')` === `'done'` → 跳过

### 迁移逻辑（`migrateToV2()`，App 启动时执行一次）

1. 读取旧数据：`recitation_sessions`（旧）、`poem_review_cards`、`poem_progress`、`poem_total_chars`、`poem_nickname`、`reminder_time`
2. 补全 `recitation_sessions`：缺 `id` 的补 `${poemId}_${timestamp}`，缺 `charCount` 补 0，缺 `mode` 补 `'parent'`
3. 构建 `review_sessions`：旧 `poem_review_cards` 无复习历史，**此字段迁移后从零开始积累**，不伪造历史数据
4. 构建 `review_schedules`：从 `poem_review_cards` 映射（id→poemId, level, due, passCount），与现有 `review_schedules` 合并（以 `review_schedules` 为准，`poem_review_cards` 补充缺失条目）
5. 构建 `user_profile`：合并 `poem_nickname`、`reminder_time`、`avatar_gender`
6. 写入新数据，标记 `data_migration_v2 = 'done'`
7. **旧 key 保留不删除**（只读兜底），下个版本清理

---

## 改造范围与实施顺序

### Step 1：定义新类型
**文件**：`src/types/storage.ts`（新建）

定义 `RecitationSession`、`ReviewSession`、`UserProfile` interface，供全局引用。

---

### Step 2：迁移函数
**文件**：`src/lib/migration.ts`（扩展）

新增 `migrateToV2()`，`src/App.tsx` 在 StorageProvider 内、ProgressProvider 外调用。

---

### Step 3：拆分背诵和复习逻辑
**文件**：`src/hooks/useRecitation.ts`

- `saveResult()`：补写 `charCount` 字段；**不再触发 streak 写入**（streak 改为实时计算）
- 新增 `saveReviewResult(poemId, passed)`：写 `review_sessions` 一条记录，更新 `review_schedules`

**文件**：`src/pages/PoemDetail.tsx`

- `handleReciteDone`：去掉 `markReviewed` 调用，背诵只做背诵
- 复习模式结束时：调 `saveReviewResult`（而非 `markReviewed`）

---

### Step 4：改造 ProgressContext
**文件**：`src/contexts/ProgressContext.tsx`

**对外接口不变**（所有消费方零改动），内部改为从原始记录计算：

| 字段 | 现在 | 改后 |
|------|------|------|
| `progress` | 读 `poem_progress` | 从 `recitation_sessions` 构建 |
| `totalChars` | 读 `poem_total_chars` | 从 `recitation_sessions.charCount` 求和 |
| `streak` | 读 `poem_streak` | 从 `recitation_sessions` distinct date 计算 |
| `memorizeHistory` | 读 `poem_memorize_history` | 从 `recitation_sessions` 取最近20条 |
| `reviewCards` | 读 `poem_review_cards` | 从 `review_schedules` 转换（接口形状不变）|
| `markMemorized` | 写 `poem_progress` + `poem_review_cards` | 只写 `recitation_sessions`（saveResult 已处理）|
| `markReviewed` | 写 `poem_review_cards` | 调 `saveReviewResult`，写 `review_sessions` + `review_schedules` |

---

### Step 5：更新 weeklyReport
**文件**：`src/lib/weeklyReport.ts`

读取来源简化为：`recitation_sessions`、`review_schedules`。去掉对 `poem_memorize_history`、`poem_total_chars`、`poem_streak`、`poem_progress` 的读取。

---

### Step 6：统一 streak 消费方
**文件**：`src/hooks/useAchievements.ts`、`src/hooks/useQueue.ts`、`src/pages/AchievementsPage.tsx`、`src/pages/ProfilePage.tsx`

streak 改从 `ProgressContext` 的 `streak`（已改为实时计算）读取，去掉 `poem_queue.streak_count`。

---

### Step 7：修复 HeatmapChart 复习详情
**文件**：`src/components/HeatmapChart.tsx`

复习列表改读 `review_sessions` where date === selectedDate，不再用 `poem_review_cards`。

---

### Step 8：修复 storageMonitor
**文件**：`src/lib/storageMonitor.ts`

`pruneOldSessions` 改用 `storage.get/set`，走 IDB 适配层。

---

### Step 9：清理废弃代码（下个版本）

删除对以下 key 的所有读写代码，以及 `MIGRATE_KEYS` 中的废弃条目：
`poem_progress`、`poem_review_cards`、`poem_memorize_history`、`poem_total_chars`、`poem_streak`、`srs_streak_v2`、`poem_checkin`、`poem_achievement_shown`、`poem_onboarding_step`

---

## 风险评估

| 文件 | 风险 | 缓解措施 |
|------|------|---------|
| `ProgressContext.tsx` | 高：核心枢纽，全站依赖 | 对外接口不变，内部逐字段替换，每步可单独验证 |
| `PoemDetail.tsx` | 高：背诵/复习逻辑耦合 | 拆分为独立函数，复习模式单独走 saveReviewResult |
| `weeklyReport.ts` | 中：读6个 key | 改后来源更少，逻辑反而更简单 |
| `useAchievements.ts` | 中：streak 来源变化 | 实时计算值与旧值语义相同，成就解锁不受影响 |

---

## 预期收益

- 热力图详情"背诵 vs 复习"数据准确，不再混淆
- 连续天数全站统一，不再三套不同值
- 总字数、背诵首数不会因聚合字段不同步而出错
- 复习历史完整保留，未来可做趋势分析、错误率统计
- 数据结构清晰，新功能（AI分析、多设备同步）有坚实基础
