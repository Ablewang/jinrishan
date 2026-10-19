// 统一存储适配层：优先 IDB，降级 localStorage

const DB_NAME = 'poem_store'
const DB_VERSION = 1
const STORE = 'kv'

let _db: IDBDatabase | null = null
let _idbOk: boolean | null = null  // null = 未探测

async function openDB(): Promise<IDBDatabase> {
  if (_db) return _db
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => { _db = req.result; resolve(_db) }
    req.onerror = () => reject(req.error)
  })
}

async function probeIDB(): Promise<boolean> {
  if (_idbOk !== null) return _idbOk
  try {
    const db = await openDB()
    // 做一次写读删探测
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put('1', '__probe__')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete('__probe__')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    _idbOk = true
  } catch {
    _idbOk = false
  }
  return _idbOk
}

async function idbGet(key: string): Promise<string | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function idbRemove(key: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function idbGetAll(): Promise<Record<string, string>> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const result: Record<string, string> = {}
    const req = tx.objectStore(STORE).openCursor()
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) { result[cursor.key as string] = cursor.value; cursor.continue() }
      else resolve(result)
    }
    req.onerror = () => reject(req.error)
  })
}

// ── 公开接口 ──────────────────────────────────────────

export const storage = {
  isIDBAvailable(): boolean {
    return _idbOk === true
  },

  async get(key: string): Promise<string | null> {
    if (await probeIDB()) {
      try { return await idbGet(key) } catch { /* 降级 */ }
    }
    try { return localStorage.getItem(key) } catch { return null }
  },

  async set(key: string, value: string): Promise<void> {
    if (await probeIDB()) {
      try { await idbSet(key, value); return } catch { /* 降级 */ }
    }
    try { localStorage.setItem(key, value) } catch { /* 存储满 */ }
  },

  async remove(key: string): Promise<void> {
    if (await probeIDB()) {
      try { await idbRemove(key) } catch { /* 降级 */ }
    }
    try { localStorage.removeItem(key) } catch { /* ignore */ }
  },
}

// ── 迁移：localStorage → IDB ──────────────────────────

export const MIGRATE_KEYS = [
  'poem_progress',
  'poem_memorize_history',
  'poem_total_chars',
  'poem_streak',
  'poem_review_cards',
  'recitation_sessions',
  'review_schedules',
  'srs_streak_v2',
  'poem_queue',
  'poem_nickname',
  'avatar_gender',
  'poem_milestone_triggered',
  'poem_achievement_dates',
  'poem_last_report_week',
  'poem_checkin',
  'poem_onboarding_done',
  'poem_onboarding_step',
  'reminder_time',
  'srs_migration_done_v1',
  'streak_migrated_v1',
  'poem_achievement_shown',
]

// 返回迁移的 key 数量
export async function migrateToIDB(): Promise<number> {
  if (!(await probeIDB())) {
    console.warn('[Storage] IDB 不可用，所有数据继续使用 localStorage')
    return 0
  }
  let count = 0
  for (const key of MIGRATE_KEYS) {
    try {
      const lsVal = localStorage.getItem(key)
      if (!lsVal) continue
      const existing = await idbGet(key)
      if (!existing) {
        await idbSet(key, lsVal)
        count++
      }
      // 无论 IDB 里是否已有，都从 localStorage 删除
      localStorage.removeItem(key)
    } catch { /* 单个 key 失败不影响整体 */ }
  }
  // 检查是否还有业务 key 残留在 localStorage
  const remaining = MIGRATE_KEYS.filter(k => localStorage.getItem(k) !== null)
  if (remaining.length > 0) {
    console.warn('[Storage] 以下 key 迁移后仍残留在 localStorage:', remaining)
  }
  return count
}

export { idbGetAll }
