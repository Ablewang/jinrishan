import { useEffect, useState } from 'react'
import { adminUsersApi } from '../../api/users'
import Pagination from '../../components/Pagination'
import type { Family } from '../../types'
import styles from './Users.module.css'

export default function FamilyList() {
  const [families, setFamilies] = useState<Family[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const LIMIT = 20

  useEffect(() => {
    setLoading(true)
    adminUsersApi.families({ page, limit: LIMIT })
      .then(res => { setFamilies(res.data); setTotal(res.total); setLoading(false) })
      .catch(() => setLoading(false))
  }, [page])

  return (
    <div>
      <h1 className={styles.title}>家庭列表</h1>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr><th>ID</th><th>家庭名</th><th>邀请码</th><th>成员数</th><th>创建时间</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className={styles.center}>加载中...</td></tr>
            ) : families.length === 0 ? (
              <tr><td colSpan={5} className={styles.center}>暂无家庭</td></tr>
            ) : families.map(f => (
              <tr key={f.id}>
                <td className={styles.idCell}>{f.id}</td>
                <td style={{ fontWeight: 500 }}>{f.name}</td>
                <td><code className={styles.code}>{f.invite_code}</code></td>
                <td>{f.member_count}</td>
                <td className={styles.dateCell}>{new Date(f.created_at).toLocaleDateString('zh-CN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination total={total} page={page} limit={LIMIT} onChange={setPage} />
    </div>
  )
}
