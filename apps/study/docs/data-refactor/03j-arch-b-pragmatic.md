# 架构师 B 方案：务实缓存派

> 立场：原始记录是基础，但 SM-2 调度状态必须缓存，关键聚合数据按需缓存。  
> 理由：SM-2 是有副作用的算法，"重算"在语义上是错误的，不只是性能问题。

---

## 1. 核心理念

**区分两类数据：事实（Fact）和状态（State）。**

- 事实：已发生的事件，append-only，永不修改
- 状态：由事实推导出的当前决策依据，需要显式维护

SM-2 的 ef/interval 是**状态**，不是可以随时重算的统计数字。原因如下：

1. **SM-2 是路径依赖的**：同样的 qScore 序列，因为每次计算的 `interval` 影响下一次的 `nextDue`，进而影响用户实际何时复习，进而影响下一次的 `qScore`。历史 review_sessions 只记录了 qScore，没有记录"这次复习距上次间隔了多少天"。
2. **重算会改变语义**：如果用户在 nextDue 前提前复习了，SM-2 应该用实际间隔还是理论间隔计算？现有代码用实际时间差，重算时这个信息丢失了。
3. **迁移时历史 review_sessions 本就不完整**：架构师 A 自己也承认，旧数据迁移只能生成"虚拟记录"，这意味着重算的 SM-2 状态是错的。

**结论：SM-2 调度状态（ef、interval、nextDue）必须作为显式状态存储，不能依赖重算。**

---

## 2. 表结构设计

### 2.1 recitation_sessions（背诵原始记录，与 A 方案相同）

```ts
interface RecitationSession {
  id: string
  poemId: number
  mode: 'parent' | 'child'
  date: string         // YYYY-MM-DD
  timestamp: number
  charCount: number    // 必须在写入时记录
  stars: number        // 1 | 2 | 3
  hintCount: number
  passRate: number
  qScore: number
  lines: LineResult[]
}
```

### 2.2 review_sessions（复习原始记录，与 A 方案相同）

```ts
interface ReviewSession {
  id: string
  poemId: number
  date: string
  timestamp: number
  passed: boolean
  qScore: number
  // 新增：记录本次复习时的 SM-2 上下文，避免"重算语义丢失"
  intervalUsed: number   // 本次实际使用的 interval（天）
  efBefore: number       // 复习前 ef 值（快照）
}
```

**关键区别**：在 review_session 里额外存 `intervalUsed` 和 `efBefore`，这样即使将来"重算"，语义也是完整的。

### 2.3 srs_schedules（SM-2 调度状态，核心缓存表）

```ts
interface SrsSchedule {
  poemId: number
  ef: number           // 当前易度系数
  interval: number     // 当前间隔（天）
  repetitions: number  // 连续通过次数
  nextDue: string      // 下次复习日期 YYYY-MM-DD
  lastReviewDate: string
  totalReviews: number
  firstLearnedDate: string  // 第一次背诵的日期
}
```

存储为 `Record<number, SrsSchedule>`，每首诗一条，每次复习后 update in place。

**这是唯一的聚合缓存**，其他统计数据一律实时计算。

### 2.4 poem_queue（保留，精简）

```ts
interface QueueStore {
  queue: number[]
  last_complete_date: string
  today_complete: boolean
  // 删除 streak_count
}
```

### 2.5 user_profile（合并现有零散配置 key）

```ts
interface UserProfile {
  nickname: string
  reminderTime?: string
  createdAt: string
  onboardingDone?: boolean
}
```

### 2.6 poem_achievement_dates（保留，理由同 A 方案）

---

## 3. 废弃的表

| 废弃 Key | 原因 |
|---------|------|
| `poem_progress` | 从 recitation_sessions 实时计算 |
| `poem_review_cards` | 有 bug，合并到 review_sessions + srs_schedules |
| `poem_memorize_history` | 是 recitation_sessions 的截断子集 |
| `poem_total_chars` | 从 recitation_sessions.charCount 求和 |
| `poem_streak` | 废弃，实时计算 |
| `srs_streak_v2` | 废弃，实时计算 |
| `poem_queue.streak_count` | 废弃，实时计算 |
| `review_schedules` | 重命名/迁移为 `srs_schedules`，结构微调 |

