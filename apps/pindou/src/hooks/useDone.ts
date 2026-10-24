import { useState, useCallback } from 'react'

export interface DoneItem {
  cat: string
  name: string
  display_name: string
  doneAt: number
}

const STORAGE_KEY = 'pindou_done'

function load(): DoneItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function save(items: DoneItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function useDone() {
  const [items, setItems] = useState<DoneItem[]>(load)

  const mark = useCallback((item: Omit<DoneItem, 'doneAt'>) => {
    setItems(prev => {
      if (prev.some(i => i.cat === item.cat && i.name === item.name)) return prev
      const next = [...prev, { ...item, doneAt: Date.now() }]
      save(next)
      return next
    })
  }, [])

  const unmark = useCallback((cat: string, name: string) => {
    setItems(prev => {
      const next = prev.filter(i => !(i.cat === cat && i.name === name))
      save(next)
      return next
    })
  }, [])

  const toggle = useCallback((item: Omit<DoneItem, 'doneAt'>) => {
    setItems(prev => {
      const exists = prev.some(i => i.cat === item.cat && i.name === item.name)
      const next = exists
        ? prev.filter(i => !(i.cat === item.cat && i.name === item.name))
        : [...prev, { ...item, doneAt: Date.now() }]
      save(next)
      return next
    })
  }, [])

  const has = useCallback((cat: string, name: string) => {
    return items.some(i => i.cat === cat && i.name === name)
  }, [items])

  return { items, mark, unmark, toggle, has }
}
