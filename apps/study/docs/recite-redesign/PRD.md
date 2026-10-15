# 背诵功能重设计 PRD v1.0

> 目标：贴合家长带孩子背诗、孩子自测两种真实场景，替换现有复杂的三轮填空流程。

---

## 一、算法选型：简化 SM-2

调研了 SM-2、FSRS v5、Leitner、Duolingo HLR 四种算法，结论：**采用简化 SM-2**。

理由：
- 无需历史数据即可冷启动
- 间隔计算透明可控，家长好理解
- 将主观 q 值改为由背诵质量自动计算，不需要用户打分
- FSRS v5 的 19 个训练参数基于成人词汇数据，对本场景过度工程化

### 全句提示等效失败原则

**hintCount=2（看了完整句子）在算法层面等同于失败**，理由：
- 看了全句后"背出来"等于复读，没有发生真实记忆提取
- 1.5秒自动跳过，孩子无需努力回忆
- 若将全句提示算作通过，会虚高星级，下次间隔拉太长，真正遗忘

UI 上仍用深橙色区分（不打击积极性），仅算法层面等效失败。

### q 值映射规则

| 背诵情况 | hardFailRate* | softHintRate** | q值 |
|---------|--------------|---------------|-----|
| 全无提示通过 | 0 | 0 | 5 |
| 全通过，少量首字提示（≤30%） | 0 | >0 且 ≤30% | 4 |
| 全通过，首字提示较多（>30%） | 0 | >30% | 3 |
| 少量硬失败（≤20%） | >0 且 ≤20% | any | 2 |
| 较多硬失败（20-50%） | 20-50% | any | 1 |
| 超半数硬失败（>50%） | >50% | any | 0 |

\* hardFailRate = (失败句 + 全句提示句) / 总句数  
\** softHintRate = 首字提示句 / 总句数

### 星级计算

| q值 | 星级 |
|-----|------|
| 5 | 3星 |
| 3-4 | 2星 |
| 0-2 | 1星 |

### 复习间隔示例（3星，EF=2.5）

**首次背诵**：3星→3天，2星→2天，1星→1天（不再统一1天）

第1次3星 → 3天 → 第2次 → 6天 → 第3次 → 15天 → 38天 → 上限60天

1星重置：轮次降1，间隔回到1-2天，EF 持续下调直到底线1.3。

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

### 5.1 入口（PoemDetail 右下角悬浮）

现有"背一背"圆形悬浮按钮改为两个上下叠放的胶囊形悬浮按钮，位置不变（右下角），风格与现有按钮一致（中国红背景、白色文字）：

```
[ 家长陪背 ]   ← 上方，家长模式入口
[ 背 一 背 ]   ← 下方，孩子模式入口（保留原文案）
```

- 两个按钮宽度相同，各 4 个字
- 右下角固定悬浮，不随页面滚动
- 可拖动（继承现有悬浮按钮的拖动逻辑）

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

**设计原则：孩子模式无「背错了」按钮。** 孩子只能主动说"背出来了"或看提示，避免孩子自我评分过严或过宽。全句提示后自动跳过，算法层面等效失败（见算法章节）。

**句子显示状态：**

| 状态 | 显示方式 | 左侧色条 |
|-----|--------|--------|
| 当前句（未提示） | 汉字用 ▓ 遮盖，**拼音隐藏** | 红色（高亮当前） |
| 当前句（提示1次） | 汉字仍 ▓ 遮盖，**仅显示第一个字的拼音**，其余拼音隐藏 | 黄色 |
| 当前句（提示2次） | 全句汉字显示，**全部拼音显示**，按钮置灰，1.5秒后自动跳 | 红色 |
| 已完成（无提示） | 正常显示（含拼音） | 绿色 |
| 已完成（首字提示） | 正常显示（含拼音） | 橙色 |
| 已完成（全句提示） | 正常显示（含拼音） | 深橙色 |
| 未到的句子 | 全部 ▓，50% 透明度，**无拼音** | 灰色 |

