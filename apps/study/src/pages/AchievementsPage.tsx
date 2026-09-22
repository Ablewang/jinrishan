import { useNavigate } from 'react-router-dom'
import { useProgress } from '../hooks/useProgress'
import { useAchievements } from '../hooks/useAchievements'

export default function AchievementsPage() {
  const navigate = useNavigate()
  const { progress, streak, totalChars, memorizeHistory } = useProgress()
  const badges = useAchievements({ progress, streak, totalChars, memorizeHistory })
  const unlockedCount = badges.filter(b => b.unlocked).length

  function formatDate(iso: string): string {
    const d = new Date(iso)
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  }

  return (
    <div className="ap">
      <header className="ap__navbar">
        <button className="ap__back" onClick={() => navigate(-1)}>← 返回</button>
        <span className="ap__title">成就</span>
        <span className="ap__count">{unlockedCount} / {badges.length}</span>
      </header>

      <div className="ap__list">
        {badges.map(b => (
          <div key={b.id} className={`ap__item${b.unlocked ? ' ap__item--on' : ''}`}>
            <div className="ap__icon">{b.icon}</div>
            <div className="ap__info">
              <span className="ap__label">{b.label}</span>
              <span className="ap__desc">{b.desc}</span>
              {b.unlocked && b.unlockedAt && (
                <span className="ap__date">达成于 {formatDate(b.unlockedAt)}</span>
              )}
            </div>
            <div className="ap__status">
              {b.unlocked ? (
                <span className="ap__done">已达成</span>
              ) : (
                <span className="ap__locked">未达成</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 32 }} />
      <style>{style}</style>
    </div>
  )
}

const style = `
  .ap {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: var(--bg);
  }
  .ap__navbar {
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
  .ap__back {
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: #FFF8E1;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(255,255,255,0.15);
  }
  .ap__back:active { background: rgba(255,255,255,0.28); }
  .ap__title {
    font-family: var(--font-brush);
    font-size: 1.2rem;
    color: #FFF8E1;
    flex: 1;
  }
  .ap__count {
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: rgba(255,248,225,0.8);
  }
  .ap__list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px 16px 0;
  }
  .ap__item {
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--surface);
    border-radius: 14px;
    padding: 16px;
    border: 1.5px solid var(--border);
    box-shadow: var(--shadow-card);
    opacity: 0.5;
    transition: opacity 0.2s;
  }
  .ap__item--on {
    opacity: 1;
    border-color: rgba(198,40,40,0.2);
  }
  .ap__icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-brush);
    font-size: 1.2rem;
    font-weight: 700;
    flex-shrink: 0;
    background: #f0f0f0;
    color: #ccc;
  }
  .ap__item--on .ap__icon {
    background: rgba(198,40,40,0.1);
    color: #C62828;
    border: 2px solid rgba(198,40,40,0.25);
  }
  .ap__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .ap__label {
    font-family: var(--font-brush);
    font-size: 1rem;
    color: var(--ink);
  }
  .ap__desc {
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    color: var(--ink-light);
    line-height: 1.4;
  }
  .ap__date {
    font-family: var(--font-ui);
    font-size: 0.65rem;
    color: #C62828;
    margin-top: 2px;
  }
  .ap__status { flex-shrink: 0; }
  .ap__done {
    font-family: var(--font-ui);
    font-size: 0.65rem;
    font-weight: 700;
    color: #C62828;
    background: rgba(198,40,40,0.08);
    border: 1px solid rgba(198,40,40,0.2);
    border-radius: 999px;
    padding: 3px 10px;
  }
  .ap__locked {
    font-family: var(--font-ui);
    font-size: 0.65rem;
    color: #ccc;
    background: #f5f5f5;
    border: 1px solid #e8e8e8;
    border-radius: 999px;
    padding: 3px 10px;
  }
`
