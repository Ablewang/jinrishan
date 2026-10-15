import { useMemo } from 'react'
import type { Poem } from '../data/poems'
import type { RecitationSession } from '../types/recitation'
import { intervalLabel } from '../lib/spacedRepetition'
import { IconStarFilled, IconStar, IconCorrect, IconWrong } from './icons'
import imgMap from '../data/poem_img_map.json'

const ANIM = `
@keyframes rr-slide-up {
  from { transform: translateY(40px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes rr-star-pop {
  0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
  60%  { transform: scale(1.3) rotate(5deg);  opacity: 1; }
  100% { transform: scale(1)  rotate(0deg);   opacity: 1; }
}
@keyframes rr-fade-up {
  from { transform: translateY(16px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
`

interface Props {
  session: RecitationSession
  nextInterval: number
  poem: Poem
  onDone: () => void
}

const QUOTES: Record<number, string> = {
  3: '厉害！一个字都没看！',
  2: '不错，下次试试不用提示',
  1: '继续加油，多背几遍',
}

function StarRow({ stars }: { stars: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
      {[1, 2, 3].map(i =>
        <span key={i} style={{
          display: 'inline-block',
          animation: `rr-star-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.1 + (i - 1) * 0.15}s both`,
        }}>
          {i <= stars
            ? <IconStarFilled size={32} fill="#FFB300" />
            : <IconStar size={32} fill="rgba(255,248,225,0.35)" />}
        </span>
      )}
    </div>
  )
}

function LineTag({ passed, hintCount }: { passed: boolean; hintCount: number }) {
  if (!passed || hintCount >= 2) {
    return (
      <span style={{
        fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
        background: '#FFF5F5', color: '#C62828', border: '1px solid #FFCDD2',
        display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap',
      }}>
        <IconWrong size={10} fill="#C62828" />
        {hintCount >= 2 ? '全句提示' : '未背出'}
      </span>
    )
  }
  if (hintCount === 1) {
    return (
      <span style={{
        fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
        background: '#FFF8F0', color: '#E65100', border: '1px solid #FFCC80',
        display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap',
      }}>
        <IconCorrect size={10} fill="#E65100" />
        提示×1
      </span>
    )
  }
  return (
    <span style={{
      fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
      background: '#F1F8F2', color: '#2E7D32', border: '1px solid #A5D6A7',
      display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap',
    }}>
      <IconCorrect size={10} fill="#2E7D32" />
      无提示
    </span>
  )
}

function stripColor(passed: boolean, hintCount: number): string {
  if (!passed || hintCount >= 2) return '#C62828'
  if (hintCount === 1) return '#FF8F00'
  return '#2E7D32'
}

export default function ReciteResult({ session, nextInterval, poem, onDone }: Props) {
  const poemLines = useMemo(() => session.lines, [session])
  const imgFile = (imgMap as Record<string, string>)[String(poem.id)]
  const imgSrc = imgFile ? `/images/${encodeURIComponent(imgFile)}` : null
  const dynastyLabel = poem.dynasty ? `[${poem.dynasty}] ${poem.author}` : poem.author

  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      background: '#FFFDF8', position: 'relative',
      animation: 'rr-slide-up 0.35s cubic-bezier(0.22,1,0.36,1) both',
    }}>
      <style>{ANIM}</style>
      {/* 背景图 */}
      {imgSrc && (
        <div style={{
          position: 'fixed', bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))', left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 480, pointerEvents: 'none', zIndex: 0,
        }}>
          <img src={imgSrc} style={{ display: 'block', width: '100%', height: 'auto', opacity: 0.25 }} aria-hidden />
        </div>
      )}

      {/* 顶部星级区 */}
      <div style={{
        background: '#C62828', padding: '28px 16px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        flexShrink: 0, position: 'relative', zIndex: 1,
      }}>
        <StarRow stars={session.stars} />
        <div style={{
          fontFamily: 'var(--font-brush)', fontSize: '1.1rem',
          color: '#FFF8E1', letterSpacing: '0.1em',
        }}>
          {QUOTES[session.stars] ?? QUOTES[1]}
        </div>
        {/* 诗名放在红色区底部 */}
        <div style={{
          marginTop: 6, paddingTop: 14,
          borderTop: '1px solid rgba(255,248,225,0.2)',
          width: '100%', textAlign: 'center',
        }}>
          <div style={{
            fontFamily: 'var(--font-brush)', fontSize: '1.4rem',
            color: '#FFF8E1', letterSpacing: '0.2em',
          }}>{poem.title}</div>
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,248,225,0.65)', marginTop: 3, letterSpacing: '0.08em' }}>
            {dynastyLabel}
          </div>
        </div>
      </div>

      {/* 每句汇总 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px 0', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', zIndex: 1 }}>
        {poemLines.map((line, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: 10,
            border: '1.5px solid #EDE8DF',
            boxShadow: '0 2px 8px rgba(150,80,30,0.06)',
            display: 'flex', alignItems: 'center', overflow: 'hidden',
            animation: `rr-fade-up 0.35s cubic-bezier(0.22,1,0.36,1) ${0.25 + i * 0.07}s both`,
          }}>
            <div style={{
              width: 4, alignSelf: 'stretch', flexShrink: 0,
              background: stripColor(line.passed, line.hintCount),
            }} />
            <div style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: '0.52rem', color: '#8C7A60', letterSpacing: '0.04em' }}>
                {poem.lines[i]?.pinyin ?? ''}
              </div>
              <div style={{ fontFamily: 'var(--font-brush)', fontSize: '1rem', letterSpacing: '0.1em', color: '#18120A' }}>
                {poem.lines[i]?.text ?? ''}
              </div>
            </div>
            <div style={{ paddingRight: 10, flexShrink: 0 }}>
              <LineTag passed={line.passed} hintCount={line.hintCount} />
            </div>
          </div>
        ))}

        {/* 下次复习提示 */}
        <div style={{
          margin: '6px 0 16px', position: 'relative', zIndex: 1,
          background: '#fff', borderRadius: 10,
          border: '1.5px solid #EDE8DF',
          boxShadow: '0 2px 8px rgba(150,80,30,0.06)',
          display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px',
          flexShrink: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C62828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#C62828' }}>
              {intervalLabel(nextInterval)}复习
            </div>
            <div style={{ fontSize: '0.62rem', color: '#8C7A60', marginTop: 1 }}>
              系统已记录，到期提醒
            </div>
          </div>
        </div>
      </div>

      {/* 完成按钮 — 固定底部 */}
      <div style={{
        flexShrink: 0, zIndex: 10,
        padding: '12px 14px calc(12px + env(safe-area-inset-bottom, 0px))',
        background: 'rgba(255,253,248,0.95)', borderTop: '1px solid #EDE8DF',
      }}>
        <button
          onClick={onDone}
          style={{
            display: 'block', width: '100%', textAlign: 'center',
            background: '#C62828', color: '#FFF8E1',
            padding: '13px', borderRadius: 999,
            fontFamily: 'var(--font-brush)', fontSize: '1rem', letterSpacing: '0.08em',
            boxShadow: '0 4px 16px rgba(198,40,40,0.3)',
          }}
        >
          完成
        </button>
      </div>
    </div>
  )
}
