import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PoemSummary } from '../data/poems'
import type { MasteryLevel } from '../types/poem'
import { MASTERY_CONFIG } from '../types/poem'
import imgMap from '../data/poem_img_map.json'

interface Props {
  poem: PoemSummary
  isRead: boolean
  isMemorized: boolean
  bestStars?: number
  colorIndex: number
  mastery?: MasteryLevel
}

export default function PoemCard({ poem, isRead, isMemorized, bestStars = 0, colorIndex: _colorIndex, mastery }: Props) {
  const navigate = useNavigate()
  const ref = useRef<HTMLButtonElement>(null)
  const [imgSrc, setImgSrc] = useState<string | null>(null)

  const dynastyLabel = poem.dynasty ? `${poem.dynasty}·${poem.author}` : poem.author
  const imgFile = (imgMap as Record<string, string>)[String(poem.id)]
  const masteryConf = mastery ? MASTERY_CONFIG[mastery] : null
  const stripColor = masteryConf ? masteryConf.stripColor : '#C62828'

  useEffect(() => {
    if (!imgFile) return
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImgSrc(`/images/${encodeURIComponent(imgFile)}`)
          obs.disconnect()
        }
      },
      { rootMargin: '50% 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [imgFile])

  return (
    <button
      ref={ref}
      className="pc"
      style={{ '--pc-strip': stripColor } as React.CSSProperties}
      onClick={() => navigate(`/poem/${poem.id}`)}
      aria-label={`${poem.title}，${dynastyLabel}`}
    >
      {/* 左侧色条 */}
      <div className="pc__strip" />

      {/* 右侧背景图 */}
      {imgSrc && <img className="pc__bg" src={imgSrc} aria-hidden />}

      {/* 主内容 */}
      <div className="pc__body">
        <div className="pc__top">
          <span className="pc__title">{poem.title}</span>
          {masteryConf && (
            <span className="pc__badge" style={{ color: masteryConf.color, background: `${masteryConf.color}1a` }}>
              {masteryConf.label}
            </span>
          )}
          {!mastery && isMemorized && bestStars > 0 && (
            <span className="pc__badge pc__badge--stars">
              {'★'.repeat(bestStars)}
            </span>
          )}
          {!mastery && isRead && !isMemorized && (
            <span className="pc__dot" />
          )}
        </div>
        <p className="pc__meta">{dynastyLabel}</p>
        <p className="pc__line">{poem.firstLine.slice(0, 10)}</p>
      </div>

      <style>{`
        .pc {
          position: relative;
          display: flex;
          align-items: stretch;
          background: var(--surface, #fff);
          border-radius: 12px;
          border: 1.5px solid var(--border, #EDE8DF);
          box-shadow: 0 2px 8px rgba(150,80,30,0.07);
          overflow: hidden;
          text-align: left;
          width: 100%;
          min-height: 88px;
          cursor: pointer;
          transition: transform 0.1s, box-shadow 0.1s;
          -webkit-tap-highlight-color: transparent;
        }
        .pc:active { transform: scale(0.97); box-shadow: none; }
        @media (hover: hover) {
          .pc:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(150,80,30,0.13); }
        }
        .pc__strip {
          width: 4px;
          flex-shrink: 0;
          background: var(--pc-strip, #C62828);
        }
        .pc__bg {
          position: absolute;
          top: 0; right: 0;
          width: 55%;
          height: 100%;
          object-fit: cover;
          object-position: center right;
          opacity: 0.18;
          pointer-events: none;
          mask-image: linear-gradient(to left, transparent 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.9) 100%);
          -webkit-mask-image: linear-gradient(to left, transparent 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.9) 100%);
        }
        .pc__body {
          position: relative;
          z-index: 1;
          flex: 1;
          padding: 11px 10px 11px 12px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }
        .pc__top {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pc__title {
          font-family: var(--font-brush);
          font-size: 1.15rem;
          color: var(--ink, #18120A);
          line-height: 1.2;
          flex-shrink: 0;
        }
        .pc__badge {
          font-size: 10px;
          font-weight: 700;
          font-family: var(--font-ui);
          border-radius: 999px;
          padding: 1px 6px;
          white-space: nowrap;
          line-height: 1.6;
        }
        .pc__badge--stars {
          font-size: 10px;
          color: #F59E0B;
          background: #FFF8E1;
        }
        .pc__dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #F59E0B;
          flex-shrink: 0;
        }
        .pc__meta {
          font-size: 11px;
          color: var(--ink-light, #8C7A60);
          line-height: 1.3;
        }
        .pc__line {
          font-size: 11px;
          color: var(--ink-light, #8C7A60);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 1px;
        }
      `}</style>
    </button>
  )
}
