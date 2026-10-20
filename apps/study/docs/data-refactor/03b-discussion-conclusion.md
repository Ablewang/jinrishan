# 数据架构重构：最终设计结论

> 首席架构师综合方案 A（极简原始记录派）、方案 B（原始记录+物化缓存派）、方案 C（领域驱动设计派）及六份交叉评审后的最终裁决。
> 日期：2026-10-20

---

## 一、推荐方案：A/B 融合方案（务实极简派）

不完全采用任何单一方案，而是融合 A 的极简原则和 B 的迁移务实性，同时吸收 C 的若干具体改进点。

**核心原则：**
- 原始记录（recitation_sessions + review_sessions）是唯一事实来源，append-only，永不删除
- 统计数据一律在内存中实时计算，不落盘
- SM-2 调度状态保留缓存表（srs_schedules），但写入路径严格管控，启动时做一致性校验
- 不引入 EventBus，不建 Service 类，用应用层协调函数替代
- 对外接口（ProgressContext）保持不变，消费方零改动

---

## 二、完整表设计

### 2.1 保留表（source of truth）

#### recitation_sessions — 背诵原始记录

```ts
interface RecitationSession {
  id: string           // `${poemId}_${date}_${timestamp}`
  poemId: number
  mode: 'parent' | 'child'
  date: string         // YYYY-MM-DD，本地时间
  timestamp: number    // Unix ms
  charCount: number    // 含标点的汉字数，写入时从诗歌数据取
  stars: number        // 1 | 2 | 3
  hintCount: number    // 提示次数
  passRate: number     // 通过句子比例 0~1
  qScore: number       // SM-2 质量分 0~5
  lines: LineResult[]  // 每句结果
}

interface LineResult {
  lineIndex: number
  passed: boolean
  hintUsed: boolean
}
```

用途：已背首数、bestStars、累计字数、热力图、时段统计、周报、streak（part）。  
约束：append-only，禁止 update/delete。

---

#### review_sessions — 复习原始记录（新建）

```ts
interface ReviewSession {
  id: string           // `review_${poemId}_${timestamp}`
  poemId: number
  date: string         // YYYY-MM-DD
  timestamp: number
  passed: boolean
  qScore: number       // passed ? 4 : 2，未来可细化
  intervalUsed: number // 本次实际间隔天数；首次背诵后写入时填 0
  efBefore: number     // 复习前 ef 快照；首次写入时填 2.5
  hintCount?: number   // 可选，预留字段，当前复习界面无此数据
}
```

用途：SM-2 状态重算（可审计）、热力图复习详情、复习历史。  
约束：append-only，禁止 update/delete。  
说明：`intervalUsed` 和 `efBefore` 两个字段让 SM-2 状态可从历史完整重建，同时为未来废弃 srs_schedules 保留退路。

---

#### srs_schedules — SM-2 调度状态缓存

```ts
interface SrsSchedule {
  poemId: number
  ef: number           // 难度因子，初始 2.5
  interval: number     // 当前间隔天数
  repetitions: number  // 已复习次数
  nextDue: string      // YYYY-MM-DD，下次应复习日期
  lastReviewDate: string
  totalReviews: number
  firstLearnedDate: string
}
```

用途：今日待复习列表（O(n) 直读，无需重算）、难诗排行、已掌握数。  
约束：每次写 review_session 后同步 update in place；App 启动时做一致性校验（见第五节）。  
迁移来源：直接从现有 review_schedules 迁移，字段一一对应，ef/interval/repetitions/nextDue 全部保留，用户复习进度无损。

---

#### achievement_events — 成就解锁历史（替代 poem_achievement_dates）

```ts
interface AchievementEvent {
  id: string           // `ach_${achievementId}_${timestamp}`
  achievementId: string
  unlockedAt: string   // ISO8601
}
```

