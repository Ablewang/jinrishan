import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
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
      <div className={styles.illustration}>
        <div className={styles.circle}></div>
        <Lock className={styles.icon} size={20} strokeWidth={1.5} />
      </div>
      
      <div className={styles.textWrap}>
        <span className={styles.overline}>Members Only</span>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.desc}>{desc}</p>
      </div>

      <div className={styles.actionWrap}>
        <Link to="/auth/login" className={styles.btn}>
          立即登录 / 注册
        </Link>
        <Link to="/home" className={styles.backLink}>
          返回首页
        </Link>
      </div>
    </div>
  )
}