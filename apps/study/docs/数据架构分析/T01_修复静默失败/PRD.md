# T01 · 修复 saveSessions 静默失败

## 背景

`useRecitation.ts` 中 `saveSessions` 函数的 catch 块为空，当 localStorage 写满时抛出的 `QuotaExceededError` 会被静默吞掉。用户毫无感知，但此后所有背诵记录写入均失败，数据永久丢失。

`recitation_sessions` 是唯一无上限增长的 key，活跃用户一年内可达 500–2000 KB，最终必然触发此问题。

## 目标

- 捕获 `QuotaExceededError`，自动清理旧数据后重试
- 重试失败时派发可被 UI 监听的事件，不再静默
- App 启动时主动检测容量，超限自动 prune

## 不在范围内

- 不做 UI 警告弹窗（T04 统一处理）
- 不修改其他 hook 的存储逻辑

## 功能需求

### 1. 修复 saveSessions catch 块

```ts
function saveSessions(sessions: RecitationSession[]): void {
  try {
    localStorage.setItem('recitation_sessions', JSON.stringify(sessions))
  } catch (e) {
    if (e instanceof DOMException && (
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      pruneOldSessions(90)
      try {
        localStorage.setItem('recitation_sessions', JSON.stringify(sessions))
      } catch {
        console.error('[Storage] recitation_sessions write failed after pruning')
        window.dispatchEvent(new CustomEvent('storage-critical'))
      }
    }
  }
}
```

### 2. pruneOldSessions 函数

新建 `src/lib/storageMonitor.ts`：

```ts
// 清理超过 keepDays 天的 sessions，返回清理条数
export function pruneOldSessions(keepDays = 90): number

// 启动时检查，超过 maxCount 条则触发清理
export function checkAndPruneSessions(maxCount = 200, keepDays = 90): void

// 返回各 key 占用字节数、总使用率
export function getStorageReport(): StorageReport
```

### 3. App 启动自动 prune

在 `App.tsx` 的 mount effect 中：

```ts
useEffect(() => {
  checkAndPruneSessions(200, 90)
}, [])
```

不阻塞渲染，若 sessions > 200 且有90天前数据，自动清理。

## 验收标准

- [ ] 手动将 localStorage 填满后触发背诵，不再静默失败
- [ ] `storage-critical` 事件可在 DevTools 中观察到
- [ ] App 启动时若 sessions > 200 条，控制台可见 prune 日志
- [ ] TypeScript 无新增类型错误

## 工作量估算

0.5 天
