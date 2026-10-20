# 架构师 A 评审：架构师 C 的 DDD 方案

> 评审者：架构师 A（极简原始记录派）  
> 被评审方案：架构师 C（领域驱动设计派）  
> 评审时间：2026-10-20

---

## 总体判断

C 方案的**数据结构设计**和 A/B 两方案高度收敛，核心理念没有问题——原始记录 append-only、废弃冗余缓存、streak 统一实时计算。这部分我直接认同。

但 C 方案在数据方案之上叠加了一套 **DDD 架构层**（域服务 + EventBus），这是我的主要异议所在。我的结论是：**DDD 层在本项目当前阶段属于过度设计，引入的复杂度超过了它解决的问题**。

---

## 认同的部分

### 数据层设计

C 方案的存储 key 清单与 A/B 方案讨论结论基本一致：

- `recitation_sessions`：append-only，加 charCount ✓
- `review_sessions`：新建，append-only ✓
- `review_schedules`：保留状态缓存（C 的立场，与 B 相同；A 认为可废弃，这是 A/B 的分歧点，与 C 无关）
- 废弃 `poem_progress`、`poem_review_cards`、`poem_memorize_history`、`poem_total_chars`、三套 streak ✓
- `poem_queue` 去掉 `streak_count` ✓
- `user_profile` 合并零散 key ✓

C 方案在 `achievement_events` 上有一个小改进：把原来的 `poem_achievement_dates`（Record 结构）改成追加记录，保留完整解锁历史。这个改进是合理的，值得采纳。

### `poem_queue` 归属计划域的分析

C 方案对 `poem_queue` 的分析（意图 vs 事实、生命周期不同、触发关系而非同属关系）逻辑严谨，完全同意。这个分析对 A/B 方案也适用，我们在讨论时隐含地遵循了这个原则，C 把它显式说清楚了，是好事。

---

## 主要异议：DDD 层的必要性

### 1. EventBus 是在解决一个不存在的问题

C 方案引入 EventBus 的核心理由是：**背诵完成后，复习域通过监听事件来初始化 ReviewSchedule，而不是由背诵函数直接调用复习逻辑**。这被称为"DDD 与 plan.md 方案最核心的区别"。

但我要问：这个解耦到底在解决什么问题？

当前代码的真实问题是 `handleReciteDone` 同时调 `markMemorized + markReviewed`，导致 `lastDate` 被污染。这个问题的根源是**写入了错误的数据**（把背诵当复习写），而不是函数之间存在调用关系。

解决方案只需要：
```ts
// 背诵完成时
handleReciteDone() {
  saveRecitationSession(...)   // 只写背诵记录
  initReviewSchedule(...)      // 初始化复习调度（直接调，无需事件）
  // 不再调 markReviewed
}
```

这两行直接调用代码清晰、可测、失败时可以统一处理。把它改成：
```ts
handleReciteDone() {
  saveRecitationSession(...)
  eventBus.emit('learning.session_saved', ...)
  // 复习域在某个地方注册了监听器，异步执行 initReviewSchedule
}
```

增加了一层间接，让读者必须找到监听器注册的地方才能理解完整流程。这不是解耦，是**隐藏了调用关系**。

**过度设计的判断标准**：如果去掉一个机制后，代码变得更简单且功能不变，那个机制就是过度设计的。EventBus 在这里满足这个条件。

---

### 2. 域服务层对本项目没有实质收益

C 方案的四个域服务（LearningService、ReviewService、PlanService、UserService）每个约 100~150 行，主要内容是封装 storage 读写。

这等同于引入了四个"Repository 层"，在企业应用中这是标准做法，但本项目有几个关键特征使这一层显得多余：

**特征一：存储层已经有适配层**

`storage` 适配层已经抽象了 IndexedDB 的读写细节。域服务再包一层，等于在已有抽象上堆抽象。

**特征二：数据量决定不需要复杂查询**

1000 条以下的 sessions，直接在内存中 filter/reduce 比经过 Service 层的异步调用更直接。域服务的 `getSessions(poemId?: number)` 实际上只是：
```ts
return sessions.filter(s => !poemId || s.poemId === poemId)
```

**特征三：团队规模**

C 方案自己也承认"改动周期是 plan.md 方案的 2 倍（2~4周 vs 1~2周）"。对于一个由少数人（或单人）维护的 PWA，两倍的实现成本换来的架构纯洁性是否值得，需要打一个大大的问号。

