import { Search } from 'lucide-react'
import { useRecipePicker } from '../../hooks/useRecipePicker'
import type { Recipe } from '../../types'
import styles from './index.module.css'

interface Props {
  mealType: string
  familyId: number
  excludeIds?: number[]
  mode: 'single' | 'multi'
  selectedIds?: Set<number>
  onSelect?: (recipe: Recipe) => void
  onToggle?: (recipe: Recipe) => void
}

export default function RecipePicker({
  mealType, familyId, excludeIds = [], mode, selectedIds, onSelect, onToggle
}: Props) {
  const { recipes, loading, loadingMore, query, search, loadMore } = useRecipePicker({
    mealType, familyId, excludeIds,
  })

  function handleClick(recipe: Recipe) {
    if (mode === 'single') onSelect?.(recipe)
    else onToggle?.(recipe)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.searchBox}>
        <Search size={14} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          type="text"
          placeholder="搜索菜名…"
          value={query}
          onChange={e => search(e.target.value)}
        />
        {query && (
          <button className={styles.searchClear} onClick={() => search('')}>×</button>
        )}
      </div>

      {loading ? (
        <div className={styles.loading}><div className={styles.loadingIcon} /></div>
      ) : recipes.length === 0 ? (
        <div className={styles.empty}>
          {query ? `没有找到"${query}"相关菜谱` : '暂无推荐'}
        </div>
      ) : (
        <>
          {recipes.map(recipe => {
            const isSelected = selectedIds?.has(recipe.id) ?? false
            return (
              <div
                key={recipe.id}
                className={`${styles.row} ${isSelected ? styles.rowSelected : ''}`}
                onClick={() => handleClick(recipe)}
              >
                <div className={styles.rowImg}>
                  {recipe.images?.[0]
                    ? <img src={recipe.images[0]} alt={recipe.name} />
                    : <span className={styles.rowImgEmpty}>🍳</span>
                  }
                </div>
                <div className={styles.rowInfo}>
                  <span className={styles.rowName}>{recipe.name}</span>
                  <span className={styles.rowMeta}>
                    {recipe.cook_time}分钟
                    {recipe.cuisine && ` · ${recipe.cuisine}`}
                  </span>
                </div>
                {mode === 'multi' && (
                  <div className={`${styles.check} ${isSelected ? styles.checkActive : ''}`}>✓</div>
                )}
                {mode === 'single' && (
                  <span className={styles.arrow}>›</span>
                )}
              </div>
            )
          })}
          <button className={styles.loadMoreBtn} onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? '...' : query ? '加载更多结果' : '更多推荐'}
          </button>
        </>
      )}
    </div>
  )
}
