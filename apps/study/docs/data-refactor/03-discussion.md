# 架构讨论：极简派 vs 务实缓存派

> 参与者：架构师 A（极简原始记录派）、架构师 B（务实缓存派）  
> 讨论目标：为古诗背诵 PWA 确定本地数据架构方案

---

## 第一轮：核心分歧

### A → B：SM-2 重算完全可行

B 担心重算会丢失"实际复习间隔"语义。但这个问题有简单的解法：

**在 review_sessions 里存 `intervalUsed`**：

```ts
interface ReviewSession {
  ...
  intervalUsed: number   // 本次实际间隔（天）
  efBefore: number       // 复习前 ef 快照
}
```

加了这两个字段，review_sessions 就是完整的 SM-2 执行日志，可以无损重建任意时间点的状态。这样 srs_schedules 就真的是纯冗余缓存，而不是必要存储。

**结论：A 和 B 在 review_sessions 的字段设计上已经收敛**，分歧只剩"要不要额外存 srs_schedules"。

---

### B → A：srs_schedules 不是冗余，是"当前决策依据"

A 把 srs_schedules 定性为"冗余缓存"，但这个定性有问题。

srs_schedules 存的不只是"历史数据的聚合"，它是**当前调度决策的权威来源**：
- 今日待复习列表：直接查 `nextDue <= today`，O(n)
- 某首诗下次复习时间：直接读，无需计算

如果废弃 srs_schedules，每次打开 App 都要对所有学过的诗重算 SM-2 状态。对于 200 首诗、每首 20 条复习记录，是 4000 次迭代，虽然 < 10ms，但这是**每次 App 启动都要做的事**，而且随着学习量增长线性增加。

**A 的回应**：这 4000 次迭代在现代手机上 < 2ms，并且可以用 Web Worker 完全移出主线程，首屏渲染不受影响。而且 useMemo 保证只在数据变化时重算，不是每次渲染都算。

**B 的反驳**：Web Worker 引入了异步复杂性。App 启动后，今日待复习列表需要等 Worker 算完才能显示，这中间有一个"空白期"，体验不如直接读 srs_schedules。

---

### 新分歧出现：Streak 的定义

B 提出了一个 A 方案没有回答的问题：

**如果用户今天只复习没背新诗，streak 算不算？**

A 方案只从 recitation_sessions 算 streak，意味着"只复习"的天不计入，streak 会断。这对重度用户（保持复习习惯的老用户）不友好。

**A 的修正**：streak 应该同时考虑 recitation_sessions 和 review_sessions：

```ts
function computeStreak(
  recitations: RecitationSession[],
  reviews: ReviewSession[]
): number {
  const dates = new Set([
    ...recitations.map(s => s.date),
    ...reviews.map(s => s.date),
  ]);
  let count = 0;
  let d = todayString();
  while (dates.has(d)) { count++; d = subtractDay(d); }
  return count;
}
```

**B 同意**：这样定义更合理，"学习天"= 背诵或复习任意一项发生。

---

## 第二轮：收敛

### 两方均同意的部分

1. **recitation_sessions**：保留，补 charCount 字段，append-only
2. **review_sessions**：新增，补 intervalUsed + efBefore 字段，append-only
3. **废弃**：poem_progress、poem_review_cards、poem_memorize_history、poem_total_chars、三套 streak 全部废弃
4. **streak 定义**：recitation + review 的 union dates，统一一套实时计算
5. **poem_queue**：保留，去掉 streak_count
6. **user_profile**：合并现有零散 key
7. **poem_achievement_dates**：保留（一次性事件，不是派生数据）

### 唯一剩余分歧：要不要保留 srs_schedules

