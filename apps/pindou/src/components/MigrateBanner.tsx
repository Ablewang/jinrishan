import { useState } from 'react'
import { useAuth } from '@jinrishan/auth-context'
import { wishlistApi, doneApi, inventoryApi } from '../api/pindou'
import type { WishItem } from '../api/pindou'
import styles from './MigrateBanner.module.css'

const KEYS_TO_MIGRATE = [
  'pindou_wishlist',
  'pindou_done',
  'pindou_inventory_full',
  'pindou_inventory_221',
]

function hasLocalData(): boolean {
  for (const key of KEYS_TO_MIGRATE) {
    const raw = localStorage.getItem(key)
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return true
      if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0) return true
    } catch {
      // ignore
    }
  }
  return false
}

export function MigrateBanner() {
  const { token } = useAuth()
  const [visible, setVisible] = useState(() => hasLocalData())
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')

  if (!visible || !token) return null

  async function handleSync() {
    if (!token) return
    setSyncing(true)
    setError('')
    try {
      // 收藏
      const wishRaw = localStorage.getItem('pindou_wishlist')
      if (wishRaw) {
        const items = JSON.parse(wishRaw) as WishItem[]
        if (items.length > 0) await wishlistApi.addBatch(token, items)
        localStorage.removeItem('pindou_wishlist')
      }

      // 已拼
      const doneRaw = localStorage.getItem('pindou_done')
      if (doneRaw) {
        const items = JSON.parse(doneRaw) as { cat: string; name: string; display_name: string; doneAt: number }[]
        for (const item of items) {
          await doneApi.mark(token, {
            cat: item.cat,
            name: item.name,
            display_name: item.display_name,
            done_at: item.doneAt ?? Date.now(),
          })
        }
        localStorage.removeItem('pindou_done')
      }

      // 库存 full
      const invFullRaw = localStorage.getItem('pindou_inventory_full')
      if (invFullRaw) {
        const inv = JSON.parse(invFullRaw) as Record<string, number>
        for (const [code, count] of Object.entries(inv)) {
          if (count > 0) await inventoryApi.set(token, 'full', code, count)
        }
        localStorage.removeItem('pindou_inventory_full')
      }

      // 库存 221
      const inv221Raw = localStorage.getItem('pindou_inventory_221')
      if (inv221Raw) {
        const inv = JSON.parse(inv221Raw) as Record<string, number>
        for (const [code, count] of Object.entries(inv)) {
          if (count > 0) await inventoryApi.set(token, '221', code, count)
        }
        localStorage.removeItem('pindou_inventory_221')
      }

      setVisible(false)
    } catch {
      setError('同步失败，请重试')
    } finally {
      setSyncing(false)
    }
  }

  function handleLater() {
    setVisible(false)
  }

  return (
    <div className={styles.banner}>
      <div className={styles.text}>
        {error || '检测到本地数据，同步到云端？'}
      </div>
      <div className={styles.actions}>
        <button className={styles.btn} onClick={handleSync} disabled={syncing}>
          {syncing ? '同步中…' : '立即同步'}
        </button>
        <button className={styles.dismiss} onClick={handleLater} disabled={syncing}>
          稍后
        </button>
      </div>
    </div>
  )
}
