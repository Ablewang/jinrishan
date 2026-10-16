# T11 · IndexedDB 冗余备份

## 背景

localStorage 在 iOS Safari 私有模式下完全禁用，WebView 环境下可能被系统随时清空。IndexedDB 在相同场景下配额更宽松、更难被意外清除，适合作为冗余备份层。

同时，本任务预留未来云同步的最小改造接口（存储适配层），无需修改现有 hook 接口。

## 目标

- localStorage 写入时同步双写到 IndexedDB
- App 启动时检测 localStorage 为空但 IDB 有数据，自动恢复
- 预留存储适配层接口，为云同步做准备

## 不在范围内

- 真正的云同步（远期）
- IDB 数据的导出/导入（T04 已处理 localStorage 层面）

## 功能需求

### 1. idbMirror 模块

新建 `src/lib/idbMirror.ts`：

```ts
export async function idbSet(key: string, value: string): Promise<void>
export async function idbGet(key: string): Promise<string | null>
export async function restoreFromIDB(keys: string[]): Promise<number>
```

需双写的核心 key 列表：
```
poem_progress, poem_review_cards, recitation_sessions,
review_schedules, poem_streak, poem_queue,
poem_total_chars, poem_memorize_history, poem_achievement_dates
```

### 2. App 启动自动恢复

在 `App.tsx` bootstrap 阶段（`useEffect` 首次执行）：
```ts
const restored = await restoreFromIDB(BACKUP_KEYS)
if (restored > 0) {
  console.log(`[IDB] 从备份恢复了 ${restored} 项数据`)
  window.location.reload() // 让 hook 重新读取恢复的数据
}
```

### 3. 存储适配层（预留接口）

新建 `src/lib/storageAdapter.ts`，暴露 `storage` 对象：
```ts
storage.get(key)   // 读取
storage.set(key, value)  // 写入 + 双写 IDB
storage.remove(key)
storage.useAdapter(adapter)  // 云同步时替换底层
```

当前所有 hook 保持使用 `localStorage.getItem/setItem`，本任务只实现 adapter 层定义和 IDB 双写逻辑，**不替换 hook 中的调用**（等T10多孩子档案完成后一起做全量替换，减少冲突）。

## 验收标准

- [ ] 背诵一首诗后，DevTools IndexedDB 中可见对应数据
- [ ] 手动清空 localStorage 后刷新页面，数据从 IDB 自动恢复
- [ ] IDB 操作失败（私有模式）时不影响正常背诵流程
- [ ] `storage.useAdapter` 可被调用，接口定义正确

## 依赖

T04 完成后执行（BACKUP_KEYS 列表在 T04 中定义）

## 工作量估算

2–3 天
