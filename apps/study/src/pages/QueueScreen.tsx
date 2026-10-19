import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { goBack } from '../utils/navigation'
import { loadPoemIndex } from '../data/poems'
import type { PoemSummary } from '../data/poems'
import { useProgress } from '../hooks/useProgress'
import { useQueue } from '../hooks/useQueue'
import './QueueScreen.css'

type AddTab = 'unmemorized' | 'memorized'

export default function QueueScreen() {
  const navigate = useNavigate()
  const { getState } = useProgress()
  const { queue, addToQueue, removeFromQueue, isInQueue, reorderQueue } = useQueue()
  const [poems, setPoems] = useState<PoemSummary[]>([])
  const [addTab, setAddTab] = useState<AddTab>('unmemorized')
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const isComposing = useRef(false)

  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<HTMLDivElement | null>(null)
  const touchFromIdx = useRef<number | null>(null)
  const touchOffsetY = useRef(0)
  const itemHeightRef = useRef(0)
  const autoScrollRaf = useRef<number | null>(null)
  const autoScrollSpeed = useRef(0)

  // 拖拽时阻止页面滚动，用非 passive listener
  useEffect(() => {
    const prevent = (e: TouchEvent) => {
      if (touchFromIdx.current !== null) e.preventDefault()
    }
    document.addEventListener('touchmove', prevent, { passive: false })
    return () => document.removeEventListener('touchmove', prevent)
  }, [])

  function startAutoScroll() {
    if (autoScrollRaf.current !== null) return
    function tick() {
      if (autoScrollSpeed.current !== 0) {
        window.scrollBy(0, autoScrollSpeed.current)
        if (ghostRef.current) {
          const top = parseFloat(ghostRef.current.style.top)
          ghostRef.current.style.top = `${top + autoScrollSpeed.current}px`
        }
      }
      autoScrollRaf.current = requestAnimationFrame(tick)
    }
    autoScrollRaf.current = requestAnimationFrame(tick)
  }

  function stopAutoScroll() {
    if (autoScrollRaf.current !== null) {
      cancelAnimationFrame(autoScrollRaf.current)
      autoScrollRaf.current = null
    }
    autoScrollSpeed.current = 0
  }

  useEffect(() => { loadPoemIndex().then(setPoems) }, [])

  const queuePoems = queue.map(id => poems.find(p => p.id === id)).filter(Boolean) as PoemSummary[]

  const addList = useMemo(() => {
    const filtered = poems.filter(p => {
      const state = getState(p.id)
      if (addTab === 'memorized') return state.memorized
      return !state.memorized
    })
    if (!searchQuery.trim()) return filtered
    const q = searchQuery.trim().toLowerCase()
    return filtered.filter(p =>
      p.title.toLowerCase().includes(q) || p.author.toLowerCase().includes(q)
    )
  }, [poems, addTab, searchQuery, getState])

  function getIdxFromY(y: number): number | null {
    if (!listRef.current) return null
    const items = listRef.current.querySelectorAll<HTMLElement>('.qs__queue-item')
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect()
      if (y < rect.top + rect.height / 2) return i
    }
    return items.length - 1
  }

  function handleTouchStart(e: React.TouchEvent, idx: number) {
    const touch = e.touches[0]
    const item = (e.currentTarget as HTMLElement).closest<HTMLElement>('.qs__queue-item')
    if (!item) return

    const rect = item.getBoundingClientRect()
    touchOffsetY.current = touch.clientY - rect.top
    itemHeightRef.current = rect.height
    touchFromIdx.current = idx

    // 创建 ghost
    const ghost = item.cloneNode(true) as HTMLDivElement
    ghost.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${touch.clientY - touchOffsetY.current}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      pointer-events: none;
      z-index: 999;
      border-radius: 12px;
      background: #fff;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      opacity: 0.96;
      transform: scale(1.03);
      transition: box-shadow 0.15s;
    `
    document.body.appendChild(ghost)
    ghostRef.current = ghost

    setDraggingIdx(idx)
    setDragOverIdx(idx)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchFromIdx.current === null) return
    const touch = e.touches[0]
    if (ghostRef.current) {
      ghostRef.current.style.top = `${touch.clientY - touchOffsetY.current}px`
    }
    const over = getIdxFromY(touch.clientY)
    if (over !== null) setDragOverIdx(over)

    // 边缘自动滚动
    const EDGE = 80
    const vh = window.innerHeight
    if (touch.clientY < EDGE) {
      autoScrollSpeed.current = -Math.round((EDGE - touch.clientY) / 8)
      startAutoScroll()
    } else if (touch.clientY > vh - EDGE) {
      autoScrollSpeed.current = Math.round((touch.clientY - (vh - EDGE)) / 8)
      startAutoScroll()
    } else {
      stopAutoScroll()
    }
  }

  function handleTouchEnd() {
    stopAutoScroll()
    if (ghostRef.current) {
      document.body.removeChild(ghostRef.current)
      ghostRef.current = null
    }
    const from = touchFromIdx.current
    const to = dragOverIdx
    if (from !== null && to !== null && from !== to) {
      reorderQueue(from, to)
    }
    touchFromIdx.current = null
    setDraggingIdx(null)
    setDragOverIdx(null)
  }

  return (
    <div className="qs">
      <header className="qs__header">
        <button className="qs__back" onClick={() => goBack(navigate)}><svg viewBox="0 0 1024 1024" width="18" height="18" fill="currentColor"><path d="M403.2 812.8L100.256 512 403.2 211.2l59.744 59.744-198.4 198.4h652.8v85.344h-652.8l198.4 198.4z"/></svg> 返回</button>
        <h1 className="qs__title">背诗计划</h1>
      </header>

      <div className="qs__body">
        {/* 当前队列 */}
        <div className="qs__section-label">
          计划列表（{queue.length} 首）
          {queue.length > 0 && (
            <button className="qs__clear-btn" onClick={() => {
              if (window.confirm('确认清空计划？')) queue.forEach(id => removeFromQueue(id))
            }}>清空</button>
          )}
        </div>

        {queuePoems.length === 0 ? (
          <div className="qs__queue-container">
            <div className="qs__queue-empty">还没有诗，从下方选择吧</div>
          </div>
        ) : (
          <div
            ref={listRef}
            className="qs__queue-container qs__queue-list"
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {queuePoems.map((p, idx) => {
              const isDrag = draggingIdx === idx
              const isOver = dragOverIdx === idx && draggingIdx !== null && draggingIdx !== idx
              return (
                <div
                  key={p.id}
                  className={`qs__queue-item${isDrag ? ' qs__queue-item--dragging' : ''}${isOver ? ' qs__queue-item--dragover' : ''}`}
                >
                  <div
                    className="qs__drag-handle"
                    onTouchStart={e => handleTouchStart(e, idx)}
                  >⠿</div>
                  <div className="qs__queue-index">{idx === 0 ? '今' : idx + 1}</div>
                  <div className="qs__queue-info">
                    <div className="qs__queue-title">《{p.title}》</div>
                    <div className="qs__queue-meta">{p.dynasty ? `${p.dynasty}·` : ''}{p.author}</div>
                  </div>
                  {idx === 0 && <span className="qs__today-badge">今日</span>}
                  <button className="qs__remove-btn" onClick={() => removeFromQueue(p.id)} aria-label="从计划移除">✕</button>
                </div>
              )
            })}
          </div>
        )}

        {/* 添加到计划 */}
        <div className="qs__section-label" style={{ marginTop: 20 }}>添加到计划</div>

        <input
          className="qs__search"
          type="text"
          placeholder="搜索诗名或作者…"
          value={search}
          onCompositionStart={() => { isComposing.current = true }}
          onCompositionEnd={e => {
            isComposing.current = false
            setSearchQuery((e.target as HTMLInputElement).value)
          }}
          onChange={e => {
            setSearch(e.target.value)
            if (!isComposing.current) setSearchQuery(e.target.value)
          }}
        />

        <div className="qs__tabs">
          <button
            className={`qs__tab${addTab === 'unmemorized' ? ' qs__tab--active' : ''}`}
            onClick={() => setAddTab('unmemorized')}
          >待学习</button>
          <button
            className={`qs__tab${addTab === 'memorized' ? ' qs__tab--active' : ''}`}
            onClick={() => setAddTab('memorized')}
          >复习</button>
        </div>

        <div className="qs__add-list">
          {addList.length === 0 && (
            <div className="qs__add-empty">没有符合条件的诗</div>
          )}
          {addList.map(p => {
            const inQueue = isInQueue(p.id)
            return (
              <div key={p.id} className="qs__add-item">
                <div className="qs__add-info">
                  <div className="qs__add-title">《{p.title}》</div>
                  <div className="qs__add-meta">{p.dynasty ? `${p.dynasty}·` : ''}{p.author}</div>
                </div>
                <button
                  className={`qs__add-btn${inQueue ? ' qs__add-btn--in' : ''}`}
                  onClick={() => !inQueue && addToQueue(p.id)}
                  disabled={inQueue}
                >
                  {inQueue ? '已在计划' : '加入'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