用途：成就页展示已解锁成就及解锁时间。  
约束：append-only；解锁后不重复写入（检查 achievementId 是否已存在）。  
改进说明：相比原有 `poem_achievement_dates`（Record 结构），改为追加记录保留完整解锁历史，成本极低，且支持未来撤销/重放。

---

### 2.2 配置表（可变文档）

#### poem_queue — 手动背诵计划队列

```ts
interface QueueStore {
  queue: number[]          // poemId 有序列表
  last_complete_date: string
  today_complete: boolean
}
// 删除原有 streak_count 字段
```

#### user_profile — 用户配置（合并三个散 key）

```ts
interface UserProfile {
  nickname: string
  reminderTime?: string    // HH:MM
  createdAt: string
  onboardingDone?: boolean
}
// 合并来源：poem_nickname + reminder_time + poem_onboarding_done
```

#### milestone_state — 里程碑触发状态

```ts
interface MilestoneState {
  triggered: number[]      // 已触发的里程碑 id 列表
}
// 原 poem_milestone_triggered，归入配置域统一管理
```

---

### 2.3 废弃表（迁移后只读，v3 清理期删除）

| 废弃 Key | 替代方案 |
|---------|---------|
| `poem_progress` | recitation_sessions 实时计算 memorized/bestStars |
| `poem_review_cards` | 有 lastDate bug，被 review_sessions + srs_schedules 替代 |
| `poem_memorize_history` | 从 recitation_sessions 查最近 N 条 |
| `poem_total_chars` | 从 recitation_sessions.charCount 求和 |
| `poem_streak` | 统一由 stats.ts 实时计算 |
| `srs_streak_v2` | 同上 |
| `poem_nickname` | 合并进 user_profile |
| `reminder_time` | 合并进 user_profile |
| `poem_onboarding_done` | 合并进 user_profile |
| `poem_achievement_dates` | 被 achievement_events 替代 |
| `review_schedules`（原始 key） | 被 srs_schedules 替代（迁移后重命名） |
| `poem_achievement_shown` / `poem_checkin` / `poem_onboarding_step` | 无读写代码，迁移时直接丢弃 |

---

## 三、统计数据计算方式

所有统计数据在 React 内存中用 `useMemo` 计算，不写入 IndexedDB。启动时一次性加载两张 sessions 表，页面切换时不重复查 IDB。

| 统计项 | 计算来源 | 复杂度 |
|--------|---------|--------|
| 已背诵首数 | recitation_sessions distinct poemId | O(n) |
| 是否已背某首诗 | poemId 在 memorized Set 中查找 | O(1) |
| bestStars | 该诗 recitation_sessions 中 max(stars) | O(n) |
| 累计字数 | 每首诗首次 session 的 charCount 求和 | O(n) |
| 连续天数 | recitation + review sessions distinct date 从今天往前计算 | O(d) |
| 今日待复习列表 | srs_schedules 扫描 nextDue <= today | O(p) |
| 已掌握数 | srs_schedules where repetitions >= 5 或 interval >= 21 | O(p) |
| 难诗排行 | srs_schedules order by ef asc | O(p) |
| 热力图 | 按 date 聚合 recitation_sessions + review_sessions | O(n) |
| 背诵最佳时段 | recitation_sessions 按小时聚合 | O(n) |
| 周报 | recitation_sessions + review_sessions 按周过滤 | O(n) |

n = sessions 总条数，d = 有记录的天数，p = 诗首数（srs_schedules 行数）  
重度用户（坚持1年）估算：n < 1500，p < 300，d < 365，所有计算 < 10ms。

今日待复习列表直接读 srs_schedules（O(p)，约几百条），不走 review_sessions 重算，首页加载路径最短。

---

## 四、核心决策理由

### 决策1：保留 srs_schedules 作为长期缓存（采用 B 立场，否决 A 的极简主义）

A 方案主张废弃 srs_schedules，SM-2 全部从 review_sessions 重算。B 评审指出两个不可忽视的问题：

