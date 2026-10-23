import { useMemo, useRef, useState } from 'react'
import { Header } from '../components/Header'
import { PaletteSegment } from '../components/PaletteSegment'
import { useData } from '../hooks/useData'
import { useStore } from '../hooks/useStore'
import { sortByCode } from '../utils'
import type { Material } from '../types'
import styles from './InventoryPage.module.css'
import { ArrowRightIcon } from '../components/Icon'

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
  { label: '很多', value: 2000 },
]

export function InventoryPage({ onBack }: Props) {
  const { summary } = useData()
  const { inventory } = useStore()
  const [openCode, setOpenCode] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  function toggleGroup(letter: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(letter)) next.delete(letter)
      else next.add(letter)
      return next
    })
  }

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

  function toggleOpen(code: string) {
    if (openCode === code) {
      setOpenCode(null)
      return
    }
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
        <Header onBack={onBack} title="拼豆管理" right={<PaletteSegment />} />
        <div className={styles.loading}>加载中...</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Header onBack={onBack} title="拼豆管理" right={<PaletteSegment />} />
      <div className={styles.content}>
        {[...groups.entries()].map(([letter, items]) => (
          <div key={letter} className={styles.group}>
            <div className={`${styles.groupHeader} ${collapsedGroups.has(letter) ? styles.groupCollapsed : ''}`} onClick={() => toggleGroup(letter)}>
              <span>{letter} 系</span>
              <ArrowRightIcon className={`${styles.groupArrow} ${collapsedGroups.has(letter) ? '' : styles.groupArrowDown}`} />
            </div>
            <div className={`${styles.groupItems} ${collapsedGroups.has(letter) ? styles.groupItemsCollapsed : ''}`}>
            <div className={styles.groupItemsInner}>
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
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
