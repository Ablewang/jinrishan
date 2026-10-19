# T11 · 存储层异步化改造计划

## 决策背景

原 PRD 方案（localStorage 双写 IDB）已废弃。新方向：

- **IDB 作为主存储**，localStorage 仅作降级兜底
- App 启动时一次性将 localStorage 数据迁移到 IDB，迁移后清空 localStorage
- 所有读写改成异步，为后续云同步预留接口
- 改动面大但结构清晰，符合长期规划

---

## 架构设计

```
storage.ts          — 统一异步适配层（get/set/remove）
                      优先 IDB，IDB 不可用时降级 localStorage

StorageProvider     — App 顶层 Context，持有 ready 状态
                      启动时执行迁移，ready=true 后才渲染子树

useProgress         — load 改 useEffect 异步初始化
useRecitation       — 同上
useQueue            — 同上
```

---

## 分步计划

### Step 1 — storage.ts 适配层

文件：`src/lib/storage.ts`

```ts
export const storage = {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
  isIDBAvailable(): boolean
}
```

逻辑：
- 启动时探测 IDB 可用性，结果缓存到模块变量 `_idbOk`
- `get/set/remove` 根据 `_idbOk` 走 IDB 或 localStorage
- IDB 操作失败时静默降级到 localStorage，不抛异常

### Step 2 — StorageProvider + 迁移逻辑

文件：`src/contexts/StorageContext.tsx`

启动流程：
1. 探测 IDB 是否可用
2. 若可用：扫描 `MIGRATE_KEYS`，有数据则写入 IDB，然后清空 localStorage 中这些 key
3. 设置 `ready = true`
4. App 在 `ready` 前显示启动 loading（复用现有 loading 样式）

`MIGRATE_KEYS`（需迁移的核心 key）：
```
poem_progress, poem_memorize_history, poem_total_chars,
poem_streak, poem_review_cards, recitation_sessions,
review_schedules, srs_streak_v2, poem_queue,
poem_nickname, avatar_gender, poem_milestone_triggered,
poem_achievement_dates, poem_last_report_week
```

### Step 3 — useProgress 异步化

改造点：
- 删除所有同步 `loadXxx()` 函数
- 改为 `useState(null)` + `useEffect(() => { storage.get(key).then(...) })` 初始化
- 所有 `saveXxx()` 改为 `async`，调用 `await storage.set()`
- 对外接口不变（返回值结构不变）

loading 状态：hook 内部加 `initialized` 标志，未就绪时返回默认空值

### Step 4 — useRecitation 异步化

同 Step 3，改造 `saveSessions` / `saveSchedules` / `updateSrsStreak`

### Step 5 — useQueue 异步化

`src/hooks/useQueue.ts`，改造 `saveQueue`

### Step 6 — 删除旧 idbMirror.ts

删除 `src/lib/idbMirror.ts`，从 `main.tsx` 移除 `restoreFromIDBIfNeeded` 调用

### Step 7 — 回归测试

见下方回归清单

---

## 回归清单

### 核心流程

- [ ] 首次安装（全空数据）：正常进入 onboarding，背完第一首诗后数据写入 IDB
- [ ] 已有 localStorage 数据的用户：刷新后数据迁移到 IDB，localStorage 对应 key 被清空，功能正常
- [ ] IDB 不可用（Safari 私有模式）：降级走 localStorage，功能正常，无报错

### 背诵流程

- [ ] 背一首诗（MemorizeMode）→ 得星 → 进度页显示已背诵数 +1
- [ ] 背诵历史正确记录（诗名、星级、日期）
- [ ] 连续打卡天数正确更新
- [ ] 累计字数正确更新
- [ ] ReviewCard 正确新建（档位 0，due = 明天）

### 复习流程

- [ ] ReciteMode 完成 → session 写入 IDB
- [ ] review_schedules 正确更新
- [ ] 复习档位升降正确

### 进度页 / 周报

- [ ] 进度页四项统计数据正确
- [ ] 难诗排行显示正确（EF 值来自 review_schedules）
- [ ] 周报入口显示（有本周数据时）
- [ ] 周报页数据正确

### 分享卡片

- [ ] 打卡卡片生成正常
- [ ] 满星触发分享弹窗
- [ ] 里程碑触发分享弹窗

### 备份/恢复

- [ ] 导出备份：JSON 包含所有核心 key 的数据（从 IDB 读取）
- [ ] 导入备份：数据写入 IDB，刷新后恢复正常
- [ ] 手动清空 IDB 后：降级到 localStorage（若有），否则空数据正常显示

### 边界情况

- [ ] 快速连续背多首诗：无数据竞争，每首都正确写入
- [ ] 存储满（QuotaExceededError）：旧 session 自动裁剪，不崩溃
- [ ] 刷新页面：数据持久，不丢失

---

## 注意事项

1. `useProgress` 的 `useState(loadProgress)` 改成异步后，组件首次渲染会拿到空数据，需确保 UI 在 `initialized=false` 时不渲染错误内容
2. `backup.ts` 的导出/导入需同步改成从 IDB 读写，否则导出的是空数据
3. `storageMonitor.ts` 的 `pruneOldSessions` 也需要改成异步
4. 改造期间保持旧的 `idbMirror.ts` 可用，Step 6 最后再删
