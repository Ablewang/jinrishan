# 架构师 B 对 A 方案（极简派）的评审

> 作者：架构师 B（物化缓存派）  
> 评审对象：架构师 A 提交的极简方案（arch-a-minimal.md + 工作流任务描述中的最终方案 JSON）  
> 日期：2026-10-20

---

## 总体评价

A 方案的方向是正确的——原始记录作为 source of truth，废弃冗余聚合字段，这些我完全同意。但它在以下三个具体问题上存在真实风险，不是挑剔，是会在生产环境踩到的坑。

---

## 一、每次启动全量扫描的性能风险

### A 方案的论据

> 重度用户（1年）< 5000 条记录，全量加载 + 计算 < 50ms，useMemo 保证只在 reviewSessions 数组引用变化时才重算，实际打开首页不会重算。

这个论据有两处需要挑战：

**1. "useMemo 不会重算"是对 React 内存模型的部分误解**

useMemo 缓存的是"上一次渲染时的计算结果"，依赖数组是 `[reviewSessions]`，而 reviewSessions 是 `useState` 里的数组。每次 App 启动（冷启动，内存清空），都必须：

1. 从 IndexedDB 加载两张表
2. 触发 `setReviewSessions`（新引用）
3. useMemo 检测到引用变化，重新运行 `getTodayDuePoems`
4. 对所有诗遍历 SM-2 重算

这是**每次冷启动必然发生的一次完整重算**，不是偶发的。对于一个 PWA，用户可能每天打开几次，每次打开都是冷启动（浏览器可能已经把 Service Worker 的 JS 上下文回收了）。

A 方案说"useMemo 保证不会重算"，是混淆了"组件重渲染时不重算"和"App 重启后不重算"两个场景。每次冷启动必须重算一次。

**2. 数据量估算过于乐观**

A 方案的估算：200首 × 20次复习 = 4000条，< 10ms。

更现实的估算：
- 如果用户坚持3年，背300首诗，平均每首复习50次（SM-2 间隔拉长后频次降低，但长期用户次数会累积）
- review_sessions：300 × 50 = 15000条
- 启动时全量加载 15000 条 JSON 对象，单次 IndexedDB 读取就可能需要 80-200ms（取决于设备 IO 性能）
- 遍历重算：300首 × 50次迭代 = 15000次，< 5ms——这部分 A 说的对，计算不是瓶颈

**瓶颈不是计算，是 IO。** 每次冷启动需要把 review_sessions 全量从 IDB 反序列化到内存。srs_schedules 只有300条，IDB 读取 < 10ms。

**B 方案的优势**：首页加载路径是"读 srs_schedules（300条）→ 过滤 nextDue <= today → 渲染"，不需要等 review_sessions 全量加载完。review_sessions 可以懒加载（只在进度页、热力图页需要时才加载）。

### 实际影响

对于今天的用户（数据量小），A 和 B 无感知差异。  
对于坚持使用2年以上的用户，A 方案的冷启动 IO 延迟会比 B 方案高 50-150ms。  
这是可以接受的范围，但不是"完全没有代价"。

---

## 二、数据量增长后的扩展性

### A 方案的设计

所有统计在 React 内存中计算，review_sessions 全量加载到内存，useMemo 做计算缓存。

### 扩展性问题

**问题1：内存占用随时间线性增长**

review_sessions 是 append-only，永不删除。每条记录 ~200 bytes（包含 intervalUsed、efBefore 等字段）。

- 1年：5000条 × 200bytes = 1MB，可接受
- 3年：15000条 × 200bytes = 3MB，勉强可接受
- 5年极端用户：30000条 × 200bytes = 6MB，对低端 Android 设备有压力

B 方案：review_sessions 同样存在，但首页加载路径不依赖它全量在内存，可以按需加载（只在需要复习历史的场景才读）。

**问题2：今日待复习的计算路径随数据量 O(n×m) 增长**

A 方案的 `getTodayDuePoems`：
```
for each distinct poemId in review_sessions:
  computeSM2State(poemId, all_review_sessions)  // O(m) per poem
```

300首诗 × 50次复习 = 15000次迭代。但这还好，问题是：**每次背诵/复习完成后，review_sessions 更新，useMemo 失效，整个 getTodayDuePoems 重跑**。

用户背完一首诗，等待"今日待复习更新"的 UI 卡顿窗口：< 10ms。问题不大，但存在。

B 方案的更新路径：复习完成 → update srs_schedules[poemId] → 其他诗的 nextDue 不受影响，O(1) 局部更新。

**问题3：review_sessions 加密/压缩不友好**

未来如果要做后端同步，review_sessions 是流水账，每条记录都要上传。A 方案里 review_sessions 包含 intervalUsed、efBefore 字段，这些是 SM-2 上下文快照，B 方案其实也推荐存这两个字段（已在 discussion.md 中确认），所以这点两方案相同。

