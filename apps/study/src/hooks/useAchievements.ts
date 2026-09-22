import { useState, useEffect } from 'react'
import type { PoemState, StreakData, MemorizeRecord } from './useProgress'

const LIBAI_IDS = new Set([19, 20, 21, 22, 23, 24, 25])
const MOON_IDS = new Set([13, 18, 19, 20, 31, 35, 36, 54, 64, 68])
const STORAGE_KEY = 'poem_achievement_dates'

export interface AchievementDef {
  id: string
  label: string
  desc: string
  icon: string
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: 'perfect',  label: '一气呵成', desc: '完成一首诗全程0次提示',    icon: '一' },
  { id: 'streak3',  label: '三连击',   desc: '连续3首诗获得两星以上',    icon: '连' },
  { id: 'moon',     label: '月亮诗人', desc: '完成所有含「月」字的诗（共10首）', icon: '月' },
  { id: 'streak7',  label: '每日学诗', desc: '连续学习7天',              icon: '恒' },
  { id: 'chars',    label: '百字侠',   desc: '累计背出100个汉字',        icon: '百' },
  { id: 'libai',    label: '小李白',   desc: '完成所有李白诗目（共7首）', icon: '白' },
]

export interface Badge extends AchievementDef {
  unlocked: boolean
  unlockedAt: string | null
}

interface Input {
  progress: Record<string, PoemState>
  streak: StreakData
  totalChars: number
  memorizeHistory: MemorizeRecord[]
}

function loadDates(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveDates(d: Record<string, string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch { /* ignore */ }
}

function computeUnlocked(input: Input): Record<string, boolean> {
  const { progress, streak, totalChars, memorizeHistory } = input
  const memorizedIds = new Set(
    Object.entries(progress).filter(([, s]) => s.memorized).map(([id]) => Number(id))
  )

  let streak3 = false
  let count = 0
  for (const r of memorizeHistory) {
    if (r.stars >= 2) { count++; if (count >= 3) { streak3 = true; break } }
    else count = 0
  }

  return {
    perfect: Object.values(progress).some(s => s.bestStars === 3),
    streak3,
    moon:    [...MOON_IDS].every(id => memorizedIds.has(id)),
    streak7: streak.count >= 7,
    chars:   totalChars >= 100,
    libai:   [...LIBAI_IDS].every(id => memorizedIds.has(id)),
  }
}

export function useAchievements(input: Input): Badge[] {
  const [dates, setDates] = useState<Record<string, string>>(loadDates)

  const unlocked = computeUnlocked(input)

  // 检测新解锁，记录时间
  useEffect(() => {
    const current = loadDates()
    let changed = false
    const now = new Date().toISOString()
    for (const id of Object.keys(unlocked)) {
      if (unlocked[id] && !current[id]) {
        current[id] = now
        changed = true
      }
    }
    if (changed) {
      saveDates(current)
      setDates({ ...current })
    }
  }, [
    unlocked.perfect, unlocked.streak3, unlocked.moon,
    unlocked.streak7, unlocked.chars,   unlocked.libai,
  ])

  return ACHIEVEMENT_DEFS.map(def => ({
    ...def,
    unlocked: unlocked[def.id] ?? false,
    unlockedAt: dates[def.id] ?? null,
  }))
}
