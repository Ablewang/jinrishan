# 第一期计划：修隐患

## 目标
修复已知的数据层隐患和逻辑 bug，不涉及新 UI，为后续功能迭代打好基础。

---

## Task 1：修复 PWA 离线缓存路径

**问题**：`vite.config.ts` 的 workbox 规则缓存 `/annotations.json`（不存在），实际路径是 `/annotations/{id}.json` 和 `/poems/{id}.json`。离线时什么都加载不了。

**文件**：`vite.config.ts`

**改动**：
```ts
// 修改前（错误）
{ urlPattern: /\/annotations\.json$/, handler: 'CacheFirst' }

// 修改后
{ urlPattern: /\/annotations\/\d+\.json$/, handler: 'CacheFirst' }
{ urlPattern: /\/poems\/\d+\.json$/, handler: 'CacheFirst' }
{ urlPattern: /\/images\//, handler: 'CacheFirst' }
```

**验收**：手机断网后打开 App，已访问过的诗可以正常显示。

---

## Task 2：统一双 streak，消除展示不一致

**问题**：`useProgress` 和 `useQueue` 各自维护一套连续天数，Home.tsx 用 `streakCount || streak.count` 拼凑，两者更新时机不同。

**文件**：`src/hooks/useProgress.ts`、`src/hooks/useQueue.ts`、`src/pages/Home.tsx`

**方案**：
- `useQueue` 保留 `streak_count` 作为唯一 streak 来源（背新诗触发）
- `useProgress` 移除自己的 streak 逻辑（只保留复习相关数据）
- Home.tsx 统一用 `streakCount`

**验收**：连续背诗3天，首页连续天数展示与进度页一致。

---

## Task 3：去掉 todayDueReviews 硬截断

**问题**：`useProgress.ts` 里 `.slice(0, 3)` 导致复习欠债越积越多，间隔复习系统长期失效。

**文件**：`src/hooks/useProgress.ts`

**改动**：
```ts
// 修改前
.slice(0, 3)

// 修改后（全量展示，由 UI 层控制显示数量）
// 删除 slice，改为返回全部到期卡片
```

同时在 Home.tsx 展示时加上总数提示："今日复习 3/7 首"，让用户感知欠债。

**验收**：积累7首到期复习时，全部出现在首页复习区。

---

## Task 4：答错退一档而非归零

**问题**：`markReviewed(id, false)` 直接把 level 设为 0，挫败感强，不符合 SRS 最佳实践。

**文件**：`src/hooks/useProgress.ts`

**改动**：
```ts
// 修改前
if (!passed) { newLevel = 0 }

// 修改后：退一档，最低 0
if (!passed) { newLevel = Math.max(0, card.level - 1) }
```

**验收**：level=3 的卡片答错后变为 level=2，而不是 level=0。

---

## 执行顺序

1. Task 1（PWA）独立，优先做，不影响其他 task
2. Task 2（streak）需要同时改三个文件，单独提交
3. Task 3 + Task 4 可以一个提交，都在 useProgress.ts

## 预估工时

全部改动约半天，主要在理清 streak 逻辑上。
