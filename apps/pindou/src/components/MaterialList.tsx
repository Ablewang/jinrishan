import type { Material } from '../types'
import styles from './MaterialList.module.css'

interface Props {
  materials: Material[]
  activeCode: string | null
  onSelect: (code: string | null) => void
  showPct?: boolean
}

function fmt(n: number) { return n.toLocaleString('zh-CN') }
function rgb([r, g, b]: [number, number, number]) { return `rgb(${r},${g},${b})` }

export function MaterialList({ materials, activeCode, onSelect, showPct }: Props) {
  return (
    <div className={styles.list}>
      {materials.map(m => (
        <div
          key={m.code}
          className={`${styles.row} ${activeCode === m.code ? styles.active : ''}`}
          onClick={() => onSelect(activeCode === m.code ? null : m.code)}
        >
          <div className={styles.swatch} style={{ background: rgb(m.rgb) }} />
          <span className={styles.code}>{m.code}</span>
          <span className={styles.name}>{m.name}</span>
          <span className={styles.count}>{fmt(m.count)}</span>
          {showPct && <span className={styles.pct}>({m.pct}%)</span>}
        </div>
      ))}
    </div>
  )
}
