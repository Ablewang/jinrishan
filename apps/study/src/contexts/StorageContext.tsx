import { createContext, useContext, useState, useEffect } from 'react'
import { migrateToIDB, storage } from '../lib/storage'
import SplashScreen from '../components/SplashScreen'

interface StorageContextValue {
  ready: boolean
}

const StorageContext = createContext<StorageContextValue>({ ready: false })

export function StorageProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const delay = new Promise(r => setTimeout(r, 2000))
    const migrate = migrateToIDB()
      .then(count => {
        if (count > 0) console.info(`[Storage] 已迁移 ${count} 项数据到 IDB`)
        else if (!storage.isIDBAvailable()) console.warn('[Storage] IDB 不可用，降级到 localStorage')
      })
      .catch(() => {})
    Promise.all([delay, migrate]).then(() => setReady(true))
  }, [])

  if (!ready) {
    return <SplashScreen />
  }

  return (
    <StorageContext.Provider value={{ ready }}>
      {children}
    </StorageContext.Provider>
  )
}

export function useStorage() {
  return useContext(StorageContext)
}
