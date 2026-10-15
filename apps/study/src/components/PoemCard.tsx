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

const PNG_IDS = new Set([46, 56, 58, 60, 65])
function getPoemImg(id: number) {
  const ext = PNG_IDS.has(id) ? 'png' : 'webp'
  return `/images/poem_${String(id).padStart(2, '0')}.${ext}`
}

export default function PoemCard({ poem, isRead, isMemorized, bestStars = 0, colorIndex: _colorIndex, mastery }: Props) {
  const navigate = useNavigate()

  const dynastyLabel = poem.dynasty ? `${poem.dynasty}·${poem.author}` : poem.author
  const masteryConf = mastery ? MASTERY_CONFIG[mastery] : null
  const stripColor = masteryConf ? masteryConf.stripColor : '#C62828'
  const imgFile = (imgMap as Record<string, string>)[String(poem.id)]
  const imgSrc = imgFile ? `/images/${encodeURIComponent(imgFile)}` : getPoemImg(poem.id)

  return (
    <div
      className="ps__card"
      style={{ borderLeftColor: stripColor }}
      onClick={() => navigate(`/poem/${poem.id}`)}
      role="button"
    >
      <div className="ps__card-img" style={{ backgroundImage: `url(${imgSrc})` }} />
      {masteryConf && (
        <span className="ps__card-badge" style={{ color: masteryConf.color, background: `${masteryConf.color}18` }}>
          {masteryConf.label}
        </span>
      )}
      {!mastery && isMemorized && bestStars > 0 && (
        <span className="ps__card-badge" style={{ color: '#F59E0B', background: '#FFF8E118' }}>
          {'★'.repeat(bestStars)}
        </span>
      )}
      {!mastery && isRead && !isMemorized && (
        <span className="ps__card-badge" style={{ color: '#9E9E9E', background: '#9E9E9E18' }}>已读</span>
      )}
      <div className="ps__card-title">《{poem.title}》</div>
      <div className="ps__card-meta">{dynastyLabel}</div>
      <div className="ps__card-line">{poem.firstLine.slice(0, 7)}…</div>
      {isMemorized && bestStars > 0 && (
        <div className="ps__card-stars">{'★'.repeat(bestStars)}</div>
      )}
    </div>
  )
}
