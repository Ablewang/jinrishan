import { useState, useEffect, useCallback, useRef } from 'react'
import { recommendApi } from '../api/recommend'
import { recipesApi } from '../api/recipes'
import type { Recipe, GuestPrefs } from '../types'

interface Options {
  mealType: string
  familyId: number
  excludeIds?: number[]
  guestPrefs?: GuestPrefs | null
  date?: string
}

export function useRecipePicker({ mealType, familyId, excludeIds = [], guestPrefs, date }: Options) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [query, setQuery] = useState('')
  const isSearchMode = query.trim().length > 0

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  // ref tracks latest excludeIds so loadMore always uses up-to-date value
  const excludeIdsRef = useRef(excludeIds)
  useEffect(() => { excludeIdsRef.current = excludeIds }, [excludeIds])

  function buildParams(excludes: number[]) {
    if (familyId) {
      return { family_id: familyId, meal_type: mealType, exclude_ids: excludes, ...(date ? { date } : {}) }
    }
    return {
      meal_type: mealType,
      allergies: guestPrefs?.allergies ?? [],
      flavors: guestPrefs?.liked_flavors ?? [],
      exclude_ids: excludes,
    }
  }

  const reload = useCallback(async (excludes: number[] = []) => {
    setLoading(true)
    setQuery('')
    try {
      const results = await recommendApi.get(buildParams(excludes))
      setRecipes(results.filter(r => !excludes.includes(r.id)))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [mealType, familyId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    reload(excludeIdsRef.current)
  }, [mealType, familyId]) // eslint-disable-line react-hooks/exhaustive-deps

  const search = useCallback((q: string) => {
    setQuery(q)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)

    if (!q.trim()) {
      reload(excludeIdsRef.current)
      return
    }

    searchTimeout.current = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await recipesApi.list({ keyword: q.trim(), limit: 20 })
        setRecipes(results.filter(r => !excludeIdsRef.current.includes(r.id)))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [mealType, familyId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(async () => {
    setLoadingMore(true)
    try {
      if (isSearchMode) {
        const results = await recipesApi.list({ keyword: query.trim(), limit: 20, offset: recipes.length })
        setRecipes(prev => {
          const existIds = new Set(prev.map(r => r.id))
          return [...prev, ...results.filter(r => !existIds.has(r.id) && !excludeIdsRef.current.includes(r.id))]
        })
      } else {
        setRecipes(prev => {
          const currentIds = prev.map(r => r.id)
          recommendApi.get(buildParams([...excludeIdsRef.current, ...currentIds]))
            .then(results => {
              setRecipes(p => {
                const existIds = new Set(p.map(r => r.id))
                return [...p, ...results.filter(r => !existIds.has(r.id))]
              })
            })
            .catch(console.error)
            .finally(() => setLoadingMore(false))
          return prev
        })
        return
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMore(false)
    }
  }, [isSearchMode, query, recipes.length, mealType, familyId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { recipes, setRecipes, loading, loadingMore, query, isSearchMode, search, loadMore, reload }
}
