import { createContext, useContext, useState } from 'react'

export type Palette = 'full' | '221'

const STORAGE_KEY = 'pindou_palette'

function getInitialPalette(): Palette {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'full' ? 'full' : '221'
}

interface PaletteCtx {
  palette: Palette
  setPalette: (p: Palette) => void
}

const Ctx = createContext<PaletteCtx>({ palette: '221', setPalette: () => {} })

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, _setPalette] = useState<Palette>(getInitialPalette)

  function setPalette(p: Palette) {
    localStorage.setItem(STORAGE_KEY, p)
    _setPalette(p)
  }

  return <Ctx.Provider value={{ palette, setPalette }}>{children}</Ctx.Provider>
}

export function usePalette() {
  return useContext(Ctx)
}

export function paletteBase(palette: Palette) {
  return palette === '221' ? '/output_221' : '/output'
}
