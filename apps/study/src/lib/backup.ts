const BACKUP_DATE_KEY = 'poem_last_backup_date'

const CORE_KEYS = [
  'poem_progress',
  'poem_streak',
  'poem_total_chars',
  'poem_memorize_history',
  'poem_review_cards',
  'poem_queue',
  'poem_nickname',
  'avatar_gender',
  'review_schedules',
  'srs_streak_v2',
  'recitation_sessions',
  'poem_last_backup_date',
]

// FNV-32a checksum
function fnv32a(str: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = (hash * 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export interface BackupData {
  version: '1'
  exportedAt: string
  appVersion: string
  checksum: string
  data: Record<string, unknown>
}

export interface ImportResult {
  ok: boolean
  error?: string
  keysRestored?: number
}

export function exportBackup(): BackupData {
  const data: Record<string, unknown> = {}

  for (const key of CORE_KEYS) {
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) continue
      if (key === 'recitation_sessions') {
        // 只导出最近 90 天
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 90)
        const cutoffStr = cutoff.toISOString().slice(0, 10)
        try {
          const sessions = JSON.parse(raw)
          data[key] = Array.isArray(sessions)
            ? sessions.filter((s: { date?: string }) => !s.date || s.date >= cutoffStr)
            : sessions
        } catch {
          data[key] = raw
        }
      } else {
        try { data[key] = JSON.parse(raw) } catch { data[key] = raw }
      }
    } catch {}
  }

  const dataStr = JSON.stringify(data)
  const checksum = fnv32a(dataStr)

  return {
    version: '1',
    exportedAt: new Date().toISOString(),
    appVersion: '1.0.0',
    checksum,
    data,
  }
}

export function downloadBackup(): void {
  const backup = exportBackup()
  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `古诗学习备份_${todayStr()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  try { localStorage.setItem(BACKUP_DATE_KEY, todayStr()) } catch {}
}

export function importBackup(json: string, mode: 'replace' | 'merge' = 'merge'): ImportResult {
  let backup: BackupData
  try {
    backup = JSON.parse(json)
  } catch {
    return { ok: false, error: '文件格式错误，无法解析 JSON' }
  }

  if (backup.version !== '1') {
    return { ok: false, error: `不支持的备份版本：${backup.version}` }
  }

  if (!backup.data || typeof backup.data !== 'object') {
    return { ok: false, error: '备份数据结构异常' }
  }

  // 校验 checksum
  const dataStr = JSON.stringify(backup.data)
  const expected = fnv32a(dataStr)
  if (backup.checksum !== expected) {
    return { ok: false, error: '备份文件已损坏（checksum 不匹配）' }
  }

  let keysRestored = 0

  if (mode === 'replace') {
    for (const key of CORE_KEYS) {
      if (key === BACKUP_DATE_KEY) continue
      if (backup.data[key] !== undefined) {
        try {
          localStorage.setItem(key, JSON.stringify(backup.data[key]))
          keysRestored++
        } catch {}
      }
    }
  } else {
    // merge 模式
    for (const key of CORE_KEYS) {
      if (key === BACKUP_DATE_KEY) continue
      const incoming = backup.data[key]
      if (incoming === undefined) continue

      if (key === 'poem_progress') {
        // 取 memorized/bestStars 较大值合并
        try {
          const current = JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, { read: boolean; memorized: boolean; bestStars: number; noHintPass?: boolean }>
          const src = incoming as typeof current
          const merged = { ...current }
          for (const id of Object.keys(src)) {
            const c = current[id]
            const s = src[id]
            if (!c) {
              merged[id] = s
            } else {
              merged[id] = {
                read: c.read || s.read,
                memorized: c.memorized || s.memorized,
                bestStars: Math.max(c.bestStars ?? 0, s.bestStars ?? 0),
                noHintPass: c.noHintPass || s.noHintPass,
              }
            }
          }
          localStorage.setItem(key, JSON.stringify(merged))
          keysRestored++
        } catch {}
      } else {
        try {
          localStorage.setItem(key, JSON.stringify(incoming))
          keysRestored++
        } catch {}
      }
    }
  }

  return { ok: true, keysRestored }
}

export function getLastBackupDate(): string | null {
  try { return localStorage.getItem(BACKUP_DATE_KEY) } catch { return null }
}

export function getBackupReminderDaysAgo(): number | null {
  const last = getLastBackupDate()
  if (!last) return null
  const diff = Math.floor((new Date(todayStr()).getTime() - new Date(last).getTime()) / 86400000)
  return diff
}
