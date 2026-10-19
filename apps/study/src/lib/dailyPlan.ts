import type { ReviewSchedule } from '../types/recitation'
import { storage } from './storage'

const SCHEDULES_KEY = 'review_schedules'
const SESSIONS_KEY = 'recitation_sessions'

async function loadSchedules(): Promise<Record<number, ReviewSchedule>> {
  try {
    return JSON.parse(await storage.get(SCHEDULES_KEY) ?? '{}')
  } catch {
    return {}
  }
}

async function recentSessionPoemIds(days = 7): Promise<Set<number>> {
  try {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const sessions: { poemId: number; date: string }[] = JSON.parse(await storage.get(SESSIONS_KEY) ?? '[]')
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

export async function buildDailyPlan(
  today: string,
  queue: number[],
  allPoemIds: number[],
  memorizedIds: Set<number>,
): Promise<DailyPlan> {
  const schedules = await loadSchedules()

  const reviewIds = Object.values(schedules)
    .filter(s => s.nextReviewDate <= today)
    .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate))
    .slice(0, 3)
    .map(s => s.poemId)

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

  const recent = await recentSessionPoemIds(7)
  const hardPoem = Object.values(schedules)
    .filter(s => s.ef < 1.8 && !recent.has(s.poemId))
    .sort((a, b) => a.ef - b.ef)[0] ?? null
  const hardPoemId = hardPoem?.poemId ?? null

  return { reviewIds, newPoemId, newPoemAuto, hardPoemId }
}
