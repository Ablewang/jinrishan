# 双 SRS 系统合并迁移方案

## 一、现状详细梳理

### 系统 A — `review_schedules`（SM-2 变体）

**localStorage key：** `review_schedules`，存 `Record<number, ReviewSchedule>`

**数据结构：**
```ts
interface ReviewSchedule {
  poemId:         number      // 诗词 ID
  ef:             number      // Easiness Factor，初始 2.5，最低 1.3
  interval:       number      // 当前复习间隔（天），范围 1–60
  repetition:     number      // 累计背诵轮次
  nextReviewDate: string      // "YYYY-MM-DD"
  lastSessionId:  string      // 上次 RecitationSession.id
  totalSessions:  number
  bestStars:      1 | 2 | 3
}
```

**写入时机：** `useRecitation.saveResult()` 每次背诵结束调用，路径：
```
背诵结束
→ buildSession()     → recitation_sessions（日志）
→ calcQScore(lines)  → q=0–5
→ updateSchedule()   → review_schedules
```

**调度逻辑（updateSchedule）：**
- 首次：q=5 → 3天，q≥4 → 2天，其余 → 1天
- q < 3（失败）：repetition-1，interval 重置 1–2天
- q ≥ 3，rep=1：固定 6天
- q ≥ 3，rep>1：`round(prev.interval × newEF)`，上限 60天

**致命问题：当前完全没有 UI 读取此键**。`getTodayList()` 和 `getSchedule()` 存在但从未被任何页面调用，是纯技术债。

---

### 系统 B — `poem_review_cards`（简易5档）

**localStorage key：** `poem_review_cards`，存 `ReviewCard[]`

**数据结构：**
```ts
interface ReviewCard {
  id:        number   // 诗词 ID
  level:     number   // 0=刚背完，1–4=复习中，5=已掌握
  due:       string   // 下次到期日
  lastDate:  string
  passCount: number
}
const INTERVALS = [1, 3, 7, 15, 30]  // 固定间隔，无自适应
```

**写入时机（两处）：**
1. `markMemorized()` — 首次背诵时创建 level=0 卡片，due=明天
2. `markReviewed(passed: boolean)` — 复习时 passed=true 则 level+1，否则 level-1，due 按 INTERVALS 固定跳档

**UI 消费：** Home.tsx 的今日复习列表、明日预告、待复习 tab 全部来自这里。这是驱动全部 UI 的系统。

---

### 两套 streak 对比

| | `poem_streak`（系统B附属）| `poem_queue` 内的 `streak_count` |
|---|---|---|
| 触发条件 | `markMemorized()`，即背新诗 | `completePoem()`，即从队列完成一首 |
| Home.tsx 是否展示 | 否 | **是**（hero 连续天数） |
| 复习算不算 | 不算 | 不算 |

**核心 bug：** 用户纯粹做复习不触发 `completePoem()`，所以复习日会断掉 streak。

---

## 二、合并方案设计

**核心原则：** 系统 A 成为唯一真相来源，系统 B 先保留兼容层后废弃，UI 层面通过适配函数零感知切换。

### 适配层

新建 `src/utils/scheduleAdapter.ts`：
```ts
export function scheduleToDisplayLevel(s: ReviewSchedule): number {
  if (s.repetition === 0) return 0
  if (s.interval <= 1)  return 1
  if (s.interval <= 3)  return 2
  if (s.interval <= 7)  return 3
  if (s.interval <= 15) return 4
  return 5
}

export function scheduleToCard(s: ReviewSchedule) {
  return {
    id:        s.poemId,
    level:     scheduleToDisplayLevel(s),
    due:       s.nextReviewDate,
    lastDate:  s.nextReviewDate,
    passCount: s.repetition,
  }
}
```

### 复习写入升级

在 `useRecitation.ts` 新增 `saveReviewResult`，让复习也走完整的 SM-2 路径，替代目前只传 `bool` 的 `markReviewed`：
```ts
const saveReviewResult = useCallback((
  poemId: number,
  lines: LineResult[],
  date: string
): RecitationSession => {
  return saveResult(poemId, 'review', lines, date)
}, [saveResult])
```

---

## 三、迁移步骤（分阶段）

### Phase 1：读取切换（1–2天，无 breaking change）
- 新建 `src/utils/scheduleAdapter.ts`
- `useProgress` 中新增 `todayDueFromA`（调用 `useRecitation.getTodayList`，用 `scheduleToCard` 映射），加 `USE_SYSTEM_A = false` flag
- console.log 对比两套到期列表，确认差异可接受
- 翻转 flag 为 `true`，Home.tsx 自动切换数据来源

