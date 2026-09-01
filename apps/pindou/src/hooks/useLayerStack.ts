import { useRef, useState } from 'react'
import { useMemoizedFn } from './useMemoizedFn'

export interface LayerEntry {
  id: number
  hash: string
}

let nextId = 1

const EASE = 'cubic-bezier(0.4,0,0.2,1)'

function getInitialStack(hash: string): LayerEntry[] {
  const stack: LayerEntry[] = [{ id: nextId++, hash: '#/' }]
  if (hash !== '#/' && hash !== '#') {
    if (hash.startsWith('#/item/')) {
      const rest = hash.slice('#/item/'.length)
      const slash = rest.indexOf('/')
      stack.push({ id: nextId++, hash: `#/category/${rest.slice(0, slash)}` })
    }
    stack.push({ id: nextId++, hash })
  }
  return stack
}

export function useLayerStack() {
  const [stack, setStack] = useState<LayerEntry[]>(() =>
    getInitialStack(location.hash || '#/')
  )
  const stackRef      = useRef(stack)
  stackRef.current    = stack
  const layerRefs     = useRef<Map<number, HTMLDivElement>>(new Map())
  const transitioning = useRef(false)
  const animatedIds   = useRef<Set<number>>(new Set())  // 已执行过入场动画的 id

  const getEl = (id: number) => layerRefs.current.get(id) ?? null

  const push = useMemoizedFn((hash: string) => {
    if (transitioning.current) return
    const prev = stackRef.current
    if (prev[prev.length - 1]?.hash === hash) return
    history.pushState(null, '', hash)
    setStack([...prev, { id: nextId++, hash }])
  })

  const pop = useMemoizedFn((gestureStartDx = 0) => {
    const prev = stackRef.current
    if (prev.length <= 1 || transitioning.current) return

    const top    = prev[prev.length - 1]
    const below  = prev[prev.length - 2]
    const topEl  = getEl(top.id)
    const belowEl = getEl(below.id)

    if (!topEl) {
      setStack(s => s.slice(0, -1))
      return
    }

    transitioning.current = true
    const w      = topEl.offsetWidth || window.innerWidth
    const rem    = w - gestureStartDx
    const dur    = Math.round(Math.min(280, Math.max(120, rem * 0.65)))
    const durStr = `${dur}ms`

    topEl.style.transition = `transform ${durStr} ${EASE}`
    topEl.style.transform  = `translateX(${w}px)`
    topEl.addEventListener('transitionend', () => {
      topEl.style.transition = ''
      transitioning.current  = false
      setStack(s => s.filter(e => e.id !== top.id))
    }, { once: true })

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

  // ref callback 里调用：用 animatedIds 判断是否需要入场动画，和 React render 周期解耦
  const onLayerMount = useMemoizedFn((id: number, el: HTMLDivElement) => {
    layerRefs.current.set(id, el)
    if (animatedIds.current.has(id)) return  // 已做过入场动画，re-render 导致的重复调用直接跳过
    animatedIds.current.add(id)
    // 初始位置在右侧
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

  return { stack, push, pop, canPop, layerRefs, onLayerMount }
}
