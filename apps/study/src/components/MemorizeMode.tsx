import { useState, useEffect, useRef } from 'react'
import type { Poem } from '../data/poems'
import imgMap from '../data/poem_img_map.json'

interface Props {
  poem: Poem
  onExit: () => void
  onNext: () => void
  onMemorized: () => void
}

type Round = 1 | 2
type LineState = 'hidden' | 'active' | 'done'

export default function MemorizeMode({ poem, onExit, onNext, onMemorized }: Props) {
  const [round, setRound] = useState<Round>(1)
  const [current, setCurrent] = useState(0)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [celebrated, setCelebrated] = useState(false)
  const [peeked, setPeeked] = useState(false) // 本句是否点了看答案
  const containerRef = useRef<HTMLDivElement>(null)

  const lines = poem.lines
  const total = lines.length
  const line = lines[current]
  const hanziChars = line.chars.filter(c => c.pinyin !== null)
  const allRevealed = revealed.size >= hanziChars.length

  const imgFile = (imgMap as Record<string, string>)[String(poem.id)]
  const imgSrc = imgFile ? `/images/${encodeURIComponent(imgFile)}` : null

  function revealChar(i: number) {
    setRevealed(prev => new Set([...prev, i]))
  }

  function peekAll() {
    const all = new Set(hanziChars.map((_, i) => i))
    setRevealed(all)
    setPeeked(true)
  }

  function nextLine() {
    if (current < total - 1) {
      setCurrent(c => c + 1)
      setRevealed(new Set())
      setPeeked(false)
    } else {
      // 本轮结束
      if (round === 1) {
        setRound(2)
        setCurrent(0)
        setRevealed(new Set())
        setPeeked(false)
      } else {
        setCelebrated(true)
        onMemorized()
      }
    }
  }

  function lineState(i: number): LineState {
    if (i < current) return 'done'
    if (i === current) return 'active'
    return 'hidden'
  }

  // 自动滚动到活动行
  useEffect(() => {
    const el = containerRef.current?.querySelector('.mm-line--active')
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [current])

  if (celebrated) {
    return (
      <div className="mm mm--celebrate">
        {imgSrc && <img className="mm__bg" src={imgSrc} aria-hidden />}
        <div className="mm__celebrate-overlay" />
        <div className="mm__celebrate-box">
          <div className="mm__celebrate-stars">
            {Array.from({ length: 20 }, (_, i) => (
              <span key={i} className="mm__star" style={{
                left: `${Math.random() * 90 + 5}%`,
                animationDelay: `${i * 0.06}s`,
                fontSize: `${Math.random() * 1.2 + 0.8}rem`,
              }}>{'★'}</span>
            ))}
          </div>
          <p className="mm__celebrate-emoji">🎉</p>
          <p className="mm__celebrate-title">背出来啦！</p>
          <p className="mm__celebrate-poem">{poem.title}</p>
          <p className="mm__celebrate-sub">太棒了，继续加油！</p>
          <div className="mm__celebrate-btns">
            <button className="mm__btn mm__btn--primary" onClick={onNext}>下一首 →</button>
            <button className="mm__btn mm__btn--ghost" onClick={() => {
              setCelebrated(false)
              setRound(1)
              setCurrent(0)
              setRevealed(new Set())
              setPeeked(false)
            }}>再背一遍</button>
          </div>
        </div>
        <style>{celebrateStyle}</style>
      </div>
    )
  }

  let charIdx = 0

  return (
    <div className="mm">
      {imgSrc && <img className="mm__bg" src={imgSrc} aria-hidden />}
      <div className="mm__overlay" />

      {/* 顶部 */}
      <header className="mm__header">
        <button className="mm__exit" onClick={onExit}>退出</button>
        <div className="mm__progress-wrap">
          <div className="mm__progress-bar">
            <div className="mm__progress-fill" style={{ width: `${(current / total) * 100}%` }} />
          </div>
          <span className="mm__progress-label">{current + 1} / {total}</span>
        </div>
        <span className="mm__round-badge">第{round === 1 ? '一' : '二'}轮</span>
      </header>

      {/* 诗题 */}
      <h2 className="mm__title">{poem.title}</h2>

      {/* 诗句区 */}
      <div className="mm__lines" ref={containerRef}>
        {lines.map((ln, li) => {
          const state = lineState(li)
          const isActive = state === 'active'

          return (
            <div key={li} className={`mm-line mm-line--${state}`}>
              {isActive ? (
                <div className="mm-line__active-content">
                  {/* 拼音行 */}
                  {round === 1 && (
                    <div className="mm-line__pinyins">
                      {ln.chars.map((c, ci) => (
                        <span key={ci} className="mm-line__pinyin-slot">
                          {c.pinyin ? (
                            <span className="mm-line__pinyin">{c.pinyin}</span>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* 汉字行 */}
                  <div className="mm-line__chars">
                    {ln.chars.map((c, ci) => {
                      if (c.pinyin === null) {
                        return <span key={ci} className="mm-line__punct">{c.char}</span>
                      }
                      const idx = charIdx++
                      const isRev = revealed.has(idx)
                      return (
                        <button
                          key={ci}
                          className={`mm-line__char-btn${isRev ? ' mm-line__char-btn--revealed' : ''}`}
                          onClick={() => !isRev && revealChar(idx)}
                          disabled={isRev}
                        >
                          {isRev ? (
                            <span className="mm-line__hanzi">{c.char}</span>
                          ) : (
                            <span className="mm-line__circle" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : state === 'done' ? (
                <div className="mm-line__done-text">{ln.text}</div>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* 底部操作 */}
      <div className="mm__footer">
        {!allRevealed && (
          <button className="mm__peek" onClick={peekAll}>看答案</button>
        )}
        {allRevealed && (
          <button
            className={`mm__next-btn${peeked ? ' mm__next-btn--peeked' : ''}`}
            onClick={nextLine}
          >
            {current < total - 1
              ? (peeked ? '下一句（已看答案）' : '背出来了 →')
              : (round === 1 ? '进入第二轮 →' : '完成！')}
          </button>
        )}
      </div>

      <style>{mainStyle}</style>
    </div>
  )
}

const mainStyle = `
  .mm {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #fff;
  }
  .mm__bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.08;
    pointer-events: none;
    z-index: 0;
  }
  .mm__overlay {
    display: none;
  }
  .mm__header {
    position: relative;
    z-index: 10;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 16px;
    height: var(--navbar-height);
    background: #C62828;
  }
  .mm__exit {
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: #FFF8E1;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(255,255,255,0.15);
    flex-shrink: 0;
  }
  .mm__exit:active { background: rgba(255,255,255,0.28); }
  .mm__progress-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .mm__progress-bar {
    height: 4px;
    background: rgba(255,248,225,0.3);
    border-radius: 999px;
    overflow: hidden;
  }
  .mm__progress-fill {
    height: 100%;
    background: #FFF8E1;
    border-radius: 999px;
    transition: width 0.3s ease;
  }
  .mm__progress-label {
    font-family: var(--font-ui);
    font-size: 0.7rem;
    color: rgba(255,248,225,0.7);
    text-align: center;
  }
  .mm__round-badge {
    flex-shrink: 0;
    font-family: var(--font-ui);
    font-size: 0.72rem;
    font-weight: 700;
    color: #C62828;
    background: #FFF8E1;
    padding: 4px 10px;
    border-radius: 999px;
  }
  .mm__title {
    position: relative;
    z-index: 10;
    font-family: var(--font-brush);
    font-size: 1.6rem;
    color: #C62828;
    text-align: center;
    padding: 16px 0 4px;
    flex-shrink: 0;
  }
  .mm__lines {
    position: relative;
    z-index: 10;
    flex: 1;
    overflow-y: auto;
    padding: 8px 20px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .mm-line--hidden { display: none; }
  .mm-line--done {
    opacity: 0.3;
  }
  .mm-line__done-text {
    font-family: var(--font-brush);
    font-size: 1.3rem;
    color: #333;
    text-align: center;
    padding: 6px 0;
  }
  .mm-line--active { opacity: 1; }
  .mm-line__active-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 16px 0 8px;
  }
  .mm-line__pinyins {
    display: flex;
    gap: 4px;
    align-items: flex-end;
    justify-content: center;
    min-height: 1.4em;
  }
  .mm-line__pinyin-slot {
    display: flex;
    justify-content: center;
    min-width: 2.4rem;
  }
  .mm-line__pinyin {
    font-family: var(--font-ui);
    font-size: 0.78rem;
    color: #C62828;
    white-space: nowrap;
    font-style: italic;
  }
  .mm-line__chars {
    display: flex;
    gap: 6px;
    align-items: center;
    justify-content: center;
    flex-wrap: nowrap;
  }
  .mm-line__char-btn {
    width: 2.4rem;
    height: 2.8rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: transparent;
    transition: transform 0.1s;
  }
  .mm-line__char-btn:not(.mm-line__char-btn--revealed):active {
    transform: scale(0.88);
  }
  .mm-line__circle {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 2.5px solid #C62828;
    background: rgba(198,40,40,0.08);
    display: block;
  }
  .mm-line__char-btn--revealed {
    animation: popChar 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;
  }
  @keyframes popChar {
    0% { transform: scale(0.3); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
  .mm-line__hanzi {
    font-family: var(--font-brush);
    font-size: 2.2rem;
    color: #1a1a1a;
    line-height: 1;
  }
  .mm-line__punct {
    font-family: var(--font-brush);
    font-size: 1.4rem;
    color: #aaa;
  }
  .mm__footer {
    position: relative;
    z-index: 10;
    flex-shrink: 0;
    padding: 12px 20px calc(12px + env(safe-area-inset-bottom,0px));
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: #fff;
    border-top: 1px solid #f0f0f0;
  }
  .mm__peek {
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: #999;
    border: 1px solid #e0e0e0;
    border-radius: 999px;
    padding: 10px 0;
    background: transparent;
  }
  .mm__peek:active { background: #f5f5f5; }
  .mm__next-btn {
    width: 100%;
    padding: 16px 0;
    background: #C62828;
    color: #FFF8E1;
    border-radius: 999px;
    font-family: var(--font-brush);
    font-size: var(--text-xl);
    font-weight: 700;
    letter-spacing: 0.05em;
    transition: transform 0.1s, opacity 0.1s;
    box-shadow: 0 4px 16px rgba(198,40,40,0.3);
  }
  .mm__next-btn--peeked {
    background: #e57373;
    font-size: var(--text-base);
  }
  .mm__next-btn:active { transform: scale(0.97); opacity: 0.9; }
`

const celebrateStyle = `
  .mm--celebrate {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    overflow: hidden;
  }
  .mm__bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.08;
    pointer-events: none;
    z-index: 0;
  }
  .mm__celebrate-overlay {
    display: none;
  }
  .mm__celebrate-stars {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .mm__star {
    position: absolute;
    top: -2rem;
    animation: fallStar 1.4s ease-in forwards;
    color: #C62828;
  }
  @keyframes fallStar {
    0% { top: -2rem; opacity: 1; transform: rotate(0deg) scale(1); }
    80% { opacity: 1; }
    100% { top: 110vh; opacity: 0; transform: rotate(540deg) scale(0.5); }
  }
  .mm__celebrate-box {
    position: relative;
    z-index: 10;
    background: #fff;
    border-radius: 24px;
    padding: 36px 28px 28px;
    text-align: center;
    max-width: 300px;
    width: 90%;
    box-shadow: 0 8px 40px rgba(0,0,0,0.12);
    border: 1.5px solid rgba(198,40,40,0.12);
    animation: popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards;
  }
  @keyframes popIn {
    from { transform: scale(0.4); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  .mm__celebrate-emoji { font-size: 2.8rem; margin-bottom: 8px; }
  .mm__celebrate-title {
    font-family: var(--font-brush);
    font-size: 2.2rem;
    color: #C62828;
    margin-bottom: 4px;
  }
  .mm__celebrate-poem {
    font-family: var(--font-brush);
    font-size: 1.1rem;
    color: #aaa;
    margin-bottom: 6px;
  }
  .mm__celebrate-sub {
    font-size: var(--text-sm);
    color: #999;
    margin-bottom: 24px;
  }
  .mm__celebrate-btns { display: flex; flex-direction: column; gap: 10px; }
  .mm__btn {
    padding: 13px 0;
    border-radius: 999px;
    font-family: var(--font-ui);
    font-size: var(--text-base);
    font-weight: 700;
    transition: transform 0.1s, opacity 0.1s;
  }
  .mm__btn:active { transform: scale(0.97); opacity: 0.85; }
  .mm__btn--primary {
    background: #C62828;
    color: #fff;
    box-shadow: 0 4px 16px rgba(198,40,40,0.3);
  }
  .mm__btn--ghost {
    background: transparent;
    border: 1.5px solid #e0e0e0;
    color: #999;
  }
`
