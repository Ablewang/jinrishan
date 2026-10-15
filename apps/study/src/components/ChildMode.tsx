import { useState } from 'react'
import type { Poem } from '../data/poems'
import type { LineResult } from '../types/recitation'
import imgMap from '../data/poem_img_map.json'

interface Props {
  poem: Poem
  onDone: (lines: LineResult[]) => void
  onExit: () => void
}

type LinePhase = 'pending' | 'hidden' | 'hint1' | 'hint2' | 'done'

interface LineState {
  phase: LinePhase
  hintCount: 0 | 1 | 2
}

// 左侧色条颜色
function stripColor(state: LineState, isCurrent: boolean): string {
  if (isCurrent) return '#C62828'
  if (state.phase === 'pending') return 'transparent'
  if (state.phase === 'done') {
    if (state.hintCount === 0) return '#2E7D32'
    if (state.hintCount === 1) return '#FF8F00'
    return '#E65100'
  }
  return 'transparent'
}

// 格子遮盖块
function CharMasks({ count, small }: { count: number; small?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{
          display: 'inline-block',
          width: small ? '1.35rem' : '1.9rem',
          height: small ? '1.35rem' : '1.9rem',
          borderRadius: 6,
          background: small ? 'rgba(24,18,10,0.07)' : 'rgba(198,40,40,0.15)',
          flexShrink: 0,
        }} />
      ))}
    </div>
  )
}

// 拼音小方块
function PinyinMasks({ count, firstPinyin, small }: { count: number; firstPinyin?: string; small?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {Array.from({ length: count }).map((_, i) => (
        i === 0 && firstPinyin ? (
          <span key={i} style={{
            display: 'inline-block',
            width: '1.9rem',
            textAlign: 'center',
            fontSize: '0.58rem',
            color: '#A08040',
            letterSpacing: 0,
          }}>{firstPinyin}</span>
        ) : (
          <span key={i} style={{
            display: 'inline-block',
            width: small ? '1.35rem' : '1.9rem',
            height: '0.75rem',
            borderRadius: 4,
            background: small ? 'rgba(24,18,10,0.05)' : 'rgba(198,40,40,0.1)',
            flexShrink: 0,
          }} />
        )
      ))}
    </div>
  )
}

