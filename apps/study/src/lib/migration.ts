import type { ReviewSchedule } from '../types/recitation'
import type { ReviewCard } from '../hooks/useProgress'

const REVIEW_KEY = 'poem_review_cards'
const SCHEDULES_KEY = 'review_schedules'
const MIGRATION_KEY = 'srs_migration_done_v1'

const STREAK_KEY_V2 = 'srs_streak_v2'
const STREAK_KEY_OLD = 'poem_streak'
const QUEUE_KEY = 'poem_queue'
const STREAK_MIGRATION_KEY = 'streak_migrated_v1'

// System B 的固定档位间隔
const B_INTERVALS = [1, 3, 7, 15, 30]

function loadReviewCards(): ReviewCard[] {
  try {
    return JSON.parse(localStorage.getItem(REVIEW_KEY) ?? '[]')
  } catch {
    return []
  }
}

function loadSchedules(): Record<number, ReviewSchedule> {
  try {
    return JSON.parse(localStorage.getItem(SCHEDULES_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function saveSchedules(s: Record<number, ReviewSchedule>): void {
  try {
    localStorage.setItem(SCHEDULES_KEY, JSON.stringify(s))
  } catch {}
}

// 将 ReviewCard (System B) 转为 ReviewSchedule (System A)
// 仅用于迁移，EF 和 repetition 按档位近似推算
function cardToSchedule(card: ReviewCard): ReviewSchedule {
  const level = Math.max(0, Math.min(5, card.level))
  const interval = level === 0 ? 1 : level === 5 ? 60 : B_INTERVALS[level - 1]
  const ef = 1.3 + (level / 5) * 1.2  // 粗略：level 0→1.3, level 5→2.5
  return {
    poemId: card.id,
    ef: Math.round(ef * 100) / 100,
    interval,
    repetition: Math.max(1, level),
    nextReviewDate: card.due,
    lastSessionId: `migrated_${card.id}`,
    totalSessions: card.passCount,
    bestStars: 2,  // 迁移数据无历史星级，默认 2
  }
}

export function migrateSystemBToA(): { migrated: number; skipped: number } {
  if (localStorage.getItem(MIGRATION_KEY)) {
    return { migrated: 0, skipped: 0 }
  }

  const cards = loadReviewCards()
  if (cards.length === 0) {
    localStorage.setItem(MIGRATION_KEY, '1')
    return { migrated: 0, skipped: 0 }
  }

  const schedules = loadSchedules()
  let migrated = 0
  let skipped = 0

  for (const card of cards) {
    if (schedules[card.id]) {
      skipped++
      continue
    }
    schedules[card.id] = cardToSchedule(card)
    migrated++
  }

  saveSchedules(schedules)
  localStorage.setItem(MIGRATION_KEY, '1')

  console.info(`[Migration] System B→A 完成：迁移 ${migrated} 首，跳过 ${skipped} 首`)
  return { migrated, skipped }
}

export function migrateStreak(): void {
  if (localStorage.getItem(STREAK_MIGRATION_KEY)) return
  if (localStorage.getItem(STREAK_KEY_V2)) {
    localStorage.setItem(STREAK_MIGRATION_KEY, '1')
    return
  }

  try {
    const oldStreak = JSON.parse(localStorage.getItem(STREAK_KEY_OLD) ?? '{"lastDate":"","count":0}')
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '{}')

    const countA: number = oldStreak.count ?? 0
    const dateA: string = oldStreak.lastDate ?? ''
    const countB: number = queue.streak_count ?? 0
    const dateB: string = queue.last_complete_date ?? ''

    const count = Math.max(countA, countB)
    const lastActivityDate = dateA > dateB ? dateA : dateB

    if (count > 0 && lastActivityDate) {
      localStorage.setItem(STREAK_KEY_V2, JSON.stringify({ lastActivityDate, count }))
      console.info(`[Migration] streak 迁移完成：count=${count}, lastDate=${lastActivityDate}`)
    }
  } catch {}

  localStorage.setItem(STREAK_MIGRATION_KEY, '1')
}
