import type { ReviewSchedule } from '../types/recitation'
import { storage } from './storage'

const SESSIONS_KEY = 'recitation_sessions'
const SCHEDULES_KEY = 'review_schedules'

interface Session {
  poemId: number
  date: string
  timestamp: number
  stars: number
  qScore: number
}

async function loadSessions(): Promise<Session[]> {
  try {
    return JSON.parse(await storage.get(SESSIONS_KEY) ?? '[]')
  } catch {
    return []
  }
}

async function loadSchedules(): Promise<Record<number, ReviewSchedule>> {
  try {
    return JSON.parse(await storage.get(SCHEDULES_KEY) ?? '{}')
  } catch {
    return {}
  }
}

// M1 热力图：过去84天每天的星数总和
export interface HeatmapDay {
  date: string       // YYYY-MM-DD
  stars: number      // 当天所有session stars总和
  count: number      // 当天背诵次数
}

export async function buildHeatmap(): Promise<HeatmapDay[]> {
  const sessions = await loadSessions()
  const map: Record<string, HeatmapDay> = {}

  for (let i = 83; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const date = d.toISOString().slice(0, 10)
    map[date] = { date, stars: 0, count: 0 }
  }

  for (const s of sessions) {
    if (map[s.date]) {
      map[s.date].stars += s.stars
      map[s.date].count += 1
    }
  }

  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
}

// M4 难诗排行：按 ef 升序，totalSessions >= 2，取前5
export interface HardPoem {
  poemId: number
  ef: number
  totalSessions: number
  efLevel: 'hard' | 'medium' | 'easy'  // <1.8=hard, 1.8-2.2=medium, >2.2=easy
}

export async function buildHardRanking(): Promise<HardPoem[]> {
  const schedules = await loadSchedules()
  return Object.values(schedules)
    .filter(s => s.totalSessions >= 2)
    .sort((a, b) => a.ef - b.ef)
    .slice(0, 5)
    .map(s => ({
      poemId: s.poemId,
      ef: Math.round(s.ef * 100) / 100,
      totalSessions: s.totalSessions,
      efLevel: s.ef < 1.8 ? 'hard' : s.ef <= 2.2 ? 'medium' : 'easy',
    }))
}

// M5 最佳学习时段
export interface TimeSlot {
  hour: number
  count: number
  avgQScore: number
  isBest: boolean
}

export async function buildTimeSlots(): Promise<TimeSlot[]> {
  const sessions = await loadSessions()
  const map: Record<number, { total: number; count: number }> = {}

  for (const s of sessions) {
    if (!s.timestamp) continue
    const hour = new Date(s.timestamp).getHours()
    if (!map[hour]) map[hour] = { total: 0, count: 0 }
    map[hour].total += s.qScore ?? 0
    map[hour].count += 1
  }

  const slots: TimeSlot[] = Object.entries(map)
    .filter(([, v]) => v.count >= 3)
    .map(([h, v]) => ({
      hour: Number(h),
      count: v.count,
      avgQScore: Math.round((v.total / v.count) * 10) / 10,
      isBest: false,
    }))
    .sort((a, b) => a.hour - b.hour)

  if (slots.length > 0) {
    const best = slots.reduce((a, b) => a.avgQScore > b.avgQScore ? a : b)
    best.isBest = true
  }

  return slots
}
