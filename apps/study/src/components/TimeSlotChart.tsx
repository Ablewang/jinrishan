import { useState, useEffect } from 'react'
import { buildTimeSlots } from '../lib/progressStats'
import type { TimeSlot } from '../lib/progressStats'

function hourLabel(h: number): string {
  if (h < 6) return '凌晨'
  if (h < 9) return '早晨'
  if (h < 12) return '上午'
  if (h < 14) return '中午'
  if (h < 18) return '下午'
  if (h < 21) return '晚上'
  return '深夜'
}

export default function TimeSlotChart() {
  const [slots, setSlots] = useState<TimeSlot[]>([])

  useEffect(() => { buildTimeSlots().then(setSlots) }, [])

  if (slots.length === 0) {
    return <div style={{ fontSize: '13px', color: 'var(--ink-light)', padding: '12px 0' }}>背诵次数不足，暂无时段数据</div>
  }

  const maxQ = Math.max(...slots.map(s => s.avgQScore), 1)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
        {slots.map(s => {
          const heightPct = (s.avgQScore / maxQ) * 100
          return (
            <div key={s.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              {s.isBest && (
                <span style={{ fontSize: '9px', color: '#C62828', fontWeight: 700, whiteSpace: 'nowrap' }}>最佳</span>
              )}
              <div style={{
                width: '100%', borderRadius: '3px 3px 0 0',
                height: `${heightPct}%`,
                background: s.isBest ? '#C62828' : 'rgba(198,40,40,0.25)',
                minHeight: 4,
                transition: 'height 0.3s',
              }} />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        {slots.map(s => (
          <div key={s.hour} style={{ flex: 1, textAlign: 'center', fontSize: '9px', color: 'var(--ink-light)' }}>
            {hourLabel(s.hour)}
          </div>
        ))}
      </div>
    </div>
  )
}
