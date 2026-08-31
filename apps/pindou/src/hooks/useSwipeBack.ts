import { useEffect, useRef } from 'react'
import { useMemoizedFn } from './useMemoizedFn'

interface SwipeBackOptions {
  getTopEl: () => HTMLElement | null
  getBelowEl: () => HTMLElement | null
  canPop: () => boolean
  onCommit: (dx: number) => void  // 达到阈值，通知外部执行 pop
  onCancel: () => void            // 未达到阈值，通知外部重置状态
}

const THRESHOLD = 0.3  // 触发 pop 的比例阈值

export function useSwipeBack({ getTopEl, getBelowEl, canPop, onCommit, onCancel }: SwipeBackOptions) {
  const getTopElRef   = useRef(getTopEl)
  const getBelowElRef = useRef(getBelowEl)
  const canPopRef     = useRef(canPop)
  const onCommitRef   = useRef(onCommit)
  const onCancelRef   = useRef(onCancel)
  getTopElRef.current   = getTopEl
  getBelowElRef.current = getBelowEl
  canPopRef.current     = canPop
  onCommitRef.current   = onCommit
  onCancelRef.current   = onCancel

  const activeRef = useRef(false)

  const reset = useMemoizedFn(() => {
    const top   = getTopElRef.current()
    const below = getBelowElRef.current()
    if (top)   { top.style.transition = '';   top.style.transform = '' }
    if (below) { below.style.transition = ''; below.style.transform = '' }
    activeRef.current = false
  })

  useEffect(() => {
    let x0 = 0, y0 = 0, decided = false, tracking = false

    function onStart(e: TouchEvent) {
      if (activeRef.current || !canPopRef.current()) return
      x0 = e.touches[0].clientX
      y0 = e.touches[0].clientY
      decided = false
      tracking = false
    }

    function onMove(e: TouchEvent) {
      const dx = e.touches[0].clientX - x0
      const dy = e.touches[0].clientY - y0

      if (!decided) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        decided = true
        if (dx <= 0 || Math.abs(dy) > Math.abs(dx) || !canPopRef.current()) return
        tracking = true
      }

      if (!tracking) return
      e.preventDefault()

      const d = Math.max(0, dx)
      const w = window.innerWidth
      const top   = getTopElRef.current()
      const below = getBelowElRef.current()
      if (top)   top.style.transform   = `translateX(${d}px)`
      if (below) below.style.transform = `translateX(${-30 + (d / w) * 30}%)`
    }

    function onEnd(e: TouchEvent) {
      if (!tracking) { decided = false; tracking = false; return }
      const dx = (e.changedTouches[0]?.clientX ?? x0) - x0
      decided = false
      tracking = false

      const top   = getTopElRef.current()
      const below = getBelowElRef.current()
      const w     = top?.offsetWidth ?? window.innerWidth

      if (dx > w * THRESHOLD) {
        onCommitRef.current(dx)
      } else {
        // CSS transition 回弹
        const dur = '200ms'
        if (top) {
          top.style.transition = `transform ${dur} ease-out`
          top.style.transform  = 'translateX(0)'
          top.addEventListener('transitionend', () => {
            top.style.transition = ''
            onCancelRef.current()
          }, { once: true })
        }
        if (below) {
          below.style.transition = `transform ${dur} ease-out`
          below.style.transform  = 'translateX(-30%)'
          below.addEventListener('transitionend', () => {
            below.style.transition = ''
          }, { once: true })
        }
      }
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove',  onMove,  { passive: false })
    document.addEventListener('touchend',   onEnd,   { passive: true })
    document.addEventListener('touchcancel',onEnd,   { passive: true })

    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove',  onMove)
      document.removeEventListener('touchend',   onEnd)
      document.removeEventListener('touchcancel',onEnd)
    }
  }, [])

  return { reset }
}
