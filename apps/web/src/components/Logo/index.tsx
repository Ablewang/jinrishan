import styles from './Logo.module.css'

interface LogoProps {
  className?: string
  onClick?: () => void
}

export default function Logo({ className = '', onClick }: LogoProps) {
  return (
    <div className={`${styles.logo} ${className}`} onClick={onClick}>
      <div className={styles.hanzi}>膳</div>
      <div className={styles.divider} />
      <div className={styles.meta}>
        <div className={styles.pinyin}>/ shàn /</div>
        <div className={styles.brand}>JINRI</div>
      </div>
    </div>
  )
}