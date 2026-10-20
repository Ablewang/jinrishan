# 数据架构重构实施计划

## 1. 当前关键代码逻辑梳理

### SM-2 算法（spacedRepetition.ts）

**qScore 计算（calcQScore）**：
- 每句按 passed/hintCount 分为 clean(0提示)/hinted(1提示)/full_hint(2提示)/failed
- full_hint 和 failed 合并为"硬失败"
- hardFailRate > 0.5 → qScore=0；> 0.2 → 1；> 0 → 2
- softHintRate > 0.3 → 3；> 0 → 4；全清 → 5

**updateSchedule**：
- 首次（prev=null）：按 qScore 设初始 interval（1/2/3天），ef=2.5
- 后续：q<3 失败，repetition-1，interval 重置；q>=3 按标准 SM-2 公式更新 ef 和 interval
- 字段：poemId/ef/interval/repetition/nextReviewDate/lastSessionId/totalSessions/bestStars

**注意**：当前 `ReviewSchedule` 有 `repetition`、`nextReviewDate`、`lastSessionId`、`bestStars` 字段，新的 `srs_schedules` 要重命名部分字段。

---

### useRecitation.saveResult 完整流程

```
saveResult(poemId, mode, lines, date)
  1. buildSession() → 生成 RecitationSession（含 qScore/stars/hintRate/passRate）
  2. loadSessions() → push → saveSessions()   // 写 recitation_sessions
  3. loadSchedules() → updateSchedule() → saveSchedules()  // 写 review_schedules
  4. updateSrsStreak(date) → storage.set('srs_streak_v2')  // 写 streak
  5. return session
```

**问题**：streak 在这里写一次，ProgressContext.markMemorized 又写一次（`poem_streak`），两套并存。

---

### ProgressContext.markMemorized 完整流程

```
markMemorized(id, stars, charCount, noHintPass)
  1. setProgress → saveProgress('poem_progress')     // 写聚合状态
  2. setReviewCards → saveReviewCards('poem_review_cards')  // 新建/更新 reviewCard，lastDate=today
  3. setMemorizeHistory → saveHistory('poem_memorize_history')  // 写最近20条
  4. loadStreak → saveStreak('poem_streak')           // 写旧 streak
```

**问题**：第2步在背诵时就设置 `lastDate=today`，导致复习列表误判。

---

### ProgressContext.markReviewed 完整流程

```
markReviewed(id, passed)
  更新 poem_review_cards 中该诗的 level/due/lastDate/passCount
  使用固定 INTERVALS=[1,3,7,15,30]，与 SM-2（review_schedules）完全独立
```

**问题**：这是一套独立的简单复习系统，与 useRecitation 的 SM-2 系统并行，逻辑不同。

---

### PoemDetail.handleMemorized（MemorizeMode 完成时）

```
handleMemorized(stars, charCount, noHintPass)
  1. markMemorized(poem.id, stars, charCount, noHintPass)  // 写 poem_progress/review_cards/history/streak
  2. completePoem(poem.id)  // 更新 poem_queue
  // 注意：不调用 saveResult，不写 recitation_sessions，不更新 srs_schedules
```

---

### PoemDetail.handleReciteDone（背一背/家长测完成时）

```
handleReciteDone(lines)
  1. saveResult(poem.id, reciteMode, lines, today)  // 写 recitation_sessions + review_schedules + srs_streak_v2
  2. getSchedule(poem.id) → updateSchedule()        // 重算 interval（仅用于显示，不再写入）
  3. markMemorized(poem.id, stars, charCount, noHintPass)  // 写 poem_progress + poem_review_cards + history + poem_streak
  4. markReviewed(poem.id, stars >= 2)              // 写 poem_review_cards（level/due/lastDate）
```

