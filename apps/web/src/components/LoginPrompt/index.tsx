import { Link } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'
import styles from './index.module.css'

interface Props {
  title?: string
  desc?: string
}

export default function LoginPrompt({
  title = '登录后可使用此功能',
  desc = '登录后解锁完整功能，获得专属家庭推荐体验',
}: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.icon}>
        <LockKeyhole size={48} strokeWidth={1.5} />
      </div>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.desc}>{desc}</p>
      <Link to="/auth/login" className={styles.btn}>登录 / 注册</Link>
    </div>
  )
}
