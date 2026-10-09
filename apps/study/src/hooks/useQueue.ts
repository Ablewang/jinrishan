import { useState, useCallback } from 'react'

export interface QueueStore {
  queue: number[]
  streak_count: number
  last_complete_date: string | null
  today_complete: boolean
}

const QUEUE_KEY = 'poem_queue'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function getDefault(): QueueStore {
  return { queue: [], streak_count: 0, last_complete_date: null, today_complete: false }
}

function load(): QueueStore {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const data: QueueStore = raw ? JSON.parse(raw) : getDefault()
    // 跨日重置
    if (data.last_complete_date !== todayStr()) {
      data.today_complete = false
    }
    return data
  } catch {
    return getDefault()
  }
}

function save(data: QueueStore) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
}

export function useQueue() {
  const [store, setStore] = useState<QueueStore>(load)

  const update = useCallback((updater: (prev: QueueStore) => QueueStore) => {
    setStore(prev => {
      const next = updater(prev)
      save(next)
      return next
    })
  }, [])

  const addToQueue = useCallback((id: number) => {
    update(prev => {
      if (prev.queue.includes(id)) return prev
      return { ...prev, queue: [...prev.queue, id] }
    })
  }, [update])

  const removeFromQueue = useCallback((id: number) => {
    update(prev => ({ ...prev, queue: prev.queue.filter(q => q !== id) }))
  }, [update])

  const completePoem = useCallback((id: number) => {
    update(prev => {
      const today = todayStr()
      const next = { ...prev, queue: prev.queue.filter(q => q !== id) }
      if (!prev.today_complete) {
        next.streak_count = prev.streak_count + 1
        next.last_complete_date = today
        next.today_complete = true
      }
      return next
    })
  }, [update])

  const isInQueue = useCallback((id: number) => store.queue.includes(id), [store.queue])

  // 久违：上次完成距今超过 1 天
  const isReturning = (() => {
    if (!store.last_complete_date) return false
    const last = new Date(store.last_complete_date)
    const today = new Date(todayStr())
    const diff = (today.getTime() - last.getTime()) / 86400000
    return diff > 1
  })()

  return {
    queue: store.queue,
    streakCount: store.streak_count,
    todayComplete: store.today_complete,
    isReturning,
    addToQueue,
    removeFromQueue,
    completePoem,
    isInQueue,
  }
}
