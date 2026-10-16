# T9 · IndexedDB 冗余备份

**类型：** 基建  
**优先级：** P2  
**估算工时：** 1–2天  

---

## 背景

localStorage 在以下场景会被意外清除：
- iOS Safari 私有浏览模式
- 系统存储空间不足时 Safari 自动清理
- 用户手动清除浏览器数据

IndexedDB 在 iOS Safari 上配额更宽松（通常可达磁盘空间20%），比 localStorage 更难被意外清除，适合作为冗余副本。

本任务在 T4（数据导出）之后执行，提供额外的自动保护层，不替代手动备份。

---

## 需求

### 功能需求

1. **双写**：每次写入 localStorage 时，同步异步写入 IndexedDB（同一 key）
2. **启动自动恢复**：App 启动时检查，若某个核心 key 在 localStorage 为空但 IDB 有数据，自动恢复
3. **静默降级**：IDB 操作失败时不影响主流程，只 console.warn

### 核心 key 列表（需双写）

```
poem_progress, poem_review_cards, recitation_sessions,
review_schedules, poem_streak, poem_queue,
poem_total_chars, poem_memorize_history, poem_achievement_dates
```

### 非功能需求

- IDB 操作全部异步，不阻塞 UI 渲染
- 失败静默降级，不向用户展示任何错误

---

## 实现方案

**新建 `src/lib/idbMirror.ts`**，提供：

```ts
export async function idbSet(key: string, value: string): Promise<void>
export async function idbGet(key: string): Promise<string | null>
export async function restoreFromIDB(keys: string[]): Promise<number>
```

**集成方式**（两种选一，推荐方案B）：

- **方案A（直接改hook）**：在每个 hook 的 localStorage.setItem 后追加 `idbSet().catch(() => {})`。改动分散，约8处。
- **方案B（存储适配层，推荐）**：新建 `src/lib/storageAdapter.ts`，统一代理所有读写。参考 T4 文档中的适配层设计。改动集中，为 T12 云同步预留接口。

**启动恢复（App.tsx）**：

```ts
useEffect(() => {
  restoreFromIDB(BACKUP_KEYS).then(count => {
    if (count > 0) console.info(`[IDB] 从 IndexedDB 恢复了 ${count} 项数据`)
  })
}, [])
```

---

## 验收标准

- [ ] 背完一首诗后，IndexedDB 中 `poem_progress` 有对应数据
- [ ] 手动清空 localStorage 后刷新，App 从 IDB 自动恢复数据，进度不丢失
- [ ] IDB 操作抛错时，主流程（背诵、保存进度）不受影响
- [ ] 恢复时控制台输出恢复条数日志
