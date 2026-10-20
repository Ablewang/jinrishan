# 数据架构重构：完整讨论过程

> 记录三个方案的核心立场、六份交叉评审的关键摘要，以及分歧演化路径。
> 最终结论见 discussion-conclusion.md。

---

## 参与者

| 角色 | 立场 |
|------|------|
| 架构师 A | 极简原始记录派：两张 append-only 表 + 所有统计实时重算，不保留任何 SM-2 缓存 |
| 架构师 B | 原始记录 + 物化缓存派：保留 SM-2 缓存表，首页加载路径最短，迁移无损 |
| 架构师 C | 领域驱动设计派：四域划分（学习/复习/计划/用户）+ EventBus 解耦 + Service 类 |

---

## 第一轮：三方各自提案

### 方案 A 的核心主张

A 方案的出发点是"消除所有可能造成不一致的缓存"。

**数据表：**
- recitation_sessions（补 charCount）
- review_sessions（新建，不含 levelBefore/levelAfter）
- srs_schedules（作为迁移过渡表，之后废弃）
- poem_queue（去掉 streak_count）
- user_profile（合并三个散 key）
- poem_achievement_dates（保留）

**核心论点：**

> SM-2 状态从 review_sessions 历史序列实时重算。重度用户 200 首 × 20 次 = 4000 次迭代，< 1ms。useMemo 保证只在数据变化时重算，不是每次渲染都算。零缓存即零缓存一致性问题。

**关键决策：**
- streak 统一为 recitation + review union dates（"学习天"）
- handleReciteDone 不再调 markReviewed，背诵和复习逻辑彻底拆分
- 背诵完成后立即写第一条 review_session 作为 SM-2 起点
- 所有非 SM-2 统计数据一律实时计算，不落盘

**A 方案遗留的疑问（自己提出）：**
- streak 跨夜边界问题（凌晨背诗算哪天）
- 成就系统 streak 定义对齐（背诵天 vs 学习天）
- charCount 来源的异步问题
- poem_achievement_shown 等废弃 key 的处置

---

### 方案 B 的核心主张

B 方案认为"务实性比纯粹性更重要"，在接受 A 大部分原则的前提下，坚持保留 SM-2 缓存。

**与 A 方案的共同点（不存在争议）：**
- recitation_sessions + review_sessions 作为 append-only 原始记录
- 废弃 poem_progress、poem_review_cards、poem_memorize_history、poem_total_chars
- 废弃三套 streak，改为实时计算
- ProgressContext 对外接口不变

**与 A 方案的分歧：**

B 方案保留 review_schedules（在最终方案中改名为 srs_schedules）作为 SM-2 长期缓存，理由：

> 首页"今日待复习"是高频操作，读缓存 O(n)（n=诗首数）比重算 SM-2 O(n×m) 更直接。旧 review_schedules 的 ef/interval 可以直接保留，避免迁移后用户复习进度被重置。

B 方案同时指出不建 poem_states 宽表的原因：IndexedDB 适配层无多 key 事务支持，崩溃会造成原始记录和缓存不一致。

---

### 方案 C 的核心主张

C 方案在数据层设计上与 A/B 高度收敛，独特贡献在代码组织层。

**数据层的具体改进（被三方采纳）：**
- achievement_events 改为 append-only 追加记录（替代 Record 结构的 poem_achievement_dates），保留完整解锁历史
- poem_queue 归属"计划域"的语义分析（意图 vs 事实、生命周期不同）

**代码层主张（有争议）：**
- 引入 EventBus 解耦学习域、复习域、用户域，背诵完成后通过事件通知各域异步响应
- 引入四个域服务类（LearningService、ReviewService 等），以 Class 而非 Hook 实现

**C 方案的自我疑问：**
- 用户重背已调度诗时，复习域如何响应（三个选项语义差异显著）
- ProgressContext 是保留还是立即拆散
- EventBus fire-and-forget 语义下，initSchedule 失败如何补偿

---

## 第二轮：交叉评审

### 评审1：A 评审 discussion-conclusion.md 收敛方案（9分）

