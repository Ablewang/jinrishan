# 数据架构调研报告

## 1. 当前所有 Storage Key 清单

### 核心业务数据

| Key | 数据结构 | 读取位置 | 写入位置 | 问题 |
|-----|---------|---------|---------|------|
| `recitation_sessions` | `RecitationSession[]` | useRecitation.ts:41, progressStats.ts, weeklyReport.ts:44, dailyPlan.ts:20, HeatmapChart.tsx:68 | useRecitation.ts:48 | 结构基本合理，缺 `charCount` 字段 |
| `review_schedules` | `Record<number, ReviewSchedule>` | useRecitation.ts:66, dailyPlan.ts:8, progressStats.ts, migration.ts | useRecitation.ts:72, migration.ts:53 | 仅存当前调度状态，无复习历史 |
| `poem_progress` | `Record<string, PoemState>` | ProgressContext.tsx:46, weeklyReport.ts:66 | ProgressContext.tsx:48 | 聚合状态，与 sessions 冗余；memorized/bestStars 均可从 sessions 计算 |
| `poem_review_cards` | `ReviewCard[]` | ProgressContext.tsx:66, migration.ts:35, HeatmapChart.tsx:71 | ProgressContext.tsx:68 | 与 review_schedules 功能重叠；lastDate 被 markMemorized 误写导致背诵/复习混淆 |
| `poem_memorize_history` | `MemorizeRecord[]` (last 20) | weeklyReport.ts:47, PoemDetail.tsx:223, 255 | ProgressContext.tsx:63 | 仅保留最近20条，且与 recitation_sessions 数据重叠 |
| `poem_total_chars` | `number` (string存储) | weeklyReport.ts:63, ProgressContext.tsx:56 | ProgressContext.tsx:58 | 与 sessions 冗余；charCount 字段目前 sessions 未记录 |
| `poem_streak` | `{lastDate, count}` | migration.ts:68, weeklyReport.ts:54 | ProgressContext.tsx:53 | 被 srs_streak_v2 替代，但 weeklyReport 仍做兜底读取 |
| `srs_streak_v2` | `{lastActivityDate, count}` | useRecitation.ts:18, weeklyReport.ts:54 | useRecitation.ts:35 | 与 poem_streak 功能重叠，存在双写 |

### 用户配置数据

| Key | 数据结构 | 读取位置 | 写入位置 |
|-----|---------|---------|---------|
| `poem_queue` | `QueueStore {queue, streak_count, last_complete_date, today_complete}` | useQueue.ts:24 | useQueue.ts:34 |
| `poem_nickname` | `string` | ProfilePage.tsx:14 | ProfilePage.tsx:17 |
| `reminder_time` | `string` (HH:MM) | ProfilePage.tsx:20 | ProfilePage.tsx:23 |
| `poem_onboarding_done` | `'1'` | (未找到读取，仅写入) | PoemDetail.tsx:267 |
| `poem_onboarding_step` | unknown | (未找到读写，仅在 MIGRATE_KEYS 中) | - |

### 成就与状态数据

| Key | 数据结构 | 读取位置 | 写入位置 |
|-----|---------|---------|---------|
| `poem_achievement_dates` | `Record<string, string>` (id→ISO时间) | useAchievements.ts:83 | useAchievements.ts:40 |
| `poem_achievement_shown` | unknown | (仅在 MIGRATE_KEYS) | - |
| `poem_milestone_triggered` | `number[]` | PoemDetail.tsx:37 | PoemDetail.tsx:39 |
| `poem_last_report_week` | `string` (YYYY-MM-DD) | weeklyReport.ts:124 | weeklyReport.ts:128 |
| `poem_checkin` | unknown | (仅在 MIGRATE_KEYS) | - |

### 迁移标记

| Key | 含义 |
|-----|------|
| `srs_migration_done_v1` | System B→A 已迁移 |
| `streak_migrated_v1` | streak 已迁移到 v2 |

---

## 2. Context / Hook 数据流

### ProgressContext（src/contexts/ProgressContext.tsx）

