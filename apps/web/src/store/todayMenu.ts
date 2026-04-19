import { create } from 'zustand'

export interface MealEntry {
  ids: number[]
  names: string[]
}

type MealType = 'breakfast' | 'lunch' | 'dinner'

interface TodayMenuState {
  date: string
  meals: Partial<Record<MealType, MealEntry>>
  confirm: (mealType: MealType, entry: MealEntry) => void
  clear: (mealType: MealType) => void
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function loadFromStorage(): Pick<TodayMenuState, 'date' | 'meals'> {
  try {
    const raw = sessionStorage.getItem('todayMenu')
    if (!raw) return { date: todayStr(), meals: {} }
    const data = JSON.parse(raw) as Pick<TodayMenuState, 'date' | 'meals'>
    if (data.date !== todayStr()) return { date: todayStr(), meals: {} }
    return data
  } catch {
    return { date: todayStr(), meals: {} }
  }
}

function saveToStorage(state: Pick<TodayMenuState, 'date' | 'meals'>) {
  sessionStorage.setItem('todayMenu', JSON.stringify({ date: state.date, meals: state.meals }))
}

export const useTodayMenu = create<TodayMenuState>((set, get) => ({
  ...loadFromStorage(),
  confirm(mealType, entry) {
    set(s => {
      const meals = { ...s.meals, [mealType]: entry }
      saveToStorage({ date: s.date, meals })
      return { meals }
    })
  },
  clear(mealType) {
    set(s => {
      const meals = { ...s.meals }
      delete meals[mealType]
      saveToStorage({ date: s.date, meals })
      return { meals }
    })
  },
}))
