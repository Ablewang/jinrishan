import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadPoem, loadPoemIndex } from '../data/poems'
import type { Poem, PoemSummary } from '../data/poems'
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

const annoCache = new Map<number, AnnotationData>()

async function loadAnnotation(id: number): Promise<AnnotationData | null> {
  if (annoCache.has(id)) return annoCache.get(id)!
  try {
    const res = await fetch(`/annotations/${id}.json`)
    if (!res.ok) return null
    const data: AnnotationData = await res.json()
    annoCache.set(id, data)
    return data
  } catch {
    return null
  }
}

const NUMS = '①②③④⑤⑥⑦⑧⑨⑩'

export default function PoemDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { markRead, markMemorized } = useProgress()
  const [showPinyin, setShowPinyin] = useState(true)
  const [memorizing, setMemorizing] = useState(false)
  const [poem, setPoem] = useState<Poem | null>(null)
  const [annotation, setAnnotation] = useState<AnnotationData | null>(null)
  const [index, setIndex] = useState<PoemSummary[]>([])
  const [titleHidden, setTitleHidden] = useState(false)
  const metaRef = useRef<HTMLDivElement>(null)

  const numId = Number(id)

  useEffect(() => {
    setPoem(null)
    setAnnotation(null)
    loadPoem(numId).then(setPoem)
    loadAnnotation(numId).then(setAnnotation)
    if (index.length === 0) loadPoemIndex().then(setIndex)
  }, [numId])

  useEffect(() => { if (poem) markRead(poem.id) }, [poem?.id])

  useEffect(() => {
    const el = metaRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setTitleHidden(!e.isIntersecting), { threshold: 0 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [poem?.id])

  const currentIndex = index.findIndex(p => p.id === numId)
  const prevPoem = currentIndex > 0 ? index[currentIndex - 1] : null
  const nextPoem = currentIndex < index.length - 1 ? index[currentIndex + 1] : null

  const handleMemorized = useCallback((stars: number, charCount: number) => { if (poem) markMemorized(poem.id, stars, charCount) }, [poem?.id])
  const handleNext = useCallback(() => {
    setMemorizing(false)
    navigate(nextPoem ? `/poem/${nextPoem.id}` : '/')
  }, [nextPoem, navigate])

  if (!poem) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#999' }}>
        加载中…
      </div>
    )
  }

  if (memorizing) {
    return <MemorizeMode poem={poem} onExit={() => setMemorizing(false)} onNext={handleNext} onMemorized={handleMemorized} />
  }

  const dynastyLabel = poem.dynasty ? `[${poem.dynasty}] ${poem.author}` : poem.author
  const hasNotes = !!(annotation?.notes && annotation.notes.length > 0)
  const titlePinyins = poem.titlePinyin ?? poem.title.split('').map(() => '')
  const imgFile = (imgMap as Record<string, string>)[String(poem.id)]
  const imgSrc = imgFile ? `/images/${encodeURIComponent(imgFile)}` : null

  return (
    <div className="d">
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
        {imgSrc && (
          <div className="d-bg-wrap">
            <img className="d-bg" src={imgSrc} aria-hidden="true" />
          </div>
        )}

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

      <div className="d-footer">
        <button className="d-footer__memorize" onClick={() => setMemorizing(true)}>背一背</button>
        <div className="d-footer__nav">
          <button className="d-footer__nav-btn" onClick={() => prevPoem && navigate(`/poem/${prevPoem.id}`)} disabled={!prevPoem}>
            <span className="d-footer__nav-arrow">‹</span>
            <span className="d-footer__nav-label">上一首</span>
          </button>
          <button className="d-footer__nav-btn" onClick={() => nextPoem && navigate(`/poem/${nextPoem.id}`)} disabled={!nextPoem}>
            <span className="d-footer__nav-label">下一首</span>
            <span className="d-footer__nav-arrow">›</span>
          </button>
        </div>
      </div>
    </div>
  )
}
