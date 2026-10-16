# 数据全景分析报告

> 基于前端代码全量分析，2026-10-16

## 一、我们有什么数据

### 静态内容数据（public/ 目录，构建时固定，只读）

**诗词内容库** `/public/poems/{id}.json` × 70 首

这是粒度最细的内容数据，专为逐字交互设计：

```
{
  id, title, dynasty, author,
  titlePinyin: string[],
  lines: [{
    text: string,           // 原文
    pinyin: string,         // 整行拼音
    chars: [{               // 逐字
      char: string,
      pinyin: string | null // 标点为 null
    }]
  }]
}
```

朝代分布：唐 46 首 / 宋 19 首 / 元明清及其他 5 首，共 70 首。

**诗词注释与译文** `/public/annotations/{id}.json` × 70 篇

```
{ id, notes: [{word, meaning}], translation: string }
```

**诗词索引** `/public/poems/index.json`（首页全量加载，约 20-40KB）

```
{ id, title, dynasty, author, firstLine, allLines }
```

`allLines` 是全诗拼接字符串，用于首页卡片内容预览和搜索匹配。

**配图映射** `src/data/poem_img_map.json`

70 首全部配图，格式：`{ "1": "001 江南 汉乐府.webp", ... }`

---

### 用户行为数据（全量存于 localStorage，纯本地，无服务端）

共 12 个 key，分属 4 个关注域：

**核心掌握度域**

| key | 类型 | 字段 |
|---|---|---|
| `poem_progress` | `Record<id, PoemState>` | read / memorized / bestStars(0-3) / noHintPass |
| `poem_review_cards` | `ReviewCard[]` | poemId / level(0-5) / due(ISO日期) / passCount |
| `poem_memorize_history` | `MemorizeRecord[]` | id / stars / date，最近20条，同诗只保留最新 |

**精细记录域（SM-2 系统）**

| key | 类型 | 字段 |
|---|---|---|
| `recitation_sessions` | `RecitationSession[]` | id / poemId / mode("parent"\|"child") / date / timestamp / lines(逐行 LineResult) / stars / hintRate / passRate / qScore(0-5) |
| `review_schedules` | `Record<id, ReviewSchedule>` | ef / interval / repetition / nextReviewDate / totalSessions / bestStars |

`LineResult` 结构：`{ lineIndex, passed, hintCount: 0|1|2, mode }`

**学习计划与打卡域**

| key | 类型 | 字段 |
|---|---|---|
| `poem_streak` | `{lastDate, count}` | useProgress 维护的连续打卡 |
| `poem_queue` | `QueueStore` | 队列有序列表 + useQueue 独立维护的 streak_count |
| `poem_total_chars` | `number` | 累计背诵汉字数（首次背完时计入，不重复累加） |

**成就与配置域**

| key | 类型 | 说明 |
|---|---|---|
| `poem_achievement_dates` | `Record<achievementId, ISO>` | 9枚勋章首次解锁时间戳 |
| `poem_onboarding_done` | `"1"\|null` | 新手引导完成标记 |
| `poem_nickname` | `string` | 孩子昵称，默认"小诗人"，用于分享卡片 |
| `reminder_time` | `"HH:MM"` | 每日提醒时间偏好（纯 UI 记忆，无实际推送能力） |

---

## 二、这些数据用来做什么

### 静态内容数据的用途

`lines[].chars[]` 是整个背诵交互的物质基础：填空题选项来自它，首字提示来自它，逐字判断来自它。`pinyin: null` 标记标点，引擎直接跳过不考察。

`allLines` 在首页做卡片内容展示，同时在搜索时做全文匹配。`firstLine` 在诗集列表做摘要。

`notes[]` 和 `translation` 在详情页按需展开，用于帮助理解记忆，不参与任何评分计算。

### 用户数据各 key 的具体用途

`poem_progress` — 整个系统的核心枢纽。`read` 标记让首页列表显示"已读"状态；`memorized` 是建立 `ReviewCard` 的前提条件；`bestStars` 在进度页和诗集列表显示掌握等级；`noHintPass` 触发"过目不忘"勋章。

`poem_review_cards` — 驱动首页"今日复习"模块。`due <= today` 的卡片显示在今日任务列表，批量导航到对应诗词页面。这是当前 UI 的主控复习系统。

`recitation_sessions` — 完整的背诵存档。`qScore` 供 SM-2 算法使用，`hintRate`/`passRate` 供结果页展示，`timestamp` 记录背诵时刻。目前 UI 对这份数据的消费严重不足。

`review_schedules` — SM-2 精细调度表。`ef` 反映单首诗的记忆难度系数，`interval` 决定下次复习间隔。目前 UI 几乎不读取这套数据。

