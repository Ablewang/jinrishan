import { useState } from 'react'
import type { Poem } from '../data/poems'
import type { LineResult } from '../types/recitation'
import imgMap from '../data/poem_img_map.json'

interface Props {
  poem: Poem
  onDone: (lines: LineResult[]) => void
  onExit: () => void
}

export default function ParentMode({ poem, onDone, onExit }: Props) {
  const [results, setResults] = useState<(boolean | null)[]>(() => poem.lines.map(() => null))
  const [currentIdx, setCurrentIdx] = useState(0)

  const imgFile = (imgMap as Record<string, string>)[String(poem.id)]
  const imgSrc = imgFile ? `/images/${encodeURIComponent(imgFile)}` : null

  const doneCount = results.filter(r => r !== null).length
  const isFinished = doneCount === poem.lines.length

  function handleMark(passed: boolean) {
    const next = results.map((r, i) => i === currentIdx ? passed : r)
    setResults(next)
    if (currentIdx + 1 < poem.lines.length) {
      setCurrentIdx(currentIdx + 1)
    } else {
      const lines: LineResult[] = next.map((r, i) => ({
        lineIndex: i,
        passed: r === true,
        hintCount: 0,
        mode: 'parent',
      }))
      onDone(lines)
    }
  }

  function handlePrev() {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1)
  }

  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      background: '#FFFDF8', position: 'relative',
    }}>
      {/* 背景图 */}
      {imgSrc && (
        <div style={{
          position: 'fixed', bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))', left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 480, pointerEvents: 'none', zIndex: 0,
        }}>
          <img src={imgSrc} style={{ display: 'block', width: '100%', height: 'auto', opacity: 0.25 }} aria-hidden />
        </div>
      )}

      {/* 顶部导航 */}
      <header style={{
        flexShrink: 0, background: '#C62828', zIndex: 10,
        display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8,
        height: `calc(44px + env(safe-area-inset-top, 0px))`,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <button onClick={onExit} style={{
          fontSize: '0.7rem', color: 'rgba(255,248,225,0.9)',
          background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: 999,
        }}>← 返回</button>
        <span style={{
          fontFamily: 'var(--font-brush)', fontSize: '1rem',
          color: '#FFF8E1', flex: 1, textAlign: 'center', letterSpacing: '0.08em',
        }}>家长测</span>
        <span style={{
          fontSize: '0.6rem', color: 'rgba(255,248,225,0.8)',
          background: 'rgba(255,255,255,0.15)', padding: '3px 8px', borderRadius: 999,
        }}>第 {Math.min(currentIdx + 1, poem.lines.length)} / {poem.lines.length} 句</span>
      </header>

      {/* 进度条 */}
      <div style={{ height: 3, background: '#C62828', flexShrink: 0, zIndex: 10 }}>
        <div style={{
          height: '100%',
          background: 'rgba(255,248,225,0.6)',
          width: `${(doneCount / poem.lines.length) * 100}%`,
          transition: 'width 0.3s',
        }} />
      </div>

      {/* 句子列表 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 0', position: 'relative', zIndex: 1 }}>
        {/* 诗名 */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--font-brush)', fontSize: '1.3rem', color: '#18120A', letterSpacing: '0.15em' }}>
            {poem.title}
          </div>
          <div style={{ fontSize: '0.62rem', color: '#8C7A60', marginTop: 2 }}>
            {poem.dynasty ? `[${poem.dynasty}] ${poem.author}` : poem.author}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {poem.lines.map((line, i) => {
            const result = results[i]
            const isCurrent = i === currentIdx
            const isDone = result !== null

            let stripBg = 'transparent'
            if (isCurrent) stripBg = '#C62828'
            else if (result === true) stripBg = '#2E7D32'
            else if (result === false) stripBg = '#C62828'

            return (
              <div key={i} style={{
                background: '#fff', borderRadius: 12,
                border: `1.5px solid ${isCurrent ? '#C62828' : '#EDE8DF'}`,
                boxShadow: isCurrent ? '0 4px 16px rgba(198,40,40,0.12)' : '0 2px 6px rgba(150,80,30,0.05)',
                display: 'flex', alignItems: 'center', overflow: 'hidden',
                opacity: (!isCurrent && !isDone) ? 0.45 : 1,
                transition: 'opacity 0.2s, border-color 0.2s',
              }}>
                <div style={{ width: 4, alignSelf: 'stretch', flexShrink: 0, background: stripBg }} />
                <div style={{ flex: 1, padding: '10px 10px', display: 'flex', flexDirection: 'row', gap: 2, justifyContent: 'center' }}>
                  {line.chars.map((c, ci) => (
                    <div key={ci} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '1.4rem' }}>
                      <span style={{ fontSize: '0.52rem', color: '#8C7A60', letterSpacing: 0, whiteSpace: 'nowrap' }}>
                        {c.pinyin ?? ''}
                      </span>
                      <span style={{ fontFamily: 'var(--font-brush)', fontSize: isCurrent ? '1.3rem' : '1.1rem', color: '#18120A' }}>
                        {c.char}
                      </span>
                    </div>
                  ))}
                </div>
                {isDone && (
                  <span style={{
                    paddingRight: 12, flexShrink: 0,
                    fontSize: '1.1rem',
                    color: result === true ? '#81C784' : '#EF5350',
                  }}>
                    {result === true ? '✓' : '✗'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ height: 16 }} />
      </div>

      {/* 底部操作区 */}
      <div style={{
        flexShrink: 0, background: 'rgba(255,253,248,0.95)',
        borderTop: '1px solid #EDE8DF', zIndex: 10,
        padding: '12px 12px calc(12px + env(safe-area-inset-bottom, 0px))',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {!isFinished && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => handleMark(false)}
              style={{
                flex: 1, height: 52, borderRadius: 12,
                background: '#FFF0F0', color: '#C62828',
                border: '1.5px solid #FFCDD2',
                fontFamily: 'var(--font-ui)', fontSize: '1rem', letterSpacing: '0.05em',
              }}
            >✗ 没背出来</button>
            <button
              onClick={() => handleMark(true)}
              style={{
                flex: 1, height: 52, borderRadius: 12,
                background: '#C62828', color: '#FFF8E1',
                fontFamily: 'var(--font-ui)', fontSize: '1rem', letterSpacing: '0.05em',
                boxShadow: '0 4px 14px rgba(198,40,40,0.3)',
              }}
            >✓ 背出来了</button>
          </div>
        )}
        {currentIdx > 0 && !isFinished && (
          <button
            onClick={handlePrev}
            style={{
              textAlign: 'center', fontSize: '0.68rem',
              color: 'rgba(140,122,96,0.7)', background: 'none',
            }}
          >← 修改上一句</button>
        )}
      </div>
    </div>
  )
}
