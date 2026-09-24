import { useState, useEffect, useRef } from 'react'
import type { Poem } from '../data/poems'
import imgMap from '../data/poem_img_map.json'

interface Props {
  poem: Poem
  onExit: () => void
  onNext: () => void
  onMemorized: (stars: number, charCount: number) => void
}

// 每行随机选 ~half 的汉字索引作为空格
function pickHidden(hanziCount: number): Set<number> {
  const count = Math.max(1, Math.round(hanziCount * 0.5))
  const indices = Array.from({ length: hanziCount }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return new Set(indices.slice(0, count))
}

type Round = 1 | 2 | 3

export default function MemorizeMode({ poem, onExit, onNext, onMemorized }: Props) {
  const [round, setRound] = useState<Round>(1)
  // 每行每个汉字是否已揭开
  const [lineRevealed, setLineRevealed] = useState<boolean[][]>(() =>
    poem.lines.map(ln => ln.chars.filter(c => c.pinyin !== null).map(() => false))
  )
  // 每行的隐藏字集合（整个会话固定，不随轮次变化）
  const [hiddenMap] = useState<Set<number>[]>(() =>
    poem.lines.map(ln => pickHidden(ln.chars.filter(c => c.pinyin !== null).length))
  )
  const [celebrated, setCelebrated] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  const lines = poem.lines
  const imgFile = (imgMap as Record<string, string>)[String(poem.id)]
  const imgSrc = imgFile ? `/images/${encodeURIComponent(imgFile)}` : null

  // 当前轮所有空格是否全部揭开
  const allDone = round === 2
    ? lineRevealed.every(row => row[0]) // 第二轮：每行第一个字作为已揭标记
    : lineRevealed.every((row, li) =>
        Array.from(hiddenMap[li]).every(idx => row[idx])
      )

  useEffect(() => {
    if (!allDone) return
    const t = setTimeout(() => {
      if (round < 3) {
        // 进入下一轮，重置揭开状态
        setRound(r => (r + 1) as Round)
        setLineRevealed(poem.lines.map(ln => ln.chars.filter(c => c.pinyin !== null).map(() => false)))
      } else {
        const charCount = lines.reduce((sum, ln) => sum + ln.chars.filter(c => c.pinyin !== null).length, 0)
        setCelebrated(true)
        onMemorized(3, charCount)
      }
    }, 500)
    return () => clearTimeout(t)
  }, [allDone]) // eslint-disable-line react-hooks/exhaustive-deps

  // 撒花
  useEffect(() => {
    if (!celebrated) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width = window.innerWidth
    const H = canvas.height = window.innerHeight
    const colors = ['#C62828', '#E53935', '#FFB300', '#FF6F00', '#43A047', '#1E88E5', '#8E24AA', '#FFD600']
    type P = { x: number; y: number; vx: number; vy: number; color: string; size: number; rot: number; rotV: number; shape: 'rect' | 'circle' | 'star'; opacity: number }
    const particles: P[] = Array.from({ length: 120 }, () => ({
      x: W * 0.15 + Math.random() * W * 0.7, y: H * 0.3 + Math.random() * H * 0.2,
      vx: (Math.random() - 0.5) * 10, vy: -(4 + Math.random() * 8),
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 8, rot: Math.random() * Math.PI * 2,
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
        p.vy += 0.25; p.x += p.vx; p.y += p.vy; p.rot += p.rotV
        if (p.y > H + 20) continue
        if (p.y > H * 0.7) p.opacity = Math.max(0, p.opacity - 0.02)
        any = true
        ctx.save(); ctx.globalAlpha = p.opacity; ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color
        if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        else if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill() }
        else {
          const R = p.size / 2, r = p.size / 3.5
          // 外圈5点 + 内圈5点交替
          const pts: [number, number][] = []
          for (let i = 0; i < 5; i++) {
            const oa = (i * 4 * Math.PI) / 5 - Math.PI / 2
            const ia = oa + Math.PI / 5
            pts.push([Math.cos(oa) * R, Math.sin(oa) * R])
            pts.push([Math.cos(ia) * r, Math.sin(ia) * r])
          }
          ctx.beginPath()
          ctx.moveTo(pts[0][0], pts[0][1])
          for (let i = 0; i < 10; i++) {
            const [x1, y1] = pts[i]
            const [x2, y2] = pts[(i + 1) % 10]
            // 控制点推向两点连线的外侧，让边向外鼓
            const cpx = (x1 + x2) / 2 * 1.4
            const cpy = (y1 + y2) / 2 * 1.4
            ctx.quadraticCurveTo(cpx, cpy, x2, y2)
          }
          ctx.closePath(); ctx.fill()
        }
        ctx.restore()
      }
      if (any) rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => { alive = false; cancelAnimationFrame(rafRef.current) }
  }, [celebrated])

  function revealChar(li: number, idx: number) {
    setLineRevealed(prev => prev.map((row, i) =>
      i === li ? row.map((v, j) => j === idx ? true : v) : row
    ))
  }

  const roundLabel = ['', '第一关', '有拼音', '无拼音'][round]
  const showPinyin = round !== 3

  if (celebrated) {
    return (
      <div className="mm mm--celebrate">
        {imgSrc && <div className="mm__bg-wrap"><img className="mm__bg" src={imgSrc} aria-hidden /></div>}
        <canvas ref={canvasRef} className="mm__confetti-canvas" aria-hidden />
        <div className="mm__celebrate-box">
          <p className="mm__celebrate-title">背出来啦！</p>
          <p className="mm__celebrate-poem">{poem.title}</p>
          <div className="mm__stars-row">
            {[1, 2, 3].map(i => (
              <svg key={i} className="mm__star-item mm__star-item--on"
                style={{ animationDelay: `${(i - 1) * 0.15}s` }}
                viewBox="0 0 1024 1024" width="40" height="40">
                <path d="M750.01 958.626c-8.195 0-17.027-2.469-26.242-7.31l-163.745-86.078c-21.797-11.465-63.08-11.439-84.853 0l-163.768 86.078c-20.835 10.957-40.743 9.105-51.837-4.07-5.463-6.482-11.229-18.544-7.7-39.185l31.281-182.339c4.384-25.607-7.619-62.569-26.216-80.715L124.424 515.878c-19.523-19.04-18.007-35.539-15.345-43.68 2.635-8.138 11.122-22.377 38.107-26.296l183.09-26.614c25.702-3.74 57.147-26.575 68.653-49.877l81.874-165.88c12.056-24.449 28.228-28.108 36.796-28.108 8.567 0 24.739 3.659 36.796 28.108l81.873 165.88c11.519 23.303 42.947 46.151 68.667 49.877l183.072 26.614c26.99 3.919 35.459 18.158 38.108 26.296 2.652 8.142 4.182 24.64-15.341 43.68l-132.48 129.129c-18.629 18.128-30.632 55.094-26.23 80.715l31.281 182.339c3.542 20.641-2.224 32.703-7.7 39.185-6.236 7.34-15.318 11.38-25.635 11.38z m35.566-714.077c-5.682 0-10.375-4.03-12.539-10.803l-11.095-34.506c-1.655-5.109-7.794-11.26-12.91-12.903l-34.538-11.122c-6.025-1.932-9.904-5.879-10.651-10.831-0.743-4.952 1.793-9.891 6.983-13.506l28.753-20.172c4.316-3.033 8.155-10.612 8.017-15.881l-0.882-35.843c-0.152-6.071 2.013-9.587 3.834-11.466 4.344-4.443 11.52-4.523 17.881 0.277l29.236 21.966c4.07 3.06 12.969 4.523 17.841 2.952l33.606-11.04c6.791-2.233 12.903-0.703 16.213 3.851 2.568 3.556 3.037 8.388 1.296 13.645l-11.036 33.611c-1.656 5.06-0.265 13.559 2.939 17.836l21.962 29.209c3.78 5.037 4.706 10.472 2.501 14.888-2.184 4.357-6.944 6.858-13.069 6.858l-36.464-0.899c-5.588 0-12.903 3.739-15.895 8.017L797.4 237.441c-4.33 6.183-9.256 7.108-11.824 7.108zM246.39 328.583c-3.311 0-6.778-1.378-10.03-3.959l-13.314-10.634c-3.976-3.163-12.821-4.872-17.675-3.382l-16.307 4.939c-6.831 2.04-12.803 0.429-15.98-4.139-1.449-2.098-3.502-6.693-0.841-13.81l6.017-15.949c1.874-4.984 0.814-13.497-2.237-17.855l-9.753-13.989c-3.561-5.109-4.308-10.531-2.018-14.861 2.224-4.264 6.899-7.535 12.849-7.535l18.073-0.04h0.014c5.847 0 13.215-2.746 16.306-6.818l10.281-13.161c7.766-10.263 20.789-7.341 24.144 4.858l4.523 16.512c1.422 5.123 7.287 11.453 12.325 13.193l16.1 5.6c6 2.086 9.779 6.139 10.401 11.122 0.622 4.966-2.057 9.819-7.367 13.314l-14.208 9.382c-4.43 2.925-8.586 10.441-8.693 15.783l-0.318 17.013c-0.262 9.961-6.347 14.416-12.292 14.416z"
                  fill="#FFB300" />
              </svg>
            ))}
          </div>
          <div className="mm__celebrate-btns">
            <button className="mm__btn mm__btn--primary" onClick={onNext}>下一首 →</button>
            <button className="mm__btn mm__btn--ghost" onClick={() => {
              setCelebrated(false)
              setRound(1)
              setLineRevealed(poem.lines.map(ln => ln.chars.filter(c => c.pinyin !== null).map(() => false)))
            }}>再背一遍</button>
          </div>
        </div>
        <style>{celebrateStyle}</style>
      </div>
    )
  }

  const totalBlanks = hiddenMap.reduce((s, h) => s + h.size, 0)
  const revealedBlanks = lineRevealed.reduce((s, row, li) =>
    s + Array.from(hiddenMap[li]).filter(idx => row[idx]).length, 0)

  return (
    <div className="mm">
      {imgSrc && <div className="mm__bg-wrap"><img className="mm__bg" src={imgSrc} aria-hidden /></div>}

      <header className="mm__header">
        <button className="mm__exit" onClick={e => { e.stopPropagation(); onExit() }}>退出</button>
        <div className="mm__progress-wrap">
          <div className="mm__progress-bar">
            <div className="mm__progress-fill" style={{ width: `${(revealedBlanks / totalBlanks) * 100}%` }} />
          </div>
          <span className="mm__progress-label">{revealedBlanks} / {totalBlanks}</span>
        </div>
        <span className="mm__round-badge">{roundLabel}</span>
      </header>

      <h2 className="mm__title">{poem.title}</h2>

      <div className="mm__lines">
        {lines.map((ln, li) => {
          const hidden = hiddenMap[li]
          const revealed = lineRevealed[li]

          // 第二轮：整行点击揭开
          if (round === 2) {
            const isRevealed = revealed[0]
            const firstPinyin = ln.chars.find(c => c.pinyin !== null)?.pinyin ?? ''
            return (
              <button
                key={li}
                className={`mm-line mm-line--block${isRevealed ? ' mm-line--block-revealed' : ''}`}
                onClick={() => !isRevealed && setLineRevealed(prev => prev.map((row, i) => i === li ? row.map(() => true) : row))}
                disabled={isRevealed}
              >
                {isRevealed ? (
                  <>
                    {ln.chars.map((c, i) => c.pinyin !== null
                      ? <span key={i} className="mm-char">
                          <span className="mm-char__py-area"><span className="mm-char__pinyin">{c.pinyin}</span></span>
                          <span className="mm-char__hanzi mm-char__hanzi--pop">{c.char}</span>
                        </span>
                      : <span key={i} className="mm-char mm-char--punct">
                          <span className="mm-char__py-area" />
                          <span className="mm-char__hanzi">{c.char}</span>
                        </span>
                    )}
                  </>
                ) : (
                  <>
                    {ln.chars.map((c, i) => c.pinyin !== null
                      ? <span key={i} className="mm-char">
                          <span className="mm-char__py-area">
                            {i === 0 && <span className="mm-char__pinyin">{firstPinyin}</span>}
                          </span>
                          <span className="mm-char__blank-box" />
                        </span>
                      : <span key={i} className="mm-char mm-char--punct">
                          <span className="mm-char__py-area" />
                          <span className="mm-char__hanzi">{c.char}</span>
                        </span>
                    )}
                  </>
                )}
              </button>
            )
          }

          // 第一轮、第三轮：逐字点击
          let hIdx = 0
          return (
            <div key={li} className="mm-line">
              {ln.chars.map((c, ci) => {
                if (c.pinyin === null) {
                  return (
                    <span key={ci} className="mm-char mm-char--punct">
                      {showPinyin && <span className="mm-char__py-area" />}
                      <span className="mm-char__hanzi">{c.char}</span>
                    </span>
                  )
                }
                const idx = hIdx++
                const isHidden = hidden.has(idx)
                const isRevealed = revealed[idx]

                if (!isHidden) {
                  return (
                    <span key={ci} className="mm-char mm-char--visible">
                      {showPinyin
                        ? <span className="mm-char__py-area"><span className="mm-char__pinyin">{c.pinyin}</span></span>
                        : <span className="mm-char__py-area" />}
                      <span className="mm-char__hanzi">{c.char}</span>
                    </span>
                  )
                }

                if (isRevealed) {
                  return (
                    <span key={ci} className="mm-char mm-char--revealed">
                      {showPinyin
                        ? <span className="mm-char__py-area"><span className="mm-char__pinyin">{c.pinyin}</span></span>
                        : <span className="mm-char__py-area" />}
                      <span className="mm-char__hanzi mm-char__hanzi--pop">{c.char}</span>
                    </span>
                  )
                }

                return (
                  <button key={ci} className="mm-char mm-char--blank" onClick={() => revealChar(li, idx)}>
                    <span className="mm-char__py-area" />
                    <span className="mm-char__blank-box" />
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="mm__footer-hint">
        <span className="mm__footer-hint-text">
          {round === 1 && '想出来了就点空格'}
          {round === 2 && '背出来了就点整句'}
          {round === 3 && '不看拼音，全靠记忆！'}
        </span>
        <button className="mm__hint-btn" onClick={() => {
          if (round === 2) {
            setLineRevealed(prev => prev.map(row => row.map(() => true)))
          } else {
            setLineRevealed(prev => prev.map((row, li) =>
              row.map((v, idx) => hiddenMap[li].has(idx) ? true : v)
            ))
          }
        }}>提示一下</button>
      </div>

      <style>{mainStyle}</style>
    </div>
  )
}

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
  .mm__bg { display: block; width: 100%; height: auto; opacity: 0.18; }
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
    padding: 20px 0 8px; flex-shrink: 0;
  }
  .mm__lines {
    position: relative; z-index: 10; flex: 1;
    display: flex; flex-direction: column;
    justify-content: center;
    padding-bottom: 25%;
    gap: 18px; padding-left: 28px; padding-right: 28px;
  }
  .mm-line {
    display: flex; align-items: flex-end;
    justify-content: center; gap: 6px; flex-wrap: nowrap;
  }
  .mm-line--block {
    width: 100%; border-radius: 16px;
    padding: 16px 20px; min-height: 64px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(198,40,40,0.06);
    border: 2px dashed rgba(198,40,40,0.25);
    transition: transform 0.1s;
  }
  .mm-line--block:active { transform: scale(0.97); }
  .mm-line--block-revealed {
    background: rgba(198,40,40,0.04);
    border: 2px solid rgba(198,40,40,0.15);
    cursor: default;
  }
  .mm-line__text {
    font-family: var(--font-brush); font-size: 1.8rem;
    color: #1a1a1a; letter-spacing: 0.08em; line-height: 1;
  }
  .mm-line__text--pop {
    animation: popLine 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes popLine {
    0%   { transform: scale(0.7); opacity: 0; }
    100% { transform: scale(1);   opacity: 1; }
  }
  .mm-line__hint-wrap {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
  }
  .mm-line__first-pinyin {
    font-family: var(--font-ui); font-size: 0.85rem;
    color: #C62828; font-style: italic; letter-spacing: 0.05em;
  }
  .mm-line__dots {
    display: flex; gap: 8px; align-items: center;
  }
  .mm-line__dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: rgba(198,40,40,0.25); flex-shrink: 0;
  }
  .mm-char {
    display: flex; flex-direction: column;
    align-items: center; gap: 3px; flex-shrink: 0;
  }
  .mm-char__py-area {
    height: 1.1em; display: flex; align-items: center; justify-content: center;
  }
  .mm-char__pinyin {
    font-family: var(--font-ui); font-size: 0.72rem;
    color: #C62828; font-style: italic;
    line-height: 1; white-space: nowrap;
  }
  .mm-char__hanzi {
    font-family: var(--font-brush); font-size: 2rem;
    color: #1a1a1a; line-height: 1;
  }
  .mm-char__hanzi--pop {
    animation: popChar 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes popChar {
    0%   { transform: scale(0.2) rotate(-10deg); opacity: 0; }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  .mm-char--punct .mm-char__hanzi {
    font-size: 1.4rem; color: #aaa;
  }
  .mm-char--blank {
    background: transparent; padding: 0; transition: transform 0.1s;
  }
  .mm-char--blank:active { transform: scale(0.88); }
  .mm-char__blank-box {
    width: 2rem; height: 2rem; border-radius: 8px;
    border: 2.5px dashed #C62828;
    background: rgba(198,40,40,0.06); display: block;
  }
  .mm__footer-hint {
    position: relative; z-index: 10; flex-shrink: 0;
    padding: 10px 20px calc(14px + env(safe-area-inset-bottom,0px));
    display: flex; align-items: center; justify-content: center; gap: 12px;
  }
  .mm__footer-hint-text {
    font-family: var(--font-ui); font-size: var(--text-sm); color: #bbb;
  }
  .mm__hint-btn {
    font-family: var(--font-ui); font-size: var(--text-sm);
    color: #C62828; padding: 5px 14px; border-radius: 999px;
    background: rgba(198,40,40,0.08); border: 1px solid rgba(198,40,40,0.2);
    flex-shrink: 0;
  }
  .mm__hint-btn:active { background: rgba(198,40,40,0.16); }
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
    position: absolute; inset: 0; width: 100%; height: 100%;
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
    margin: 12px 0 20px;
  }
  .mm__star-item { font-size: 2.4rem; color: #e0e0e0; }
  .mm__star-item--on {
    color: #FFB300;
    animation: starPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes starPop {
    0%   { transform: scale(0.3); opacity: 0; }
    100% { transform: scale(1);   opacity: 1; }
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
