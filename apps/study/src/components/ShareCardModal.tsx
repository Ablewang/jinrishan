import { useState, useEffect, useCallback } from 'react'
import { useShareCard } from '../contexts/ShareCardContext'
import { useProgress } from '../hooks/useProgress'
import { useQueue } from '../hooks/useQueue'
import { getLevelTitle } from '../utils/levelTitle'
import { loadPoem, loadPoemIndex } from '../data/poems'
import type { Poem, PoemSummary } from '../data/poems'

const NICKNAME_KEY = 'poem_nickname'
function loadNickname(): string {
  try { return localStorage.getItem(NICKNAME_KEY) ?? '小诗人' } catch { return '小诗人' }
}
function todayLabel(): string {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}
function getPoemImageUrl(id: number): string {
  const ext = [56, 59, 60, 65].includes(id) ? 'png' : 'webp'
  return `/images/poem_${String(id).padStart(2, '0')}.${ext}`
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

const SCALE = 3
const W = 300

// 绘制古诗卡片
async function drawPoemCard(
  poem: Poem,
  poemSummary: PoemSummary | null,
  bgImg: HTMLImageElement | null,
): Promise<string> {
  await document.fonts.ready

  // 先计算总高度
  const PADDING_X = 28
  const TITLE_TOP = 24
  const TITLE_FONT_SIZE = 32
  const AUTHOR_FONT_SIZE = 11
  const LINE_GAP = 8
  const PINYIN_FONT_SIZE = 9
  const CHAR_FONT_SIZE = 26
  const CHAR_W = 34
  const FOOTER_H = 52

  // 计算内容区高度
  const titleH = TITLE_FONT_SIZE * 1.2
  const authorH = AUTHOR_FONT_SIZE * 1.8
  const dividerH = 16
  const linesH = poem.lines.length * (PINYIN_FONT_SIZE * 1.4 + CHAR_FONT_SIZE * 1.2) + (poem.lines.length - 1) * LINE_GAP
  const CONTENT_BOTTOM = 32
  const totalH = TITLE_TOP + titleH + 6 + authorH + dividerH + linesH + CONTENT_BOTTOM + FOOTER_H

  const H = Math.ceil(totalH)

  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)

  // 背景
  if (bgImg) {
    const sw = bgImg.naturalWidth
    const sh = bgImg.naturalHeight
    const dw = W
    const dh = H
    const scale = Math.max(dw / sw, dh / sh)
    const nw = sw * scale
    const nh = sh * scale
    const ox = (dw - nw) / 2
    const oy = (dh - nh) / 2
    ctx.drawImage(bgImg, ox, oy, nw, nh)
    ctx.fillStyle = 'rgba(0,0,0,0.48)'
    ctx.fillRect(0, 0, W, H)
  } else {
    ctx.fillStyle = '#2C1008'
    ctx.fillRect(0, 0, W, H)
  }

  // 标题
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = `${TITLE_FONT_SIZE}px 'Ma Shan Zheng', cursive`
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 8
  ctx.fillText(poem.title, W / 2, TITLE_TOP + TITLE_FONT_SIZE)
  ctx.shadowBlur = 0

  // 作者
  let y = TITLE_TOP + titleH + 6
  const authorText = [
    poemSummary?.dynasty ? `【${poemSummary.dynasty}】` : '',
    poemSummary?.author ?? ''
  ].join('')
  ctx.font = `${AUTHOR_FONT_SIZE}px 'PingFang SC', sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.fillText(authorText, W / 2, y + AUTHOR_FONT_SIZE)
  y += authorH

  // 分隔线
  const gradL = ctx.createLinearGradient(W / 2 - 20, 0, W / 2 + 20, 0)
  gradL.addColorStop(0, 'transparent')
  gradL.addColorStop(0.5, 'rgba(255,248,225,0.45)')
  gradL.addColorStop(1, 'transparent')
  ctx.strokeStyle = gradL
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(W / 2 - 20, y + 6)
  ctx.lineTo(W / 2 + 20, y + 6)
  ctx.stroke()
  y += dividerH

  // 诗句（拼音 + 汉字）
  for (const line of poem.lines) {
    const chars = line.chars
    const lineW = chars.length * CHAR_W
    const startX = (W - lineW) / 2

    // 拼音行
    ctx.font = `${PINYIN_FONT_SIZE}px 'PingFang SC', sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.82)'
    ctx.textAlign = 'center'
    for (let i = 0; i < chars.length; i++) {
      const cx = startX + i * CHAR_W + CHAR_W / 2
      if (chars[i].pinyin) {
        ctx.fillText(chars[i].pinyin!, cx, y + PINYIN_FONT_SIZE)
      }
    }
    y += PINYIN_FONT_SIZE * 1.4

    // 汉字行
    ctx.font = `${CHAR_FONT_SIZE}px 'Ma Shan Zheng', cursive`
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = 5
    for (let i = 0; i < chars.length; i++) {
      const cx = startX + i * CHAR_W + CHAR_W / 2
      ctx.fillText(chars[i].char, cx, y + CHAR_FONT_SIZE)
    }
    ctx.shadowBlur = 0
    y += CHAR_FONT_SIZE * 1.2 + LINE_GAP
  }

  y += CONTENT_BOTTOM

  // 底栏背景
  ctx.fillStyle = 'rgba(0,0,0,0.38)'
  ctx.fillRect(0, y, W, FOOTER_H)

  // icon 图片
  const iconImg = await loadImage('/icon.png')
  if (iconImg) {
    const ix = PADDING_X
    const iy = y + (FOOTER_H - 32) / 2
    ctx.save()
    ctx.beginPath()
    const r = 7
    ctx.moveTo(ix + r, iy)
    ctx.lineTo(ix + 32 - r, iy)
    ctx.quadraticCurveTo(ix + 32, iy, ix + 32, iy + r)
    ctx.lineTo(ix + 32, iy + 32 - r)
    ctx.quadraticCurveTo(ix + 32, iy + 32, ix + 32 - r, iy + 32)
    ctx.lineTo(ix + r, iy + 32)
    ctx.quadraticCurveTo(ix, iy + 32, ix, iy + 32 - r)
    ctx.lineTo(ix, iy + r)
    ctx.quadraticCurveTo(ix, iy, ix + r, iy)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(iconImg, ix, iy, 32, 32)
    ctx.restore()
  }

  // 品牌文字——用 textBaseline middle 精确垂直居中
  const textX = PADDING_X + 40
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = `15px 'ZCOOL KuaiLe', sans-serif`
  ctx.fillStyle = 'rgba(255,248,225,0.85)'
  ctx.fillText('古诗小课堂', textX, y + FOOTER_H / 2 - 7)
  ctx.font = `9px 'PingFang SC', sans-serif`
  ctx.fillStyle = 'rgba(255,248,225,0.45)'
  ctx.fillText('每天一首，积累经典', textX, y + FOOTER_H / 2 + 9)
  ctx.textBaseline = 'alphabetic'

  return canvas.toDataURL('image/png')
}

