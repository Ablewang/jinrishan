import { useState, useCallback, useEffect } from 'react'
import { doneApi } from '../api/pindou'

export interface DoneItem {
  cat: string
  name: string
  display_name: string
  doneAt: number
}

const STORAGE_KEY = 'pindou_done'

function loadLocal(): DoneItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveLocal(items: DoneItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function useDone(token: string | null) {
  const [items, setItems] = useState<DoneItem[]>(loadLocal)

  useEffect(() => {
    if (!token) return
    doneApi.getAll(token).then(res => {
      setItems(res.data.map(i => ({ ...i, doneAt: i.done_at })))
    }).catch(() => {})
  }, [token])

  const mark = useCallback((item: Omit<DoneItem, 'doneAt'>) => {
    const doneAt = Date.now()
    setItems(prev => {
      if (prev.some(i => i.cat === item.cat && i.name === item.name)) return prev
      const next = [...prev, { ...item, doneAt }]
      if (!token) saveLocal(next)
      return next
    })
    if (token) doneApi.mark(token, { ...item, done_at: doneAt }).catch(() => {})
  }, [token])

  const unmark = useCallback((cat: string, name: string) => {
    setItems(prev => {
      const next = prev.filter(i => !(i.cat === cat && i.name === name))
      if (!token) saveLocal(next)
      return next
    })
    if (token) doneApi.unmark(token, cat, name).catch(() => {})
  }, [token])

  const toggle = useCallback((item: Omit<DoneItem, 'doneAt'>) => {
    const doneAt = Date.now()
    setItems(prev => {
      const exists = prev.some(i => i.cat === item.cat && i.name === item.name)
      const next = exists
        ? prev.filter(i => !(i.cat === item.cat && i.name === item.name))
        : [...prev, { ...item, doneAt }]
      if (!token) saveLocal(next)
      if (token) {
        if (exists) doneApi.unmark(token, item.cat, item.name).catch(() => {})
        else doneApi.mark(token, { ...item, done_at: doneAt }).catch(() => {})
      }
      return next
    })
  }, [token])

  const has = useCallback((cat: string, name: string) => {
    return items.some(i => i.cat === cat && i.name === name)
  }, [items])

  return { items, mark, unmark, toggle, has }
}
