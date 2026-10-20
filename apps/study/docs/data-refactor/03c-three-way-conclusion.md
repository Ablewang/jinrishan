# 三方讨论综合结论

> 参与者：架构师 A（极简原始记录派）、架构师 B（务实缓存派）、架构师 C（DDD 领域驱动派）  
> 时间：2026-10-20  
> 本文是所有讨论文件的最终汇总，给决策者直接参考。

---

## 一、三方共识（无争议）

以下内容三方完全一致，不存在分歧：

### 数据层

| 结论 | 说明 |
|------|------|
| `recitation_sessions` 保留，补 `charCount` 字段 | append-only，永不删除 |
| 新增 `review_sessions` | append-only，每次复习写一条，解决无复习历史的问题 |
| 废弃 `poem_progress` | 从 recitation_sessions 实时计算 memorized/bestStars |
| 废弃 `poem_review_cards` | 有写入 bug，被 review_sessions + review_schedules 替代 |
| 废弃 `poem_memorize_history` | 是 recitation_sessions 的截断子集，直接查询替代 |
| 废弃 `poem_total_chars` | 从 recitation_sessions.charCount 实时求和 |
| 废弃三套 streak | poem_streak / srs_streak_v2 / poem_queue.streak_count 全部废弃，改为实时计算 |
| `poem_queue` 保留，去掉 `streak_count` | 是用户意图数据，不是统计数据，合理保留 |
| `user_profile` 合并零散 key | 合并 poem_nickname / reminder_time / onboardingDone |
| `poem_achievement_dates` 改为 `achievement_events` 追加记录 | C 方案提议，三方认可，保留解锁历史 |

### 统计计算方式

所有统计数据在内存中实时计算，不落盘存储：

| 统计项 | 计算来源 |
|--------|---------|
| 已背诵首数 | recitation_sessions distinct poemId |
| bestStars | recitation_sessions 中该诗 max(stars) |
| 累计字数 | 每首诗首次 session 的 charCount 求和 |
| 连续天数 | recitation + review sessions distinct date 从今往前计算 |
| 热力图 | 按 date 聚合两张 sessions 表 |
| 已掌握数 / 难诗排行 | 从 review_sessions 重算 SM-2 状态后查询 |

### 代码层

| 结论 | 说明 |
|------|------|
| `handleReciteDone` 不再调 `markReviewed` | 背诵和复习写入逻辑彻底拆分 |
| `ProgressContext` 对外接口不变 | 内部改为从 sessions 实时计算，消费方零改动 |
| `storageMonitor.pruneOldSessions` 废弃 | IndexedDB 不需要裁剪，该函数直接删除 |

---

## 二、核心分歧及裁决

### 分歧1：SM-2 状态要不要缓存（A vs B/C）

**A 的立场**：废弃 review_schedules，SM-2 状态从 review_sessions 历史序列实时重算。

**B/C 的立场**：保留 review_schedules（或等价的缓存表）作为 SM-2 当前状态。

**分析**：

- A 方案的重算开销：重度用户 200 首 × 20 次 = 4000 次迭代，useMemo 保证只在数据变化时重算，不是每次渲染都算，实际性能无问题。
- B/C 方案的迁移优势：旧 review_schedules 的 ef/interval 可以直接保留，用户复习进度不会因迁移而重置。
- A 方案的迁移代价：旧数据只能生成虚拟 review_session（qScore 统一设为 4），SM-2 状态有轻微偏差，部分用户复习间隔可能变化。

**裁决：保留 review_schedules 作为过渡表（倾向 B/C）**

理由：用户已有的复习进度（ef/interval）是真实学习数据，迁移时人为引入偏差不可接受。review_schedules 在迁移后变为只读，新写入路径不再更新它，下个版本（v3 清理期）删除。如果实测首次加载超过 100ms，可在 review_sessions 末尾加可选的 `sm2Snapshot` 字段作为断点重算起点，无需引入整张缓存表。

---

### 分歧2：是否引入 EventBus（C vs A/B）

**C 的立场**：通过 EventBus 解耦学习域、复习域、用户域，让背诵完成后的各类响应逻辑互不干扰。

