import { useState, useCallback } from 'react'
import type { Palette } from './usePalette'

function storageKey(palette: Palette) {
  return `pindou_inventory_${palette}`
}

function load(palette: Palette): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(storageKey(palette)) ?? '{}')
  } catch {
    return {}
  }
}

function save(palette: Palette, data: Record<string, number>) {
  localStorage.setItem(storageKey(palette), JSON.stringify(data))
}

export function useInventory(palette: Palette) {
  const [inventory, setInventory] = useState<Record<string, number>>(() => load(palette))

  const set = useCallback((code: string, count: number) => {
    setInventory(prev => {
      const next = { ...prev }
      if (count <= 0) delete next[code]
      else next[code] = count
      save(palette, next)
      return next
    })
  }, [palette])

  const get = useCallback((code: string) => inventory[code] ?? 0, [inventory])

  return { inventory, set, get }
}
