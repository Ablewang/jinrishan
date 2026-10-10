import { useProgress } from '../hooks/useProgress'
import { useQueue } from '../hooks/useQueue'

interface Props {
  onClose: () => void
}

export default function ProfileSheet({ onClose }: Props) {
  const { totalMemorized, totalChars, masteredCount, reviewingCount, memorizeHistory } = useProgress()
  const { streakCount } = useQueue()

  const masteredPct = totalMemorized > 0 ? Math.round((masteredCount / totalMemorized) * 100) : 0

  const recentPoems = [...memorizeHistory].reverse().slice(0, 5)

  return (
    <div className="ps-overlay">
      <div className="ps-overlay__backdrop" onClick={onClose} />
      <div className="ps-overlay__sheet">
        <div className="ps-overlay__handle" />
        <h2 className="ps-overlay__title">学习概览</h2>
        <p className="ps-overlay__subtitle">孩子的学习进展</p>
        <div className="ps-overlay__divider" />

        {/* 四格统计 */}
        <div className="ps-overlay__stats-row">
          <div className="ps-overlay__stat">
            <div className="ps-overlay__stat-num">{totalMemorized}</div>
            <div className="ps-overlay__stat-label">已背诵</div>
          </div>
          <div className="ps-overlay__stat">
            <div className="ps-overlay__stat-num">{masteredCount}</div>
            <div className="ps-overlay__stat-label">已掌握</div>
          </div>
          <div className="ps-overlay__stat">
            <div className="ps-overlay__stat-num">{streakCount}</div>
            <div className="ps-overlay__stat-label">坚持天数</div>
          </div>
          <div className="ps-overlay__stat">
            <div className="ps-overlay__stat-num">{totalChars}</div>
            <div className="ps-overlay__stat-label">累计字数</div>
          </div>
        </div>

        {/* 掌握进度条 */}
        {totalMemorized > 0 && (
          <div className="ps-overlay__progress-box">
            <div className="ps-overlay__progress-header">
              <span className="ps-overlay__progress-label">掌握进度</span>
              <span className="ps-overlay__progress-pct">{masteredCount}/{totalMemorized} 首 ({masteredPct}%)</span>
            </div>
            <div className="ps-overlay__progress-track">
              <div className="ps-overlay__progress-fill ps-overlay__progress-fill--mastered" style={{ width: `${masteredPct}%` }} />
              {reviewingCount > 0 && (
                <div
                  className="ps-overlay__progress-fill ps-overlay__progress-fill--reviewing"
                  style={{
                    width: `${Math.round((reviewingCount / totalMemorized) * 100)}%`,
                    marginLeft: `${masteredPct}%`,
                    position: 'absolute', top: 0, left: 0,
                  }}
                />
              )}
            </div>
            <div className="ps-overlay__progress-legend">
              <span className="ps-overlay__legend-dot ps-overlay__legend-dot--mastered" />已掌握
              <span className="ps-overlay__legend-dot ps-overlay__legend-dot--reviewing" />复习中
            </div>
          </div>
        )}

        {/* 最近背诵 */}
        {recentPoems.length > 0 && (
          <div className="ps-overlay__recent">
            <div className="ps-overlay__section-label">最近背诵</div>
            {recentPoems.map(r => (
              <div key={r.id} className="ps-overlay__recent-item">
                <span className="ps-overlay__recent-date">{(r.date ?? '').slice(5)}</span>
                <span className="ps-overlay__recent-stars">{'★'.repeat(r.stars)}</span>
              </div>
            ))}
          </div>
        )}

        <button className="ps-overlay__close-btn" onClick={onClose}>关闭</button>
      </div>

      <style>{`
        .ps-overlay {
          position: fixed; inset: 0; z-index: 500;
          display: flex; flex-direction: column; justify-content: flex-end;
        }
        .ps-overlay__backdrop {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.35);
          animation: psBackdropIn 0.28s ease both;
        }
        @keyframes psBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .ps-overlay__sheet {
          position: relative; z-index: 1;
          background: #fff;
          border-radius: 24px 24px 0 0;
          padding: 12px 20px calc(24px + env(safe-area-inset-bottom, 0px));
          max-width: 480px; width: 100%; margin: 0 auto;
          will-change: transform;
          animation: psSlideUp 0.32s cubic-bezier(0.32,0.72,0,1) both;
        }
        @keyframes psSlideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .ps-overlay__handle {
          width: 40px; height: 4px; border-radius: 999px;
          background: #e0d8d0; margin: 0 auto 16px;
        }
        .ps-overlay__title {
          font-family: var(--font-brush); font-size: 1.4rem;
          color: var(--ink); text-align: center; margin-bottom: 4px;
        }
        .ps-overlay__subtitle {
          font-size: var(--text-sm); color: var(--ink-light);
          text-align: center; margin-bottom: 16px;
        }
        .ps-overlay__divider {
          height: 1px; background: var(--border); margin-bottom: 20px;
        }
        .ps-overlay__section-label {
          font-size: var(--text-sm); font-weight: 700;
          color: var(--ink); margin-bottom: 10px;
        }
        .ps-overlay__stats-row {
          display: flex; gap: 10px; margin-bottom: 16px;
        }
        .ps-overlay__stat {
          flex: 1; background: rgba(198,40,40,0.06);
          border-radius: 12px; padding: 14px 8px; text-align: center;
        }
        .ps-overlay__stat-num {
          font-family: var(--font-brush); font-size: 1.6rem;
          color: #C62828; line-height: 1; margin-bottom: 6px;
          font-variant-numeric: tabular-nums;
        }
        .ps-overlay__stat-label { font-size: 11px; color: var(--ink-light); }
        .ps-overlay__progress-box {
          background: #fff5f5; border-radius: 12px;
          padding: 14px 16px; margin-bottom: 16px;
        }
        .ps-overlay__progress-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 8px;
        }
        .ps-overlay__progress-label {
          font-size: var(--text-sm); font-weight: 700; color: var(--ink);
        }
        .ps-overlay__progress-pct { font-size: 11px; color: var(--ink-light); }
        .ps-overlay__progress-track {
          height: 10px; background: #f0e8e0; border-radius: 999px;
          overflow: hidden; position: relative; margin-bottom: 8px;
        }
        .ps-overlay__progress-fill {
          height: 100%; border-radius: 999px;
          transition: width 0.4s ease;
        }
        .ps-overlay__progress-fill--mastered { background: #10B981; }
        .ps-overlay__progress-fill--reviewing { background: #F59E0B; }
        .ps-overlay__progress-legend {
          display: flex; gap: 12px; align-items: center;
          font-size: 11px; color: var(--ink-light);
        }
        .ps-overlay__legend-dot {
          display: inline-block; width: 8px; height: 8px;
          border-radius: 50%; margin-right: 4px;
        }
        .ps-overlay__legend-dot--mastered { background: #10B981; }
        .ps-overlay__legend-dot--reviewing { background: #F59E0B; }
        .ps-overlay__recent { margin-bottom: 16px; }
        .ps-overlay__recent-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 4px; border-bottom: 1px solid var(--border);
          font-size: var(--text-sm); color: var(--ink);
        }
        .ps-overlay__recent-item:last-child { border-bottom: none; }
        .ps-overlay__recent-date { color: var(--ink-light); font-size: 12px; }
        .ps-overlay__recent-stars { color: #F59E0B; letter-spacing: 1px; }
        .ps-overlay__close-btn {
          display: block; width: 100%; padding: 16px;
          background: #C62828; color: #fff; border-radius: 999px;
          font-size: var(--text-base); font-weight: 700; text-align: center;
          box-shadow: 0 4px 16px rgba(198,40,40,0.3);
          transition: transform 0.1s, opacity 0.1s;
        }
        .ps-overlay__close-btn:active { transform: scale(0.97); opacity: 0.88; }
      `}</style>
    </div>
  )
}
