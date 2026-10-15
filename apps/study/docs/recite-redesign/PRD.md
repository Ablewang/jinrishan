# 背诵功能重设计 PRD v1.0

> 目标：贴合家长带孩子背诗、孩子自测两种真实场景，替换现有复杂的三轮填空流程。

---

## 一、算法选型：简化 SM-2

调研了 SM-2、FSRS、Leitner、Duolingo HLR 四种算法，结论：**采用简化 SM-2**。

理由：
- 无需历史数据即可冷启动
- 间隔计算透明可控
- 将主观 q 值改为由背诵质量自动计算，不需要用户打分

### q 值映射规则

| 背诵情况 | q值 |
|---------|-----|
| 3星（无提示） | 5 |
| 3星（≤10% 句子用了提示） | 4 |
| 2星（≤30% 句子用了提示） | 3 |
| 1星（>30% 提示） | 2 |
| 1星（有句子背错） | 1 |
| 全部失败 | 0 |

### 复习间隔示例（3星，EF=2.5）

第1次背完 → 1天 → 6天 → 15天 → 38天 → 上限60天

1星重置：轮次降1，间隔回到1-2天。

---

## 二、数据结构

```typescript
// 单句背诵情况
interface LineResult {
  lineIndex: number
  passed: boolean         // 家长标✅ / 孩子点"背出来了"
  hintCount: number       // 0=无提示 1=看了首字 2=看了全句
  mode: 'parent' | 'child'
}

// 单次背诵会话
interface RecitationSession {
  id: string
  poemId: number
  mode: 'parent' | 'child'
  date: string            // "2026-10-15"
  timestamp: number
  lines: LineResult[]
  stars: number           // 1 | 2 | 3
  hintRate: number        // 用了提示的句子比例 0-1
  passRate: number        // 背出来的句子比例 0-1
  qScore: number          // SM-2 q值 0-5
}

// 复习调度（每首诗一条，持久化）
interface ReviewSchedule {
  poemId: number
  ef: number              // Easiness Factor，初始2.5，最低1.3
  interval: number        // 当前复习间隔（天）
  repetition: number      // 已完成轮次
  nextReviewDate: string  // ISO date
  lastSessionId: string
  totalSessions: number
  bestStars: number
}
```

localStorage key：
- `recitation_sessions` → `RecitationSession[]`
- `review_schedules` → `Record<number, ReviewSchedule>`

---

## 三、星级计算规则

```
3星：全部通过 + 无提示
2星：全部通过 + ≤30% 句子用了提示
1星：有句子背错，或 >30% 句子用了提示
```

---

## 四、SM-2 算法实现

```typescript
const INITIAL_EF = 2.5
const MIN_EF = 1.3

function updateSchedule(
  prev: ReviewSchedule | null,
  session: RecitationSession
): ReviewSchedule {
  const q = session.qScore
  const now = session.date

  if (!prev || prev.repetition === 0) {
    return {
      poemId: session.poemId,
      ef: INITIAL_EF,
      interval: q >= 3 ? 1 : 1,
      repetition: 1,
      nextReviewDate: addDays(now, 1),
      lastSessionId: session.id,
      totalSessions: 1,
      bestStars: session.stars,
    }
  }

  const newEF = Math.max(
    MIN_EF,
    prev.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  )

  let newInterval: number
  let newRepetition: number

  if (q < 3) {
    newRepetition = Math.max(1, prev.repetition - 1)
    newInterval = newRepetition === 1 ? 1 : 2
  } else {
    newRepetition = prev.repetition + 1
    if (prev.repetition === 1) newInterval = 1
    else if (prev.repetition === 2) newInterval = 6
    else newInterval = Math.round(prev.interval * newEF)
  }

  newInterval = Math.min(60, newInterval)

  return {
    poemId: session.poemId,
    ef: newEF,
    interval: newInterval,
    repetition: newRepetition,
    nextReviewDate: addDays(now, newInterval),
    lastSessionId: session.id,
    totalSessions: prev.totalSessions + 1,
    bestStars: Math.max(prev.bestStars, session.stars),
  }
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
```

---

## 五、UI 设计

### 5.1 入口（PoemDetail 底部）

现有"背一背"单按钮改为两个并排按钮：

```
[👨‍👩‍👦 家长陪背]    [🧒 自己背]
```

