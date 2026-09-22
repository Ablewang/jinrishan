import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgress } from '../hooks/useProgress'
import { loadPoemIndex } from '../data/poems'
import type { PoemSummary } from '../data/poems'
import Achievements from '../components/Achievements'

type StarFilter = '全部' | '一气呵成' | '需要提示'
const STAR_FILTERS: StarFilter[] = ['全部', '一气呵成', '需要提示']
const TOTAL = 70

export default function ProgressPage() {
  const navigate = useNavigate()
  const { progress, streak, totalChars, memorizeHistory, totalMemorized } = useProgress()
  const [poems, setPoems] = useState<PoemSummary[]>([])
  const [filter, setFilter] = useState<StarFilter>('全部')

  useEffect(() => { loadPoemIndex().then(setPoems) }, [])

  const totalPerfect = Object.values(progress).filter(s => s.bestStars === 3).length

  const memorizedPoems = useMemo(() => {
    return poems
      .filter(p => progress[String(p.id)]?.memorized)
      .map(p => ({ ...p, bestStars: progress[String(p.id)]?.bestStars ?? 0 }))
      .sort((a, b) => b.bestStars - a.bestStars)
  }, [poems, progress])

  const filtered = useMemo(() => {
    if (filter === '全部') return memorizedPoems
    if (filter === '一气呵成') return memorizedPoems.filter(p => p.bestStars === 3)
    if (filter === '需要提示') return memorizedPoems.filter(p => p.bestStars < 3 && p.bestStars > 0)
  }, [memorizedPoems, filter])

  const RESULT_LABEL = (stars: number) => stars === 3 ? '一气呵成' : stars > 0 ? '需要提示' : ''

  return (
    <div className="pg">
      <header className="pg__navbar">
        <button className="pg__back" onClick={() => navigate('/')}>← 返回</button>
        <span className="pg__title">学习记录</span>
      </header>

      {/* 四格统计 */}
      <div className="pg__stats">
        <div className="pg__stat">
          <span className="pg__stat-num">{totalMemorized}</span>
          <span className="pg__stat-label">已背诵</span>
        </div>
        <div className="pg__stat">
          <span className="pg__stat-num">{totalPerfect}</span>
          <span className="pg__stat-label">三星通关</span>
        </div>
        <div className="pg__stat">
          <span className="pg__stat-num">{totalChars}</span>
          <span className="pg__stat-label">累计字数</span>
        </div>
        <div className="pg__stat">
          <span className="pg__stat-num">{streak.count}</span>
          <span className="pg__stat-label">连续天数</span>
        </div>
      </div>

      {/* 进度条 */}
      <div className="pg__bar-wrap">
        <div className="pg__bar-track">
          <div className="pg__bar-fill" style={{ width: `${Math.round(totalMemorized / TOTAL * 100)}%` }} />
        </div>
        <span className="pg__bar-label">{totalMemorized} / {TOTAL} 首</span>
      </div>

      {/* 成就 */}
      <Achievements
        progress={progress}
        streak={streak}
        totalChars={totalChars}
        memorizeHistory={memorizeHistory}
      />

      {/* 已背诗目 */}
      <div className="pg__section">
        <div className="pg__section-header">
          <span className="pg__section-title">已背诗目</span>
          <span className="pg__section-count">{memorizedPoems.length} 首</span>
        </div>

        <div className="pg__filters">
          {STAR_FILTERS.map(f => (
            <button
              key={f}
              className={`pg__filter${filter === f ? ' pg__filter--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="pg__empty">暂无记录</p>
        ) : (
          <div className="pg__list">
            {filtered.map(p => (
              <button
                key={p.id}
                className="pg__item"
                onClick={() => navigate(`/poem/${p.id}`)}
              >
                <div className="pg__item-info">
                  <span className="pg__item-title">{p.title}</span>
                  <span className="pg__item-author">
                    {p.dynasty ? `${p.dynasty}·${p.author}` : p.author}
                  </span>
                </div>
                <span className={`pg__item-stars${p.bestStars === 3 ? ' pg__item-stars--perfect' : ' pg__item-stars--hint'}`}>
                  {RESULT_LABEL(p.bestStars)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 32 }} />

      <style>{style}</style>
    </div>
  )
}

const style = `
  .pg {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: var(--bg);
  }
  .pg__navbar {
    position: sticky;
    top: env(safe-area-inset-top, 0px);
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 16px;
    height: var(--navbar-height);
    background: #C62828;
    flex-shrink: 0;
  }
  .pg__back {
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: #FFF8E1;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(255,255,255,0.15);
  }
  .pg__back:active { background: rgba(255,255,255,0.28); }
  .pg__title {
    font-family: var(--font-brush);
    font-size: 1.2rem;
    color: #FFF8E1;
  }
  .pg__stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin: 14px 16px 0;
    background: var(--surface);
    border-radius: 14px;
    padding: 16px 12px;
    box-shadow: var(--shadow-card);
    border: 1.5px solid var(--border);
  }
  .pg__stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .pg__stat-num {
    font-family: var(--font-ui);
    font-size: 1.4rem;
    font-weight: 700;
    color: #C62828;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .pg__stat-label {
    font-family: var(--font-ui);
    font-size: 0.65rem;
    color: var(--ink-light);
    text-align: center;
  }
  .pg__bar-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 10px 16px 0;
  }
  .pg__bar-track {
    flex: 1;
    height: 8px;
    background: #F5EDE8;
    border-radius: 999px;
    overflow: hidden;
  }
  .pg__bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #E53935, #F59E0B);
    border-radius: 999px;
    transition: width 0.4s ease;
  }
  .pg__bar-label {
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    color: var(--ink-light);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .pg__section {
    margin: 12px 16px 0;
    background: var(--surface);
    border-radius: 14px;
    padding: 14px 16px;
    box-shadow: var(--shadow-card);
    border: 1.5px solid var(--border);
  }
  .pg__section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .pg__section-title {
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--ink-light);
  }
  .pg__section-count {
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    color: #C62828;
    font-weight: 700;
  }
  .pg__filters {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .pg__filters::-webkit-scrollbar { display: none; }
  .pg__filter {
    flex-shrink: 0;
    padding: 5px 14px;
    border-radius: 999px;
    font-size: var(--text-xs);
    font-family: var(--font-ui);
    border: 1.5px solid var(--border);
    background: var(--bg);
    color: var(--ink-light);
    transition: all 0.15s;
  }
  .pg__filter--active {
    background: #C62828;
    border-color: #C62828;
    color: #FFF8E1;
  }
  .pg__empty {
    text-align: center;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: #ccc;
    padding: 24px 0;
  }
  .pg__list {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .pg__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 4px;
    border-bottom: 1px solid var(--border);
    text-align: left;
    background: transparent;
    -webkit-tap-highlight-color: transparent;
  }
  .pg__item:last-child { border-bottom: none; }
  .pg__item:active { background: rgba(0,0,0,0.02); }
  .pg__item-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .pg__item-title {
    font-family: var(--font-brush);
    font-size: 1rem;
    color: var(--ink);
  }
  .pg__item-author {
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    color: var(--ink-light);
  }
  .pg__item-stars {
    font-family: var(--font-ui);
    font-size: 0.65rem;
    flex-shrink: 0;
    margin-left: 12px;
  }
  .pg__item-stars--perfect { color: #C62828; }
  .pg__item-stars--hint { color: #999; }
`
