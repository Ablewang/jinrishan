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

// 每个汉字的揭示状态
type CharState = 'hidden' | 'hinted-pinyin' | 'hinted-full' | 'self'

export default function MemorizeMode({ poem, onExit, onNext, onMemorized }: Props) {
  const [round, setRound] = useState<Round>(1)
  const [current, setCurrent] = useState(0)
  // charStates: index → CharState，只记录已揭示的字
  const [charStates, setCharStates] = useState<Map<number, CharState>>(new Map())
  // 本句是否用过提示（至少一次 hinted-pinyin 或 hinted-full）
  const [hintUsed, setHintUsed] = useState(false)
  // 提示阶段：0=未触发，1=仅拼音，2=全字
  const [hintStage, setHintStage] = useState(0)
  const [celebrated, setCelebrated] = useState(false)
  const [celebStars, setCelebStars] = useState(0) // 0=未计算，1/2/3星
  const [totalHints, setTotalHints] = useState(0) // 全诗累计提示次数
  const [burst, setBurst] = useState(false)
  const [charSize, setCharSize] = useState<number | null>(null)
  // 每个圆圈的思考计时：index → 是否已解锁（可点击）
  const [unlocked, setUnlocked] = useState<Set<number>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  const lines = poem.lines
  const total = lines.length
  const line = lines[current]
  const hanziChars = line.chars.filter(c => c.pinyin !== null)
  const allRevealed = charStates.size >= hanziChars.length

  const imgFile = (imgMap as Record<string, string>)[String(poem.id)]
  const imgSrc = imgFile ? `/images/${encodeURIComponent(imgFile)}` : null

  // 思考圈解锁计时：切换到新行时逐个解锁
  useEffect(() => {
    setUnlocked(new Set())
    const thinkTime = round === 1 ? 1500 : 2000
    const timers: ReturnType<typeof setTimeout>[] = []
    hanziChars.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setUnlocked(prev => new Set([...prev, i]))
      }, thinkTime + i * 80))
    })
    return () => timers.forEach(clearTimeout)
  }, [current, round])

  // 动态计算每格尺寸
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const width = el.clientWidth - 40
      const count = line.chars.length
      const gap = 4
      const size = (width - gap * (count - 1)) / count
      setCharSize(Math.min(Math.max(size, 18), 38))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [current, line.chars.length])

  // 切换行时滚动
  useEffect(() => {
    const el = containerRef.current?.querySelector('.mm-line--active')
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [current])

  // 顺序揭示：只允许点击下一个未揭示的字
  function revealChar(idx: number) {
    if (charStates.size !== idx) return // 不是下一个，不允许
    if (!unlocked.has(idx)) return // 思考圈未解锁
    setCharStates(prev => new Map([...prev, [idx, 'self']]))
  }

  // 提示一下：第一阶显示拼音，第二阶显示全字
  function hint() {
    const nextHintStage = hintStage + 1
    setHintStage(nextHintStage)
    setHintUsed(true)
    setTotalHints(n => n + 1)

    if (nextHintStage === 1) {
      // 第一阶：只显示拼音提示，不揭示字
    } else {
      // 第二阶：把所有未揭示的字标为 hinted-full
      setCharStates(prev => {
        const next = new Map(prev)
        hanziChars.forEach((_, i) => {
          if (!next.has(i)) next.set(i, 'hinted-full')
        })
        return next
      })
      setUnlocked(prev => {
        const next = new Set(prev)
        hanziChars.forEach((_, i) => next.add(i))
        return next
      })
    }
  }

  function confirmLine() {
    setBurst(false)
    if (current < total - 1) {
      setCurrent(c => c + 1)
      setCharStates(new Map())
      setHintUsed(false)
      setHintStage(0)
    } else {
      if (round === 1) {
        setRound(2)
        setCurrent(0)
        setCharStates(new Map())
        setHintUsed(false)
        setHintStage(0)
      } else {
        // 计算星级：0提示=3星，1-2次=2星，3+次=1星
        const stars = totalHints === 0 ? 3 : totalHints <= 2 ? 2 : 1
        setCelebStars(stars)
        setCelebrated(true)
        onMemorized()
      }
    }
  }

  // allRevealed 时礼花（自己答出才有）
  useEffect(() => {
    if (!allRevealed) return
    if (!hintUsed) setBurst(true)
    else setBurst(false)
  }, [allRevealed])

  if (celebrated) {
    const starCount = celebStars
    const titles = ['', '这首诗稍难，多背几次就会了！', '背得很好！下次试试不用提示', '完美通关！一个提示都没用！']
    const subtitles = ['', `★☆☆`, `★★☆`, `★★★`]
    return (
      <div className="mm mm--celebrate">
        {imgSrc && <div className="mm__bg-wrap"><img className="mm__bg" src={imgSrc} aria-hidden /></div>}
        {starCount === 3 && (
          <div className="mm__celebrate-stars">
            {Array.from({ length: 24 }, (_, i) => (
              <span key={i} className="mm__star" style={{
                left: `${5 + (i * 3.8) % 90}%`,
                animationDelay: `${i * 0.06}s`,
                fontSize: `${0.8 + (i % 3) * 0.4}rem`,
              }}>★</span>
            ))}
          </div>
        )}
        <div className="mm__celebrate-box">
          <p className="mm__celebrate-stars-label">{subtitles[starCount]}</p>
          <p className="mm__celebrate-title">背出来啦！</p>
          <p className="mm__celebrate-poem">{poem.title}</p>
          <p className="mm__celebrate-sub">{titles[starCount]}</p>
          <div className="mm__celebrate-btns">
            <button className="mm__btn mm__btn--primary" onClick={onNext}>下一首 →</button>
            <button className="mm__btn mm__btn--ghost" onClick={() => {
              setCelebrated(false)
              setRound(1)
              setCurrent(0)
              setCharStates(new Map())
              setHintUsed(false)
              setHintStage(0)
              setTotalHints(0)
              setCelebStars(0)
              setBurst(false)
            }}>再背一遍</button>
          </div>
        </div>
        <style>{celebrateStyle}</style>
      </div>
    )
  }

  let charIdx = 0
  const showHintPinyin = hintStage >= 1 && !allRevealed

  return (
    <div className="mm">
      {imgSrc && <div className="mm__bg-wrap"><img className="mm__bg" src={imgSrc} aria-hidden /></div>}

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

      <h2 className="mm__title">{poem.title}</h2>

      <div className="mm__lines" ref={containerRef}>
        {lines.map((ln, li) => {
          const state = li < current ? 'done' : li === current ? 'active' : 'hidden'
          const isActive = state === 'active'

          return (
            <div key={li} className={`mm-line mm-line--${state}`}>
              {isActive ? (
                <div className="mm-line__active-content">
                  <div
                    className="mm-line__chars"
                    style={charSize ? {
                      '--cs': `${charSize}px`,
                      '--fs': `${charSize * 0.85}px`,
                      '--py': `${charSize * 0.35}px`,
                    } as React.CSSProperties : undefined}
                  >
                    {ln.chars.map((c, ci) => {
                      if (c.pinyin === null) {
                        return (
                          <span key={ci} className="mm-line__punct-col">
                            {(round === 1 || showHintPinyin) && <span className="mm-line__pinyin-slot" />}
                            <span className="mm-line__punct">{c.char}</span>
                          </span>
                        )
                      }
                      const idx = charIdx++
                      const cs = charStates.get(idx)
                      const isRev = cs !== undefined
                      const isHinted = cs === 'hinted-full'
                      const isNext = charStates.size === idx
                      const isUnlocked = unlocked.has(idx)

                      return (
                        <button
                          key={ci}
                          className={`mm-line__char-btn${isRev ? ' mm-line__char-btn--revealed' : ''}${isNext && !isRev ? ' mm-line__char-btn--next' : ''}`}
                          onClick={() => !isRev && revealChar(idx)}
                          disabled={isRev || !isUnlocked}
                        >
                          {/* 拼音行：第一轮显示，或提示第一阶显示 */}
                          {(round === 1 || showHintPinyin) && (
                            <span className={`mm-line__pinyin${showHintPinyin && round !== 1 ? ' mm-line__pinyin--hint' : ''}`}>
                              {c.pinyin}
                            </span>
                          )}
                          {isRev ? (
                            <span className={`mm-line__hanzi${isHinted ? ' mm-line__hanzi--hinted' : ''}`}>{c.char}</span>
                          ) : (
                            <span className={`mm-line__circle${isNext ? ' mm-line__circle--next' : ''}${isUnlocked ? ' mm-line__circle--ready' : ''}`}>
                              {!isUnlocked && isNext && (
                                <svg className="mm-line__think-arc" viewBox="0 0 40 40">
                                  <circle cx="20" cy="20" r="17" fill="none" stroke="#C62828" strokeWidth="3"
                                    strokeDasharray="107" strokeDashoffset="0"
                                    style={{ animationDuration: round === 1 ? '1.5s' : '2s' }}
                                    className="mm-line__think-ring"
                                  />
                                </svg>
                              )}
                            </span>
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

      <div className="mm__footer">
        {allRevealed ? (
          <button
            className={`mm__confirm${hintUsed ? ' mm__confirm--hinted' : ''}`}
            onClick={confirmLine}
          >
            {hintUsed ? '好，记住了' : '我背出来啦 ✓'}
          </button>
        ) : (
          hintStage < 2 && (
            <button className="mm__peek" onClick={hint}>
              {hintStage === 0 ? '提示一下' : '还是不会'}
            </button>
          )
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
    bottom: 0; left: 0;
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
    100% { transform: rotate(var(--angle)) translateY(calc(var(--dist) * -1)) scale(0.4); opacity: 0; }
  }
  .mm__header {
    position: relative; z-index: 10; flex-shrink: 0;
    display: flex; align-items: center; gap: 10px;
    padding: 0 16px; height: var(--navbar-height);
    background: #C62828;
  }
  .mm__exit {
    font-family: var(--font-ui); font-size: var(--text-sm);
    color: #FFF8E1; padding: 6px 12px; border-radius: 999px;
    background: rgba(255,255,255,0.15); flex-shrink: 0;
  }
  .mm__exit:active { background: rgba(255,255,255,0.28); }
  .mm__progress-wrap { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .mm__progress-bar {
    height: 4px; background: rgba(255,248,225,0.3);
    border-radius: 999px; overflow: hidden;
  }
  .mm__progress-fill {
    height: 100%; background: #FFF8E1;
    border-radius: 999px; transition: width 0.3s ease;
  }
  .mm__progress-label {
    font-family: var(--font-ui); font-size: 0.7rem;
    color: rgba(255,248,225,0.7); text-align: center;
  }
  .mm__round-badge {
    flex-shrink: 0; font-family: var(--font-ui);
    font-size: 0.72rem; font-weight: 700;
    color: #C62828; background: #FFF8E1;
    padding: 4px 10px; border-radius: 999px;
  }
  .mm__title {
    position: relative; z-index: 10;
    font-family: var(--font-brush); font-size: 1.6rem;
    color: #C62828; text-align: center;
    padding: 16px 0 4px; flex-shrink: 0;
  }
  .mm__lines {
    position: relative; z-index: 10; flex: 1;
    overflow-y: auto; padding: 8px 20px 0;
    display: flex; flex-direction: column; gap: 8px;
  }
  .mm-line--hidden { display: none; }
  .mm-line--done { opacity: 0.3; }
  .mm-line__done-text {
    font-family: var(--font-brush); font-size: 1.3rem;
    color: #333; text-align: center; padding: 6px 0;
  }
  .mm-line--active { opacity: 1; }
  .mm-line__active-content {
    display: flex; flex-direction: column;
    align-items: center; gap: 6px; padding: 16px 0 8px;
  }
  .mm-line__chars {
    display: flex; gap: 4px;
    align-items: flex-end; justify-content: center; flex-wrap: nowrap;
  }
  .mm-line__char-btn {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 4px 2px; border-radius: 8px; background: transparent;
    transition: transform 0.1s;
    min-width: var(--cs, 2.4rem); width: var(--cs, 2.4rem); flex-shrink: 0;
  }
  .mm-line__char-btn:not(.mm-line__char-btn--revealed):not(:disabled):active {
    transform: scale(0.88);
  }
  .mm-line__punct-col {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    min-width: calc(var(--cs, 2.4rem) * 0.5); flex-shrink: 0;
  }
  .mm-line__pinyin-slot { height: 1.2em; display: block; }
  .mm-line__pinyin {
    font-family: var(--font-ui); font-size: var(--py, 0.75rem);
    color: #C62828; white-space: nowrap; font-style: italic;
    line-height: 1.2; display: block;
  }
  .mm-line__pinyin--hint { color: #C47A0A; }
  .mm-line__circle {
    position: relative;
    width: var(--cs, 2.2rem); height: var(--cs, 2.2rem);
    border-radius: 50%; border: 2.5px solid rgba(198,40,40,0.3);
    background: rgba(198,40,40,0.05); display: flex;
    align-items: center; justify-content: center;
    transition: border-color 0.2s;
  }
  .mm-line__circle--ready {
    border-color: #C62828;
    background: rgba(198,40,40,0.08);
  }
  .mm-line__circle--next.mm-line__circle--ready {
    box-shadow: 0 0 0 4px rgba(198,40,40,0.18);
  }
  .mm-line__think-arc {
    position: absolute; inset: -3px;
    width: calc(100% + 6px); height: calc(100% + 6px);
    transform: rotate(-90deg);
    pointer-events: none;
  }
  .mm-line__think-ring {
    animation: thinkShrink linear forwards;
    stroke-linecap: round;
  }
  @keyframes thinkShrink {
    from { stroke-dashoffset: 0; }
    to   { stroke-dashoffset: 107; }
  }
  .mm-line__char-btn--revealed {
    animation: popChar 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;
  }
  @keyframes popChar {
    0%   { transform: scale(0.3); opacity: 0; }
    100% { transform: scale(1);   opacity: 1; }
  }
  .mm-line__hanzi {
    font-family: var(--font-brush); font-size: var(--fs, 2.2rem);
    color: #1a1a1a; line-height: 1;
  }
  .mm-line__hanzi--hinted { color: #C47A0A; }
  .mm-line__punct {
    font-family: var(--font-brush);
    font-size: calc(var(--fs, 2.2rem) * 0.7); color: #aaa;
  }
  .mm__footer {
    position: relative; z-index: 10; flex-shrink: 0;
    min-height: 64px;
    padding: 12px 20px calc(12px + env(safe-area-inset-bottom,0px));
    display: flex; flex-direction: column; gap: 10px;
    background: #fff; border-top: 1px solid #f0f0f0;
  }
  .mm__confirm {
    width: 100%; padding: 16px 0;
    background: #C62828; color: #FFF8E1;
    border-radius: 999px; font-family: var(--font-brush);
    font-size: var(--text-xl); font-weight: 700; letter-spacing: 0.05em;
    box-shadow: 0 4px 16px rgba(198,40,40,0.3);
    transition: transform 0.1s, opacity 0.1s;
    animation: confirmIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;
  }
  .mm__confirm--hinted {
    background: #C47A0A;
    box-shadow: 0 4px 16px rgba(196,122,10,0.3);
  }
  .mm__confirm:active { transform: scale(0.97); opacity: 0.9; }
  @keyframes confirmIn {
    from { transform: scale(0.85) translateY(8px); opacity: 0; }
    to   { transform: scale(1) translateY(0); opacity: 1; }
  }
  .mm__peek {
    font-family: var(--font-ui); font-size: var(--text-sm);
    color: #999; border: 1px solid #e0e0e0;
    border-radius: 999px; padding: 10px 0; background: transparent;
  }
  .mm__peek:active { background: #f5f5f5; }
`

const celebrateStyle = `
  .mm--celebrate {
    position: fixed; inset: 0;
    display: flex; align-items: center; justify-content: center;
    background: #fff; overflow: hidden;
  }
  .mm__bg-wrap {
    position: absolute; bottom: 0; left: 0;
    width: 100%; pointer-events: none; z-index: 0;
  }
  .mm__bg { display: block; width: 100%; height: auto; opacity: 0.2; }
  .mm__celebrate-stars {
    position: absolute; inset: 0; pointer-events: none; z-index: 1;
  }
  .mm__star {
    position: absolute; top: -2rem;
    animation: fallStar 1.6s ease-in forwards; color: #C62828;
  }
  @keyframes fallStar {
    0%   { top: -2rem; opacity: 1; transform: rotate(0deg) scale(1); }
    80%  { opacity: 1; }
    100% { top: 110vh; opacity: 0; transform: rotate(540deg) scale(0.5); }
  }
  .mm__celebrate-box {
    position: relative; z-index: 10;
    background: rgba(255,255,255,0.92); border-radius: 24px;
    padding: 32px 28px 28px; text-align: center;
    max-width: 300px; width: 90%;
    box-shadow: 0 8px 40px rgba(0,0,0,0.1);
    border: 1.5px solid rgba(198,40,40,0.12);
    animation: popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards;
  }
  @keyframes popIn {
    from { transform: scale(0.4); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
  }
  .mm__celebrate-stars-label {
    font-size: 1.6rem; letter-spacing: 0.1em;
    color: #FFD600; margin-bottom: 8px; text-shadow: 0 1px 4px rgba(0,0,0,0.1);
  }
  .mm__celebrate-title {
    font-family: var(--font-brush); font-size: 2.4rem;
    color: #C62828; margin-bottom: 4px;
  }
  .mm__celebrate-poem {
    font-family: var(--font-brush); font-size: 1.1rem;
    color: #aaa; margin-bottom: 4px;
  }
  .mm__celebrate-sub {
    font-size: var(--text-sm); color: #999; margin-bottom: 24px; line-height: 1.6;
  }
  .mm__celebrate-btns { display: flex; flex-direction: column; gap: 10px; }
  .mm__btn {
    padding: 13px 0; border-radius: 999px;
    font-family: var(--font-ui); font-size: var(--text-base); font-weight: 700;
    transition: transform 0.1s, opacity 0.1s;
  }
  .mm__btn:active { transform: scale(0.97); opacity: 0.85; }
  .mm__btn--primary {
    background: #C62828; color: #fff;
    box-shadow: 0 4px 16px rgba(198,40,40,0.3);
  }
  .mm__btn--ghost {
    background: transparent; border: 1.5px solid #e0e0e0; color: #999;
  }
`
