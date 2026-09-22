import { useState, useMemo } from 'react'
import { poems } from '../data/poems'
import { useProgress } from '../hooks/useProgress'
import PoemCard from '../components/PoemCard'

type Filter = '全部' | '唐' | '宋' | '汉乐府' | '元' | '明'
const FILTERS: Filter[] = ['全部', '唐', '宋', '汉乐府', '元', '明']

export default function Home() {
  const [filter, setFilter] = useState<Filter>('全部')
  const { getState, totalMemorized } = useProgress()

  const filtered = useMemo(() => {
    if (filter === '全部') return poems
    if (filter === '汉乐府') return poems.filter(p => p.dynasty === null)
    return poems.filter(p => p.dynasty === filter)
  }, [filter])

  const pct = Math.round((totalMemorized / poems.length) * 100)

  return (
    <div className="home">
      {/* 顶部导航 */}
      <header className="home__navbar">
        <span className="home__logo">古诗小课堂</span>
        <span className="home__subtitle">小学必背70首</span>
      </header>

      {/* 进度区 */}
      <div className="home__progress">
        <div className="home__progress-row">
          <span className="home__progress-label">已背诵</span>
          <span className="home__progress-nums">
            <strong>{totalMemorized}</strong>
            <span className="home__progress-total"> / {poems.length} 首</span>
          </span>
          <span className="home__progress-pct">{pct}%</span>
        </div>
        <div className="home__progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="home__progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* 筛选标签 */}
      <div className="home__filters" role="tablist">
        {FILTERS.map(f => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            className={`home__filter-btn${filter === f ? ' home__filter-btn--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* 诗词网格 */}
      <main className="home__grid">
        {filtered.map(poem => {
          const state = getState(poem.id)
          return (
            <PoemCard
              key={poem.id}
              poem={poem}
              isRead={state.read}
              isMemorized={state.memorized}
              colorIndex={poem.id - 1}
            />
          )
        })}
      </main>

      <style>{`
        .home {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          padding-bottom: 32px;
          background: var(--bg);
        }

        /* 导航栏：中国红 */
        .home__navbar {
          position: sticky;
          top: env(safe-area-inset-top, 0px);
          z-index: 20;
          display: flex;
          align-items: baseline;
          gap: 10px;
          padding: 0 18px;
          height: var(--navbar-height);
          background: #C62828;
        }
        .home__logo {
          font-family: var(--font-brush);
          font-size: 1.5rem;
          color: #FFF8E1;
          letter-spacing: 0.06em;
        }
        .home__subtitle {
          font-family: var(--font-ui);
          font-size: 0.78rem;
          color: rgba(255,248,225,0.7);
          letter-spacing: 0.04em;
        }

        /* 进度区 */
        .home__progress {
          margin: 14px 16px 0;
          background: var(--surface);
          border-radius: 14px;
          padding: 14px 16px;
          box-shadow: var(--shadow-card);
          border: 1.5px solid var(--border);
        }
        .home__progress-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
          margin-bottom: 10px;
        }
        .home__progress-label {
          font-size: var(--text-sm);
          color: var(--ink-light);
        }
        .home__progress-nums {
          font-size: var(--text-sm);
          color: var(--ink);
        }
        .home__progress-nums strong {
          font-size: 1.1rem;
          color: #C62828;
          font-weight: 700;
        }
        .home__progress-total {
          color: var(--ink-light);
        }
        .home__progress-pct {
          margin-left: auto;
          font-size: var(--text-sm);
          font-weight: 700;
          color: #C62828;
          font-variant-numeric: tabular-nums;
        }
        .home__progress-bar {
          height: 8px;
          background: #F5EDE8;
          border-radius: 999px;
          overflow: hidden;
        }
        .home__progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #E53935, #F59E0B);
          border-radius: 999px;
          transition: width 0.4s ease;
          min-width: ${pct > 0 ? '8px' : '0'};
        }

        /* 筛选标签 */
        .home__filters {
          display: flex;
          gap: 8px;
          padding: 14px 16px 4px;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .home__filters::-webkit-scrollbar { display: none; }
        .home__filter-btn {
          flex-shrink: 0;
          padding: 6px 16px;
          border-radius: 999px;
          font-size: var(--text-sm);
          font-family: var(--font-ui);
          border: 1.5px solid var(--border);
          background: var(--surface);
          color: var(--ink-light);
          transition: all 0.15s;
        }
        .home__filter-btn--active {
          background: #C62828;
          border-color: #C62828;
          color: #FFF8E1;
        }
        .home__filter-btn:active:not(.home__filter-btn--active) {
          background: var(--border);
        }

        /* 诗词网格 */
        .home__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          padding: 12px 16px 0;
        }
        @media (max-width: 340px) {
          .home__grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