export default function ChildMode({ poem, onDone, onExit }: Props) {
  const [lineStates, setLineStates] = useState<LineState[]>(() =>
    poem.lines.map((_, i) => ({ phase: i === 0 ? 'hidden' : 'pending', hintCount: 0 }))
  )
  const [currentIdx, setCurrentIdx] = useState(0)

  const imgFile = (imgMap as Record<string, string>)[String(poem.id)]
  const imgSrc = imgFile ? `/images/${encodeURIComponent(imgFile)}` : null

  function advanceTo(idx: number, prevStates: LineState[]): LineState[] {
    return prevStates.map((s, i) =>
      i === idx ? { phase: 'hidden', hintCount: 0 } : s
    )
  }

  function markDone(idx: number, hintCount: 0 | 1 | 2) {
    setLineStates(prev => {
      const next = prev.map((s, i) =>
        i === idx ? { phase: 'done' as LinePhase, hintCount } : s
      )
      const nextIdx = idx + 1
      if (nextIdx >= poem.lines.length) {
        setTimeout(() => finishAll(next), 0)
        return next
      }
      return advanceTo(nextIdx, next)
    })
    setCurrentIdx(idx + 1 < poem.lines.length ? idx + 1 : idx)
  }

  function finishAll(states: LineState[]) {
    const lines: LineResult[] = states.map((s, i) => ({
      lineIndex: i,
      passed: s.hintCount < 2,
      hintCount: s.hintCount,
      mode: 'child',
    }))
    onDone(lines)
  }

  function handleDone() {
    const cur = lineStates[currentIdx]
    if (!cur || cur.phase === 'done' || cur.phase === 'pending' || cur.phase === 'hint2') return
    markDone(currentIdx, cur.hintCount as 0 | 1 | 2)
  }

  function handleHint() {
    const cur = lineStates[currentIdx]
    if (!cur) return
    if (cur.phase === 'hidden') {
      setLineStates(prev => prev.map((s, i) =>
        i === currentIdx ? { phase: 'hint1', hintCount: 1 } : s
      ))
    } else if (cur.phase === 'hint1') {
      setLineStates(prev => prev.map((s, i) =>
        i === currentIdx ? { phase: 'hint2', hintCount: 2 } : s
      ))
      if (autoTimer.current) clearTimeout(autoTimer.current)
      markDone(currentIdx, 2)
    }
  }

  const cur = lineStates[currentIdx]
  const hintDisabled = !cur || cur.phase === 'hint2' || cur.phase === 'done' || cur.phase === 'pending'
  const doneDisabled = !cur || cur.phase === 'hint2' || cur.phase === 'done' || cur.phase === 'pending'

  function hintLabel() {
    if (!cur || cur.phase !== 'hint1') return '想不起来？看一眼'
    return '再看一眼'
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
        }}>背一背</span>
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
          width: `${(lineStates.filter(s => s.phase === 'done').length / poem.lines.length) * 100}%`,
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
            const state = lineStates[i]
            const isCurrent = i === currentIdx && state?.phase !== 'done'
            const isPending = state?.phase === 'pending'
            const isDone = state?.phase === 'done'
            const isHint1 = state?.phase === 'hint1'
            const isHint2 = state?.phase === 'hint2'
            const charCount = line.chars.filter(c => /[一-鿿]/.test(c.char)).length

            return (
              <div key={i} style={{
                background: '#fff',
                borderRadius: 12,
                border: `1.5px solid ${isCurrent ? (isHint1 ? '#D4A836' : '#C62828') : '#EDE8DF'}`,
                boxShadow: isCurrent
                  ? (isHint1 ? '0 4px 16px rgba(212,168,54,0.15)' : '0 4px 16px rgba(198,40,40,0.12)')
                  : '0 2px 6px rgba(150,80,30,0.05)',
                display: 'flex', alignItems: 'center',
                opacity: isPending ? 0.45 : 1,
                transition: 'opacity 0.2s, border-color 0.2s',
              }}>
                {/* 左侧色条 */}
                <div style={{
                  width: 4, alignSelf: 'stretch', flexShrink: 0,
                  background: stripColor(state, isCurrent),
                  borderRadius: '10px 0 0 10px',
                }} />

                {/* 内容区 */}
                <div style={{
                  flex: 1, padding: '10px 8px', display: 'flex',
                  flexDirection: 'column', alignItems: 'center', gap: 5,
                  minWidth: 0, overflow: 'hidden',
                }}>
                  {isDone ? (
                    // 已完成：显示拼音 + 汉字
                    <>
                      <div style={{ fontSize: '0.56rem', color: '#8C7A60', letterSpacing: '0.06em' }}>
                        {line.pinyin}
                      </div>
                      <div style={{ fontFamily: 'var(--font-brush)', fontSize: '1.15rem', color: '#18120A', letterSpacing: '0.12em' }}>
                        {line.text}
                      </div>
                    </>
                  ) : isPending ? (
                    // 未到：拼音小块 + 汉字格子（与原型图一致）
                    <>
                      <PinyinMasks count={charCount} small />
                      <CharMasks count={charCount} small />
                    </>

                  ) : (
                    // 当前句（hidden / hint1 / hint2）
                    <>
                      {isHint2 ? (
                        // 全句提示：显示完整拼音
                        <div style={{ fontSize: '0.56rem', color: '#8C7A60', letterSpacing: '0.06em' }}>
                          {line.pinyin}
                        </div>
                      ) : (
                        // hidden：拼音小方块；hint1：第一字拼音 + 其余小方块
                        <PinyinMasks
                          count={charCount}
                          firstPinyin={isHint1 ? (line.chars[0]?.pinyin ?? '') : undefined}
                        />
                      )}
                      {isHint2 ? (
                        // 全句提示：显示汉字
                        <div style={{ fontFamily: 'var(--font-brush)', fontSize: '1.3rem', color: '#18120A', letterSpacing: '0.15em' }}>
                          {line.text}
                        </div>
                      ) : (
                        // hidden / hint1：汉字格子
                        <CharMasks count={charCount} />
                      )}
                    </>
                  )}
                </div>

                {/* 右侧完成标签（仅已完成行） */}
                {isDone && (
                  <div style={{ paddingRight: 10, flexShrink: 0 }}>
                    <span style={{
                      fontSize: '0.58rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                      whiteSpace: 'nowrap',
                      ...(state.hintCount === 0
                        ? { background: '#F1F8F2', color: '#2E7D32', border: '1px solid #A5D6A7' }
                        : state.hintCount === 1
                        ? { background: '#FFF8F0', color: '#E65100', border: '1px solid #FFCC80' }
                        : { background: '#FFF0E0', color: '#BF360C', border: '1px solid #FFA726' }),
                    }}>
                      {state.hintCount === 0 ? '无提示' : state.hintCount === 1 ? '提示×1' : '全句提示'}
                    </span>
                  </div>
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
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleHint}
            disabled={hintDisabled}
            style={{
              flex: 1, height: 52, borderRadius: 12,
              background: hintDisabled ? '#F5F2ED' : 'transparent',
              border: hintDisabled ? 'none' : '1.5px solid #8B6914',
              color: hintDisabled ? '#C0B09A' : '#8B6914',
              fontFamily: 'var(--font-ui)', fontSize: '0.9rem',
              letterSpacing: '0.04em', transition: 'all 0.15s',
            }}
          >
            {hintLabel()}
          </button>
          <button
            onClick={handleDone}
            disabled={doneDisabled}
            style={{
              flex: 1, height: 52, borderRadius: 12,
              background: doneDisabled ? '#EDE8DF' : '#C62828',
              color: doneDisabled ? '#B0A090' : '#FFF8E1',
              fontFamily: 'var(--font-ui)', fontSize: '1rem',
              letterSpacing: '0.05em', transition: 'all 0.15s',
              boxShadow: doneDisabled ? 'none' : '0 4px 14px rgba(198,40,40,0.3)',
            }}
          >背出来了</button>
        </div>
        {cur?.phase === 'hint1' && (
          <div style={{ textAlign: 'center', fontSize: '0.62rem', color: '#A08040' }}>
            已用1次提示
          </div>
        )}
      </div>
    </div>
  )
}