| | A 方案 | B 方案 |
|--|-------|-------|
| SM-2 状态 | 从 review_sessions 重算 | 显式存 srs_schedules |
| 今日待复习查询 | 遍历重算，Web Worker | 直查，同步返回 |
| 数据迁移 | review_sessions 从零开始，SM-2 近似 | 直接迁移 review_schedules，SM-2 精确保留 |
| 表数量 | 2 张核心表 | 2 张核心表 + 1 张调度表 |
| 一致性风险 | 无（单一来源） | 低（两处写入，可 fallback） |

---

## 第三轮：迁移风险决策

这是最终拍板的关键点。

### A 方案的迁移问题

旧数据里没有 review_sessions（只有 review_schedules 的"当前状态"快照），迁移时只能：
1. 为每首有 review_schedules 的诗生成 1 条虚拟 review_session
2. SM-2 状态从这条虚拟记录重新计算，ef/interval 与旧值可能不同
3. **结果**：部分用户的复习间隔会被重置（从 30 天 → 6 天之类）

这对坚持学习了几个月的用户是**明显的退步体验**。

### B 方案的迁移优势

srs_schedules 直接从 review_schedules 迁移，ef/interval/nextDue 全部保留，用户感知不到迁移发生。这是 B 方案最强的论据。

### A 的补救方案

迁移时，从旧的 review_schedules 读出 ef/interval，构造一条"带状态快照"的虚拟 review_session：

```ts
// 虚拟记录：包含足够信息让重算结果与旧值一致
const virtualSession: ReviewSession = {
  id: `migrated_${poemId}`,
  poemId,
  date: schedule.lastReviewDate,
  timestamp: ...,
  passed: true,
  qScore: 4,
  intervalUsed: schedule.interval,  // 关键：注入旧 interval
  efBefore: schedule.ef,            // 关键：注入旧 ef
};
```

但这样做，重算结果还是无法精确还原旧状态（因为旧状态的 repetitions 字段也影响 interval 的计算分支）。

**B 的判断**：这是在用复杂的 hack 去模拟一个可以直接保留的字段，不值得。

---

## 结论

### 推荐方案：B 方案（务实缓存派）为基础，采纳 A 方案的部分改进

**最终表结构：**

| 表名 | 类型 | 说明 |
|------|------|------|
| `recitation_sessions` | 原始记录 | 背诵事实，append-only |
| `review_sessions` | 原始记录 | 复习事实，append-only，含 intervalUsed/efBefore |
| `srs_schedules` | 状态缓存 | SM-2 当前状态，每首诗一条，每次复习后更新 |
| `poem_queue` | 用户配置 | 手动背诵计划，保留，去掉 streak_count |
| `user_profile` | 用户配置 | 合并 poem_nickname / reminder_time |
| `poem_achievement_dates` | 事件记录 | 成就解锁时间，保留 |

**采纳 A 方案的改进：**
- review_sessions 补充 `intervalUsed` + `efBefore` 字段（使重算在技术上可行）
- Streak 定义统一为 recitation + review union dates
- 所有非 SM-2 的统计数据一律实时计算（不保留 poem_progress、poem_total_chars 等）

**选择 B 而非 A 的决定性原因：**
1. 迁移时用户复习进度（ef/interval）可以完整保留
2. srs_schedules 写入逻辑简单（每次复习 update in place），无需 Worker
3. review_sessions 有 intervalUsed 字段后，srs_schedules 仍然可以从记录校验/重建，保留了 A 方案的"可审计性"

---

## 仍然存在的疑问点

> 这些问题需要产品/开发侧进一步确认，影响具体实现细节。

### 疑问 1：Streak 的"今天"如何处理跨夜边界？

当前 streak 计算用本地 `YYYY-MM-DD` 日期。如果用户凌晨 1 点背诗，算昨天还是今天？
- 用系统本地时间：凌晨 1 点算今天，可能导致 streak 与用户"睡眠周期"不符
- 用"自然学习日"（如以凌晨 4 点为分界）：更符合用户感知，但实现复杂