**对外暴露字段：**
```ts
progress: Record<string, PoemState>     // 背诵状态聚合
streak: StreakData                       // 连续天数（poem_streak，已过时）
totalChars: number                       // 累计字数
memorizeHistory: MemorizeRecord[]        // 最近20条背诵记录
reviewCards: ReviewCard[]                // 复习卡片（poem_review_cards）
initialized: boolean
getState(id)
markRead(id)
markMemorized(id, stars, charCount, noHintPass)
markReviewed(id, passed)
totalMemorized: number                   // 从 progress 实时计算
totalPerfect: number
todayDueReviews: ReviewCard[]            // 从 reviewCards 实时计算
todayDueFromA: null                      // USE_SYSTEM_A=false，恒为 null
masteredCount: number
reviewingCount: number
todayRecord: MemorizeRecord | null
```

**消费者（全局使用）：**
- `Home.tsx`：`todayDueReviews, reviewCards, totalMemorized, progress`
- `PoemDetail.tsx`：`markRead, markMemorized, markReviewed, reviewCards, progress`
- `ProgressPage.tsx`：`progress, streak, totalChars, memorizeHistory, totalMemorized, reviewCards, masteredCount, reviewingCount`
- `AchievementsPage.tsx`：`progress, streak, totalChars, memorizeHistory, totalMemorized`
- `ProfilePage.tsx`：`totalMemorized, totalChars`

### useRecitation（src/hooks/useRecitation.ts）

**读写：**
- 读/写 `recitation_sessions`：每次背诵追加一条
- 读/写 `review_schedules`：SM-2 调度表，每次背诵后更新
- 读/写 `srs_streak_v2`：每次背诵后更新

**对外暴露：**
- `saveResult(poemId, mode, lines, date)` → 写 sessions + schedules + streak，返回 `RecitationSession`
- `getSchedule(poemId)` → 读 schedules
- `getTodayList(today)` → 读 schedules，返回到期列表
- `getPoemSessions(poemId)` → 读 sessions，按 poemId 过滤
- `srsStreak` → 当前连续天数

**消费者：**
- `Home.tsx`：`srsStreak`
- `PoemDetail.tsx`：`saveResult, getSchedule`

### useQueue（src/hooks/useQueue.ts）

读写 `poem_queue`，管理手动背诵计划列表和今日完成状态。包含自己的 streak_count（与 srs_streak_v2 重叠）。

### useAchievements（src/hooks/useAchievements.ts）

从 `ProgressContext` 的 `progress, streak` 计算成就解锁状态，读写 `poem_achievement_dates`。

**问题：** streak 数据来自 `poem_streak`（ProgressContext），而实际活跃 streak 在 `srs_streak_v2`（useRecitation），两套 streak 定义不同，成就的连续天数计算可能不准。

---

## 3. 页面级数据依赖

### Home.tsx
- `useProgress()`：`todayDueReviews, reviewCards, totalMemorized, progress`
- `useQueue()`：`queue, todayComplete, isReturning`
- `useRecitation()`：`srsStreak`
- `buildDailyPlan()`（读 `review_schedules`, `recitation_sessions`）
- 功能：首页任务列表、复习提醒、背诗计划

### PoemDetail.tsx
- `useProgress()`：`markRead, markMemorized, markReviewed, reviewCards, progress`
- `useQueue()`：`queue, completePoem`
- `useRecitation()`：`saveResult, getSchedule`
- `storage.get('poem_memorize_history')`：直接读，用于里程碑判断
- `storage.get/set('poem_milestone_triggered')`：直接读写
- `storage.set('poem_onboarding_done')`：直接写
- 功能：背诵流程、记录结果、触发成就/里程碑

**问题：** `handleReciteDone` 同时调用 `markMemorized` 和 `markReviewed`，导致 `poem_review_cards.lastDate` 被背诵操作覆盖，无法区分背诵和复习。

### ProgressPage.tsx
- `useProgress()`：几乎全部字段
- `useAchievements()`
- `HeatmapChart`（自己读 `recitation_sessions`, `poem_review_cards`）
- `HardRanking`（读 `review_schedules`）
- `TimeSlotChart`（读 `recitation_sessions`）
- `buildWeeklyReport()`

### WeeklyReportPage.tsx
- `buildWeeklyReport()`（读 `recitation_sessions`, `poem_memorize_history`, `review_schedules`, `srs_streak_v2/poem_streak`, `poem_total_chars`, `poem_progress`）

