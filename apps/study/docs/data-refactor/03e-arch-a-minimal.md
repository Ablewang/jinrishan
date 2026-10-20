# 架构师 A 方案：极简原始记录派

> 立场：只保留两张原始记录表，所有统计全部实时计算，SM-2 状态从记录重算，不缓存任何聚合数据。

---

## 1. 核心理念

**数据只有一种形态：原始事实（Fact）。**

背诵发生了 → 写一条 `recitation_sessions`。  
复习发生了 → 写一条 `review_sessions`。  
没有第三张表存"结果"。所有你在 UI 上看到的数字，都是查询时现算。

这不是激进的设计，这是数据库设计的基本原则：**事实表（Fact Table）+ 实时聚合**，消除一切派生数据的冗余存储。

---

## 2. 表结构设计

### 2.1 recitation_sessions（背诵原始记录）

```ts
interface RecitationSession {
  id: string           // `${poemId}_${date}_${timestamp}`，全局唯一
  poemId: number
  mode: 'parent' | 'child'
  date: string         // YYYY-MM-DD，本地日期
  timestamp: number    // Unix ms，精确排序用
  charCount: number    // 本次背诵的汉字数（从诗歌数据取）
  stars: number        // 1 | 2 | 3
  hintCount: number    // 提示次数
  passRate: number     // 通过句子比例 0~1
  qScore: number       // SM-2 质量分 0~5
  lines: LineResult[]  // 每句结果，用于详细分析
}

interface LineResult {
  lineIndex: number
  passed: boolean
  hintUsed: boolean
}
```

**设计说明：**
- `charCount` 必须在写入时记录，不能事后推算（诗歌数据可能变化）
- `qScore` 直接存，避免重复计算
- `lines` 保留完整句级数据，支持未来"哪句最难"分析

### 2.2 review_sessions（复习原始记录）

```ts
interface ReviewSession {
  id: string           // `review_${poemId}_${timestamp}`
  poemId: number
  date: string         // YYYY-MM-DD
  timestamp: number
  passed: boolean      // 用户是否通过复习
  qScore: number       // SM-2 质量分 0~5（passed ? 4 : 2 作为默认）
}
```

**设计说明：**
- 刻意保持极简，不存 levelBefore/levelAfter（可从历史记录序列推算）
- 未来可扩展字段，但不能删字段（append-only 语义）

### 2.3 poem_queue（用户配置，保留）

```ts
interface QueueStore {
  queue: number[]           // poemId 列表，用户手动排的顺序
  last_complete_date: string // YYYY-MM-DD，上次完成日期
  today_complete: boolean    // 今天是否完成
  // 删除 streak_count：改为实时从 sessions 计算
}
```

**说明：** poem_queue 是用户意图数据（我想背哪些诗），不是统计数据，保留合理。但去掉内部 streak_count。

### 2.4 user_profile（用户配置，合并现有零散 key）

```ts
interface UserProfile {
  nickname: string
  reminderTime?: string   // HH:MM
  createdAt: string
  onboardingDone?: boolean
}
```

### 2.5 poem_achievement_dates（成就解锁时间，保留）

```ts
Record<string, string>   // achievementId → ISO timestamp
```

**说明：** 成就是一次性事件（解锁即永久），存解锁时间是合理的，不属于派生数据。

---

## 3. 废弃的表（迁移后删除）

| 废弃 Key | 原因 | 替代方案 |
|---------|------|---------|
| `poem_progress` | 完全可从 recitation_sessions 计算 | 实时查询 |
| `poem_review_cards` | 与 review_schedules 重叠，且有写入 bug | 删除 |
| `review_schedules` | **重点**：SM-2 状态从 review_sessions 重算 | 见第4节 |
| `poem_memorize_history` | 是 recitation_sessions 的截断子集 | 实时查询 |
| `poem_total_chars` | 从 recitation_sessions.charCount 求和 | 实时计算 |
| `poem_streak` | 三套之一，废弃 | 实时计算 |
| `srs_streak_v2` | 三套之一，废弃 | 实时计算 |
| `poem_queue.streak_count` | 三套之一，废弃 | 实时计算 |

