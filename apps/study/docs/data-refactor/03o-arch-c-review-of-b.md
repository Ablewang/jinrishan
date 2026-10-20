# 架构师 C 评审：架构师 B 方案的物化缓存设计

> 评审者：架构师 C（领域驱动派）  
> 被评审方案：架构师 B 的 discussion-conclusion.md（基于 B 方案务实缓存派的最终结论）  
> 评审时间：2026-10-20

---

## 总体判断

B 方案在数据存储层面做出了正确的分层：原始记录（append-only）+ 物化缓存（SM-2 状态）。这个结构比现有代码清晰得多，方向是对的。

但我有三个核心异议，不是挑刺，是我认为在后端接入和长期维护场景下会真实痛到的地方。

---

## 一、缓存 vs 领域状态的本质区别

B 方案把 `review_schedules`（或 `srs_schedules`）定性为"SM-2 状态的物化缓存"。我认为这个定性是混淆了两个概念，进而导致设计上的模糊。

### 1.1 缓存的定义

缓存有一个严格的语义：**可以随时丢弃并从原始数据重建，丢弃后系统行为不变**。

Redis 是缓存，CDN 边缘节点是缓存，React 的 `useMemo` 是缓存——它们的共同点是：删掉它，逻辑正确性不受影响，只是性能变差。

### 1.2 SM-2 的 ef/interval 是不是缓存？

B 方案自己在 `arch-b-pragmatic.md` 第 1 节说得很清楚：

> SM-2 是路径依赖的。历史 review_sessions 只记录了 qScore，没有记录"这次复习距上次间隔了多少天"。

这段话的意思是：**如果没有 intervalUsed 字段，ef/interval 无法从 review_sessions 无损重建**。

但 discussion.md 最终结论的 review_sessions 定义里，是有 intervalUsed 字段的：

```ts
interface ReviewSession {
  ...
  intervalUsed: number   // 本次实际使用的 interval
  efBefore: number       // 复习前 ef 快照
}
```

加了这两个字段之后，SM-2 状态**是可以从 review_sessions 完整重建的**（A 方案在 discussion.md 里做了论证）。

那这时 review_schedules 就真的只是缓存了——可以丢弃，从 review_sessions 重建，系统行为不变。

**结论：B 方案的论证存在内部矛盾**。一方面说 SM-2 是路径依赖的必须存，另一方面又在 review_sessions 里补了完整的重建信息。两者加在一起，review_schedules 的"必要性"理由已经不成立了，剩下的理由只有性能（每次不用遍历重算），而性能可以用 useMemo 解决。

### 1.3 领域状态的定义（我的立场）

从领域驱动的视角，SM-2 调度表不是缓存，也不是派生数据，而是**领域状态（Domain State）**：

- 它是复习域内部的"当前决策依据"
- 它由领域事件（复习完成）驱动更新
- 它的存在是为了让复习域能够响应"今天该复习哪些诗"的查询，而不是为了优化性能

但这个区分在现阶段的单机 PWA 场景下，**对实现方案的选择没有决定性影响**。

真正有影响的是：**一旦接入后端，"缓存"和"领域状态"的同步策略完全不同**（见第三节）。

---

## 二、物化缓存能否替代领域事件

B 方案的写入流程是：

```
背诵完成 → 写 recitation_session → 更新 srs_schedules（SM-2 初始化）
复习完成 → 写 review_session → 更新 srs_schedules（SM-2 推进）
```

这个模式里，**"写原始记录"和"更新缓存"是同一个写入函数里的两步操作**，由调用方（saveResult / saveReviewResult）强制保证顺序。

我的问题是：这能否满足这个应用未来的扩展需求？

### 2.1 当前的隐式耦合

B 方案里，"背诵完成后初始化 SM-2 调度"是写死在 `handleReciteDone` 里的：

```ts
async function handleReciteDone(...) {
  await saveRecitationSession(...)
  await initSrsSchedule(poemId, qScore)  // 隐式耦合：背诵域知道复习域的内部结构
}
```

这意味着背诵逻辑需要知道复习域的初始化细节。如果将来要加一个规则"首次背诵后 2 天才加入复习队列"（而不是当天），改的是 `handleReciteDone`，而不是复习域内部逻辑——职责边界模糊了。

### 2.2 物化缓存的本质是跨域副作用

更准确的说法是：B 方案的 `srs_schedules` 更新，本质上是**背诵域/复习域之间的跨域副作用**，只是被实现成了"同一个函数里的第二步写入"，而没有显式的域边界。

这在当前代码量级下完全可以接受。但它带来的后果是：

- 当规则变复杂时（"连续3次3星才加入高强度复习队列"），改动散落在多处
- 没有一个地方可以看到"背诵完成后会触发哪些后续动作"的全貌
- 测试时需要 mock 整个写入链，而不是针对单个域

**我的建议（不是要求现在实现）**：哪怕不用事件总线，也要在代码里建立一个明确的"背诵完成后的副作用列表"，比如一个 `onRecitationComplete` 钩子或注册函数，而不是把副作用直接写进 `handleReciteDone`。

### 2.3 物化缓存无法替代领域事件的场景