副文字：「家长标记对错」/ 「自己挑战」

---

### 5.2 家长模式（ParentMode）

**布局：**
- 顶部：诗名 + 作者 + "家长模式"标签
- 中部：全部句子列表，每句含拼音+汉字，右侧 ✅ ✗ 按钮
- 底部：进度「已标记 x/n 句」+ 「查看结果」按钮（全部标记后亮起）

**交互：**
- 所有句子初始完整显示（含拼音），家长对照孩子口头背诵逐句标记
- ✅ / ✗ 可重复点击修改
- 全部标记完「查看结果」按钮亮起

---

### 5.3 孩子模式（ChildMode）

**句子显示状态：**

| 状态 | 显示方式 |
|-----|--------|
| 当前句（未提示） | 汉字用 ▓ 遮盖，拼音正常显示 |
| 当前句（提示1次） | 首字显示，其余 ▓，拼音正常 |
| 当前句（提示2次） | 全句显示，1.5秒后自动跳下一句 |
| 已完成（无提示通过） | 正常显示 + 绿色背景条 |
| 已完成（有提示通过） | 正常显示 + 橙色背景条 |
| 未到的句子 | 全部 ▓ + 50% 透明度 |

**底部提示按钮：**
- 默认：大按钮「提示」，中国红背景
- 第1次点：变为「再提示」，显示首字
- 第2次点：全句显示，按钮变灰，1.5秒后自动跳下一句
- 换句后按钮恢复初始状态

**「背出来了」按钮：**
- 位置：当前句右侧
- 无提示点击 → 绿色标记，自动跳下一句
- 有提示点击 → 橙色标记，自动跳下一句

---

### 5.4 结果页（两种模式复用）

- 大号星级动画（1/2/3星）
- 每句汇总：绿✓ / 橙✓（有提示）/ 红✗
- 下次复习：「明天复习」/ 「x 天后复习」
- 鼓励文案：
  - 3星：「厉害！一个字都没看！」
  - 2星：「不错，下次试试不用提示」
  - 1星：「继续加油，多背几遍」

---

## 六、数据合并规则

同一首诗可能有两种模式的历史数据：

- **复习调度**：取最近一次 session 更新 ReviewSchedule，不区分模式
- **bestStars**：取两种模式历史最高值
- **复习推荐**：统一用 `nextReviewDate`

---

## 七、与现有系统集成

### 新增方法 `markRecitation()`

```typescript
function markRecitation(session: RecitationSession): void {
  // 1. 保存 session
  const sessions = loadSessions()
  sessions.push(session)
  saveSessions(sessions)

  // 2. 更新 ReviewSchedule
  const schedules = loadSchedules()
  const prev = schedules[session.poemId] ?? null
  schedules[session.poemId] = updateSchedule(prev, session)
  saveSchedules(schedules)

  // 3. 兼容旧接口
  const charCount = session.lines.length * 5
  markMemorized(session.poemId, session.stars, charCount, session.hintRate === 0)
}
```

### interval → level 映射（兼容现有 reviewCards）

| interval | level | 显示 |
|---------|-------|------|
| 1天 | 0 | 1天 |
| 2-5天 | 1 | 3天 |
| 6-12天 | 2 | 7天 |
| 13-29天 | 3 | 15天 |
| ≥30天 | 4 | 掌握 |

---

## 八、新增文件清单

| 文件 | 说明 |
|-----|------|
| `src/types/recitation.ts` | 所有 interface 定义 |
| `src/lib/spacedRepetition.ts` | SM-2 算法纯函数 |
| `src/hooks/useRecitation.ts` | session + schedule 读写 |
| `src/components/ReciteMode.tsx` | 入口（模式选择） |
| `src/components/ParentMode.tsx` | 家长模式 |
| `src/components/ChildMode.tsx` | 孩子模式 |
| `src/components/ReciteResult.tsx` | 结果页 |

`src/components/MemorizeMode.tsx` → 删除，由 `ReciteMode.tsx` 替换。

---

## 九、待确认问题

1. 提示2次后自动跳下一句的等待时间，建议 **1.5秒**，是否合适？
2. 首次背诵是否也要选模式，还是引导先看诗？
3. 结果页显示「x天后复习」还是具体日期？
4. Home 页今日任务是否区分「初次背诵」和「复习」两种卡片？