---

## 4. SM-2 参数如何从记录重算

这是极简方案最核心的问题：**不存 ef/interval，每次从 review_sessions 序列推算当前 SM-2 状态。**

### 4.1 算法

SM-2 是有状态的迭代算法，但状态可以从历史完整重建：

```ts
interface SM2State {
  ef: number           // 易度系数，初始 2.5
  interval: number     // 当前间隔（天）
  repetitions: number  // 连续通过次数
  nextDue: string      // 下次复习日期 YYYY-MM-DD
}

function computeSM2State(poemId: number, sessions: ReviewSession[]): SM2State {
  // 取该诗的所有复习记录，按时间升序
  const history = sessions
    .filter(s => s.poemId === poemId)
    .sort((a, b) => a.timestamp - b.timestamp);

  // 初始状态
  let state: SM2State = { ef: 2.5, interval: 1, repetitions: 0, nextDue: '' };

  for (const session of history) {
    state = applyReview(state, session.qScore);
  }

  return state;
}

function applyReview(state: SM2State, q: number): SM2State {
  // 标准 SM-2 公式
  const newEf = Math.max(1.3, state.ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  let newInterval: number;
  let newRepetitions: number;

  if (q < 3) {
    // 未通过：重置
    newInterval = 1;
    newRepetitions = 0;
  } else {
    newRepetitions = state.repetitions + 1;
    if (newRepetitions === 1) newInterval = 1;
    else if (newRepetitions === 2) newInterval = 6;
    else newInterval = Math.round(state.interval * newEf);
  }

  return {
    ef: newEf,
    interval: newInterval,
    repetitions: newRepetitions,
    nextDue: addDays(TODAY, newInterval),
  };
}
```

### 4.2 重算开销分析

假设重度用户：
- 背过 200 首诗，平均每首复习 20 次
- 重算所有诗的 SM-2 状态：200 × 20 = 4000 次迭代
- 每次迭代：3~5 次浮点运算
- 总计：~20000 次运算，在现代 JS 引擎上 < 1ms

**结论：重算开销完全可以接受。**

### 4.3 初始化时机

背诵完成后（首次），根据 qScore 生成第一条 review_session，此时 SM-2 状态从初始值 + 这条记录推算，得出下次复习时间。

```ts
// 背诵完成 → 写 recitation_session + 第一条 review_session
async function handleReciteDone(poemId, qScore) {
  await saveRecitationSession({ poemId, qScore, ... });
  await saveReviewSession({ poemId, qScore, date: today }); // 视为第一次复习
}

// 复习完成 → 只写 review_session
async function handleReviewDone(poemId, passed) {
  const qScore = passed ? 4 : 2;
  await saveReviewSession({ poemId, qScore, date: today });
}
```

---

## 5. 统计数据实时计算

所有统计从两张表实时计算，无缓存。

### 5.1 已背诵首数

```ts
function getTotalMemorized(sessions: RecitationSession[]): number {
  // 出现在 recitation_sessions 中的 distinct poemId 数量
  return new Set(sessions.map(s => s.poemId)).size;
}
```

### 5.2 累计字数

```ts
function getTotalChars(sessions: RecitationSession[]): number {
  // 每首诗只计一次（取第一次背诵的 charCount，避免重复计算）
  const seen = new Map<number, number>();
  for (const s of sessions.sort((a, b) => a.timestamp - b.timestamp)) {
    if (!seen.has(s.poemId)) seen.set(s.poemId, s.charCount);
  }
  return [...seen.values()].reduce((sum, n) => sum + n, 0);
}
```

### 5.3 Streak（连续天数）

```ts
function computeStreak(sessions: RecitationSession[]): number {
  // 取 distinct 日期集合，计算从今天往前连续的天数
  const dates = new Set(sessions.map(s => s.date));
  let streak = 0;
  let d = today(); // YYYY-MM-DD
  while (dates.has(d)) {
    streak++;
    d = subtractDay(d);
  }
  return streak;
}
```

**三套 streak 完全统一，一个函数解决。**

### 5.4 热力图

