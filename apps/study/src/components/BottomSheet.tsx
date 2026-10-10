import { useRef, useState, useImperativeHandle, forwardRef, type ReactNode } from 'react'

export interface BottomSheetActions {
  open: () => void
  close: () => void
}

interface Props {
  children: ReactNode
  onClose?: () => void
}

const CLOSE_THRESHOLD_RATIO = 0.5
const VELOCITY_THRESHOLD = 0.5  // px/ms

const BottomSheet = forwardRef<BottomSheetActions, Props>(({ children, onClose }, ref) => {
  const [visible, setVisible] = useState(false)
  const [phase, setPhase] = useState<'hidden' | 'enter' | 'idle' | 'drag' | 'closing' | 'snapping'>('hidden')
  const [dragY, setDragY] = useState(0)
  const dragYRef = useRef(0)  // 实时镜像 dragY，避免 stale closure
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef(0)
  const lastY = useRef(0)
  const lastTime = useRef(0)
  const velocity = useRef(0)
  const closeDuration = useRef(300)

  function updateDragY(val: number) {
    dragYRef.current = val
    setDragY(val)
  }

  useImperativeHandle(ref, () => ({
    open() {
      setVisible(true)
      setPhase('enter')
      updateDragY(0)
      document.body.style.overflow = 'hidden'
    },
    close() { doClose() },
  }))

  function doClose(v = 0) {
    const sheetH = sheetRef.current?.offsetHeight ?? 600
    const currentDragY = dragYRef.current
    const remaining = sheetH - currentDragY
    const duration = v > VELOCITY_THRESHOLD
      ? Math.min(Math.max(remaining / v, 80), 400)
      : 300
    closeDuration.current = duration
    document.body.style.overflow = ''
    // 第一帧：切换到 closing 状态（启用 transition），dragY 保持当前位置
    setPhase('closing')
    // 第二帧：浏览器已渲染当前位置 + transition，再更新目标位置触发动画
    requestAnimationFrame(() => {
      updateDragY(sheetH + 50)
    })
    setTimeout(() => {
      setVisible(false)
      setPhase('hidden')
      updateDragY(0)
      onClose?.()
    }, duration)
  }

  function onTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY
    lastY.current = e.touches[0].clientY
    lastTime.current = e.timeStamp
    velocity.current = 0
    setPhase('drag')
  }

  function onTouchMove(e: React.TouchEvent) {
    if (phase !== 'drag') return
    const dy = e.touches[0].clientY - dragStartY.current
    if (dy < 0) return
    const dt = e.timeStamp - lastTime.current
    if (dt > 0) velocity.current = (e.touches[0].clientY - lastY.current) / dt
    lastY.current = e.touches[0].clientY
    lastTime.current = e.timeStamp
    updateDragY(dy)
  }

  function onTouchEnd() {
    if (phase !== 'drag') return
    const sheetH = sheetRef.current?.offsetHeight ?? 600
    const overHalf = dragYRef.current > sheetH * CLOSE_THRESHOLD_RATIO
    const fastEnough = velocity.current > VELOCITY_THRESHOLD
    if (overHalf || fastEnough) {
      doClose(velocity.current)
    } else {
      setPhase('snapping')
      updateDragY(0)
      setTimeout(() => setPhase('idle'), 350)
    }
  }

  if (!visible) return null

  const isDragging = phase === 'drag'
  const isSnapping = phase === 'snapping'
  const isClosing = phase === 'closing'
  const isEntering = phase === 'enter'

  const transition = isDragging
    ? 'none'
    : isSnapping
      ? 'transform 0.35s cubic-bezier(0.32,0.72,0,1)'
      : isClosing
        ? `transform ${closeDuration.current}ms cubic-bezier(0.32,0.72,0,1)`
        : undefined

  return (
    <div className="bs-overlay">
      <div className="bs-backdrop" onClick={() => doClose()} />
      <div
        ref={sheetRef}
        className={`bs-sheet${isEntering ? ' bs-sheet--enter' : ''}`}
        style={{ transform: `translateY(${dragY}px)`, transition }}
        onAnimationEnd={() => { if (phase === 'enter') setPhase('idle') }}
      >
        <div
          className="bs-handle-area"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="bs-handle" />
        </div>
        {children}
      </div>
      <style>{`
        .bs-overlay { position: fixed; inset: 0; z-index: 200; }
        .bs-backdrop {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.45);
          animation: bs-backdrop-in 0.28s ease both;
        }
        @keyframes bs-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        .bs-sheet {
          position: absolute; bottom: 0; left: 0; right: 0;
          border-radius: 18px 18px 0 0;
          max-height: 88vh;
          display: flex; flex-direction: column;
          overflow: hidden;
          will-change: transform;
        }
        .bs-sheet--enter {
          animation: bs-slide-up 0.32s cubic-bezier(0.32,0.72,0,1) both;
        }
        @keyframes bs-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .bs-handle-area {
          cursor: grab; flex-shrink: 0;
          display: flex; justify-content: center;
          height: 28px; align-items: center;
        }
        .bs-handle {
          width: 40px; height: 4px; border-radius: 999px;
          background: rgba(255,255,255,0.4);
        }
      `}</style>
    </div>
  )
})

BottomSheet.displayName = 'BottomSheet'
export default BottomSheet