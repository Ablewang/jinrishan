# T3 · Streak 统一（复习日不断打卡）

**类型：** Bug修复  
**优先级：** P1  
**估算工时：** 1天  

---

## 问题描述

当前存在两套独立的 streak 计数，逻辑相互矛盾：

| | `poem_streak` | `poem_queue.streak_count` |
|---|---|---|
| 触发条件 | `markMemorized()`，背新诗时 | `completePoem()`，完成队列首诗时 |
| 首页展示 | 否 | **是**（hero 区连续天数） |
| 复习算不算 | 不算 | 不算 |

**核心 bug：** 用户某天只做复习（不背新诗、不完成队列），两套 streak 均不触发，连续天数断掉。对于已背完一段时间、主要做复习的用户，这是必现 bug。

---

## 需求

### 新定义

**当天完成任意一次背诵或复习（即调用 `saveResult`）即算打卡，streak +1。**

### 功能需求

1. 新建统一 streak key：`srs_streak_v2`，结构 `{ lastActivityDate: string, count: number }`
2. 在 `useRecitation.ts` 的 `saveResult` 末尾调用 `updateSrsStreak(date)`
3. `useRecitation` hook 返回值新增 `srsStreak: SrsStreakData`
4. `Home.tsx` hero 区连续天数改为读取 `srsStreak.count`
5. 成就系统（`useAchievements`）的 streak 判定改为读取 `srsStreak.count`

### 老数据迁移（在 T2 Phase 3 迁移脚本中一并执行）

读取 `poem_streak.count` 和 `poem_queue.streak_count`，取较大值初始化 `srs_streak_v2`，避免 streak 归零。

---

## 实现方案

在 `useRecitation.ts` 新增：

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

---

## 验收标准

- [ ] 用户只做复习（不背新诗），当天 `srs_streak_v2.count` 正确 +1
- [ ] 用户当天多次背诵，streak 只计一次
- [ ] 连续两天均有活动，streak 连续递增
- [ ] 中断一天后重新活动，streak 重置为 1
- [ ] 首页 hero 区展示的连续天数与实际一致
- [ ] 成就"三日初成""七日不辍""铁杆书生"判定逻辑正确
- [ ] 老用户升级后 streak 不归零（取原两套 streak 较大值）
