import type { Line } from '../data/poems'
import './PoemText.css'

interface Props {
  lines: Line[]
  showPinyin: boolean
  compact?: boolean
}

export default function PoemText({ lines, showPinyin, compact = false }: Props) {
  return (
    <div className={`poem-text${showPinyin ? ' poem-text--pinyin' : ''}${compact ? ' poem-text--compact' : ''}`}>
      {lines.map((line, li) => (
        <div key={li} className="poem-text__line">
          {line.chars.map((c, ci) => {
            const isPunct = c.pinyin === null
            return (
              <span key={ci} className={`poem-text__char${isPunct ? ' poem-text__char--punct' : ''}`}>
                {!isPunct && (
                  <span className="poem-text__pinyin">
                    {c.pinyin ?? ''}
                  </span>
                )}
                <span className="poem-text__hanzi">{c.char}</span>
              </span>
            )
          })}
        </div>
      ))}

    </div>
  )
}