### AchievementsPage.tsx
- `useProgress()`：`progress, streak, totalChars, memorizeHistory, totalMemorized`
- `useQueue()`：`streakCount`（来自 `poem_queue`，与 Context 的 streak 不同）

### ProfilePage.tsx
- `useProgress()`：`totalMemorized, totalChars`
- `useQueue()`：`streakCount`
- 直接读写 `poem_nickname`, `reminder_time`

---

## 4. 组件级数据依赖

### HeatmapChart（src/components/HeatmapChart.tsx）
- 自己读 `recitation_sessions`（背诵详情）
- 自己读 `poem_review_cards`（复习详情）
- 调用 `buildHeatmap(ym)`（读 `recitation_sessions`）
- **当前 bug**：复习列表误包含当天新背的诗（`lastDate` 被 markMemorized 写入）

### HardRanking（src/components/HardRanking.tsx）
- 调用 `buildHardRanking()`（读 `review_schedules`）

### TimeSlotChart（src/components/TimeSlotChart.tsx）
- 调用 `buildTimeSlots()`（读 `recitation_sessions`）

### ShareCardModal（src/components/ShareCardModal.tsx）
- 无直接 storage 读写，数据由父组件通过 props/context 传入

### storageMonitor.ts
- **Bug**：`pruneOldSessions` 直接操作 `localStorage`（未走 storage 适配层），IDB 环境下无效

---

## 5. 核心问题总结

### 数据重叠与混乱
1. **双 streak 系统**：`poem_streak`（ProgressContext）+ `srs_streak_v2`（useRecitation）+ `poem_queue.streak_count`（useQueue），三套并存，不同页面显示不同值
2. **双复习系统**：`poem_review_cards`（ProgressContext）+ `review_schedules`（useRecitation），两套调度逻辑并行，migration.ts 做了一次单向迁移
3. **poem_memorize_history 与 recitation_sessions 冗余**：前者仅存最近20条，后者存全量；weeklyReport 同时读两个
4. **poem_total_chars 与 sessions 冗余**：charCount 未记录在 sessions 中，导致只能靠聚合字段

### 写入时机错误
5. **markMemorized 同时写 reviewCards**：新建 reviewCard 时 `lastDate=today`，导致当天背诵的诗被误认为当天复习过
6. **PoemDetail.handleReciteDone 同时调用 markMemorized + markReviewed**：背诵和复习逻辑耦合在同一个操作中

### 历史数据丢失
7. **无复习历史记录**：`poem_review_cards` 只存当前状态，每次复习覆盖 lastDate，无法知道用户何时复习过某首诗
8. **memorizeHistory 仅保留20条**：长期用户历史数据被截断

### 其他问题
9. **storageMonitor.pruneOldSessions 绕过 storage 适配层**，IDB 用户无法触发清理
10. **poem_onboarding_step/poem_checkin/poem_achievement_shown** 在 MIGRATE_KEYS 中但找不到读写代码，疑似废弃

---

## 6. 新数据结构建议（修订版）

### 6.1 保留并扩展

**`recitation_sessions`**（追加只写，永不删除）
```ts
interface RecitationSession {
  id: string           // `${poemId}_${date}_${mode}_${timestamp}`
  poemId: number
  mode: 'parent' | 'child'
  date: string         // YYYY-MM-DD
  timestamp: number
  lines: LineResult[]
  stars: number        // 1|2|3
  hintRate: number
  passRate: number
  qScore: number
  charCount: number    // 新增：本次背诵的汉字数
}
```

**`review_schedules`**（每首诗一条，存 SM-2 当前状态，保持现有结构）
```ts
// 现有 ReviewSchedule 结构不变，是正确的
```

### 6.2 新增

**`review_sessions`**（追加只写，每次复习记录一条）
```ts
interface ReviewSession {
  id: string
  poemId: number
  date: string
  timestamp: number
  passed: boolean
  qScore?: number       // 复习时的质量分（如果支持）
  levelBefore: number   // 复习前的 level（从 review_schedules 取）
  levelAfter: number    // 复习后的 level
}
```

**`user_profile`**（合并 poem_nickname, avatar_gender, reminder_time）
```ts
interface UserProfile {
  nickname: string
  gender?: 'male' | 'female'
  reminderTime?: string   // HH:MM
  createdAt: string
}
```

