# T03 · streak 统一修复

## 背景

当前存在两套 streak 计数，定义不同且均有缺陷：

| | `poem_streak` | `poem_queue.streak_count` |
|---|---|---|
| 触发条件 | `markMemorized()`，背新诗才算 | `completePoem()`，完成队列首诗才算 |
| 首页展示 | 否 | **是** |
| 复习算不算 | 不算 | 不算 |

核心 bug：用户只做复习（无新诗）不触发任何 streak，导致复习日断掉连续天数。对坚持复习的用户是严重的负激励。

## 目标

- 背诵（新诗）和复习都算打卡，不再断 streak
- 统一为单一 streak 来源，消除双套计数
- 老用户 streak 不归零

## 不在范围内

- 成就勋章重算（成就系统读取新 key 后自动生效）
- 历史 streak 补录（无法知道历史哪些天做了复习）

## 功能需求

### 1. 新建 srs_streak_v2

在 `useRecitation.ts` 中实现 `updateSrsStreak(date: string)`：

```ts
const STREAK_KEY_V2 = 'srs_streak_v2'

function updateSrsStreak(date: string): SrsStreakData {
  const raw = localStorage.getItem(STREAK_KEY_V2)
  const prev: SrsStreakData = raw
    ? JSON.parse(raw)
    : { lastActivityDate: '', count: 0 }

  if (prev.lastActivityDate === date) return prev  // 当天已计，跳过

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
```

`saveResult`（背诵和复习共用的写入函数）末尾调用 `updateSrsStreak`。

### 2. 老数据迁移

在 `migration.ts` 中加入 `migrateStreak()`：
- 读取 `poem_streak.count` 和 `poem_queue.streak_count`
- 取较大值作为初始 count
- 取两者中较新的 lastDate 作为 lastActivityDate
- 写入 `srs_streak_v2`，写入后标记 `streak_migrated_v1`

### 3. Home.tsx 切换数据来源

- `streakCount` 从 `useQueue().streakCount` 改为读取 `useRecitation().srsStreak.count`
- `useRecitation` hook 返回新增 `srsStreak: SrsStreakData`

## 验收标准

- [ ] 只做复习（不背新诗）的天，streak 正常递增
- [ ] 老用户升级后 streak 不归零，取原有两个值的较大者
- [ ] 首页连续天数显示来自新 key
- [ ] 成就勋章「三日初成」「七日不辍」「铁杆书生」在新 streak 下正常触发

## 依赖

T02 完成后执行（共用 `migration.ts` 文件）

## 工作量估算

1 天
