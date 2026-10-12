import { useState, useCallback, useMemo } from 'react'

export interface PoemState {
  read: boolean
  memorized: boolean
  bestStars: number
  noHintPass?: boolean
}

type Progress = Record<string, PoemState>

export interface StreakData {
  lastDate: string
  count: number
}

export interface ReviewCard {
  id: number
  level: number     // 0=刚背完, 1-4=复习中, 5=已掌握
  due: string       // 'YYYY-MM-DD'
  lastDate: string
  passCount: number
}

const STORAGE_KEY = 'poem_progress'
const STREAK_KEY = 'poem_streak'
const CHARS_KEY = 'poem_total_chars'
const HISTORY_KEY = 'poem_memorize_history'
const REVIEW_KEY = 'poem_review_cards'

// INTERVALS[level] = 通过 level 档后距下次复习的天数
const INTERVALS = [1, 3, 7, 15, 30]

function addDays(base: string, days: number): string {
  const d = new Date(base + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

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

function loadTotalChars(): number {
  try { return Number(localStorage.getItem(CHARS_KEY) ?? 0) } catch { return 0 }
}

function saveTotalChars(n: number) {
  try { localStorage.setItem(CHARS_KEY, String(n)) } catch { /* ignore */ }
}

// 最近背诵历史，每项 {id, stars}，最多保留 20 条
export interface MemorizeRecord { id: number; stars: number; date: string }

function loadHistory(): MemorizeRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(h: MemorizeRecord[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)) } catch { /* ignore */ }
}

function loadReviewCards(): ReviewCard[] {
  try {
    const raw = localStorage.getItem(REVIEW_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveReviewCards(cards: ReviewCard[]) {
  try { localStorage.setItem(REVIEW_KEY, JSON.stringify(cards)) } catch { /* ignore */ }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [streak, setStreak] = useState<StreakData>(loadStreak)
  const [totalChars, setTotalChars] = useState<number>(loadTotalChars)
  const [memorizeHistory, setMemorizeHistory] = useState<MemorizeRecord[]>(loadHistory)
  const [reviewCards, setReviewCards] = useState<ReviewCard[]>(loadReviewCards)

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

  const markMemorized = useCallback((id: number, stars = 0, charCount = 0, noHintPass = false) => {
    const today = todayStr()

    setProgress(prev => {
      const key = String(id)
      const existing = prev[key] ?? { read: false, memorized: false, bestStars: 0 }
      const isFirstTime = !existing.memorized
      const next = {
        ...prev,
        [key]: {
          ...existing,
          read: true,
          memorized: true,
          bestStars: Math.max(existing.bestStars ?? 0, stars),
          noHintPass: existing.noHintPass || noHintPass,
        },
      }
      saveProgress(next)

      if (isFirstTime && charCount > 0) {
        const newTotal = loadTotalChars() + charCount
        saveTotalChars(newTotal)
        setTotalChars(newTotal)
      }
      return next
    })

    // 新建或更新 ReviewCard（首次背诵 → 档位0，due = 明天）
    setReviewCards(prev => {
      const existing = prev.find(c => c.id === id)
      // 已掌握的诗再次背诵不重置档位
      if (existing && existing.level === 5) {
        const updated = prev.map(c => c.id === id ? { ...c, lastDate: today } : c)
        saveReviewCards(updated)
        return updated
      }
      if (existing) return prev // 复习中不重建
      const newCard: ReviewCard = { id, level: 0, due: addDays(today, 1), lastDate: today, passCount: 0 }
      const updated = [...prev, newCard]
      saveReviewCards(updated)
      return updated
    })

    setMemorizeHistory(prev => {
      const next = [...prev.filter(r => r.id !== id), { id, stars, date: today }].slice(-20)
      saveHistory(next)
      return next
    })

    const current = loadStreak()
    if (current.lastDate !== today) {
      const prevDay = new Date(today + 'T00:00:00')
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

  // passed=true → 档位+1；passed=false → 退回档位0
  const markReviewed = useCallback((id: number, passed: boolean) => {
    const today = todayStr()
    setReviewCards(prev => {
      const idx = prev.findIndex(c => c.id === id)
      if (idx === -1) return prev
      const card = prev[idx]
      let newLevel: number
      let newDue: string
      if (passed) {
        newLevel = Math.min(card.level + 1, 5)
        newDue = newLevel < 5 ? addDays(today, INTERVALS[newLevel - 1]) : addDays(today, 365)
      } else {
        newLevel = Math.max(0, card.level - 1)
        newDue = addDays(today, 1)
      }
      const updated = prev.map((c, i) => i === idx
        ? { ...c, level: newLevel, due: newDue, lastDate: today, passCount: passed ? c.passCount + 1 : c.passCount }
        : c
      )
      saveReviewCards(updated)
      return updated
    })
  }, [])

  // 今日到期复习，全量返回（due <= today，level < 5）
  const todayDueReviews = useMemo(() => {
    const today = todayStr()
    return reviewCards
      .filter(c => c.level < 5 && c.due <= today)
  }, [reviewCards])

  const masteredCount = useMemo(() => reviewCards.filter(c => c.level === 5).length, [reviewCards])

  const reviewingCount = useMemo(() => reviewCards.filter(c => c.level > 0 && c.level < 5).length, [reviewCards])

  const totalMemorized = Object.values(progress).filter(s => s.memorized).length
  const totalPerfect = Object.values(progress).filter(s => s.bestStars === 3).length
  const todayRecord = [...memorizeHistory].reverse().find(r => r.date === todayStr()) ?? null

  return {
    getState, markRead, markMemorized, markReviewed,
    totalMemorized, totalPerfect, streak, progress, totalChars, memorizeHistory, todayRecord,
    reviewCards, todayDueReviews, masteredCount, reviewingCount,
  }
}

