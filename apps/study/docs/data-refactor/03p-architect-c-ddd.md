# 架构师C方案：领域驱动设计派

> 立场：按业务领域划分，每个域自治，域间通过事件解耦。

---

## 一、总体域划分

```
┌─────────────────────────────────────────────────────────┐
│                      应用层 (App)                         │
│         协调各域，处理跨域查询，响应用户交互              │
└──────────┬──────────┬──────────┬──────────┬─────────────┘
           │          │          │          │
    ┌──────▼──┐ ┌─────▼───┐ ┌───▼────┐ ┌───▼──────┐
    │ 学习域   │ │ 复习域   │ │ 计划域  │ │  用户域   │
    │Learning │ │ Review  │ │  Plan  │ │  User   │
    └─────────┘ └─────────┘ └────────┘ └─────────┘
         │           │           │           │
         └───────────┴───────────┴───────────┘
                    事件总线 (EventBus)
```

四个域的职责边界：

| 域 | 职责 | 原始记录 | 状态 |
|----|------|----------|------|
| 学习域 | 管理背诵行为，记录每次背诵过程 | `recitation_sessions` | 无（实时计算） |
| 复习域 | 管理 SM-2 调度，记录每次复习 | `review_sessions` | `review_schedules` |
| 计划域 | 管理用户手动排队计划 | — | `poem_queue` |
| 用户域 | 管理用户信息、成就、偏好 | `achievement_events` | `user_profile` |

---

## 二、各域详细设计

### 2.1 学习域（Learning Domain）

**职责**：用户每次背诵一首诗，学习域负责记录这个事件，并更新该诗的学习状态。

**原始记录表**：`recitation_sessions`（只追加，永不删除）

```ts
interface RecitationSession {
  id: string           // `${poemId}_${timestamp}`
  poemId: number
  mode: 'parent' | 'child'
  date: string         // YYYY-MM-DD，本地时区
  timestamp: number    // Unix ms
  lines: { passed: boolean; hintCount: number }[]
  stars: number        // 1 | 2 | 3
  hintRate: number     // 0~1
  passRate: number     // 0~1
  qScore: number       // SM-2 质量分 0~5
  charCount: number    // 本次背诵汉字数（含标点）
}
```

**无状态缓存**（全部从 sessions 实时计算）：

```ts
// 以下都不单独存储，按需计算
type LearningStats = {
  memorizedPoems: Set<number>   // distinct poemId
  bestStarsMap: Record<number, number>  // poemId → max stars
  totalChars: number            // sum(charCount)
  activeDates: string[]         // distinct date，已排序
  streak: number                // 从 activeDates 计算连续天数
}
```

**域内服务接口**：

```ts
interface LearningService {
  // 写入
  saveSession(session: Omit<RecitationSession, 'id'>): Promise<RecitationSession>

  // 查询
  getSessions(poemId?: number): Promise<RecitationSession[]>
  getSessionsByDate(date: string): Promise<RecitationSession[]>
  getSessionsByDateRange(from: string, to: string): Promise<RecitationSession[]>

  // 计算（实时）
  computeStats(): Promise<LearningStats>
  getStreakCount(): Promise<number>
  getBestStars(poemId: number): Promise<number>
  isMemorized(poemId: number): Promise<boolean>
}
```

**域事件**（写入 session 后派发）：

```ts
type LearningSessionSaved = {
  type: 'learning.session_saved'
  payload: RecitationSession
}
```

---

### 2.2 复习域（Review Domain）

**职责**：基于 SM-2 算法调度复习，记录每次复习结果，维护每首诗的当前调度状态。

**状态表**：`review_schedules`（每首诗一条，更新覆盖）

```ts
interface ReviewSchedule {
  poemId: number
  level: number        // 0~5，5为已掌握
  ef: number           // 难易因子，初始 2.5
  interval: number     // 下次间隔天数
  dueDate: string      // YYYY-MM-DD，下次复习日期
  nextDue: number      // Unix ms，方便排序
  totalSessions: number
  passCount: number
  // 移除：lastDate（改用 review_sessions 查询）
}
```

**原始记录表**：`review_sessions`（只追加，永不删除）

```ts
interface ReviewSession {
  id: string           // `review_${poemId}_${timestamp}`
  poemId: number
  date: string         // YYYY-MM-DD
  timestamp: number
  passed: boolean
  levelBefore: number
  levelAfter: number
  intervalBefore: number
  intervalAfter: number
}
```

**域内服务接口**：

```ts
interface ReviewService {
  // 写入
  saveReview(poemId: number, passed: boolean): Promise<ReviewSession>

  // 查询
  getSchedule(poemId: number): Promise<ReviewSchedule | null>
  getDueToday(today: string): Promise<ReviewSchedule[]>
  getMastered(): Promise<ReviewSchedule[]>
  getReviewSessions(poemId?: number): Promise<ReviewSession[]>

  // SM-2 内部逻辑
  // computeNextSchedule(schedule, qScore): ReviewSchedule  (纯函数)
}
```

