import { usePalette } from '../hooks/usePalette'
import styles from './PaletteSegment.module.css'

export function PaletteSegment() {
  const { palette, setPalette } = usePalette()
  return (
    <div className={styles.segment}>
      <button className={`${styles.segBtn} ${palette === 'full' ? styles.segActive : ''}`} onClick={() => setPalette('full')}>完整色</button>
      <button className={`${styles.segBtn} ${palette === '221' ? styles.segActive : ''}`} onClick={() => setPalette('221')}>221色</button>
    </div>
  )
}
