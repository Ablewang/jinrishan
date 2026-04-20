import { useState, useRef } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import styles from './index.module.css'

interface Props {
  images: string[]
  alt: string
  className?: string
}

export default function RecipeImages({ images, alt, className }: Props) {
  const [current, setCurrent] = useState(0)
  const [open, setOpen] = useState(false)
  const touchStartX = useRef<number | null>(null)

  if (!images?.length) {
    return <div className={`${styles.placeholder} ${className ?? ''}`}>🍳</div>
  }

  const slides = images.map(src => ({ src }))
  const hasMultiple = images.length > 1

  function prev(e: React.MouseEvent) {
    e.stopPropagation()
    setCurrent(i => (i - 1 + images.length) % images.length)
  }

  function next(e: React.MouseEvent) {
    e.stopPropagation()
    setCurrent(i => (i + 1) % images.length)
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 40) return
    if (dx < 0) setCurrent(i => (i + 1) % images.length)
    else setCurrent(i => (i - 1 + images.length) % images.length)
  }

  return (
    <>
      <div
        className={`${styles.wrap} ${className ?? ''}`}
        onTouchStart={hasMultiple ? onTouchStart : undefined}
        onTouchEnd={hasMultiple ? onTouchEnd : undefined}
      >
        <img
          src={images[current]}
          alt={alt}
          className={styles.thumb}
          onClick={() => setOpen(true)}
        />

        {hasMultiple && (
          <>
            <button className={`${styles.arrow} ${styles.arrowLeft}`} onClick={prev}>‹</button>
            <button className={`${styles.arrow} ${styles.arrowRight}`} onClick={next}>›</button>
            <div className={styles.dots}>
              {images.map((_, i) => (
                <button
                  key={i}
                  className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
                  onClick={e => { e.stopPropagation(); setCurrent(i) }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={current}
        slides={slides}
        on={{ view: ({ index: i }) => setCurrent(i) }}
        styles={{ root: { '--yarl__color_backdrop': 'rgba(0, 0, 0, 0.72)' } }}
      />
    </>
  )
}
