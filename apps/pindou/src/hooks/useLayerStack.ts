import { useRef, useState } from 'react'
import { useMemoizedFn } from './useMemoizedFn'

export interface LayerEntry {
  id: number
  hash: string
  animate: boolean
}

let nextId = 1

const EASE = 'cubic-bezier(0.4,0,0.2,1)'

function getInitialStack(hash: string): LayerEntry[] {
  const stack: LayerEntry[] = [{ id: nextId++, hash: '#/', animate: false }]
  if (hash !== '#/' && hash !== '#') {
    if (hash.startsWith('#/item/')) {
      const rest = hash.slice('#/item/'.length)
      const slash = rest.indexOf('/')
      stack.push({ id: nextId++, hash: `#/category/${rest.slice(0, slash)}`, animate: false })
    }
    stack.push({ id: nextId++, hash, animate: false })
  }
  return stack
}

export function useLayerStack() {
  const [stack, setStack] = useState<LayerEntry[]>(() =>
    getInitialStack(location.hash || '#/')
  )
  const stackRef = useRef(stack)
  stackRef.current = stack

  const layerRefs  = useRef<Map<number, HTMLDivElement>>(new Map())
  const transitioning = useRef(false)

  const getEl = (id: number) => layerRefs.current.get(id)

  const push = useMemoizedFn((hash: string) => {
    if (transitioning.current) return
    const prev = stackRef.current
    if (prev[prev.length - 1]?.hash === hash) return
    history.pushState(null, '', hash)
    setStack([...prev, { id: nextId++, hash, animate: true }])
  })

  const pop = useMemoizedFn((startDx = 0, gestureActive = false) => {
    const prev = stackRef.current
    if (prev.length <= 1) return

    const top    = prev[prev.length - 1]
    const below  = prev[prev.length - 2]
    const topEl  = getEl(top.id)
    const belowEl = getEl(below.id)

    if (!topEl) {
      setStack(s => s.slice(0, -1))
      return
    }

    transitioning.current = true
    const w   = topEl.offsetWidth || window.innerWidth
    const rem = w - startDx
    const dur = Math.round(Math.min(280, Math.max(120, rem * 0.65)))

    const topAnim = topEl.animate(
      [{ transform: `translateX(${startDx}px)` }, { transform: `translateX(${w}px)` }],
      { duration: dur, easing: EASE }
    )
    topAnim.onfinish = () => {
      topEl.style.display = 'none'
      transitioning.current = false
      setStack(s => s.filter(e => e.id !== top.id))
    }

    if (belowEl) {
      const fromT = gestureActive
        ? (belowEl.style.transform || 'translateX(-30%)')
        : 'translateX(-30%)'
      belowEl.animate(
        [{ transform: fromT }, { transform: 'translateX(0)' }],
        { duration: dur, easing: EASE, fill: 'forwards' }
      ).onfinish = () => { belowEl.style.transform = '' }
    }
  })

  const animateIn = useMemoizedFn((el: HTMLDivElement) => {
    const w = el.offsetWidth || window.innerWidth
    el.style.transform = `translateX(${w}px)`
    requestAnimationFrame(() => {
      el.animate(
        [{ transform: `translateX(${w}px)` }, { transform: 'translateX(0)' }],
        { duration: 280, easing: EASE }
      ).onfinish = () => { el.style.transform = '' }
    })
  })

  return { stack, push, pop, animateIn, layerRefs, transitioning }
}
