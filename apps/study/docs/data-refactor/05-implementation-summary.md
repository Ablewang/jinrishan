# 实现总结

## 重构范围

本次重构分两个阶段完成：

### 阶段一：数据架构重构（Steps 1-10）

**目标**：原始记录为唯一数据源，所有统计数据运行时计算，不存储聚合值。

| Step | 内容 | 文件 |
|------|------|------|
| 1 | 定义新类型 | `src/types/storage.ts` |
| 2 | 写迁移函数 `migrateToV2` | `src/lib/migration.ts` |
| 3+5 | 统一 SM-2 写入 + 改造 ProgressContext | `src/hooks/useRecitation.ts`、`src/contexts/ProgressContext.tsx` |
| 4 | dailyPlan 和 Home 改读 `srs_schedules` | `src/lib/dailyPlan.ts` |
| 6-9 | 周边改造（weeklyReport、useAchievements、HeatmapChart） | 多文件 |
| 10 | 清理废弃代码，删除旧 key 读写 | 多文件 |

**新数据表**：

| Key | 格式 | 说明 |
|-----|------|------|
| `recitation_sessions` | `RecitationSession[]` | 每次背诵/复习原始记录 |
| `srs_schedules` | `Record<number, SrsSchedule>` | SM-2 状态缓存，`nextDue` 替代 `nextReviewDate` |
| `poem_queue` | `QueueStore` | 背诗计划队列 |
| `achievement_events` | `{id, unlockedAt}[]` | 勋章解锁事件，替代旧 `poem_achievement_dates` |
| `user_profile` | `UserProfile` | 用户信息合并，替代散落的 `poem_nickname` 等 |

**废弃 key**（迁移后保留兼容，未来可删）：

`review_schedules`、`poem_review_cards`、`poem_memorize_history`、`poem_achievement_dates`、`poem_total_chars`、`poem_streak`、`srs_streak_v2`

### 阶段二：DataProvider 整合

**目标**：App 启动一次读完所有数据，各页面统一消费 context，不再各自读 IDB。

**改动**：
- `ProgressContext` 扩展为全局 DataProvider，纳入 `useQueue` 和 `useRecitation` 的全部逻辑
- 废弃 `useQueue`、`useRecitation` 两个 hook（文件保留，但消费方已全部改用 `useProgress`）
- `HeatmapChart` 改为从 context 读 `sessions` 和 `srsSchedules`，不再自己读 IDB
- 连续天数统一从 `recitation_sessions` distinct date 计算，删除 `srs_streak_v2` 独立 key

**context 暴露的数据**：

```ts
// 派生数据（useMemo）
progress, streak, totalChars, memorizeHistory, reviewCards,
totalMemorized, totalPerfect, todayDueReviews, masteredCount,
reviewingCount, todayRecord, streakCount

// 原始数据（供组件直接消费）
sessions, srsSchedules

// queue 状态
queue, todayComplete, isReturning

// actions
saveSession, getSchedule, getPoemSessions,
addToQueue, removeFromQueue, reorderQueue, completePoem, isInQueue,
markRead, markMemorized, markReviewed, getState
```

## 迁移策略

`migrateToV2` 在 App 启动时自动运行一次（由 `data_migration_v2` flag 控制）：

1. 补全 `recitation_sessions` 缺失字段（`charCount=0`、`mode='memorize'`）
2. `review_schedules.nextReviewDate` → `srs_schedules.nextDue`
3. `poem_achievement_dates`（Record）→ `achievement_events`（数组）
4. 散落用户信息 → `user_profile`

## 注意事项

- 旧 key 未删除，迁移函数读完后原地保留，待后续清理步骤统一删除
- `markMemorized` / `markReviewed` 现在只做 context 内存刷新，实际写 IDB 由 `saveSession` 完成
- `getPoemSessions` 已改为同步方法（直接读 context 内存），不再异步读 IDB
