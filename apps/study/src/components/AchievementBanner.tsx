import { useState, useEffect, useRef } from 'react'
import { useProgress } from '../hooks/useProgress'
import { useAchievements } from '../hooks/useAchievements'
import type { Badge } from '../hooks/useAchievements'

const SHOWN_KEY = 'poem_achievement_shown'

function loadShownIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SHOWN_KEY)
    const arr: string[] = raw ? JSON.parse(raw) : []
    return new Set(arr)
  } catch { return new Set() }
}

function saveShownIds(s: Set<string>) {
  try { localStorage.setItem(SHOWN_KEY, JSON.stringify([...s])) } catch { /* ignore */ }
}

export default function AchievementBanner() {
  const { progress, streak, totalChars, memorizeHistory } = useProgress()
  const badges = useAchievements({ progress, streak, totalChars, memorizeHistory })
  const shownRef = useRef<Set<string>>(loadShownIds())
  const [queue, setQueue] = useState<Badge[]>([])
  const [current, setCurrent] = useState<Badge | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 检测新解锁（与 shown 记录对比）
  useEffect(() => {
    const newOnes = badges.filter(b => b.unlocked && !shownRef.current.has(b.id))
    if (newOnes.length > 0) {
      newOnes.forEach(b => shownRef.current.add(b.id))
      saveShownIds(shownRef.current)
      setQueue(prev => [...prev, ...newOnes])
    }
  }, [badges])

  // 队列消费：逐个弹出，每个 2.4s 后消失
  useEffect(() => {
    if (current) return
    if (queue.length === 0) return
    const [next, ...rest] = queue
    setCurrent(next)
    setQueue(rest)
    timerRef.current = setTimeout(() => setCurrent(null), 2400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [queue, current])

  if (!current) return null

  return (
    <div className="ach-banner" role="status" aria-live="polite">
      <div className="ach-banner__icon">{current.icon}</div>
      <div className="ach-banner__body">
        <div className="ach-banner__label">{current.label}</div>
        <div className="ach-banner__desc">成就解锁！</div>
      </div>
      <button className="ach-banner__close" onClick={() => { setCurrent(null); if (timerRef.current) clearTimeout(timerRef.current) }}>×</button>
      <style>{`
        .ach-banner {
          position: fixed;
          top: calc(env(safe-area-inset-top, 0px) + 12px);
          left: 50%; transform: translateX(-50%);
          z-index: 9999;
          background: #fff;
          border-radius: 16px;
          padding: 12px 16px 12px 14px;
          display: flex; align-items: center; gap: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(198,40,40,0.12);
          border: 1.5px solid rgba(198,40,40,0.15);
          min-width: 240px; max-width: calc(100vw - 32px);
          animation: achBannerIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes achBannerIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-24px) scale(0.9); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        .ach-banner__icon {
          width: 44px; height: 44px; border-radius: 50%;
          background: rgba(198,40,40,0.1);
          border: 2px solid rgba(198,40,40,0.25);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-brush); font-size: 1.1rem;
          color: #C62828; flex-shrink: 0;
        }
        .ach-banner__body { flex: 1; min-width: 0; }
        .ach-banner__label { font-family: var(--font-brush); font-size: 1rem; color: #C62828; }
        .ach-banner__desc { font-family: var(--font-ui); font-size: 0.7rem; color: var(--ink-light); margin-top: 2px; }
        .ach-banner__close { font-size: 1.2rem; color: var(--ink-light); padding: 4px 6px; background: transparent; flex-shrink: 0; }
      `}</style>
    </div>
  )
}
