# 架构师 A 评审：discussion-conclusion 方案

> 评审人：架构师 A（极简原始记录派）  
> 评审对象：discussion-conclusion.md 中的最终收敛方案  
> 日期：2026-10-20

---

## 总体判断

这份收敛方案和我的立场高度吻合。核心骨架正确：两张 append-only 原始记录表 + 极少量配置/事件表，所有统计数据实时计算，不引入 poem_states 物化缓存。

以下逐项评审，分"认可"、"有异议"、"建议调整"三类。

---

## 一、认可的部分

### 1.1 不引入 poem_states——正确决策

方案的 key_decisions 第 8 条明确说：poem_states 需要每次写 session 时同步更新，IndexedDB 适配层无多 key 事务支持，崩溃时会造成原始记录和缓存不一致，引入了比解决更多的问题。

这是整个讨论最重要的一个判断，我完全同意。

B 方案的 rebuildPoemStates() 看起来是个安全网，但它本身就证明了缓存是不可靠的——你需要额外写 ~150 行重建逻辑来应对缓存损坏，这是缓存层带来的复杂度税。A 方案不存在这个税。

### 1.2 review_sessions 不存 levelBefore/levelAfter——正确

方案选择不存 levelBefore/levelAfter，SM-2 状态从历史序列实时重算。这是我的立场，也是更干净的做法。

B 方案在 review_sessions 里存 intervalUsed + efBefore 是为了保证"重算语义完整性"，但这其实是在用冗余字段给"重算"这条路铺底，背后的隐含意思是"我不完全相信重算"。既然已经决定不建 poem_states、完全依赖实时重算，review_sessions 保持极简就够了。

如果将来发现重算有语义问题（比如提前复习导致 interval 路径分叉），那时再加 intervalUsed 字段也不晚——append-only 表加字段是安全的，旧记录的这个字段会是 undefined，重算时按"无提前复习"处理即可。

### 1.3 streak 实时计算、废弃三套存储——正确

三套 streak 的问题根本上是"同一个概念多处写入"，统一成一个纯函数是唯一合理的解法。

唯一要注意的是方案里 streak 的数据源仅写了 recitation_sessions distinct date，但 discussion.md 第二轮讨论中 B 提出了一个有效质疑：用户今天只复习没背新诗，streak 是否断？

**收敛方案在 key_decisions 里没有明确回答这个问题。** 我的建议是：streak = recitation_sessions ∪ review_sessions 的 distinct date，这样"只复习"的天也算学习天，对重度老用户（以复习为主）更公平。

### 1.4 SM-2 退路方案（sm2Snapshot 字段）——聪明

方案在 tradeoffs 里留了一条退路：若实测首次加载超过 100ms，在 review_sessions 末尾加可选 sm2Snapshot 字段作为断点重算起点。

这个设计有个优点：它是渐进式的，不需要现在就引入，也不会破坏 append-only 语义。需要时加一个可选字段，不需要的记录这个字段是 undefined，重算从头跑。完全符合"你不需要的功能，不要现在付出代价"原则。

---

## 二、有异议的部分

### 2.1 review_schedules 作为"过渡表"的定位模糊

方案把 review_schedules 定位为"过渡期保留，迁移后只读，v3 清理"。这个定位有一个隐患：**它在代码里没有强制执行"只读"的机制**。

过渡期保留的表，在实际开发中极容易变成"一直在用但没人敢删"的僵尸表。六个月后，你可能发现 review_schedules 还在被某处代码悄悄读取，没人记得它应该是只读的。

**我的建议：** 迁移完成后，立刻在 storage 适配层对 review_schedules 的写操作加一个 console.warn（"review_schedules is read-only after migration, writes are ignored"），并在 code 里加一个 TODO + 版本号。不要依赖"文档约定"来执行只读语义。

### 2.2 首次背诵后是否写 review_session 的问题没有在方案里落地

方案的 concerns 第一条列出了这个疑问，但在 key_decisions 里没有给出明确答案。

这个决策的影响是：
- 如果首次背完立即写一条 review_session（qScore = 背诵时的 qScore），该诗当天就会出现在"今日待复习"列表（SM-2 计算 nextDue = today + interval）。
- 如果不写，该诗不会出现在复习列表，直到用户手动发起第一次复习。

现有行为是背完即加入复习队列（markMemorized 调 saveResult，saveResult 更新 review_schedules），所以新方案应该保持这个行为：**背诵完成写一条 review_session 作为 SM-2 起点**。

但"第一条 review_session 的 date 是今天，SM-2 算出 nextDue = today + 1"，这意味着第二天该诗就出现在复习列表。这是 SM-2 的标准行为（repetitions=0 → interval=1），问题不大。