---

### 3. Fire-and-forget 事件语义在写入场景是错误的权衡

C 方案的 EventBus 采用 fire-and-forget 语义（异步不等待），理由是"本地 PWA 存储失败概率极低"。

但**概率低不等于可以忽略**。用户背完一首诗，期望它出现在待复习列表里。如果 EventBus 处理器失败（存储写入失败、App 切换到后台、任何异常），这首诗就不会被初始化 ReviewSchedule，用户永远不会收到复习提醒，但用户不会知道出了问题。

C 方案的疑问4本身也承认了这个风险，并说"目前设计无补偿"。

对比直接调用的方式：
```ts
async function handleReciteDone(...) {
  await saveRecitationSession(...)   // 失败抛异常，UI 可以处理
  await initReviewSchedule(...)      // 失败抛异常，UI 可以处理
}
```
整个操作要么成功，要么失败并给用户反馈，没有静默失败的可能。

**结论：在本地写入场景，直接调用比 fire-and-forget 的事件机制有更强的一致性保证，代码也更简单。**

---

### 4. ProgressContext"保留作为过渡聚合层"是技术债的延期

C 方案建议"短期保留 ProgressContext，内部逐步委托到各域服务"。但 ProgressContext 目前有 10+ 个消费者，每个消费者依赖的字段不同。如果内部改为调用域服务，ProgressContext 就变成了一个跨域的聚合胶水层，职责更混乱而不是更清晰。

这是 DDD 方案常见的半拉架构问题：域边界建立了，但应用层的聚合逻辑没有一起重构，最终变成"有 DDD 的名，无 DDD 的实"。要么彻底拆散（改动大），要么保留现状（DDD 价值未实现）。C 方案没有给出一个合理的中间路径。

---

## 对 C 方案具体疑问的回应

**疑问1（重背时复习域如何响应）**：这是一个产品问题，不是架构问题。A/B 方案也需要解答这个问题。但在 DDD 方案里，因为事件是异步的，这个"选项A/B/C"的逻辑要藏在事件处理器里，比直接在背诵函数里写一个 if 更难找到和修改。

**疑问2（ProgressContext 是否拆散）**：见上文。DDD 方案把这个问题变得更复杂而不是更简单。

**疑问3（实时计算上限）**：这个疑问 A/B 两方案都已讨论过，结论是 1000 条以下完全无感知，且可以用 useMemo 解决。C 方案在这一点上没有新的见解。

**疑问4（事件失败无补偿）**：这是我上文分析的核心问题。DDD 引入的 fire-and-forget 语义制造了一个新的不一致风险，而这个风险在直接调用方式下根本不存在。

**疑问5（计划域 streak 去掉后激励维度）**：这个问题与架构无关，A/B 方案的 discussion.md 里已有讨论。

---

## 对 C 方案有价值部分的建议

C 方案里有价值的思考不应该被 DDD 包装掩盖，可以单独采纳：

1. **`achievement_events` 改为追加记录**：替代原来的 Record 结构，是实质改进，应该采纳。
2. **`poem_queue` 归属分析**：显式记录了"意图 vs 事实"的语义边界，可以作为 code comment 保留在代码里。
3. **域服务的接口设计**（不是实现）：C 方案对每个域服务的接口（LearningService、ReviewService 的方法签名）可以直接作为 TypeScript interface 写进代码，供 hook 实现参考。这层接口有文档价值，无需真正建"域服务"来实现它。

---

## 结论

| 评估维度 | C 方案 |
|---------|--------|
| 数据结构正确性 | 好，与 A/B 收敛 |
| 事件机制必要性 | 不必要，引入了新的不一致风险 |
| 域服务层收益 | 对本项目规模可忽略，增加改动周期 |
| 一致性保证 | 弱于直接调用（fire-and-forget） |
| 对当前团队的适合性 | 不适合（2~4 周 vs 1~2 周，无实质收益） |
| 可测试性 | 确实提升，但代价超过了收益 |

**总结：采纳 C 方案的数据层设计（与 A/B 一致），放弃 EventBus 和域服务层。**

若将来接入后端、或团队规模扩大到需要多人并行开发各域、或 App 逻辑复杂到背诵/复习/计划三者有深度交叉，再引入 EventBus 和域服务不迟。现在引入是在为一个还不存在的问题付出真实的成本。
