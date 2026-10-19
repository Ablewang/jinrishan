import type { RecitationSession } from '../types/recitation'
import type { MemorizeRecord } from '../hooks/useProgress'

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

export function buildWeeklyReport(weekStart: string): WeeklyReport {
  const { start, end } = getWeekBounds(weekStart)

  // recitation_sessions
  let sessions: RecitationSession[] = []
  try { sessions = JSON.parse(localStorage.getItem('recitation_sessions') ?? '[]') } catch {}

  // poem_memorize_history
  let history: MemorizeRecord[] = []
  try { history = JSON.parse(localStorage.getItem('poem_memorize_history') ?? '[]') } catch {}

  // review_schedules
  let schedules: Record<number, { ef: number; totalSessions: number }> = {}
  try { schedules = JSON.parse(localStorage.getItem('review_schedules') ?? '{}') } catch {}

  // streak
  let streakCount = 0
  try {
    const sv2 = JSON.parse(localStorage.getItem('srs_streak_v2') ?? 'null')
    if (sv2?.count) streakCount = sv2.count
    else {
      const s = JSON.parse(localStorage.getItem('poem_streak') ?? 'null')
      if (s?.count) streakCount = s.count
    }
  } catch {}

  // total chars & memorized
  let totalChars = 0
  try { totalChars = Number(localStorage.getItem('poem_total_chars') ?? 0) } catch {}
  let totalMemorized = 0
  try {
    const prog = JSON.parse(localStorage.getItem('poem_progress') ?? '{}')
    totalMemorized = Object.values(prog as Record<string, { memorized?: boolean }>).filter(v => v.memorized).length
  } catch {}

  // 本周新背诗（memorize_history 中 date 在本周）
  const weekPoems = history.filter(r => r.date >= start && r.date <= end)
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

export function getLastReportWeek(): string | null {
  try { return localStorage.getItem('poem_last_report_week') } catch { return null }
}

export function markReportRead(weekStart: string): void {
  try { localStorage.setItem('poem_last_report_week', weekStart) } catch {}
}

export function hasUnreadReport(): boolean {
  const today = new Date().toISOString().slice(0, 10)
  const lastWeekStart = getWeekStart(
    new Date(new Date().getTime() - 7 * 86400000).toISOString().slice(0, 10)
  )
  const lastRead = getLastReportWeek()
  if (lastRead && lastRead >= lastWeekStart) return false
  // 上周有没有数据
  const report = buildWeeklyReport(lastWeekStart)
  return report.hasData && today > lastWeekStart
}
