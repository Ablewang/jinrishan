import { useEffect, useRef } from 'react'
import { LayerRenderer } from './components/LayerRenderer'
import { DataProvider } from './hooks/useData'
import type { LayerEntry } from './hooks/useLayerStack'
import { useLayerStack } from './hooks/useLayerStack'
import { useMemoizedFn } from './hooks/useMemoizedFn'
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

export default function App() {
  const { stack, push, pop, remove, canPop } = useLayerStack()
  const layerRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const stackRef  = useRef(stack)
  stackRef.current = stack

  const getTopEl   = useMemoizedFn(() => {
    const s = stackRef.current
    return layerRefs.current.get(s[s.length - 1]?.id) ?? null
  })
  const getBelowEl = useMemoizedFn(() => {
    const s = stackRef.current
    return layerRefs.current.get(s[s.length - 2]?.id) ?? null
  })

  const handleCommit = useMemoizedFn((_dx: number) => {
    const s = stackRef.current
    const belowHash = s.length >= 2 ? s[s.length - 2].hash : null
    pop()
    if (belowHash) history.replaceState(null, '', belowHash)
  })

  const handleCancel = useMemoizedFn(() => {
    // 手势取消，below 已由 useSwipeBack 回弹，无需额外处理
  })

  useSwipeBack({ getTopEl, getBelowEl, canPop, onCommit: handleCommit, onCancel: handleCancel })

  useEffect(() => {
    const handler = () => {
      const s = stackRef.current
      const belowHash = s.length >= 2 ? s[s.length - 2].hash : null
      pop()
      if (belowHash) history.replaceState(null, '', belowHash)
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [pop])

  const handleBack = useMemoizedFn(() => {
    const s = stackRef.current
    const belowHash = s.length >= 2 ? s[s.length - 2].hash : null
    pop()
    if (belowHash) history.replaceState(null, '', belowHash)
  })

  const renderContent = useMemoizedFn((entry: LayerEntry) => {
    const parsed = parseHash(entry.hash)
    if (parsed.type === 'category')
      return <CategoryPage cat={parsed.cat} onNavigate={push} onBack={handleBack} />
    if (parsed.type === 'item')
      return <DetailPage cat={parsed.cat} name={parsed.name} onBack={handleBack} />
    if (parsed.type === 'summary')
      return <SummaryPage onBack={handleBack} />
    return <HomePage onNavigate={push} />
  })

  return (
    <DataProvider>
      <LayerRenderer
        stack={stack}
        onRemove={remove}
        renderContent={renderContent}
        layerRefs={layerRefs}
      />
    </DataProvider>
  )
}
