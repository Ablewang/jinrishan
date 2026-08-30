import { useCallback, useEffect, useRef } from 'react'
import type { ItemDetail } from '../types'

const PAD  = 4
const NUMW = 20
const GAP  = 2

type ColorMap = Record<string, [number, number, number]>

function txtColor(r: number, g: number, b: number) {
  return (r * 0.299 + g * 0.587 + b * 0.114) > 135 ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.75)'
}

interface Props {
  item: ItemDetail
  activeCode: string | null
  onCellClick: (code: string | null) => void
  showOriginal?: boolean
  originalSrc?: string
}

export function BeadCanvas({ item, activeCode, onCellClick, showOriginal, originalSrc }: Props) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const csRef      = useRef(16)
  const dpr        = useRef(window.devicePixelRatio || 1)
  const imgRef     = useRef<HTMLImageElement | null>(null)

  const { grid, materials, board_size, grid_size } = item
  const off = (board_size - grid_size) / 2

  const cmap = useRef<ColorMap>({})
  useEffect(() => {
    const m: ColorMap = {}
    materials.forEach(mat => { m[mat.code] = mat.rgb })
    cmap.current = m
  }, [materials])

  const drawBead = useCallback((cs: number, active: string | null) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = PAD + NUMW + GAP + board_size * cs + PAD

    ctx.clearRect(0, 0, W, W)
    ctx.fillStyle = '#eeecea'
    ctx.fillRect(0, 0, W, W)

    const fontSize = Math.max(6, Math.floor(cs * 0.42))
    ctx.font = `bold ${fontSize}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let r = 0; r < board_size; r++) {
      for (let c = 0; c < board_size; c++) {
        const x = PAD + NUMW + GAP + c * cs
        const y = PAD + NUMW + GAP + r * cs
        const gr = r - off, gc = c - off
        const inGrid = gr >= 0 && gr < grid_size && gc >= 0 && gc < grid_size
        const code = inGrid ? grid[gr][gc] : null

        if (code && cmap.current[code]) {
          const [rv, gv, bv] = cmap.current[code]
          ctx.globalAlpha = (active && active !== code) ? 0.18 : 1
          ctx.fillStyle = `rgb(${rv},${gv},${bv})`
          ctx.fillRect(x, y, cs, cs)
          if (cs >= 11) {
            ctx.globalAlpha = (active && active !== code) ? 0.18 : 1
            ctx.fillStyle = txtColor(rv, gv, bv)
            ctx.fillText(code, x + cs / 2, y + cs / 2)
          }
        } else {
          ctx.globalAlpha = 1
          ctx.fillStyle = inGrid ? '#e8e6e2' : '#dddbd7'
          ctx.fillRect(x, y, cs, cs)
        }

        if (active && code === active) {
          ctx.globalAlpha = 1
          ctx.strokeStyle = '#1a7a5e'
          ctx.lineWidth = 2
          ctx.strokeRect(x + 1, y + 1, cs - 2, cs - 2)
        }

        ctx.globalAlpha = 0.15
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 0.5
        ctx.strokeRect(x, y, cs, cs)
      }
    }

    ctx.globalAlpha = 1
    ctx.fillStyle = '#888'
    ctx.font = `bold ${Math.max(7, Math.floor(cs * 0.52))}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let r = 0; r < board_size; r++)
      ctx.fillText(String(r + 1), PAD + NUMW / 2, PAD + NUMW + GAP + r * cs + cs / 2)
    for (let c = 0; c < board_size; c++)
      ctx.fillText(String(c + 1), PAD + NUMW + GAP + c * cs + cs / 2, PAD + NUMW / 2)
  }, [board_size, grid_size, grid, off])

  const drawOriginal = useCallback((cs: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = PAD + NUMW + GAP + board_size * cs + PAD

    ctx.clearRect(0, 0, W, W)
    ctx.fillStyle = '#eeecea'
    ctx.fillRect(0, 0, W, W)

    // empty cell backgrounds
    for (let r = 0; r < board_size; r++) {
      for (let c = 0; c < board_size; c++) {
        const x = PAD + NUMW + GAP + c * cs
        const y = PAD + NUMW + GAP + r * cs
        const gr = r - off, gc = c - off
        const inGrid = gr >= 0 && gr < grid_size && gc >= 0 && gc < grid_size
        ctx.fillStyle = inGrid ? '#e8e6e2' : '#dddbd7'
        ctx.globalAlpha = 1
        ctx.fillRect(x, y, cs, cs)
      }
    }

    // original image in grid area
    const img = imgRef.current
    if (img) {
      const gx = PAD + NUMW + GAP + off * cs
      const gy = PAD + NUMW + GAP + off * cs
      const gw = grid_size * cs
      ctx.imageSmoothingEnabled = false
      ctx.globalAlpha = 1
      ctx.drawImage(img, gx, gy, gw, gw)
    }

    // cell borders on top
    for (let r = 0; r < board_size; r++) {
      for (let c = 0; c < board_size; c++) {
        const x = PAD + NUMW + GAP + c * cs
        const y = PAD + NUMW + GAP + r * cs
        ctx.globalAlpha = 0.15
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 0.5
        ctx.strokeRect(x, y, cs, cs)
      }
    }
    ctx.globalAlpha = 1
  }, [board_size, grid_size, off])

  const setup = useCallback(() => {
    const section = sectionRef.current
    const canvas  = canvasRef.current
    if (!section || !canvas) return
    const ctx = canvas.getContext('2d')!
    const availW = section.clientWidth - PAD * 2
    const cs = Math.max(10, Math.floor((availW - NUMW - GAP) / board_size))
    csRef.current = cs
    const W = PAD + NUMW + GAP + board_size * cs + PAD
    canvas.width  = W * dpr.current
    canvas.height = W * dpr.current
    canvas.style.width  = W + 'px'
    canvas.style.height = W + 'px'
    ctx.scale(dpr.current, dpr.current)
    if (showOriginal) drawOriginal(cs)
    else drawBead(cs, activeCode)
  }, [board_size, showOriginal, drawOriginal, drawBead, activeCode])

  // load original image when src changes
  useEffect(() => {
    if (!originalSrc) return
    imgRef.current = null
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      if (showOriginal) drawOriginal(csRef.current)
    }
    img.src = originalSrc
  }, [originalSrc, showOriginal, drawOriginal])

  useEffect(() => {
    requestAnimationFrame(setup)
  }, [setup])

  useEffect(() => {
    if (!showOriginal) drawBead(csRef.current, activeCode)
  }, [activeCode, showOriginal, drawBead])

  useEffect(() => {
    if (!sectionRef.current) return
    const ro = new ResizeObserver(setup)
    ro.observe(sectionRef.current)
    return () => ro.disconnect()
  }, [setup])

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (showOriginal) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cs = csRef.current
    const col = Math.floor((e.clientX - rect.left - PAD - NUMW) / cs)
    const row = Math.floor((e.clientY - rect.top  - PAD - NUMW) / cs)
    if (col < 0 || col >= board_size || row < 0 || row >= board_size) { onCellClick(null); return }
    const gr = row - off, gc = col - off
    const code = (gr >= 0 && gr < grid_size && gc >= 0 && gc < grid_size) ? grid[gr][gc] : null
    if (!code) { onCellClick(null); return }
    onCellClick(activeCode === code ? null : code)
  }

  return (
    <div ref={sectionRef} style={{ paddingBottom: 12, background: 'var(--bg2)', borderBottom: '1px solid var(--br)' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} onClick={handleClick} />
    </div>
  )
}