```ts
function buildHeatmap(year: number, month: number, sessions: RecitationSession[]): HeatmapDay[] {
  // 按日期聚合：recitation 次数 + review 次数
  // 从 recitation_sessions + review_sessions 直接计算
}
```

### 5.5 今日待复习列表

```ts
function getTodayDuePoems(reviewSessions: ReviewSession[]): number[] {
  // 对每首出现过的诗，计算 SM-2 state
  // 过滤 nextDue <= today 的
  const poemIds = [...new Set(reviewSessions.map(s => s.poemId))];
  return poemIds.filter(id => {
    const state = computeSM2State(id, reviewSessions);
    return state.nextDue <= today();
  });
}
```

---

## 6. 性能保证（数据量大时）

### 6.1 实际数据量估算

重度用户（坚持1年）：
- 背诵：200首 × 平均3次 = 600条 recitation_sessions
- 复习：200首 × 20次 = 4000条 review_sessions
- **总计 < 5000 条记录**

这不是大数据，这是极小数据。IndexedDB 存 5000 条 JSON，加载 < 50ms，遍历 < 5ms。

### 6.2 内存计算，不查数据库

启动时一次性加载两张表到内存，所有统计在内存中计算：

```ts
// AppContext / useData hook
const [recitationSessions, setRecitationSessions] = useState<RecitationSession[]>([]);
const [reviewSessions, setReviewSessions] = useState<ReviewSession[]>([]);

useEffect(() => {
  // 启动时一次性加载
  Promise.all([
    storage.get<RecitationSession[]>('recitation_sessions'),
    storage.get<ReviewSession[]>('review_sessions'),
  ]).then(([r, rv]) => {
    setRecitationSessions(r ?? []);
    setReviewSessions(rv ?? []);
  });
}, []);

// 写入时同步更新内存
function addRecitationSession(s: RecitationSession) {
  const next = [...recitationSessions, s];
  setRecitationSessions(next);
  storage.set('recitation_sessions', next); // 异步写盘，不阻塞 UI
}
```

### 6.3 useMemo 避免重复计算

```ts
// 所有派生数据用 useMemo 缓存，依赖数组变化时才重算
const totalMemorized = useMemo(
  () => getTotalMemorized(recitationSessions),
  [recitationSessions]
);

const streak = useMemo(
  () => computeStreak(recitationSessions),
  [recitationSessions]
);

const todayDue = useMemo(
  () => getTodayDuePoems(reviewSessions),
  [reviewSessions]
);
```

### 6.4 万一数据量真的大了？

5年后极端用户可能有 20000 条记录。此时：
- 内存占用：20000 × ~200 bytes = 4MB，可接受
- SM-2 重算：依然 < 10ms

如果真要优化，只需在 review_sessions 中加一个可选的 snapshot 字段存中间 SM-2 状态，作为断点重算的起点。但这属于未来优化，不是现在的问题。

---

## 7. poem_queue 归属

poem_queue 是**用户意图数据**，不是统计数据：
- 用户手动选择"我想背这些诗"
- 这是一个有序列表，不能从背诵记录推算
- **保留，但精简结构**

```ts
interface QueueStore {
  queue: number[]           // poemId 有序列表
  last_complete_date: string
  today_complete: boolean
  // 删除 streak_count（改从 recitation_sessions 计算）
}
```

streak_count 从 poem_queue 中移除，useQueue 不再维护独立 streak，改为从 recitation sessions 的统一计算函数取值。

---

## 8. Streak 统一方案

**废弃所有三套存储型 streak，改为纯计算：**

```ts
// lib/stats.ts 统一导出
export function computeStreak(recitationSessions: RecitationSession[]): StreakData {
  const dates = new Set(recitationSessions.map(s => s.date));
  let count = 0;
  let d = todayString();
  while (dates.has(d)) {
    count++;
    d = subtractDay(d);
  }
  return {
    count,
    lastActivityDate: [...dates].sort().reverse()[0] ?? null,
  };
}
```

所有消费方（Home、ProgressPage、AchievementsPage、weeklyReport）统一调这一个函数。没有状态，没有双写，没有不一致。

---

