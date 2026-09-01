import { useRef } from 'react'
import { DataProvider } from './hooks/useData'
import { useDrawerStack } from './hooks/useDrawerStack'
import { useMemoizedFn } from './hooks/useMemoizedFn'
import { useSwipeBack } from './hooks/useSwipeBack'
import { CategoryPage } from './pages/CategoryPage'
import { DetailPage } from './pages/DetailPage'
import { HomePage } from './pages/HomePage'
import { SummaryPage } from './pages/SummaryPage'
import './index.css'

function parseHash(hash: string) {
  const h = hash.slice(1) || '/'
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
    // 栈里有两层取倒数第二，只有一层则取首页(id=0)
    const id = s.length >= 2 ? s[s.length - 2].id : s.length === 1 ? 0 : null
    if (id === null) return null
    return drawerRefs.current.get(id) ?? null
  })

  const doPop = useMemoizedFn((dx = 0) => pop(dx))

  useSwipeBack({ getTopEl, getBelowEl, canPop, onCommit: doPop })

  function nav(hash: string) {
    const parsed = parseHash(hash)
    if (parsed.type === 'category')
      push(<CategoryPage cat={parsed.cat} onNavigate={nav} onBack={doPop} />)
    else if (parsed.type === 'item')
      push(<DetailPage cat={parsed.cat} name={parsed.name} onBack={doPop} />)
    else if (parsed.type === 'summary')
      push(<SummaryPage onBack={doPop} />)
  }

  // hash 初始化，只执行一次
  const initialized = useRef(false)
  if (!initialized.current) {
    initialized.current = true
    const parsed = parseHash(location.hash)
    if (parsed.type === 'category') {
      setTimeout(() => nav(`#/category/${parsed.cat}`), 0)
    } else if (parsed.type === 'item') {
      setTimeout(() => {
        nav(`#/category/${parsed.cat}`)
        setTimeout(() => nav(`#/item/${parsed.cat}/${parsed.name}`), 50)
      }, 0)
    } else if (parsed.type === 'summary') {
      setTimeout(() => nav('#/summary'), 0)
    }
  }

  return (
    <DataProvider>
      {/* 首页永远在底层，注册为 id=0 */}
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
  )
}
