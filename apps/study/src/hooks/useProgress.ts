import { useState, useCallback } from 'react'

interface PoemState {
  read: boolean
  memorized: boolean
}

type Progress = Record<string, PoemState>

const STORAGE_KEY = 'poem_progress'

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveProgress(p: Progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    // ignore
  }
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(loadProgress)

  const update = useCallback((id: number, patch: Partial<PoemState>) => {
    setProgress(prev => {
      const key = String(id)
      const next = { ...prev, [key]: { read: false, memorized: false, ...prev[key], ...patch } }
      saveProgress(next)
      return next
    })
  }, [])

  const getState = useCallback((id: number): PoemState => {
    return progress[String(id)] ?? { read: false, memorized: false }
  }, [progress])

  const markRead = useCallback((id: number) => update(id, { read: true }), [update])
  const markMemorized = useCallback((id: number) => update(id, { read: true, memorized: true }), [update])

  const totalMemorized = Object.values(progress).filter(s => s.memorized).length

  return { getState, markRead, markMemorized, totalMemorized }
}