**域事件**（写入 review_session 后派发）：

```ts
type ReviewSessionSaved = {
  type: 'review.session_saved'
  payload: ReviewSession
  schedule: ReviewSchedule  // 更新后的调度状态
}
```

**学习域 → 复习域的触发**：

复习域监听 `learning.session_saved`，当一首诗首次出现在 recitation_sessions 中时，自动初始化其 ReviewSchedule（level=0, ef=2.5, dueDate=明天）。

```ts
// 复习域内部事件处理器
eventBus.on('learning.session_saved', async (e: LearningSessionSaved) => {
  const existing = await reviewService.getSchedule(e.payload.poemId)
  if (!existing) {
    // 首次背诵，初始化调度
    await reviewService.initSchedule(e.payload.poemId, e.payload.qScore)
  } else if (existing.level < 5) {
    // 再次背诵已有调度的诗（不是复习，是主动重背）
    // 策略：更新 ef 但不重置 interval，由产品决定
  }
})
```

---

### 2.3 计划域（Plan Domain）

**职责**：管理用户手动维护的"待背诵"队列，与 SM-2 复习调度相互独立。

**poem_queue 归属此域**（详见第五节讨论）。

**状态表**：`poem_queue`（单文档）

```ts
interface PoemQueue {
  queue: number[]          // 待背诵 poemId 列表，有序
  todayComplete: boolean   // 今日队列是否完成
  lastCompleteDate: string // 最后完成日期，用于重置 todayComplete
  // 移除：streak_count（统一由学习域计算）
}
```

**域内服务接口**：

```ts
interface PlanService {
  addToQueue(poemId: number): Promise<void>
  removeFromQueue(poemId: number): Promise<void>
  completePoem(poemId: number): Promise<void>  // 只标记队列状态，不触发 streak
  getTodayStatus(): Promise<{ queue: number[]; todayComplete: boolean }>
  reorderQueue(newOrder: number[]): Promise<void>
}
```

**与 streak 的关系**：计划域的 `todayComplete` 只表示"今天的手动计划有没有完成"，**不参与 streak 计算**。streak 统一由学习域从 recitation_sessions 计算。

**域事件**：

```ts
type QueueCompleted = {
  type: 'plan.queue_completed'
  payload: { date: string }
}
```

---

### 2.4 用户域（User Domain）

**职责**：管理用户配置、成就系统、里程碑。

**配置表**：`user_profile`（单文档）

```ts
interface UserProfile {
  nickname: string
  gender?: 'male' | 'female'
  reminderTime?: string   // HH:MM
  createdAt: string       // ISO8601
  onboardingDone: boolean
}
```

**成就事件表**：`achievement_events`（只追加）

```ts
interface AchievementEvent {
  id: string             // `ach_${achievementId}_${timestamp}`
  achievementId: string  // 成就定义 ID
  unlockedAt: string     // ISO8601
}
```

> 替代原来的 `poem_achievement_dates`（Record 结构），改为追加记录，保留解锁历史。

**里程碑状态**：`milestone_state`（单文档）

```ts
interface MilestoneState {
  triggered: number[]    // 已触发的里程碑阈值列表
}
```

**域内服务接口**：

```ts
interface UserService {
  getProfile(): Promise<UserProfile>
  updateProfile(patch: Partial<UserProfile>): Promise<void>
  unlockAchievement(id: string): Promise<AchievementEvent>
  getAchievements(): Promise<AchievementEvent[]>
  isAchievementUnlocked(id: string): Promise<boolean>
  triggerMilestone(threshold: number): Promise<void>
  getTriggeredMilestones(): Promise<number[]>
}
```

**成就域监听跨域事件**：

```ts
// 监听学习域事件，检查成就条件
eventBus.on('learning.session_saved', async () => {
  const stats = await learningService.computeStats()
  await checkAchievements(stats)
})
```

---

## 三、事件机制设计

### 3.1 EventBus 接口

```ts
interface DomainEvent<T = unknown> {
  type: string
  payload: T
  timestamp: number
}

interface EventBus {
  emit<T>(event: DomainEvent<T>): void
  on<T>(type: string, handler: (event: DomainEvent<T>) => Promise<void>): void
  off(type: string, handler: Function): void
}
```

### 3.2 本地实现（同步内存事件总线）

