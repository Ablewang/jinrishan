import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadPoemIndex } from '../data/poems'
import type { PoemSummary } from '../data/poems'
import { useProgress } from '../hooks/useProgress'
import PoemCard from '../components/PoemCard'
import type { MasteryLevel } from '../types/poem'
import './PoemsScreen.css'

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

    </div>
  )
}