举一个具体例子：假设将来要加"连续3天背诵触发成就推送通知"。

**用物化缓存的做法**：
- 在 `handleReciteDone` 里，写完 session 后，检查成就条件，触发通知

**用领域事件的做法**：
- 学习域 emit `recitation.completed`
- 成就域监听这个事件，自己检查条件，触发通知
- `handleReciteDone` 不知道成就系统的存在

两种做法在功能上等价，但后者：
1. 加新的"背诵完成后触发 X"功能时，不需要改 `handleReciteDone`
2. 成就系统可以独立测试
3. 后端接入时，可以把事件发到服务端，让服务端做跨设备通知

**结论**：物化缓存解决的是"如何存储跨域副作用的结果"，领域事件解决的是"如何触发跨域副作用"。两者不是同一层面的东西，不存在替代关系。B 方案现在把这两件事混在一起了，短期没问题，长期会成为技术债。

---

## 三、后端接入时的数据同步策略

这是我认为 B 方案最需要认真考量的地方。

### 3.1 两类数据的同步策略根本不同

B 方案最终有三类数据：

| 数据 | 类型 | 同步策略 |
|------|------|---------|
| recitation_sessions | append-only 事实 | 增量上传，以 id 为主键 union，无冲突 |
| review_sessions | append-only 事实 | 同上 |
| srs_schedules | 物化状态 | ？？？ |

前两张表的同步策略是确定的、简单的：只追加，不修改，用唯一 id 合并，天然幂等。

`srs_schedules` 的同步策略是什么？

**选项 A：不同步 srs_schedules，让各端自己从 review_sessions 重算**

这等于承认 srs_schedules 是缓存，每个端维护自己的计算结果，后端只存原始记录。

这正是 A 方案的立场。如果选这个选项，那 B 方案加 srs_schedules 的意义只剩"本地性能优化"，而且引入了本地的一致性维护成本。

**选项 B：同步 srs_schedules，以最后写入时间戳（updatedAt）为准**

当用户在手机和平板都复习了同一首诗，srs_schedules 会产生冲突：

```
手机：  ef=2.3, interval=14, nextDue=2026-11-03, updatedAt=T1
平板：  ef=2.1, interval=7,  nextDue=2026-10-27, updatedAt=T2（T2>T1）
```

取哪个？以 updatedAt 最新的为准（last-write-wins）？

这会丢掉手机端的复习数据。因为 srs_schedules 是聚合值，无法从两个版本合并出正确的 SM-2 状态——你不知道哪次复习先发生的。

**选项 C：同步 srs_schedules，以 review_sessions 为准重建**

这意味着：每当从后端拉取到新的 review_sessions 后，需要重算 srs_schedules。

这等于在"同步时"走了一遍 A 方案的逻辑——既然同步时要重算，那平时为什么不直接用 A 方案？

### 3.2 B 方案的真实同步成本

B 方案在后端接入时面临的问题：

1. **srs_schedules 无法合并**：它是聚合状态，不是原始记录，last-write-wins 会丢数据，合并逻辑需要重放 review_sessions（等于重算）
2. **两张表的一致性**：后端收到的 review_sessions 可能比本地 srs_schedules 的状态新或旧，需要校验
3. **多端的"今日待复习"列表可能不同**：如果两端的 srs_schedules 由于网络分区而不一致，用户在不同设备看到的待复习列表不同

### 3.3 A 方案在后端接入时的优势

A 方案的后端同步逻辑极简：

```
本地 recitation_sessions（自上次同步后的新增）→ POST /sync/recitations
本地 review_sessions（自上次同步后的新增）→ POST /sync/reviews

← 后端返回其他设备的新增记录（merge 到本地）
← 本地重算 SM-2 状态（useMemo，< 2ms）
```

没有冲突，没有合并逻辑，没有"状态和记录不一致"的问题。

B 方案要实现同等效果，必须在同步完成后对 srs_schedules 做一次 rebuild，而 rebuild 的逻辑本质上就是 A 方案的实时计算——兜兜转转，还是回到了重算这条路。

### 3.4 我的建议

如果后端接入是确定会做的事（哪怕是 6 个月后），我建议：

**现在就采用 A 方案（纯实时计算），不维护 srs_schedules。**

本地性能问题（B 方案最核心的论据）完全可以用 useMemo 解决：srs_schedules 等价于 `useMemo(() => computeAllSM2States(reviewSessions), [reviewSessions])`，在内存里，不落盘，没有一致性问题，没有同步成本。

如果将来真的遇到性能瓶颈（review_sessions 超过 10000 条，计算超过 100ms），再在 review_sessions 里加 `sm2Snapshot` 字段作为断点，比引入整张 srs_schedules 表的成本低得多。

---

## 四、对 discussion-conclusion.md 具体结论的评审

### 4.1 "不建 poem_states"——正确

结论文件中的这个判断我完全同意：

> poem_states 需要每次写 session 时同步更新，IndexedDB 适配层无多 key 事务支持，崩溃时会造成原始记录和缓存不一致。

poem_states 把背诵统计和 SM-2 状态合并进一张宽表，是把两个不同域的数据强行耦合。废弃是对的。

