import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { poems } from '../data/poems'
import { useProgress } from '../hooks/useProgress'
import PoemText from '../components/PoemText'
import MemorizeMode from '../components/MemorizeMode'
import imgMap from '../data/poem_img_map.json'
import './PoemDetail.css'

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
        {/* 背景图：绝对定位底部 */}
        {imgSrc && (
          <div className="d-bg-wrap">
            <img className="d-bg" src={imgSrc} aria-hidden="true" />
          </div>
        )}

        {/* 滚动内容区 */}
        <div className="d-scroll">
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

          {annotation?.translation && (
            <div className="d-section">
              <div className="d-badge">译文</div>
              <p className="d-section__text">{annotation.translation}</p>
            </div>
          )}

          <div style={{ height: 24 }} />
        </div>
      </div>

      {/* 红色底部栏 */}
      <div className="d-footer">
        <button className="d-footer__memorize" onClick={() => setMemorizing(true)}>背一背</button>
        <div className="d-footer__nav">
          <button className="d-footer__nav-btn" onClick={() => prevPoem && navigate(`/poem/${prevPoem.id}`)} disabled={!prevPoem}>← 上一首</button>
          <button className="d-footer__nav-btn" onClick={() => nextPoem && navigate(`/poem/${nextPoem.id}`)} disabled={!nextPoem}>下一首 →</button>
        </div>
      </div>
    </div>
  )
}
