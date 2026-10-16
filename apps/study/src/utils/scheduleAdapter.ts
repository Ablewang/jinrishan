import type { ReviewSchedule } from '../types/recitation'
import type { ReviewCard } from '../hooks/useProgress'

// System A (review_schedules) 的间隔档位映射到 System B (poem_review_cards) 的 level
// level: 0=刚背完, 1-4=复习中, 5=已掌握
// System B intervals: [1, 3, 7, 15, 30] 天
function intervalToLevel(interval: number): number {
  if (interval >= 30) return 5
  if (interval >= 15) return 4
  if (interval >= 7) return 3
  if (interval >= 3) return 2
  if (interval >= 1) return 1
  return 0
}

export function scheduleToCard(s: ReviewSchedule): ReviewCard {
  const level = intervalToLevel(s.interval)
  return {
    id: s.poemId,
    level,
    due: s.nextReviewDate,
    lastDate: s.nextReviewDate, // 近似：下次复习日作为 lastDate
    passCount: s.repetition,
  }
}

export function scheduleToDisplayLevel(s: ReviewSchedule): number {
  return intervalToLevel(s.interval)
}
