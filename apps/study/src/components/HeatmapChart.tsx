import { useState, useEffect, useRef } from 'react'
import { buildHeatmap } from '../lib/progressStats'
import type { HeatmapDay } from '../lib/progressStats'
import { storage } from '../lib/storage'
import type { PoemSummary } from '../data/poems'
import BottomSheet, { type BottomSheetActions } from './BottomSheet'

const DOW = ['一', '二', '三', '四', '五', '六', '日']

interface Session {
  poemId: number
  date: string
  stars: number
  qScore: number
}

interface ReviewCard {
  id: number
  level: number
  due: string
  lastDate: string
}

interface Props {
  poems: PoemSummary[]
}

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

function starStr(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars)
}

export default function HeatmapChart({ poems }: Props) {
  const [ym, setYm] = useState(currentYM)
  const [days, setDays] = useState<HeatmapDay[]>([])
  const [tooltip, setTooltip] = useState<HeatmapDay | null>(null)
  const [detailDate, setDetailDate] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [reviewCards, setReviewCards] = useState<ReviewCard[]>([])
  const sheetRef = useRef<BottomSheetActions>(null)

  useEffect(() => {
    buildHeatmap(ym).then(setDays)
    setTooltip(null)
  }, [ym])

  useEffect(() => {
    storage.get('recitation_sessions').then(raw => {
      setSessions(raw ? JSON.parse(raw) : [])
    })
    storage.get('poem_review_cards').then(raw => {
      setReviewCards(raw ? JSON.parse(raw) : [])
    })
  }, [ym])

  const [year, month] = ym.split('-').map(Number)
  const isCurrentMonth = ym === currentYM()

  const firstDow = (new Date(`${ym}-01T00:00:00`).getDay() + 6) % 7
  const cells: (HeatmapDay | null)[] = [
    ...Array(firstDow).fill(null),
    ...days,
  ]

  const totalCount = days.reduce((s, d) => s + d.count, 0)
  const activeDays = days.filter(d => d.count > 0).length

  function openDetail(day: HeatmapDay) {
    setDetailDate(day.date)
    sheetRef.current?.open()
  }

  const daySessions = detailDate ? sessions.filter(s => s.date === detailDate) : []
  const dayMemorizedIds = new Set(daySessions.map(s => s.poemId))
  const dayReviewed = detailDate
    ? reviewCards.filter(c => c.level > 0 && c.lastDate === detailDate && !dayMemorizedIds.has(c.id))
    : []

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
          marginTop: 8, padding: '7px 12px',
          background: 'rgba(198,40,40,0.08)', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--ink)' }}>
            {tooltip.date.slice(5).replace('-', '月')}日 · 背了 {tooltip.count} 首 · {tooltip.stars} 星
          </span>
          <button
            onClick={() => openDetail(tooltip)}
            style={{
              fontSize: '11px', color: '#C62828', fontWeight: 700,
              background: 'none', border: '1px solid #C62828',
              borderRadius: 999, padding: '2px 10px', cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >详情</button>
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

      {/* 详情 BottomSheet */}
      <BottomSheet ref={sheetRef} onClose={() => setDetailDate(null)} handleColor="#C62828">
        {detailDate && (
          <div style={{ padding: '0 0 calc(24px + env(safe-area-inset-bottom, 0px))' }}>
            {/* 标题 */}
            <div style={{
              background: '#C62828', padding: '14px 20px 16px',
              textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-brush)', fontSize: '1.2rem', color: '#FFF8E1', letterSpacing: '0.1em' }}>
                {detailDate.slice(5).replace('-', '月')}日
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,248,225,0.7)', marginTop: 4 }}>
                背诵 {daySessions.length} 次 · 复习 {dayReviewed.length} 首
              </div>
            </div>

            <div style={{ padding: '16px 16px 0' }}>
              {/* 背诵列表 */}
              {daySessions.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-light)', marginBottom: 8, letterSpacing: '0.05em' }}>背诵</div>
                  {daySessions.map((s, i) => {
                    const poem = poems.find(p => p.id === s.poemId)
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '9px 0', borderBottom: i < daySessions.length - 1 ? '1px solid var(--border)' : 'none',
                      }}>
                        <span style={{ fontSize: '14px', color: 'var(--ink)', fontFamily: 'var(--font-brush)' }}>
                          《{poem?.title ?? `诗${s.poemId}`}》
                        </span>
                        <span style={{ fontSize: '13px', color: '#FFB300', letterSpacing: '0.05em' }}>{starStr(s.stars)}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* 复习列表 */}
              {dayReviewed.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-light)', marginBottom: 8, letterSpacing: '0.05em' }}>复习</div>
                  {dayReviewed.map((c, i) => {
                    const poem = poems.find(p => p.id === c.id)
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '9px 0', borderBottom: i < dayReviewed.length - 1 ? '1px solid var(--border)' : 'none',
                      }}>
                        <span style={{ fontSize: '14px', color: 'var(--ink)', fontFamily: 'var(--font-brush)' }}>
                          《{poem?.title ?? `诗${c.id}`}》
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--ink-light)' }}>第 {c.level} 档</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {daySessions.length === 0 && dayReviewed.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--ink-light)', fontSize: '13px', padding: '24px 0' }}>暂无记录</div>
              )}
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
