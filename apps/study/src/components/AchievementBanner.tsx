import { useState, useEffect, useRef } from 'react'
import { useProgress } from '../hooks/useProgress'
import { useAchievements } from '../hooks/useAchievements'
import { storage } from '../lib/storage'
import type { Badge } from '../hooks/useAchievements'
import './AchievementBanner.css'

const SHOWN_KEY = 'poem_achievement_shown'

async function loadShownIds(): Promise<Set<string>> {
  try {
    const raw = await storage.get(SHOWN_KEY)
    const arr: string[] = raw ? JSON.parse(raw) : []
    return new Set(arr)
  } catch { return new Set() }
}

async function saveShownIds(s: Set<string>) {
  try { await storage.set(SHOWN_KEY, JSON.stringify([...s])) } catch { /* ignore */ }
}

export default function AchievementBanner() {
  const { progress, streak, totalChars, memorizeHistory } = useProgress()
  const badges = useAchievements({ progress, streak, totalChars, memorizeHistory })
  const shownRef = useRef<Set<string>>(new Set())
  const [ready, setReady] = useState(false)
  const [queue, setQueue] = useState<Badge[]>([])
  const [current, setCurrent] = useState<Badge | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadShownIds().then(ids => {
      shownRef.current = ids
      setReady(true)
    })
  }, [])

  // 检测新解锁（与 shown 记录对比）
  useEffect(() => {
    if (!ready) return
    const newOnes = badges.filter(b => b.unlocked && !shownRef.current.has(b.id))
    if (newOnes.length > 0) {
      newOnes.forEach(b => shownRef.current.add(b.id))
      saveShownIds(shownRef.current)
      setQueue(prev => [...prev, ...newOnes])
    }
  }, [badges, ready])

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
    </div>
  )
}
