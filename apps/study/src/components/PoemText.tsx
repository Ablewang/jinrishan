import type { Line } from '../data/poems'

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

      <style>{`
        .poem-text {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 8px 0;
        }
        .poem-text__line {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          gap: 4px;
        }
        .poem-text__char {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 2rem;
        }
        .poem-text__char--punct {
          min-width: 0.75rem;
        }

        /* 拼音：默认隐藏，打开时显示 */
        .poem-text__pinyin {
          font-family: 'ZCOOL KuaiLe', sans-serif;
          font-size: 1rem;
          color: #C62828;
          line-height: 1.5;
          white-space: nowrap;
          user-select: none;
          letter-spacing: 0.02em;
          /* 隐藏态：高度折叠 */
          display: block;
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          transition: max-height 0.25s ease, opacity 0.25s ease;
        }
        .poem-text--pinyin .poem-text__pinyin {
          max-height: 2em;
          opacity: 1;
        }

        /* 汉字：用圆润可爱的字体，大一些 */
        .poem-text__hanzi {
          font-family: 'ZCOOL KuaiLe', sans-serif;
          font-size: 2rem;
          color: var(--ink);
          line-height: 1.25;
        }
        .poem-text__char--punct .poem-text__hanzi {
          font-size: 1.4rem;
          color: var(--ink-light);
        }
        /* compact 模式：字号缩小，配合两栏布局 */
        .poem-text--compact { gap: 14px; }
        .poem-text--compact .poem-text__hanzi { font-size: 1.45rem; }
        .poem-text--compact .poem-text__char--punct .poem-text__hanzi { font-size: 1rem; }
        .poem-text--compact .poem-text__char { min-width: 1.5rem; }
        .poem-text--compact .poem-text__pinyin { font-size: 0.72rem; }
      `}</style>
    </div>
  )
}
