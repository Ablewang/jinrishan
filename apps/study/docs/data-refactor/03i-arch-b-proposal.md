# 架构师 B 方案：原始记录 + 物化缓存派

> 作者视角：倾向于保留原始记录作为 source of truth，同时维护物化缓存表以保证读性能。

---

## 核心主张

**plan.md 的"纯实时计算"方案在语义上最干净，但有一个实际问题：每次打开首页、进度页都要全量扫 recitation_sessions，随着数据增长会越来越慢。**

我的方案在 plan.md 基础上加一层物化缓存，用空间换时间：

```
原始记录（append-only）
  recitation_sessions   ← 背诵流水账
  review_sessions       ← 复习流水账

物化缓存（同步更新）
  poem_states           ← 每首诗的当前状态快照（SM-2 + 背诵统计合并）

配置/系统
  poem_queue            ← 手动背诵计划（不变）
  user_profile          ← 用户设置（合并现有散装字段）
  poem_achievement_dates← 成就解锁时间（不变）
```

---

## 1. poem_states 完整字段设计

poem_states 把现有 review_schedules 和 poem_progress 合并为一张表，每首诗一条记录。

```ts
interface PoemState {
  // --- 标识 ---
  poemId: number
  updatedAt: number           // 最后写入时间戳，用于冲突检测和调试

  // --- 背诵状态 ---
  memorized: boolean          // 是否已首次背诵
  firstMemorizedAt?: string   // YYYY-MM-DD，首次背诵日期
  bestStars: number           // 历史最高星级 (0-3，0=未背)
  recitationCount: number     // 累计背诵次数
  totalCharCount: number      // 累计背诵字数（此诗）

  // --- SM-2 调度状态（原 review_schedules）---
  ef: number                  // Easiness Factor，初始 2.5
  interval: number            // 下次复习间隔（天）
  currentLevel: number        // 当前掌握等级 (0-5)
  nextDue: string             // YYYY-MM-DD，下次应复习日期
  reviewCount: number         // 累计复习次数
  lastReviewedAt?: string     // YYYY-MM-DD，最后一次复习日期
  passCount: number           // 复习通过次数
}
```

**字段设计说明：**

- `memorized + firstMemorizedAt`：替代旧 poem_progress.memorized，可知道什么时候开始背这首诗
- `bestStars`：首页/进度页高频读取，缓存在这里避免每次扫 sessions
- `recitationCount + totalCharCount`：聚合计数，避免每次求和
- SM-2 字段从 review_schedules 直接移过来，两表合并，不再需要跨表 join
- `updatedAt`：调试神器，未来多设备同步时也有用

---

## 2. 写入时如何同步更新缓存

### 2.1 背诵写入（saveResult）

```
用户完成背诵
    ↓
1. append recitation_sessions（一条新记录）
2. 读取 poem_states[poemId]（可能不存在）
3. 更新 poem_states[poemId]：
     memorized = true
     firstMemorizedAt = min(existing, session.date)
     bestStars = max(existing, session.stars)
     recitationCount += 1
     totalCharCount += session.charCount
     updatedAt = Date.now()
     （SM-2 字段不变，背诵不触发 SM-2 更新）
4. 计算新的 SM-2 调度（基于 qScore），更新 poem_states[poemId]：
     ef = newEf
     interval = newInterval
     currentLevel = newLevel
     nextDue = today + interval
5. 写入 poem_states（覆盖）
```

**是否需要事务？**

IndexedDB 支持事务，但当前代码通过 storage 适配层操作，适配层是否封装了 IDB 事务需要确认。

两种做法：

**方案 2a（推荐）：乐观写入 + 版本校验**
```
写入前读取 poem_states[poemId].updatedAt（记为 versionBefore）
执行计算
写入时检查 updatedAt 是否还是 versionBefore
  → 如果变了，说明期间有并发写（理论上单用户不会发生），重试或报错
  → 没变，正常写入，同时更新 updatedAt
```

单用户 PWA 场景并发极低，乐观写入足够。

**方案 2b：IDB 事务**
```
开启一个 readwrite 事务，同时操作：
  - recitation_sessions（put 一条）
  - poem_states（put 一条）
事务提交失败则两个都回滚
```

更安全，但需要适配层支持多 key 事务。目前代码结构来看适配层是 key-value 单操作，改造成本不低。

**结论：先用方案 2a，适配层改造完成后可升级到 2b。关键是 recitation_sessions append 必须先于 poem_states 更新，这样即使 poem_states 写入失败，下次启动时可以从 sessions 重建缓存。**

---

### 2.2 复习写入（saveReviewResult）

```
用户完成复习
    ↓
1. 读取 poem_states[poemId]（获取 levelBefore、ef、interval）
2. 计算新 SM-2 参数（基于 passed）
3. append review_sessions（一条新记录，含 levelBefore, levelAfter）
4. 更新 poem_states[poemId]：
     ef = newEf
     interval = newInterval
     currentLevel = newLevel（levelAfter）
     nextDue = today + newInterval
     reviewCount += 1
     lastReviewedAt = today
     passCount += (passed ? 1 : 0)
     updatedAt = Date.now()
5. 写入 poem_states（覆盖）
```

