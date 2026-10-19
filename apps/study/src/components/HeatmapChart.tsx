import { useState, useEffect } from 'react'
import { buildHeatmap } from '../lib/progressStats'
import type { HeatmapDay } from '../lib/progressStats'

function heatColor(stars: number): string {
  if (stars === 0) return 'var(--border)'
  if (stars <= 2) return '#FFCDD2'
  if (stars <= 5) return '#E57373'
  return '#C62828'
}

function monthLabel(date: string): string {
  const m = Number(date.slice(5, 7))
  return `${m}月`
}

export default function HeatmapChart() {
  const [days, setDays] = useState<HeatmapDay[]>([])
  const [tooltip, setTooltip] = useState<{ date: string; stars: number; count: number } | null>(null)

  useEffect(() => { buildHeatmap().then(setDays) }, [])

  if (days.length === 0) return null

  // 84天，按列（周）×行（周几）排列
  // 第一天是哪个周几
  const firstDay = days[0]
  const firstDow = new Date(firstDay.date + 'T00:00:00').getDay() // 0=周日
  // 转为周一=0
  const firstOffset = (firstDow + 6) % 7

  const SIZE = 11
  const GAP = 3
  const COLS = 12
  const ROWS = 7
  const svgW = COLS * (SIZE + GAP) - GAP
  const svgH = ROWS * (SIZE + GAP) - GAP + 18 // 18px for month labels

  // 月份标签：每列第一个格子所属月份
  const monthLabels: { col: number; label: string }[] = []
  let lastMonth = ''
  for (let col = 0; col < COLS; col++) {
    const idx = col * 7 - firstOffset
    const day = days[Math.max(0, Math.min(idx, days.length - 1))]
    const m = day.date.slice(0, 7)
    if (m !== lastMonth) {
      monthLabels.push({ col, label: monthLabel(day.date) })
      lastMonth = m
    }
  }

  // 每个格子的位置和数据
  const cells = days.map((day, i) => {
    const totalIdx = i + firstOffset
    const col = Math.floor(totalIdx / 7)
    const row = totalIdx % 7
    if (col >= COLS) return null
    return {
      day,
      x: col * (SIZE + GAP),
      y: row * (SIZE + GAP) + 18,
    }
  }).filter(Boolean) as { day: typeof days[0]; x: number; y: number }[]

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ width: '100%', display: 'block' }}
        aria-label="学习热力图"
      >
        {/* 月份标签 */}
        {monthLabels.map(({ col, label }) => (
          <text
            key={col}
            x={col * (SIZE + GAP)}
            y={12}
            fontSize="9"
            fill="var(--ink-light)"
          >{label}</text>
        ))}

        {/* 格子 */}
        {cells.map(({ day, x, y }) => (
          <rect
            key={day.date}
            x={x} y={y}
            width={SIZE} height={SIZE}
            rx={2}
            fill={heatColor(day.stars)}
            style={{ cursor: day.count > 0 ? 'pointer' : 'default' }}
            onMouseEnter={() => day.count > 0 && setTooltip(day)}
            onMouseLeave={() => setTooltip(null)}
            onClick={() => day.count > 0 && setTooltip(t => t?.date === day.date ? null : day)}
          />
        ))}
      </svg>

      {/* tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--ink)', color: '#fff', borderRadius: 6,
          padding: '4px 10px', fontSize: '12px', whiteSpace: 'nowrap',
          pointerEvents: 'none', marginBottom: 4, zIndex: 10,
        }}>
          {tooltip.date.slice(5).replace('-', '月') + '日'} · 背了 {tooltip.count} 首 · {tooltip.stars} 星
        </div>
      )}

      {/* 图例 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '10px', color: 'var(--ink-light)' }}>少</span>
        {['var(--border)', '#FFCDD2', '#E57373', '#C62828'].map(c => (
          <svg key={c} width={SIZE} height={SIZE}><rect width={SIZE} height={SIZE} rx={2} fill={c} /></svg>
        ))}
        <span style={{ fontSize: '10px', color: 'var(--ink-light)' }}>多</span>
      </div>
    </div>
  )
}