1. **迁移精度**：旧 review_schedules 包含用户真实的 ef/interval/repetitions/nextDue，无法从单条虚拟 review_session 精确还原。A 方案下迁移当天用户会看到本来三周后才到期的诗突然出现在待复习列表——这是不可接受的退步体验。B 方案直接迁移 review_schedules → srs_schedules，100% 无损。

2. **首页加载路径**：review_sessions 全量加载（2年+用户可达 10000 条）的 IDB 反序列化本身需要 80-200ms，而 srs_schedules 仅数百条，读取 < 10ms。useMemo 确实能避免重复计算，但无法消除冷启动时的 IO 成本。

保留 srs_schedules 的代价是复习时需要双写（review_session + srs_schedules update），但有成熟的 fallback 方案（见第五节），整体风险可控。

同时，review_sessions 保留 `intervalUsed` + `efBefore` 字段，确保 SM-2 状态在技术上仍可从记录完整重建，保留可审计性，并为未来废弃 srs_schedules 保留退路。

### 决策2：背诵完成后立即写第一条 review_session（SM-2 起点）

背诵完成后，handleReciteDone 写入两条记录：
1. recitation_session（背诵事实）
2. review_session（SM-2 起点，intervalUsed=0，efBefore=2.5，nextDue=today+1）

nextDue 设为 today+1 而非 today，避免用户当天背完立刻看到该诗出现在待复习列表的奇怪体验。  
这个写入不通过 markReviewed 触发，handleReciteDone 和复习流程彻底解耦。

### 决策3：streak 统一定义为"学习天"（背诵 OR 复习任意一项发生）

废弃三套 streak，统一用 `computeStreak(recitationDates, reviewDates)` 从两张表的 date union 实时计算。

原因：纯"背诵天"定义对重度老用户不公平——进入以复习为主阶段后，每天只复习不背新诗，streak 会误断。"学习天"的定义更准确，对用户更友好。

streak 边界语义：今天没有记录但昨天有，显示昨天的连续数（不归零），等今天有记录后 +1。这与现有 srs_streak_v2 行为一致。

### 决策4：不引入 EventBus，采用应用层协调函数

C 方案提出用 EventBus 解耦各域，A/B 均反对。最终理由：

- fire-and-forget 语义导致 initReviewSchedule 失败时静默丢失，用户永远收不到复习提醒，不可接受
- 可等待的 EventBus 与直接调用功能等价，只增加概念层和调试成本
- 当前只有两个后续动作（初始化复习调度 + 检查成就），直接 await 两个函数即可

采用应用层协调函数替代：

```ts
// src/hooks/useRecitation.ts 或独立的 reciteFlow.ts
async function handleReciteDone(poemId: number, result: ReciteResult) {
  const session = await saveRecitationSession({ poemId, ...result })
  await initSrsSchedule(session)       // 写第一条 review_session + 初始化 srs_schedules
  await checkAndUnlockAchievements()   // 检查并解锁成就
  return session
}
```

### 决策5：不建 poem_states 物化缓存表

IndexedDB 适配层当前不支持多 key 事务，poem_states 需要在每次写 recitation_session 或 review_session 时同步更新多个字段，崩溃时会造成原始记录和缓存不一致，引入的复杂度高于收益。所有背诵统计数据一律在内存中用 useMemo 计算。

### 决策6：achievement_events 改为 append-only 追加记录

来自 C 方案的具体改进。成本极低（每条只有 achievementId + timestamp），收益是保留完整解锁历史，支持未来审计和回放。原有 poem_achievement_dates（Record 结构）的信息量是其子集。

### 决策7：不引入 Service 类，以 interface + hook 体现域边界

采用 C 方案的域划分思想，但不引入 Class。  
具体做法：src/types/services.ts 定义各域方法签名（作为约束和文档），实现侧用 hook 和纯函数，文件目录按域组织（src/features/learning/、src/features/review/ 等）。

---

## 五、迁移路径