**写入顺序同样是：原始记录先写，缓存后写。**

---

## 3. 缓存损坏时如何从原始记录重建

### 3.1 触发时机

以下情况需要重建 poem_states：
- 检测到 poem_states 为空但 recitation_sessions 不为空（第一次迁移，或意外清空）
- updatedAt 差值异常（可选的完整性检查）
- 用户手动触发"修复数据"

### 3.2 重建逻辑（rebuildPoemStates）

```ts
async function rebuildPoemStates(): Promise<void> {
  const sessions = await storage.get('recitation_sessions') ?? []
  const reviewSessions = await storage.get('review_sessions') ?? []
  const schedules = await storage.get('review_schedules') ?? {}

  // 从 recitation_sessions 重建背诵部分
  const states: Record<number, PoemState> = {}

  for (const s of sessions) {
    const existing = states[s.poemId]
    if (!existing) {
      states[s.poemId] = {
        poemId: s.poemId,
        memorized: true,
        firstMemorizedAt: s.date,
        bestStars: s.stars,
        recitationCount: 1,
        totalCharCount: s.charCount ?? 0,
        // SM-2 字段先用默认值，后面从 schedules 覆盖
        ef: 2.5, interval: 1, currentLevel: 0,
        nextDue: s.date, reviewCount: 0,
        passCount: 0, updatedAt: s.timestamp,
      }
    } else {
      existing.bestStars = Math.max(existing.bestStars, s.stars)
      existing.recitationCount += 1
      existing.totalCharCount += s.charCount ?? 0
      if (s.date < existing.firstMemorizedAt!) {
        existing.firstMemorizedAt = s.date
      }
    }
  }

  // 从 review_sessions 重建复习计数
  for (const r of reviewSessions) {
    const state = states[r.poemId]
    if (state) {
      state.reviewCount += 1
      state.passCount += r.passed ? 1 : 0
      if (!state.lastReviewedAt || r.date > state.lastReviewedAt) {
        state.lastReviewedAt = r.date
      }
    }
  }

  // SM-2 字段从 review_schedules 覆盖（它是 source of truth for SM-2）
  // 注意：重建期间 review_schedules 是独立的，仍然保留
  for (const [poemIdStr, schedule] of Object.entries(schedules)) {
    const poemId = Number(poemIdStr)
    if (states[poemId]) {
      states[poemId].ef = schedule.ef
      states[poemId].interval = schedule.interval
      states[poemId].currentLevel = schedule.level ?? 0
      states[poemId].nextDue = schedule.nextDue
    }
  }

  await storage.set('poem_states', states)
}
```

**重建的前提条件：**
- recitation_sessions 完整（这是 append-only，不应被清除）
- review_sessions 完整（新增的，迁移后积累）
- review_schedules 独立保留，作为 SM-2 的另一份备份（本方案不删除它）

**这意味着 review_schedules 要继续保留，不能废弃。** 这是本方案与 plan.md 的重要区别：plan.md 把 SM-2 状态全部放进 poem_states 并废弃 review_schedules，一旦 poem_states 损坏就需要重新跑 SM-2 算法重放所有复习历史才能恢复——而复习历史（review_sessions）是迁移后才开始积累的，旧数据只有 review_schedules 里的当前状态。

---

## 4. poem_queue 归属

poem_queue 是"手动背诵计划"，本质是用户操作意图，不是学习结果数据，应该独立存在。

**不应合并进 poem_states 的理由：**
- poem_states 的语义是"这首诗的学习状态"，poem_queue 的语义是"用户今天打算背哪些诗"
- poem_queue 有顺序（用户手动排列），poem_states 是按 poemId 索引的无序 map
- poem_queue 的 today_complete、last_complete_date 是日常操作流水，不属于诗的状态

**poem_queue.streak_count 废弃：** 这个字段可以删掉，streak 改为从 recitation_sessions distinct date 实时计算（这部分不需要缓存，计算量小）。

**最终归属：**
```
poem_queue: {
  queue: number[]           // 计划背诵的 poemId 列表（有序）
  last_complete_date: string
  today_complete: boolean
  // streak_count 删除
}
```

---

## 5. Streak 如何统一

### 5.1 Streak 的语义问题

三套 streak 其实代表三种不同的"活跃"定义：
- poem_streak / srs_streak_v2：每次背诵（saveResult）触发
- poem_queue.streak_count：完成每日计划触发

**建议统一定义：** 有效活跃 = 当天有背诵记录（recitation_sessions 存在当天记录）。

### 5.2 实现方案

**不缓存 streak，全部实时计算：**

