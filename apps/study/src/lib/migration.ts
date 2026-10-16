import type { ReviewSchedule } from '../types/recitation'
import type { ReviewCard } from '../hooks/useProgress'

const REVIEW_KEY = 'poem_review_cards'
const SCHEDULES_KEY = 'review_schedules'
const MIGRATION_KEY = 'srs_migration_done_v1'

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
      // System A 已有该诗的记录，以 A 为准，跳过
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
