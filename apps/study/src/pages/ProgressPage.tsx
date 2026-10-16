import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgress } from '../hooks/useProgress'
import { useAchievements } from '../hooks/useAchievements'
import { loadPoemIndex } from '../data/poems'
import type { PoemSummary } from '../data/poems'
import HeatmapChart from '../components/HeatmapChart'
import HardRanking from '../components/HardRanking'
import TimeSlotChart from '../components/TimeSlotChart'
import './ProgressPage.css'
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

      {/* M1 学习热力图 */}
      <div className="pg__section">
        <div className="pg__section-header">
          <span className="pg__section-title">学习热力图</span>
          <span className="pg__section-count">近12周</span>
        </div>
        <HeatmapChart />
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

      {/* M4 难诗排行 + M5 最佳时段 */}
      <div className="pg__two-col">
        <div className="pg__section pg__section--half">
          <div className="pg__section-header">
            <span className="pg__section-title">难诗排行</span>
            <span className="pg__section-count">Top 5</span>
          </div>
          <HardRanking poems={poems} />
        </div>
        <div className="pg__section pg__section--half">
          <div className="pg__section-header">
            <span className="pg__section-title">最佳时段</span>
          </div>
          <TimeSlotChart />
        </div>
      </div>

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

    </div>
  )
}