```ts
function calcStreak(sessions: RecitationSession[]): number {
  const dates = [...new Set(sessions.map(s => s.date))].sort().reverse()
  // dates = ['2025-10-20', '2025-10-19', '2025-10-17', ...]

  const today = getTodayStr()
  let streak = 0
  let expected = today

  for (const date of dates) {
    if (date === expected) {
      streak++
      expected = dayBefore(expected)
    } else if (date < expected) {
      break  // 断了
    }
    // date > expected 说明有未来日期（异常数据），跳过
  }
  return streak
}
```

**recitation_sessions 的 distinct date 数量通常不超过几百条，遍历开销可忽略不计。**

### 5.3 缓存与否的权衡

| | 实时计算 | 缓存在 poem_states 外（单独字段）|
|--|---------|-------------------------------|
| 一致性 | 天然一致 | 需要每次写 session 时同步更新 |
| 性能 | 每次启动扫 sessions，~1ms | O(1) 读取 |
| 重建 | 天然可重建 | 缓存损坏时需要重建 |

sessions 量级不大（每天1-3条，一年也就 500 条以内），实时计算足够。

**结论：streak 不缓存，纯实时计算，全站消费方统一从 ProgressContext.streak 读取（Context 内部实时算）。废弃 poem_streak、srs_streak_v2、poem_queue.streak_count。**

---

## 6. 与 plan.md 的差异对比

| 点 | plan.md（纯实时） | 本方案（物化缓存）|
|----|-----------------|-----------------|
| poem_states | 不存在，全部实时算 | 存在，物化快照 |
| review_schedules | 废弃，SM-2 状态进 poem_states | 保留，作为 SM-2 备份和重建依据 |
| 首页/进度页读性能 | 每次全扫 sessions | O(1) 读缓存 |
| 缓存一致性 | N/A | 需要在每次写入时同步 |
| 缓存损坏恢复 | 天然——本来就是实时算 | 需要 rebuildPoemStates() |
| SM-2 历史数据 | 新系统从零开始，旧 review_schedules 迁移一次 | review_schedules 保留，重建时用 |
| Streak | 实时计算 | 实时计算（两方案一致）|

---

## 7. 我的保留意见和疑问

**支持缓存方案的论据：**
1. 热力图、进度页需要聚合所有诗的状态（memorized、bestStars、nextDue），如果全部实时算，每次都需要 O(n) 扫 sessions，随用户数据增长会变慢
2. SM-2 状态是"当前时刻的快照"，本来就适合单独存储，不适合从历史重放

**我对 plan.md 的疑问（留给讨论）：**

1. **totalChars 实时计算的性能边界在哪里？** 如果用户背了 300 首诗，每首背了 3-5 次，sessions 有 1000+ 条，每次打开进度页都 reduce 求和，是否可接受？IndexedDB 读取 1000 条的耗时大约是多少？

2. **SM-2 状态废弃 review_schedules 的风险？** plan.md 把 SM-2 字段移进 poem_states 并废弃 review_schedules。但 review_sessions 是迁移后才开始积累的——如果用户在迁移后使用了一段时间，poem_states 损坏，review_schedules 已删，只能靠有限的 review_sessions 重建 SM-2 状态，而重建 SM-2 状态本来就需要重放全部复习历史，如果历史不完整就无法准确恢复。

3. **ProgressContext 对外接口不变是否是伪命题？** reviewCards 的类型从 ReviewCard[] 变成从 review_schedules 转换，字段名可能不同（如 review_schedules 没有 lastDate），需要确认下游消费方（HeatmapChart、PoemDetail）是否依赖了这些差异字段。

4. **poem_queue 的 today_complete 逻辑** 在多设备场景下怎么办？今天完成是本地时间还是服务器时间？现在是本地单机没问题，但未来同步时这个字段很容易出问题。

---

## 8. 本方案关键实施步骤

在 plan.md 的 9 步基础上，差异点：

**Step 1 改动：** types/storage.ts 新增 PoemState 接口（见上方字段定义）

**Step 2 改动：** migration.ts 的 migrateToV2 末尾额外执行：
```
从 poem_progress + review_schedules 合并构建 poem_states 初始快照
review_schedules 继续保留（不废弃）
```

**Step 3 改动：** useRecitation.ts 的 saveResult 和新增的 saveReviewResult，在写入原始记录后，同步更新 poem_states（见第 2 节的写入流程）

**Step 4 改动：** ProgressContext 内部改为读 poem_states 而非实时算：
```
progress      ← poem_states（直接读，O(n) 其中 n=诗首数，不是 sessions 数）
totalChars    ← sum(poem_states[*].totalCharCount)，O(诗首数) 而非 O(sessions数)
streak        ← 实时计算（同 plan.md）
reviewCards   ← 从 poem_states 过滤出 nextDue <= today
```

**新增 Step：** 添加 rebuildPoemStates() 函数，在 migration.ts 或单独的 storageRepair.ts 中实现，App 初始化时检测缓存一致性（poem_states 为空但 sessions 不为空时自动触发）。
