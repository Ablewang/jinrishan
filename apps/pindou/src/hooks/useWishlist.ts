import { useState, useCallback } from 'react'

export interface WishItem {
  cat: string
  name: string
  display_name: string
}

const STORAGE_KEY = 'pindou_wishlist'

function load(): WishItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function save(items: WishItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function useWishlist() {
  const [items, setItems] = useState<WishItem[]>(load)

  const add = useCallback((item: WishItem) => {
    setItems(prev => {
      if (prev.some(i => i.cat === item.cat && i.name === item.name)) return prev
      const next = [...prev, item]
      save(next)
      return next
    })
  }, [])

  const remove = useCallback((cat: string, name: string) => {
    setItems(prev => {
      const next = prev.filter(i => !(i.cat === cat && i.name === name))
      save(next)
      return next
    })
  }, [])

  const addAll = useCallback((newItems: WishItem[]) => {
    setItems(prev => {
      const existing = new Set(prev.map(i => `${i.cat}/${i.name}`))
      const toAdd = newItems.filter(i => !existing.has(`${i.cat}/${i.name}`))
      if (toAdd.length === 0) return prev
      const next = [...prev, ...toAdd]
      save(next)
      return next
    })
  }, [])

  const removeAll = useCallback((cat: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.cat !== cat)
      save(next)
      return next
    })
  }, [])

  const has = useCallback((cat: string, name: string) => {
    return items.some(i => i.cat === cat && i.name === name)
  }, [items])

  return { items, add, remove, addAll, removeAll, has }
}