A 总体认可收敛方案的方向，评分最高，但指出几个实施风险：

**发现的问题：**

1. **streak 数据源不一致**：discussion-conclusion.md 的 derived_computations 写的是"recitation_sessions distinct date"，但讨论已经达成共识应为 recitation + review 的 union。两处描述矛盾，实现时容易漏掉 review_sessions。

2. **首次背诵是否写 review_session 未在 key_decisions 落地**：concerns 里提了问题但没给答案，实现者会有两种做法，埋下隐患。

3. **review_schedules 的"只读"约束没有代码执行机制**：仅靠文档约定，极易退化为"一直在用但没人敢删"的僵尸表。建议在 storage 适配层对废弃 key 加 console.warn 拦截。

4. **computeStreak 边界语义不清**："截至昨天的连续天数，今天有背才+1"有歧义，今天没背时到底显示多少天需要明确定义。

**关键建议：**
- review_sessions 现在就加可选的 hintCount?: number（append-only 早加字段成本极低）
- 迁移后立刻执行 streak 一致性断言
- key_decisions 里补充两条明确决策：(1) 背诵完成是否写 review_session；(2) streak 数据源为 union dates

---

### 评审2：A 评审 C 方案（6.5分）

A 认可 C 方案数据层的部分改进，但强烈反对 EventBus。

**认可的点：**
- achievement_events 改为追加记录是实质性改进
- poem_queue 归属计划域的论据逻辑严谨
- 提出应用层协调函数（reciteAndTrigger）作为折中方案合理

**关键批评：**

> fire-and-forget 事件语义导致写入失败时无法感知：学习记录写入成功但复习调度初始化失败，用户永远不会收到复习提醒，且不会有任何错误提示。这是静默数据不一致，不可接受。

> EventBus 的必要性不成立：当前背诵完成后只需响应两件事（初始化复习调度、检查成就），直接 await 两个函数即可，引入 EventBus 只增加复杂度而不解决问题。

**建议：** 放弃 EventBus，改用应用层协调函数；放弃 Service 类，以 TypeScript interface 定义域边界。

---

### 评审3：B 评审 A 方案（6.5分）

B 认可 A 方案的方向，但指出三个关键风险，最终促使了最终方案保留 srs_schedules。

**发现的关键问题：**

**风险1：useMemo 无法避免冷启动重算（IO 瓶颈）**

> A 方案认为"useMemo 保证打开首页不会重算"混淆了两个场景：组件重渲染时 useMemo 确实不重算，但 App 冷启动后 IDB 重新加载数据会产生新的数组引用，useMemo 必然重算一次。2年以上用户 review_sessions 可达 10000+ 条，IDB 反序列化需要 80-200ms。这是 IO 瓶颈，不是计算瓶颈。

**风险2：computeSM2State 存在语义漏洞**

> A 方案的 applyReview 只接受 qScore，不接受"本次实际复习间隔"。标准 SM-2 里，用户提前复习时 interval 应打折。重算时没有 intervalUsed，这个分支会走错——是静默的语义错误。

**风险3：迁移时 SM-2 状态必然偏差（高严重性）**

> A 方案为每首诗生成1条虚拟 review_session（qScore=4），从初始状态重算的 nextDue 是 today+1，而用户原来的 nextDue 可能是三周后。迁移当天用户会看到大量"本来以为不用复习的诗突然出现在待复习列表"。B 方案直接迁移 review_schedules → srs_schedules，ef/interval/repetitions/nextDue 全部保留，迁移精度100%，用户无感知。

**B 的最终建议：** 保留 srs_schedules 作为 SM-2 长期存储，每次复习后 update in place，启动时做一致性校验（约50行 fallback 代码）。

---

### 评审4：B 评审 C 方案（6.5分）

B 认可 C 方案的域划分思想，但同样反对 EventBus，同时指出 C 方案数据层的一个遗漏。

**认可的点：**
- 域划分语义清晰，即使不实施 DDD 也可作为代码组织参考
- achievement_events 改为追加记录是实质改进，值得独立采纳
- poem_queue 归属计划域的论据最完整

**关键批评：**

