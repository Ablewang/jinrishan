import type { RecitationSession } from '../types/recitation'
import type { SrsSchedule } from '../types/storage'
import { storage } from './storage'

export interface WeeklyReport {
  weekStart: string   // "2026-10-13" (周一)
  weekEnd: string     // "2026-10-19" (周日)
  newPoemCount: number
  newPoems: { id: number; stars: number; date: string }[]
  checkInDays: number
  checkedDows: boolean[]  // [周一, 周二, ..., 周日]
  perfectStarCount: number
  streakCount: number
  hardestPoemId: number | null
  hardestPoemEf: number | null
  hardestPoemSessions: number
  totalChars: number
  totalMemorized: number
  hasData: boolean
}

function getWeekBounds(weekStart: string): { start: string; end: string } {
  const d = new Date(weekStart + 'T00:00:00')
  const end = new Date(d)
  end.setDate(d.getDate() + 6)
  return {
    start: weekStart,
    end: end.toISOString().slice(0, 10),
  }
}

export function getWeekStart(date: string): string {
  const d = new Date(date + 'T00:00:00')
  const dow = d.getDay()
  const diff = (dow + 6) % 7  // 周一=0
  d.setDate(d.getDate() - diff)
  return d.toISOString().slice(0, 10)
}

export async function buildWeeklyReport(weekStart: string): Promise<WeeklyReport> {
  const { start, end } = getWeekBounds(weekStart)

  let sessions: RecitationSession[] = []
  try { sessions = JSON.parse(await storage.get('recitation_sessions') ?? '[]') } catch {}

  let schedules: Record<number, SrsSchedule> = {}
  try { schedules = JSON.parse(await storage.get('srs_schedules') ?? '{}') } catch {}

  let streakCount = 0
  try {
    const sv2 = JSON.parse(await storage.get('srs_streak_v2') ?? 'null')
    if (sv2?.count) streakCount = sv2.count
  } catch {}

  const totalChars = sessions.reduce((sum, s) => sum + (s.charCount ?? 0), 0)
  const memorizedPoemIds = new Set(
    sessions.filter(s => s.mode === 'parent' || s.mode === 'child').map(s => s.poemId)
  )
  const totalMemorized = memorizedPoemIds.size

  // 本周新背诗（memorize sessions 中 date 在本周，每首只取最佳一次）
  const weekMemorizeSessions = sessions.filter(s =>
    s.date >= start && s.date <= end &&
    (s.mode === 'parent' || s.mode === 'child')
  )
  const weekPoemBest = new Map<number, { stars: number; date: string }>()
  for (const s of weekMemorizeSessions) {
    const prev = weekPoemBest.get(s.poemId)
    if (!prev || s.stars > prev.stars) weekPoemBest.set(s.poemId, { stars: s.stars, date: s.date })
  }
  const weekPoems = [...weekPoemBest.entries()].map(([id, v]) => ({ id, ...v }))
  const newPoemCount = weekPoems.length
  const perfectStarCount = weekPoems.filter(r => r.stars === 3).length

  // 本周打卡天数（sessions 按 date 去重）
  const weekSessions = sessions.filter(s => s.date >= start && s.date <= end)
  const checkedDates = new Set(weekSessions.map(s => s.date))
  const checkInDays = checkedDates.size

  // checkedDows: 周一到周日
  const checkedDows = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start + 'T00:00:00')
    d.setDate(d.getDate() + i)
    return checkedDates.has(d.toISOString().slice(0, 10))
  })

  // 本周最难的诗：本周有 session 且 ef 最低
  const weekPoemIds = new Set(weekSessions.map(s => s.poemId))
  let hardestPoemId: number | null = null
  let hardestPoemEf: number | null = null
  let hardestPoemSessions = 0
  let minEf = Infinity
  for (const poemId of weekPoemIds) {
    const sched = schedules[poemId]
    if (sched && sched.ef < minEf) {
      minEf = sched.ef
      hardestPoemId = poemId
      hardestPoemEf = sched.ef
      hardestPoemSessions = sched.totalSessions
    }
  }

  const hasData = checkInDays > 0 || newPoemCount > 0

  return {
    weekStart: start,
    weekEnd: end,
    newPoemCount,
    newPoems: weekPoems.map(r => ({ id: r.id, stars: r.stars, date: r.date })),
    checkInDays,
    checkedDows,
    perfectStarCount,
    streakCount,
    hardestPoemId,
    hardestPoemEf,
    hardestPoemSessions,
    totalChars,
    totalMemorized,
    hasData,
  }
}

export async function getLastReportWeek(): Promise<string | null> {
  try { return await storage.get('poem_last_report_week') } catch { return null }
}

export async function markReportRead(weekStart: string): Promise<void> {
  try { await storage.set('poem_last_report_week', weekStart) } catch {}
}

export async function hasUnreadReport(): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10)
  const lastWeekStart = getWeekStart(
    new Date(new Date().getTime() - 7 * 86400000).toISOString().slice(0, 10)
  )
  const lastRead = await getLastReportWeek()
  if (lastRead && lastRead >= lastWeekStart) return false
  const report = await buildWeeklyReport(lastWeekStart)
  return report.hasData && today > lastWeekStart
}