## 9. 数据迁移方案

App 启动时运行一次性迁移，读取旧数据写入新结构：

```ts
async function migrateToV3() {
  if (await storage.get('data_migration_v3') === 'done') return;

  // 1. recitation_sessions：补 charCount（从诗歌数据库查）
  const sessions = await storage.get<RecitationSession[]>('recitation_sessions') ?? [];
  const migrated = sessions.map(s => ({
    ...s,
    charCount: s.charCount ?? getPoemCharCount(s.poemId), // 补字段
  }));
  await storage.set('recitation_sessions', migrated);

  // 2. 从 review_schedules 反推 review_sessions（近似重建）
  // 注意：旧的 review_schedules 只有当前状态，无法完整重建历史
  // 策略：为每首有 review_schedules 的诗生成1条虚拟 review_session（最后一次复习）
  const schedules = await storage.get<Record<number, ReviewSchedule>>('review_schedules') ?? {};
  const reviewSessions: ReviewSession[] = Object.entries(schedules).map(([id, s]) => ({
    id: `migrated_${id}_${Date.now()}`,
    poemId: Number(id),
    date: s.lastReviewDate ?? todayString(),
    timestamp: Date.now(),
    passed: true,
    qScore: 4, // 保守估计：通过
  }));
  await storage.set('review_sessions', reviewSessions);

  // 3. 合并 user_profile
  const nickname = await storage.get<string>('poem_nickname');
  const reminderTime = await storage.get<string>('reminder_time');
  if (nickname || reminderTime) {
    await storage.set('user_profile', { nickname: nickname ?? '学习者', reminderTime, createdAt: todayString() });
  }

  // 4. 标记迁移完成
  await storage.set('data_migration_v3', 'done');

  // 注意：旧 key 本次不删除，下个版本再清理
}
```

**迁移的局限性说明：**
- 旧 review_sessions 无法完整重建（数据就是没存过）
- 迁移后 SM-2 状态会从这条"虚拟记录"重新开始计算
- 用户的复习进度会有轻微重置（但 recitation 进度完全保留）

---

## 10. 扩展性设计（未来后端同步）

两张 append-only 记录表天然支持后端同步：

```
本地 recitation_sessions → 增量同步到后端 → 合并其他设备的记录
```

同步策略：
- 每条记录有全局唯一 id（包含 timestamp）
- 合并规则：以 id 为主键做 union，无冲突
- 无需 CRDT，因为记录只追加不修改

这比同步聚合状态（如 poem_progress）容易得多，因为事实表天然是幂等的。

---

## 11. 方案优缺点总结

### 优点

1. **零数据不一致**：只有一个事实来源，不存在"streak A 和 streak B 不一样"的问题
2. **代码简单**：删掉所有同步逻辑，删掉所有"写 A 别忘了更新 B"的耦合
3. **天然支持时间旅行**：可以查询"3个月前的学习状态"，聚合型方案做不到
4. **同步友好**：append-only records 是分布式系统最好处理的数据形态
5. **调试友好**：出 bug 时直接看原始记录，不用猜哪个聚合字段出了问题

### 缺点

1. **SM-2 状态重建有近似性**：旧数据迁移时历史 review_sessions 无法完整重建，初期 SM-2 精度有损失
2. **"今日待复习"计算需要遍历所有记录**：数据量极大时（>50000条）需要优化，但对本应用来说不是问题
3. **开发者需要转变思维**：从"改状态"变成"追加事实"，初期可能不习惯

---

## 12. 给架构师 B/C 的问题

1. **SM-2 状态缓存方案**（架构师 B 倾向于保留 review_schedules）：你存的 ef/interval 是从什么时间点开始的？旧数据迁移时怎么保证这个"当前状态"和历史记录一致？
2. **"缓存聚合数据"何时失效**：poem_progress 里的 memorized 字段，当 recitation_sessions 被修改（未来支持撤销？）时，你怎么保证聚合字段及时失效？
3. **Streak 的缓存方案**：你准备用哪套 streak？废弃另外两套时，存量数据怎么处理？会不会出现"迁移当天 streak 归零"的问题？
