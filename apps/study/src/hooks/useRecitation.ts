import { useCallback } from 'react'
import type { LineResult, RecitationSession, ReviewSchedule } from '../types/recitation'
import { buildSession, updateSchedule, getTodayReviews } from '../lib/spacedRepetition'
import { pruneOldSessions } from '../lib/storageMonitor'

const SESSIONS_KEY = 'recitation_sessions'
const SCHEDULES_KEY = 'review_schedules'

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

  return { saveResult, getSchedule, getTodayList, getPoemSessions }
}
