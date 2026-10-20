# 架构师 A 最终回应

> 回应 arch-c-response-to-a.md  
> 时间：2026-10-20

---

## 对 C 反问的回应

### 反问1：直接调用的边界问题

C 问"背诵完成后的逻辑放哪个文件"，这是个好问题。我的答案是：

**放在 `src/hooks/useRecitation.ts` 的 `saveResult` 函数里。**

这个 hook 已经是背诵流程的核心写入点，它写 `recitation_sessions`、更新 `srs_streak_v2`、更新 `review_schedules`。重构后它应该写 `recitation_sessions` + 调 `initReviewSchedule`（来自同一个 hook 或单独的 `useSrs` hook）。

`PoemDetail.tsx` 调 `saveResult`，不知道内部逻辑，边界清晰。

C 方案的协商提案（`src/services/reciteAndTrigger.ts`）和这个思路本质相同，只是命名不同。**我接受这个折中，这是合理的应用层协调函数。**

### 反问2："复习完成后推送通知"

C 的例子有说服力：新增响应逻辑时，EventBus 比直接调用改动更小。

但我要指出一个前提：C 的例子假设"通知域"是一个独立的、已经存在的域。如果它存在，EventBus 确实有价值。但如果它还不存在（当前就是这种情况），那就是在为一个假设的未来架构付出今天的成本。

**务实的做法**：先直接调用，当某类响应逻辑真的出现了第三个、第四个监听者时，再提取成 EventBus。这叫"在正确的时机引入正确的抽象"，而不是预先引入。

当前状态：背诵完成后需要响应的只有两件事（初始化复习调度、检查成就），直接调用两个函数完全够用。

### 反问3：成就检查的一致性

C 指出 A 方案的成就检查依赖 React 渲染层（Context 变化 → 成就检查），可能出现延迟或后台不触发。

这个问题是真实的，但解决方案不需要 EventBus。只需要把成就检查放在写入完成后直接调用：

```ts
async function saveResult(...) {
  const session = await appendRecitationSession(...)
  await initReviewSchedule(session.poemId, session.qScore)
  await checkAndUnlockAchievements()   // 直接调，不依赖渲染层
  return session
}
```

成就检查是纯粹的读-写操作（读 sessions/streak，写 achievement_events），放在写入链路里完全合理，不需要 React Context 参与。

**这个问题 A 方案可以修复，不需要引入 EventBus。**

---

## 对协商提案的回应

C 的协商提案：

```ts
// src/services/reciteAndTrigger.ts
async function handleReciteDone(poemId, result) {
  const session = await learningService.saveSession(...)
  await reviewService.onNewSession(session)
  await userService.checkAchievements()
}
```

**我接受这个结构，但有两点调整建议：**

**调整一：不叫"Service"，叫实现更直白的名字**

`learningService.saveSession` 在当前代码库里对应 `useRecitation` hook 的 `saveResult`。可以保持 hook 的形式，不需要建立 `LearningService` 类。最终结构：

```ts
// src/hooks/useRecitation.ts
async function saveResult(...) {
  const session = await appendToStorage(...)
  await initSrsSchedule(session)       // 内部调用，来自 useSrs
  await checkAchievements(session)     // 内部调用，来自 useAchievements
  return session
}
```

或者如果觉得 hook 内部调其他 hook 不干净，那就在 `PoemDetail.tsx` 里展开：

```ts
// PoemDetail.tsx - handleReciteDone
const session = await saveResult(...)     // useRecitation
await initSrsSchedule(session.poemId)    // useSrs
await checkAchievements()                // useAchievements
```

两种都比 EventBus 更清晰，都不需要建 Service 类。

**调整二：C 的协商提案里用了 `learningService`、`reviewService`、`userService`——这三个对象从哪里来？**

如果它们是单例（模块级导出），就是普通函数调用，OK。  
如果它们是 DI 注入的，引入了新的依赖管理问题，不 OK。  
如果它们是 React Context 提供的，又绕回渲染层依赖，不 OK。

在 React + Hook 的技术栈里，"域服务"的自然形态就是 hook 或者普通函数，不需要 Service 类。

---

## 最终立场修订

经过这轮讨论，我修订如下：

**坚持的部分：**
- 不引入 EventBus（fire-and-forget 风险 + 隐藏调用关系，代价大于收益）
- 不引入 Service 类（hook + 纯函数已够用，避免增加概念层）
- 数据层：仅两张原始记录表 + review_schedules 过渡保留（与 B 方案讨论结论一致）

**接受 C 方案带来的改进：**
- `achievement_events` 改为追加记录（C 的提议，明确采纳）
- 应用层协调函数集中化（`reciteAndTrigger` 的思路，但用 hook/函数实现，不用 Service 类）
- 域边界的思考方式有价值，但以注释和文件组织体现，不以架构层体现

**C 方案中仍然不接受的：**
- EventBus，无论同步还是异步
- 域服务类（Class-based Service），React 项目里是反模式
- ProgressContext"逐步委托"的模糊路径（要么给出明确步骤，要么保持现状重构，不要做一半）
