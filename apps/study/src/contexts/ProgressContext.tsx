import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import type { ReactNode } from 'react'
import { storage } from '../lib/storage'
import type { SrsSchedule } from '../types/storage'

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

interface RawSession {
  id: string
  poemId: number
  mode?: string
  date: string
  timestamp: number
  stars: number
  qScore: number
  charCount?: number
  lines: { passed: boolean; hintCount: number }[]
}

const SRS_KEY = 'srs_schedules'
const SESSIONS_KEY = 'recitation_sessions'
// 旧 key，只读兜底
const STORAGE_KEY = 'poem_progress'
const CHARS_KEY = 'poem_total_chars'
const REVIEW_KEY = 'poem_review_cards'

function todayStr(): string { return new Date().toISOString().slice(0, 10) }

function addDays(base: string, days: number): string {
  const d = new Date(base + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

async function loadSessions(): Promise<RawSession[]> {
  try { return JSON.parse(await storage.get(SESSIONS_KEY) ?? '[]') } catch { return [] }
}

async function loadSrsSchedules(): Promise<Record<number, SrsSchedule>> {
  try { return JSON.parse(await storage.get(SRS_KEY) ?? '{}') } catch { return {} }
}

async function saveSrsSchedules(s: Record<number, SrsSchedule>) {
  await storage.set(SRS_KEY, JSON.stringify(s))
}

// 从 sessions 构建 progress（memorized/bestStars）
function buildProgress(sessions: RawSession[]): Progress {
  const p: Progress = {}
  for (const s of sessions) {
    const key = String(s.poemId)
    const existing = p[key] ?? { read: true, memorized: false, bestStars: 0 }
    const isMemorize = !s.mode || s.mode === 'memorize' || s.mode === 'parent' || s.mode === 'child'
    p[key] = {
      read: true,
      memorized: existing.memorized || isMemorize,
      bestStars: Math.max(existing.bestStars, s.stars ?? 0),
      noHintPass: existing.noHintPass || s.qScore === 5,
    }
  }
  return p
}

// 从 sessions distinct date 计算连续天数
function calcStreak(sessions: RawSession[]): StreakData {
  const dates = [...new Set(sessions.map(s => s.date))].sort()
  if (dates.length === 0) return { lastDate: '', count: 0 }
  let count = 1
  for (let i = dates.length - 1; i > 0; i--) {
    const d = new Date(dates[i] + 'T00:00:00')
    d.setDate(d.getDate() - 1)
    if (d.toISOString().slice(0, 10) === dates[i - 1]) count++
    else break
  }
  return { lastDate: dates[dates.length - 1], count }
}

// srs_schedules → ReviewCard（保持对外接口形状）
function srsToReviewCards(schedules: Record<number, SrsSchedule>, sessions: RawSession[]): ReviewCard[] {
  return Object.values(schedules).map(s => {
    const lastSession = [...sessions].reverse().find(r => r.poemId === s.poemId)
    return {
      id: s.poemId,
      level: Math.min(s.repetition, 5),
      due: s.nextDue,
      lastDate: lastSession?.date ?? '',
      passCount: s.totalSessions,
    }
  })
}

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
  const [sessions, setSessions] = useState<RawSession[]>([])
  const [srsSchedules, setSrsSchedules] = useState<Record<number, SrsSchedule>>({})
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    Promise.all([loadSessions(), loadSrsSchedules()]).then(([s, srs]) => {
      setSessions(s)
      setSrsSchedules(srs)
      setInitialized(true)
    })
  }, [])

  // 派生状态（实时计算）
  const progress = useMemo(() => buildProgress(sessions), [sessions])
  const streak = useMemo(() => calcStreak(sessions), [sessions])
  const totalChars = useMemo(() => sessions.reduce((sum, s) => sum + (s.charCount ?? 0), 0), [sessions])
  const memorizeHistory = useMemo(() =>
    sessions
      .filter(s => !s.mode || s.mode === 'memorize' || s.mode === 'parent' || s.mode === 'child')
      .slice(-20)
      .map(s => ({ id: s.poemId, stars: s.stars, date: s.date })),
    [sessions]
  )
  const reviewCards = useMemo(() => srsToReviewCards(srsSchedules, sessions), [srsSchedules, sessions])
  const totalMemorized = useMemo(() => Object.values(progress).filter(s => s.memorized).length, [progress])
  const totalPerfect = useMemo(() => Object.values(progress).filter(s => s.bestStars === 3).length, [progress])
  const todayDueReviews = useMemo(() => {
    const today = todayStr()
    return reviewCards.filter(c => c.level < 5 && c.due <= today)
  }, [reviewCards])
  const masteredCount = useMemo(() => reviewCards.filter(c => c.level >= 5).length, [reviewCards])
  const reviewingCount = useMemo(() => reviewCards.filter(c => c.level > 0 && c.level < 5).length, [reviewCards])
  const todayRecord = useMemo(() => {
    const today = todayStr()
    return [...memorizeHistory].reverse().find(r => r.date === today) ?? null
  }, [memorizeHistory])

  const getState = useCallback((id: number): PoemState => {
    return progress[String(id)] ?? { read: false, memorized: false, bestStars: 0 }
  }, [progress])

  const markRead = useCallback((id: number) => {
    // read 状态不再持久化，仅更新内存（sessions 里有记录即视为 read）
    // 对无 session 的诗保持兼容：写一条 read 标记到旧 poem_progress
    setSessions(prev => {
      const has = prev.some(s => s.poemId === id)
      if (has) return prev
      // 还没背过，写旧 key 兼容
      storage.get(STORAGE_KEY).then(raw => {
        const p: Progress = raw ? JSON.parse(raw) : {}
        if (!p[String(id)]?.read) {
          p[String(id)] = { ...(p[String(id)] ?? { memorized: false, bestStars: 0 }), read: true }
          storage.set(STORAGE_KEY, JSON.stringify(p))
        }
      })
      return prev
    })
  }, [])

  const markMemorized = useCallback((id: number, stars = 0, charCount = 0, noHintPass = false) => {
    // sessions 已由 saveResult 写入，这里只负责刷新内存状态
    // 重新读取 sessions 以保证 Context 与 IDB 同步
    loadSessions().then(s => setSessions(s))
  }, [])

  const markReviewed = useCallback((_id: number, _passed: boolean) => {
    // srs_schedules 已由 useRecitation.saveResult 更新，这里刷新内存
    loadSrsSchedules().then(s => setSrsSchedules(s))
  }, [])

  // 背诵/复习后外部可调用此方法强制刷新
  const refresh = useCallback(() => {
    Promise.all([loadSessions(), loadSrsSchedules()]).then(([s, srs]) => {
      setSessions(s)
      setSrsSchedules(srs)
    })
  }, [])

  const value: ProgressContextValue = {
    progress, streak, totalChars, memorizeHistory, reviewCards, initialized,
    getState, markRead, markMemorized, markReviewed,
    totalMemorized, totalPerfect, todayDueReviews, todayDueFromA: null,
    masteredCount, reviewingCount, todayRecord,
  }

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}
