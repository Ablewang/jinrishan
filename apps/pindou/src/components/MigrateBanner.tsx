import { useState, useEffect } from 'react'
import { useAuth } from '@jinrishan/auth-context'
import { wishlistApi, doneApi, inventoryApi } from '../api/pindou'
import type { WishItem } from '../api/pindou'
import styles from './MigrateBanner.module.css'

const LOCAL_KEYS = [
  'pindou_wishlist',
  'pindou_done',
  'pindou_inventory_full',
  'pindou_inventory_221',
]

function hasLocalData(): boolean {
  for (const key of LOCAL_KEYS) {
    const raw = localStorage.getItem(key)
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return true
      if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0) return true
    } catch { /* ignore */ }
  }
  return false
}

async function hasCloudData(token: string): Promise<boolean> {
  try {
    const [wish, done, inv221] = await Promise.all([
      wishlistApi.getAll(token),
      doneApi.getAll(token),
      inventoryApi.getAll(token, '221'),
    ])
    return wish.data.length > 0 || done.data.length > 0 || Object.keys(inv221.data).length > 0
  } catch {
    return false
  }
}

async function pushLocalToCloud(token: string) {
  const wishRaw = localStorage.getItem('pindou_wishlist')
  if (wishRaw) {
    const items = JSON.parse(wishRaw) as WishItem[]
    if (items.length > 0) await wishlistApi.addBatch(token, items)
    localStorage.removeItem('pindou_wishlist')
  }

  const doneRaw = localStorage.getItem('pindou_done')
  if (doneRaw) {
    const items = JSON.parse(doneRaw) as { cat: string; name: string; display_name: string; doneAt: number }[]
    for (const item of items) {
      await doneApi.mark(token, { cat: item.cat, name: item.name, display_name: item.display_name, done_at: item.doneAt ?? Date.now() })
    }
    localStorage.removeItem('pindou_done')
  }

  const invFullRaw = localStorage.getItem('pindou_inventory_full')
  if (invFullRaw) {
    const inv = JSON.parse(invFullRaw) as Record<string, number>
    for (const [code, count] of Object.entries(inv)) {
      if (count > 0) await inventoryApi.set(token, 'full', code, count)
    }
    localStorage.removeItem('pindou_inventory_full')
  }

  const inv221Raw = localStorage.getItem('pindou_inventory_221')
  if (inv221Raw) {
    const inv = JSON.parse(inv221Raw) as Record<string, number>
    for (const [code, count] of Object.entries(inv)) {
      if (count > 0) await inventoryApi.set(token, '221', code, count)
    }
    localStorage.removeItem('pindou_inventory_221')
  }
}

function clearLocal() {
  for (const key of LOCAL_KEYS) localStorage.removeItem(key)
}

type State = 'checking' | 'no_conflict' | 'conflict' | 'syncing' | 'done' | 'error'

export function MigrateBanner() {
  const { token } = useAuth()
  const [visible, setVisible] = useState(() => hasLocalData())
  const [state, setState] = useState<State>('checking')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!visible || !token) return
    hasCloudData(token).then(has => {
      setState(has ? 'conflict' : 'no_conflict')
    }).catch(() => setState('no_conflict'))
  }, [visible, token])

  if (!visible || !token) return null

  async function handlePushLocal() {
    if (!token) return
    setState('syncing')
    setError('')
    try {
      await pushLocalToCloud(token)
      setState('done')
      setTimeout(() => setVisible(false), 1000)
    } catch {
      setState('error')
      setError('同步失败，请重试')
    }
  }

  function handleKeepCloud() {
    clearLocal()
    setVisible(false)
  }

  function handleLater() {
    setVisible(false)
  }

  if (state === 'checking') return (
    <div className={styles.banner}>
      <div className={styles.text}>正在检查数据…</div>
    </div>
  )

  if (state === 'done') return (
    <div className={styles.banner}>
      <div className={styles.text}>同步成功 ✓</div>
    </div>
  )

  if (state === 'conflict') return (
    <div className={styles.banner}>
      <div className={styles.text}>本地和云端都有数据，以哪份为准？</div>
      <div className={styles.actions}>
        <button className={styles.btn} onClick={handlePushLocal}>用本地覆盖</button>
        <button className={styles.dismiss} onClick={handleKeepCloud}>保留云端</button>
      </div>
    </div>
  )

  return (
    <div className={styles.banner}>
      <div className={styles.text}>{error || '检测到本地数据，同步到云端？'}</div>
      <div className={styles.actions}>
        <button className={styles.btn} onClick={handlePushLocal} disabled={state === 'syncing'}>
          {state === 'syncing' ? '同步中…' : '立即同步'}
        </button>
        <button className={styles.dismiss} onClick={handleLater} disabled={state === 'syncing'}>稍后</button>
      </div>
    </div>
  )
}
