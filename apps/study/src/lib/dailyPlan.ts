import type { ReviewSchedule } from '../types/recitation'

const SCHEDULES_KEY = 'review_schedules'
const SESSIONS_KEY = 'recitation_sessions'

function loadSchedules(): Record<number, ReviewSchedule> {
  try {
    return JSON.parse(localStorage.getItem(SCHEDULES_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function recentSessionPoemIds(days = 7): Set<number> {
  try {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const sessions: { poemId: number; date: string }[] = JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]')
    return new Set(sessions.filter(s => s.date >= cutoffStr).map(s => s.poemId))
  } catch {
    return new Set()
  }
}

export interface DailyPlan {
  reviewIds: number[]       // Step 1：到期复习，最多3首
  newPoemId: number | null  // Step 2：新诗（手动队列优先）
  newPoemAuto: boolean      // true=自动推荐，false=来自手动队列
  hardPoemId: number | null // Step 3：难诗插队（ef < 1.8）
}

export function buildDailyPlan(
  today: string,
  queue: number[],               // poem_queue 当前队列
  allPoemIds: number[],          // 所有70首诗的id列表
  memorizedIds: Set<number>,     // 已背过的诗id
): DailyPlan {
  const schedules = loadSchedules()

  // Step 1：到期复习，按 nextReviewDate 升序，最多3首
  const reviewIds = Object.values(schedules)
    .filter(s => s.nextReviewDate <= today)
    .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate))
    .slice(0, 3)
    .map(s => s.poemId)

  // Step 2：新诗
  let newPoemId: number | null = null
  let newPoemAuto = false

  if (queue.length > 0) {
    newPoemId = queue[0]
    newPoemAuto = false
  } else {
    const auto = allPoemIds.find(id => !memorizedIds.has(id)) ?? null
    newPoemId = auto
    newPoemAuto = auto !== null
  }

  // Step 3：难诗插队（ef < 1.8，最近7天内未背过）
  const recent = recentSessionPoemIds(7)
  const hardPoem = Object.values(schedules)
    .filter(s => s.ef < 1.8 && !recent.has(s.poemId))
    .sort((a, b) => a.ef - b.ef)[0] ?? null
  const hardPoemId = hardPoem?.poemId ?? null

  return { reviewIds, newPoemId, newPoemAuto, hardPoemId }
}