### 扩展性总结

A 方案的扩展性**不差**，但"全量加载到内存"的假设在3年以上的重度用户场景下会产生可感知的 IO 开销。B 方案通过 srs_schedules 把"今日待复习"的查询路径独立出来，不依赖 review_sessions 的全量存在。

---

## 三、SM-2 参数重算的准确性

这是我最核心的异议，A 方案在这里存在一个**语义漏洞**，不只是性能问题。

### A 方案的重算函数

```ts
function applyReview(state: SM2State, q: number): SM2State {
  const newEf = Math.max(1.3, state.ef + 0.1 - (5-q)*(0.08+(5-q)*0.02));
  if (q < 3) {
    newInterval = 1; newRepetitions = 0;
  } else {
    newRepetitions = state.repetitions + 1;
    if (newRepetitions === 1) newInterval = 1;
    else if (newRepetitions === 2) newInterval = 6;
    else newInterval = Math.round(state.interval * newEf);
  }
}
```

注意第3步：`newInterval = Math.round(state.interval * newEf)`

`state.interval` 来自上一次的 SM-2 状态——而这个 interval 是 SM-2 **理论上应该等待的间隔**，不是**用户实际等待的间隔**。

### 路径依赖问题

假设用户 A 的复习历史：
- 第1次：通过，interval → 6天，nextDue = Day6
- 用户在 Day3 提前复习了（没等到 Day6）
- 第2次：通过，实际间隔 = 3天（不是6天），应该打折：`newInterval = Math.round(3 * ef)` 而非 `Math.round(6 * ef)`

现有代码里用的是什么？需要看 `spacedRepetition.ts` 的实现，但标准 SM-2 变体的常见实现里，interval 的更新会参考实际间隔（actual interval）而非理论间隔（scheduled interval）。

A 方案的 `computeSM2State` 在重算时，每次 `applyReview` 只传 `qScore`，没有传"这次实际距离上次几天"——如果现有实现用了实际间隔，重算时这个信息就丢失了。

**A 方案的补救**：在 review_sessions 里存 `intervalUsed`（本次实际间隔），重算时用这个值代替理论 interval。discussion.md 里 A 方案已经同意加这个字段。

**加了 intervalUsed 之后的情况**：重算准确性恢复，但 `computeSM2State` 的签名需要改为：

```ts
function applyReview(state: SM2State, q: number, intervalUsed: number): SM2State {
  // 使用 intervalUsed 而非 state.interval 参与 newInterval 计算
  const baseInterval = q < 3 ? intervalUsed : state.interval;
  // ...
}
```

这是可以修复的，但 A 方案的原始示例代码没有体现这一点，是一个需要注意的实现细节。

### 迁移时的精度问题

这是 A 方案无法完全解决的：

旧的 review_schedules 保存了：ef=2.8, interval=21, nextDue=2026-11-01。

A 方案迁移时为每首诗生成1条虚拟 review_session（qScore=4）。从这条记录出发重算：
- 初始 ef=2.5, interval=1
- 应用 qScore=4：repetitions=1, interval=1
- 结果：nextDue = today+1，**不是** nextDue=2026-11-01

用户明天就会看到"21首诗要复习"，而他们原本以为11月1日才需要复习。

A 方案对此的回应是"接受轻微偏差"，B 方案认为这对坚持了几个月的用户是不可接受的退步体验。

**A 方案的折中方案**（来自 discussion.md）：迁移时注入 intervalUsed = schedule.interval、efBefore = schedule.ef，让重算结果近似还原旧状态。但这只是近似，repetitions 字段无法从单条记录恢复，会导致 interval 计算分支不同。

**B 方案的解法**：直接把 review_schedules 迁移为 srs_schedules，ef/interval/nextDue/repetitions 全部保留，迁移精度100%。

---

## 四、对 A 方案的具体改进建议

以下是我认为 A 方案需要修复的具体问题，按优先级排序：

### 高优先级（影响正确性）

**1. computeSM2State 必须使用 intervalUsed**

review_sessions 的 intervalUsed 字段必须在 applyReview 中实际使用，而不是只存不用。否则提前复习的场景会计算错误。

**2. 迁移方案需要保留 SM-2 关键状态**

仅靠1条虚拟记录无法重建 repetitions 状态，导致复习间隔被重置。建议：

迁移时从 review_schedules 读出 ef/interval/repetitions/nextDue，**以初始快照的方式注入** review_sessions（或者直接在 useMemo 计算里把旧 schedules 作为初始 state 传入，跳过虚拟记录的重建过程）。

**3. streak 定义未统一包含 review_sessions**

A 方案（arch-a-minimal.md）的 computeStreak 只从 recitation_sessions 取日期。discussion.md 中已经确认要合并 review_sessions 的日期。但 arch-a-minimal.md 里的代码示例还是旧版本（只看背诵）。实施时需要确认用的是哪个版本。

