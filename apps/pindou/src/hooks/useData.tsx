import { createContext, useContext, useEffect, useState } from 'react'
import type { ItemDetail, Manifest, Summary } from '../types'

interface DataCtx {
  manifest: Manifest | null
  summary: Summary | null
  error: string | null
}

const Ctx = createContext<DataCtx>({ manifest: null, summary: null, error: null })

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/output/manifest.json').then(r => r.json() as Promise<Manifest>),
      fetch('/output/summary.json').then(r => r.json() as Promise<Summary>),
    ]).then(([m, s]) => {
      setManifest(m)
      setSummary(s)
    }).catch(() => setError('数据加载失败'))
  }, [])

  return <Ctx.Provider value={{ manifest, summary, error }}>{children}</Ctx.Provider>
}

export function useData() {
  return useContext(Ctx)
}

const itemCache = new Map<string, ItemDetail>()

export async function fetchItem(cat: string, name: string): Promise<ItemDetail> {
  const key = `${cat}/${name}`
  if (itemCache.has(key)) return itemCache.get(key)!
  const r = await fetch(`/output/${encodeURIComponent(cat)}/${name}.json`)
  if (!r.ok) throw new Error('not found')
  const data = await r.json() as ItemDetail
  itemCache.set(key, data)
  return data
}
