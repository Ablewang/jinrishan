# 架构师 C 回应：架构师 A 的评审意见

> 回应者：架构师 C（领域驱动设计派）  
> 原评审文件：arch-a-review-of-c.md  
> 时间：2026-10-20

---

## 总体态度

A 的评审是认真的，指出了真实问题，我接受其中一部分。但有几个论点我不同意，需要逐一回应。

---

## 接受的批评

### EventBus 的 fire-and-forget 问题

A 说得对。本地写入场景里，直接 `await` 比 fire-and-forget 有更强的一致性保证。我在疑问4里自己也承认了"目前设计无补偿"——这不是一个可以用"概率低"来打发的问题，对用户来说静默丢失复习调度和数据错误没有本质区别。

**修正立场**：EventBus 的语义应该改为同步或可等待的，至少对"初始化复习调度"这类写入操作要能感知失败：

```ts
// 不应该这样（fire-and-forget）
eventBus.emit('learning.session_saved', ...)

// 应该这样（可等待）
await eventBus.emitAndWait('learning.session_saved', ...)
// 或者干脆直接调用，不用事件
```

如果事件机制做成同步/可等待的，那它和直接调用的区别只剩"是否隐藏了调用关系"，A 的另一个批评点（隐藏调用关系）就更突出了。我需要重新思考这个点。

### ProgressContext 保留是技术债延期

A 说"有 DDD 的名，无 DDD 的实"，这个批评准确。我方案里没有给出 ProgressContext 的中间路径，只是说"逐步委托"，这是模糊的。如果不能给出明确的拆分步骤和验收标准，保留 ProgressContext 就只是推迟了问题。

---

## 不接受的批评

### 关于"EventBus 解决了一个不存在的问题"

A 的反例是：
```ts
handleReciteDone() {
  saveRecitationSession(...)
  initReviewSchedule(...)   // 直接调，无需事件
}
```

这个例子看起来简单，但它忽略了**现在代码的问题是什么**：`handleReciteDone` 目前已经调用了 `markMemorized + markReviewed + saveResult`，耦合了三条写入逻辑。问题不是调用关系本身，而是**没有明确的边界，任何人都可以在这个函数里加任何逻辑**。

一个月后要加"背诵完成后检查里程碑"，会加在哪？还是 handleReciteDone 里。再过一个月加"背诵完成后刷新成就"，还是加在这里。这就是现在的 ProgressContext 变成 200 行上帝类的原因。

EventBus（或者任何形式的观察者模式）的价值不是解决今天的问题，而是**建立一个扩展点**，让未来的逻辑添加不需要修改 `handleReciteDone`。

A 的立场是"现在不存在这个问题"。我的立场是"这个问题正在形成，现在是最低成本修复的时机"。

这是一个时间维度上的分歧，不是对错，而是对"技术债"和"过度设计"边界的判断不同。

### 关于"域服务层对本项目没有实质收益"

A 的论据是：存储层已有适配层，数据量小，团队规模小。

我同意前两点，但"团队规模小"这个论据有问题。**小团队更需要边界清晰，因为一个人要同时维护所有逻辑，边界模糊的代价更大**。

大团队可以通过 code review 和沟通来弥补架构边界的不清晰；小团队（甚至单人）一旦边界模糊，几个月后自己也会忘记"这段逻辑应该放哪里"。ProgressContext 现在混杂了背诵状态、复习卡片、成就检查、streak 计算，就是边界模糊积累的结果。

不过 A 有一点是对的：**域服务的价值在于接口约束，不在于实现层**。我可以接受"只定义 interface，不要求独立的 Service 类"这个折中。

### 关于"直接调用比 EventBus 更清晰"

A 说 EventBus"隐藏了调用关系"，这是真的。但这里存在一个框架理解上的误解：

EventBus 的目的本来就不是让调用关系更"可见"，而是**让写入方不需要知道谁在关心这个事件**。学习域的职责是"记录背诵事件"，它不应该知道复习域的存在，更不应该知道成就域的存在。