### 中优先级（影响性能）

**4. review_sessions 应支持懒加载**

首页加载路径不应该等 review_sessions 全量读取完成。建议：
- srs_schedules（或 A 方案中 React 状态里的 SM-2 cache）在 App 启动时优先加载
- review_sessions 在首页渲染完成后异步加载（用于热力图、进度页等二级页面）

如果 A 方案坚持"不存 srs_schedules"，可以这样分阶段加载：
```
阶段1（< 50ms）：加载 recitation_sessions，渲染首页背诵数据
阶段2（后台）：加载 review_sessions，计算 SM-2 状态，更新"今日待复习"
```

用户看到的是：首页立刻渲染，"今日待复习"出现短暂 loading 状态后刷新。这比 B 方案的体验差一点，但比"等 review_sessions 全量加载完才渲染首页"好得多。

**5. 启动时 SM-2 重算考虑 Web Worker**

对于数据量大的用户，`computeSM2State` 在主线程运行会占用 UI 线程。建议用 `queueMicrotask` 或 Web Worker 处理，让首屏渲染不被阻塞。

### 低优先级（影响可维护性）

**6. ProgressContext.todayDueFromA 字段清理**

A 方案将 todayDueFromA 恒设为 null（因为 USE_SYSTEM_A=false 不再适用），这个字段的存在会让未来开发者困惑。建议在重构 ProgressContext 时一并清理。

---

## 五、我仍然认为应该保留 srs_schedules 的核心理由

综合以上分析，我的立场没有变化：

1. **迁移精度**：直接迁移 review_schedules → srs_schedules，用户复习进度100%保留。A 方案的迁移必然有精度损失。

2. **首页加载路径更短**：srs_schedules 300条 vs review_sessions 全量加载，对中长期用户体感有差异。

3. **写入逻辑更清晰**：每次复习后 `update srs_schedules[poemId]`，心智模型直观。A 方案的写入后需要触发 useMemo 重算，这是隐式的副作用链。

4. **局部更新更高效**：用户复习一首诗，只更新1条 srs_schedule，不影响其他诗的调度状态。A 方案会重跑所有诗的 useMemo。

**这不是"缓存优先"的教条立场**，而是在这个具体场景（SM-2 状态天然适合物化存储、迁移场景有明确精度要求、查询模式是高频读低频写）下，srs_schedules 是更合适的工程选择。

---

## 六、两方案共同遗留的疑问（B 也没有答案）

以下问题与方案选择无关，需要产品侧确认：

### 疑问1：背诵完成后是否立即入复习队列？

背诵完成 → 第一条 review_session 的 nextDue 是 today 还是 today+1？

- today：用户当天可能看到刚背完的诗出现在"待复习"列表，体验奇怪
- today+1：更符合直觉，但意味着首次背诵和第一次复习之间强制间隔1天

**建议**：today+1，与原有 poem_review_cards 的初始化行为保持一致。

### 疑问2："今天"的边界是否需要自定义分界线？

当前用本地时间 YYYY-MM-DD。凌晨1点背诗算"今天"，可能导致 streak 与用户睡眠周期不符。

是否需要"自然学习日"分界（如凌晨4点）？影响 streak 计算和复习到期判断。

### 疑问3：成就系统的 streak 定义对齐

useAchievements 目前从 ProgressContext.streak 读取，而 ProgressContext.streak 来源将由旧的 poem_streak 改为新的实时计算。

新 streak = recitation + review union dates。原来的 streak 只看背诵。

对于已解锁"连续7天"成就的用户，定义变宽后不影响已解锁；对于未解锁的用户，定义变宽后更容易达到。这是一个有利于用户的变化，可以接受，但需要明确记录在迁移说明里。

### 疑问4：废弃 key 的处理

poem_achievement_shown、poem_checkin、poem_onboarding_step 在 MIGRATE_KEYS 中有记录但找不到读写代码。

**建议**：迁移时直接丢弃，不需要迁移也不需要保留只读兜底。在 CHANGELOG 里注明即可。

---

## 结论

A 方案在架构方向上是对的，适合当前数据量级和开发节奏。我的建议：

- **如果选 A 方案**：必须修复 computeSM2State 的 intervalUsed 使用问题；迁移时需要找到保留 SM-2 初始状态的方法（建议直接把 review_schedules 的当前状态作为"初始 useMemo 的 seed"，而非重建虚拟记录）；review_sessions 需要支持懒加载，不能阻塞首屏。

- **如果选 B 方案**：srs_schedules 解决了 A 方案所有以上问题，代价是多一张表和一个双写一致性问题（可通过启动时校验修复）。

两方案的核心差异已经收敛到一个决策点：**愿不愿意为迁移精度和长期查询性能多维护一张 srs_schedules**。这是工程判断，不是架构对错。
