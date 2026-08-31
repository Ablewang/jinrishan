import { useRef, useState } from 'react'
import { useMemoizedFn } from './useMemoizedFn'

export interface LayerEntry {
  id: number
  hash: string
  alive: boolean
}

let nextId = 1

const EASE = 'cubic-bezier(0.4,0,0.2,1)'

function getInitialStack(hash: string): LayerEntry[] {
  const stack: LayerEntry[] = [{ id: nextId++, hash: '#/', alive: true }]
  if (hash !== '#/' && hash !== '#') {
    if (hash.startsWith('#/item/')) {
      const rest = hash.slice('#/item/'.length)
      const slash = rest.indexOf('/')
      stack.push({ id: nextId++, hash: `#/category/${rest.slice(0, slash)}`, alive: true })
    }
    stack.push({ id: nextId++, hash, alive: true })
  }
  return stack
}

export function useLayerStack() {
  const [stack, setStack] = useState<LayerEntry[]>(() =>
    getInitialStack(location.hash || '#/')
  )
  const stackRef = useRef(stack)
  stackRef.current = stack

  const layerRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const transitioning = useRef(false)

  const getEl = (id: number) => layerRefs.current.get(id) ?? null

  const push = useMemoizedFn((hash: string) => {
    if (transitioning.current) return
    const prev = stackRef.current
    if (prev[prev.length - 1]?.hash === hash) return
    history.pushState(null, '', hash)
    const id = nextId++
    setStack([...prev, { id, hash, alive: true }])
    // 入场动画：等 React commit 后 DOM 存在再操作
    requestAnimationFrame(() => {
      const el = layerRefs.current.get(id)
      if (!el) return
      const w = el.offsetWidth || window.innerWidth
      el.style.transform = `translateX(${w}px)`
      requestAnimationFrame(() => {
        el.style.transition = `transform 280ms ${EASE}`
        el.style.transform  = 'translateX(0)'
        el.addEventListener('transitionend', () => {
          el.style.transition = ''
        }, { once: true })
      })
    })
  })

  const pop = useMemoizedFn((gestureStartDx = 0) => {
    const prev = stackRef.current
    if (prev.length <= 1 || transitioning.current) return

    const top   = prev[prev.length - 1]
    const below = prev[prev.length - 2]
    const topEl   = getEl(top.id)
    const belowEl = getEl(below.id)

    if (!topEl) {
      setStack(s => s.slice(0, -1))
      return
    }

    transitioning.current = true
    const w   = topEl.offsetWidth || window.innerWidth
    const rem = w - gestureStartDx
    const dur = Math.round(Math.min(280, Math.max(120, rem * 0.65)))
    const durStr = `${dur}ms`

    // 顶层滑出
    topEl.style.transition = `transform ${durStr} ${EASE}`
    topEl.style.transform  = `translateX(${w}px)`
    topEl.addEventListener('transitionend', () => {
      topEl.style.transition = ''
      transitioning.current = false
      // 动画结束：卸载 content，保留壳，然后移除壳
      setStack(s => s.filter(e => e.id !== top.id))
    }, { once: true })

    // 父层视差回正
    if (belowEl) {
      belowEl.style.transition = `transform ${durStr} ${EASE}`
      belowEl.style.transform  = 'translateX(0)'
      belowEl.addEventListener('transitionend', () => {
        belowEl.style.transition = ''
        belowEl.style.transform  = ''
      }, { once: true })
    }
  })

  const canPop = useMemoizedFn(() => stackRef.current.length > 1 && !transitioning.current)

  return { stack, push, pop, canPop, layerRefs, transitioning }
}
