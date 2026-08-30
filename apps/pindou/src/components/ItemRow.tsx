import type { ManifestItem } from '../types'
import styles from './ItemRow.module.css'

interface Props {
  cat: string
  item: ManifestItem
  onClick: () => void
}

function fmt(n: number) { return n.toLocaleString('zh-CN') }

export function ItemRow({ cat, item, onClick }: Props) {
  const src = `/gallery/${encodeURIComponent(cat)}/${item.name}.png`
  return (
    <div className={styles.row} onClick={onClick}>
      <div className={styles.thumb}>
        <img
          src={src}
          alt={item.display_name}
          loading="lazy"
          onError={e => {
            e.currentTarget.style.display = 'none'
            const fb = e.currentTarget.nextElementSibling as HTMLElement
            if (fb) fb.style.display = 'flex'
          }}
        />
        <div className={styles.thumbFb}>{item.display_name.charAt(0)}</div>
      </div>
      <div className={styles.info}>
        <span className={styles.name}>{item.display_name}</span>
        <span className={styles.en}>{item.name}</span>
      </div>
      <div className={styles.beads}>
        <span className={styles.beadN}>{fmt(item.total_beads)}</span>
        <span className={styles.beadU}>颗</span>
      </div>
    </div>
  )
}