**当前建议**：沿用系统本地时间，这是用户最容易理解的规则。但需要确认现有代码里是否已经有凌晨边界处理。

### 疑问 2：poem_queue 的 streak 废弃后，成就系统是否受影响？

useAchievements 目前读 `poem_queue.streak_count` 作为 streak 来源之一（AchievementsPage 和 ProfilePage 都用了 useQueue 的 streakCount）。废弃后，成就的"连续天数"阈值触发逻辑需要对齐到新的统一 streak 计算函数。

**需要确认**：成就中"连续 7 天"等阈值，是按"背诵天"还是"学习天（背诵+复习）"？两者定义不同，迁移后用户已解锁的成就是否可能因定义变化而"降级"？

### 疑问 3：srs_schedules 写入失败的 fallback 策略是否需要实现？

B 方案中 review_session 和 srs_schedules 是两次独立写入，不是原子操作。理论上可能出现"review_session 写入成功，srs_schedules 更新失败"的情况（IndexedDB 写错误、存储空间满等）。

**建议的 fallback**：App 启动时校验：如果 srs_schedules[poemId] 的 lastReviewDate 早于 review_sessions 中该诗的最后一条记录的 date，则触发一次重算修复。

**需要确认**：这个 fallback 是否值得实现？还是接受"极低概率的状态不一致"，靠用户重新复习自然修复？

### 疑问 4：review_sessions 的 intervalUsed 在首次背诵时如何填写？

背诵完成后写的第一条 review_session（"视为第一次复习"），此时没有上一次复习，`intervalUsed` 应该填什么？
- 填 0：表示"首次学习，无间隔"
- 填 1：表示"学习后第一天即复习"

这个值会影响 SM-2 初始 interval 的计算路径。**建议填 0**，在 `applySM2` 函数里把 `intervalUsed === 0` 作为"首次学习"特殊处理（直接套 repetitions=0 分支，不做 interval 折扣）。

### 疑问 5：charCount 字段的来源

recitation_sessions 新增的 charCount 需要在写入时从诗歌数据库查询。需要确认：
- 诗歌数据是静态 JSON 还是 IndexedDB？如果是异步 IDB，写入 session 时需要先 await charCount
- charCount 的定义：只算汉字？还是包含标点？统计"总字数"时用户期望看到哪个数字？

### 疑问 6：poem_achievement_shown / poem_checkin 等废弃 key 的处理

research.md 指出这些 key 在 MIGRATE_KEYS 中存在但找不到读写代码，疑似废弃。

**需要确认**：这些 key 是否可以在迁移时直接丢弃？还是有某些老版本用户依赖这些数据？如果直接丢弃，是否需要在迁移说明中注明（用于 changelog 或客服）？

---

## 实施优先级建议

基于以上结论，建议的实施顺序：

1. **定义类型**（`src/types/storage.ts`）：RecitationSession（加 charCount）、ReviewSession（加 intervalUsed/efBefore）、SrsSchedule、UserProfile
2. **迁移脚本**（`src/lib/migration.ts`）：review_schedules → srs_schedules，补 recitation charCount，合并 user_profile
3. **拆分写入逻辑**（`src/pages/PoemDetail.tsx`）：handleReciteDone 不再调 markReviewed
4. **新增 saveReviewResult**（`src/hooks/useRecitation.ts`）：写 review_session + 更新 srs_schedules
5. **重构 ProgressContext**（`src/contexts/ProgressContext.tsx`）：废弃 poem_progress/poem_review_cards/streak/totalChars，改为从 sessions 实时计算
6. **统一 streak 函数**（`src/lib/stats.ts`）：新建，所有消费方改用
7. **修复 HeatmapChart**（`src/components/HeatmapChart.tsx`）：复习列表改读 review_sessions
8. **清理废弃 key**（下一个版本）

---

*讨论文件生成时间：2026-10-20*  
*相关文件：arch-a-minimal.md、arch-b-pragmatic.md、research.md*
