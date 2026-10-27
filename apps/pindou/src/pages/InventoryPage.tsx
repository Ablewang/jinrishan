import { useEffect, useMemo, useRef, useState } from 'react'
import { Header } from '../components/Header'
import { PaletteSegment } from '../components/PaletteSegment'
import { BackTitle } from '../components/BackTitle'
import { useData } from '../hooks/useData'
import { useStore } from '../hooks/useStore'
import { sortByCode } from '../utils'
import type { Material } from '../types'
import styles from './InventoryPage.module.css'

interface Props {
  onBack: () => void
}

function fmt(n: number) { return n.toLocaleString('zh-CN') }

function getGroup(code: string) {
  return code.match(/^[A-Za-z]+/)?.[0].toUpperCase() ?? '?'
}

const PRESETS = [
  { label: '没有', value: 0 },
  { label: '少量', value: 50 },
  { label: '足够', value: 500 },
  { label: '很多', value: 1000 },
]

export function InventoryPage({ onBack }: Props) {
  const { summary } = useData()
  const { inventory } = useStore()
  const [openCode, setOpenCode] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const groupHeaderRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const jumpBarRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const allColors = useMemo<Material[]>(() => {
    if (!summary) return []
    const map = new Map<string, Material>()
    for (const cat of Object.values(summary.categories)) {
      for (const m of cat.materials) {
        if (!map.has(m.code)) map.set(m.code, { ...m, count: 0, pct: 0 })
      }
    }
    return [...map.values()].sort((a, b) => sortByCode(a.code, b.code))
  }, [summary])

  const groups = useMemo(() => {
    const map = new Map<string, Material[]>()
    for (const m of allColors) {
      const g = getGroup(m.code)
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(m)
    }
    return map
  }, [allColors])

  useEffect(() => {
    const headers = groupHeaderRefs.current
    if (headers.size === 0) return
    const scroller = getScroller()
    if (!scroller) return

    function update() {
      const threshold = (jumpBarRef.current?.getBoundingClientRect().bottom ?? 100)
      let current: string | null = null
      for (const [letter, el] of headers) {
        if (el.getBoundingClientRect().top <= threshold) current = letter
      }
      setActiveGroup(current)
    }

    scroller.addEventListener('scroll', update, { passive: true })
    update()
    return () => scroller.removeEventListener('scroll', update)
  }, [allColors])

  function getScroller(): HTMLElement | null {
    let el: HTMLElement | null = contentRef.current
    while (el) {
      const style = window.getComputedStyle(el)
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') return el
      el = el.parentElement
    }
    return null
  }

  function scrollToGroup(letter: string) {
    const headerEl = groupHeaderRefs.current.get(letter)
    if (!headerEl) return
    const scroller = getScroller()
    if (!scroller) return
    const scrollerRect = scroller.getBoundingClientRect()
    const headerRect = headerEl.getBoundingClientRect()
    const jumpBarHeight = jumpBarRef.current?.getBoundingClientRect().height ?? 0
    const headerH = 56
    scroller.scrollTop += headerRect.top - scrollerRect.top - headerH - jumpBarHeight
  }

  function toggleOpen(code: string) {
    if (openCode === code) { setOpenCode(null); return }
    const current = inventory.get(code)
    setOpenCode(code)
    setEditVal(current > 0 ? String(current) : '')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function applyPreset(code: string, value: number) {
    inventory.set(code, value)
    setOpenCode(null)
  }

  function commitInput(code: string) {
    const n = parseInt(editVal) || 0
    inventory.set(code, n)
    setOpenCode(null)
  }

  if (!summary) {
    return (
      <div className={styles.page}>
        <Header left={<BackTitle title="拼豆管理" onBack={onBack} />} right={<PaletteSegment />} />
        <div className={styles.loading}>加载中...</div>
      </div>
    )
  }

  const letters = [...groups.keys()]

  return (
    <div className={styles.page}>
      <Header left={<BackTitle title="拼豆管理" onBack={onBack} />} right={<PaletteSegment />} />
      <div className={styles.jumpBar} ref={jumpBarRef}>
        {letters.map(l => (
          <button key={l} className={`${styles.jumpBtn} ${activeGroup === l ? styles.jumpBtnActive : ''}`} onClick={() => scrollToGroup(l)}>{l}</button>
        ))}
      </div>
      <div className={styles.content} ref={contentRef}>
        {[...groups.entries()].map(([letter, items]) => (
          <div key={letter} className={styles.group}>
            <div
              className={styles.groupHeader}
              ref={el => { if (el) groupHeaderRefs.current.set(letter, el) }}
            >
              {letter} 系
            </div>
            {items.map(m => {
              const stock = inventory.get(m.code)
              const isOpen = openCode === m.code
              return (
                <div key={m.code} className={`${styles.row} ${isOpen ? styles.rowOpen : ''}`}>
                  <div className={styles.rowMain} onClick={() => toggleOpen(m.code)}>
                    <div className={styles.swatch} style={{ background: `rgb(${m.rgb[0]},${m.rgb[1]},${m.rgb[2]})` }} />
                    <div className={styles.info}>
                      <span className={styles.code}>{m.code}</span>
                      <span className={styles.name}>{m.name}</span>
                    </div>
                    <div className={styles.stock}>
                      {stock > 0
                        ? <span className={styles.stockHas}>{fmt(stock)}</span>
                        : <span className={styles.stockNone}>0</span>
                      }
                    </div>
                  </div>
                  {isOpen && (
                    <div className={styles.expandPanel} onClick={e => e.stopPropagation()}>
                      <div className={styles.presets}>
                        {PRESETS.map(p => (
                          <button
                            key={p.label}
                            className={`${styles.presetBtn} ${stock === p.value ? styles.presetActive : ''}`}
                            onClick={() => applyPreset(m.code, p.value)}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <div className={styles.inputRow}>
                        <input
                          ref={inputRef}
                          className={styles.editInput}
                          type="number"
                          min="0"
                          value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') commitInput(m.code) }}
                          placeholder="精确数量"
                        />
                        <button className={styles.confirmBtn} onClick={() => commitInput(m.code)}>确定</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