`poem_streak` — 首页连续打卡天数展示，同时喂给 `useAchievements` 做勋章判定（三日初成 ≥3、七日不辍 ≥7、铁杆书生 ≥30）。

`poem_queue` — 驱动首页"今日计划"模块，用户手动加入队列，第一首为当日目标诗。其内部的 `streak_count` 是与 `poem_streak` 完全独立的第二套打卡计数。

`poem_total_chars` — 进度页和个人页的"累计字数"统计展示，也触发"诗书满腹"相关成就判断的辅助指标。

`poem_memorize_history` — 喂给 `useAchievements` 做首数统计（初入诗门 ≥1、五首入门 ≥5、十五首晋阶 ≥15、三十首精通 ≥30、诗书满腹 ≥70）。注意：同诗只保留最新一条，因此这个字段本质上记录的是"背过几首不同的诗"而非"背了几次"。

`poem_achievement_dates` — `AchievementsPage` 展示每枚勋章的解锁日期。勋章解锁逻辑是纯派生计算，`achievement_dates` 只记录首次解锁时间，不参与任何业务判断。

---

## 三、整体数据流与业务流

### 主流程一：首次背诵（最核心的数据产生路径）

```
用户在 QueueScreen 选诗
    → 写入 poem_queue（有序队列尾部）

进入 PoemDetail
    → fetch /poems/{id}.json（Map 缓存，避免重复请求）
    → fetch /annotations/{id}.json（按需）
    → markRead() → poem_progress[id].read = true

点击「背一背」（ChildMode）或「家长测」（ParentMode）
    → 逐句展示，用户输入/选择
    → 内存中累积 LineResult[]
        每行：{ lineIndex, passed, hintCount: 0|1|2 }

所有行完成 → calcQScore(LineResult[])
    → hintCount=2 等效硬失败
    → qScore: 0(失败>50%) → 1(>20%) → 2(有失败) → 3(软提示>30%) → 4(有提示) → 5(全程无提示)

handleReciteDone(qScore, LineResult[]) — 8个 key 同步写入：
    ├─ useRecitation.saveResult()
    │   ├─ 写 recitation_sessions（完整会话存档）
    │   └─ 更新 review_schedules（SM-2 调度）
    │
    ├─ useProgress.markMemorized(id, stars, charCount, noHintPass)
    │   ├─ poem_progress[id].memorized = true
    │   ├─ poem_progress[id].bestStars = max(旧值, stars)（只升不降）
    │   ├─ poem_progress[id].noHintPass 累积
    │   ├─ poem_total_chars += charCount（仅首次，已 memorized 则跳过）
    │   ├─ poem_review_cards：若无卡则新建（level=0, due=明天）
    │   └─ poem_memorize_history：同诗取最新，保留最近20条
    │
    ├─ useProgress.markReviewed(id, passed=true)
    │   └─ poem_review_cards[id].level = min(level+1, 5)，due = 明天+INTERVALS[level]
    │
    └─ useQueue.completePoem(id)
        └─ poem_queue：从队列移除，更新 streak_count

→ useAchievements 响应 progress/streak 变化（React 渲染时重算）
    → computeUnlocked() 纯函数，遍历9个勋章判定条件
    → useEffect 检测首次 true → 写 poem_achievement_dates[achievementId]
    → 触发解锁 Banner 动画
```

### 主流程二：间隔复习

```
首页加载
    → 读 poem_review_cards，过滤 due <= today
    → 展示"今日复习"列表（当日到期数量）

用户点击进入复习
    → URL 携带 ?review=1&reviewIds=...
    → PoemDetail 进入 MemorizeMode（填空验证）
    → 完成后 onVerified(passed)
    → markReviewed(id, passed)
        通过：level = min(level+1, 5)，due = today + INTERVALS[level]
        失败：level = max(0, level-1)，due = 明天
        level=5：视为已掌握，due = today + 365天
```

### 主流程三：成就系统（纯派生，无侵入）

```
任何导致 progress / streak 变化的操作完成后
    → React 重渲染触发 useAchievements(progress, streak, totalChars, memorizeHistory)
    → computeUnlocked() 实时计算9枚勋章是否满足条件
    → useEffect 监听 unlocked 状态变化
    → 发现新解锁 → 写 poem_achievement_dates[id] = now()
    → 触发全局成就解锁 Banner
```

`useAchievements` 是整个系统唯一一个接收其他 hook 输出作为入参的 hook，其余三个（useProgress、useQueue、useRecitation）在 PoemDetail 层独立挂载，互不直接依赖，由 PoemDetail 协调调用。

---

## 四、间隔重复算法分析

### 两套系统并行（核心架构问题）

#### 系统 A：SM-2 变体（精密，数据被积压）

存储于 `review_schedules`，由 `useRecitation` 维护。

**Q 分计算规则（calcQScore）：**

