import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadPoemIndex } from '../data/poems'
import type { PoemSummary } from '../data/poems'
import { useProgress } from '../hooks/useProgress'
import { useQueue } from '../hooks/useQueue'

type AddTab = 'unmemorized' | 'memorized'

export default function QueueScreen() {
  const navigate = useNavigate()
  const { getState } = useProgress()
  const { queue, addToQueue, removeFromQueue, isInQueue } = useQueue()
  const [poems, setPoems] = useState<PoemSummary[]>([])
  const [addTab, setAddTab] = useState<AddTab>('unmemorized')
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const isComposing = useRef(false)

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

  return (
    <div className="qs">
      <header className="qs__header">
        <button className="qs__back" onClick={() => navigate(-1)}>← 返回</button>
        <h1 className="qs__title">待背队列</h1>
      </header>

      <div className="qs__body">
        {/* 当前队列 */}
        <div className="qs__section-label">
          当前队列（{queue.length} 首）
          {queue.length > 0 && (
            <button className="qs__clear-btn" onClick={() => {
              if (window.confirm('确认清空队列？')) queue.forEach(id => removeFromQueue(id))
            }}>清空</button>
          )}
        </div>

        {queuePoems.length === 0 ? (
          <div className="qs__queue-container">
            <div className="qs__queue-empty">还没有诗，从下方选择吧</div>
          </div>
        ) : (
          <div className="qs__queue-container qs__queue-list">
            {queuePoems.map((p, idx) => (
              <div key={p.id} className="qs__queue-item">
                <div className="qs__queue-index">{idx === 0 ? '今' : idx + 1}</div>
                <div className="qs__queue-info">
                  <div className="qs__queue-title">《{p.title}》</div>
                  <div className="qs__queue-meta">{p.dynasty ? `${p.dynasty}·` : ''}{p.author}</div>
                </div>
                {idx === 0 && <span className="qs__today-badge">今日</span>}
                <button className="qs__remove-btn" onClick={() => removeFromQueue(p.id)} aria-label="从队列移除">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* 添加到队列 */}
        <div className="qs__section-label" style={{ marginTop: 20 }}>添加到队列</div>

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
          >未背诵</button>
          <button
            className={`qs__tab${addTab === 'memorized' ? ' qs__tab--active' : ''}`}
            onClick={() => setAddTab('memorized')}
          >已背诵</button>
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
                  {inQueue ? '已在队列' : '加入'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <style>{styles}</style>
    </div>
  )
}

const styles = `
  .qs {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: var(--bg);
  }
  .qs__header {
    position: sticky;
    top: env(safe-area-inset-top, 0px);
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 16px;
    height: var(--navbar-height);
    background: #C62828;
  }
  .qs__back {
    color: #FFF8E1;
    font-size: var(--text-sm);
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(255,255,255,0.15);
    flex-shrink: 0;
  }
  .qs__back:active { background: rgba(255,255,255,0.28); }
  .qs__title {
    font-family: var(--font-brush);
    font-size: 1.2rem;
    color: #FFF8E1;
  }
  .qs__body {
    padding: 16px 16px calc(32px + env(safe-area-inset-bottom, 0px));
  }
  .qs__section-label {
    font-size: var(--text-sm);
    font-weight: 700;
    color: var(--ink-light);
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 28px;
  }
  .qs__clear-btn {
    margin-left: auto;
    font-size: 12px;
    color: #C62828;
    padding: 3px 10px;
    border-radius: 999px;
    border: 1px solid rgba(198,40,40,0.3);
  }
  .qs__clear-btn:active { background: rgba(198,40,40,0.08); }
  .qs__queue-empty {
    text-align: center;
    padding: 20px;
    font-size: var(--text-sm);
    color: var(--ink-light);
  }
  .qs__queue-container {
    min-height: 68px;
    background: var(--surface);
    border-radius: 12px;
    border: 1.5px dashed var(--border);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .qs__queue-container.qs__queue-list {
    border-style: solid;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 0;
  }
  .qs__queue-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .qs__queue-item {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--surface);
    border-radius: 12px;
    padding: 12px;
    border: 1.5px solid var(--border);
    box-shadow: var(--shadow-card);
  }
  .qs__queue-index {
    width: 28px; height: 28px;
    border-radius: 50%;
    background: #f0e8e0;
    color: var(--ink-light);
    font-size: 12px;
    font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .qs__queue-item:first-child .qs__queue-index {
    background: #C62828;
    color: #fff;
    font-size: 11px;
  }
  .qs__queue-info { flex: 1; min-width: 0; }
  .qs__queue-title {
    font-family: var(--font-brush);
    font-size: 1rem;
    color: var(--ink);
  }
  .qs__queue-meta {
    font-size: 11px;
    color: var(--ink-light);
    margin-top: 1px;
  }
  .qs__today-badge {
    font-size: 10px;
    font-weight: 700;
    color: #C62828;
    background: rgba(198,40,40,0.1);
    border-radius: 999px;
    padding: 2px 8px;
    flex-shrink: 0;
  }
  .qs__remove-btn {
    width: 28px; height: 28px;
    border-radius: 50%;
    background: #f5ede8;
    color: #b09070;
    font-size: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .qs__remove-btn:active { background: #ffe0d0; color: #C62828; }

  /* 搜索 */
  .qs__search {
    width: 100%;
    padding: 10px 14px;
    border-radius: 12px;
    border: 1.5px solid var(--border);
    background: var(--surface);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--ink);
    margin-bottom: 10px;
    outline: none;
  }
  .qs__search:focus { border-color: rgba(198,40,40,0.4); }

  /* Tabs */
  .qs__tabs {
    display: flex;
    border-radius: 10px;
    background: #f0e8e0;
    padding: 3px;
    margin-bottom: 12px;
    gap: 3px;
  }
  .qs__tab {
    flex: 1;
    padding: 7px;
    border-radius: 8px;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--ink-light);
    transition: all 0.15s;
  }
  .qs__tab--active {
    background: var(--surface);
    color: #C62828;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  }

  /* 添加列表 */
  .qs__add-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .qs__add-empty {
    text-align: center;
    padding: 24px;
    font-size: var(--text-sm);
    color: var(--ink-light);
  }
  .qs__add-item {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--surface);
    border-radius: 12px;
    padding: 12px;
    border: 1.5px solid var(--border);
  }
  .qs__add-info { flex: 1; min-width: 0; }
  .qs__add-title {
    font-family: var(--font-brush);
    font-size: 1rem;
    color: var(--ink);
  }
  .qs__add-meta {
    font-size: 11px;
    color: var(--ink-light);
    margin-top: 1px;
  }
  .qs__add-btn {
    flex-shrink: 0;
    padding: 6px 16px;
    background: #C62828;
    color: #fff;
    border-radius: 999px;
    font-size: var(--text-sm);
    font-weight: 700;
    transition: opacity 0.15s;
  }
  .qs__add-btn:active { opacity: 0.85; }
  .qs__add-btn--in {
    background: #f0e8e0;
    color: var(--ink-light);
    cursor: default;
  }
`
