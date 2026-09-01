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
  })

  const pop = useMemoizedFn((gestureStartDx = 0) => {
    const s = stackRef.current
    if (s.length === 0 || transitioning.current) return

    const top    = s[s.length - 1]
    // below 是栈里的上一个，如果没有则用 id=0 的首页
    const belowId = s.length >= 2 ? s[s.length - 2].id : 0
    const topEl   = drawerRefs.current.get(top.id) ?? null
    const belowEl = drawerRefs.current.get(belowId) ?? null

    if (!topEl) {
      setStack(s => s.slice(0, -1))
      return
    }

    transitioning.current = true
    const w      = topEl.offsetWidth || window.innerWidth
    const rem    = w - gestureStartDx
    const dur    = Math.round(Math.min(280, Math.max(120, rem * 0.65)))
    const durStr = `${dur}ms`

    const done = () => {
      topEl.style.transition = ''
      topEl.style.transform  = ''
      transitioning.current  = false
      animatedIds.current.delete(top.id)
      setStack(s => s.filter(e => e.id !== top.id))
    }

    topEl.style.transition = `transform ${durStr} ${EASE}`
    topEl.style.transform  = `translateX(${w}px)`
    // 超时保底，防止 transitionend 不触发
    const timer = setTimeout(done, dur + 100)
    topEl.addEventListener('transitionend', () => { clearTimeout(timer); done() }, { once: true })

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
    // id=0 是首页，不需要入场动画
    if (id === 0) return
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
