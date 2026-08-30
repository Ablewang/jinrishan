import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BeadCanvas } from '../components/BeadCanvas'
import { Header } from '../components/Header'
import { MaterialList } from '../components/MaterialList'
import { fetchItem } from '../hooks/useData'
import type { ItemDetail } from '../types'
import styles from './DetailPage.module.css'

function fmt(n: number) { return n.toLocaleString('zh-CN') }

interface Props {
  cat: string
  name: string
  onBack: () => void
}

export function DetailPage({ cat, name, onBack }: Props) {
  const [item, setItem]           = useState<ItemDetail | null>(null)
  const [error, setError]         = useState(false)
  const [activeCode, setActive]   = useState<string | null>(null)
  const [showOriginal, setShowOg] = useState(false)
  const matListRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setItem(null); setError(false); setActive(null); setShowOg(false)
    fetchItem(cat, name).then(setItem).catch(() => setError(true))
  }, [cat, name])

  const sortedMats = useMemo(
    () => item ? [...item.materials].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' })) : [],
    [item]
  )

  const handleMatSelect = useCallback((code: string | null) => {
    setActive(code)
    if (code && matListRef.current) {
      const row = matListRef.current.querySelector<HTMLElement>(`[data-code="${code}"]`)
      if (row) {
        const listRect = matListRef.current.getBoundingClientRect()
        const rowRect  = row.getBoundingClientRect()
        matListRef.current.scrollTop += rowRect.top - listRect.top - matListRef.current.clientHeight / 2 + row.clientHeight / 2
      }
    }
  }, [])

  if (error) {
    return (
      <div className={styles.page}>
        <Header onBack={onBack} title="加载失败" />
        <div className={styles.err}>无法加载物品数据</div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className={styles.page}>
        <Header onBack={onBack} title="加载中..." />
        <div className={styles.loading}>数据加载中</div>
      </div>
    )
  }

  const toggleBtn = (
    <button className={styles.viewBtn} onClick={() => setShowOg(v => !v)}>
      {showOriginal ? '查看拼豆' : '查看原图'}
    </button>
  )

  return (
    <div className={styles.page}>
      <Header
        onBack={onBack}
        title={`${item.display_name} 拼豆预览 (${item.board_size}×${item.board_size})`}
        right={toggleBtn}
      />
      <div className={styles.body}>
        <BeadCanvas
          item={item}
          activeCode={showOriginal ? null : activeCode}
          onCellClick={showOriginal ? () => {} : handleMatSelect}
          showOriginal={showOriginal}
          originalSrc={`/gallery/${encodeURIComponent(cat)}/${name}.png`}
        />
        <div className={styles.matSection}>
          <div className={styles.matHeader}>
            <span>材料清单</span>
            <span className={styles.matSummary}>{item.color_count} 色 · {fmt(item.total_beads)} 颗</span>
          </div>
          <div className={styles.matScroll} ref={matListRef}>
            <MaterialList
              materials={sortedMats}
              activeCode={activeCode}
              onSelect={handleMatSelect}
              showPct
            />
          </div>
        </div>
      </div>
    </div>
  )
}

