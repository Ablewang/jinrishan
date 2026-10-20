import { useCallback, useState, useEffect } from 'react'
import type { LineResult, RecitationSession } from '../types/recitation'
import type { SrsSchedule } from '../types/storage'
import { buildSession, updateSchedule } from '../lib/spacedRepetition'
import { pruneOldSessions } from '../lib/storageMonitor'
import { storage } from '../lib/storage'

const SESSIONS_KEY = 'recitation_sessions'
const SRS_SCHEDULES_KEY = 'srs_schedules'
const STREAK_KEY_V2 = 'srs_streak_v2'

export interface SrsStreakData {
  lastActivityDate: string
  count: number
}

async function loadSrsStreak(): Promise<SrsStreakData> {
  try {
    const raw = await storage.get(STREAK_KEY_V2)
    return raw ? JSON.parse(raw) : { lastActivityDate: '', count: 0 }
  } catch { return { lastActivityDate: '', count: 0 } }
}

async function updateSrsStreak(date: string): Promise<SrsStreakData> {
  const prev = await loadSrsStreak()
  if (prev.lastActivityDate === date) return prev

  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  const yesterday = d.toISOString().slice(0, 10)

  const next: SrsStreakData = {
    lastActivityDate: date,
    count: prev.lastActivityDate === yesterday ? prev.count + 1 : 1,
  }
  await storage.set(STREAK_KEY_V2, JSON.stringify(next))
  return next
}

async function loadSessions(): Promise<RecitationSession[]> {
  try {
    const raw = await storage.get(SESSIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

async function saveSessions(sessions: RecitationSession[]): Promise<void> {
  try {
    await storage.set(SESSIONS_KEY, JSON.stringify(sessions))
  } catch (e) {
    if (e instanceof DOMException && (
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
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
  try {
    const raw = await storage.get(SRS_SCHEDULES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

async function saveSrsSchedules(schedules: Record<number, SrsSchedule>): Promise<void> {
  await storage.set(SRS_SCHEDULES_KEY, JSON.stringify(schedules))
}

export function useRecitation() {
  const [srsStreak, setSrsStreak] = useState<SrsStreakData>({ lastActivityDate: '', count: 0 })

  useEffect(() => {
    loadSrsStreak().then(setSrsStreak)
  }, [])

  const saveResult = useCallback(async (
    poemId: number,
    mode: 'parent' | 'child',
    lines: LineResult[],
    date: string,
    charCount = 0
  ): Promise<RecitationSession> => {
    const session = buildSession(poemId, mode, lines, date, charCount)

    const sessions = await loadSessions()
    sessions.push(session)
    await saveSessions(sessions)

    const srsSchedules = await loadSrsSchedules()
    const old = srsSchedules[poemId] ?? null
    const updated = updateSchedule(old, session)
    srsSchedules[poemId] = {
      poemId: updated.poemId,
      ef: updated.ef,
      interval: updated.interval,
      repetition: updated.repetition,
      nextDue: updated.nextDue,
      lastSessionId: updated.lastSessionId,
      totalSessions: updated.totalSessions,
    }
    await saveSrsSchedules(srsSchedules)

    const newStreak = await updateSrsStreak(date)
    setSrsStreak(newStreak)

    return session
  }, [])

  const getSchedule = useCallback(async (poemId: number): Promise<SrsSchedule | null> => {
    const schedules = await loadSrsSchedules()
    return schedules[poemId] ?? null
  }, [])

  const getTodayList = useCallback(async (today: string): Promise<SrsSchedule[]> => {
    const schedules = await loadSrsSchedules()
    return Object.values(schedules).filter(s => s.nextDue <= today)
  }, [])

  const getPoemSessions = useCallback(async (poemId: number): Promise<RecitationSession[]> => {
    const sessions = await loadSessions()
    return sessions.filter(s => s.poemId === poemId)
  }, [])

  return { saveResult, getSchedule, getTodayList, getPoemSessions, srsStreak }
}
