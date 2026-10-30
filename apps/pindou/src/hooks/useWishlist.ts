import { useState, useCallback, useEffect } from 'react'
import { wishlistApi } from '../api/pindou'

export interface WishItem {
  cat: string
  name: string
  display_name: string
}

const STORAGE_KEY = 'pindou_wishlist'

function loadLocal(): WishItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveLocal(items: WishItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function useWishlist(token: string | null) {
  const [items, setItems] = useState<WishItem[]>(loadLocal)

  useEffect(() => {
    if (!token) return
    wishlistApi.getAll(token).then(res => setItems(res.data)).catch(() => {})
  }, [token])

  const add = useCallback((item: WishItem) => {
    setItems(prev => {
      if (prev.some(i => i.cat === item.cat && i.name === item.name)) return prev
      const next = [...prev, item]
      if (!token) saveLocal(next)
      return next
    })
    if (token) wishlistApi.add(token, item).catch(() => {})
  }, [token])

  const remove = useCallback((cat: string, name: string) => {
    setItems(prev => {
      const next = prev.filter(i => !(i.cat === cat && i.name === name))
      if (!token) saveLocal(next)
      return next
    })
    if (token) wishlistApi.remove(token, cat, name).catch(() => {})
  }, [token])

  const addAll = useCallback((newItems: WishItem[]) => {
    setItems(prev => {
      const existing = new Set(prev.map(i => `${i.cat}/${i.name}`))
      const toAdd = newItems.filter(i => !existing.has(`${i.cat}/${i.name}`))
      if (toAdd.length === 0) return prev
      const next = [...prev, ...toAdd]
      if (!token) saveLocal(next)
      if (token) wishlistApi.addBatch(token, toAdd).catch(() => {})
      return next
    })
  }, [token])

  const removeAll = useCallback((cat: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.cat !== cat)
      if (!token) saveLocal(next)
      return next
    })
    if (token) wishlistApi.removeCat(token, cat).catch(() => {})
  }, [token])

  const has = useCallback((cat: string, name: string) => {
    return items.some(i => i.cat === cat && i.name === name)
  }, [items])

  return { items, add, remove, addAll, removeAll, has }
}
