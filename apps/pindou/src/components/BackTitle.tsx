import { ArrowLeftIcon } from './Icon'
import styles from './BackTitle.module.css'

interface Props {
  title: string
  onBack: () => void
}

export function BackTitle({ title, onBack }: Props) {
  return (
    <button className={styles.btn} onClick={onBack}>
      <ArrowLeftIcon className={styles.icon} />
      {title}
    </button>
  )
}
