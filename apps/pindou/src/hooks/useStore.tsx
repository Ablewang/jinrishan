import { createContext, useContext } from 'react'
import { useAuth } from '@jinrishan/auth-context'
import { useWishlist, type WishItem } from './useWishlist'
import { useInventory } from './useInventory'
import { usePalette } from './usePalette'
import { useDone, type DoneItem } from './useDone'

interface StoreCtx {
  wishlist: ReturnType<typeof useWishlist>
  inventory: ReturnType<typeof useInventory>
  done: ReturnType<typeof useDone>
}

const Ctx = createContext<StoreCtx | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { palette } = usePalette()
  const { token } = useAuth()
  const wishlist = useWishlist(token)
  const inventory = useInventory(palette, token)
  const done = useDone(token)
  return <Ctx.Provider value={{ wishlist, inventory, done }}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

export type { WishItem, DoneItem }