| Q值 | 判定条件 |
|---|---|
| 5 | 全部行无任何提示通过 |
| 4 | 有软提示（hintCount=1）但比例不高 |
| 3 | 软提示率 > 30% |
| 2 | 有任意硬失败（hintCount=2 或 passed=false） |
| 1 | 硬失败率 > 20% |
| 0 | 硬失败率 > 50% |

关键设计：`hintCount=2`（展示完整句）等效于放弃，强制视为失败，不允许靠看答案混过。

**EF 因子更新公式（SM-2 变体）：**

```
newEF = max(1.3, prevEF + 0.1 - (5-q)×(0.08 + (5-q)×0.02))
```

EF 初始值 2.5，最低下限 1.3。q=5 时 EF 微增，q=3 时 EF 不变，q<3 时 EF 下降。

**间隔推进逻辑：**

```
首次背诵：
    q=5 → 3天; q=4 → 2天; else → 1天

后续复习：
    q < 3（失败）：repetition-1，interval 重置为 1-2 天
    q ≥ 3（通过）：
        repetition=1 → interval=6天
        else → interval = round(prevInterval × newEF)
    上限：MAX_INTERVAL = 60 天
```

#### 系统 B：简易5档（粗糙，驱动全部 UI）

存储于 `poem_review_cards`，由 `useProgress` 维护。

```
INTERVALS = [1, 3, 7, 15, 30] 天（固定，不随个人记忆能力调整）

通过：level = min(level+1, 5)，due = today + INTERVALS[level-1]
失败：level = max(0, level-1)，due = 明天
level=5：已掌握，due = today + 365天
```

#### 两套系统的根本矛盾

每次背诵结束后，两套系统都写入，但首页「今日复习」、进度页「已掌握数量」全部读取系统 B。系统 A 积累的高质量 SM-2 数据（精准的 EF 值、行级难度分布）处于"只写不读"状态，是当前最明确的技术债。

系统 A 的优势在于个性化：两个孩子背同一首诗，EF 值会因各自错误模式的不同而分化，调度间隔自动适配记忆强度。系统 B 对所有人给出完全相同的复习时间表，无法反映个体差异。

---

## 五、当前数据能做什么

### 立即可做（数据已有，只差 UI 读取）

**背诵历程曲线**：`recitation_sessions` 按 `poemId` 分组，x 轴是 `date`，y 轴是 `stars` 或 `passRate`，可为每首诗画出学习进步曲线。目前进度页只展示最终 `bestStars`，完全没有利用历史趋势。

**逐句薄弱点高亮**：`LineResult.lineIndex × passed=false` 交叉统计，找出某首诗历次背诵中最常出错的那一行，在详情页用视觉标记提示重点句。数据完全具备，只需聚合计算。

**最难记的诗排行**：`review_schedules.ef` 越低说明遗忘越快。对所有已背诗按 ef 值升序排列，可得到个性化的"难诗清单"，比固定课程表更有指导价值。

**学习热力图**：`recitation_sessions.date` 可直接输出 GitHub 风格的月度学习热力图，每天背了几首一目了然。

**最佳学习时段分析**：`recitation_sessions.timestamp` × `qScore` 相关性分析，找出用户效率最高的时间段（早上还是晚上）。

**亲子模式效果对比**：`recitation_sessions.mode` 字段区分 `"child"` 和 `"parent"`，对比同一首诗在两种模式下的 `passRate`，分析孩子在监督下和独立背诵时的表现差异。

### 轻微改造可实现

**智能每日计划生成**：基于 `review_schedules.nextReviewDate` 自动排列当天任务，不需要用户手动维护 `poem_queue`。自动识别"今天应复习哪些、应新学哪些"，对家长来说大幅降低管理成本。

**每周学习报告**：汇总 `memorize_history`（近期背了哪些诗）+ `streak.count`（坚持了几天）+ `totalChars` 增量，生成可分享的周报卡片，比当前分享卡只有累计数字更有叙事感。

**更丰富的分享卡片**：当前 `ShareCardModal` 只显示昵称 + 总字数 + streak，而 `memorize_history` 里有最近背的具体诗名，`poem_progress` 里有星级，完全可以做成"本周背了《XX》《YY》，进步到3星"的动态内容。

---

## 六、数据缺口与扩展方向

### 已丢失的有价值信号

**中途放弃的背诵会话**：用户进入背诵界面但未完成就退出，这个行为完全没有记录。放弃率高的诗可能是难度曲线不对，或内容理解不足，是重要的产品优化信号。

**用户忽略到期复习的行为**：首页展示了到期复习，但用户没有点击、直接忽略——这个行为无法追踪。持续忽略某首诗的到期复习，可能意味着用户对这首诗已失去兴趣，或觉得太难。