**A/B 的立场**：EventBus 在本项目当前阶段属于过度设计，直接调用更清晰，且 fire-and-forget 语义引入了新的不一致风险。

**C 的修正**：接受"EventBus 应该是同步/可等待的"，如果做成可等待的，和直接调用的区别只剩"是否隐藏调用关系"。

**裁决：不引入 EventBus，采用应用层协调函数替代（A/B 立场）**

理由：
1. fire-and-forget 语义下，initReviewSchedule 失败不会报错，用户无法收到复习提醒，这是静默数据丢失，不可接受。
2. 可等待的 EventBus 与直接调用在功能上等价，但增加了概念层和代码跳转成本。
3. 当前需要响应背诵完成的只有两件事（初始化复习调度、检查成就），直接调用两个函数即可。

**替代方案：应用层协调函数**（A/C 协商结果）

```ts
// src/hooks/useRecitation.ts（或独立的 reciteFlow.ts）
async function handleReciteDone(poemId: number, result: ReciteResult) {
  // 1. 写入背诵记录
  const session = await saveRecitationSession({ poemId, ...result })

  // 2. 初始化或更新复习调度（直接调用，可 await，失败可感知）
  await initOrUpdateSrsSchedule(session)

  // 3. 检查并解锁成就（直接调用，不依赖 React 渲染层）
  await checkAndUnlockAchievements()

  return session
}
```

此结构：调用链路清晰可追踪、失败可感知、不依赖 React 渲染层、未来需要添加新响应逻辑时改一个地方。

---

### 分歧3：是否引入域服务类（C vs A/B）

**C 的立场**：四个域服务（LearningService、ReviewService 等）提升可测试性和边界清晰度。

**A 的立场**：React 项目里 Service 类是反模式，hook + 纯函数已够用。

**C 的修正**：接受"以 interface 为主，不强制要求 Service 类实现"。

**裁决：不引入 Service 类，以 TypeScript interface + hook 实现域边界（折中）**

具体做法：
- 在 `src/types/services.ts` 里定义域接口（LearningService、ReviewService 的方法签名），作为约束和文档
- 实现侧用 hook（`useRecitation`、`useSrs` 等），不建 Class
- 文件目录按域组织（`src/features/learning/`、`src/features/review/` 等），通过目录边界体现域划分

---

## 三、最终数据结构

### 保留的表

| 表名 | 类型 | 说明 |
|------|------|------|
| `recitation_sessions` | append-only | 背诵事实，永不删除，补 charCount/hintCount 字段 |
| `review_sessions` | append-only | 复习事实，新建，每次复习追加一条 |
| `review_schedules` | 过渡只读 | SM-2 状态，迁移后不再写入，v3 删除 |
| `poem_queue` | 可变文档 | 用户手动计划，去掉 streak_count |
| `user_profile` | 可变文档 | 合并 poem_nickname / reminder_time / onboardingDone |
| `achievement_events` | append-only | 成就解锁历史（替代 poem_achievement_dates） |
| `milestone_state` | 可变文档 | 里程碑触发状态（原 poem_milestone_triggered） |

### 废弃的表（迁移后只读，v3 删除）

`poem_progress` / `poem_review_cards` / `poem_memorize_history` / `poem_total_chars` / `poem_streak` / `srs_streak_v2` / `poem_nickname` / `reminder_time` / `poem_onboarding_done` / `poem_achievement_dates`

---

## 四、仍然未解决的疑问点

以下问题三方讨论后仍未能给出确定答案，需要产品/开发侧确认：

### 疑问1：用户"重背"已调度诗时，复习域如何响应？（需产品决策）

用户主动背一首 level > 0 的诗（不是复习提醒触发的），应该：
- **选项A**：忽略，复习调度不受影响（重背不算复习）
- **选项B**：用 qScore 更新 ef/interval（重背等同一次复习）
- **选项C**：重置 interval（惩罚机制）

三种语义对 SM-2 效果影响显著。**当前代码行为是选项B（markMemorized 同时调了 markReviewed），建议产品确认是否符合预期。**

---

