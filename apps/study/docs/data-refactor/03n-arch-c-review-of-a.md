# 架构师 C 对方案 A（极简原始记录派）的评审

> 作者：架构师 C（领域驱动派）  
> 评审对象：方案 A（arch-a-minimal.md）以及讨论结论（discussion-conclusion.md）  
> 日期：2026-10-20

---

## 总体判断

方案 A 的核心理念是正确的：**以原始事实为中心，消除派生数据的存储冗余**。这与我 DDD 方案中"原始记录是 source of truth"的立场完全一致。

但方案 A 在以下三个方向上存在值得讨论的取舍：后端扩展路径、跨域查询复杂度、streak 统一的完整性。下面逐一展开。

---

## 一、后端扩展难度：方案 A 是优势，但有一个隐患

### 优点：append-only 是分布式同步的最佳形态

方案 A 两张 append-only 表（recitation_sessions、review_sessions）的同步策略极为简单：
- 以 id 为主键做 union，无冲突
- 不需要 CRDT，不需要 last-write-wins
- 任何设备上的新记录上传到后端后，其他设备拉取 union 即可

这是方案 A 相比方案 B（物化缓存 poem_states）最大的优势。B 方案的 poem_states 是多个字段的聚合，多设备写入时会有冲突：设备 A 的 bestStars=3、设备 B 的 bestStars=2，服务端收到两条 update 时无法确定哪个是最新状态。

**方案 A 天然规避了这个问题。**

### 隐患：review_sessions 没有 intervalUsed/efBefore 字段

方案 A 的 review_sessions 极简：只存 passed 和 qScore，不存 intervalUsed 和 efBefore。

这在**本地单机**场景下没问题——从完整的 review_sessions 序列可以无损重建 SM-2 状态。

但接入后端后，**增量同步场景**会出现问题：

假设用户在设备 A 背了 50 首诗，复习了 200 次，SM-2 累积了丰富的状态。然后在设备 B 首次登录，需要从后端同步数据。后端只存了 review_sessions，设备 B 要计算"今日待复习列表"，需要先把 200 条 review_sessions 全部重放一遍来重建每首诗的 SM-2 状态。

这 200 次重放在本地 useMemo 里是 <2ms，但在**首次同步初始化**时会变成一个问题：设备 B 需要把 200 条记录全部下载、解析、重放才能展示首页。而如果 review_sessions 里存了 efBefore + intervalUsed，设备 B 只需要下载最新一条（每首诗最新的 review_session）就能恢复 SM-2 状态，不需要完整历史。

**建议：在 review_sessions 里补充 efBefore 和 intervalUsed 字段（方案 A 和 B 的讨论中 B 已提出，A 应当接受这一改进）。**

这两个字段的代价极低（每条记录多 2 个 number），但在后端扩展时能避免全量重放的问题，同时不违反 append-only 原则。

---

## 二、跨域查询复杂度：方案 A 低估了聚合查询的难度

### 方案 A 的"全内存计算"前提成立，但边界不清晰

方案 A 的假设：启动时全量加载两张表到内存，所有统计在内存中用 useMemo 计算。

这个假设在数据量小时成立，但有两个边界条件值得明确：

**边界 1：全量加载的时机**

如果 recitation_sessions 和 review_sessions 放在同一个 React Context（AppContext 或 ProgressContext）里，启动时一次性加载，所有计算都在内存里做——这没问题。

但现有代码里，`HeatmapChart` 自己直接读 storage、`HardRanking` 自己读 storage、`buildWeeklyReport` 也直接读 storage。方案 A 没有明确说这些组件是改为从 Context 取数据，还是继续自己读 storage。如果继续自己读，"全量加载一次"的优化根本没有生效，每个组件都会独立触发 IndexedDB 读取。

**这是方案 A 文档里的一个执行层漏洞，不是方案本身的问题，但需要在实施计划里明确：所有组件的 sessions 数据来源必须统一走 Context，不能绕过 Context 直接读 storage。**

**边界 2：跨域聚合的复杂度**

方案 A 把"今日待复习列表"的计算描述为：
```
遍历所有 poemId → 重算 SM-2 state → 过滤 nextDue <= today
```

这在单一来源（review_sessions）里做是简洁的。但在我的 DDD 方案里，这个查询需要跨越学习域（哪些诗有背诵记录）和复习域（哪些诗的 nextDue 到期），两个域的数据都要读。

方案 A 因为没有域边界，两张表在同一个 Context 里，跨域查询反而更简单——这是方案 A 的一个意外优势。

但代价是：当未来业务复杂度增加（比如"今日任务"需要综合背诵计划 + 复习调度 + 用户设置的每日目标），所有这些逻辑都会堆积在同一个地方，没有边界隔离。

**对当前阶段（单机 PWA，功能相对明确）来说，方案 A 的无域边界是可以接受的。但建议在代码组织上做一个软边界——用 lib/stats.ts 统一暴露所有计算函数，不在组件里直接写 sessions.filter(...).map(...) 的内联计算，为未来分域做准备。**

---

## 三、Streak 统一的可行性：方案 A 有一个语义问题

### 方案 A 的 streak 定义：仅从 recitation_sessions 计算

方案 A 在 arch-a-minimal.md 的第 8 节定义：
```ts
function computeStreak(recitationSessions: RecitationSession[]): StreakData {
  const dates = new Set(recitationSessions.map(s => s.date));
  // 从今天往前数连续天数...
}
```