### 6.3 废弃（迁移后只读，下个版本删除）

| 废弃 Key | 替代方案 |
|---------|---------|
| `poem_progress` | 从 `recitation_sessions` 实时计算 memorized/bestStars |
| `poem_review_cards` | 拆为 `review_sessions`（历史）+ `review_schedules`（状态）|
| `poem_memorize_history` | 从 `recitation_sessions` 实时查询 |
| `poem_total_chars` | 从 `recitation_sessions.charCount` 求和 |
| `poem_streak` | 统一使用 `srs_streak_v2`，或改为从 sessions 实时计算 |
| `poem_queue.streak_count` | 统一使用 `srs_streak_v2` |

### 6.4 统一 Streak（重要）

三套 streak 来源不同：
- `poem_streak`：仅背诵触发
- `srs_streak_v2`：仅 recitation sessions 触发（同上，但字段名不同）
- `poem_queue.streak_count`：仅完成队列任务触发

**建议**：废弃前两者，streak 改为从 `recitation_sessions` 的 distinct date 实时计算，或统一写入 `srs_streak_v2`，所有消费方改读此字段。

---

## 7. 迁移影响评估

### 高风险（接口变化最大）

| 文件 | 风险原因 |
|------|---------|
| `src/contexts/ProgressContext.tsx` | 核心枢纽，几乎所有页面依赖；废弃 poem_progress/poem_review_cards/poem_streak/poem_total_chars 后，需要从 sessions 重新计算所有导出字段 |
| `src/pages/PoemDetail.tsx` | 背诵逻辑需拆分：背诵只调 markMemorized（不再新建 reviewCard），复习只调 markReviewed（写 review_sessions）|
| `src/lib/weeklyReport.ts` | 读了6个不同 key，重构后数据来源全部变化 |

### 中风险（需要修改但接口稳定）

| 文件 | 改动内容 |
|------|---------|
| `src/hooks/useRecitation.ts` | saveResult 加写 charCount；新增 saveReviewResult |
| `src/components/HeatmapChart.tsx` | 复习详情改读 review_sessions |
| `src/hooks/useAchievements.ts` | streak 来源统一后调整 |
| `src/hooks/useQueue.ts` | 去掉内部 streak_count，改读 srs_streak_v2 |
| `src/lib/storageMonitor.ts` | pruneOldSessions 改走 storage 适配层 |

### 低风险（数据来源不变或变化小）

- `src/lib/dailyPlan.ts`：读 review_schedules，结构不变
- `src/lib/spacedRepetition.ts`：纯算法，无 storage 依赖
- `src/components/HardRanking.tsx`：读 review_schedules，结构不变
- `src/components/TimeSlotChart.tsx`：读 recitation_sessions，结构不变
- `src/pages/ProgressPage.tsx`：通过 Context 取数据，Context 接口不变则无需改动

### 可通过适配层最小化改动

ProgressContext 对外接口保持不变（同样暴露 `progress, streak, totalChars` 等），内部改为从 sessions 计算。这样 Home、AchievementsPage、ProfilePage 等消费者**零改动**。

---

## 8. 实施顺序建议（修订）

1. **`src/types/storage.ts`**（新建）：定义 `RecitationSession`（加 charCount）、`ReviewSession`、`UserProfile` interface
2. **`src/hooks/useRecitation.ts`**：saveResult 补写 charCount；新增 `saveReviewResult`
3. **`src/pages/PoemDetail.tsx`**：handleReciteDone 不再调 markReviewed；复习通过 MemorizeMode 的 onVerified 调 saveReviewResult
4. **`src/lib/migration.ts`**：新增 `migrateToV2()`，App 启动时运行，标记 `data_migration_v2='done'`
5. **`src/contexts/ProgressContext.tsx`**：内部改为从 sessions 计算，对外接口不变；废弃 poem_review_cards，review 相关改读 review_schedules
6. **`src/lib/weeklyReport.ts`**：更新数据来源
7. **`src/hooks/useAchievements.ts`**：streak 来源统一
8. **`src/hooks/useQueue.ts`**：去掉内部 streak
9. **`src/components/HeatmapChart.tsx`**：复习列表改读 review_sessions
10. **清理**：下个版本删除废弃 key 的读写代码
