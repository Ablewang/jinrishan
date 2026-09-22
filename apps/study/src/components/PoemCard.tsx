import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PoemSummary } from '../data/poems'
import imgMap from '../data/poem_img_map.json'

interface Props {
  poem: PoemSummary
  isRead: boolean
  isMemorized: boolean
  colorIndex: number
}

export default function PoemCard({ poem, isRead, isMemorized, colorIndex: _colorIndex }: Props) {
  const navigate = useNavigate()
  const ref = useRef<HTMLButtonElement>(null)
  const [imgSrc, setImgSrc] = useState<string | null>(null)

  const dynastyLabel = poem.dynasty ? `${poem.dynasty}·${poem.author}` : poem.author
  const imgFile = (imgMap as Record<string, string>)[String(poem.id)]

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
      className="poem-card"
      onClick={() => navigate(`/poem/${poem.id}`)}
      aria-label={`${poem.title}，${dynastyLabel}`}
    >
      {imgSrc && <img className="poem-card__bg" src={imgSrc} aria-hidden />}
      {isMemorized && (
        <span className="poem-card__badge poem-card__badge--memorized" aria-label="已背">背</span>
      )}
      {isRead && !isMemorized && (
        <span className="poem-card__badge poem-card__badge--read" aria-label="已读" />
      )}

      <div className="poem-card__text">
        <h2 className="poem-card__title">{poem.title}</h2>
        <p className="poem-card__author">{dynastyLabel}</p>
        <p className="poem-card__line">{poem.firstLine}</p>
      </div>

      <style>{`
        .poem-card {
          position: relative;
          padding: 0;
          border-radius: var(--radius-card);
          box-shadow: var(--shadow-card);
          text-align: left;
          width: 100%;
          background-color: #FFFFFF;
          border: 1.5px solid var(--border);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          -webkit-tap-highlight-color: transparent;
          overflow: hidden;
          min-height: 90px;
        }
        .poem-card__bg {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: auto;
          display: block;
          opacity: 0.22;
          pointer-events: none;
          z-index: 0;
        }
        .poem-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to right,
            rgba(255,255,255,0.97) 0%,
            rgba(255,255,255,0.92) 45%,
            rgba(255,255,255,0.5) 70%,
            rgba(255,255,255,0) 100%
          );
          border-radius: var(--radius-card);
          pointer-events: none;
          z-index: 0;
        }
        .poem-card::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 5px;
          background: #C62828;
          border-radius: var(--radius-card) 0 0 var(--radius-card);
          z-index: 1;
        }
        .poem-card:active { transform: scale(0.96); box-shadow: none; }
        @media (hover: hover) {
          .poem-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-card-hover); }
        }
        .poem-card__badge {
          position: absolute;
          top: 8px; right: 10px;
          font-size: 0.75rem;
          font-weight: 700;
          line-height: 1;
          z-index: 2;
        }
        .poem-card__badge--memorized { color: var(--green); }
        .poem-card__badge--read {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--gold);
          display: inline-block;
        }
        .poem-card__text {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 14px 10px 14px 18px;
          min-width: 0;
          width: 65%;
        }
        .poem-card__title {
          font-family: var(--font-brush);
          font-size: var(--text-xl);
          color: #C62828;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .poem-card__author {
          font-family: var(--font-ui);
          font-size: var(--text-xs);
          color: var(--ink-light);
        }
        .poem-card__line {
          font-family: var(--font-serif);
          font-size: var(--text-xs);
          color: var(--ink-light);
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </button>
  )
}
