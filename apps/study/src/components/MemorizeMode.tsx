import { useState, useEffect, useRef } from 'react'
import type { Poem } from '../data/poems'
import imgMap from '../data/poem_img_map.json'

interface Props {
  poem: Poem
  onExit: () => void
  onNext: () => void
  onMemorized: (stars: number, charCount: number) => void
}

type Round = 1 | 2
type CharState = 'hidden' | 'hinted-pinyin' | 'hinted-full' | 'self'

export default function MemorizeMode({ poem, onExit, onNext, onMemorized }: Props) {
  const [round, setRound] = useState<Round>(1)
  const [current, setCurrent] = useState(0)
  const [charStates, setCharStates] = useState<Map<number, CharState>>(new Map())
  const [hintUsed, setHintUsed] = useState(false)
  const [hintStage, setHintStage] = useState(0)
  const [celebrated, setCelebrated] = useState(false)
  const [celebStars, setCelebStars] = useState(0)
  const [totalHints, setTotalHints] = useState(0)
  const [burst, setBurst] = useState(false)
  const [charSize, setCharSize] = useState<number | null>(null)
  const [unlocked, setUnlocked] = useState<Set<number>>(new Set())
  const [transitioning, setTransitioning] = useState(false)
  const [transCountdown, setTransCountdown] = useState(3)
  const [autoCountdown, setAutoCountdown] = useState(3)
  const [autoKey, setAutoKey] = useState(0)
  const [circleText, setCircleText] = useState('✓')
  const [circleFade, setCircleFade] = useState(false)
  const confirmedRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  const lines = poem.lines
  const total = lines.length
  const line = lines[current]
  const hanziChars = line.chars.filter(c => c.pinyin !== null)
  const allRevealed = charStates.size >= hanziChars.length

  const imgFile = (imgMap as Record<string, string>)[String(poem.id)]
  const imgSrc = imgFile ? `/images/${encodeURIComponent(imgFile)}` : null

  // 切换行/轮时重置解锁状态
  useEffect(() => {
    setUnlocked(new Set())
  }, [current, round])

  // 每揭示一个字后，为下一个字启动思考倒计时
  useEffect(() => {
    const nextIdx = charStates.size
    if (nextIdx >= hanziChars.length) return
    const thinkTime = round === 1 ? 800 : 1000
    const t = setTimeout(() => {
      setUnlocked(prev => new Set([...prev, nextIdx]))
    }, thinkTime)
    return () => clearTimeout(t)
  }, [charStates.size, current, round])

  // 动态字号
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

  // 滚动到当前行
  useEffect(() => {
    const el = containerRef.current?.querySelector('.mm-line--active')
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [current])

  // 每切换行时重置确认标志和倒计时 key
  useEffect(() => {
    confirmedRef.current = false
    setAutoCountdown(3)
    setAutoKey(k => k + 1)
  }, [current, round])

  // 全部揭示后 3 秒倒计时，每秒更新数字，到 0 自动推进
  useEffect(() => {
    if (!allRevealed) return
    if (autoCountdown <= 0) {
      if (!confirmedRef.current) confirmLine()
      return
    }
    const t = setTimeout(() => setAutoCountdown(n => n - 1), 1000)
    return () => clearTimeout(t)
  }, [allRevealed, autoCountdown])

  // 轮间过渡倒计时（3秒）
  useEffect(() => {
    if (!transitioning) return
    setCircleText('✓')
    setCircleFade(false)
    // 1秒后开始切换数字
    const t0 = setTimeout(() => {
      setCircleFade(true)
      setTimeout(() => { setCircleText('3'); setCircleFade(false) }, 200)
    }, 1000)
    const t1 = setTimeout(() => { setCircleFade(true); setTimeout(() => { setCircleText('2'); setCircleFade(false) }, 200) }, 2000)
    const t2 = setTimeout(() => { setCircleFade(true); setTimeout(() => { setCircleText('1'); setCircleFade(false) }, 200) }, 3000)
    const t3 = setTimeout(() => { setCircleFade(true); setTimeout(() => { setCircleText('👍🏻'); setCircleFade(false) }, 200) }, 4000)
    return () => [t0, t1, t2, t3].forEach(clearTimeout)
  }, [transitioning])

  useEffect(() => {
    if (!transitioning) return
    if (transCountdown <= 0) {
      setTransitioning(false)
      setRound(2)
      setCurrent(0)
      setCharStates(new Map())
      setHintUsed(false)
      setHintStage(0)
      return
    }
    const t = setTimeout(() => setTransCountdown(n => n - 1), 1000)
    return () => clearTimeout(t)
  }, [transitioning, transCountdown])

  function revealChar(idx: number) {
    if (charStates.size !== idx) return
    if (!unlocked.has(idx)) return
    setCharStates(prev => new Map([...prev, [idx, 'self']]))
  }

  function hint() {
    const nextHintStage = hintStage + 1
    setHintStage(nextHintStage)
    setHintUsed(true)
    setTotalHints(n => n + 1)
    if (nextHintStage >= 2) {
      setCharStates(prev => {
        const next = new Map(prev)
        hanziChars.forEach((_, i) => { if (!next.has(i)) next.set(i, 'hinted-full') })
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
    if (confirmedRef.current) return
    confirmedRef.current = true
    setBurst(false)
    if (current < total - 1) {
      setCurrent(c => c + 1)
      setCharStates(new Map())
      setHintUsed(false)
      setHintStage(0)
    } else {
      if (round === 1) {
        setTransCountdown(3)
        setTransitioning(true)
      } else {
        const stars = totalHints === 0 ? 3 : totalHints <= 2 ? 2 : 1
        const charCount = lines.reduce((sum, ln) => sum + ln.chars.filter(c => c.pinyin !== null).length, 0)
        setCelebStars(stars)
        setCelebrated(true)
        onMemorized(stars, charCount)
      }
    }
  }

  useEffect(() => {
    if (!allRevealed) return
    if (!hintUsed) setBurst(true)
    else setBurst(false)
  }, [allRevealed])

  // 撒花动画
  useEffect(() => {
    if (!celebrated) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width = window.innerWidth
    const H = canvas.height = window.innerHeight

    const count = celebStars === 3 ? 120 : celebStars === 2 ? 80 : 50
    const colors = ['#C62828', '#E53935', '#FFB300', '#FF6F00', '#43A047', '#1E88E5', '#8E24AA', '#FFD600']

    type Particle = {
      x: number; y: number; vx: number; vy: number
      color: string; size: number; rot: number; rotV: number
      shape: 'rect' | 'circle' | 'star'; opacity: number
    }

    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: W * 0.2 + Math.random() * W * 0.6,
      y: H * 0.3 + Math.random() * H * 0.2,
      vx: (Math.random() - 0.5) * 10,
      vy: -(4 + Math.random() * 8),
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 8,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.2,
      shape: (['rect', 'circle', 'star'] as const)[Math.floor(Math.random() * 3)],
      opacity: 1,
    }))

    let alive = true
    function draw() {
      if (!alive || !ctx) return
      ctx.clearRect(0, 0, W, H)
      let any = false
      for (const p of particles) {
        p.vy += 0.25
        p.x += p.vx
        p.y += p.vy
        p.rot += p.rotV
        if (p.y > H + 20) continue
        if (p.y > H * 0.7) p.opacity = Math.max(0, p.opacity - 0.02)
        any = true
        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        } else if (p.shape === 'circle') {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.beginPath()
          for (let i = 0; i < 5; i++) {
            const a = (i * 4 * Math.PI) / 5 - Math.PI / 2
            const r = i % 2 === 0 ? p.size / 2 : p.size / 4
            i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
          }
          ctx.closePath()
          ctx.fill()
        }
        ctx.restore()
      }
      if (any) rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => {
      alive = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [celebrated, celebStars])

  // 轮间过渡屏
  if (transitioning) {
    return (
      <div className="mm mm--transition">
        {imgSrc && (
          <img className="mm__trans-bg" src={imgSrc} aria-hidden />
        )}

        <div className="mm__trans-top">
          <div className={`mm__trans-circle${circleFade ? ' mm__trans-circle--fade' : ''}`}>
            <span className="mm__trans-circle-inner">{circleText}</span>
          </div>
          <p className="mm__trans-label">第一关完成</p>
          <p className="mm__trans-bravo">太棒了！</p>
        </div>
        <svg className="mm__trans-arch" viewBox="0 0 390 60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0,0 L390,0 L390,60 Q195,0 0,60 Z" fill="#C62828"/>
        </svg>

        <div className="mm__trans-body">
          <h2 className="mm__trans-poem-title">{poem.title}</h2>
          <div className="mm__trans-lines">
            {lines.map((ln, i) => (
              <p key={i} className="mm__trans-line" style={{ animationDelay: `${0.4 + i * 0.08}s` }}>
                {ln.text}
              </p>
            ))}
          </div>
          <div className="mm__trans-next-badge">
            <div className="mm__trans-next-icon">2</div>
            <span className="mm__trans-next-text">第二关：不看拼音背诵</span>
          </div>
        </div>

        <div className="mm__trans-footer">
          <p className="mm__trans-countdown-text">{transCountdown > 0 ? `${transCountdown} 秒后自动进入第二关` : '即将进入第二关...'}</p>
          <div className="mm__trans-bar">
            <div className="mm__trans-bar-fill" key="trans-bar" />
          </div>
        </div>

        <style>{transitionStyle}</style>
      </div>
    )
  }

  if (celebrated) {
    const starCount = celebStars
    const titles = ['', '这首诗稍难，多背几次就会了！', '背得很好！下次试试不用提示', '完美通关！一个提示都没用！']
    return (
      <div className="mm mm--celebrate">
        {imgSrc && <div className="mm__bg-wrap"><img className="mm__bg" src={imgSrc} aria-hidden /></div>}
        <canvas ref={canvasRef} className="mm__confetti-canvas" aria-hidden />
        <div className="mm__celebrate-box">
          <p className="mm__celebrate-title">背出来啦！</p>
          <p className="mm__celebrate-poem">{poem.title}</p>
          <div className="mm__stars-row">
            {[1, 2, 3].map(i => (
              <span
                key={i}
                className={`mm__star-item${i <= starCount ? ' mm__star-item--on' : ''}`}
                style={{ animationDelay: `${(i - 1) * 0.15}s` }}
              >★</span>
            ))}
          </div>
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
            const colors = ['#C62828', '#E53935', '#FFD600', '#FF6F00', '#C62828', '#FFD600']
            const shapes = ['●', '★', '●', '◆', '★', '●']
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
        <button className="mm__exit" onClick={e => { e.stopPropagation(); onExit() }}>退出</button>
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
                          onClick={e => { e.stopPropagation(); !isRev && revealChar(idx) }}
                          disabled={isRev || !isUnlocked}
                        >
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
                                    style={{ animationDuration: round === 1 ? '0.8s' : '1s' }}
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
          <button className="mm__confirm" key={autoKey} onClick={confirmLine}>
            <span className="mm__confirm-text">{hintUsed ? '好，记住了 ✓' : '我背出来啦 ✓'}</span>
            <span className="mm__confirm-count">{autoCountdown > 0 ? autoCountdown : ''}</span>
            <span className="mm__confirm-bar"><span className="mm__confirm-fill" /></span>
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

const transitionStyle = `
  .mm--transition {
    position: fixed; inset: 0;
    display: flex; flex-direction: column;
    overflow: hidden;
    background: #fff;
  }
  .mm__trans-bg {
    position: absolute;
    top: 220px; left: 0; right: 0; bottom: 0;
    width: 100%; height: calc(100% - 220px);
    object-fit: cover; object-position: center top;
    opacity: 0.3; pointer-events: none; z-index: 0;
  }
  .mm__trans-top {
    width: 100%;
    background: #C62828;
    padding: 48px 28px 0;
    display: flex; flex-direction: column;
    align-items: center; gap: 10px;
    text-align: center;
    position: relative; z-index: 2;
    flex-shrink: 0;
  }
  .mm__trans-circle {
    width: 72px; height: 72px; border-radius: 50%;
    background: rgba(255,255,255,0.2);
    border: 2.5px solid rgba(255,255,255,0.7);
    display: flex; align-items: center; justify-content: center;
    animation: transPopIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
    transition: opacity 0.2s;
  }
  .mm__trans-circle--fade { opacity: 0; }
  .mm__trans-circle-inner {
    font-family: var(--font-brush); font-size: 2rem;
    color: #fff; line-height: 1;
  }
  .mm__trans-label {
    font-size: 0.72rem; color: rgba(255,255,255,0.75);
    letter-spacing: 0.15em; font-weight: 600;
    font-family: var(--font-ui);
    animation: transFadeDown 0.4s 0.2s ease both;
  }
  .mm__trans-bravo {
    font-family: var(--font-brush); font-size: 2.2rem;
    color: #fff;
    animation: transFadeDown 0.4s 0.3s ease both;
    padding-bottom: 8px;
  }
  .mm__trans-arch {
    width: 100%; display: block;
    position: relative; z-index: 2;
    margin-top: -1px; flex-shrink: 0;
  }
  .mm__trans-body {
    flex: 1; position: relative; z-index: 1;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 20px; padding: 8px 32px 0;
    text-align: center;
  }
  .mm__trans-poem-title {
    font-family: var(--font-brush); font-size: 2.8rem;
    color: #C62828;
    animation: transFadeUp 0.4s 0.4s ease both;
  }
  .mm__trans-lines {
    display: flex; flex-direction: column;
    align-items: center; gap: 8px;
    animation: transFadeUp 0.4s 0.5s ease both;
  }
  .mm__trans-line {
    font-family: var(--font-brush); font-size: 1.1rem;
    color: #444; text-align: center;
  }
  .mm__trans-next-badge {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 20px; border-radius: 14px;
    background: #FFEBEE;
    animation: transFadeUp 0.4s 0.6s ease both;
  }
  .mm__trans-next-icon {
    width: 24px; height: 24px; border-radius: 50%;
    background: #C62828;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; color: #fff; font-weight: 700;
    font-family: var(--font-ui);
  }
  .mm__trans-next-text {
    font-size: 0.78rem; color: #C62828;
    font-weight: 600; font-family: var(--font-ui);
  }
  .mm__trans-footer {
    position: relative; z-index: 2; flex-shrink: 0;
    padding: 16px 28px calc(16px + env(safe-area-inset-bottom,0px));
    display: flex; flex-direction: column; gap: 6px; align-items: center;
  }
  .mm__trans-countdown-text {
    font-size: 0.72rem; color: #C62828;
    font-weight: 600; font-family: var(--font-ui);
  }
  .mm__trans-bar {
    width: 100%; height: 4px;
    background: #F5EDE8; border-radius: 999px; overflow: hidden;
  }
  .mm__trans-bar-fill {
    height: 100%; background: #C62828;
    border-radius: 999px; width: 100%;
    animation: drainBar 3s linear forwards;
    animation-delay: 1s;
  }
  @keyframes transPopIn {
    from { transform: scale(0.2); opacity: 0; }
    to   { transform: scale(1); opacity: 1; }
  }
  @keyframes transFadeDown {
    from { opacity: 0; transform: translateY(-10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes transFadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes drainBar {
    from { width: 100%; }
    to   { width: 0%; }
  }
`

const mainStyle = `
  .mm {
    position: fixed; inset: 0;
    display: flex; flex-direction: column;
    overflow: hidden; background: #fff;
  }
  .mm__bg-wrap {
    position: absolute; bottom: 0; left: 0;
    width: 100%; pointer-events: none; z-index: 0;
  }
  .mm__bg { display: block; width: 100%; height: auto; opacity: 0.2; }
  .mm__burst {
    position: absolute; inset: 0; pointer-events: none; z-index: 20;
    display: flex; align-items: center; justify-content: center;
  }
  .mm__burst-particle {
    position: absolute;
    animation: burstFly 0.75s cubic-bezier(0.2,0.8,0.4,1) forwards;
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
    border-color: #C62828; background: rgba(198,40,40,0.08);
  }
  .mm-line__circle--next.mm-line__circle--ready {
    box-shadow: 0 0 0 4px rgba(198,40,40,0.18);
  }
  .mm-line__think-arc {
    position: absolute; inset: -3px;
    width: calc(100% + 6px); height: calc(100% + 6px);
    transform: rotate(-90deg); pointer-events: none;
  }
  .mm-line__think-ring {
    animation: thinkShrink linear forwards; stroke-linecap: round;
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
    height: var(--cs, 2.2rem);
    display: flex; align-items: center; justify-content: center;
  }
  .mm-line__hanzi--hinted { color: #C47A0A; }
  .mm-line__punct {
    font-family: var(--font-brush);
    font-size: calc(var(--fs, 2.2rem) * 0.7); color: #aaa;
  }
  .mm__footer {
    position: relative; z-index: 10; flex-shrink: 0;
    min-height: 56px;
    padding: 10px 20px calc(10px + env(safe-area-inset-bottom,0px));
    display: flex; flex-direction: column; gap: 10px;
    background: #fff; border-top: 1px solid #f0f0f0;
  }
  .mm__confirm {
    position: relative; overflow: hidden;
    width: 100%; padding: 14px 0;
    border-radius: 999px; background: #C62828;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    box-shadow: 0 4px 16px rgba(198,40,40,0.3);
    transition: transform 0.1s, opacity 0.1s;
  }
  .mm__confirm:active { transform: scale(0.97); opacity: 0.85; }
  .mm__confirm-text {
    font-family: var(--font-ui); font-size: var(--text-base);
    font-weight: 700; color: #fff; line-height: 1;
  }
  .mm__confirm-count {
    font-family: var(--font-ui); font-size: var(--text-base);
    font-weight: 700; color: rgba(255,255,255,0.7);
    line-height: 1; min-width: 1em; text-align: left;
  }
  .mm__confirm-bar {
    position: absolute; bottom: 0; left: 0; right: 0;
    height: 3px; background: rgba(255,255,255,0.2);
  }
  .mm__confirm-fill {
    display: block; height: 100%; background: rgba(255,255,255,0.6);
    border-radius: 999px; width: 100%;
    animation: drainConfirm 3s linear forwards;
  }
  @keyframes drainConfirm {
    from { width: 100%; }
    to   { width: 0%; }
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
  .mm__confetti-canvas {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    pointer-events: none; z-index: 1;
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
  .mm__celebrate-title {
    font-family: var(--font-brush); font-size: 2.4rem;
    color: #C62828; margin-bottom: 4px;
  }
  .mm__celebrate-poem {
    font-family: var(--font-brush); font-size: 1.1rem;
    color: #aaa; margin-bottom: 4px;
  }
  .mm__stars-row {
    display: flex; justify-content: center; gap: 8px;
    margin: 12px 0 8px;
  }
  .mm__star-item {
    font-size: 2.4rem; color: #e0e0e0;
  }
  .mm__star-item--on {
    color: #FFB300;
    animation: starPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes starPop {
    0%   { transform: scale(0.3); opacity: 0; }
    100% { transform: scale(1);   opacity: 1; }
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
