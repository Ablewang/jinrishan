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

export default function MemorizeMode({ poem, onExit, onNext, onMemorized }: Props) {
  const [round, setRound] = useState<Round>(1)
  const [current, setCurrent] = useState(0)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [celebrated, setCelebrated] = useState(false)
  const [peeked, setPeeked] = useState(false)
  const [burst, setBurst] = useState(false)
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
      setBurst(false)
    } else {
      if (round === 1) {
        setRound(2)
        setCurrent(0)
        setRevealed(new Set())
        setPeeked(false)
        setBurst(false)
      } else {
        setCelebrated(true)
        onMemorized()
      }
    }
  }

  // 全部揭示后自动前进：自己答出来有礼花延迟900ms，看答案直接600ms
  useEffect(() => {
    if (!allRevealed) return
    if (!peeked) setBurst(true)
    const delay = peeked ? 600 : 900
    const t = setTimeout(nextLine, delay)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRevealed])

  // 切换行时滚动到活动行
  useEffect(() => {
    const el = containerRef.current?.querySelector('.mm-line--active')
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [current])

  if (celebrated) {
    return (
      <div className="mm mm--celebrate">
        {imgSrc && (
          <div className="mm__bg-wrap">
            <img className="mm__bg" src={imgSrc} aria-hidden />
          </div>
        )}
        <div className="mm__celebrate-stars">
          {Array.from({ length: 20 }, (_, i) => (
            <span key={i} className="mm__star" style={{
              left: `${5 + (i * 4.5) % 90}%`,
              animationDelay: `${i * 0.07}s`,
              fontSize: `${0.8 + (i % 3) * 0.4}rem`,
            }}>★</span>
          ))}
        </div>
        <div className="mm__celebrate-box">
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
              setBurst(false)
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
      {/* 背景图：贴底，和详情页一致 */}
      {imgSrc && (
        <div className="mm__bg-wrap">
          <img className="mm__bg" src={imgSrc} aria-hidden />
        </div>
      )}

      {/* 礼花层：从中心向四周爆开 */}
      {burst && (
        <div className="mm__burst" aria-hidden>
          {Array.from({ length: 16 }, (_, i) => {
            const angle = (i / 16) * 360
            const dist = 80 + (i % 4) * 30
            const colors = ['#C62828','#E53935','#FFD600','#FF6F00','#C62828','#FFD600']
            const shapes = ['●','★','●','◆','★','●']
            return (
              <span key={i} className="mm__burst-particle" style={{
                '--angle': `${angle}deg`,
                '--dist': `${dist}px`,
                color: colors[i % colors.length],
                animationDelay: `${(i % 4) * 0.05}s`,
                fontSize: `${0.6 + (i % 3) * 0.25}rem`,
              } as React.CSSProperties}>
                {shapes[i % shapes.length]}
              </span>
            )
          })}
        </div>
      )}

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
          const state = li < current ? 'done' : li === current ? 'active' : 'hidden'
          const isActive = state === 'active'

          return (
            <div key={li} className={`mm-line mm-line--${state}`}>
              {isActive ? (
                <div className="mm-line__active-content">
                  <div className="mm-line__chars">
                    {ln.chars.map((c, ci) => {
                      if (c.pinyin === null) {
                        return (
                          <span key={ci} className="mm-line__punct-col">
                            {round === 1 && <span className="mm-line__pinyin-slot" />}
                            <span className="mm-line__punct">{c.char}</span>
                          </span>
                        )
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
                          {round === 1 && (
                            <span className="mm-line__pinyin">{c.pinyin}</span>
                          )}
                          {isRev
                            ? <span className="mm-line__hanzi">{c.char}</span>
                            : <span className="mm-line__circle" />
                          }
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

      {/* 底部：只有"看答案"，全部揭示后自动前进不显示按钮 */}
      <div className="mm__footer">
        {!allRevealed && (
          <button className="mm__peek" onClick={peekAll}>看答案</button>
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
  .mm__bg-wrap {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    pointer-events: none;
    z-index: 0;
  }
  .mm__bg {
    display: block;
    width: 100%;
    height: auto;
    opacity: 0.2;
  }
  .mm__burst {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .mm__burst-particle {
    position: absolute;
    animation: burstFly 0.75s cubic-bezier(0.2, 0.8, 0.4, 1) forwards;
  }
  @keyframes burstFly {
    0%   { transform: translate(0,0) scale(1.2); opacity: 1; }
    70%  { opacity: 1; }
    100% {
      transform:
        rotate(var(--angle))
        translateY(calc(var(--dist) * -1))
        scale(0.4);
      opacity: 0;
    }
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
  .mm-line--done { opacity: 0.3; }
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
  .mm-line__chars {
    display: flex;
    gap: 4px;
    align-items: flex-end;
    justify-content: center;
    flex-wrap: nowrap;
  }
  .mm-line__char-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 4px 2px;
    border-radius: 8px;
    background: transparent;
    transition: transform 0.1s;
    min-width: 2.4rem;
  }
  .mm-line__char-btn:not(.mm-line__char-btn--revealed):active {
    transform: scale(0.88);
  }
  .mm-line__punct-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 1rem;
  }
  .mm-line__pinyin-slot {
    height: 1.2em;
    display: block;
  }
  .mm-line__pinyin {
    font-family: var(--font-ui);
    font-size: 0.75rem;
    color: #C62828;
    white-space: nowrap;
    font-style: italic;
    line-height: 1.2;
    display: block;
  }
  .mm-line__circle {
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 50%;
    border: 2.5px solid #C62828;
    background: rgba(198,40,40,0.08);
    display: block;
  }
  .mm-line__char-btn--revealed {
    animation: popChar 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;
  }
  @keyframes popChar {
    0%   { transform: scale(0.3); opacity: 0; }
    100% { transform: scale(1);   opacity: 1; }
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
    min-height: 64px;
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
  .mm__bg-wrap {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    pointer-events: none;
    z-index: 0;
  }
  .mm__bg {
    display: block;
    width: 100%;
    height: auto;
    opacity: 0.2;
  }
  .mm__celebrate-stars {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
  }
  .mm__star {
    position: absolute;
    top: -2rem;
    animation: fallStar 1.6s ease-in forwards;
    color: #C62828;
  }
  @keyframes fallStar {
    0%   { top: -2rem; opacity: 1; transform: rotate(0deg) scale(1); }
    80%  { opacity: 1; }
    100% { top: 110vh;  opacity: 0; transform: rotate(540deg) scale(0.5); }
  }
  .mm__celebrate-box {
    position: relative;
    z-index: 10;
    background: rgba(255,255,255,0.92);
    border-radius: 24px;
    padding: 36px 28px 28px;
    text-align: center;
    max-width: 300px;
    width: 90%;
    box-shadow: 0 8px 40px rgba(0,0,0,0.1);
    border: 1.5px solid rgba(198,40,40,0.12);
    animation: popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards;
  }
  @keyframes popIn {
    from { transform: scale(0.4); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
  }
  .mm__celebrate-title {
    font-family: var(--font-brush);
    font-size: 2.4rem;
    color: #C62828;
    margin-bottom: 6px;
  }
  .mm__celebrate-poem {
    font-family: var(--font-brush);
    font-size: 1.1rem;
    color: #aaa;
    margin-bottom: 4px;
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