> **拼音显示设计原则**：孩子模式默认不显示拼音，避免直接依赖拼音作弊；只有在主动求助时才逐步揭示，第一次提示仅露出第一个字的读音作为线索，帮助回忆而非直接给出答案。

**底部提示按钮：**
- 默认：「提示」，中国红背景
- 第1次点：显示首字，按钮变为「再提示」
- 第2次点：全句显示，按钮置灰，1.5秒倒计时后自动跳下一句
- 换句后按钮恢复初始状态

**「背出来了」按钮：**
- 位置：当前句右侧
- 无提示点击 → 绿色标记，跳下一句（hintCount=0）
- 首字提示后点击 → 橙色标记，跳下一句（hintCount=1）
- 全句提示后（hintCount=2）→ 按钮不可点，自动跳

**中途退出：** 弹确认"放弃本次背诵？"，确认后不保存 session，schedule 不变。

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

## 六、首页复习列表

复习列表与学习队列**独立，不合并**。

| 维度 | 今日复习 | 今日任务（学习队列） |
|------|----------|------------------|
| 来源 | ReviewSchedule（背过的诗） | useQueue（待学新诗） |
| 触发 | nextReviewDate ≤ today | 还没背过 |
| 未完成积累 | 是，滚到下一天 | 现有逻辑保留 |

**首页新增"今日复习"区块**，位于今日任务下方：

```
[今日复习]  (角标显示数量)
┌─────────────────────────────┐
│ [红左条] 春晓   ★★★          │
│  3天前背过 · 今天复习         │
├─────────────────────────────┤
│ [红左条] 静夜思 ★★           │
│  已逾期2天                    │
└─────────────────────────────┘
```

空状态：logo + "暂无复习任务"

逾期规则：未完成的复习不丢弃，累积到当天一并显示，按逾期天数降序排列。

---

## 七、数据合并规则

同一首诗可能有两种模式的历史数据：

- **复习调度**：取最近一次 session 更新 ReviewSchedule，不区分模式
- **bestStars**：取两种模式历史最高值
- **复习推荐**：统一用 `nextReviewDate`

## 八、边界情况

| 情况 | 处理方式 |
|------|---------|
| 第一次背这首诗 | prev=null，3星→3天，2星→2天，1星→1天 |
| 连续3次 q=0 | EF 降至底线1.3，repetition 重置为1，每天1天复习 |
| 从1星突变3星 | EF 因多次低分已下降，间隔不会暴涨，行为正确 |
| 同一天背两次 | 取最后一次 session 更新 schedule |
| 家长模式+孩子模式同一天 | 两条 session 都保存，schedule 用最后一条更新 |
| 中途退出 | 不保存 session，schedule 不变 |
| 诗只有1句 | 所有比例计算 n=1，正常工作 |

---

## 九、与现有系统集成

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

## 十、新增文件清单

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

## 十一、UI 实现说明（供开发参考）

### 11.1 背景图对齐古诗详情页

家长模式、孩子模式的背景需与 `PoemDetail` 页保持一致风格：白底（`#FFFDF8`）+ 古诗配图半透明叠加。

实现方式直接参考 `PoemDetail.tsx` / `PoemDetail.css` 中现有代码：

```css
/* 参考 PoemDetail.css */
.d-bg-wrap {
  position: fixed;
  bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  pointer-events: none;
  z-index: 0;
}
.d-bg {
  display: block;
  width: 100%;
  height: auto;
  opacity: 0.25;
}
```

- 背景色：`#FFFDF8`（与详情页一致）
- 图片来源：`/images/{imgFile}`，通过 `poem_img_map.json` 查 `poem.id` 得到文件名
- 图片透明度：`0.25`，固定在底部，`pointer-events: none`
- 内容区 `z-index: 1` 叠在图片之上

> 原型图中因使用外部占位图无法精确还原，实现时直接扒 PoemDetail 的背景层代码即可。

---

## 十二、待确认问题

1. 提示2次后自动跳下一句的等待时间，建议 **1.5秒**，是否合适？
2. 结果页显示「x天后复习」还是具体日期？
3. 首页今日复习卡片点击后直接进入哪个模式（家长/孩子），还是让用户选？
