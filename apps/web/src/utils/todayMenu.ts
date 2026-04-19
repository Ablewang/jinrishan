const KEY = 'todayMenu'

export interface TodayMealEntry {
  ids: number[]
  names: string[]
}

export interface TodayMenuData {
  date: string
  meals: Partial<Record<'breakfast' | 'lunch' | 'dinner', TodayMealEntry>>
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function getTodayMenu(): TodayMenuData {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return { date: todayStr(), meals: {} }
    const data: TodayMenuData = JSON.parse(raw)
    if (data.date !== todayStr()) return { date: todayStr(), meals: {} }
    return data
  } catch {
    return { date: todayStr(), meals: {} }
  }
}

export function clearMealFromMenu(mealType: 'breakfast' | 'lunch' | 'dinner') {
  const data = getTodayMenu()
  delete data.meals[mealType]
  sessionStorage.setItem(KEY, JSON.stringify(data))
}
  const data = getTodayMenu()
  data.meals[mealType] = entry
  sessionStorage.setItem(KEY, JSON.stringify(data))
}
