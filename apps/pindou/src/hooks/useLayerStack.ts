import { useCallback, useRef, useState } from 'react'

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
  const layerRefs  = useRef<Map<number, HTMLDivElement>>(new Map())
  const transitioning = useRef(false)

  const getEl = (id: number) => layerRefs.current.get(id)

  const push = useCallback((hash: string) => {
    if (transitioning.current) return
    setStack(prev => {
      if (prev[prev.length - 1].hash === hash) return prev
      history.pushState(null, '', hash)
      return [...prev, { id: nextId++, hash, animate: true }]
    })
  }, [])

  const pop = useCallback((startDx = 0, gestureActive = false) => {
    setStack(prev => {
      if (prev.length <= 1) return prev
      const top   = prev[prev.length - 1]
      const below = prev[prev.length - 2]
      const topEl   = getEl(top.id)
      const belowEl = getEl(below.id)

      if (!topEl) return prev.slice(0, -1)

      transitioning.current = true
      const w   = topEl.offsetWidth || window.innerWidth
      const rem = w - startDx
      const dur = Math.round(Math.min(280, Math.max(120, rem * 0.65)))

      topEl.animate(
        [{ transform: `translateX(${startDx}px)` }, { transform: `translateX(${w}px)` }],
        { duration: dur, easing: EASE, fill: 'forwards' }
      ).onfinish = () => { transitioning.current = false }

      if (belowEl) {
        const fromT = gestureActive ? (belowEl.style.transform || 'translateX(-30%)') : 'translateX(-30%)'
        belowEl.style.transform = ''
        belowEl.animate(
          [{ transform: fromT }, { transform: 'translateX(0)' }],
          { duration: dur, easing: EASE }
        )
      }

      return prev.slice(0, -1)
    })
  }, [])

  const animateIn = useCallback((el: HTMLDivElement) => {
    const w = el.offsetWidth || window.innerWidth
    el.style.transform = `translateX(${w}px)`
    requestAnimationFrame(() => {
      el.animate(
        [{ transform: `translateX(${w}px)` }, { transform: 'translateX(0)' }],
        { duration: 280, easing: EASE }
      ).onfinish = () => { el.style.transform = '' }
    })
  }, [])

  return { stack, push, pop, animateIn, layerRefs, transitioning }
}
