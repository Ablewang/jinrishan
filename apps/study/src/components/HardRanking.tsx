import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildHardRanking } from '../lib/progressStats'
import type { HardPoem } from '../lib/progressStats'
import type { PoemSummary } from '../data/poems'
import BottomSheet, { type BottomSheetActions } from './BottomSheet'

interface Props {
  poems: PoemSummary[]
}

const EF_COLOR: Record<string, string> = {
  hard: '#C62828',
  medium: '#F59E0B',
  easy: '#10B981',
}

const EF_LABEL: Record<string, string> = {
  hard: '较难',
  medium: '中等',
  easy: '熟练',
}

interface SheetPoem {
  id: number
  title: string
  author: string
  dynasty: string | null
  allLines: string
  efLevel: string
  totalSessions: number
}

export default function HardRanking({ poems }: Props) {
  const navigate = useNavigate()
  const [ranking, setRanking] = useState<HardPoem[]>([])
  const [sheet, setSheet] = useState<SheetPoem | null>(null)
  const sheetRef = useRef<BottomSheetActions>(null)

  useEffect(() => { buildHardRanking().then(setRanking) }, [])

  if (ranking.length === 0) {
    return <div style={{ fontSize: '13px', color: 'var(--ink-light)', padding: '12px 0' }}>背诵次数不足，暂无难诗数据</div>
  }

  function openSheet(poem: PoemSummary, item: HardPoem) {
    setSheet({ id: poem.id, title: poem.title, author: poem.author, dynasty: poem.dynasty, allLines: poem.allLines, efLevel: item.efLevel, totalSessions: item.totalSessions })
    sheetRef.current?.open()
  }

  return (
    <>
      <div>
        {ranking.map((item, idx) => {
          const poem = poems.find(p => p.id === item.poemId)
          if (!poem) return null
          return (
            <button
              key={item.poemId}
              onClick={() => openSheet(poem, item)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', background: 'none', border: 'none',
                padding: '10px 0', cursor: 'pointer',
                borderBottom: idx < ranking.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                background: idx === 0 ? '#C62828' : 'rgba(0,0,0,0.06)',
                color: idx === 0 ? '#fff' : 'var(--ink-light)',
                fontSize: '11px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>{idx + 1}</span>
              <div style={{ flex: 1, textAlign: 'left', minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>《{poem.title}》</div>
                <div style={{ fontSize: '11px', color: 'var(--ink-light)', marginTop: 2 }}>已练 {item.totalSessions} 次</div>
              </div>
              <span style={{
                fontSize: '12px', fontWeight: 700,
                color: EF_COLOR[item.efLevel],
                background: `${EF_COLOR[item.efLevel]}18`,
                padding: '3px 8px', borderRadius: 999,
                flexShrink: 0,
              }}>{EF_LABEL[item.efLevel]}</span>
            </button>
          )
        })}
      </div>

      <BottomSheet ref={sheetRef} onClose={() => setSheet(null)} handleColor="#C62828">
        {sheet && (
          <div>
            {/* 红色标题区 */}
            <div style={{
              background: '#C62828',
              padding: '12px 24px 16px',
              textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-brush)', fontSize: '1.6rem', color: '#FFF8E1', marginBottom: 6 }}>
                《{sheet.title}》
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ fontSize: '13px', color: 'rgba(255,248,225,0.8)' }}>
                  {sheet.dynasty ? `${sheet.dynasty} · ` : ''}{sheet.author}
                </span>
                <span style={{
                  fontSize: '11px', fontWeight: 700,
                  color: '#C62828',
                  background: '#FFF8E1',
                  padding: '2px 8px', borderRadius: 999,
                }}>{EF_LABEL[sheet.efLevel]}</span>
              </div>
            </div>

            {/* 诗句区 */}
            <div style={{ padding: '20px 24px 0' }}>
              <div style={{
                background: 'var(--bg)', borderRadius: 14,
                padding: '20px 24px', marginBottom: 20,
                textAlign: 'center',
              }}>
                {sheet.allLines.split('\n').map((line, i) => (
                  <div key={i} style={{
                    fontFamily: 'var(--font-brush)',
                    fontSize: '1.05rem', color: 'var(--ink)',
                    lineHeight: 2.2,
                    letterSpacing: '0.05em',
                  }}>{line}</div>
                ))}
                <div style={{ marginTop: 12, fontSize: '11px', color: 'var(--ink-light)' }}>
                  已练 {sheet.totalSessions} 次
                </div>
              </div>

              {/* 按钮 */}
              <div style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
                <button
                  onClick={() => { sheetRef.current?.close(); navigate(`/poem/${sheet.id}`) }}
                  style={{
                    width: '100%', padding: '14px 0',
                    background: 'linear-gradient(135deg, #C62828, #E53935)',
                    color: '#FFF8E1',
                    border: 'none', borderRadius: 14,
                    fontFamily: 'var(--font-ui)', fontSize: '15px', fontWeight: 700,
                    cursor: 'pointer',
                    letterSpacing: '0.05em',
                    boxShadow: '0 4px 12px rgba(198,40,40,0.3)',
                  }}
                >
                  去背这首诗 →
                </button>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  )
}
