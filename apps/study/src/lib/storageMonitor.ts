const SESSIONS_KEY = 'recitation_sessions'

interface Session {
  date?: string
  [key: string]: unknown
}

export interface StorageReport {
  keys: Record<string, number>
  totalBytes: number
  usageRatio: number
}

export function pruneOldSessions(keepDays = 90): number {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    if (!raw) return 0
    const sessions: Session[] = JSON.parse(raw)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - keepDays)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const kept = sessions.filter(s => !s.date || s.date >= cutoffStr)
    const removed = sessions.length - kept.length
    if (removed > 0) {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(kept))
    }
    return removed
  } catch {
    return 0
  }
}

export function checkAndPruneSessions(maxCount = 200, keepDays = 90): void {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    if (!raw) return
    const sessions: Session[] = JSON.parse(raw)
    if (sessions.length > maxCount) {
      const removed = pruneOldSessions(keepDays)
      if (removed > 0) {
        console.info(`[Storage] 自动清理了 ${removed} 条旧背诵记录`)
      }
    }
  } catch {
    // ignore
  }
}

export function getStorageReport(): StorageReport {
  const keys: Record<string, number> = {}
  let totalBytes = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      const val = localStorage.getItem(key) ?? ''
      const bytes = new Blob([val]).size
      keys[key] = bytes
      totalBytes += bytes
    }
  } catch {
    // ignore
  }
  const QUOTA = 5 * 1024 * 1024
  return { keys, totalBytes, usageRatio: totalBytes / QUOTA }
}
