import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import type { ReactNode } from 'react'
import { storage } from '../lib/storage'
import { buildSession, updateSchedule } from '../lib/spacedRepetition'
import { pruneOldSessions } from '../lib/storageMonitor'
import type { LineResult, RecitationSession } from '../types/recitation'
import type { SrsSchedule } from '../types/storage'

// ─── 对外类型 ────────────────────────────────────────────────────────────────

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

// ─── 内部类型 ────────────────────────────────────────────────────────────────

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

interface QueueStore {
  queue: number[]
  last_complete_date: string | null
  today_complete: boolean
}

// ─── Storage keys ────────────────────────────────────────────────────────────

const SESSIONS_KEY = 'recitation_sessions'
const SRS_KEY = 'srs_schedules'
const QUEUE_KEY = 'poem_queue'
const STORAGE_KEY = 'poem_progress'  // 旧 key，markRead 兼容用

// ─── 工具函数 ────────────────────────────────────────────────────────────────

function todayStr(): string { return new Date().toISOString().slice(0, 10) }

async function loadSessions(): Promise<RawSession[]> {
  try { return JSON.parse(await storage.get(SESSIONS_KEY) ?? '[]') } catch { return [] }
}

async function saveSessions(sessions: RawSession[]): Promise<void> {
  try {
    await storage.set(SESSIONS_KEY, JSON.stringify(sessions))
  } catch (e) {
    if (e instanceof DOMException && (
      e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      pruneOldSessions(90)
      try {
        await storage.set(SESSIONS_KEY, JSON.stringify(sessions))
      } catch {
        console.error('[Storage] recitation_sessions 写入失败（清理后仍超限）')
        window.dispatchEvent(new CustomEvent('storage-critical'))
      }
    }
  }
}

async function loadSrsSchedules(): Promise<Record<number, SrsSchedule>> {
  try { return JSON.parse(await storage.get(SRS_KEY) ?? '{}') } catch { return {} }
}

async function saveSrsSchedules(s: Record<number, SrsSchedule>) {
  await storage.set(SRS_KEY, JSON.stringify(s))
}

function loadQueueDefault(): QueueStore {
  return { queue: [], last_complete_date: null, today_complete: false }
}

async function loadQueue(): Promise<QueueStore> {
  try {
    const raw = await storage.get(QUEUE_KEY)
    const data: QueueStore = raw ? JSON.parse(raw) : loadQueueDefault()
    if (data.last_complete_date !== todayStr()) data.today_complete = false
    return data
  } catch { return loadQueueDefault() }
}

async function saveQueue(data: QueueStore) {
  await storage.set(QUEUE_KEY, JSON.stringify(data))
}

// ─── 派生计算 ────────────────────────────────────────────────────────────────

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

// ─── Context 类型 ────────────────────────────────────────────────────────────

interface ProgressContextValue {
  // 派生数据
  progress: Progress
  streak: StreakData
  totalChars: number
  memorizeHistory: MemorizeRecord[]
  reviewCards: ReviewCard[]
  initialized: boolean
  totalMemorized: number
  totalPerfect: number
  todayDueReviews: ReviewCard[]
  todayDueFromA: ReviewCard[] | null
  masteredCount: number
  reviewingCount: number
  todayRecord: MemorizeRecord | null
  // 原始 sessions（供 HeatmapChart 等直接消费）
  sessions: RawSession[]
  srsSchedules: Record<number, SrsSchedule>
  // queue
  queue: number[]
  todayComplete: boolean
  isReturning: boolean
  streakCount: number
  // actions - progress
  getState: (id: number) => PoemState
  markRead: (id: number) => void
  markMemorized: (id: number, stars?: number, charCount?: number, noHintPass?: boolean) => void
  markReviewed: (id: number, passed: boolean) => void
  // actions - recitation
  saveSession: (poemId: number, mode: 'parent' | 'child', lines: LineResult[], date: string, charCount?: number) => Promise<RecitationSession>
  getSchedule: (poemId: number) => Promise<SrsSchedule | null>
  getPoemSessions: (poemId: number) => RecitationSession[]
  // actions - queue
  addToQueue: (id: number) => void
  removeFromQueue: (id: number) => void
  reorderQueue: (from: number, to: number) => void
  completePoem: (id: number) => void
  isInQueue: (id: number) => boolean
}

// ─── Provider ────────────────────────────────────────────────────────────────

const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<RawSession[]>([])
  const [srsSchedules, setSrsSchedules] = useState<Record<number, SrsSchedule>>({})
  const [queueStore, setQueueStore] = useState<QueueStore>(loadQueueDefault)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    Promise.all([loadSessions(), loadSrsSchedules(), loadQueue()]).then(([s, srs, q]) => {
      setSessions(s)
      setSrsSchedules(srs)
      setQueueStore(q)
      setInitialized(true)
    })
  }, [])

  // ── 派生状态 ──
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

  const isReturning = useMemo(() => {
    if (!queueStore.last_complete_date) return false
    const diff = (new Date(todayStr()).getTime() - new Date(queueStore.last_complete_date).getTime()) / 86400000
    return diff > 1
  }, [queueStore.last_complete_date])

  // ── Progress actions ──
  const getState = useCallback((id: number): PoemState => {
    return progress[String(id)] ?? { read: false, memorized: false, bestStars: 0 }
  }, [progress])

  const markRead = useCallback((id: number) => {
    setSessions(prev => {
      if (prev.some(s => s.poemId === id)) return prev
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

  const markMemorized = useCallback((_id: number, _stars = 0, _charCount = 0, _noHintPass = false) => {
    loadSessions().then(s => setSessions(s))
  }, [])

  const markReviewed = useCallback((_id: number, _passed: boolean) => {
    loadSrsSchedules().then(s => setSrsSchedules(s))
  }, [])

  // ── Recitation actions ──
  const saveSession = useCallback(async (
    poemId: number,
    mode: 'parent' | 'child',
    lines: LineResult[],
    date: string,
    charCount = 0,
  ): Promise<RecitationSession> => {
    const session = buildSession(poemId, mode, lines, date, charCount)

    const allSessions = await loadSessions()
    allSessions.push(session)
    await saveSessions(allSessions)
    setSessions(allSessions)

    const schedules = await loadSrsSchedules()
    const updated = updateSchedule(schedules[poemId] ?? null, session)
    schedules[poemId] = {
      poemId: updated.poemId,
      ef: updated.ef,
      interval: updated.interval,
      repetition: updated.repetition,
      nextDue: updated.nextDue,
      lastSessionId: updated.lastSessionId,
      totalSessions: updated.totalSessions,
    }
    await saveSrsSchedules(schedules)
    setSrsSchedules({ ...schedules })

    return session
  }, [])

  const getSchedule = useCallback(async (poemId: number): Promise<SrsSchedule | null> => {
    return srsSchedules[poemId] ?? null
  }, [srsSchedules])

  const getPoemSessions = useCallback((poemId: number): RecitationSession[] => {
    return sessions.filter(s => s.poemId === poemId) as RecitationSession[]
  }, [sessions])

  // ── Queue actions ──
  const updateQueue = useCallback((updater: (prev: QueueStore) => QueueStore) => {
    setQueueStore(prev => {
      const next = updater(prev)
      saveQueue(next)
      return next
    })
  }, [])

  const addToQueue = useCallback((id: number) => {
    updateQueue(prev => prev.queue.includes(id) ? prev : { ...prev, queue: [...prev.queue, id] })
  }, [updateQueue])

  const removeFromQueue = useCallback((id: number) => {
    updateQueue(prev => ({ ...prev, queue: prev.queue.filter(q => q !== id) }))
  }, [updateQueue])

  const reorderQueue = useCallback((from: number, to: number) => {
    updateQueue(prev => {
      const next = [...prev.queue]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return { ...prev, queue: next }
    })
  }, [updateQueue])

  const completePoem = useCallback((id: number) => {
    updateQueue(prev => {
      const today = todayStr()
      const next = { ...prev, queue: prev.queue.filter(q => q !== id) }
      if (!prev.today_complete) {
        next.last_complete_date = today
        next.today_complete = true
      }
      return next
    })
  }, [updateQueue])

  const isInQueue = useCallback((id: number) => queueStore.queue.includes(id), [queueStore.queue])

  const value: ProgressContextValue = {
    progress, streak, totalChars, memorizeHistory, reviewCards, initialized,
    totalMemorized, totalPerfect, todayDueReviews, todayDueFromA: null,
    masteredCount, reviewingCount, todayRecord,
    sessions, srsSchedules,
    queue: queueStore.queue,
    todayComplete: queueStore.today_complete,
    isReturning,
    streakCount: streak.count,
    getState, markRead, markMemorized, markReviewed,
    saveSession, getSchedule, getPoemSessions,
    addToQueue, removeFromQueue, reorderQueue, completePoem, isInQueue,
  }

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}