// 绘制打卡卡片
async function drawCheckinCard(
  nickname: string,
  rankTitle: string,
  dateStr: string,
  todayCount: number,
  todayPoemTitle: string | null,
  streakCount: number,
  totalMemorized: number,
  masteredCount: number,
): Promise<string> {
  await document.fonts.ready

  const HEADER_H = 140
  const BODY_H = 180
  const FOOTER_H = 48
  const totalH = HEADER_H + BODY_H + FOOTER_H

  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = totalH * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)

  // 红色头部
  ctx.fillStyle = '#C62828'
  ctx.fillRect(0, 0, W, HEADER_H)

  // 装饰圆
  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  ctx.beginPath(); ctx.arc(W - 20, -30, 80, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  ctx.beginPath(); ctx.arc(W - 60, HEADER_H + 10, 55, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  ctx.beginPath(); ctx.arc(-10, 50, 40, 0, Math.PI * 2); ctx.fill()

  // 日期
  ctx.textAlign = 'left'
  ctx.font = `10px 'PingFang SC', sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillText(dateStr, 20, 28)

  // 今日打卡 标签
  ctx.font = `9px 'PingFang SC', sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.fillText('今日打卡', 20, 50)

  // 昵称
  ctx.font = `42px 'ZCOOL KuaiLe', sans-serif`
  ctx.fillStyle = '#ffffff'
  ctx.fillText(nickname, 20, 96)

  // 称号胶囊
  const capsuleX = 20
  const capsuleY = 106
  const capsuleW = ctx.measureText(rankTitle).width + 28
  const capsuleH = 20
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.beginPath()
  ctx.roundRect(capsuleX, capsuleY, capsuleW, capsuleH, 999)
  ctx.fill()
  // 小圆点
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.beginPath(); ctx.arc(capsuleX + 10, capsuleY + capsuleH / 2, 3, 0, Math.PI * 2); ctx.fill()
  ctx.font = `10px 'PingFang SC', sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.fillText(rankTitle, capsuleX + 18, capsuleY + 13)

  // 白色主体
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, HEADER_H, W, BODY_H)

  // 今日背诗卡片
  const todayText = todayCount === 0 ? '今日休息'
    : todayCount === 1 && todayPoemTitle ? `《${todayPoemTitle}》`
    : `背了 ${todayCount} 首`
  const cardY = HEADER_H + 14
  ctx.fillStyle = '#FBF6F0'
  ctx.beginPath(); ctx.roundRect(16, cardY, W - 32, 52, 10); ctx.fill()
  ctx.fillStyle = '#C62828'
  ctx.fillRect(16, cardY, 3, 52)
  ctx.beginPath(); ctx.roundRect(16, cardY, 3, 52, [10, 0, 0, 10]); ctx.fill()
  ctx.font = `9px 'PingFang SC', sans-serif`
  ctx.fillStyle = '#A07050'
  ctx.textAlign = 'left'
  ctx.fillText('今日背诗', 26, cardY + 16)
  ctx.font = `18px 'Ma Shan Zheng', cursive`
  ctx.fillStyle = '#2C1008'
  ctx.fillText(todayText, 26, cardY + 38)

  // 三格统计
  const stats = [
    { num: streakCount, label: '坚持天数' },
    { num: totalMemorized, label: '已背诵' },
    { num: masteredCount, label: '已掌握' },
  ]
  const cellW = (W - 32 - 16) / 3
  const cellY = HEADER_H + 14 + 52 + 10
  for (let i = 0; i < stats.length; i++) {
    const cx = 16 + i * (cellW + 8)
    ctx.fillStyle = '#FBF6F0'
    ctx.beginPath(); ctx.roundRect(cx, cellY, cellW, 60, 10); ctx.fill()
    ctx.font = `28px 'ZCOOL KuaiLe', sans-serif`
    ctx.fillStyle = '#C62828'
    ctx.textAlign = 'center'
    ctx.fillText(String(stats[i].num), cx + cellW / 2, cellY + 36)
    ctx.font = `9px 'PingFang SC', sans-serif`
    ctx.fillStyle = '#A07050'
    ctx.fillText(stats[i].label, cx + cellW / 2, cellY + 52)
  }

  // 底栏
  const footerY = HEADER_H + BODY_H
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, footerY, W, FOOTER_H)
  ctx.strokeStyle = '#F0E8DC'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(16, footerY); ctx.lineTo(W - 16, footerY); ctx.stroke()

  const iconImg = await loadImage('/icon.png')
  if (iconImg) {
    const ix = 16; const iy = footerY + (FOOTER_H - 28) / 2
    ctx.save()
    ctx.beginPath()
    const r = 6
    ctx.moveTo(ix + r, iy)
    ctx.lineTo(ix + 28 - r, iy)
    ctx.quadraticCurveTo(ix + 28, iy, ix + 28, iy + r)
    ctx.lineTo(ix + 28, iy + 28 - r)
    ctx.quadraticCurveTo(ix + 28, iy + 28, ix + 28 - r, iy + 28)
    ctx.lineTo(ix + r, iy + 28)
    ctx.quadraticCurveTo(ix, iy + 28, ix, iy + 28 - r)
    ctx.lineTo(ix, iy + r)
    ctx.quadraticCurveTo(ix, iy, ix + r, iy)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(iconImg, ix, iy, 28, 28)
    ctx.restore()
  }
  ctx.textAlign = 'left'
  ctx.font = `13px 'ZCOOL KuaiLe', sans-serif`
  ctx.fillStyle = '#6B4226'
  ctx.fillText('古诗小课堂', 52, footerY + FOOTER_H / 2 + 1)
  ctx.font = `8px 'PingFang SC', sans-serif`
  ctx.fillStyle = '#B08060'
  ctx.fillText('每天一首，积累经典', 52, footerY + FOOTER_H / 2 + 13)

  return canvas.toDataURL('image/png')
}

export default function ShareCardModal() {
  const { params, close } = useShareCard()
  const { totalMemorized, masteredCount, memorizeHistory } = useProgress()
  const { streakCount } = useQueue()

  const nickname = loadNickname()
  const rankTitle = getLevelTitle(totalMemorized)
  const today = new Date().toISOString().slice(0, 10)
  const todayPoems = memorizeHistory.filter(r => r.date === today)
  const todayCount = todayPoems.length

  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [showGenerating, setShowGenerating] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [showSaveTip, setShowSaveTip] = useState(false)

  // 锁定背景滚动
  useEffect(() => {
    if (params) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [params])

  // 每次打开重置并生成
  const generate = useCallback(async () => {
    if (!params) return
    setImgUrl(null)
    setShowGenerating(true)
    setSharing(false)
    setShowSaveTip(false)
    const startTime = Date.now()

    try {
      let url: string
      if (params.type === 'poem' && params.poemId) {
        const [poem, idx, bgImg] = await Promise.all([
          loadPoem(params.poemId),
          loadPoemIndex(),
          loadImage(getPoemImageUrl(params.poemId)),
        ])
        if (!poem) throw new Error('poem not found')
        const summary = idx.find(p => p.id === params.poemId!) ?? null
        url = await drawPoemCard(poem, summary, bgImg)
      } else {
        // checkin
        let todayPoemTitle: string | null = null
        if (todayPoems.length === 1) {
          const idx = await loadPoemIndex()
          todayPoemTitle = idx.find(p => p.id === todayPoems[0].id)?.title ?? null
        }
        url = await drawCheckinCard(
          nickname, rankTitle, todayLabel(),
          todayCount, todayPoemTitle,
          streakCount, totalMemorized, masteredCount,
        )
      }

      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 2000 - elapsed)
      setTimeout(() => {
        setImgUrl(url)
        setShowGenerating(false)
      }, remaining)
    } catch (e) {
      console.error('draw card error', e)
      setShowGenerating(false)
    }
  }, [params, nickname, rankTitle, todayCount, todayPoems, streakCount, totalMemorized, masteredCount])

  useEffect(() => {
    if (!params) return
    // 等弹窗动画完成（280ms）后再开始绘制，避免卡顿
    const t = setTimeout(() => { generate() }, 320)
    return () => clearTimeout(t)
  }, [params])

  async function handleShare() {
    if (!imgUrl) return
    setSharing(true)
    try {
      const res = await fetch(imgUrl)
      const blob = await res.blob()
      const file = new File([blob], 'poem-card.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${nickname}的古诗成果` })
      } else {
        setShowSaveTip(true)
        setTimeout(() => setShowSaveTip(false), 3000)
      }
    } catch { /* 用户取消 */ } finally {
      setSharing(false)
    }
  }

  if (!params) return null
  const isPoem = params.type === 'poem'

  return (
    <>
      <div className="scm-backdrop" onClick={close} />
      <div className="scm-sheet">
        <div className="scm-handle-bar"><div className="scm-handle" /></div>

        <div className="scm-header">
          <span className="scm-title">{isPoem ? '分享这首诗' : '今日打卡'}</span>
          <button className="scm-close" onClick={close}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="scm-preview-area">
          {showGenerating && (
            <div className="scm-generating-ui">
              <div className="scm-ripple-wrap">
                <div className="scm-ripple-ring" style={{ animationDelay:'0ms' }} />
                <div className="scm-ripple-ring" style={{ animationDelay:'700ms' }} />
                <div className="scm-ripple-ring" style={{ animationDelay:'1400ms' }} />
                <div className="scm-ripple-core" />
              </div>
              <p className="scm-generating-text">正在生成卡片…</p>
            </div>
          )}
          {!showGenerating && imgUrl && (
            <div className="scm-preview-wrap">
              <img src={imgUrl} className="scm-preview" alt="分享卡片" />
            </div>
          )}
          {!showGenerating && !imgUrl && (
            <div className="scm-generating-ui">
              <div className="scm-ripple-wrap">
                <div className="scm-ripple-ring" style={{ animationDelay:'0ms' }} />
                <div className="scm-ripple-ring" style={{ animationDelay:'700ms' }} />
                <div className="scm-ripple-ring" style={{ animationDelay:'1400ms' }} />
                <div className="scm-ripple-core" />
              </div>
              <p className="scm-generating-text">准备中…</p>
            </div>
          )}
        </div>

        {showSaveTip && <p className="scm-save-tip">长按图片保存到相册</p>}
        <p className="scm-hint">长按图片可保存，或点击下方按钮分享</p>

        <div className="scm-actions">
          <button className="scm-btn" onClick={handleShare} disabled={!imgUrl || sharing || showGenerating}>
            {sharing ? '请稍候…' : '分享 / 保存'}
          </button>
        </div>
      </div>

      <style>{`
        .scm-backdrop {
          position: fixed; inset: 0; z-index: 300;
          background: rgba(0,0,0,0.5);
          animation: scm-fade 0.2s ease;
        }
        .scm-sheet {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 301;
          background: var(--bg); border-radius: 20px 20px 0 0;
          padding-bottom: env(safe-area-inset-bottom, 0px);
          display: flex; flex-direction: column; max-height: 96vh;
          min-height: 568px;
          animation: scm-up 0.28s cubic-bezier(0.34,1.1,0.64,1);
        }
        .scm-handle-bar { display:flex; justify-content:center; padding: 10px 0 4px; flex-shrink:0; }
        .scm-handle { width:36px; height:4px; border-radius:2px; background:var(--border); }
        .scm-header {
          display:flex; align-items:center; justify-content:space-between;
          padding: 4px 20px 12px; flex-shrink:0;
        }
        .scm-title { font-family:var(--font-brush); font-size:1.1rem; color:var(--ink); }
        .scm-close {
          width:32px; height:32px; border-radius:50%;
          background:var(--border); color:var(--ink-light);
          display:flex; align-items:center; justify-content:center;
        }
        .scm-close:active { opacity:0.7; }
        .scm-preview-area {
          flex:1; overflow-y:auto; min-height: 200px;
          display:flex; align-items:flex-start; justify-content:center;
          padding: 0 20px 12px;
        }
        .scm-generating-ui {
          display:flex; flex-direction:column; align-items:center; gap:20px;
          padding: 60px 0; position:relative; width:100%;
        }
        .scm-ripple-wrap {
          position:relative; width:72px; height:72px;
          display:flex; align-items:center; justify-content:center;
        }
        .scm-ripple-ring {
          position:absolute; border-radius:50%;
          border: 1.5px solid rgba(198,40,40,0.5);
          width:72px; height:72px;
          animation: scm-ripple 2.1s ease-out infinite;
        }
        .scm-ripple-core {
          width:22px; height:22px; border-radius:50%;
          background: #C62828; opacity:0.9;
          box-shadow: 0 0 0 4px rgba(198,40,40,0.12);
        }
        .scm-generating-text {
          font-family:var(--font-ui); font-size:var(--text-sm);
          color:var(--ink-light); letter-spacing:0.08em;
        }
        .scm-preview-wrap {
          width:100%; max-width:320px;
          border-radius:16px; overflow:hidden;
          box-shadow: 0 6px 28px rgba(0,0,0,0.14);
          flex-shrink:0;
        }
        .scm-preview { display:block; width:100%; height:auto; }
        .scm-save-tip {
          text-align:center; font-size:var(--text-sm);
          color:#C62828; padding: 0 20px 6px; flex-shrink:0;
        }
        .scm-hint {
          text-align:center; font-size:var(--text-sm);
          color:var(--ink-light); padding: 0 20px 8px; flex-shrink:0;
        }
        .scm-actions { padding: 8px 20px 16px; flex-shrink:0; }
        .scm-btn {
          display:block; width:100%; padding:15px;
          border-radius:999px; font-family:var(--font-brush);
          font-size:1.05rem; font-weight:700; text-align:center;
          background:#C62828; color:#FFF8E1;
          box-shadow: 0 4px 16px rgba(198,40,40,0.3);
          transition: transform 0.1s, opacity 0.1s;
        }
        .scm-btn:active:not(:disabled) { transform:scale(0.97); }
        .scm-btn:disabled { opacity:0.5; }
        @keyframes scm-fade { from{opacity:0} to{opacity:1} }
        @keyframes scm-up { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes scm-ripple {
          0%   { transform:scale(0.3); opacity:0.7; }
          80%  { transform:scale(1.6); opacity:0; }
          100% { transform:scale(1.6); opacity:0; }
        }
      `}</style>
    </>
  )
}