**问题**：
- 步骤1已经更新了 review_schedules，步骤2再算一次 updated.interval 只是为了显示
- 步骤3+4 写的 poem_review_cards 与步骤1写的 review_schedules 是两套独立系统
- 步骤4的 markReviewed 导致 lastDate=today，与背诵记录混淆

---

### dailyPlan.buildDailyPlan

```
依赖：
  - review_schedules：找 nextReviewDate <= today 的诗（待复习）
  - recitation_sessions：找近7天有记录的诗（排除难诗重复练习）
  - queue（参数传入）：手动背诗计划

输出：reviewIds（最多3首）/ newPoemId / hardPoemId
```

---

### Home.tsx 待复习列表

```
todayDueReviews = reviewCards.filter(c => c.level < 5 && c.due <= today)
  来自 ProgressContext，读的是 poem_review_cards（旧系统）

plan.reviewIds
  来自 buildDailyPlan，读的是 review_schedules（SM-2 系统）
```

**问题**：Home 的"今日复习"卡片用的是 `plan.reviewIds`（SM-2），底部 tab 的"待复习"列表用的是 `reviewCards`（poem_review_cards），两个来源不一样。

---

## 2. 迁移数据映射

### recitation_sessions（旧→新）

| 旧字段 | 新字段 | 处理 |
|--------|--------|------|
| id | id | 保留；若缺失补 `${poemId}_${timestamp}` |
| poemId | poemId | 保留 |
| mode ('parent'\|'child') | mode ('memorize'\|'review') | **重命名**：parent/child → memorize；复习触发的 → review |
| date | date | 保留 |
| timestamp | timestamp | 保留 |
| lines | lines | 保留 |
| stars | stars | 保留 |
| hintRate | hintRate | 保留 |
| passRate | passRate | 保留 |
| qScore | qScore | 保留 |
| （缺失）| charCount | 补 0（旧数据无此字段）|

**mode 判断**：旧数据 mode 为 'parent'/'child'，统一改为 'memorize'。未来背诵触发的写 'memorize'，复习触发的写 'review'。

---

### review_schedules → srs_schedules

| 旧字段 | 新字段 | 处理 |
|--------|--------|------|
| poemId | poemId | 保留 |
| ef | ef | 保留 |
| interval | interval | 保留 |
| repetition | repetition | 保留 |
| nextReviewDate | nextDue | **改名** |
| lastSessionId | lastSessionId | 保留（可选，用于调试）|
| totalSessions | totalSessions | 保留 |
| bestStars | bestStars | 保留（重构后从 sessions 计算，此字段废弃）|

---

### poem_review_cards → 不迁移

直接废弃。`srs_schedules` 已有每首诗的调度状态，不需要二次迁移。

---

### poem_achievement_dates → achievement_events

```ts
// 旧格式：{ "first_poem": "2026-10-01T00:00:00.000Z", ... }
// 新格式：[{ id: "first_poem", unlockedAt: "2026-10-01T00:00:00.000Z" }, ...]
```

遍历旧 key-value 对，转为数组格式。

---

### poem_nickname + reminder_time + avatar_gender → user_profile

```ts
{
  nickname: storage.get('poem_nickname') ?? '',
  gender: storage.get('avatar_gender') ?? undefined,
  reminderTime: storage.get('reminder_time') ?? undefined,
  onboardingDone: storage.get('poem_onboarding_done') === '1',
  createdAt: new Date().toISOString(),
}
```

---

### streak 处理

迁移时从 `srs_streak_v2` 读取现有值作为初始 streak，不再单独存储。重构后 streak 改为从 `recitation_sessions` distinct date 实时计算。

---

## 3. 逐步迭代计划

**原则**：每一步提交后 App 必须可以正常运行；旧代码和新代码可以共存过渡期。

---

### Step 1：定义新类型 + 重命名字段

**文件**：
- 新建 `src/types/storage.ts`