**注释/译文展开行为**：用户在详情页翻开注释或译文，说明对这首诗理解有困难，是学习难度的早期信号，但完全没有记录。

**浏览停留时间（兴趣信号）**：在诗词列表或详情页浏览较久但未加入队列，是隐性的兴趣信号，可用于推荐系统。

**memorize_history 的进步轨迹缺失**：同诗只保留最新一条，无法还原某首诗从 1 星成长到 3 星的完整轨迹。

### 扩展方向与优先级

**优先级 1：数据导出与云同步**

当前所有数据存于 localStorage，iOS Safari 私有浏览、WebView、手动清缓存均会导致数据归零。对一个有积累感诉求的产品（连续打卡、勋章解锁、多首诗掌握度）而言，这是核心体验风险。

- 短期：提供"导出全部数据"功能，将9个核心 key 序列化为 JSON 文件下载。工程量极小，但能极大建立用户信任感。
- 中期：`poem_progress` + `review_schedules` + `recitation_sessions` 完全可序列化，后端存储成本极低（每用户约 50-200KB），云同步是最值得投入的长期基建。

**优先级 2：合并双 SRS 系统**

让首页"今日复习"读取 `review_schedules.nextReviewDate` 替代 `poem_review_cards.due`，彻底淘汰系统 B。这样：
1. 消除数据不一致
2. 让已积累的 SM-2 高质量数据被真正消费
3. `recitation_sessions` 逐行数据开始驱动复习计划，个性化程度大幅提升

**优先级 3：多用户支持（多孩子场景）**

`poem_nickname` 字段已预示家长设置概念。localStorage key 加 `userId` 前缀即可支持多用户，无需重构任何数据结构。这对"家里两个孩子各自在学"的场景是刚需，且实现成本极低。

**优先级 4：AI 推荐队列**

`review_schedules.ef`（记忆难度）+ `recitation_sessions` 的 `qScore` 历史均值，已经足够支撑一个基于个人记忆曲线的推荐系统，可以自动建议"今天新学哪首、复习哪首"，替代手动管理 `poem_queue`。

**优先级 5：PWA 推送通知**

`reminder_time` 字段已存，但目前只是 UI 记忆，没有实际推送能力。接入 PWA Notification API（前端可独立实现，无需后端），即可做到每日定时提醒。

---

## 七、架构评估

### 纯前端架构的优点

- **零后端成本**：70 首诗的静态文件 + localStorage，完整产品无需任何服务器
- **数据结构设计质量高**：`Line → Char` 的逐字粒度设计支撑填空、选字、拼音、默写等多种考察形式
- **SM-2 算法实现正确**：EF 因子、间隔计算、q 分映射均符合 SM-2 标准规范
- **成就系统无副作用**：`useAchievements` 是纯派生计算，不反向写入，不产生耦合
- **防崩溃保护**：所有 localStorage 读写均有 try/catch 保护

### 当前架构的主要问题

**问题 1：两套 SRS 系统并存（最严重的技术债）**

`poem_review_cards`（系统 B）和 `review_schedules`（系统 A）在每次背诵时同步写入，但 UI 只消费系统 B。系统 A 积累了大量高质量数据却几乎处于"只写不读"状态。应当将 UI 迁移到系统 A，彻底废弃系统 B。

**问题 2：两套 streak 含义不同却同时展示**

`useProgress.streak`（以"完成任意一首背诵"为条件）和 `useQueue.streak_count`（以"完成今日队列首诗"为条件）是两套独立的计数逻辑。这是一个正在损害用户体验的 Bug，应合并为单一定义。

**问题 3：recitation_sessions 无上限增长**

每条会话记录约 0.5-2KB，长期使用后 localStorage 会持续增长。高频用户理论上会触碰 5-10MB 上限。应增加清理策略（如每首诗只保留最近5次会话）。

**问题 4：localStorage 是唯一持久化手段**

这是规模化和用户信任的核心障碍，需要云同步方案。

**问题 5：onboarding 3首引导诗留下"幽灵已读"记录**

引导流程会将 id:4、10、19 这3首诗写入 `progress.read=true`，引导结束后这3首在诗集列表显示"已读未背"，可能让用户困惑。应在 onboarding 完成时清除这3条 read 记录，或将引导行为与正式学习行为分离存储。

### 未来扩展的技术路线

| 阶段 | 时间 | 工作 |
|---|---|---|
| 近期 | 1-3个月 | 合并双 SRS 系统；修复双 streak 问题；增加数据导出；进度页背诵历程可视化 |
| 中期 | 3-6个月 | PWA 推送通知；智能每日计划（基于 nextReviewDate）；多用户支持 |
| 长期 | 6个月+ | 云端同步；基于 EF 值的 AI 推荐队列；家长端数据看板；社交功能 |
