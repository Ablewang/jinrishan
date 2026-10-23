import { useMemo, useRef, useState } from 'react'
import { Header } from '../components/Header'
import { MaterialList } from '../components/MaterialList'
import { useData } from '../hooks/useData'
import { usePalette } from '../hooks/usePalette'
import type { Material } from '../types'
import styles from './SummaryPage.module.css'

const CAT_ZH: Record<string, string> = {
  'Building Blocks': '建筑方块',
  'Combat':          '战斗',
  'Decorations':     '装饰',
  'Food & Drinks':   '食物与饮料',
  'Food and Drinks': '食物与饮料',
  'Materials':       '材料',
  'Miscellaneous':   '杂项',
  'Redstone':        '红石',
  'Spawn Eggs':      '刷怪蛋',
  'Tools':           '工具',
}

interface Props {
  onBack: () => void
}

export function SummaryPage({ onBack }: Props) {
  const { summary } = useData()
  const { palette, setPalette } = usePalette()
  const [curTab, setCur] = useState(0)
  const tabBarRef = useRef<HTMLDivElement>(null)

  const cats = summary ? Object.keys(summary.categories) : []
  const tabs = ['总计', ...cats]

  const total = useMemo<Material[]>(() => {
    if (!summary) return []
    const map = new Map<string, Material>()
    for (const cd of Object.values(summary.categories)) {
      for (const m of cd.materials) {
        const existing = map.get(m.code)
        if (existing) existing.count += m.count
        else map.set(m.code, { ...m })
      }
    }
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code))
  }, [summary])

  const mats = useMemo<Material[]>(() => {
    if (!summary) return []
    if (curTab === 0) return total
    const cat = cats[curTab - 1]
    return [...summary.categories[cat].materials].sort((a, b) => a.code.localeCompare(b.code))
  }, [summary, curTab, cats, total])

  // tab drag scroll
  let drag = false, sx = 0, sl = 0
  const tabDragHandlers = {
    onMouseDown: (e: React.MouseEvent) => { drag = true; sx = e.pageX; sl = tabBarRef.current?.scrollLeft ?? 0; tabBarRef.current?.classList.add(styles.grabbing) },
    onMouseLeave: () => { drag = false; tabBarRef.current?.classList.remove(styles.grabbing) },
    onMouseUp: () => { drag = false; tabBarRef.current?.classList.remove(styles.grabbing) },
    onMouseMove: (e: React.MouseEvent) => {
      if (!drag || !tabBarRef.current) return
      e.preventDefault()
      tabBarRef.current.scrollLeft = sl - (e.pageX - sx)
    },
  }

  const paletteSegment = (
    <div className={styles.segment}>
      <button
        className={`${styles.segBtn} ${palette === 'full' ? styles.segActive : ''}`}
        onClick={() => setPalette('full')}
      >完整色</button>
      <button
        className={`${styles.segBtn} ${palette === '221' ? styles.segActive : ''}`}
        onClick={() => setPalette('221')}
      >221色</button>
    </div>
  )

  return (
    <div className={styles.page}>
      <Header
        left={<button className={styles.catBtn} onClick={onBack}>分类</button>}
        right={paletteSegment}
      />
      <div className={styles.tabBar} ref={tabBarRef} {...tabDragHandlers}>
        {tabs.map((t, i) => (
          <button
            key={t}
            className={`${styles.tab} ${i === curTab ? styles.active : ''}`}
            onClick={() => setCur(i)}
          >
            {i === 0 ? t : (CAT_ZH[t] ?? t)}
          </button>
        ))}
      </div>
      <div className={styles.content}>
        <MaterialList materials={mats} activeCode={null} onSelect={() => {}} />
      </div>
    </div>
  )
}