**需要在 key_decisions 里明确写出来，否则实现者可能会漏掉这个步骤。**

### 2.3 streak 计算的"今天还没背"边界在方案里语义不清

concerns 第二条提到了这个问题，但给出的是"建议截至昨天的连续天数，今天有背才+1"，这个描述本身有歧义。

明确一下：
- 用户昨天有背，今天还没背，打开 App，streak 应该显示多少？
  - **选项 A（宽松）**：显示包含昨天的连续天数（不扣今天）。今天背了则 +1，不影响已有的天数。
  - **选项 B（严格）**：显示包含今天为止的连续天数，今天还没背则比昨天少 1。

现有 srs_streak_v2 的行为是选项 A（lastActivityDate = yesterday 时 count 照常）。从用户体验角度，A 更友好（不会因为"今天早上刚打开 App 就看到 streak 归零"而产生焦虑）。

**建议在代码注释里明确写"streak = 包含今天若有记录，截至最近连续活跃天数；今天没有记录不影响昨天之前的连续天数"。**

---

## 三、建议调整的部分

### 3.1 review_sessions 字段建议加 hintCount（可选）

方案的 concerns 第五条已经提到：如果未来支持更细粒度评分（按提示次数分级），需要预留字段。

我的建议：现在就加，成本极低：

```ts
interface ReviewSession {
  id: string
  poemId: number
  date: string
  timestamp: number
  passed: boolean
  qScore: number
  hintCount?: number  // 预留，复习界面暂无，未来可填
}
```

加一个可选字段不会影响任何现有逻辑，但避免了未来"需要加字段但旧数据没有"的尴尬。append-only 表的字段扩展原则：宁可早加，不要事后加。

### 3.2 computeStreak 的数据源要在实现时双源合并

方案的 derived_computations 里写的是"recitation_sessions distinct date 从今天往前连续计数"，但 discussion.md 第二轮讨论已经决定 streak 应该包含 review_sessions 的日期。

这两个地方不一致，容易在实现时照 derived_computations 里的说明写，漏掉 review_sessions。

**建议修改 derived_computations 里的描述为：**

```
连续天数（streak）：(recitation_sessions ∪ review_sessions) distinct date，
从今天往前连续计数，O(d)，全站统一此一处计算
```

### 3.3 poem_queue.today_complete 的多设备风险需要现在考虑迁移字段名

concerns 最后一条提到 poem_queue.today_complete 是本地时间判断，多设备同步时跨时区会冲突。

这个问题现在不需要解决，但建议把字段名从 today_complete 改为 local_today_complete 或加注释说明这是本地时间的标记。这样未来做后端同步时，字段名本身就提示了"这是本地状态，不参与同步"。

低成本，但能避免未来把这个字段当成"可同步状态"而引入 bug。

---

## 四、方案整体评分与结论

**整体评分：9/10**

扣分点：
- streak 数据源（recitation only vs union）在 derived_computations 和 discussion.md 之间不一致，需要对齐（-0.5）
- 首次背诵是否写 review_session 这个关键决策没有在 key_decisions 里明确落地（-0.5）

**优点：**
- 正确地拒绝了 poem_states 物化缓存，理由充分（事务缺失 + 一致性无法保证）
- 过渡方案（review_schedules 只读 + sm2Snapshot 退路）设计得务实，不是激进的全部废弃
- 对外接口不变（ProgressContext 消费方零改动）是正确的工程策略，降低迁移风险

**实施前必须明确的两个问题：**

1. 首次背诵完成后，是否立即写一条 review_session？（决定该诗何时出现在复习列表）
2. streak 是否同时包含 review_sessions 的日期？（决定"只复习"的天是否计入）

这两个问题不解决，实现者在写 handleReciteDone 和 computeStreak 时会有两种做法，埋下隐患。

---

## 五、给实施阶段的三条提醒

1. **review_schedules 的"只读"约束必须用代码执行，不能只靠文档约定。** 加一个 storage 层的写入拦截器，迁移完成后任何对 review_schedules 的写操作都输出 warn 并静默忽略。

2. **迁移时的 streak 一致性验证要写断言。** 迁移完成后，立刻执行 `assert(computeStreak(recitationSessions) === oldStreak.count ± 1)`，误差超过 1 就在控制台告警。这能在第一时间发现数据问题，不等用户报 bug。

3. **pruneOldSessions 删除前确认没有其他引用。** 方案说直接废弃，但 storageMonitor.ts 里这段代码绕过了 storage 适配层直接操作 localStorage，有可能还有其他地方也绕过了适配层。删除前全局搜一遍 pruneOldSessions 和 poem_memorize_history 的引用。
