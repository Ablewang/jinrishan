import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { goBack } from '../utils/navigation'
import { loadPoemIndex } from '../data/poems'
import type { PoemSummary } from '../data/poems'
import { useProgress } from '../hooks/useProgress'
import PoemCard from '../components/PoemCard'
import PageHeader from '../components/PageHeader'
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
      <PageHeader
        onBack={() => goBack(navigate)}
        title="诗集"
        right={<span className="ps__count">{totalMemorized}/{total}</span>}
      />

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