> EventBus fire-and-forget 的一致性缺陷：C 方案自己在疑问4中承认了这一点——若 initSchedule 失败，当前设计无补偿机制。直接调用在同一函数内写多个 key，任何失败均可感知并重试。

> 后端同步时 srs_schedules 无法合并：两端各自复习了同一首诗后，ef/interval 产生冲突，last-write-wins 丢失数据，merge 需要重放 review_sessions（即退化为 A 方案）。这意味着接入后端后必须做一次重构，今天的 srs_schedules 维护成本会在同步阶段双倍偿还。

**B 对后端接入时机的建议：**

> 若后端接入是6个月内确定的事，直接选 A 方案。若遥遥无期（>1年），B 方案是合理的务实选择。

---

### 评审5：C 评审 A 方案（3.8分，评分最低）

C 认可 A 方案的数据一致性优势，但指出实施层面的几个关键 bug。

**认可的点：**
- 数据一致性最优，彻底消除冗余派生存储
- append-only 语义天然支持后端增量同步，无冲突合并
- 调试友好，出 bug 时直接看原始记录序列

**发现的关键 bug：**

**Bug1：computeStreak 今天没背时归零**

> 从"今天"开始往前数，今天没背则 streak = 0，用户连续学了30天后早上打开 App 看到归零，体验极差。正确做法是"今天没记录则从昨天开始数"。

**Bug2：review_sessions 缺少 efBefore / intervalUsed**

> 本地单机可以从完整历史序列重建 SM-2，但接入后端后增量同步时设备 B 需要下载全部历史才能恢复调度状态，代价不必要。建议现在就加。

**Bug3：computeStreak 文档内部不一致**

> arch-a-minimal.md 第8节代码示例只用 recitation_sessions，但 discussion.md 已达成共识应取 union dates，实施者容易按旧代码执行。

**C 的建议：** 数据层按方案 A 执行，代码层分两阶段——第一阶段完成数据重构，第二阶段把计算逻辑从 ProgressContext 提取到独立 service 文件，实现软域边界。

---

### 评审6：C 评审 B 方案（7.2分）

C 认可 B 方案废弃冗余存储的核心方向，但发现了一个长期架构问题。

**认可的点：**
- 废弃 poem_progress / poem_review_cards 等判断完全正确
- 保留 review_schedules 作为迁移过渡表的处理方式务实可行
- review_sessions 补 intervalUsed + efBefore 的决定正确
- 不建 poem_states 的判断正确

**论证内部矛盾：**

> B 方案一方面说 SM-2 路径依赖必须存 srs_schedules，另一方面又在 review_sessions 里补了 intervalUsed + efBefore，使重建完全可行。两者同时成立时，srs_schedules 的必要性理由只剩性能，而非语义正确性。

**后端同步的长期问题：**

> srs_schedules 作为聚合状态，在后端多设备同步时无法合并：两端各自复习了同一首诗后，ef/interval 产生冲突，last-write-wins 丢失数据，正确做法是从 review_sessions 重算（即退化为 A 方案）。这意味着接入后端后必须做一次从 B 到 A 的重构。

C 对此的态度是：若后端接入时间表确定，直接选 A 方案。否则，B 方案是合理的短期选择，但应明确文档：后端同步时不同步 srs_schedules，而是从 review_sessions 重算。

---

## 第三轮：分歧收敛

六份评审完成后，三个分歧点的解决路径：

### 分歧1：SM-2 状态要不要缓存

**演化过程：**

- A 最初主张完全废弃 srs_schedules
- B 指出迁移精度（用户复习进度被重置）和 IO 性能两个不可接受的问题
- C 指出 srs_schedules 在后端同步时无法合并，是长期架构问题
- A 提出 sm2Snapshot 退路字段方案
- 讨论最终收敛：**短期内保留 srs_schedules 是务实选择**，但长期要为废弃它做准备

**最终裁决：保留 srs_schedules 作为长期缓存**

原因：迁移精度问题（B 评审指出）是硬约束，不可接受用户感知到复习进度被重置。IO 性能问题在当前规模可能不明显，但架构上应避免不必要的全量加载。

