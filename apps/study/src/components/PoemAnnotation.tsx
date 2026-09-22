interface Note {
  word: string
  meaning: string
}

interface Props {
  notes: Note[] | null
  translation: string | null
}

export default function PoemAnnotation({ notes, translation }: Props) {
  if (!notes && !translation) return null

  return (
    <div className="annotation">
      {notes && notes.length > 0 && (
        <div className="annotation__section">
          <div className="annotation__label">
            注释
          </div>
          <div className="annotation__notes">
            {notes.map((n, i) => (
              <div key={i} className="annotation__note">
                <span className="annotation__word">{n.word}</span>
                <span className="annotation__meaning">{n.meaning}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {translation && (
        <div className="annotation__section">
          <div className="annotation__label">
            译文
          </div>
          <p className="annotation__translation">{translation}</p>
        </div>
      )}

      <style>{`
        .annotation {
          margin-top: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .annotation__section {
          background: var(--surface);
          border-radius: 16px;
          border: 2px solid var(--border);
          overflow: hidden;
        }
        .annotation__label {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: #FFF5F4;
          font-family: var(--font-ui);
          font-size: var(--text-sm);
          font-weight: 700;
          color: #C62828;
          border-bottom: 1.5px solid var(--border);
        }
        .annotation__label-icon {
          font-size: 1rem;
        }
        .annotation__notes {
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .annotation__note {
          display: flex;
          align-items: baseline;
          gap: 8px;
          font-size: var(--text-sm);
        }
        .annotation__word {
          font-family: var(--font-serif);
          font-weight: 700;
          color: #C62828;
          flex-shrink: 0;
          min-width: 2.5em;
        }
        .annotation__meaning {
          font-family: var(--font-ui);
          color: var(--ink-light);
          line-height: 1.5;
        }
        .annotation__translation {
          padding: 14px 16px;
          font-family: var(--font-ui);
          font-size: var(--text-base);
          color: var(--ink);
          line-height: 1.9;
        }
      `}</style>
    </div>
  )
}
