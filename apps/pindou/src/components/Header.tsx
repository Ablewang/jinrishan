import styles from './Header.module.css'

const BACK_SVG = (
  <svg viewBox="0 0 1024 1024" width="20" height="20" fill="currentColor">
    <path d="M401.066667 512l302.933333 302.933333-59.733333 59.733334L341.333333 571.733333 281.6 512 341.333333 452.266667l302.933334-302.933334 59.733333 59.733334L401.066667 512z" />
  </svg>
)

interface Props {
  left?: React.ReactNode
  right?: React.ReactNode
  onBack?: () => void
  backHref?: string
  title?: string
}

export function Header({ left, right, onBack, backHref, title }: Props) {
  return (
    <header className={styles.header}>
      {onBack && (
        <button className={styles.back} onClick={onBack} aria-label="返回">
          {BACK_SVG}
        </button>
      )}
      {backHref && !onBack && (
        <a href={backHref} className={styles.back} aria-label="返回">
          {BACK_SVG}
        </a>
      )}
      {left}
      {title && <span className={styles.title}>{title}</span>}
      {right && <><span className={styles.spacer} />{right}</>}
    </header>
  )
}
