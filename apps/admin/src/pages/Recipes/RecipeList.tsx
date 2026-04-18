import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminRecipesApi } from '../../api/recipes'
import Pagination from '../../components/Pagination'
import type { Recipe } from '../../types'
import styles from './Recipes.module.css'

const DIFFICULTY_LABEL = { easy: '简单', medium: '中等', hard: '复杂' }

export default function RecipeList() {
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)

  const LIMIT = 20

  useEffect(() => {
    setLoading(true)
    adminRecipesApi.list({ keyword, page, limit: LIMIT })
      .then(res => { setRecipes(res.data); setTotal(res.total); setLoading(false) })
      .catch(() => setLoading(false))
  }, [keyword, page])

  function handleSearch() {
    setKeyword(searchInput.trim())
    setPage(1)
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`确认删除菜谱「${name}」？`)) return
    setDeleting(id)
    try {
      await adminRecipesApi.delete(id)
      setRecipes(prev => prev.filter(r => r.id !== id))
      setTotal(prev => prev - 1)
    } catch (e) {
      alert(e instanceof Error ? e.message : '删除失败')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>菜谱管理</h1>
        <button className="btn-primary" onClick={() => navigate('/recipes/new')}>
          + 新建菜谱
        </button>
      </div>

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          type="text"
          placeholder="搜索菜名..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn-secondary" onClick={handleSearch}>搜索</button>
        {keyword && (
          <button className="btn-secondary" onClick={() => { setKeyword(''); setSearchInput('') }}>
            清除
          </button>
        )}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>菜名</th>
              <th>菜系</th>
              <th>难度</th>
              <th>烹饪时长</th>
              <th>来源</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className={styles.center}>加载中...</td></tr>
            ) : recipes.length === 0 ? (
              <tr><td colSpan={7} className={styles.center}>暂无数据</td></tr>
            ) : (
              recipes.map(r => (
                <tr key={r.id}>
                  <td className={styles.idCell}>{r.id}</td>
                  <td className={styles.nameCell}>{r.name}</td>
                  <td>{r.cuisine}</td>
                  <td>{DIFFICULTY_LABEL[r.difficulty] ?? r.difficulty}</td>
                  <td>{r.cook_time} 分钟</td>
                  <td>
                    <span className={`${styles.badge} ${r.source === 'system' ? styles.badgeSystem : styles.badgeUser}`}>
                      {r.source === 'system' ? '系统' : '用户'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.editBtn} onClick={() => navigate(`/recipes/${r.id}/edit`)}>
                        编辑
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(r.id, r.name)}
                        disabled={deleting === r.id}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination total={total} page={page} limit={LIMIT} onChange={setPage} />
    </div>
  )
}