### Phase 2：复习写入升级（2–3天）
- `useRecitation.ts` 加 `saveReviewResult(poemId, lines, date)`
- `RecitationSession` 加 `sessionType: 'memorize' | 'review'` 字段
- 复习流程页面（调用 `markReviewed` 的地方）改为调用 `saveReviewResult`
- `markReviewed` 加 `@deprecated` 注释，暂时保留兼容

### Phase 3：老用户数据迁移（1天，一次性脚本）

新建 `src/lib/migration.ts`：
```ts
export function migrateSystemBToA() {
  if (localStorage.getItem('srs_migrated_v1')) return

  const cards: ReviewCard[] = JSON.parse(localStorage.getItem('poem_review_cards') ?? '[]')
  const schedules: Record<number, ReviewSchedule> = JSON.parse(
    localStorage.getItem('review_schedules') ?? '{}'
  )
  const levelToInterval = [1, 1, 3, 7, 15, 30]

  for (const card of cards) {
    if (schedules[card.id]) continue  // 系统A已有记录，不覆盖
    if (card.level === 0) continue    // 从未复习，跳过

    schedules[card.id] = {
      poemId:         card.id,
      ef:             2.5,
      interval:       levelToInterval[card.level] ?? 30,
      repetition:     card.passCount || card.level,
      nextReviewDate: card.due,       // 保留原有 due 日期
      lastSessionId:  '',
      totalSessions:  card.passCount || card.level,
      bestStars:      1,
    }
  }

  localStorage.setItem('review_schedules', JSON.stringify(schedules))
  localStorage.setItem('srs_migrated_v1', 'done')
}
```

### Phase 4：清理（观察期2周后）
- 删除 `useProgress.ts` 中的 `reviewCards`、`loadReviewCards`、`saveReviewCards`、`markReviewed`、`todayDueReviews`、`masteredCount`、`reviewingCount`
- 删除 `markMemorized` 中的 `setReviewCards` 块
- 运行 TypeScript 检查，所有残留引用会自动报错

---

## 四、streak 统一方案

**新定义：** 当天调用 `saveResult`（含背新诗和复习）即算打卡。

```ts
// src/hooks/useRecitation.ts
const STREAK_KEY_V2 = 'srs_streak_v2'

export interface SrsStreakData {
  lastActivityDate: string
  count: number
}

function updateSrsStreak(date: string): SrsStreakData {
  const raw = localStorage.getItem(STREAK_KEY_V2)
  const prev: SrsStreakData = raw ? JSON.parse(raw) : { lastActivityDate: '', count: 0 }
  if (prev.lastActivityDate === date) return prev

  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  const yesterday = d.toISOString().slice(0, 10)

  const next: SrsStreakData = {
    lastActivityDate: date,
    count: prev.lastActivityDate === yesterday ? prev.count + 1 : 1,
  }
  localStorage.setItem(STREAK_KEY_V2, JSON.stringify(next))
  return next
}
// saveResult 末尾调用 updateSrsStreak(date)，从 hook 返回 srsStreak
```

**Home.tsx 改动：** `streakCount` 来源从 `useQueue.streakCount` 改为 `useRecitation().srsStreak.count`。

**老数据兼容：** 迁移脚本中读取 `poem_streak.count` 和 `poem_queue.streak_count`，取较大值初始化 `srs_streak_v2`，避免 streak 归零。

---

## 五、风险与回滚策略

| 风险 | 级别 | 缓解措施 |
|---|---|---|
| 系统 A 数据缺失（老用户） | 低 | Phase 3 迁移脚本补写 |
| SM-2 间隔与系统 B 差异导致日期突变 | 中 | Phase 1 先观察；迁移脚本复用原 due 日期 |
| 复习页未能正确构造 LineResult[] | 中 | fallback：lines 为空时 calcQScore 返回 0，等效失败 |
| streak 归零 | 高 | 取两个旧 streak 较大值初始化新 key |
| Phase 4 误删仍在用代码 | 低 | TypeScript 类型检查会全量报错 |

**回滚：** Phase 1–3 均可通过翻转 flag 或恢复读取 key 回滚，不损失任何数据。Phase 4（删代码）不可逆，需在观察期满后执行。

---

## 六、收益

1. **复习效果提升** — SM-2 EF 因子自适应，容易的诗间隔拉长到 30–60天，难的维持短间隔
2. **消除技术债** — 删除约60行 useProgress 相关代码，useProgress.ts 体积减少约40%
3. **数据完整性** — 单一真相来源，recitation_sessions 的逐句数据真正发挥作用
4. **streak bug 修复** — 复习日不再断 streak
5. **未来可扩展** — ReviewSchedule 含 ef/interval/repetition，可直接支持跳过复习、提前复习、难度标记等功能

**预计工作量：** Phase 1–4 约4–6天开发 + 2周观察期。
