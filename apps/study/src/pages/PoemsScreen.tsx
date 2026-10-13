import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadPoemIndex } from '../data/poems'
import type { PoemSummary } from '../data/poems'
import { useProgress } from '../hooks/useProgress'

type Tab = 'all' | 'unmemorized' | 'memorized'

const PNG_IDS = new Set([46, 56, 58, 60, 65])
function getPoemImg(id: number) {
  const ext = PNG_IDS.has(id) ? 'png' : 'webp'
  return `/images/poem_${String(id).padStart(2, '0')}.${ext}`
}

export default function PoemsScreen() {
  const navigate = useNavigate()
  const { getState, totalMemorized } = useProgress()
  const [poems, setPoems] = useState<PoemSummary[]>([])
  const [tab, setTab] = useState<Tab>('all')

  useEffect(() => { loadPoemIndex().then(setPoems) }, [])

  const list = useMemo(() => {
    if (tab === 'memorized') return poems.filter(p => getState(p.id).memorized)
    if (tab === 'unmemorized') return poems.filter(p => !getState(p.id).memorized)
    return poems
  }, [poems, tab, getState])

  const total = poems.length

  return (
    <div className="ps">
      <header className="ps__header">
        <button className="ps__back" onClick={() => navigate(-1)}><svg viewBox="0 0 1024 1024" width="18" height="18" fill="currentColor"><path d="M403.2 812.8L100.256 512 403.2 211.2l59.744 59.744-198.4 198.4h652.8v85.344h-652.8l198.4 198.4z"/></svg> 返回</button>
        <h1 className="ps__title">诗集</h1>
        <span className="ps__count">{totalMemorized}/{total}</span>
      </header>

      <div className="ps__tabs">
        {([['all', '全部'], ['unmemorized', '未背诵'], ['memorized', '已背诵']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            className={`ps__tab${tab === t ? ' ps__tab--active' : ''}`}
            onClick={() => setTab(t)}
          >{label}</button>
        ))}
      </div>

      <div className="ps__grid">
        {list.map(p => {
          const state = getState(p.id)
          return (
            <div
              key={p.id}
              className={`ps__card${state.memorized ? ' ps__card--done' : ''}`}
              onClick={() => navigate(`/poem/${p.id}`)}
              role="button"
            >
              <div className="ps__card-img" style={{ backgroundImage: `url(${getPoemImg(p.id)})` }} />
              {state.memorized && <span className="ps__card-badge">✓</span>}
              <div className="ps__card-title">《{p.title}》</div>
              <div className="ps__card-meta">{p.dynasty ? `${p.dynasty}·` : ''}{p.author}</div>
              <div className="ps__card-line">{p.firstLine.slice(0, 7)}…</div>
              {state.bestStars > 0 && (
                <div className="ps__card-stars">{'★'.repeat(state.bestStars)}</div>
              )}
            </div>
          )
        })}
      </div>

      <style>{styles}</style>
    </div>
  )
}

const styles = `
  .ps {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: var(--bg);
    padding-bottom: calc(var(--tabbar-height, 64px) + 16px + env(safe-area-inset-bottom, 0px));
  }
  .ps__header {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: env(safe-area-inset-top, 0px) 16px 0;
    height: calc(var(--navbar-height) + env(safe-area-inset-top, 0px));
    background: #C62828;
  }
  .ps__back {
    color: #FFF8E1;
    font-size: var(--text-sm);
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(255,255,255,0.15);
    flex-shrink: 0;
  }
  .ps__back:active { background: rgba(255,255,255,0.28); }
  .ps__title {
    font-family: var(--font-brush);
    font-size: 1.2rem;
    color: #FFF8E1;
    flex: 1;
  }
  .ps__count {
    font-size: var(--text-sm);
    color: rgba(255,248,225,0.8);
    font-weight: 700;
    flex-shrink: 0;
  }
  .ps__tabs {
    display: flex;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 0 16px;
    gap: 0;
    flex-shrink: 0;
  }
  .ps__tab {
    flex: 1;
    padding: 12px 8px;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--ink-light);
    border-bottom: 2.5px solid transparent;
    transition: color 0.15s, border-color 0.15s;
    text-align: center;
  }
  .ps__tab--active {
    color: #C62828;
    border-bottom-color: #C62828;
  }
  .ps__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 14px 16px 0;
  }
  @media (max-width: 340px) {
    .ps__grid { grid-template-columns: 1fr; }
  }
  .ps__card {
    position: relative;
    background: var(--surface);
    border-radius: 14px;
    padding: 14px 12px 14px 12px;
    border: 1.5px solid var(--border);
    border-left: 4px solid #C62828;
    box-shadow: var(--shadow-card);
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s;
    overflow: hidden;
    min-height: 110px;
  }
  .ps__card-img {
    position: absolute;
    top: 0; right: 0;
    width: 60%;
    height: 100%;
    background-size: cover;
    background-position: center right;
    mask-image: linear-gradient(to right, transparent 0%, rgba(255,255,255,0.6) 40%, rgba(255,255,255,0.85) 100%);
    -webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(255,255,255,0.6) 40%, rgba(255,255,255,0.85) 100%);
    pointer-events: none;
  }
  .ps__card:active { transform: scale(0.97); box-shadow: none; }
  .ps__card--done {
    border-left-color: #10B981;
    background: #f8fffe;
  }
  .ps__card-badge {
    position: absolute;
    top: 8px; right: 8px;
    font-size: 11px;
    font-weight: 700;
    color: #10B981;
    background: rgba(16,185,129,0.1);
    border-radius: 999px;
    padding: 1px 6px;
  }
  .ps__card-title {
    font-family: var(--font-brush);
    font-size: 1rem;
    color: var(--ink);
    margin-bottom: 3px;
    line-height: 1.3;
  }
  .ps__card-meta {
    font-size: 11px;
    color: var(--ink-light);
    margin-bottom: 6px;
  }
  .ps__card-line {
    font-size: 11px;
    color: var(--ink-light);
    line-height: 1.4;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .ps__card-stars {
    margin-top: 6px;
    font-size: 11px;
    color: #F59E0B;
    letter-spacing: 1px;
  }
`