---

## 4. SM-2 状态管理

### 4.1 写入时机

```
背诵完成 → 写 recitation_session
         → 写第一条 review_session（poemId, qScore, intervalUsed=0, efBefore=2.5）
         → 创建 srs_schedules[poemId]（初始状态 + 本次 qScore 计算后的状态）

复习完成 → 写 review_session（含 intervalUsed, efBefore 快照）
         → 更新 srs_schedules[poemId]（新 ef, interval, nextDue）
```

### 4.2 为什么不重算而是直接更新

核心原因：**SM-2 涉及"实际间隔"**。

标准 SM-2 变体里，如果用户在 nextDue 之前提前复习，interval 应该打折。这个"实际复习间隔"是 `today - lastReviewDate`，不是存储的 `interval`。重算时，如果只看 review_sessions 的 date 序列，可以推算出间隔，但这依赖于"之前每一次的 nextDue"，而 nextDue 本身是 SM-2 的输出，形成循环依赖。

**保留 srs_schedules 是切断这个循环的最简单方式。**

### 4.3 srs_schedules 的一致性保证

写入时原子操作（先写 review_session，再更新 srs_schedules）：

```ts
async function saveReviewResult(poemId: number, passed: boolean) {
  const schedule = srsSchedules[poemId];
  const qScore = passed ? 4 : 2;
  const intervalUsed = daysBetween(schedule.lastReviewDate, today());

  // 1. 计算新状态
  const newState = applySM2(schedule, qScore, intervalUsed);

  // 2. 写 review_session（原始记录）
  const session: ReviewSession = {
    id: `review_${poemId}_${Date.now()}`,
    poemId, date: today(), timestamp: Date.now(),
    passed, qScore,
    intervalUsed,
    efBefore: schedule.ef,
  };
  await appendReviewSession(session);

  // 3. 更新 srs_schedules（状态缓存）
  const newSchedules = { ...srsSchedules, [poemId]: newState };
  await storage.set('srs_schedules', newSchedules);
  setSrsSchedules(newSchedules); // 更新内存
}
```

IndexedDB 不支持事务跨 key，但这两个写操作即使不原子也可以接受：
- 如果 review_session 写入但 srs_schedules 未更新 → 下次启动时可以从 review_sessions 最后一条重建 srs_schedules（fallback）
- 如果 srs_schedules 写入但 review_session 未写入 → 日志丢失，但调度不受影响

---

## 5. 统计数据实时计算

除 srs_schedules 外，全部实时计算，与 A 方案一致：

### 5.1 Streak（三套统一）

```ts
function computeStreak(sessions: RecitationSession[]): number {
  const dates = new Set(sessions.map(s => s.date));
  let count = 0;
  let d = todayString();
  while (dates.has(d)) { count++; d = subtractDay(d); }
  return count;
}
```

### 5.2 已背诵首数 / 累计字数

```ts
const totalMemorized = new Set(recitationSessions.map(s => s.poemId)).size;
const totalChars = /* 每首诗首次背诵的 charCount 之和 */;
```

### 5.3 bestStars / memorized 状态

```ts
function getPoemState(poemId: number, sessions: RecitationSession[]) {
  const ps = sessions.filter(s => s.poemId === poemId);
  return {
    memorized: ps.length > 0,
    bestStars: Math.max(0, ...ps.map(s => s.stars)),
    sessionCount: ps.length,
  };
}
```

### 5.4 今日待复习

```ts
function getTodayDue(schedules: Record<number, SrsSchedule>): number[] {
  return Object.values(schedules)
    .filter(s => s.nextDue <= todayString())
    .map(s => s.poemId);
}
```

直接查 srs_schedules，O(n) 遍历，极快。

---

## 6. 性能分析

