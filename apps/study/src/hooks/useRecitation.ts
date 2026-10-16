import { useCallback, useState } from 'react'
import type { LineResult, RecitationSession, ReviewSchedule } from '../types/recitation'
import { buildSession, updateSchedule, getTodayReviews } from '../lib/spacedRepetition'
import { pruneOldSessions } from '../lib/storageMonitor'

const SESSIONS_KEY = 'recitation_sessions'
const SCHEDULES_KEY = 'review_schedules'
const STREAK_KEY_V2 = 'srs_streak_v2'

export interface SrsStreakData {
  lastActivityDate: string
  count: number
}

function loadSrsStreak(): SrsStreakData {
  try {
    return JSON.parse(localStorage.getItem(STREAK_KEY_V2) ?? '{"lastActivityDate":"","count":0}')
  } catch {
    return { lastActivityDate: '', count: 0 }
  }
}

function updateSrsStreak(date: string): SrsStreakData {
  const prev = loadSrsStreak()
  if (prev.lastActivityDate === date) return prev

  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  const yesterday = d.toISOString().slice(0, 10)

  const next: SrsStreakData = {
    lastActivityDate: date,
    count: prev.lastActivityDate === yesterday ? prev.count + 1 : 1,
  }
  try {
    localStorage.setItem(STREAK_KEY_V2, JSON.stringify(next))
  } catch {}
  return next
}

function loadSessions(): RecitationSession[] {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveSessions(sessions: RecitationSession[]): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
  } catch (e) {
    if (e instanceof DOMException && (
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      pruneOldSessions(90)
      try {
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
      } catch {
        console.error('[Storage] recitation_sessions 写入失败（清理后仍超限）')
        window.dispatchEvent(new CustomEvent('storage-critical'))
      }
    }
  }
}

function loadSchedules(): Record<number, ReviewSchedule> {
  try {
    return JSON.parse(localStorage.getItem(SCHEDULES_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function saveSchedules(schedules: Record<number, ReviewSchedule>): void {
  try {
    localStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules))
  } catch {}
}

export function useRecitation() {
  const [srsStreak, setSrsStreak] = useState<SrsStreakData>(loadSrsStreak)

  const saveResult = useCallback((
    poemId: number,
    mode: 'parent' | 'child',
    lines: LineResult[],
    date: string
  ): RecitationSession => {
    const session = buildSession(poemId, mode, lines, date)

    const sessions = loadSessions()
    sessions.push(session)
    saveSessions(sessions)

    const schedules = loadSchedules()
    schedules[poemId] = updateSchedule(schedules[poemId] ?? null, session)
    saveSchedules(schedules)

    const newStreak = updateSrsStreak(date)
    setSrsStreak(newStreak)

    return session
  }, [])

  const getSchedule = useCallback((poemId: number): ReviewSchedule | null => {
    return loadSchedules()[poemId] ?? null
  }, [])

  const getTodayList = useCallback((today: string): ReviewSchedule[] => {
    return getTodayReviews(loadSchedules(), today)
  }, [])

  const getPoemSessions = useCallback((poemId: number): RecitationSession[] => {
    return loadSessions().filter(s => s.poemId === poemId)
  }, [])

  return { saveResult, getSchedule, getTodayList, getPoemSessions, srsStreak }
}
