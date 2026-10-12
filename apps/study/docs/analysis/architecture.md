# 技术架构分析报告

## 1. 数据层 —— 高风险

### 1.1 多个独立 localStorage key，无事务保证（严重）
当前有 5 个独立的 key：
- `poem_progress`
- `poem_queue`
- `poem_streak`
- `poem_total_chars`
- `poem_review_cards`
- `poem_memorize_history`

问题：`markMemorized` 中连续调用 `setProgress` / `setReviewCards` / `setMemorizeHistory` / `saveStreak`，如果中途页面关闭或崩溃，数据会不一致。例如 progress 标记了 memorized，但 reviewCard 没有创建，用户就会永远看不到这首诗进入复习队列。

**修复方向**：将所有状态合并为一个 JSON 对象，单次 `localStorage.setItem` 原子写入。

### 1.2 streak 逻辑有 bug（严重）
`useQueue` 和 `useProgress` 各自维护了一套 streak：
- `useQueue.streak_count`：背新诗的连续天数
- `useProgress.streak`：背诵记录的连续天数

两者没有同步，Home.tsx 里有时用 `streakCount || streak.count`，逻辑不清晰，容易出现不一致展示。

### 1.3 todayDueReviews 硬限制 3 首（中）
```ts
.slice(0, 3)
```
当用户积压了很多到期复习时，只显示 3 首，其他的会不断推迟，导致"复习债务"越积越多，间隔复习效果失效。

### 1.4 markReviewed 答错退回 level=0 过于严苛（中）
答错直接退回第 0 档，明天重新开始，心理上挫败感强。SRS 领域通常是退一档或按错误频率衰减，而不是一刀切归零。

---

## 2. 状态管理 —— 中风险

### 2.1 useProgress 职责过重
单个 hook 管理 progress / streak / chars / history / reviewCards 共 5 类数据，每次任何数据变化都会导致所有订阅这个 hook 的组件重渲染。随着功能增加，性能问题会越来越明显。

### 2.2 两个 hook 重复 todayStr()
`useQueue` 和 `useProgress` 都定义了 `todayStr()`，应提取为公共工具函数。

### 2.3 loadTotalChars() 在 markMemorized 内直接读 localStorage
```ts
const newTotal = loadTotalChars() + charCount
```
在 setState 回调里直接调 localStorage.getItem，绕过了 React 状态，是不一致的混用模式。

---

## 3. 性能 —— 低风险（当前规模）

### 3.1 PoemDetail 内联了大量 CSS-in-JS
整个 PoemDetail.css 是单独文件，但 Home.tsx / ProgressPage.tsx 等页面把所有样式放在组件底部的模板字符串里，每次渲染都会生成新的 `<style>` 标签，浏览器需要重新解析。

### 3.2 poems index.json 随 allLines 字段增大
当前 70 首诗，index.json 包含全部诗句内容。未来扩展到几百首时，首屏加载 index.json 会变慢，应只保留 firstLine，allLines 按需加载。

---

## 4. 扩展性瓶颈

### 4.1 诗词固定 70 首，hardcoded 在多处
`TOTAL = 70` 出现在 ProgressPage、ProfileSheet 等多处。未来增加诗词需要改多个地方。

### 4.2 无用户账号体系
所有数据存 localStorage，换设备/清缓存即丢失。对小朋友用户来说，家长换手机是常见场景，数据丢失会严重影响留存。

### 4.3 复习算法参数写死
```ts
const INTERVALS = [1, 3, 7, 15, 30]
```
无法根据用户实际表现动态调整，长期使用效果会下降。

---

## 优先修复建议

| 优先级 | 问题 | 预计影响 |
|--------|------|----------|
| P0 | 合并 localStorage 为单一原子写入 | 防止数据不一致 |
| P0 | 修复双 streak 不一致 | 影响核心激励数据展示 |
| P1 | 取消 todayDueReviews 硬限制3首 | 间隔复习算法正确性 |
| P1 | markReviewed 答错退一档而非归零 | 用户体验 |
| P2 | useProgress 拆分 | 性能与可维护性 |
| P2 | 用户数据云同步 | 留存率 |