**内容**：
```ts
export interface RecitationSessionV2 {
  id: string
  poemId: number
  mode: 'memorize' | 'review'
  date: string
  timestamp: number
  stars: number
  qScore: number
  charCount: number
  lines: { passed: boolean; hintCount: number }[]
  hintRate: number
  passRate: number
}

export interface SrsSchedule {
  poemId: number
  ef: number
  interval: number
  repetition: number
  nextDue: string        // 改名自 nextReviewDate
  lastSessionId?: string
  totalSessions: number
}

export interface UserProfile {
  nickname: string
  gender?: 'male' | 'female'
  reminderTime?: string
  onboardingDone: boolean
  createdAt: string
}

export interface AchievementEvent {
  id: string
  unlockedAt: string
}
```

**验证**：`npx tsc --noEmit` 通过，无运行时影响。
**共存**：纯类型定义，不影响任何现有代码。

---

### Step 2：写迁移函数 migrateToV2

**文件**：`src/lib/migration.ts`（追加）

**函数**：`migrateToV2()`

```
迁移标识：storage.get('data_migration_v2') === 'done' → 跳过

迁移逻辑：
1. 读取 recitation_sessions，补全 charCount=0、mode='memorize'
2. 读取 review_schedules，将 nextReviewDate 改名为 nextDue
3. 读取 poem_achievement_dates，转为 achievement_events 数组
4. 读取 poem_nickname/reminder_time/avatar_gender/poem_onboarding_done，合并为 user_profile
5. 写入新数据（recitation_sessions 覆盖补全版、srs_schedules、achievement_events、user_profile）
6. storage.set('data_migration_v2', 'done')
```

**App.tsx 调用位置**：在 `StorageProvider` 内、`ProgressProvider` 外，App 组件挂载时执行一次：

```tsx
useEffect(() => {
  migrateSystemBToA()  // 已有
  migrateStreak()      // 已有
  migrateToV2()        // 新增
}, [])
```

**验证**：打开 App，DevTools Application > IndexedDB 检查 `srs_schedules` 和 `data_migration_v2` 是否写入。
**共存**：只写入新 key，不删除旧 key，旧代码继续正常工作。

---

### Step 3：统一 SM-2 写入，charCount 补全

**文件**：`src/lib/spacedRepetition.ts`、`src/hooks/useRecitation.ts`

**改动**：
1. `buildSession` 增加 `charCount` 参数：
   ```ts
   export function buildSession(poemId, mode, lines, date, charCount = 0): RecitationSession
   ```
2. `useRecitation.saveResult` 增加 `charCount` 参数，传给 `buildSession`
3. 写入 `srs_schedules`（新 key）同时继续写 `review_schedules`（旧 key）兼容过渡

**文件**：`src/pages/PoemDetail.tsx`

**改动**：
1. `handleReciteDone` 计算 charCount，传给 `saveResult`
2. 去掉 `markReviewed` 调用（这是 poem_review_cards 系统，背诵完成不应触发）
3. `handleMemorized`（MemorizeMode）同样去掉对 `markReviewed` 的间接影响（markMemorized 里新建 reviewCard 的逻辑后续 Step 5 处理）

**验证**：背一首诗，检查 `recitation_sessions` 最新一条有 `charCount` 字段，`srs_schedules` 有对应记录。
**共存**：`poem_review_cards` 暂时不再被 handleReciteDone 更新，但 ProgressContext 读取时仍正常显示。

---

### Step 4：改造 dailyPlan 和 Home 读 srs_schedules

**文件**：`src/lib/dailyPlan.ts`

**改动**：
- `SCHEDULES_KEY` 从 `'review_schedules'` 改为 `'srs_schedules'`
- `s.nextReviewDate` 改为 `s.nextDue`

**文件**：`src/pages/Home.tsx`

**改动**：
- `reviewDoneToday` 的判断从 `rc.lastDate === today` 改为从 `srs_schedules` 判断（该诗 nextDue > today）
- "待复习"tab 的 `reviewCards` 改为从 `srs_schedules` 构建展示数据（poemId/nextDue/totalSessions）

