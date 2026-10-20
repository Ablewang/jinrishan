import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import type { ReactNode } from 'react'
import { storage } from '../lib/storage'

const USE_SYSTEM_A = false

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
  level: number
  due: string
  lastDate: string
  passCount: number
}

export interface MemorizeRecord { id: number; stars: number; date: string }

const STORAGE_KEY = 'poem_progress'
const STREAK_KEY = 'poem_streak'
const CHARS_KEY = 'poem_total_chars'
const HISTORY_KEY = 'poem_memorize_history'
const REVIEW_KEY = 'poem_review_cards'

const INTERVALS = [1, 3, 7, 15, 30]

function addDays(base: string, days: number): string {
  const d = new Date(base + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

async function loadProgress(): Promise<Progress> {
  try { return JSON.parse(await storage.get(STORAGE_KEY) ?? '{}') } catch { return {} }
}
async function saveProgress(p: Progress) { await storage.set(STORAGE_KEY, JSON.stringify(p)) }

async function loadStreak(): Promise<StreakData> {
  try { return JSON.parse(await storage.get(STREAK_KEY) ?? '{"lastDate":"","count":0}') } catch { return { lastDate: '', count: 0 } }
}
async function saveStreak(s: StreakData) { await storage.set(STREAK_KEY, JSON.stringify(s)) }

async function loadTotalChars(): Promise<number> {
  try { return Number(await storage.get(CHARS_KEY) ?? '0') } catch { return 0 }
}
async function saveTotalChars(n: number) { await storage.set(CHARS_KEY, String(n)) }

async function loadHistory(): Promise<MemorizeRecord[]> {
  try { return JSON.parse(await storage.get(HISTORY_KEY) ?? '[]') } catch { return [] }
}
async function saveHistory(h: MemorizeRecord[]) { await storage.set(HISTORY_KEY, JSON.stringify(h)) }

async function loadReviewCards(): Promise<ReviewCard[]> {
  try { return JSON.parse(await storage.get(REVIEW_KEY) ?? '[]') } catch { return [] }
}
async function saveReviewCards(cards: ReviewCard[]) { await storage.set(REVIEW_KEY, JSON.stringify(cards)) }

function todayStr(): string { return new Date().toISOString().slice(0, 10) }

interface ProgressContextValue {
  progress: Progress
  streak: StreakData
  totalChars: number
  memorizeHistory: MemorizeRecord[]
  reviewCards: ReviewCard[]
  initialized: boolean
  getState: (id: number) => PoemState
  markRead: (id: number) => void
  markMemorized: (id: number, stars?: number, charCount?: number, noHintPass?: boolean) => void
  markReviewed: (id: number, passed: boolean) => void
  totalMemorized: number
  totalPerfect: number
  todayDueReviews: ReviewCard[]
  todayDueFromA: ReviewCard[] | null
  masteredCount: number
  reviewingCount: number
  todayRecord: MemorizeRecord | null
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Progress>({})
  const [streak, setStreak] = useState<StreakData>({ lastDate: '', count: 0 })
  const [totalChars, setTotalChars] = useState<number>(0)
  const [memorizeHistory, setMemorizeHistory] = useState<MemorizeRecord[]>([])
  const [reviewCards, setReviewCards] = useState<ReviewCard[]>([])
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    Promise.all([
      loadProgress(),
      loadStreak(),
      loadTotalChars(),
      loadHistory(),
      loadReviewCards(),
    ]).then(([p, s, c, h, r]) => {
      setProgress(p)
      setStreak(s)
      setTotalChars(c)
      setMemorizeHistory(h)
      setReviewCards(r)
      setInitialized(true)
    })
  }, [])

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
        loadTotalChars().then(current => {
          const newTotal = current + charCount
          saveTotalChars(newTotal)
          setTotalChars(newTotal)
        })
      }
      return next
    })

    setReviewCards(prev => {
      const existing = prev.find(c => c.id === id)
      if (existing && existing.level === 5) {
        const updated = prev.map(c => c.id === id ? { ...c, lastDate: today } : c)
        saveReviewCards(updated)
        return updated
      }
      if (existing) return prev
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

    loadStreak().then(current => {
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
    })
  }, [])

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

  const todayDueReviews = useMemo(() => {
    const today = todayStr()
    return reviewCards.filter(c => c.level < 5 && c.due <= today)
  }, [reviewCards])

  const todayDueFromA = useMemo(() => {
    if (!USE_SYSTEM_A) return null
    return null as unknown as ReviewCard[]
  }, [])

  const masteredCount = useMemo(() => reviewCards.filter(c => c.level === 5).length, [reviewCards])
  const reviewingCount = useMemo(() => reviewCards.filter(c => c.level > 0 && c.level < 5).length, [reviewCards])
  const totalMemorized = Object.values(progress).filter(s => s.memorized).length
  const totalPerfect = Object.values(progress).filter(s => s.bestStars === 3).length
  const todayRecord = [...memorizeHistory].reverse().find(r => r.date === todayStr()) ?? null

  const value: ProgressContextValue = {
    progress, streak, totalChars, memorizeHistory, reviewCards, initialized,
    getState, markRead, markMemorized, markReviewed,
    totalMemorized, totalPerfect, todayDueReviews, todayDueFromA,
    masteredCount, reviewingCount, todayRecord,
  }

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}
