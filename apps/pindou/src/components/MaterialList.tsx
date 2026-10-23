import type { Material } from '../types'
import { CheckIcon } from './Icon'
import styles from './MaterialList.module.css'

interface Props {
  materials: Material[]
  activeCode: string | null
  onSelect: (code: string | null) => void
  showPct?: boolean
  inventory?: Record<string, number>
}

function fmt(n: number) { return n.toLocaleString('zh-CN') }
function rgb([r, g, b]: [number, number, number]) { return `rgb(${r},${g},${b})` }

export function MaterialList({ materials, activeCode, onSelect, showPct, inventory }: Props) {
  return (
    <div className={styles.list}>
      {materials.map(m => {
        const stock = inventory ? (inventory[m.code] ?? 0) : null
        const satisfied = stock !== null && stock >= m.count
        const partial = stock !== null && stock > 0 && stock < m.count
        return (
          <div
            key={m.code}
            className={`${styles.row} ${activeCode === m.code ? styles.active : ''}`}
            onClick={() => onSelect(activeCode === m.code ? null : m.code)}
          >
            <div className={styles.swatch} style={{ background: rgb(m.rgb) }} />
            <span className={styles.code}>{m.code}</span>
            <span className={styles.name}>{m.name}</span>
            <span className={`${styles.count} ${stock !== null && !satisfied ? styles.countNeed : ''}`}>{fmt(m.count)}</span>
            {showPct && <span className={styles.pct}>({m.pct}%)</span>}
            {stock !== null && (
              <span className={`${styles.stock} ${satisfied ? styles.stockOk : partial ? styles.stockPartial : styles.stockNone}`}>
                {satisfied ? <CheckIcon className={styles.checkIcon} /> : stock === 0 ? `缺${fmt(m.count)}` : `有${fmt(stock)}缺${fmt(m.count - stock)}`}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