退路条件：若未来后端同步，不同步 srs_schedules，而是从 review_sessions 重算。review_sessions 保留 intervalUsed + efBefore 字段确保重算精度，这是三方共同采纳的字段。

---

### 分歧2：是否引入 EventBus

**演化过程：**

- C 提出 EventBus，核心理由是解耦各域
- A 指出 fire-and-forget 语义下 initSchedule 失败是静默数据丢失，不可接受
- C 修正：EventBus 应该是可等待的（不是 fire-and-forget）
- A 反驳：可等待的 EventBus 与直接调用功能等价，只增加概念层
- B 支持 A 的立场，同时指出 EventBus 在本地 PWA 的必要性极低
- C 最终接受：提出应用层协调函数作为折中方案

**最终裁决：不引入 EventBus，采用应用层协调函数**

```ts
async function handleReciteDone(poemId, result) {
  const session = await saveRecitationSession({ poemId, ...result })
  await initSrsSchedule(session)
  await checkAndUnlockAchievements()
  return session
}
```

这个结构：调用链路清晰可追踪、失败可感知、不依赖 React 渲染层、扩展点明确。

---

### 分歧3：是否引入 Service 类

**演化过程：**

- C 主张四个域服务类
- A 认为 React 项目里 Service 类是反模式
- B 认为 Class 在可测试性上有优势，但改动成本超过当前收益
- C 最终修正：接受"以 interface 为主，不强制 Class 实现"

**最终裁决：不引入 Class，以 TypeScript interface + hook 实现域边界**

具体做法：src/types/services.ts 定义方法签名作为约束，实现侧用 hook 和纯函数，目录按域组织体现软边界。

---

## 评分汇总

| 评审方 | 被评对象 | 评分 | 主要理由 |
|-------|---------|------|---------|
| A | discussion-conclusion.md 收敛方案 | 9/10 | 方向正确，有几处实施细节需要补充 |
| A | C 方案 | 6.5/10 | EventBus 静默失败不可接受，数据层改进值得采纳 |
| B | A 方案 | 6.5/10 | 迁移精度和 IO 瓶颈是真实风险，不只是性能问题 |
| B | C 方案 | 6.5/10 | EventBus 一致性缺陷，后端同步时 srs_schedules 无法合并 |
| C | A 方案 | 3.8/10 | computeStreak 有 bug，缺少 efBefore/intervalUsed |
| C | B 方案 | 7.2/10 | 方向正确，论证有内部矛盾，后端同步是长期问题 |

C 对 A 方案评分最低（3.8），但主要原因是"有 bug 待修复"而非方向错误。修复 bug 后，C 认为 A 方案在数据层是正确的，只是代码组织层还需要改进。

---

## 三方共识汇总

无论方案选择，以下内容三方完全一致：

**数据层共识：**
- recitation_sessions + review_sessions 是 append-only source of truth
- review_sessions 需要包含 intervalUsed + efBefore 字段
- 废弃 poem_progress、poem_review_cards、poem_memorize_history、poem_total_chars
- 废弃三套 streak，统一实时计算，定义为 recitation + review union dates（"学习天"）
- poem_queue 保留但去掉 streak_count
- user_profile 合并三个散 key
- achievement_events 改为 append-only 追加记录（C 方案提议，三方采纳）
- 不建 poem_states 物化宽表

**代码层共识：**
- handleReciteDone 不再调 markReviewed，背诵和复习写入彻底拆分
- ProgressContext 对外接口不变，内部改为从 sessions 实时计算
- storageMonitor.pruneOldSessions 直接废弃
- computeStreak 边界语义：今天没记录则从昨天开始数（不归零）
- 全站统一用 stats.ts 的 computeStreak，不内联实现

---

*文件索引：research.md → plan.md → arch-a-minimal.md → arch-b-pragmatic.md → architect-c-ddd.md → discussion.md → arch-b-review-of-a.md → arch-c-review-of-a.md → arch-a-review-of-c.md → three-way-conclusion.md → discussion-conclusion.md（最终结论）→ discussion-process.md（本文）*
