import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchItem } from '../../hooks/useData'
import { usePalette } from '../../hooks/usePalette'
import { useStore } from '../../hooks/useStore'
import type { Material } from '../../types'
import { sortByCode } from '../../utils'
import styles from '../PurchasePage.module.css'
import tabStyles from '../InventoryPage.module.css'

interface NeedItem extends Material {
  need: number
}

function fmt(n: number) { return n.toLocaleString('zh-CN') }
function getGroup(code: string) { return code.match(/^[A-Za-z]+/)?.[0].toUpperCase() ?? '?' }

interface Props {
  onStat?: (node: React.ReactNode) => void
}

export function PurchaseTab({ onStat }: Props) {
  const { wishlist, inventory, done } = useStore()
  const { palette } = usePalette()
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState<Map<string, Material>>(new Map())
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const jumpBarRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const groupHeaderRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    const activeItems = wishlist.items.filter(i => !done.has(i.cat, i.name))
    if (activeItems.length === 0) { setTotals(new Map()); setLoading(false); return }
    setLoading(true)
    Promise.all(
      activeItems.map(i => fetchItem(i.cat, i.name, palette).catch(() => null))
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
  }, [wishlist.items, done.items, palette])

  const needItems = useMemo<NeedItem[]>(() => {
    return [...totals.values()]
      .map(m => ({ ...m, need: Math.max(0, m.count - inventory.get(m.code)) }))
      .sort((a, b) => sortByCode(a.code, b.code))
  }, [totals, inventory.inventory])

  const toBuy = needItems.filter(i => i.need > 0)
  const satisfied = needItems.filter(i => i.need === 0)

  const groups = useMemo(() => {
    const map = new Map<string, NeedItem[]>()
    for (const m of needItems) {
      const g = getGroup(m.code)
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(m)
    }
    return map
  }, [needItems])

  const letters = [...groups.keys()]

  useEffect(() => {
    if (!onStat || loading || needItems.length === 0) { onStat?.(undefined); return }
    onStat(
      <div className={styles.stat}>
        <span className={styles.statNeed}>{toBuy.length} 待购</span>
        <span className={styles.statOk}>{satisfied.length} 已满足</span>
      </div>
    )
    return () => onStat?.(undefined)
  }, [loading, toBuy.length, satisfied.length, needItems.length])

  function getScroller(): HTMLElement | null {
    let el: HTMLElement | null = contentRef.current
    while (el) {
      const s = window.getComputedStyle(el)
      if (s.overflowY === 'auto' || s.overflowY === 'scroll') return el
      el = el.parentElement
    }
    return null
  }

  useEffect(() => {
    const headers = groupHeaderRefs.current
    if (headers.size === 0) return
    const scroller = getScroller()
    if (!scroller) return

    function update() {
      const threshold = jumpBarRef.current?.getBoundingClientRect().bottom ?? 100
      let current: string | null = null
      for (const [letter, el] of headers) {
        if (el.getBoundingClientRect().top <= threshold) current = letter
      }
      setActiveGroup(current)
    }

    scroller.addEventListener('scroll', update, { passive: true })
    update()
    return () => scroller.removeEventListener('scroll', update)
  }, [needItems])

  function scrollToGroup(letter: string) {
    const headerEl = groupHeaderRefs.current.get(letter)
    if (!headerEl) return
    const scroller = getScroller()
    if (!scroller) return
    const scrollerRect = scroller.getBoundingClientRect()
    const headerRect = headerEl.getBoundingClientRect()
    const jumpBarHeight = jumpBarRef.current?.getBoundingClientRect().height ?? 0
    scroller.scrollTop += headerRect.top - scrollerRect.top - 56 - jumpBarHeight
  }

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

  if (loading) return <div className={styles.loading}>计算中...</div>
  if (needItems.length === 0) return <div className={styles.empty}>收藏夹为空</div>

  return (
    <>
      <div className={tabStyles.jumpBar} ref={jumpBarRef}>
        {letters.map(l => (
          <button key={l} className={`${tabStyles.jumpBtn} ${activeGroup === l ? tabStyles.jumpBtnActive : ''}`} onClick={() => scrollToGroup(l)}>{l}</button>
        ))}
      </div>
      <div ref={contentRef}>
        {[...groups.entries()].map(([letter, items]) => (
          <div key={letter}>
            <div className={styles.letterHeader} ref={el => { if (el) groupHeaderRefs.current.set(letter, el) }}>{letter} 系</div>
            {items.map(m => renderRow(m, m.need > 0))}
          </div>
        ))}
      </div>
    </>
  )
}
