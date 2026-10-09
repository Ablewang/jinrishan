import { useNavigate } from 'react-router-dom'
import { useProgress } from '../hooks/useProgress'
import { useQueue } from '../hooks/useQueue'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { totalMemorized } = useProgress()
  const { streakCount, queue } = useQueue()

  return (
    <div className="profile">
      <header className="profile__navbar">
        <span className="profile__title">我的</span>
      </header>

      <div className="profile__body">
        <div className="profile__stats-row">
          <div className="profile__stat">
            <div className="profile__stat-num">{totalMemorized}</div>
            <div className="profile__stat-label">已背诵</div>
          </div>
          <div className="profile__stat-divider" />
          <div className="profile__stat">
            <div className="profile__stat-num">{streakCount}</div>
            <div className="profile__stat-label">坚持天数</div>
          </div>
          <div className="profile__stat-divider" />
          <div className="profile__stat">
            <div className="profile__stat-num">{queue.length}</div>
            <div className="profile__stat-label">队列中</div>
          </div>
        </div>

        <div className="profile__section-label">学习工具</div>
        <div className="profile__menu">
          <button className="profile__menu-item" onClick={() => navigate('/progress')}>
            <span>学习进度</span>
            <span className="profile__menu-arrow">→</span>
          </button>
          <button className="profile__menu-item" onClick={() => navigate('/achievements')}>
            <span>我的成就</span>
            <span className="profile__menu-arrow">→</span>
          </button>
          <button className="profile__menu-item" onClick={() => navigate('/queue')}>
            <span>管理队列</span>
            <span className="profile__menu-arrow">→</span>
          </button>
        </div>
      </div>

      <style>{`
        .profile {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: var(--bg);
          padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
        }
        .profile__navbar {
          position: sticky;
          top: env(safe-area-inset-top, 0px);
          z-index: 20;
          display: flex;
          align-items: center;
          padding: 0 18px;
          height: var(--navbar-height);
          background: #C62828;
        }
        .profile__title {
          font-family: var(--font-brush);
          font-size: 1.4rem;
          color: #FFF8E1;
        }
        .profile__body {
          padding: 16px 16px 0;
        }
        .profile__stats-row {
          display: flex;
          align-items: center;
          background: var(--surface);
          border-radius: 16px;
          padding: 20px 0;
          box-shadow: var(--shadow-card);
          border: 1.5px solid var(--border);
          margin-bottom: 20px;
        }
        .profile__stat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .profile__stat-num {
          font-size: 1.8rem;
          font-weight: 700;
          color: #C62828;
          font-variant-numeric: tabular-nums;
        }
        .profile__stat-label {
          font-size: 11px;
          color: var(--ink-light);
        }
        .profile__stat-divider {
          width: 1px;
          height: 36px;
          background: var(--border);
          flex-shrink: 0;
        }
        .profile__section-label {
          font-size: var(--text-sm);
          font-weight: 700;
          color: var(--ink-light);
          margin-bottom: 10px;
        }
        .profile__menu {
          background: var(--surface);
          border-radius: 14px;
          border: 1.5px solid var(--border);
          overflow: hidden;
          box-shadow: var(--shadow-card);
        }
        .profile__menu-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 16px;
          font-size: var(--text-base);
          color: var(--ink);
          border-bottom: 1px solid var(--border);
          text-align: left;
        }
        .profile__menu-item:last-child { border-bottom: none; }
        .profile__menu-item:active { background: var(--bg); }
        .profile__menu-arrow {
          color: var(--ink-light);
          font-size: var(--text-sm);
        }
      `}</style>
    </div>
  )
}
