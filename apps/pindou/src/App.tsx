import { useCallback, useEffect, useRef } from 'react'
import { DataProvider } from './hooks/useData'
import { useLayerStack } from './hooks/useLayerStack'
import { useSwipeBack } from './hooks/useSwipeBack'
import { CategoryPage } from './pages/CategoryPage'
import { DetailPage } from './pages/DetailPage'
import { HomePage } from './pages/HomePage'
import { SummaryPage } from './pages/SummaryPage'
import './index.css'

function parseHash(hash: string) {
  const h = hash.slice(1) || '/'
  if (h === '/' || h === '') return { type: 'home' as const }
  if (h.startsWith('/category/'))
    return { type: 'category' as const, cat: decodeURIComponent(h.slice('/category/'.length)) }
  if (h.startsWith('/item/')) {
    const rest = h.slice('/item/'.length)
    const slash = rest.indexOf('/')
    return {
      type: 'item' as const,
      cat:  decodeURIComponent(rest.slice(0, slash)),
      name: decodeURIComponent(rest.slice(slash + 1)),
    }
  }
  if (h === '/summary') return { type: 'summary' as const }
  return { type: 'home' as const }
}

function PageContent({
  hash,
  onNavigate,
  onBack,
}: {
  hash: string
  onNavigate: (h: string) => void
  onBack: () => void
}) {
  const parsed = parseHash(hash)
  if (parsed.type === 'category')
    return <CategoryPage cat={parsed.cat} onNavigate={onNavigate} onBack={onBack} />
  if (parsed.type === 'item')
    return <DetailPage cat={parsed.cat} name={parsed.name} onBack={onBack} />
  if (parsed.type === 'summary')
    return <SummaryPage onBack={onBack} />
  return <HomePage onNavigate={onNavigate} />
}

const LAYER_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflowY: 'auto',
  background: 'var(--bg)',
  willChange: 'transform',
}

export default function App() {
  const { stack, push, pop, animateIn, layerRefs, transitioning } = useLayerStack()
  const animatedIds = useRef<Set<number>>(new Set())

  const getTopEl = useCallback(() => {
    if (stack.length < 1) return null
    return layerRefs.current.get(stack[stack.length - 1].id) ?? null
  }, [stack, layerRefs])

  const getBelowEl = useCallback(() => {
    if (stack.length < 2) return null
    return layerRefs.current.get(stack[stack.length - 2].id) ?? null
  }, [stack, layerRefs])

  const canPop = useCallback(() => stack.length > 1, [stack])

  const handleCommit = useCallback((dx: number) => {
    const belowHash = stack.length >= 2 ? stack[stack.length - 2].hash : null
    pop(dx, true)
    if (belowHash) history.replaceState(null, '', belowHash)
  }, [pop, stack])

  useSwipeBack({ getTopEl, getBelowEl, canPop, onCommit: handleCommit, transitioning })

  useEffect(() => {
    const handler = () => { pop() }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [pop])

  const handleBack = useCallback(() => {
    const belowHash = stack.length >= 2 ? stack[stack.length - 2].hash : null
    pop()
    if (belowHash) history.replaceState(null, '', belowHash)
  }, [pop, stack])

  return (
    <DataProvider>
      {stack.map((entry, idx) => (
        <div
          key={entry.id}
          style={{ ...LAYER_STYLE, zIndex: idx + 1 }}
          ref={el => {
            if (el) {
              layerRefs.current.set(entry.id, el)
              if (entry.animate && !animatedIds.current.has(entry.id)) {
                animatedIds.current.add(entry.id)
                animateIn(el)
              }
            } else {
              layerRefs.current.delete(entry.id)
            }
          }}
        >
          <PageContent
            hash={entry.hash}
            onNavigate={push}
            onBack={handleBack}
          />
        </div>
      ))}
    </DataProvider>
  )
}