### 5.1 迁移函数（App 启动时运行 migrateToV3）

迁移幂等，通过 `data_migration_v3='done'` 标记防止重复执行。

**Step 1 — recitation_sessions 补字段**  
遍历现有 recitation_sessions，为缺少 charCount/hintCount 的旧记录从诗歌数据查询补填。

**Step 2 — 迁移 srs_schedules**  
将现有 `review_schedules` 原样迁移为 `srs_schedules`，字段映射如下：
- ef → ef
- interval → interval
- totalSessions → repetitions（近似，可接受）
- nextDue → nextDue
- lastDate → lastReviewDate
- firstLearnedDate → firstLearnedDate（若无则填迁移日期）

**Step 3 — 生成虚拟 review_sessions**  
对 srs_schedules 中每首诗，生成1条虚拟 review_session 作为 SM-2 历史起点：
- date = lastReviewDate（或迁移日期）
- passed = true
- qScore = 4
- intervalUsed = 0（历史未知，保守设0）
- efBefore = 2.5（历史未知，初始值）

迁移后在控制台输出迁移摘要，对每首诗对比新旧 nextDue，差值 > 7 天的记录为 migration_warnings。

**Step 4 — 迁移 achievement_events**  
将 poem_achievement_dates（Record<id, timestamp>）转换为 achievement_events 数组，每条生成一个 AchievementEvent 记录。

**Step 5 — 合并 user_profile**  
从 poem_nickname、reminder_time、poem_onboarding_done 合并生成 user_profile 文档。

**Step 6 — 废弃 key 清理标记**  
poem_onboarding_step、poem_checkin、poem_achievement_shown 在迁移记录中标注为已丢弃。

### 5.2 启动时一致性校验

每次 App 启动（不仅迁移时）执行以下校验：

```ts
for (const schedule of srsSchedules) {
  const latestReview = getLatestReviewSession(schedule.poemId)
  if (latestReview && latestReview.date > schedule.lastReviewDate) {
    // srs_schedules 落后于 review_sessions，说明上次双写时第二步失败
    // 用最新 review_session 重算 SM-2 并修复 srs_schedules
    await rebuildSrsSchedule(schedule.poemId)
  }
}
```

实现成本约 50 行，只在启动时跑一次，处理双写失败的极低概率场景。

### 5.3 review_sessions 懒加载

首屏加载路径：只读 recitation_sessions + srs_schedules（约几百条），渲染完成后异步加载 review_sessions。今日待复习列表来自 srs_schedules，不依赖 review_sessions，首屏不阻塞。

### 5.4 废弃 key 的读写保护

迁移完成后，在 storage 适配层对废弃 key 的写操作加 console.warn 拦截：

```ts
// 仅对已废弃 key 添加警告
const DEPRECATED_KEYS = ['poem_progress', 'poem_review_cards', 'poem_streak', ...]
storage.set = (key, value) => {
  if (DEPRECATED_KEYS.includes(key)) {
    console.warn(`[storage] 写入已废弃 key: ${key}，请迁移到新数据结构`)
  }
  return originalSet(key, value)
}
```

### 5.5 实施顺序

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | src/types/storage.ts（新建） | RecitationSession（加 charCount/hintCount）、ReviewSession（加 intervalUsed/efBefore）、SrsSchedule、AchievementEvent、UserProfile |
| 2 | src/lib/stats.ts（新建） | computeStreak（recitation + review union dates）、getTotalMemorized、getTotalChars，全站统一使用 |
| 3 | src/lib/migration.ts | 新增 migrateToV3，5步迁移逻辑，输出 migration_warnings |
| 4 | src/hooks/useRecitation.ts | saveResult 补 charCount/hintCount；新增 saveReviewResult；去掉 streak 写入 |
| 5 | src/pages/PoemDetail.tsx | handleReciteDone 不再调 markReviewed；复习完成调 saveReviewResult |
| 6 | src/contexts/ProgressContext.tsx | 内部改为从 sessions + srs_schedules 实时计算；对外接口不变；清理 todayDueFromA |
| 7 | src/hooks/useAchievements.ts | streak 来源改为 stats.ts 的 computeStreak |
| 8 | src/hooks/useQueue.ts | 去掉内部 streak_count |
| 9 | src/components/HeatmapChart.tsx | 复习列表改读 review_sessions |
| 10 | src/lib/weeklyReport.ts | 数据来源简化 |
| 11 | v3 清理期 | 删除废弃 key 的所有读写代码，删除 storageMonitor.pruneOldSessions |