### 4.2 "review_schedules 作为过渡表，迁移后只读"——方向正确，但有遗漏

结论文件里 review_schedules 的定位是：迁移起点，提供旧 SM-2 状态，迁移后不再写入，下版本删除。

这个定位是对的。但有一个遗漏：**迁移完成后，review_sessions 作为 SM-2 驱动的唯一来源，需要一个"正确性验证"步骤**。

具体说：迁移生成虚拟 review_session 时，qScore 统一设为 4（通过），这会导致迁移后重算的 SM-2 ef 值偏高（偏乐观）。用户感知到的变化是"复习间隔突然变长了"。

建议在迁移函数里加一个断言：

```ts
// 迁移完成后，对每首诗验证新算的 nextDue 与旧 review_schedules.nextDue 差值
// 如果差值 > 7 天，记录到 migration_warnings，提示开发者检查
for (const poemId of migratedPoems) {
  const oldNextDue = oldSchedules[poemId].nextDue
  const newNextDue = computeSM2State(poemId, newReviewSessions).nextDue
  if (daysBetween(oldNextDue, newNextDue) > 7) {
    migrationWarnings.push({ poemId, oldNextDue, newNextDue })
  }
}
```

### 4.3 "streak 统一从 recitation_sessions + review_sessions union dates 计算"——正确

discussion.md 在第二轮讨论中已经把 streak 的定义从"只看背诵"改为"背诵或复习任意一项"，这是对的。

但 discussion-conclusion.md 的 computeStreak 定义只用了 recitation_sessions：

```ts
"连续天数（streak）：recitation_sessions distinct date 从今天往前连续计数"
```

这与 discussion.md 的结论不一致。建议统一为：

```ts
function computeStreak(
  recitations: RecitationSession[],
  reviews: ReviewSession[]
): number {
  const dates = new Set([
    ...recitations.map(s => s.date),
    ...reviews.map(s => s.date),
  ])
  let count = 0
  let d = todayString()
  while (dates.has(d)) { count++; d = subtractDay(d) }
  return count
}
```

### 4.4 "SM-2 退路方案：sm2Snapshot 字段"——我支持，建议现在就加

结论文件里提到：

> 若实测首次加载超过 100ms，在 review_sessions 末尾加可选 sm2Snapshot 字段存当时 SM-2 状态，作为断点重算起点。

我支持这个退路方案，但建议**现在就在 review_sessions 里预留这个字段**（可选，不填）：

```ts
interface ReviewSession {
  id: string
  poemId: number
  date: string
  timestamp: number
  passed: boolean
  qScore: number
  intervalUsed?: number   // B 方案要求保留
  efBefore?: number       // B 方案要求保留
  sm2Snapshot?: {         // 可选，重算断点
    ef: number
    interval: number
    repetitions: number
  }
}
```

字段加进去但不填，不影响现在的逻辑；将来需要性能优化时，只需要在写入函数里补上这个字段，不需要改数据结构。

---

## 五、总结：我的立场与建议

### 5.1 分歧点汇总

| 问题 | B 方案 | C 方案（我的立场）|
|------|-------|-----------------|
| srs_schedules 的性质 | 必要的状态存储 | 可以用 useMemo 替代的本地缓存 |
| 后端同步时的 srs_schedules | 需要解决合并冲突 | 不存在，从 review_sessions 重算 |
| 跨域副作用的触发方式 | 同函数内两步写入 | 建议显式注册副作用钩子 |
| poem_states | 两方都认为不该建 | 一致 |
| streak 定义 | 背诵+复习 union dates | 一致（但 conclusion.md 有遗漏）|

### 5.2 我能接受 B 方案的地方

如果决定采用 B 方案（保留 srs_schedules），以下条件我认为是必须满足的：

1. **review_sessions 必须包含 intervalUsed + efBefore 字段**（B 方案自己的要求，保持重建能力）
2. **srs_schedules 的写入顺序必须是：原始记录先写，缓存后写**（保证崩溃时可从原始记录 rebuild）
3. **必须实现 rebuildSrsSchedules() 函数**，App 启动时检测一致性
4. **后端同步时，srs_schedules 不同步，各端从 review_sessions 重算**（否则合并逻辑无解）

第 4 条实际上意味着：接入后端后，B 方案会自动退化为 A 方案的工作方式。这是 B 方案的内在矛盾——在本地用缓存，在后端用重算，维护了两套逻辑。

### 5.3 最终建议

当前阶段（单机 PWA，无后端）：B 方案和 A 方案都可行，B 方案的本地体验略好，A 方案的代码更简单。

如果 6 个月内确定接入后端：选 A 方案，今天省下的 srs_schedules 维护成本，后端同步时会双倍还回来。

如果后端接入遥遥无期（>1年）：B 方案是合理的务实选择，但必须满足上面四个条件，并在接入后端前做一次从 B 到 A 的重构。

---

*本文件生成时间：2026-10-20*  
*参与讨论的相关文件：arch-b-pragmatic.md、arch-b-proposal.md、arch-a-minimal.md、discussion.md、discussion-conclusion.md*
