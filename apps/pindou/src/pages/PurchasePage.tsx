import { useEffect, useMemo, useState } from 'react'
import { Header } from '../components/Header'
import { fetchItem } from '../hooks/useData'
import { usePalette } from '../hooks/usePalette'
import { useStore } from '../hooks/useStore'
import type { Material } from '../types'
import styles from './PurchasePage.module.css'
import { sortByCode } from '../utils'

interface NeedItem extends Material {
  need: number
}

interface Props {
  onBack: () => void
}

function fmt(n: number) { return n.toLocaleString('zh-CN') }

function getGroup(code: string) {
  return code.match(/^[A-Za-z]+/)?.[0].toUpperCase() ?? '?'
}

export function PurchasePage({ onBack }: Props) {
  const { wishlist, inventory } = useStore()
  const { palette } = usePalette()
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState<Map<string, Material>>(new Map())

  useEffect(() => {
    if (wishlist.items.length === 0) { setTotals(new Map()); setLoading(false); return }
    setLoading(true)
    Promise.all(
      wishlist.items.map(i => fetchItem(i.cat, i.name, palette).catch(() => null))
    ).then(results => {
      const map = new Map<string, Material>()
      for (const item of results) {
        if (!item) continue
        for (const m of item.materials) {
          const existing = map.get(m.code)
          if (existing) existing.count += m.count
          else map.set(m.code, { ...m })
        }
      }
      setTotals(map)
      setLoading(false)
    })
  }, [wishlist.items, palette])

  const needItems = useMemo<NeedItem[]>(() => {
    return [...totals.values()]
      .map(m => ({ ...m, need: Math.max(0, m.count - inventory.get(m.code)) }))
      .sort((a, b) => sortByCode(a.code, b.code))
  }, [totals, inventory.inventory])

  const toBuy = needItems.filter(i => i.need > 0)
  const satisfied = needItems.filter(i => i.need === 0)

  function groupByLetter<T extends { code: string }>(items: T[]): Map<string, T[]> {
    const map = new Map<string, T[]>()
    for (const item of items) {
      const g = getGroup(item.code)
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(item)
    }
    return map
  }

  const toBuyGroups = useMemo(() => groupByLetter(toBuy), [toBuy])
  const satisfiedGroups = useMemo(() => groupByLetter(satisfied), [satisfied])

  function renderRow(m: NeedItem, isBuy: boolean) {
    return (
      <div key={m.code} className={`${styles.row} ${isBuy ? '' : styles.rowOk}`}>
        <div className={styles.swatch} style={{ background: `rgb(${m.rgb[0]},${m.rgb[1]},${m.rgb[2]})` }} />
        <div className={styles.info}>
          <span className={styles.code}>{m.code}</span>
          <span className={styles.name}>{m.name}</span>
        </div>
        <div className={styles.counts}>
          {isBuy
            ? <><span className={styles.need}>需购 {fmt(m.need)}</span><span className={styles.total}>共需 {fmt(m.count)} · 已有 {fmt(inventory.get(m.code))}</span></>
            : <><span className={styles.ok}>已有 {fmt(inventory.get(m.code))} ✓</span><span className={styles.total}>共需 {fmt(m.count)}</span></>
          }
        </div>
      </div>
    )
  }

  function renderGroups(groups: Map<string, NeedItem[]>, isBuy: boolean) {
    return [...groups.entries()].map(([letter, items]) => (
      <div key={letter} className={styles.letterGroup}>
        <div className={styles.letterHeader}>{letter} 系</div>
        {items.map(m => renderRow(m, isBuy))}
      </div>
    ))
  }

  return (
    <div className={styles.page}>
      <Header onBack={onBack} title="购买清单" />
      {loading ? (
        <div className={styles.loading}>计算中...</div>
      ) : needItems.length === 0 ? (
        <div className={styles.empty}>收藏夹为空</div>
      ) : (
        <div className={styles.content}>
          <div className={styles.stat}>
            <span className={styles.statNeed}>{toBuy.length} 种待购买</span>
            <span className={styles.statOk}>{satisfied.length} 种已满足</span>
          </div>

          {toBuy.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>待购买</div>
              {renderGroups(toBuyGroups, true)}
            </div>
          )}

          {satisfied.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>已满足</div>
              {renderGroups(satisfiedGroups, false)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
