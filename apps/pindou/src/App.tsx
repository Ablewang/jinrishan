import { useRef } from 'react'
import { DataProvider } from './hooks/useData'
import { PaletteProvider } from './hooks/usePalette'
import { StoreProvider } from './hooks/useStore'
import { useDrawerStack } from './hooks/useDrawerStack'
import { useMemoizedFn } from './hooks/useMemoizedFn'
import { useSwipeBack } from './hooks/useSwipeBack'
import { DonePage } from './pages/DonePage'
import { CategoryPage } from './pages/CategoryPage'
import { DetailPage } from './pages/DetailPage'
import { HomePage } from './pages/HomePage'
import { SummaryPage } from './pages/SummaryPage'
import { MyPage } from './pages/MyPage'
import './index.css'

export type NavTarget =
  | { type: 'category'; cat: string }
  | { type: 'item'; cat: string; name: string }
  | { type: 'summary' }
  | { type: 'my'; tab?: 'wishlist' | 'inventory' | 'purchase' | 'backup' }
  | { type: 'done' }

const DRAWER_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'var(--bg)',
  willChange: 'transform',
  overflowY: 'auto',
  overflowX: 'hidden',
}

export default function App() {
  const { stack, push, pop, canPop, onMount, onUnmount, drawerRefs } = useDrawerStack()
  const stackRef = useRef(stack)
  stackRef.current = stack

  const getTopEl = useMemoizedFn(() => {
    const s = stackRef.current
    if (s.length === 0) return null
    return drawerRefs.current.get(s[s.length - 1].id) ?? null
  })

  const getBelowEl = useMemoizedFn(() => {
    const s = stackRef.current
    const id = s.length >= 2 ? s[s.length - 2].id : s.length === 1 ? 0 : null
    if (id === null) return null
    return drawerRefs.current.get(id) ?? null
  })

  const doPop = useMemoizedFn((dx = 0) => pop(dx))

  useSwipeBack({ getTopEl, getBelowEl, canPop, onCommit: doPop })

  function nav(target: NavTarget) {
    if (target.type === 'category')
      push(<CategoryPage cat={target.cat} onNavigate={nav} onBack={doPop} />)
    else if (target.type === 'item')
      push(<DetailPage cat={target.cat} name={target.name} onBack={doPop} />)
    else if (target.type === 'summary')
      push(<SummaryPage onBack={doPop} />)
    else if (target.type === 'my')
      push(<MyPage onBack={doPop} onNavigate={nav} initialTab={target.tab ?? 'wishlist'} />)
    else if (target.type === 'done')
      push(<DonePage onBack={doPop} onNavigate={nav} />)
  }

  return (
    <PaletteProvider>
      <StoreProvider>
        <DataProvider>
        <div
          style={{ ...DRAWER_STYLE, zIndex: 0 }}
          ref={el => {
            if (el) onMount(0, el)
            else    onUnmount(0)
          }}
        >
          <HomePage onNavigate={nav} />
        </div>
        {stack.map((entry, idx) => (
          <div
            key={entry.id}
            style={{ ...DRAWER_STYLE, zIndex: idx + 1 }}
            ref={el => {
              if (el) onMount(entry.id, el)
              else    onUnmount(entry.id)
            }}
          >
            {entry.content}
          </div>
        ))}
      </DataProvider>
      </StoreProvider>
    </PaletteProvider>
  )
}