### 疑问2：streak 的"今天"边界语义（需产品确认）

`computeStreak` 从今天往前计算，但如果今天还没学习（凌晨刚打开），昨天有记录，streak 应该显示昨天的连续数（不归零）还是 0？

当前 `srs_streak_v2` 的行为是：lastActivityDate = 昨天时，count 照常显示不归零。

**建议保持这个语义**：streak = "截至昨天的连续天数，今天有记录则 +1"，而不是"今天没记录就归零"。需确认。

---

### 疑问3：成就"连续天数"阈值的计算口径（需产品确认）

`useAchievements` 当前用 `poem_streak`（仅背诵触发）计算成就。重构后 streak 定义改为"背诵或复习任意一项发生的天"（A/B 第二轮讨论结论）。

**边界情况**：某个用户迁移前 streak=7（靠每天背诵积累），迁移后新定义下 streak 可能变为 8 或 9（因为有些天只复习也被计入）。可能触发原本还没触发的成就。

这是预期行为（更宽松的口径，用户受益），还是需要保持严格的"背诵天"定义？**需要产品确认。**

---

### 疑问4：首次背诵后，诗何时出现在"待复习"列表？（需产品确认）

背诵完成后写第一条 review_session，SM-2 初始状态计算出 nextDue。

- nextDue = today：今天背，今天就出现在待复习（同天循环，可能不是预期行为）
- nextDue = today + 1：明天才出现（更符合"间隔复习"语义）

**建议：nextDue = today + 1**，但需要产品确认。

---

### 疑问5：`charCount` 的计算口径（需开发确认）

recitation_sessions 新增的 `charCount` 需要在写入时从诗歌数据取。需确认：

1. 诗歌数据是静态 JSON 还是 IndexedDB？如果是异步 IDB，写 session 时需先 await
2. charCount 定义：只算汉字，还是包含标点？"总字数 1234 字"展示给用户时，是哪个数字？

---

### 疑问6：`poem_achievement_shown` / `poem_checkin` 等废弃 key（需开发确认）

这些 key 在 MIGRATE_KEYS 中存在但找不到读写代码，疑似废弃。迁移时可以直接丢弃吗？还是有老版本用户依赖这些数据？

---

## 五、实施顺序建议

基于三方讨论最终结论，建议实施顺序如下：

| 步骤 | 文件 | 说明 |
|------|------|------|
| 1 | `src/types/storage.ts`（新建） | 定义 RecitationSession（加 charCount/hintCount）、ReviewSession、UserProfile、AchievementEvent |
| 2 | `src/lib/migration.ts` | 新增 migrateToV2：补 charCount、迁移 achievement_events、合并 user_profile；review_schedules 保留只读 |
| 3 | `src/hooks/useRecitation.ts` | saveResult 补 charCount；新增 saveReviewResult；去掉 streak 写入 |
| 4 | `src/pages/PoemDetail.tsx` | handleReciteDone 不再调 markReviewed；复习完成调 saveReviewResult |
| 5 | `src/contexts/ProgressContext.tsx` | 内部改为从 sessions 实时计算；对外接口不变；废弃 poem_progress / poem_review_cards 读写 |
| 6 | `src/lib/stats.ts`（新建） | 统一导出 computeStreak、getTotalChars、getTotalMemorized 等纯函数 |
| 7 | `src/hooks/useAchievements.ts` | streak 来源改为 stats.ts 的统一函数 |
| 8 | `src/hooks/useQueue.ts` | 去掉内部 streak_count |
| 9 | `src/components/HeatmapChart.tsx` | 复习列表改读 review_sessions |
| 10 | `src/lib/weeklyReport.ts` | 数据来源简化为 recitation_sessions + review_sessions + review_schedules |
| 11 | 清理（v3） | 删除废弃 key 的所有读写代码 |

---

*讨论文件索引：research.md → plan.md → arch-a-minimal.md → arch-b-pragmatic.md → architect-c-ddd.md → discussion.md → discussion-conclusion.md → arch-a-review-of-c.md → arch-c-response-to-a.md → arch-a-final-response.md → three-way-conclusion.md（本文）*