---

## 六、仍存在争议/需向业务方确认的疑问点

### 疑问1（需产品决策）：用户"重背"已调度诗时，SM-2 如何响应？

用户主动背一首 repetitions > 0 的诗（不是复习提醒触发的）：
- **选项A：忽略**（重背不算复习，srs_schedules 不变）——当前代码实际上是选项B
- **选项B：用 qScore 更新 ef/interval**（重背等同一次复习）
- **选项C：重置 interval**（惩罚机制）

三种语义对 SM-2 效果影响显著。**当前 handleReciteDone 同时调了 markReviewed，实际上是选项B，但这是设计意图还是 bug？需要产品明确。**

建议：选项A（忽略），背诵和复习在产品上是两件事，不应混淆。

---

### 疑问2（需产品决策）：成就系统"连续天数"的计算口径

新 streak = 学习天（背诵 OR 复习），原 streak = 背诵天。  
成就"连续7天"等阈值，迁移后口径变宽，部分用户可能因此触发原本未触发的成就。

- 预期行为（口径变宽对用户有利，接受）？
- 还是需要保持严格的"背诵天"定义，成就单独用 computeRecitationStreak？

**建议：统一改为学习天，成就定义同步更新，在迁移说明里注明。但必须产品确认。**

---

### 疑问3（需产品决策）：首次背诵后，诗何时出现在"待复习"列表？

背诵完成后写第一条 review_session，nextDue 设为 today 还是 today+1？

- today：当天背完当天就出现在待复习（同天循环）
- today+1：明天才出现，符合"间隔复习"语义

**建议：today+1。需确认与现有 poem_review_cards 初始化行为一致。**

---

### 疑问4（需开发确认）：charCount 的计算口径和来源

1. 诗歌数据是静态 JSON 还是 IDB？如果是 IDB，写 recitation_session 时需先 await 查询
2. charCount 定义：只算汉字，还是含标点？

**建议：含标点。展示"已背 1234 字"时含标点数字更大，正反馈更强。需在 getPoemCharCount 函数里统一注释。**

---

### 疑问5（需开发确认）：废弃 key 处置

`poem_achievement_shown`、`poem_checkin`、`poem_onboarding_step` 在 MIGRATE_KEYS 中存在但无读写代码，疑似废弃。迁移时可直接丢弃吗？还是有老版本用户依赖这些数据？

**建议：直接丢弃，在迁移函数里加注释说明原因。**

---

### 疑问6（技术决策，可内部确认）：srs_schedules 双写失败的 fallback 是否实现？

概率极低（IDB 写失败），但实现简单（~50行），建议在 App 启动时加一致性校验。  
具体见第五节 5.2。**决策倾向于实现，成本低、收益确定。**

---

### 疑问7（技术决策，可内部确认）：ProgressContext.todayDueFromA 是否清理？

该字段恒为 null（USE_SYSTEM_A=false），对下游无影响但会让维护者困惑。  
**建议：重构 ProgressContext 时顺手删掉，不对外暴露恒为 null 的字段。**

---

*参考文件：research.md → plan.md → arch-a-minimal.md → arch-b-pragmatic.md → architect-c-ddd.md → discussion.md → arch-b-review-of-a.md → arch-c-review-of-a.md → arch-a-review-of-c.md → three-way-conclusion.md*