如果改成直接调用：
```ts
handleReciteDone() {
  saveRecitationSession(...)
  initReviewSchedule(...)     // 学习域依赖复习域
  checkAchievements(...)      // 学习域依赖成就域
  checkMilestones(...)        // 学习域依赖用户域
}
```

这不是"清晰"，这是学习域承担了本不属于它的职责。下次要加一个新的响应逻辑，还是要改 `handleReciteDone`。

当然，如果这个 App 永远只有当前这些功能，直接调用确实更简单。**关键分歧在于：是否预期功能会继续增长？**

---

## 对 A 评审的反问

### 反问1：直接调用的边界问题

如果采用 A 方案（直接调用），背诵完成后的逻辑放在哪个文件里？
- `PoemDetail.tsx`（页面组件）？
- `useRecitation.ts`（背诵 hook）？
- `ProgressContext.tsx`（全局状态）？

现在三个地方都有相关逻辑，A 方案没有给出一个明确的"边界在哪里"的答案，只是说"直接调用"。直接调用是手段，不是边界。

### 反问2：未来加"复习完成后推送通知"怎么办

假设三个月后需求是：用户复习完一首诗，如果是"已掌握"级别，推送一条鼓励通知。

- A 方案：找到 `saveReviewResult` 函数，加一个 `if level === 5, push notification`
- C 方案：在通知域（或用户域）里注册 `review.session_saved` 的监听器，一行代码，不改现有逻辑

小需求的时候 A 方案看起来更简单，需求积累后 A 方案会变成现在 ProgressContext 的样子。

### 反问3：`achievement_events` 的一致性

A 方案里，`useAchievements` 是从 ProgressContext 读 `streak`、`totalMemorized` 等字段来判断成就条件。这意味着成就检查是在 React 渲染层做的（Context 变化 → 重新计算成就 → 写 achievement_events）。

这样会不会出现"背诵完成 → Context 更新 → 成就检查在下一个 tick → 成就触发延迟"的问题？或者 App 在后台时 Context 不渲染，成就检查不触发？

DDD 方案里成就检查是事件驱动的（写入完成后立即触发），不依赖 React 渲染层，这是一个实质的稳定性差异。

---

## 修正后的立场

综合 A 的评审，我愿意修正的部分：

1. **EventBus 语义改为同步/可等待**，不使用 fire-and-forget，确保写入一致性
2. **ProgressContext 给出明确的拆分路径**，而不是模糊的"逐步委托"
3. **域服务以 interface 为主**，不强制要求独立的 Service 类实现，可以用 hook 实现接口约束

**不修正的部分**：

1. 域边界的划分仍然有价值，即使不用 EventBus，也应该明确"哪段逻辑属于哪个域"
2. 观察者模式（即使不叫 EventBus）对减少 `handleReciteDone` 的膨胀有价值
3. `achievement_events` 改为追加记录的提议

---

## 给 A 的协商提案

如果 A 坚持不用 EventBus，可以接受以下折中：

**方案：直接调用 + 明确边界**

```ts
// src/services/reciteAndTrigger.ts
// 这是应用层协调函数，不属于任何单一域

async function handleReciteDone(poemId: number, result: ReciteResult) {
  // 1. 学习域：写入背诵记录（学习域职责）
  const session = await learningService.saveSession({ poemId, ...result })

  // 2. 复习域：初始化或响应调度（复习域职责，直接调用）
  await reviewService.onNewSession(session)

  // 3. 用户域：检查成就（用户域职责，直接调用）
  await userService.checkAchievements()
}
```

这样的结构：
- 没有 EventBus，A 满意
- 调用链路清晰可见，A 满意
- 各域职责明确，C 满意
- 应用层协调逻辑集中在一个地方，而不是散在 PoemDetail、ProgressContext、useRecitation 三处

**代价**：`handleReciteDone` 需要知道所有域服务，但这是**应用层的职责**——协调各域，这是合理的耦合。

这个折中方案值得 A 考虑吗？
