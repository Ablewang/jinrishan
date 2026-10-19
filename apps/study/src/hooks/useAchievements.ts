import { useState, useEffect } from 'react'
import { storage } from '../lib/storage'
import type { PoemState, StreakData, MemorizeRecord } from './useProgress'

const STORAGE_KEY = 'poem_achievement_dates'

export interface AchievementDef {
  id: string
  label: string
  desc: string
  icon: string
}

// 9枚勋章（PRD v0.2）- 命名不与称号重叠
export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: 'first_poem',    label: '初入诗门', desc: '背完第1首诗',                  icon: '入' },
  { id: 'streak3',       label: '三日初成', desc: '连续打卡3天',                  icon: '三' },
  { id: 'streak7',       label: '七日不辍', desc: '连续打卡7天',                  icon: '七' },
  { id: 'poems5',        label: '五首入门', desc: '背完5首诗',                    icon: '五' },
  { id: 'poems15',       label: '十五首晋阶', desc: '背完15首诗',                 icon: '十' },
  { id: 'poems30',       label: '三十首精通', desc: '背完30首诗',                 icon: '卅' },
  { id: 'poems70',       label: '诗书满腹', desc: '背完全部70首诗',               icon: '满' },
  { id: 'no_hint',       label: '过目不忘', desc: '某首诗第3轮全部首次答对（无提示）', icon: '忘' },
  { id: 'streak30',      label: '铁杆书生', desc: '连续打卡30天',                 icon: '铁' },
]

export interface Badge extends AchievementDef {
  unlocked: boolean
  unlockedAt: string | null
  progress?: string  // 未解锁时的进度提示，如"已背 3/5 首"
}

interface Input {
  progress: Record<string, PoemState>
  streak: StreakData
  totalChars: number
  memorizeHistory: MemorizeRecord[]
}

async function saveDates(d: Record<string, string>) {
  await storage.set(STORAGE_KEY, JSON.stringify(d))
}

function computeUnlocked(input: Input): Record<string, boolean> {
  const { progress, streak } = input
  const memorizedCount = Object.values(progress).filter(s => s.memorized).length
  const noHintEver = Object.values(progress).some(s => s.noHintPass === true)

  return {
    first_poem: memorizedCount >= 1,
    streak3:    streak.count >= 3,
    streak7:    streak.count >= 7,
    poems5:     memorizedCount >= 5,
    poems15:    memorizedCount >= 15,
    poems30:    memorizedCount >= 30,
    poems70:    memorizedCount >= 70,
    no_hint:    noHintEver,
    streak30:   streak.count >= 30,
  }
}

function getProgress(id: string, input: Input): string | undefined {
  const { progress, streak } = input
  const memorizedCount = Object.values(progress).filter(s => s.memorized).length

  switch (id) {
    case 'first_poem': return `已背 ${memorizedCount}/1 首`
    case 'streak3':    return `已连续 ${streak.count}/3 天`
    case 'streak7':    return `已连续 ${streak.count}/7 天`
    case 'poems5':     return `已背 ${memorizedCount}/5 首`
    case 'poems15':    return `已背 ${memorizedCount}/15 首`
    case 'poems30':    return `已背 ${memorizedCount}/30 首`
    case 'poems70':    return `已背 ${memorizedCount}/70 首`
    case 'streak30':   return `已连续 ${streak.count}/30 天`
    default: return undefined
  }
}

export function useAchievements(input: Input): Badge[] {
  const [dates, setDates] = useState<Record<string, string>>({})

  useEffect(() => {
    storage.get(STORAGE_KEY).then(raw => {
      try { setDates(raw ? JSON.parse(raw) : {}) } catch { /* ignore */ }
    })
  }, [])

  const unlocked = computeUnlocked(input)

  useEffect(() => {
    storage.get(STORAGE_KEY).then(raw => {
      const current: Record<string, string> = (() => { try { return raw ? JSON.parse(raw) : {} } catch { return {} } })()
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
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    unlocked.first_poem, unlocked.streak3, unlocked.streak7,
    unlocked.poems5, unlocked.poems15, unlocked.poems30,
    unlocked.poems70, unlocked.no_hint, unlocked.streak30,
  ])

  return ACHIEVEMENT_DEFS.map(def => ({
    ...def,
    unlocked: unlocked[def.id] ?? false,
    unlockedAt: dates[def.id] ?? null,
    progress: unlocked[def.id] ? undefined : getProgress(def.id, input),
  }))
}
