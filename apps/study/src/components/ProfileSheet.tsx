import { useState } from 'react'
import { useProgress } from '../hooks/useProgress'
import { useQueue } from '../hooks/useQueue'

const REMINDER_OPTIONS = [
  { label: '放学后', time: '16:00' },
  { label: '晚饭后', time: '18:30' },
  { label: '睡前',   time: '20:00' },
  { label: '自定义', time: null },
]

const REMINDER_KEY = 'reminder_time'

function loadReminder(): string {
  try { return localStorage.getItem(REMINDER_KEY) ?? '18:30' } catch { return '18:30' }
}
function saveReminder(t: string) {
  try { localStorage.setItem(REMINDER_KEY, t) } catch { /* ignore */ }
}

interface Props {
  onClose: () => void
}

export default function ProfileSheet({ onClose }: Props) {
  const { totalMemorized, totalChars } = useProgress()
  const { streakCount } = useQueue()
  const [selected, setSelected] = useState<string>(loadReminder)

  function selectTime(time: string | null) {
    if (time === null) return
    setSelected(time)
    saveReminder(time)
  }

  return (
    <div className="ps-overlay">
      <div className="ps-overlay__backdrop" onClick={onClose} />
      <div className="ps-overlay__sheet">
        <div className="ps-overlay__handle" />
        <h2 className="ps-overlay__title">家长设置</h2>
        <p className="ps-overlay__subtitle">为孩子定制学习计划</p>
        <div className="ps-overlay__divider" />

        <div className="ps-overlay__section-label">每日提醒时间</div>
        <div className="ps-overlay__chips">
          {REMINDER_OPTIONS.map(opt => (
            <button
              key={opt.label}
              className={`ps-overlay__chip${opt.time !== null && selected === opt.time ? ' ps-overlay__chip--active' : ''}`}
              onClick={() => selectTime(opt.time)}
            >
              {opt.time ? `${opt.label} ${opt.time}` : opt.label}
            </button>
          ))}
        </div>
        <p className="ps-overlay__hint">提示：可在手机日历设置每日提醒，建议由家长操作</p>

        <div className="ps-overlay__stats-box">
          <div className="ps-overlay__stats-title">学习统计</div>
          <div className="ps-overlay__stats-row">
            <div className="ps-overlay__stat">
              <div className="ps-overlay__stat-num">{totalMemorized}</div>
              <div className="ps-overlay__stat-label">已背诵</div>
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
        </div>

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
        }
        .ps-overlay__sheet {
          position: relative; z-index: 1;
          background: #fff;
          border-radius: 24px 24px 0 0;
          padding: 12px 20px calc(24px + env(safe-area-inset-bottom, 0px));
          max-width: 480px; width: 100%; margin: 0 auto;
          animation: psSlideUp 0.28s cubic-bezier(0.32,0.72,0,1) both;
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
          color: var(--ink); margin-bottom: 12px;
        }
        .ps-overlay__chips {
          display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;
        }
        .ps-overlay__chip {
          padding: 9px 18px; border-radius: 999px;
          border: 1.5px solid var(--border);
          font-size: var(--text-sm); color: var(--ink); background: #fff;
          transition: all 0.15s;
        }
        .ps-overlay__chip--active {
          background: #C62828; border-color: #C62828; color: #fff; font-weight: 700;
        }
        .ps-overlay__chip:active:not(.ps-overlay__chip--active) { background: var(--bg); }
        .ps-overlay__hint {
          font-size: 11px; color: var(--ink-light); line-height: 1.5; margin-bottom: 20px;
        }
        .ps-overlay__stats-box {
          background: #fff5f5; border-radius: 14px; padding: 16px; margin-bottom: 20px;
        }
        .ps-overlay__stats-title {
          font-size: var(--text-sm); font-weight: 700; color: var(--ink); margin-bottom: 14px;
        }
        .ps-overlay__stats-row { display: flex; gap: 10px; }
        .ps-overlay__stat {
          flex: 1; background: rgba(198,40,40,0.08);
          border-radius: 12px; padding: 14px 8px; text-align: center;
        }
        .ps-overlay__stat-num {
          font-family: var(--font-brush); font-size: 1.6rem;
          color: #C62828; line-height: 1; margin-bottom: 6px;
          font-variant-numeric: tabular-nums;
        }
        .ps-overlay__stat-label { font-size: 11px; color: var(--ink-light); }
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
