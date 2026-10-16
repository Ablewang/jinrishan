import './PoemAnnotation.css'

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

    </div>
  )
}
