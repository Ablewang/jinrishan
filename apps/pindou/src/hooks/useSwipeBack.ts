import { useEffect } from 'react'

const EASE = 'ease-out'

function backHashFor(hash: string): string | null {
  if (hash.startsWith('#/item/')) {
    const rest = hash.slice('#/item/'.length)
    return `#/category/${rest.slice(0, rest.indexOf('/'))}`
  }
  if (hash.startsWith('#/category/') || hash === '#/summary') return '#/'
  return null
}

interface GestureOptions {
  getTopEl: () => HTMLDivElement | null
  getBelowEl: () => HTMLDivElement | null
  canPop: () => boolean
  onCommit: (dx: number) => void
  transitioning: React.MutableRefObject<boolean>
}

export function useSwipeBack({ getTopEl, getBelowEl, canPop, onCommit, transitioning }: GestureOptions) {
  useEffect(() => {
    let sw: { x0: number; y0: number; decided: boolean; active: boolean; target: string } | null = null

    function onStart(e: TouchEvent) {
      if (transitioning.current) return
      sw = { x0: e.touches[0].clientX, y0: e.touches[0].clientY, decided: false, active: false, target: '' }
    }

    function onMove(e: TouchEvent) {
      if (!sw) return
      const dx = e.touches[0].clientX - sw.x0
      const dy = e.touches[0].clientY - sw.y0

      if (!sw.decided) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        sw.decided = true
        const target = backHashFor(location.hash)
        if (dx <= 0 || Math.abs(dy) > Math.abs(dx) || !target || !canPop()) {
          sw = null
          return
        }
        sw.active = true
        sw.target = target
      }

      if (!sw?.active) return
      e.preventDefault()
      const d = Math.max(0, dx)
      const w = window.innerWidth
      const top   = getTopEl()
      const below = getBelowEl()
      if (top)   top.style.transform   = `translateX(${d}px)`
      if (below) below.style.transform = `translateX(${-30 + (d / w) * 30}%)`
    }

    function onEnd(e: TouchEvent) {
      if (!sw?.active) { sw = null; return }
      const dx = (e.changedTouches[0]?.clientX ?? sw.x0) - sw.x0
      sw = null

      const top   = getTopEl()
      const below = getBelowEl()
      const w = top?.offsetWidth ?? window.innerWidth

      if (dx > w * 0.3) {
        onCommit(dx)
      } else {
        if (top) top.animate(
          [{ transform: top.style.transform }, { transform: 'translateX(0)' }],
          { duration: 200, easing: EASE }
        ).onfinish = () => { top.style.transform = '' }
        if (below) below.animate(
          [{ transform: below.style.transform }, { transform: 'translateX(-30%)' }],
          { duration: 200, easing: EASE }
        ).onfinish = () => { below.style.transform = 'translateX(-30%)' }
      }
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd, { passive: true })
    document.addEventListener('touchcancel', onEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
  }, [getTopEl, getBelowEl, canPop, onCommit, transitioning])
}
