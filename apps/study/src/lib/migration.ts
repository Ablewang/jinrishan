import type { ReviewSchedule } from '../types/recitation'
import type { ReviewCard } from '../hooks/useProgress'
import { storage } from './storage'

const REVIEW_KEY = 'poem_review_cards'
const SCHEDULES_KEY = 'review_schedules'
const MIGRATION_KEY = 'srs_migration_done_v1'

const STREAK_KEY_V2 = 'srs_streak_v2'
const STREAK_KEY_OLD = 'poem_streak'
const QUEUE_KEY = 'poem_queue'
const STREAK_MIGRATION_KEY = 'streak_migrated_v1'

const B_INTERVALS = [1, 3, 7, 15, 30]

function cardToSchedule(card: ReviewCard): ReviewSchedule {
  const level = Math.max(0, Math.min(5, card.level))
  const interval = level === 0 ? 1 : level === 5 ? 60 : B_INTERVALS[level - 1]
  const ef = 1.3 + (level / 5) * 1.2
  return {
    poemId: card.id,
    ef: Math.round(ef * 100) / 100,
    interval,
    repetition: Math.max(1, level),
    nextReviewDate: card.due,
    lastSessionId: `migrated_${card.id}`,
    totalSessions: card.passCount,
    bestStars: 2,
  }
}

export async function migrateSystemBToA(): Promise<{ migrated: number; skipped: number }> {
  if (await storage.get(MIGRATION_KEY)) return { migrated: 0, skipped: 0 }

  const cardsRaw = await storage.get(REVIEW_KEY)
  const cards: ReviewCard[] = cardsRaw ? JSON.parse(cardsRaw) : []
  if (cards.length === 0) {
    await storage.set(MIGRATION_KEY, '1')
    return { migrated: 0, skipped: 0 }
  }

  const schedulesRaw = await storage.get(SCHEDULES_KEY)
  const schedules: Record<number, ReviewSchedule> = schedulesRaw ? JSON.parse(schedulesRaw) : {}
  let migrated = 0
  let skipped = 0

  for (const card of cards) {
    if (schedules[card.id]) { skipped++; continue }
    schedules[card.id] = cardToSchedule(card)
    migrated++
  }

  await storage.set(SCHEDULES_KEY, JSON.stringify(schedules))
  await storage.set(MIGRATION_KEY, '1')

  console.info(`[Migration] System B→A 完成：迁移 ${migrated} 首，跳过 ${skipped} 首`)
  return { migrated, skipped }
}

export async function migrateStreak(): Promise<void> {
  if (await storage.get(STREAK_MIGRATION_KEY)) return
  if (await storage.get(STREAK_KEY_V2)) {
    await storage.set(STREAK_MIGRATION_KEY, '1')
    return
  }

  try {
    const oldStreak = JSON.parse(await storage.get(STREAK_KEY_OLD) ?? '{"lastDate":"","count":0}')
    const queue = JSON.parse(await storage.get(QUEUE_KEY) ?? '{}')

    const countA: number = oldStreak.count ?? 0
    const dateA: string = oldStreak.lastDate ?? ''
    const countB: number = queue.streak_count ?? 0
    const dateB: string = queue.last_complete_date ?? ''

    const count = Math.max(countA, countB)
    const lastActivityDate = dateA > dateB ? dateA : dateB

    if (count > 0 && lastActivityDate) {
      await storage.set(STREAK_KEY_V2, JSON.stringify({ lastActivityDate, count }))
      console.info(`[Migration] streak 迁移完成：count=${count}, lastDate=${lastActivityDate}`)
    }
  } catch {}

  await storage.set(STREAK_MIGRATION_KEY, '1')
}
