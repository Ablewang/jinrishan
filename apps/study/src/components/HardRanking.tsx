import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildHardRanking } from '../lib/progressStats'
import type { PoemSummary } from '../data/poems'

interface Props {
  poems: PoemSummary[]
}

const EF_COLOR: Record<string, string> = {
  hard: '#C62828',
  medium: '#F59E0B',
  easy: '#10B981',
}

export default function HardRanking({ poems }: Props) {
  const navigate = useNavigate()
  const ranking = useMemo(() => buildHardRanking(), [])

  if (ranking.length === 0) {
    return <div style={{ fontSize: '13px', color: 'var(--ink-light)', padding: '12px 0' }}>背诵次数不足，暂无难诗数据</div>
  }

  return (
    <div>
      {ranking.map((item, idx) => {
        const poem = poems.find(p => p.id === item.poemId)
        if (!poem) return null
        return (
          <button
            key={item.poemId}
            onClick={() => navigate(`/poem/${item.poemId}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', background: 'none', border: 'none',
              padding: '8px 0', cursor: 'pointer',
              borderBottom: idx < ranking.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <span style={{
              width: 20, height: 20, borderRadius: '50%',
              background: idx === 0 ? '#C62828' : 'var(--border)',
              color: idx === 0 ? '#fff' : 'var(--ink-light)',
              fontSize: '11px', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>{idx + 1}</span>
            <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>《{poem.title}》</div>
              <div style={{ fontSize: '11px', color: 'var(--ink-light)', marginTop: 1 }}>已练 {item.totalSessions} 次</div>
            </div>
            <span style={{
              fontSize: '12px', fontWeight: 700,
              color: EF_COLOR[item.efLevel],
              background: `${EF_COLOR[item.efLevel]}18`,
              padding: '2px 7px', borderRadius: 999,
              flexShrink: 0,
            }}>EF {item.ef}</span>
          </button>
        )
      })}
    </div>
  )
}
