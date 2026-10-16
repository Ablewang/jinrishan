import { useNavigate } from 'react-router-dom'
import { useProgress } from '../hooks/useProgress'
import { useAchievements } from '../hooks/useAchievements'
import { useQueue } from '../hooks/useQueue'
import { getLevelTitle } from '../utils/levelTitle'
import './AchievementsPage.css'

const TOTAL = 70

export default function AchievementsPage() {
  const navigate = useNavigate()
  const { progress, streak, totalChars, memorizeHistory, totalMemorized } = useProgress()
  const { streakCount } = useQueue()
  const badges = useAchievements({ progress, streak, totalChars, memorizeHistory })
  const unlockedCount = badges.filter(b => b.unlocked).length
  const title = getLevelTitle(totalMemorized)

  function formatDate(iso: string): string {
    const d = new Date(iso)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <div className="ap">
      <header className="ap__navbar">
        <button className="ap__back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 1024 1024" width="18" height="18" fill="currentColor"><path d="M403.2 812.8L100.256 512 403.2 211.2l59.744 59.744-198.4 198.4h652.8v85.344h-652.8l198.4 198.4z"/></svg>
          返回
        </button>
        <span className="ap__navbar-title">成就</span>
        <span className="ap__navbar-count">{unlockedCount} / {badges.length}</span>
      </header>

      {/* 称号卡片 */}
      <div className="ap__level-card">
        <div className="ap__level-title">{title}</div>
        <div className="ap__level-sub">{totalMemorized} / {TOTAL} 首 · 连续 {streakCount} 天</div>
        <div className="ap__level-bar-wrap">
          <div className="ap__level-bar">
            <div className="ap__level-bar-fill" style={{ width: `${Math.min(100, Math.round(totalMemorized / TOTAL * 100))}%` }} />
          </div>
        </div>
      </div>

      {/* 勋章网格 */}
      <div className="ap__section-label">成就勋章</div>
      <div className="ap__grid">
        {badges.map(b => (
          <div key={b.id} className={`ap__badge${b.unlocked ? ' ap__badge--on' : ''}`}>
            <div className="ap__badge-icon">{b.icon}</div>
            <div className="ap__badge-name">{b.label}</div>
            <div className="ap__badge-desc">{b.desc}</div>
            {b.unlocked && b.unlockedAt && (
              <div className="ap__badge-date">{formatDate(b.unlockedAt)}</div>
            )}
            {!b.unlocked && b.progress && (
              <div className="ap__badge-progress">{b.progress}</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}

