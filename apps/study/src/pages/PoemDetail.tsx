import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { poems } from '../data/poems'
import { useProgress } from '../hooks/useProgress'
import PoemText from '../components/PoemText'
import MemorizeMode from '../components/MemorizeMode'
import imgMap from '../data/poem_img_map.json'

interface AnnotationData {
  id: number
  notes: { word: string; meaning: string }[] | null
  translation: string | null
}

let annotationsCache: AnnotationData[] | null = null

async function loadAnnotations(): Promise<AnnotationData[]> {
  if (annotationsCache) return annotationsCache
  try {
    const res = await fetch('/annotations.json')
    if (!res.ok) return []
    const data = await res.json()
    annotationsCache = data.poems ?? []
    return annotationsCache!
  } catch {
    return []
  }
}

const NUMS = '①②③④⑤⑥⑦⑧⑨⑩'

function getTitlePinyin(title: string, lines: { chars: { char: string; pinyin: string | null }[] }[]): string[] {
  const allChars = lines.flatMap(l => l.chars)
  return title.split('').map(ch => {
    const found = allChars.find(c => c.char === ch && c.pinyin)
    return found?.pinyin ?? ''
  })
}

export default function PoemDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { markRead, markMemorized } = useProgress()
  const [showPinyin, setShowPinyin] = useState(true)
  const [memorizing, setMemorizing] = useState(false)
  const [annotation, setAnnotation] = useState<AnnotationData | null>(null)
  const [titleHidden, setTitleHidden] = useState(false)
  const metaRef = useRef<HTMLDivElement>(null)

  const poem = poems.find(p => p.id === Number(id))
  const currentIndex = poems.findIndex(p => p.id === Number(id))
  const prevPoem = currentIndex > 0 ? poems[currentIndex - 1] : null
  const nextPoem = currentIndex < poems.length - 1 ? poems[currentIndex + 1] : null

  useEffect(() => { if (poem) markRead(poem.id) }, [poem?.id])
  useEffect(() => {
    loadAnnotations().then(list => setAnnotation(list.find(a => a.id === Number(id)) ?? null))
  }, [id])
  useEffect(() => {
    const el = metaRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setTitleHidden(!e.isIntersecting), { threshold: 0 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [poem?.id])

  const handleMemorized = useCallback(() => { if (poem) markMemorized(poem.id) }, [poem?.id])
  const handleNext = useCallback(() => {
    setMemorizing(false)
    navigate(nextPoem ? `/poem/${nextPoem.id}` : '/')
  }, [nextPoem, navigate])

  if (!poem) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', gap:16, color:'#666' }}>
        <p>找不到这首诗</p>
        <button style={{ padding:'10px 24px', background:'#C62828', color:'#FFF8E1', borderRadius:999 }} onClick={() => navigate('/')}>回首页</button>
      </div>
    )
  }

  if (memorizing) {
    return <MemorizeMode poem={poem} onExit={() => setMemorizing(false)} onNext={handleNext} onMemorized={handleMemorized} />
  }

  const dynastyLabel = poem.dynasty ? `[${poem.dynasty}] ${poem.author}` : poem.author
  const hasNotes = !!(annotation?.notes && annotation.notes.length > 0)
  const titlePinyins = getTitlePinyin(poem.title, poem.lines)
  const imgFile = (imgMap as Record<string, string>)[String(poem.id)]
  const imgSrc = imgFile ? `/images/${encodeURIComponent(imgFile)}` : null

  return (
    <div className="d">
      {/* 背景图固定层 */}
      {imgSrc && <div className="d-bg" style={{ backgroundImage: `url(${imgSrc})` }} />}

      {/* 红色导航栏 */}
      <header className="d-nav">
        <button className="d-nav__back" onClick={() => navigate('/')}>← 返回</button>
        {titleHidden && <span className="d-nav__title">{poem.title}</span>}
        <button
          className={`d-nav__toggle${showPinyin ? ' d-nav__toggle--on' : ''}`}
          onClick={() => setShowPinyin(v => !v)}
        >
          {showPinyin ? '拼音 ON' : '拼音 OFF'}
        </button>
      </header>

      <div className="d-body">
        {/* 标题 */}
        <div className="d-meta" ref={metaRef}>
          <div className="d-meta__title-row">
            {poem.title.split('').map((ch, i) => (
              <span key={i} className="d-meta__title-char">
                <span className="d-meta__title-pinyin">{showPinyin ? (titlePinyins[i] ?? '') : ''}</span>
                <span className="d-meta__title-hanzi">{ch}</span>
              </span>
            ))}
          </div>
          <p className="d-meta__author">{dynastyLabel}</p>
        </div>

        {/* 左诗 + 右注释 */}
        <div className="d-split">
          <div className="d-split__poem">
            <PoemText lines={poem.lines} showPinyin={showPinyin} compact />
          </div>
          {hasNotes && (
            <div className="d-split__notes">
              <div className="d-badge">注释</div>
              <div className="d-notes-list">
                {annotation!.notes!.map((n, i) => (
                  <p key={i} className="d-note">
                    <span className="d-note__num">{NUMS[i] ?? ''}</span>
                    <span className="d-note__word">{n.word}：</span>
                    {n.meaning}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 译文 */}
        {annotation?.translation && (
          <div className="d-section">
            <div className="d-badge">译文</div>
            <p className="d-section__text">{annotation.translation}</p>
          </div>
        )}

        <div style={{ height: 150 }} />
      </div>

      {/* 红色底部栏 */}
      <div className="d-footer">
        <button className="d-footer__memorize" onClick={() => setMemorizing(true)}>背一背</button>
        <div className="d-footer__nav">
          <button className="d-footer__nav-btn" onClick={() => prevPoem && navigate(`/poem/${prevPoem.id}`)} disabled={!prevPoem}>← 上一首</button>
          <button className="d-footer__nav-btn" onClick={() => nextPoem && navigate(`/poem/${nextPoem.id}`)} disabled={!nextPoem}>下一首 →</button>
        </div>
      </div>

      <style>{`
        .d {
          min-height: 100vh;
          background: #fff;
          position: relative;
        }

        /* 背景图固定层 */
        .d-bg {
          position: fixed;
          top: 0; bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 480px;
          background-size: cover;
          background-position: center top;
          background-repeat: no-repeat;
          z-index: 0;
          opacity: 0.25;
          pointer-events: none;
        }

        /* 红色导航栏 */
        .d-nav {
          position: sticky;
          top: env(safe-area-inset-top, 0px);
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          height: var(--navbar-height);
          background: #C62828;
        }
        .d-nav__back {
          font-family: var(--font-ui);
          font-size: var(--text-sm);
          color: #FFF8E1;
          padding: 6px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.15);
          transition: background 0.15s;
        }
        .d-nav__back:active { background: rgba(255,255,255,0.3); }
        .d-nav__title {
          font-family: var(--font-brush);
          font-size: 1.2rem;
          color: #FFF8E1;
          letter-spacing: 0.1em;
          flex: 1;
          text-align: center;
        }
        .d-nav__toggle {
          font-family: var(--font-ui);
          font-size: var(--text-xs);
          padding: 5px 14px;
          border-radius: 999px;
          border: 1.5px solid rgba(255,248,225,0.5);
          color: #FFF8E1;
          background: transparent;
          transition: all 0.15s;
        }
        .d-nav__toggle--on {
          border-color: #FFF8E1;
          background: rgba(255,255,255,0.2);
        }

        .d-body {
          position: relative;
          z-index: 1;
          padding: 0 14px;
        }

        /* 标题 */
        .d-meta {
          text-align: center;
          padding: 20px 0 16px;
        }
        .d-meta__title-row {
          display: inline-flex;
          align-items: flex-end;
          gap: 6px;
        }
        .d-meta__title-char {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .d-meta__title-pinyin {
          font-family: var(--font-ui);
          font-size: 0.82rem;
          color: #C62828;
          font-style: italic;
          line-height: 1.4;
          min-height: 1.2em;
          letter-spacing: 0.01em;
        }
        .d-meta__title-hanzi {
          font-family: var(--font-brush);
          font-size: 2.8rem;
          color: #C62828;
          line-height: 1.1;
        }
        .d-meta__author {
          font-family: var(--font-ui);
          font-size: var(--text-sm);
          color: #666;
          margin-top: 8px;
          letter-spacing: 0.1em;
        }

        /* 两栏 */
        .d-split {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin-bottom: 14px;
        }
        .d-split__poem {
          flex: 1;
          min-width: 0;
          overflow-x: auto;
          background: rgba(255,255,255,0.82);
          border-radius: 18px;
          padding: 14px 10px;
          border: 1.5px solid rgba(198,40,40,0.12);
          backdrop-filter: blur(4px);
        }
        .d-split__notes {
          flex: 0 0 42%;
          background: rgba(255,255,255,0.82);
          border-radius: 18px;
          padding: 12px 10px;
          border: 1.5px solid rgba(198,40,40,0.12);
          backdrop-filter: blur(4px);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* 徽章 */
        .d-badge {
          align-self: flex-start;
          font-family: var(--font-ui);
          font-size: 0.78rem;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 999px;
          background: #C62828;
          color: #fff;
        }

        /* 注释 */
        .d-notes-list { display: flex; flex-direction: column; gap: 7px; }
        .d-note {
          font-family: var(--font-ui);
          font-size: 0.76rem;
          color: #333;
          line-height: 1.65;
        }
        .d-note__num { color: #C62828; font-weight: 700; }
        .d-note__word { color: #C62828; font-weight: 700; }

        /* 译文 */
        .d-section {
          background: rgba(255,255,255,0.82);
          border-radius: 18px;
          padding: 14px;
          border: 1.5px solid rgba(198,40,40,0.12);
          backdrop-filter: blur(4px);
          margin-bottom: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .d-section__text {
          font-family: var(--font-ui);
          font-size: var(--text-sm);
          color: #444;
          line-height: 1.9;
        }

        /* 红色底部栏 */
        .d-footer {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          max-width: 480px;
          margin: 0 auto;
          padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: #C62828;
          z-index: 10;
        }
        .d-footer__memorize {
          width: 100%;
          padding: 14px 0;
          background: #FFF8E1;
          color: #C62828;
          border-radius: 999px;
          font-family: var(--font-brush);
          font-size: var(--text-xl);
          letter-spacing: 0.08em;
          font-weight: 700;
          transition: transform 0.1s, opacity 0.1s;
        }
        .d-footer__memorize:active { transform: scale(0.97); opacity: 0.9; }
        .d-footer__nav { display: flex; gap: 10px; }
        .d-footer__nav-btn {
          flex: 1;
          padding: 10px 0;
          border-radius: 999px;
          border: 1.5px solid rgba(255,248,225,0.5);
          background: transparent;
          font-family: var(--font-ui);
          font-size: var(--text-sm);
          color: #FFF8E1;
          transition: all 0.15s;
        }
        .d-footer__nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .d-footer__nav-btn:not(:disabled):active {
          background: rgba(255,255,255,0.15);
          border-color: #FFF8E1;
        }
      `}</style>
    </div>
  )
}
