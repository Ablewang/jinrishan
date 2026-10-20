import { useState, useEffect } from 'react'
import { buildHeatmap } from '../lib/progressStats'
import type { HeatmapDay } from '../lib/progressStats'

const DOW = ['一', '二', '三', '四', '五', '六', '日']

function heatColor(count: number): string {
  if (count === 0) return 'var(--border)'
  if (count === 1) return '#FFCDD2'
  if (count <= 3) return '#E57373'
  return '#C62828'
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

function currentYM(): string {
  return new Date().toISOString().slice(0, 7)
}

export default function HeatmapChart() {
  const [ym, setYm] = useState(currentYM)
  const [days, setDays] = useState<HeatmapDay[]>([])
  const [tooltip, setTooltip] = useState<HeatmapDay | null>(null)

  useEffect(() => {
    buildHeatmap(ym).then(setDays)
    setTooltip(null)
  }, [ym])

  const [year, month] = ym.split('-').map(Number)
  const isCurrentMonth = ym === currentYM()

  // 第一天是周几（周一=0）
  const firstDow = (new Date(`${ym}-01T00:00:00`).getDay() + 6) % 7

  // 日历格子：前置空白 + 每天
  const cells: (HeatmapDay | null)[] = [
    ...Array(firstDow).fill(null),
    ...days,
  ]

  const totalCount = days.reduce((s, d) => s + d.count, 0)
  const activeDays = days.filter(d => d.count > 0).length

  return (
    <div>
      {/* 月份导航 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button
          onClick={() => setYm(prevMonth(ym))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-light)', fontSize: 18, padding: '0 4px', lineHeight: 1 }}
        >‹</button>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
          {year}年{month}月
        </span>
        <button
          onClick={() => setYm(nextMonth(ym))}
          disabled={isCurrentMonth}
          style={{ background: 'none', border: 'none', cursor: isCurrentMonth ? 'default' : 'pointer', color: isCurrentMonth ? 'var(--border)' : 'var(--ink-light)', fontSize: 18, padding: '0 4px', lineHeight: 1 }}
        >›</button>
      </div>

      {/* 周几标题 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {DOW.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--ink-light)' }}>{d}</div>
        ))}
      </div>

      {/* 日历格子 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />
          const isActive = tooltip?.date === day.date
          const dayNum = Number(day.date.slice(8))
          return (
            <div
              key={day.date}
              onClick={() => setTooltip(t => t?.date === day.date ? null : day.count > 0 ? day : null)}
              style={{
                aspectRatio: '1',
                borderRadius: 5,
                background: heatColor(day.count),
                cursor: day.count > 0 ? 'pointer' : 'default',
                outline: isActive ? '2px solid #C62828' : 'none',
                outlineOffset: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{
                fontSize: '10px',
                color: day.count >= 2 ? '#fff' : day.count === 1 ? '#C62828' : 'var(--ink-light)',
                fontWeight: day.count > 0 ? 700 : 400,
                lineHeight: 1,
              }}>
                {dayNum}
              </span>
            </div>
          )
        })}
      </div>

      {/* tooltip */}
      {tooltip && (
        <div style={{
          marginTop: 8, padding: '6px 12px',
          background: 'rgba(198,40,40,0.08)', borderRadius: 8,
          fontSize: '12px', color: 'var(--ink)', textAlign: 'center',
        }}>
          {tooltip.date.slice(5).replace('-', '月')}日 · 背了 {tooltip.count} 首 · {tooltip.stars} 星
        </div>
      )}

      {/* 底部：图例左，统计右 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: '10px', color: 'var(--ink-light)' }}>少</span>
          {['var(--border)', '#FFCDD2', '#E57373', '#C62828'].map(c => (
            <div key={c} style={{ width: 11, height: 11, borderRadius: 2, background: c }} />
          ))}
          <span style={{ fontSize: '10px', color: 'var(--ink-light)' }}>多</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ fontSize: '11px', color: 'var(--ink-light)' }}>背诵 <strong style={{ color: 'var(--ink)' }}>{totalCount}</strong> 次</span>
          <span style={{ fontSize: '11px', color: 'var(--ink-light)' }}>活跃 <strong style={{ color: 'var(--ink)' }}>{activeDays}</strong> 天</span>
        </div>
      </div>
    </div>
  )
}
