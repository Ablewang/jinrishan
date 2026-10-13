import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgress } from '../hooks/useProgress'
import { useAchievements } from '../hooks/useAchievements'
import { loadPoemIndex } from '../data/poems'
import type { PoemSummary } from '../data/poems'
type StarFilter = '全部' | '无提示' | '少量提示' | '多次提示'
const STAR_FILTERS: StarFilter[] = ['全部', '无提示', '少量提示', '多次提示']
const TOTAL = 70

export default function ProgressPage() {
  const navigate = useNavigate()
  const { progress, streak, totalChars, memorizeHistory, totalMemorized, reviewCards, masteredCount, reviewingCount } = useProgress()
  const badges = useAchievements({ progress, streak, totalChars, memorizeHistory })
  const unlockedCount = badges.filter(b => b.unlocked).length
  const [poems, setPoems] = useState<PoemSummary[]>([])
  const [filter, setFilter] = useState<StarFilter>('全部')

  useEffect(() => { loadPoemIndex().then(setPoems) }, [])

  const memorizedPoems = useMemo(() => {
    return poems
      .filter(p => progress[String(p.id)]?.memorized)
      .map(p => ({ ...p, bestStars: progress[String(p.id)]?.bestStars ?? 0 }))
      .sort((a, b) => b.bestStars - a.bestStars)
  }, [poems, progress])

  const filtered = useMemo(() => {
    if (filter === '全部') return memorizedPoems
    if (filter === '无提示') return memorizedPoems.filter(p => p.bestStars === 3)
    if (filter === '少量提示') return memorizedPoems.filter(p => p.bestStars === 2)
    if (filter === '多次提示') return memorizedPoems.filter(p => p.bestStars === 1)
    return memorizedPoems
  }, [memorizedPoems, filter])

  const RESULT_LABEL = (stars: number) => stars === 3 ? '无提示' : stars === 2 ? '少量提示' : stars === 1 ? '多次提示' : ''

  // 今日到期复习
  const today = new Date().toISOString().slice(0, 10)
  const dueToday = reviewCards.filter(c => c.level < 5 && c.due <= today)
  const upcoming = reviewCards
    .filter(c => c.level < 5 && c.due > today)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 5)

  return (
    <div className="pg">
      <header className="pg__navbar">
        <button className="pg__back" onClick={() => navigate('/')}><svg viewBox="0 0 1024 1024" width="18" height="18" fill="currentColor"><path d="M403.2 812.8L100.256 512 403.2 211.2l59.744 59.744-198.4 198.4h652.8v85.344h-652.8l198.4 198.4z"/></svg> 返回</button>
        <span className="pg__title">学习记录</span>
      </header>

      {/* 四格统计 */}
      <div className="pg__stats">
        <div className="pg__stat">
          <span className="pg__stat-num">{totalMemorized}</span>
          <span className="pg__stat-label">已背诵</span>
        </div>
        <div className="pg__stat">
          <span className="pg__stat-num">{masteredCount}</span>
          <span className="pg__stat-label">已掌握</span>
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

      {/* 复习统计 */}
      {reviewCards.length > 0 && (
        <div className="pg__section pg__section--review">
          <div className="pg__section-header">
            <span className="pg__section-title">间隔复习</span>
            <span className="pg__section-count">{reviewingCount} 首复习中</span>
          </div>
          <div className="pg__review-stats">
            <div className="pg__review-stat">
              <span className="pg__review-num">{dueToday.length}</span>
              <span className="pg__review-label">今日到期</span>
            </div>
            <div className="pg__review-stat">
              <span className="pg__review-num">{reviewingCount}</span>
              <span className="pg__review-label">复习中</span>
            </div>
            <div className="pg__review-stat pg__review-stat--mastered">
              <span className="pg__review-num">{masteredCount}</span>
              <span className="pg__review-label">已掌握</span>
            </div>
          </div>

          {/* 今日到期 */}
          {dueToday.length > 0 && (
            <div className="pg__review-list">
              <div className="pg__review-list-title">今日到期</div>
              {dueToday.slice(0, 3).map(rc => {
                const p = poems.find(pm => pm.id === rc.id)
                if (!p) return null
                const INTERVALS = [1, 3, 7, 15, 30]
                const nextDays = INTERVALS[rc.level] ?? 30
                return (
                  <button key={rc.id} className="pg__review-item" onClick={() => navigate(`/poem/${rc.id}?review=1`)}>
                    <div className="pg__rpi-info">
                      <span className="pg__review-item-title">《{p.title}》</span>
                      <span className="pg__review-item-meta">已复习 {rc.level} 次 · 过关后 {nextDays} 天再复习</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* 即将到期 */}
          {upcoming.length > 0 && (
            <div className="pg__review-list">
              <div className="pg__review-list-title">即将到期</div>
              {upcoming.map(rc => {
                const p = poems.find(pm => pm.id === rc.id)
                if (!p) return null
                const diff = Math.round((new Date(rc.due).getTime() - new Date(today).getTime()) / 86400000)
                return (
                  <div key={rc.id} className="pg__review-item pg__review-item--upcoming">
                    <div className="pg__rpi-info">
                      <span className="pg__review-item-title">《{p.title}》</span>
                      <span className="pg__review-item-meta">{diff === 1 ? '明天到期' : `${diff}天后到期`} · 已复习 {rc.level} 次</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 成就 */}
      <div className="pg__ach-row">
        <div className="pg__ach-section">
          <div className="pg__section-header">
            <span className="pg__section-title">成就勋章</span>
            <span className="pg__section-count">{unlockedCount} / {badges.length}</span>
          </div>
          <div className="pg__ach-grid">
            {badges.map(b => (
              <div key={b.id} className={`pg__ach-badge${b.unlocked ? ' pg__ach-badge--on' : ''}`}>
                <span className="pg__ach-icon">{b.icon}</span>
                <span className="pg__ach-label">{b.label}</span>
                {!b.unlocked && b.progress && <span className="pg__ach-prog">{b.progress}</span>}
              </div>
            ))}
          </div>
        </div>
        <button className="pg__ach-link" onClick={() => navigate('/achievements')}>查看全部成就 <svg viewBox="0 0 1024 1024" width="16" height="16" fill="currentColor"><path d="M620.8 812.8l-59.744-59.744 198.4-198.4h-652.8v-85.344h652.8l-198.4-198.4L620.8 211.168l302.944 300.8z"/></svg></button>
      </div>

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
                <span className={`pg__item-stars${p.bestStars === 3 ? ' pg__item-stars--perfect' : p.bestStars === 2 ? ' pg__item-stars--mid' : ' pg__item-stars--low'}`}>
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
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: env(safe-area-inset-top, 0px) 16px 0;
    height: calc(var(--navbar-height) + env(safe-area-inset-top, 0px));
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
  .pg__ach-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .pg__ach-section {
    margin: 12px 16px 0;
    background: var(--surface);
    border-radius: 14px;
    padding: 14px 16px;
    box-shadow: var(--shadow-card);
    border: 1.5px solid var(--border);
  }
  .pg__ach-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .pg__ach-badge {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 10px 4px; border-radius: 10px;
    opacity: 0.45; transition: opacity 0.2s;
  }
  .pg__ach-badge--on { opacity: 1; }
  .pg__ach-icon {
    width: 38px; height: 38px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-brush); font-size: 0.95rem; font-weight: 700;
    background: #f0f0f0; color: #ccc;
  }
  .pg__ach-badge--on .pg__ach-icon {
    background: rgba(198,40,40,0.1); color: #C62828;
    border: 1.5px solid rgba(198,40,40,0.25);
  }
  .pg__ach-label {
    font-family: var(--font-ui); font-size: 0.62rem;
    color: var(--ink-light); text-align: center; line-height: 1.2;
  }
  .pg__ach-prog {
    font-family: var(--font-ui); font-size: 0.58rem;
    color: var(--ink-light); text-align: center; opacity: 0.7;
  }
  .pg__ach-link {
    text-align: right;
    padding: 0 16px;
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    color: #C62828;
    background: transparent;
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
  .pg__item-stars--mid { color: #999; }
  .pg__item-stars--low { color: #bbb; }

  /* ── 复习统计 ── */
  .pg__section--review {
    border-color: rgba(198,40,40,0.2);
  }
  .pg__review-stats {
    display: flex; gap: 10px; margin-bottom: 14px;
  }
  .pg__review-stat {
    flex: 1; background: rgba(198,40,40,0.06);
    border-radius: 12px; padding: 12px 8px; text-align: center;
  }
  .pg__review-stat--mastered { background: rgba(16,185,129,0.08); }
  .pg__review-num {
    display: block; font-size: 1.4rem; font-weight: 700;
    color: #C62828; font-variant-numeric: tabular-nums; line-height: 1;
    margin-bottom: 4px;
  }
  .pg__review-stat--mastered .pg__review-num { color: #10B981; }
  .pg__review-label { font-size: 11px; color: var(--ink-light); }
  /* ── 阶梯连节点 ── */
  .pg__ladder {
    background: var(--bg); border-radius: 10px;
    padding: 10px 12px; margin-bottom: 14px;
  }
  .pg__ladder-title {
    font-size: 11px; font-weight: 700; color: var(--ink-light);
    margin-bottom: 8px; letter-spacing: 0.04em;
  }
  .pg__level-track {
    display: flex; align-items: flex-start; gap: 0;
  }
  .pg__level-node {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    gap: 4px; position: relative;
  }
  .pg__level-node::after {
    content: ''; position: absolute;
    top: 10px; left: 50%; width: 100%; height: 2px;
    background: var(--border); z-index: 0;
  }
  .pg__level-node:last-child::after { display: none; }
  .pg__level-circle {
    width: 22px; height: 22px; border-radius: 50%;
    border: 2px solid var(--border); background: var(--bg);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.6rem; font-weight: 700; z-index: 1; position: relative;
    color: var(--ink-light);
  }
  .pg__level-circle--mastered {
    background: #10B981; border-color: #10B981; color: #fff; font-size: 10px;
  }
  .pg__level-label { font-size: 0.56rem; color: var(--ink-light); text-align: center; }

  /* ── 复习列表 ── */
  .pg__review-list { margin-bottom: 10px; }
  .pg__review-list-title {
    font-size: 11px; font-weight: 700; color: var(--ink-light);
    margin-bottom: 6px; letter-spacing: 0.04em;
  }
  .pg__review-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-bottom: 1px solid var(--border);
    background: var(--surface); border-left: 4px solid #C62828;
    border-radius: 0; text-align: left; width: 100%;
    -webkit-tap-highlight-color: transparent;
  }
  .pg__review-item:first-child { border-radius: 10px 10px 0 0; }
  .pg__review-item:last-child { border-bottom: none; border-radius: 0 0 10px 10px; }
  .pg__review-item:only-child { border-radius: 10px; }
  .pg__review-item:active:not(.pg__review-item--upcoming) { background: rgba(198,40,40,0.04); }
  .pg__review-item--upcoming { border-left-color: var(--border); opacity: 0.7; }
  .pg__rpi-info { flex: 1; min-width: 0; }
  .pg__review-item-title {
    display: block;
    font-family: var(--font-brush); font-size: 0.92rem; color: var(--ink);
  }
  .pg__review-item-meta {
    display: block;
    font-size: 0.65rem; color: var(--ink-light); margin-top: 2px;
  }
  .pg__rpi-dots { display: flex; gap: 3px; flex-shrink: 0; }
  .pg__rpi-dot {
    width: 6px; height: 6px; border-radius: 50%; background: var(--border);
  }
  .pg__rpi-dot--filled { background: #C62828; }
`
