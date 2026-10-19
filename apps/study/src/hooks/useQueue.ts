import { useState, useCallback, useEffect } from 'react'
import { storage } from '../lib/storage'

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

async function load(): Promise<QueueStore> {
  try {
    const raw = await storage.get(QUEUE_KEY)
    const data: QueueStore = raw ? JSON.parse(raw) : getDefault()
    if (data.last_complete_date !== todayStr()) {
      data.today_complete = false
    }
    return data
  } catch {
    return getDefault()
  }
}

async function save(data: QueueStore) {
  await storage.set(QUEUE_KEY, JSON.stringify(data))
}

export function useQueue() {
  const [store, setStore] = useState<QueueStore>(getDefault)

  useEffect(() => {
    load().then(setStore)
  }, [])

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
        const d = new Date(today + 'T00:00:00')
        d.setDate(d.getDate() - 1)
        const yesterday = d.toISOString().slice(0, 10)
        const isConsecutive = prev.last_complete_date === yesterday
        next.streak_count = isConsecutive ? prev.streak_count + 1 : 1
        next.last_complete_date = today
        next.today_complete = true
      }
      return next
    })
  }, [update])

  const isInQueue = useCallback((id: number) => store.queue.includes(id), [store.queue])

  const reorderQueue = useCallback((from: number, to: number) => {
    update(prev => {
      const next = [...prev.queue]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return { ...prev, queue: next }
    })
  }, [update])

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
    reorderQueue,
  }
}
