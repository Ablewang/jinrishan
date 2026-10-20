import type { LineResult, RecitationSession } from '../types/recitation'
import type { SrsSchedule } from '../types/storage'

const INITIAL_EF = 2.5
const MIN_EF = 1.3
const MAX_INTERVAL = 60

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// hintCount=2（全句提示）等效于失败，没有发生真实记忆提取
function evalLine(line: LineResult): 'clean' | 'hinted' | 'full_hint' | 'failed' {
  if (!line.passed) return 'failed'
  if (line.hintCount === 0) return 'clean'
  if (line.hintCount === 1) return 'hinted'
  return 'full_hint'
}

export function calcQScore(lines: LineResult[]): number {
  const n = lines.length
  if (n === 0) return 0

  let failed = 0, fullHint = 0, hinted = 0
  for (const l of lines) {
    const e = evalLine(l)
    if (e === 'failed') failed++
    else if (e === 'full_hint') fullHint++
    else if (e === 'hinted') hinted++
  }

  const hardFailRate = (failed + fullHint) / n
  const softHintRate = hinted / n

  if (hardFailRate > 0.5) return 0
  if (hardFailRate > 0.2) return 1
  if (hardFailRate > 0) return 2
  if (softHintRate > 0.3) return 3
  if (softHintRate > 0) return 4
  return 5
}

export function calcStars(lines: LineResult[]): 1 | 2 | 3 {
  const q = calcQScore(lines)
  if (q >= 5) return 3
  if (q >= 3) return 2
  return 1
}

export function calcHintRate(lines: LineResult[]): number {
  if (lines.length === 0) return 0
  return lines.filter(l => l.hintCount === 1).length / lines.length
}

export function calcPassRate(lines: LineResult[]): number {
  if (lines.length === 0) return 0
  return lines.filter(l => l.passed && l.hintCount < 2).length / lines.length
}

export function buildSession(
  poemId: number,
  mode: 'parent' | 'child',
  lines: LineResult[],
  date: string,
  charCount = 0
): RecitationSession {
  const stars = calcStars(lines)
  return {
    id: `${poemId}_${date}_${mode}_${Date.now()}`,
    poemId,
    mode,
    date,
    timestamp: Date.now(),
    lines,
    stars,
    hintRate: calcHintRate(lines),
    passRate: calcPassRate(lines),
    qScore: calcQScore(lines),
    charCount,
  }
}

export function updateSchedule(
  prev: SrsSchedule | null,
  session: RecitationSession
): SrsSchedule {
  const q = session.qScore
  const now = session.date

  if (!prev) {
    const firstInterval = q === 5 ? 3 : q >= 4 ? 2 : 1
    return {
      poemId: session.poemId,
      ef: INITIAL_EF,
      interval: firstInterval,
      repetition: 1,
      nextDue: addDays(now, firstInterval),
      lastSessionId: session.id,
      totalSessions: 1,
    }
  }

  const newEF = Math.max(
    MIN_EF,
    prev.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  )

  let newInterval: number
  let newRepetition: number

  if (q < 3) {
    newRepetition = Math.max(1, prev.repetition - 1)
    newInterval = newRepetition === 1 ? 1 : 2
  } else {
    newRepetition = prev.repetition + 1
    if (prev.repetition === 1) newInterval = 6
    else newInterval = Math.round(prev.interval * newEF)
  }

  newInterval = Math.min(MAX_INTERVAL, Math.max(1, newInterval))

  return {
    poemId: session.poemId,
    ef: newEF,
    interval: newInterval,
    repetition: newRepetition,
    nextDue: addDays(now, newInterval),
    lastSessionId: session.id,
    totalSessions: prev.totalSessions + 1,
  }
}

export function getTodayReviews(
  schedules: Record<number, SrsSchedule>,
  today: string
): SrsSchedule[] {
  return Object.values(schedules).filter(s => s.nextDue <= today)
}

export function intervalLabel(interval: number): string {
  if (interval <= 1) return '明天'
  if (interval < 7) return `${interval} 天后`
  if (interval === 7) return '一周后'
  if (interval < 30) return `${interval} 天后`
  if (interval < 60) return `${Math.round(interval / 7)} 周后`
  return '已掌握'
}
