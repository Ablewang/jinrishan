import { useState } from 'react'
import { useAuth } from '@jinrishan/auth-context'
import { storeApi } from '@jinrishan/auth-context'
import styles from './MigrateBanner.module.css'

const APP = 'pindou'

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
      for (const key of KEYS_TO_MIGRATE) {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        await storeApi.set(token, APP, key, raw)
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
