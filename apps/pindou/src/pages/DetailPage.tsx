import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BeadCanvas } from '../components/BeadCanvas'
import { Header } from '../components/Header'
import { BackTitle } from '../components/BackTitle'
import { MaterialList } from '../components/MaterialList'
import { fetchItem } from '../hooks/useData'
import { usePalette } from '../hooks/usePalette'
import { useStore } from '../hooks/useStore'
import type { ItemDetail } from '../types'
import { sortByCode } from '../utils'
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
  const { palette } = usePalette()
  const { wishlist } = useStore()
  const inWish = item ? wishlist.has(cat, name) : false

  function toggleWish() {
    if (!item) return
    if (inWish) wishlist.remove(cat, name)
    else wishlist.add({ cat, name, display_name: item.display_name })
  }

  useEffect(() => {
    setItem(null); setError(false); setActive(null); setShowOg(false)
    fetchItem(cat, name, palette).then(setItem).catch(() => setError(true))
  }, [cat, name, palette])

  const sortedMats = useMemo(
    () => item ? [...item.materials].sort((a, b) => sortByCode(a.code, b.code)) : [],
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
        <Header left={<BackTitle title="加载失败" onBack={onBack} />} />
        <div className={styles.err}>无法加载物品数据</div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className={styles.page}>
        <Header left={<BackTitle title="加载中..." onBack={onBack} />} />
        <div className={styles.loading}>数据加载中</div>
      </div>
    )
  }

  const toggleBtn = (
    <button className={styles.viewBtn} onClick={() => setShowOg(v => !v)}>
      {showOriginal ? '查看拼豆' : '查看原图'}
    </button>
  )

  const wishBtn = (
    <button className={`${styles.wishBtn} ${inWish ? styles.wishActive : ''}`} onClick={toggleWish}>
      {inWish ? '已收藏' : '+ 收藏'}
    </button>
  )

  return (
    <div className={styles.page}>
      <Header
        left={<BackTitle title={item.display_name} onBack={onBack} />}
        right={<div style={{ display: 'flex', gap: 8 }}>{wishBtn}{toggleBtn}</div>}
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
            <span className={styles.matSummary}>{item.board_size}×{item.board_size} · {item.color_count} 色 · {fmt(item.total_beads)} 颗</span>
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

