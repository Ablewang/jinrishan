# T1 · 修复 saveSessions 静默失败 + 容量自动清理

**类型：** Bug修复  
**优先级：** P0  
**估算工时：** 2h  

---

## 问题描述

`useRecitation.ts` 中 `saveSessions` 写入 `recitation_sessions` 的 catch 块为空：

```ts
// 当前代码（有问题）
try {
  localStorage.setItem('recitation_sessions', JSON.stringify(sessions))
} catch (e) {
  // 空！QuotaExceededError 被静默吞掉
}
```

`recitation_sessions` 是唯一无界增长的 key，活跃用户一年内可达 500–2000KB。一旦触碰 localStorage 5MB 上限，后续所有写入（包括 `poem_progress`、`review_schedules` 等核心数据）全部失败，用户毫无感知，学习进度悄悄停止保存。

---

## 需求

### 功能需求

1. **修复空 catch**：捕获 `QuotaExceededError`，触发后自动清理旧数据并重试写入
2. **启动时自动清理**：App 初始化时，若 `recitation_sessions` 超过 200 条，自动删除 90 天前的记录
3. **容量预警事件**：清理后仍写入失败时，向全局派发 `storage-critical` 事件（供将来 UI 层监听）

### 非功能需求

- 清理逻辑不能误删近期数据（以 `session.date` 字段为准，90天内的保留）
- 失败路径必须有 `console.error` 日志，方便排查

---

## 实现方案

**新建 `src/lib/storageMonitor.ts`**，提供：

```ts
// 清理超过 keepDays 天的 sessions，返回清理条数
export function pruneOldSessions(keepDays = 90): number

// 启动时检查，超过 maxCount 条则触发清理
export function checkAndPruneSessions(maxCount = 200, keepDays = 90): void
```

**修改 `useRecitation.ts` 的 `saveSessions`**：

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

**在 `App.tsx` 的 mount effect 中加入启动检查**：

```ts
useEffect(() => {
  checkAndPruneSessions(200, 90)
}, [])
```

---

## 验收标准

- [ ] `saveSessions` catch 块不再为空
- [ ] 手动将 `recitation_sessions` 塞满至接近 5MB，写入不再静默失败
- [ ] App 启动后，若 sessions > 200 条且有 90 天前的数据，自动完成清理
- [ ] TypeScript 编译无报错
