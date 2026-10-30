import { useState, useCallback, useEffect } from 'react'
import type { Palette } from './usePalette'
import { inventoryApi } from '../api/pindou'

function storageKey(palette: Palette) {
  return `pindou_inventory_${palette}`
}

function loadLocal(palette: Palette): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(storageKey(palette)) ?? '{}')
  } catch {
    return {}
  }
}

function saveLocal(palette: Palette, data: Record<string, number>) {
  localStorage.setItem(storageKey(palette), JSON.stringify(data))
}

export function useInventory(palette: Palette, token: string | null) {
  const [inventory, setInventory] = useState<Record<string, number>>(() => loadLocal(palette))

  useEffect(() => {
    if (!token) return
    inventoryApi.getAll(token, palette).then(res => setInventory(res.data)).catch(() => {})
  }, [token, palette])

  const set = useCallback((code: string, count: number) => {
    setInventory(prev => {
      const next = { ...prev }
      if (count <= 0) delete next[code]
      else next[code] = count
      saveLocal(palette, next)
      return next
    })
    if (token) inventoryApi.set(token, palette, code, count).catch(() => {})
  }, [palette, token])

  const get = useCallback((code: string) => inventory[code] ?? 0, [inventory])

  return { inventory, set, get }
}