```ts
// src/lib/eventBus.ts
class LocalEventBus implements EventBus {
  private handlers = new Map<string, Set<Function>>()

  emit<T>(event: DomainEvent<T>) {
    const hs = this.handlers.get(event.type)
    if (!hs) return
    // 异步顺序执行，不阻塞写入方
    Promise.resolve().then(async () => {
      for (const h of hs) {
        try { await h(event) } catch (e) { console.error(e) }
      }
    })
  }

  on<T>(type: string, handler: (e: DomainEvent<T>) => Promise<void>) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set())
    this.handlers.get(type)!.add(handler)
  }

  off(type: string, handler: Function) {
    this.handlers.get(type)?.delete(handler)
  }
}

export const eventBus = new LocalEventBus()
```

### 3.3 事件流图

```
用户背诵完成
    │
    ▼
LearningService.saveSession()
    │  写入 recitation_sessions
    │
    ├──► emit('learning.session_saved')
    │         │
    │         ├──► ReviewDomain: 初始化或更新调度
    │         │
    │         └──► UserDomain: 检查成就条件
    │
    ▼
返回 RecitationSession（调用方立即可用）

用户复习完成
    │
    ▼
ReviewService.saveReview()
    │  写入 review_sessions + 更新 review_schedules
    │
    └──► emit('review.session_saved')
              │
              └──► UserDomain: 检查复习相关成就
```

### 3.4 未来接入后端时的扩展

```ts
// 只需替换或扩展 EventBus 实现
class HybridEventBus extends LocalEventBus {
  emit<T>(event: DomainEvent<T>) {
    super.emit(event)  // 本地处理
    // 同时推送到后端队列（后台异步，不影响本地 UX）
    syncQueue.push(event)
  }
}
```

---

## 四、Streak 统一方案

### 4.1 唯一数据源

废弃三套 streak 存储，streak 完全从 `recitation_sessions` 实时计算：

```ts
// src/lib/learningStats.ts
export function computeStreak(sessions: RecitationSession[]): number {
  if (sessions.length === 0) return 0

  // 提取所有有背诵记录的日期，去重排序
  const dates = [...new Set(sessions.map(s => s.date))].sort()

  // 从今天往前数连续天数
  const today = formatDate(new Date())
  let streak = 0
  let current = today

  for (let i = dates.length - 1; i >= 0; i--) {
    if (dates[i] === current) {
      streak++
      current = offsetDate(current, -1)
    } else if (dates[i] < current) {
      break
    }
  }

  return streak
}
```

### 4.2 迁移过渡

- 迁移时不删除旧 streak key，但不再写入
- `srs_streak_v2` 迁移后只读，作为"历史最高 streak"参考（可选）
- 所有消费方统一读 `LearningService.getStreakCount()`

### 4.3 "今日是否有背诵"快速判断

不单独存储，从 sessions 查今天的记录：

```ts
const todayActive = sessions.some(s => s.date === today)
```

---

## 五、poem_queue 归属哪个域？

**结论：归属计划域（Plan Domain），不归学习域。**

理由：

1. **语义不同**：`poem_queue` 是用户"打算背什么"的意图列表，学习域的 `recitation_sessions` 是"已经背了什么"的事实记录。意图 ≠ 行为。

2. **生命周期不同**：队列是可编辑、可重排、可清空的；sessions 是只追加的历史。把意图放进学习域会污染不可变性原则。

3. **触发时机不同**：完成队列里一首诗，触发的是学习域的 `saveSession`，队列域本身只更新 `todayComplete` 状态。两者是"触发者"和"被触发者"的关系，不是同一个域的职责。

4. **未来扩展**：计划域未来可以扩展为"学习计划"（周计划、月计划），与 SM-2 调度域并列，而不是嵌套在学习域里。

**poem_queue 与 review_schedules 的区别**：

| 维度 | poem_queue（计划域） | review_schedules（复习域） |
|------|---------------------|--------------------------|
| 来源 | 用户手动添加 | SM-2 算法自动生成 |
| 可编辑 | 是（增删改序） | 否（算法控制） |
| 触发背诵 | 用户主动选择时 | 到期提醒时 |
| 完成后 | 从队列移除 | 更新调度状态 |

---

## 六、本地实现复杂度评估

### 6.1 新增复杂度

| 组件 | 复杂度 | 说明 |
|------|--------|------|
| EventBus | 低 | 30行内存实现，无外部依赖 |
| 域服务层（4个） | 中 | 每个约100~150行，主要是 storage 读写封装 |
| 实时计算 streak/stats | 低-中 | 纯函数，可单独测试 |
| 事件处理器注册 | 低 | App 启动时注册一次 |

### 6.2 vs plan.md（渐进式重构）方案的对比

| 维度 | plan.md 方案 | DDD 方案（本文） |
|------|-------------|----------------|
| 改动范围 | 聚焦于数据 key 整理 | 同时重组代码边界 |
| 实现周期 | 较短（1~2周） | 较长（2~4周） |
| 扩展性 | 中（整理了冗余，但代码耦合仍存在） | 高（域边界清晰，后端接入自然） |
| 风险 | 中（ProgressContext 改动大） | 较高（引入新架构层） |
| 可测试性 | 中 | 高（每个域可独立测试） |
| 迁移路径 | 可分步执行 | 需要先建域服务层再迁移消费方 |

