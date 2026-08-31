import { useEffect, useRef } from 'react'
import type { LayerEntry } from '../hooks/useLayerStack'

const EASE = 'cubic-bezier(0.4,0,0.2,1)'

const SHELL_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'var(--bg)',
  willChange: 'transform',
  overflow: 'hidden',
}

interface Props {
  stack: LayerEntry[]
  onRemove: (id: number) => void
  renderContent: (entry: LayerEntry, idx: number) => React.ReactNode
  layerRefs: React.MutableRefObject<Map<number, HTMLDivElement>>
}

export function LayerRenderer({ stack, onRemove, renderContent, layerRefs }: Props) {
  const prevStackRef = useRef<LayerEntry[]>(stack)

  useEffect(() => {
    const prev = prevStackRef.current
    const cur  = stack

    cur.forEach((entry, idx) => {
      const el = layerRefs.current.get(entry.id)
      if (!el) return

      const wasAlive = prev.find(e => e.id === entry.id)?.alive
      const isNew    = !prev.find(e => e.id === entry.id)

      // 新层入场动画
      if (isNew && entry.alive) {
        const w = el.offsetWidth || window.innerWidth
        el.style.transform = `translateX(${w}px)`
        requestAnimationFrame(() => {
          el.style.transition = `transform 280ms ${EASE}`
          el.style.transform  = 'translateX(0)'
          el.addEventListener('transitionend', () => {
            el.style.transition = ''
          }, { once: true })
        })
        return
      }

      // alive 从 true → false：退场动画，结束后 remove
      if (wasAlive && !entry.alive) {
        const below = idx >= 1 ? layerRefs.current.get(cur[idx - 1].id) : null
        const w   = el.offsetWidth || window.innerWidth
        const dur = `${Math.round(Math.min(280, Math.max(120, w * 0.65)))}ms`

        // 顶层滑出
        el.style.transition = `transform ${dur} ${EASE}`
        el.style.transform  = `translateX(${w}px)`
        el.addEventListener('transitionend', () => {
          el.style.transition = ''
          onRemove(entry.id)
        }, { once: true })

        // 父层视差回正
        if (below) {
          below.style.transition = `transform ${dur} ${EASE}`
          below.style.transform  = 'translateX(0)'
          below.addEventListener('transitionend', () => {
            below.style.transition = ''
            below.style.transform  = ''
          }, { once: true })
        }
      }
    })

    prevStackRef.current = cur
  }, [stack, onRemove, layerRefs])

  return (
    <>
      {stack.map((entry, idx) => (
        <div
          key={entry.id}
          style={{ ...SHELL_STYLE, zIndex: idx + 1 }}
          ref={el => {
            if (el) layerRefs.current.set(entry.id, el)
            else    layerRefs.current.delete(entry.id)
          }}
        >
          {entry.alive ? renderContent(entry, idx) : null}
        </div>
      ))}
    </>
  )
}
