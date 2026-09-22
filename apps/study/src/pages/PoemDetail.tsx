import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
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
  const [splitColumn, setSplitColumn] = useState(false)
  const metaRef = useRef<HTMLDivElement>(null)
  const notesWrapRef = useRef<HTMLDivElement>(null)

  const numId = Number(id)
  const fabRef = useRef<HTMLButtonElement>(null)
  const dragState = useRef<{ startX: number; startY: number; initX: number; initY: number; moved: boolean } | null>(null)

  // 用原生事件绑定，passive:false 才能 preventDefault
  useEffect(() => {
    const el = fabRef.current
    if (!el) return

    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0]
      const rect = el!.getBoundingClientRect()
      dragState.current = { startX: t.clientX, startY: t.clientY, initX: rect.left, initY: rect.top, moved: false }
    }

    function onTouchMove(e: TouchEvent) {
      if (!dragState.current) return
      const t = e.touches[0]
      const dx = t.clientX - dragState.current.startX
      const dy = t.clientY - dragState.current.startY
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragState.current.moved = true
      if (!dragState.current.moved) return
      e.preventDefault()
      const size = el!.offsetWidth
      const header = document.querySelector('.d-nav')
      const footer = document.querySelector('.d-footer')
      const minY = header ? header.getBoundingClientRect().bottom + 8 : 8
      const maxY = footer ? footer.getBoundingClientRect().top - size - 8 : window.innerHeight - size - 8
      const maxX = window.innerWidth - size - 8
      const x = Math.min(Math.max(dragState.current.initX + dx, 8), maxX)
      const y = Math.min(Math.max(dragState.current.initY + dy, minY), maxY)
      el!.style.right = 'auto'
      el!.style.bottom = 'auto'
      el!.style.left = `${x}px`
      el!.style.top = `${y}px`
    }

    function onTouchEnd() {
      if (!dragState.current?.moved) { dragState.current = null; return }
      dragState.current = null
      const size = el!.offsetWidth
      const currentX = parseFloat(el!.style.left) || (window.innerWidth - size - 20)
      const snapToLeft = currentX + size / 2 < window.innerWidth / 2
      const x = snapToLeft ? 8 : window.innerWidth - size - 8
      el!.style.left = `${x}px`
      el!.style.transition = 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)'
      setTimeout(() => { if (el) el.style.transition = '' }, 300)
    }

    function onTouchCancel() { dragState.current = null }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchCancel, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchCancel)
    }
  }, [poem?.id])

  useEffect(() => {
    setPoem(null)
    setAnnotation(null)
    loadPoem(numId).then(setPoem)
    loadAnnotation(numId).then(setAnnotation)
    if (index.length === 0) loadPoemIndex().then(setIndex)
  }, [numId])

  // 相邻诗预加载
  useEffect(() => {
    if (index.length === 0) return
    const cur = index.findIndex(p => p.id === numId)
    if (cur > 0) loadPoem(index[cur - 1].id)
    if (cur < index.length - 1) loadPoem(index[cur + 1].id)
  }, [numId, index])

  useEffect(() => { if (poem) markRead(poem.id) }, [poem?.id])

  useLayoutEffect(() => {
    setSplitColumn(false)
    const wrap = notesWrapRef.current
    if (!wrap) return
    const raf = requestAnimationFrame(() => {
      setSplitColumn(wrap.getBoundingClientRect().width < 120)
    })
    return () => cancelAnimationFrame(raf)
  }, [poem?.id, annotation])

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
      <div className="d-loading">
        <header className="d-nav">
          <button className="d-nav__back" onClick={() => navigate('/')}>← 返回</button>
        </header>
        <div className="d-loading__body">
          <div className="d-loading__lines">
            <div className="d-loading__line d-loading__line--title" />
            <div className="d-loading__line d-loading__line--author" />
            <div className="d-loading__line" />
            <div className="d-loading__line" />
            <div className="d-loading__line d-loading__line--short" />
            <div className="d-loading__line" />
            <div className="d-loading__line d-loading__line--short" />
          </div>
        </div>
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

          <div className={`d-split${splitColumn ? ' d-split--col' : ''}`}>
            <div className="d-split__poem">
              <PoemText lines={poem.lines} showPinyin={showPinyin} compact />
            </div>
            {hasNotes && (
              <div className="d-split__notes-wrap" ref={notesWrapRef}>
                <div className="d-split-rings">
                  <div className="d-ring" />
                  <div className="d-ring" />
                  <div className="d-ring" />
                  <div className="d-ring" />
                </div>
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
        <button
          ref={fabRef}
          className="d-footer__memorize"
          onClick={() => { if (!dragState.current?.moved) setMemorizing(true) }}
        >背一背</button>
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