### 6.3 关键复杂度风险点

1. **ProgressContext 的处理**：DDD 方案中 ProgressContext 应变成"应用层聚合服务"，跨域查询学习域+复习域，而不是某个单一域的 Context。这是改动最大的地方。

2. **事件处理器的初始化时机**：必须在任何域服务使用前完成注册，建议在 `App.tsx` 的 `useEffect(() => { registerAllHandlers() }, [])` 中统一注册。

3. **实时计算性能**：`computeStats()` 每次扫描全量 sessions，当背诵记录超过1000条时可能有感知延迟。需要引入内存缓存（`useMemo` 或 `useRef`），或增量更新缓存。

4. **迁移时旧数据的处理**：plan.md 中已有详细迁移方案，DDD 方案复用即可，迁移本身不受架构风格影响。

---

## 七、完整存储 Key 清单（重构后）

### 原始记录（只追加）

| Key | 类型 | 所属域 |
|-----|------|--------|
| `recitation_sessions` | `RecitationSession[]` | 学习域 |
| `review_sessions` | `ReviewSession[]` | 复习域 |
| `achievement_events` | `AchievementEvent[]` | 用户域 |

### 状态文档（更新覆盖）

| Key | 类型 | 所属域 |
|-----|------|--------|
| `review_schedules` | `Record<number, ReviewSchedule>` | 复习域 |
| `poem_queue` | `PoemQueue` | 计划域 |
| `user_profile` | `UserProfile` | 用户域 |
| `milestone_state` | `MilestoneState` | 用户域 |

### 迁移标记

| Key | 含义 |
|-----|------|
| `data_migration_v2` | v2 迁移完成标记 |

### 废弃（迁移后只读，下版本删除）

`poem_progress`, `poem_review_cards`, `poem_memorize_history`, `poem_total_chars`, `poem_streak`, `srs_streak_v2`, `poem_nickname`（合并进 user_profile）, `reminder_time`（合并进 user_profile）

---

## 八、架构师C的主要疑问点

以下是我在设计过程中遇到的、需要与其他架构师或产品对齐的问题：

### 疑问1：用户"重背"一首已调度的诗，复习域如何响应？

当用户主动背一首 level>0 的诗（不是复习提醒触发的），学习域会触发 `learning.session_saved`。复习域监听到后：

- **选项A**：忽略，复习调度不受影响（重背不算复习）
- **选项B**：用 qScore 更新 ef 和 interval（重背等同复习）
- **选项C**：重置 interval 到0（惩罚机制：没等到复习日就背了，说明用户不自信）

这个决策影响 SM-2 算法的语义，需要产品明确。

### 疑问2：ProgressContext 是否保留，还是拆散到各页面？

DDD 方案下，ProgressContext 本质上是"应用层聚合"，混合了学习域+复习域+用户域的数据。

- **保留 ProgressContext**：对外接口不变，各消费页面零改动，但 Context 内部变成跨域查询，职责仍然混乱。
- **拆散到各页面**：各页面直接调对应域服务，职责清晰，但改动面更大，短期风险高。

建议保留 ProgressContext 作为过渡，内部逐步委托到域服务，最终版本再拆散。

### 疑问3：实时计算的性能边界在哪里？

`computeStats()` 全量扫描 sessions 的方案，在以下场景需要评估：
- 重度用户每天背1首，1年约365条，5年约1825条 → 可接受
- 若未来支持导入历史数据（批量导入数千条）→ 需要分页或索引

建议：当 sessions 超过500条时，启用增量缓存；或在 IndexedDB 层加时间范围索引。

### 疑问4：事件处理失败时的一致性保证？

本地 EventBus 的事件处理是"fire and forget"（异步，不等待结果）。如果 `review.initSchedule` 失败（存储写入失败），学习记录已写但复习调度未初始化，下次进入会怎样？

- 目前 plan.md 方案不存在此问题（写入逻辑在同一函数内）
- DDD 方案需要决定：是否需要"至少一次"语义（失败后重试），还是接受最终一致性（下次触发同域事件时补偿）

本地 PWA 场景下，存储失败概率极低，接受最终一致性可能是合理的，但需要明确。

### 疑问5：计划域的 streak_count 去掉后，"今日计划完成"的激励怎么做？

原来 `poem_queue.streak_count` 给用户展示"连续完成计划 N 天"，去掉后这个激励消失了。

- 如果产品认为"完成每日计划的连续天数"与"有背诵记录的连续天数"是同一个东西 → 统一用学习域 streak
- 如果产品认为两者不同（完成计划更严格）→ 计划域需要保留自己的 streak 计算

这个决策影响计划域的复杂度。