**验证**：首页今日复习列表正确，"待复习"tab 数据准确。
**共存**：ProgressContext 还在用旧系统，ProfilePage/AchievementsPage 不受影响。

---

### Step 5：改造 ProgressContext（核心步骤）

**文件**：`src/contexts/ProgressContext.tsx`

**对外接口不变**，内部逐字段替换：

**5a. progress 和 totalMemorized（从 sessions 计算）**
```ts
// 启动时读 recitation_sessions，构建 progress
const progress = sessions.reduce((acc, s) => {
  const key = String(s.poemId)
  const existing = acc[key] ?? { read: true, memorized: false, bestStars: 0 }
  return {
    ...acc,
    [key]: {
      ...existing,
      memorized: existing.memorized || s.mode === 'memorize',
      bestStars: Math.max(existing.bestStars, s.stars),
      noHintPass: existing.noHintPass || s.qScore === 5,
    }
  }
}, {} as Progress)
```

**5b. totalChars（从 sessions 求和）**
```ts
const totalChars = sessions.reduce((sum, s) => sum + (s.charCount ?? 0), 0)
```

**5c. streak（从 sessions distinct date 计算）**
```ts
function calcStreak(sessions: RecitationSession[]): StreakData {
  const dates = [...new Set(sessions.map(s => s.date))].sort()
  if (dates.length === 0) return { lastDate: '', count: 0 }
  let count = 1
  for (let i = dates.length - 1; i > 0; i--) {
    const prev = new Date(dates[i] + 'T00:00:00')
    prev.setDate(prev.getDate() - 1)
    if (prev.toISOString().slice(0, 10) === dates[i - 1]) count++
    else break
  }
  return { lastDate: dates[dates.length - 1], count }
}
```

**5d. memorizeHistory（从 sessions 取最近20条 mode='memorize'）**
```ts
const memorizeHistory = sessions
  .filter(s => s.mode === 'memorize')
  .slice(-20)
  .map(s => ({ id: s.poemId, stars: s.stars, date: s.date }))
```

**5e. reviewCards（从 srs_schedules 转换）**
```ts
// ReviewCard 接口不变（id/level/due/lastDate/passCount）
// 从 srs_schedules 转换：level=repetition，due=nextDue，lastDate 从 sessions 取最后一条
```

**5f. markMemorized（简化）**
```ts
// 只触发 saveResult（Step 3 已做），不再写 poem_progress/review_cards/history/streak
// 这些全部从 sessions 实时计算
// 仍调用 completePoem（queue 逻辑保留）
```

**5g. markReviewed（改为更新 srs_schedules）**
```ts
// 调用 useRecitation.saveResult（mode='review'）
// 不再写 poem_review_cards
```

**5h. 废弃字段清理**
- `todayDueFromA`：删除（恒为 null）
- `todayDueReviews`：从 srs_schedules 计算

**验证**：
- ProgressPage 统计数字（已背诵/总字数/连续天数）正确
- 首页待复习列表正确
- AchievementsPage 成就解锁状态正确

---

### Step 6：改造 useAchievements

**文件**：`src/hooks/useAchievements.ts`

**改动**：
- streak 来自 ProgressContext（已改为实时计算，来源统一）
- `poem_achievement_dates` 改读 `achievement_events`（数组格式）
- 写入时追加到数组，不覆盖

**验证**：已解锁成就仍显示解锁，新成就能正常解锁。

---

### Step 7：改造 useQueue

**文件**：`src/hooks/useQueue.ts`

**改动**：
- `QueueStore` 去掉 `streak_count` 字段
- `completePoem` 不再计算 streak（streak 已由 sessions 实时计算）
- `streakCount` 从 ProgressContext.streak.count 获取