**这里只用了 recitation_sessions，没有包含 review_sessions。**

但在 discussion.md 的第一轮讨论里，方案 A 已经被修正：streak 应该是 recitation_sessions 和 review_sessions 的 date union。

这是方案 A 文档内部的不一致——arch-a-minimal.md 里的代码示例没有更新，但 discussion.md 里已经达成了共识（streak = 背诵 OR 复习任意一项发生的天数）。

**实施时需要以 discussion.md 的共识为准，方案 A 的原始文档里的 computeStreak 示例是错的，需要修正。**

### Streak 的"今天未背"边界问题

discussion-conclusion.md 疑问 4 提到：
> 如果今天还没背诗（凌晨刚打开 App），昨天有背，streak 应该显示 1 还是 0？

这是一个产品语义问题，不是技术问题。但方案 A 的代码示例里：
```ts
let d = today(); // 从今天开始往前数
while (dates.has(d)) { streak++; d = subtractDay(d); }
```

如果今天没有记录，这个循环一次也不会执行，streak = 0。这会导致用户昨天刚连续学习 30 天，今天早上打开 App 看到 streak = 0，体验极差。

**正确的语义应该是：**
```ts
function computeStreak(dates: Set<string>): number {
  const today = todayString()
  const yesterday = subtractDay(today)

  // 如果今天和昨天都没有，streak = 0
  if (!dates.has(today) && !dates.has(yesterday)) return 0

  // 从"最近有记录的日期"往前数
  let start = dates.has(today) ? today : yesterday
  let streak = 0
  let d = start
  while (dates.has(d)) {
    streak++
    d = subtractDay(d)
  }
  return streak
}
```

这样"今天还没背但昨天有"的情况，streak 仍然显示昨天为止的连续天数，不归零。

**这是方案 A 实现中的一个 bug，需要在 lib/stats.ts 里修正。**

---

## 四、对方案 A 的总体评分

| 维度 | 评分（满分5） | 说明 |
|------|------------|------|
| 数据一致性 | 5 | 单一来源，无同步问题 |
| 后端扩展性 | 4 | append-only 天然支持同步，但缺 efBefore/intervalUsed |
| 跨域查询 | 3 | 当前简单，未来复杂度无隔离 |
| Streak 统一 | 3 | 文档内部不一致，边界 bug 需修正 |
| 迁移友好性 | 3 | 虚拟 review_session 导致 SM-2 精度轻微损失 |
| 实现复杂度 | 5 | 最简单，代码量最少 |
| **综合** | **3.8** | |

---

## 五、方案 A 与 DDD 方案（C）的核心差异

我的 DDD 方案（architect-c-ddd.md）与方案 A 的最大区别不在于数据结构，而在于**代码组织方式**：

| 维度 | 方案 A | DDD 方案（C） |
|------|--------|-------------|
| 数据结构 | 基本一致（两张原始记录表） | 基本一致 |
| 代码边界 | 无显式边界，统一放 Context | 四个域，各自封装 |
| 跨域触发 | 直接调用（背诵完成直接更新调度） | EventBus 解耦 |
| 测试性 | Context 难以单元测试 | 每个域服务可独立测试 |
| 引入成本 | 低（在现有代码上修改） | 中（需要先建域服务层） |

**对当前阶段的建议：**

方案 A 的数据结构是对的，先按方案 A 的数据结构重构，把数据问题解决掉（消除冗余、统一 streak、拆分背诵/复习写入）。DDD 的代码边界可以作为第二阶段——在数据结构稳定后，逐步把 ProgressContext 里的计算逻辑提取到独立的 service 文件里，不需要一次性完成完整的 DDD 重构。

这样既能快速上线修复当前的数据混乱问题，又为未来的代码质量提升留下路径。

---

## 六、方案 A 需要补充的内容（给实施者的清单）

1. **review_sessions 补充 efBefore + intervalUsed 字段**（后端扩展必要，本地也支持可审计）
2. **computeStreak 修正**：输入改为 recitations + reviews 两个数组的 date union；修正"今天未学也不归零"的边界问题
3. **明确"数据来源统一走 Context"的实施约束**：HeatmapChart、buildWeeklyReport 等必须从 Context 取数据，不能绕过 Context 直接读 storage
4. **streak 语义对齐**：useAchievements 里的"连续 N 天"成就，需要明确是"背诵天"还是"学习天（背诵+复习）"，迁移前后语义要一致，避免成就意外触发或消失
5. **首次背诵后第一条 review_session 的 nextDue**：填 today 还是 today+1？需要产品确认，影响"今日待复习"的展示时机

---

## 七、架构师 C 支持哪个方案？

**数据层：支持方案 A（加上上述 5 点补充）**，而非 B（物化缓存 poem_states 引入的一致性维护成本不值得）。

**代码层：建议分两阶段**——第一阶段按方案 A 完成数据重构，第二阶段将计算逻辑从 Context 迁移到独立 service，实现软域边界，不需要完整 DDD。

方案 B 的核心论据（物化缓存提升读性能）在当前数据量级下是过早优化。如果未来真的出现性能问题，在 review_sessions 里加 sm2Snapshot 断点字段比引入整张物化表代价更小。

---

*评审文件生成时间：2026-10-20*  
*相关文件：arch-a-minimal.md、arch-b-proposal.md、architect-c-ddd.md、discussion.md、discussion-conclusion.md*
