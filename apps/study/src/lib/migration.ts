import type { ReviewSchedule } from '../types/recitation'
import type { ReviewCard } from '../hooks/useProgress'
import { storage } from './storage'
import type { RecitationSessionV2, SrsSchedule, AchievementEvent, UserProfile } from '../types/storage'

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

const MIGRATION_V2_KEY = 'data_migration_v2'

export async function migrateToV2(): Promise<void> {
  if (await storage.get(MIGRATION_V2_KEY)) return

  try {
    // 1. 迁移 recitation_sessions：补全 charCount / mode 字段
    const sessionsRaw = await storage.get('recitation_sessions')
    const oldSessions: RecitationSession[] = sessionsRaw ? JSON.parse(sessionsRaw) : []
    const newSessions: RecitationSessionV2[] = oldSessions.map(s => ({
      ...s,
      mode: (s.mode === 'parent' || s.mode === 'child' || !s.mode) ? 'memorize' : s.mode as 'memorize' | 'review',
      charCount: (s as any).charCount ?? 0,
      lines: s.lines.map((l, i) => ({ lineIndex: i, passed: l.passed, hintCount: l.hintCount, mode: 'parent' as const, ...l })),
    }))
    await storage.set('recitation_sessions', JSON.stringify(newSessions))

    // 2. 迁移 review_schedules → srs_schedules（nextReviewDate 改名 nextDue）
    const schedulesRaw = await storage.get('review_schedules')
    const oldSchedules: Record<number, ReviewSchedule> = schedulesRaw ? JSON.parse(schedulesRaw) : {}
    const newSchedules: Record<number, SrsSchedule> = {}
    for (const [key, s] of Object.entries(oldSchedules)) {
      newSchedules[Number(key)] = {
        poemId: s.poemId,
        ef: s.ef,
        interval: s.interval,
        repetition: s.repetition,
        nextDue: s.nextReviewDate,
        lastSessionId: s.lastSessionId,
        totalSessions: s.totalSessions,
      }
    }
    await storage.set('srs_schedules', JSON.stringify(newSchedules))

    // 3. 迁移 poem_achievement_dates → achievement_events
    const achRaw = await storage.get('poem_achievement_dates')
    const oldAch: Record<string, string> = achRaw ? JSON.parse(achRaw) : {}
    const achEvents: AchievementEvent[] = Object.entries(oldAch).map(([id, unlockedAt]) => ({ id, unlockedAt }))
    await storage.set('achievement_events', JSON.stringify(achEvents))

    // 4. 合并 user_profile
    const nickname = await storage.get('poem_nickname') ?? ''
    const gender = await storage.get('avatar_gender') as 'male' | 'female' | null
    const reminderTime = await storage.get('reminder_time') ?? undefined
    const onboardingDone = (await storage.get('poem_onboarding_done')) === '1'
    const profile: UserProfile = {
      nickname,
      ...(gender ? { gender } : {}),
      ...(reminderTime ? { reminderTime } : {}),
      onboardingDone,
      createdAt: new Date().toISOString(),
    }
    await storage.set('user_profile', JSON.stringify(profile))

    await storage.set(MIGRATION_V2_KEY, 'done')
    console.info(`[Migration V2] 完成：sessions=${newSessions.length}, schedules=${Object.keys(newSchedules).length}`)
  } catch (e) {
    console.error('[Migration V2] 失败，下次启动重试', e)
  }
}

// RecitationSession 旧类型（仅供迁移内部使用）
interface RecitationSession {
  id: string
  poemId: number
  mode?: string
  date: string
  timestamp: number
  stars: number
  qScore: number
  lines: { passed: boolean; hintCount: number }[]
  hintRate: number
  passRate: number
}