| 操作 | A 方案（重算） | B 方案（缓存） |
|------|------------|------------|
| 启动加载 | 两张表全量 | 两张表 + srs_schedules |
| 今日待复习 | 遍历 review_sessions + 200次 SM-2 迭代 | 直接查 srs_schedules，O(n) |
| 背诵/复习写入 | append only | append + update srs_schedules |
| SM-2 语义准确性 | 有损（丢失 intervalUsed） | 完整 |

数据量级上两者差异不大，但 B 方案在语义上更正确。

---

## 7. 数据迁移

```ts
async function migrateToV3() {
  if (await storage.get('data_migration_v3') === 'done') return;

  // 1. 补充 recitation_sessions 的 charCount
  // （与 A 方案相同）

  // 2. 迁移 review_schedules → srs_schedules
  // 直接重命名，结构基本兼容，补充 firstLearnedDate
  const old = await storage.get<Record<number, ReviewSchedule>>('review_schedules') ?? {};
  const sessions = await storage.get<RecitationSession[]>('recitation_sessions') ?? [];
  const firstLearned: Record<number, string> = {};
  for (const s of sessions.sort((a, b) => a.timestamp - b.timestamp)) {
    if (!firstLearned[s.poemId]) firstLearned[s.poemId] = s.date;
  }
  const newSchedules: Record<number, SrsSchedule> = {};
  for (const [id, s] of Object.entries(old)) {
    newSchedules[Number(id)] = {
      ...s,
      poemId: Number(id),
      firstLearnedDate: firstLearned[Number(id)] ?? s.lastReviewDate,
    };
  }
  await storage.set('srs_schedules', newSchedules);

  // 3. review_sessions 从零开始（旧数据无法还原，接受这个事实）
  await storage.set('review_sessions', []);

  // 4. 合并 user_profile、标记完成
  // （与 A 方案相同）

  await storage.set('data_migration_v3', 'done');
}
```

**迁移优势**：srs_schedules 直接从现有 review_schedules 迁移，用户的复习进度（ef/interval）完整保留，不会出现"所有诗重置为第一天"的问题。

---

## 8. 方案优缺点

### 优点

1. **SM-2 语义完整**：ef/interval 是精确值，不是近似重算
2. **今日待复习查询极快**：O(n) 直查 srs_schedules，不需要遍历 review_sessions
3. **迁移友好**：现有 review_schedules 数据直接用，用户复习进度不丢失
4. **实现直觉**：开发者容易理解"update schedule after review"这个心智模型

### 缺点

1. **两处写入**：每次复习需要写 review_session + 更新 srs_schedules，需要保持一致性
2. **多一张表**：比 A 方案多 srs_schedules
3. **srs_schedules 是冗余数据**：理论上可从 review_sessions 推算（但有语义损失）

---

## 9. 对架构师 A 的回应

**关于 SM-2 重算的问题：**

A 方案的 `computeSM2State` 函数只用 `qScore` 序列重算，忽略了"实际复习间隔"。SM-2 的 ef 更新公式本身不依赖 interval，这部分 A 是对的。但 interval 的计算（`Math.round(interval * ef)`）是路径依赖的，如果中间某次复习是提前进行的，interval 的分叉点就会不同。

**解决方案**：在 review_sessions 里存 `intervalUsed`，就可以做到完整重算。这其实是两方案的共同点，只是 B 方案额外保留了 srs_schedules 作为当前状态的缓存，减少每次"今日待复习"查询的计算量。

---

## 10. 给架构师 A/C 的问题

1. **interval 路径依赖**：你的 `computeSM2State` 用 `state.interval * ef` 推算下一个 interval，但如果用户提前复习过（实际间隔 < scheduled interval），这个路径就分叉了。你的方案怎么处理这个问题？
2. **首次加载延迟**：启动时全量加载两张表，如果用户有 5000 条 review_sessions，`getTodayDue` 需要对每首诗做 20 次 SM-2 迭代。虽然 < 10ms，但这是在主线程上，会不会影响首屏渲染？
3. **streak 的"今天"定义**：背诵从 recitation_sessions 算 streak，但如果用户今天只复习没背诵新诗，streak 算不算？A 方案只看 recitation_sessions，这会导致"复习天"不被计入 streak，用户体验可能不好。
