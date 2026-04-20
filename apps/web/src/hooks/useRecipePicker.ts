import { useState, useEffect, useCallback, useRef } from 'react'
import { recommendApi } from '../api/recommend'
import { recipesApi } from '../api/recipes'
import type { Recipe } from '../types'

interface Options {
  mealType: string
  familyId: number
  excludeIds?: number[]
}

export function useRecipePicker({ mealType, familyId, excludeIds = [] }: Options) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [query, setQuery] = useState('')
  const isSearchMode = query.trim().length > 0
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setQuery('')
    recommendApi.get({ family_id: familyId, meal_type: mealType, exclude_ids: excludeIds })
      .then(results => {
        if (!cancelled) setRecipes(results)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [mealType, familyId]) // eslint-disable-line react-hooks/exhaustive-deps

  const search = useCallback((q: string) => {
    setQuery(q)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)

    if (!q.trim()) {
      setLoading(true)
      recommendApi.get({ family_id: familyId, meal_type: mealType, exclude_ids: excludeIds })
        .then(results => { setRecipes(results); setLoading(false) })
        .catch(() => setLoading(false))
      return
    }

    searchTimeout.current = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await recipesApi.list({ keyword: q.trim(), limit: 20 })
        setRecipes(results.filter(r => !excludeIds.includes(r.id)))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [familyId, mealType]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(async () => {
    setLoadingMore(true)
    try {
      if (isSearchMode) {
        const results = await recipesApi.list({ keyword: query.trim(), limit: 20, offset: recipes.length })
        setRecipes(prev => {
          const existIds = new Set(prev.map(r => r.id))
          return [...prev, ...results.filter(r => !existIds.has(r.id) && !excludeIds.includes(r.id))]
        })
      } else {
        const currentIds = recipes.map(r => r.id)
        const results = await recommendApi.get({
          family_id: familyId,
          meal_type: mealType,
          exclude_ids: [...excludeIds, ...currentIds],
        })
        setRecipes(prev => {
          const existIds = new Set(prev.map(r => r.id))
          return [...prev, ...results.filter(r => !existIds.has(r.id))]
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMore(false)
    }
  }, [isSearchMode, query, recipes, familyId, mealType]) // eslint-disable-line react-hooks/exhaustive-deps

  return { recipes, loading, loadingMore, query, isSearchMode, search, loadMore }
}