**文件**：`src/pages/Home.tsx`、`src/pages/ProfilePage.tsx`
- `useQueue().streakCount` 改为 `useProgress().streak.count`

**验证**：首页连续天数显示正确，背诗后天数正常更新。

---

### Step 8：改造 weeklyReport

**文件**：`src/lib/weeklyReport.ts`

**改动**：
- 去掉读取 `poem_memorize_history`、`poem_total_chars`、`poem_progress`、`poem_streak`、`srs_streak_v2`
- `newPoemCount`：从 `recitation_sessions` 中 mode='memorize' 且本周首次出现的 poemId 计数
- `totalChars`：从 `recitation_sessions.charCount` 求和
- `totalMemorized`：从 `recitation_sessions` distinct poemId（mode='memorize'）计数
- `streakCount`：从 sessions 实时计算（复用 calcStreak）
- `hardestPoemId`：从 `srs_schedules`（ef 最低）

**验证**：WeeklyReportPage 数据正确。

---

### Step 9：改造 HeatmapChart 复习详情

**文件**：`src/components/HeatmapChart.tsx`

**改动**：
- 复习列表改读 `recitation_sessions` 中 `mode='review'` 且 `date === selectedDate` 的记录
- 不再读 `poem_review_cards`

**验证**：热力图点击详情，背诵和复习列表准确。

---

### Step 10：清理废弃代码（独立提交）

删除所有对以下 key 的读写代码：
- `poem_progress`、`poem_review_cards`、`poem_memorize_history`
- `poem_total_chars`、`poem_streak`、`srs_streak_v2`
- `poem_achievement_shown`、`poem_checkin`、`poem_onboarding_step`
- `srs_migration_done_v1`、`streak_migrated_v1`

更新 `src/lib/storage.ts` 的 `MIGRATE_KEYS`。

---

## 4. 风险点和注意事项

### 高风险

**ProgressContext 改造（Step 5）**：
- 影响全站所有页面，一次性改动最大
- 建议按 5a→5h 子步骤分别提交，每步验证
- 最大风险：`progress` 对象的结构必须与消费方完全兼容（key 为 String(id)，字段名不变）

**handleReciteDone 去掉 markReviewed（Step 3）**：
- 去掉后 `poem_review_cards` 不再更新，而 ProgressContext 在 Step 5 之前还在读 poem_review_cards
- 解决：Step 3 和 Step 5 要连续完成，不能单独提交 Step 3 而延迟 Step 5

**streak 实时计算**：
- 老用户可能有历史 sessions 缺少某天的记录（比如用 MemorizeMode 背诵，不走 saveResult）
- MemorizeMode 完成后不写 recitation_sessions，streak 会不准
- 解决：Step 3 中确保 handleMemorized（MemorizeMode）也调用 saveResult

### 中风险

**charCount=0 的旧数据**：
- 迁移后 totalChars 会比旧值小（旧数据 charCount=0）
- 接受此差异，不需要补救（历史数据本来就不准）

**mode 字段迁移**：
- 旧 sessions 全部标记为 mode='memorize'
- 旧的复习触发（handleVerified → markReviewed）不写 sessions，所以没有旧复习历史
- 接受此差异，复习历史从迁移完成后开始积累

### 降级策略

**迁移失败**：
- `migrateToV2` 内部全部 try/catch，失败不标记 done，下次启动重试
- 迁移失败时旧代码继续正常工作（旧 key 保留）

**数据读取失败**：
- 所有 loadXxx 函数保持 try/catch + 返回默认值的模式
- sessions 读取失败返回 []，所有统计为 0，不崩溃

### 老用户数据保护

1. 旧 key 在整个迁移过程中只读不删，直到 Step 10
2. Step 10 清理前必须验证新系统运行稳定（建议隔一个版本）
3. `data_migration_v2` 标记确保迁移只执行一次
4. migrateToV2 写入新数据前先检查是否已存在（已有 srs_schedules 则不覆盖）
