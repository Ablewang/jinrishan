import { useEffect, useState } from 'react'
import { adminUsersApi } from '../../api/users'
import Pagination from '../../components/Pagination'
import type { User } from '../../types'
import styles from './Users.module.css'

export default function UserList() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)
  const LIMIT = 20

  useEffect(() => {
    setLoading(true)
    adminUsersApi.list({ keyword, page, limit: LIMIT })
      .then(res => { setUsers(res.data); setTotal(res.total); setLoading(false) })
      .catch(() => setLoading(false))
  }, [keyword, page])

  function handleSearch() { setKeyword(searchInput.trim()); setPage(1) }

  return (
    <div>
      <h1 className={styles.title}>用户列表</h1>
      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder="搜索手机号..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn-secondary" onClick={handleSearch}>搜索</button>
        {keyword && <button className="btn-secondary" onClick={() => { setKeyword(''); setSearchInput('') }}>清除</button>}
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr><th>ID</th><th>手机号</th><th>昵称</th><th>注册时间</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className={styles.center}>加载中...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className={styles.center}>暂无用户</td></tr>
            ) : users.map(u => (
              <tr key={u.id}>
                <td className={styles.idCell}>{u.id}</td>
                <td>{u.phone}</td>
                <td>{u.name ?? '-'}</td>
                <td className={styles.dateCell}>{new Date(u.created_at).toLocaleDateString('zh-CN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination total={total} page={page} limit={LIMIT} onChange={setPage} />
    </div>
  )
}
