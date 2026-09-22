import { useState, useEffect } from 'react'
import type { Poem } from '../data/poems'

interface Props {
  poem: Poem
  onExit: () => void
  onNext: () => void
  onMemorized: () => void
}

export default function MemorizeMode({ poem, onExit, onNext, onMemorized }: Props) {
  const [unlocked, setUnlocked] = useState<Set<number>>(new Set())
  const [celebrated, setCelebrated] = useState(false)
  const total = poem.lines.length

  const allDone = unlocked.size === total

  useEffect(() => {
    if (allDone && !celebrated) {
      setCelebrated(true)
      onMemorized()
    }
  }, [allDone, celebrated, onMemorized])

  function unlock(i: number) {
    setUnlocked(prev => new Set([...prev, i]))
  }

  function reset() {
    setUnlocked(new Set())
    setCelebrated(false)
  }

  const stars = Array.from({ length: 12 }, (_, i) => i)

  return (
    <div className="memorize">
      {/* 顶部 */}
      <div className="memorize__header">
        <button className="memorize__exit" onClick={onExit} aria-label="退出背诵">
          退出
        </button>
        <span className="memorize__progress">
          {unlocked.size} / {total} 行
        </span>
      </div>

      <h2 className="memorize__title">{poem.title}</h2>

      {/* 诗句列表 */}
      <div className="memorize__lines">
        {poem.lines.map((line, i) => {
          const isUnlocked = unlocked.has(i)
          return (
            <button
              key={i}
              className={`memorize__line${isUnlocked ? ' memorize__line--unlocked' : ''}`}
              onClick={() => !isUnlocked && unlock(i)}
              aria-label={isUnlocked ? line.text : '点击解锁这一行'}
              disabled={isUnlocked}
            >
              {isUnlocked ? (
                <>
                  <span className="memorize__line-check">背出</span>
                  <span className="memorize__line-text">{line.text}</span>
                </>
              ) : (
                <span className="memorize__line-hidden">
                  {line.chars.filter(c => c.pinyin !== null).map((_, j) => (
                    <span key={j} className="memorize__block">■</span>
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="memorize__hint">点击每行来解锁它</p>

      {/* 庆祝面板 */}
      {allDone && (
        <div className="memorize__celebrate">
          {stars.map(i => (
            <span
              key={i}
              className="memorize__star"
              style={{
                left: `${Math.random() * 90 + 5}%`,
                animationDelay: `${i * 0.08}s`,
                fontSize: `${Math.random() * 1 + 1}rem`,
              }}
            >
              *
            </span>
          ))}
          <div className="memorize__celebrate-box">
            <p className="memorize__celebrate-title">背出来啦！</p>
            <p className="memorize__celebrate-sub">太棒了，继续加油！</p>
            <div className="memorize__celebrate-btns">
              <button className="memorize__btn memorize__btn--primary" onClick={onNext}>
                继续下一首
              </button>
              <button className="memorize__btn memorize__btn--ghost" onClick={reset}>
                再背一遍
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .memorize {
          min-height: 100vh;
          background: var(--bg);
          padding: 0 16px 40px;
          display: flex;
          flex-direction: column;
        }
        .memorize__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          height: var(--navbar-height);
          position: sticky;
          top: env(safe-area-inset-top, 0px);
          background: #C62828;
          z-index: 10;
          margin: 0 -16px;
        }
        .memorize__exit {
          font-family: var(--font-ui);
          font-size: var(--text-sm);
          color: #fff;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.2);
          transition: background 0.15s;
        }
        .memorize__exit:active { background: rgba(255,255,255,0.35); }
        .memorize__progress {
          font-family: var(--font-ui);
          font-size: var(--text-sm);
          color: #fff;
          font-weight: 700;
          background: rgba(255,255,255,0.2);
          padding: 4px 12px;
          border-radius: 999px;
        }
        .memorize__title {
          font-family: var(--font-brush);
          font-size: var(--text-2xl);
          color: var(--ink);
          text-align: center;
          margin: 12px 0 24px;
        }
        .memorize__lines {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
        }
        .memorize__line {
          width: 100%;
          padding: 14px 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 52px;
          text-align: left;
          transition: background 0.15s, filter 0.3s;
          cursor: pointer;
        }
        .memorize__line:not(.memorize__line--unlocked):active {
          background: #FFF5F4;
        }
        .memorize__line--unlocked {
          cursor: default;
          border-color: #1DD1A1;
          background: rgba(29, 209, 161, 0.10);
          animation: revealLine 0.35s ease forwards;
        }
        @keyframes revealLine {
          from { filter: blur(6px); opacity: 0.4; }
          to { filter: blur(0); opacity: 1; }
        }
        .memorize__line-check {
          color: var(--green);
          font-size: 1.1rem;
          font-weight: 700;
          flex-shrink: 0;
        }
        .memorize__line-text {
          font-family: var(--font-serif);
          font-size: var(--text-lg);
          color: var(--ink);
        }
        .memorize__line-hidden {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .memorize__block {
          color: var(--border);
          font-size: 1.4rem;
          line-height: 1;
        }
        .memorize__hint {
          text-align: center;
          color: var(--ink-light);
          font-size: var(--text-sm);
          margin-top: 20px;
        }

        /* Celebrate */
        .memorize__celebrate {
          position: fixed;
          inset: 0;
          background: rgba(140, 20, 20, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          overflow: hidden;
        }
        .memorize__star {
          position: absolute;
          top: -2rem;
          animation: fallStar 1.2s ease-in forwards;
          pointer-events: none;
        }
        @keyframes fallStar {
          0% { top: -2rem; opacity: 1; transform: rotate(0deg); }
          80% { opacity: 1; }
          100% { top: 110vh; opacity: 0; transform: rotate(360deg); }
        }
        .memorize__celebrate-box {
          background: var(--surface);
          border-radius: 20px;
          padding: 32px 28px;
          text-align: center;
          max-width: 300px;
          width: 90%;
          box-shadow: 0 8px 40px rgba(0,0,0,0.3);
          animation: popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        @keyframes popIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .memorize__celebrate-title {
          font-family: var(--font-brush);
          font-size: 2rem;
          color: #C62828;
          margin-bottom: 8px;
        }
        .memorize__celebrate-sub {
          font-size: var(--text-sm);
          color: var(--ink-light);
          margin-bottom: 24px;
        }
        .memorize__celebrate-btns {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .memorize__btn {
          padding: 12px 0;
          border-radius: 999px;
          font-family: var(--font-ui);
          font-size: var(--text-base);
          font-weight: 700;
          transition: transform 0.1s, opacity 0.1s;
        }
        .memorize__btn:active { transform: scale(0.97); opacity: 0.85; }
        .memorize__btn--primary {
          background: #C62828;
          color: #fff;
          box-shadow: 0 4px 16px rgba(198,40,40,0.35);
        }
        .memorize__btn--ghost {
          background: transparent;
          border: 1.5px solid var(--border);
          color: var(--ink-light);
        }
      `}</style>
    </div>
  )
}
