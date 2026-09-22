import { useState, useCallback } from 'react'

export interface PoemState {
  read: boolean
  memorized: boolean
  bestStars: number
}

type Progress = Record<string, PoemState>

export interface StreakData {
  lastDate: string
  count: number
}

const STORAGE_KEY = 'poem_progress'
const STREAK_KEY = 'poem_streak'

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveProgress(p: Progress) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch { /* ignore */ }
}

function loadStreak(): StreakData {
  try {
    const raw = localStorage.getItem(STREAK_KEY)
    return raw ? JSON.parse(raw) : { lastDate: '', count: 0 }
  } catch {
    return { lastDate: '', count: 0 }
  }
}

function saveStreak(s: StreakData) {
  try { localStorage.setItem(STREAK_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [streak, setStreak] = useState<StreakData>(loadStreak)

  const getState = useCallback((id: number): PoemState => {
    return progress[String(id)] ?? { read: false, memorized: false, bestStars: 0 }
  }, [progress])

  const markRead = useCallback((id: number) => {
    setProgress(prev => {
      const key = String(id)
      const existing = prev[key] ?? { read: false, memorized: false, bestStars: 0 }
      if (existing.read) return prev
      const next = { ...prev, [key]: { ...existing, read: true } }
      saveProgress(next)
      return next
    })
  }, [])

  const markMemorized = useCallback((id: number, stars = 0) => {
    setProgress(prev => {
      const key = String(id)
      const existing = prev[key] ?? { read: false, memorized: false, bestStars: 0 }
      const next = {
        ...prev,
        [key]: {
          ...existing,
          read: true,
          memorized: true,
          bestStars: Math.max(existing.bestStars ?? 0, stars),
        },
      }
      saveProgress(next)
      return next
    })
    // 更新连续学习天数
    const today = todayStr()
    const current = loadStreak()
    if (current.lastDate !== today) {
      const prevDay = new Date()
      prevDay.setDate(prevDay.getDate() - 1)
      const prevStr = prevDay.toISOString().slice(0, 10)
      const newStreak: StreakData = {
        lastDate: today,
        count: current.lastDate === prevStr ? current.count + 1 : 1,
      }
      saveStreak(newStreak)
      setStreak(newStreak)
    }
  }, [])

  const totalMemorized = Object.values(progress).filter(s => s.memorized).length
  const totalPerfect = Object.values(progress).filter(s => s.bestStars === 3).length

  return { getState, markRead, markMemorized, totalMemorized, totalPerfect, streak, progress }
}
