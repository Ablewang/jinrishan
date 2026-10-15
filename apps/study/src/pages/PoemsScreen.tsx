import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadPoemIndex } from '../data/poems'
import type { PoemSummary } from '../data/poems'
import { useProgress } from '../hooks/useProgress'
import PoemCard from '../components/PoemCard'
import type { MasteryLevel } from '../types/poem'

type Tab = 'all' | 'pending' | 'learning' | 'mastered'


export default function PoemsScreen() {
  const navigate = useNavigate()
  const { getState, reviewCards, totalMemorized } = useProgress()
  const [poems, setPoems] = useState<PoemSummary[]>([])
  const [tab, setTab] = useState<Tab>('all')

  useEffect(() => { loadPoemIndex().then(setPoems) }, [])

  function getMastery(id: number): MasteryLevel {
    const state = getState(id)
    const card = reviewCards.find(c => c.id === id)
    if (!state.read && !state.memorized) return 'unlearned'
    if (!state.memorized || !card) return 'pending'
    if (card.level >= 5) return 'mastered'
    return 'learning'
  }

  const list = useMemo(() => {
    if (tab === 'pending')  return poems.filter(p => getMastery(p.id) === 'pending')
    if (tab === 'learning') return poems.filter(p => getMastery(p.id) === 'learning')
    if (tab === 'mastered') return poems.filter(p => getMastery(p.id) === 'mastered')
    return poems
  }, [poems, tab, reviewCards])

  const total = poems.length

  return (
    <div className="ps">
      <header className="ps__header">
        <button className="ps__back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 1024 1024" width="18" height="18" fill="currentColor">
            <path d="M403.2 812.8L100.256 512 403.2 211.2l59.744 59.744-198.4 198.4h652.8v85.344h-652.8l198.4 198.4z"/>
          </svg>
          返回
        </button>
        <h1 className="ps__title">诗集</h1>
        <span className="ps__count">{totalMemorized}/{total}</span>
      </header>

      <div className="ps__tabs">
        {([
          ['all',      '全部'],
          ['pending',  '待背诵'],
          ['learning', '背诵中'],
          ['mastered', '已掌握'],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            className={`ps__tab${tab === t ? ' ps__tab--active' : ''}`}
            onClick={() => setTab(t)}
          >{label}</button>
        ))}
      </div>

      <div className="ps__grid">
        {list.map(p => {
          const mastery = getMastery(p.id)
          const state = getState(p.id)
          return (
            <PoemCard
              key={p.id}
              poem={p}
              isRead={state.read}
              isMemorized={state.memorized}
              bestStars={state.bestStars}
              colorIndex={0}
              mastery={mastery}
            />
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
    top: env(safe-area-inset-top, 0px);
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 16px;
    height: var(--navbar-height);
    background: #C62828;
  }
  .ps__back {
    color: #FFF8E1;
    font-size: var(--text-sm);
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(255,255,255,0.15);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 4px;
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
    padding: 12px 4px;
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
`
