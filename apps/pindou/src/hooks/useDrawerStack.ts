import { useRef, useState } from 'react'
import { useMemoizedFn } from './useMemoizedFn'

export interface DrawerEntry {
  id: number
  content: React.ReactNode
}

let nextId = 1

const EASE = 'cubic-bezier(0.4,0,0.2,1)'

export function useDrawerStack() {
  const [stack, setStack] = useState<DrawerEntry[]>([])
  const stackRef      = useRef(stack)
  stackRef.current    = stack
  const drawerRefs    = useRef<Map<number, HTMLDivElement>>(new Map())
  const transitioning = useRef(false)
  const animatedIds   = useRef<Set<number>>(new Set())

  const push = useMemoizedFn((content: React.ReactNode) => {
    if (transitioning.current) return
    const id = nextId++
    setStack(s => [...s, { id, content }])
    // 入场动画在 onMount 里执行
  })

  const pop = useMemoizedFn((gestureStartDx = 0) => {
    const s = stackRef.current
    if (s.length === 0 || transitioning.current) return

    const top    = s[s.length - 1]
    const below  = s[s.length - 2]
    const topEl  = drawerRefs.current.get(top.id) ?? null
    const belowEl = below ? drawerRefs.current.get(below.id) ?? null : null

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
      animatedIds.current.delete(top.id)
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

  const canPop = useMemoizedFn(() => stackRef.current.length > 0 && !transitioning.current)

  const onMount = useMemoizedFn((id: number, el: HTMLDivElement) => {
    drawerRefs.current.set(id, el)
    if (animatedIds.current.has(id)) return
    animatedIds.current.add(id)
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

  const onUnmount = useMemoizedFn((id: number) => {
    drawerRefs.current.delete(id)
  })

  return { stack, push, pop, canPop, drawerRefs, onMount, onUnmount }
}
