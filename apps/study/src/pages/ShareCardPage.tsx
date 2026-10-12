import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgress } from '../hooks/useProgress'
import { useQueue } from '../hooks/useQueue'
import { getLevelTitle } from '../utils/levelTitle'

const NICKNAME_KEY = 'poem_nickname'
const APP_NAME = '今日山'

function loadNickname(): string {
  try { return localStorage.getItem(NICKNAME_KEY) ?? '小诗人' } catch { return '小诗人' }
}

function todayLabel(): string {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function isIOS(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export default function ShareCardPage() {
  const navigate = useNavigate()
  const { totalMemorized, memorizeHistory } = useProgress()
  const { streakCount } = useQueue()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const nickname = loadNickname()
  const title = getLevelTitle(totalMemorized)

  const today = new Date().toISOString().slice(0, 10)
  const todayPoems = memorizeHistory.filter(r => r.date === today)
  const todayCount = todayPoems.length

  useEffect(() => {
    drawCard()
  }, [])

  function drawCard() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = 750, H = 420
    canvas.width = W
    canvas.height = H

    // 背景
    ctx.fillStyle = '#fff8f0'
    ctx.fillRect(0, 0, W, H)

    // 左侧红色侧边
    ctx.fillStyle = '#C62828'
    ctx.fillRect(0, 0, 12, H)

    // 顶部标题区
    ctx.fillStyle = '#C62828'
    roundRect(ctx, 24, 24, W - 48, 80, 16)
    ctx.fill()

    // 昵称
    ctx.fillStyle = '#FFF8E1'
    ctx.font = 'bold 32px serif'
    ctx.fillText(nickname, 48, 72)

    // 称号
    ctx.font = '18px sans-serif'
    ctx.fillStyle = 'rgba(255,248,225,0.8)'
    ctx.fillText(title, 48 + ctx.measureText(nickname).width + 20, 72)

    // 日期
    const dateStr = todayLabel()
    ctx.font = '16px sans-serif'
    ctx.fillStyle = 'rgba(255,248,225,0.65)'
    ctx.textAlign = 'right'
    ctx.fillText(dateStr, W - 48, 72)
    ctx.textAlign = 'left'

    // 分隔线
    ctx.strokeStyle = 'rgba(198,40,40,0.15)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(24, 128); ctx.lineTo(W - 24, 128)
    ctx.stroke()

    // 今日背诗
    ctx.fillStyle = '#1a1a1a'
    ctx.font = 'bold 20px sans-serif'
    ctx.fillText('今日背诗', 48, 172)

    const poemText = todayCount === 0
      ? '今日暂无记录'
      : todayCount === 1
        ? `《今日一首》`
        : `今日共背 ${todayCount} 首`
    ctx.fillStyle = '#C62828'
    ctx.font = '28px serif'
    ctx.fillText(poemText, 48, 214)

    // 连续天数
    ctx.fillStyle = '#1a1a1a'
    ctx.font = 'bold 20px sans-serif'
    ctx.fillText('坚持打卡', 48, 270)

    const streakText = streakCount <= 1 ? `第 ${streakCount} 天` : `连续 ${streakCount} 天`
    ctx.fillStyle = '#C62828'
    ctx.font = '28px serif'
    ctx.fillText(streakText, 48, 312)

    // 已掌握总数
    ctx.fillStyle = '#1a1a1a'
    ctx.font = 'bold 20px sans-serif'
    ctx.fillText('已掌握', 360, 270)

    ctx.fillStyle = '#C62828'
    ctx.font = '28px serif'
    ctx.fillText(`${totalMemorized} 首`, 360, 312)

    // App 名称
    ctx.fillStyle = 'rgba(198,40,40,0.4)'
    ctx.font = 'bold 18px serif'
    ctx.textAlign = 'right'
    ctx.fillText(APP_NAME, W - 48, H - 28)
    ctx.textAlign = 'left'

    const url = canvas.toDataURL('image/png')
    setImgUrl(url)
  }

  async function handleShare() {
    const canvas = canvasRef.current
    if (!canvas) return
    setSharing(true)
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) { setSharing(false); return }
        const file = new File([blob], 'poem-card.png', { type: 'image/png' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: `${nickname}的古诗成果` })
          } catch {
            // 用户取消不报错
          }
        } else {
          // 不支持 Share API：图片已显示，引导长按保存
        }
        setSharing(false)
      }, 'image/png')
    } catch {
      setSharing(false)
    }
  }

  return (
    <div className="sc">
      <header className="sc__nav">
        <button className="sc__back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 1024 1024" width="18" height="18" fill="currentColor"><path d="M403.2 812.8L100.256 512 403.2 211.2l59.744 59.744-198.4 198.4h652.8v85.344h-652.8l198.4 198.4z"/></svg>
          返回
        </button>
        <span className="sc__nav-title">成果卡片</span>
      </header>

      <div className="sc__body">
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {imgUrl && (
          <div className="sc__preview-wrap">
            <img src={imgUrl} className="sc__preview" alt="成果卡片" />
          </div>
        )}

        <p className="sc__hint">
          {isIOS() ? '长按图片保存到相册，或点击下方按钮分享' : '长按图片保存，或点击下方按钮分享'}
        </p>

        <button className="sc__share-btn" onClick={handleShare} disabled={sharing}>
          {sharing ? '请稍候…' : '分享 / 保存图片'}
        </button>
      </div>

      <style>{`
        .sc {
          display: flex; flex-direction: column;
          min-height: 100vh; background: var(--bg);
        }
        .sc__nav {
          position: sticky; top: env(safe-area-inset-top, 0px);
          z-index: 20;
          display: flex; align-items: center; gap: 12px;
          padding: 0 16px; height: var(--navbar-height);
          background: #C62828; flex-shrink: 0;
        }
        .sc__back {
          font-family: var(--font-ui); font-size: var(--text-sm);
          color: #FFF8E1; padding: 6px 12px; border-radius: 999px;
          background: rgba(255,255,255,0.15);
          display: flex; align-items: center; gap: 4px;
        }
        .sc__back:active { background: rgba(255,255,255,0.28); }
        .sc__nav-title {
          font-family: var(--font-brush); font-size: 1.2rem; color: #FFF8E1;
        }
        .sc__body {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; gap: 16px;
          padding: 24px 20px calc(32px + env(safe-area-inset-bottom, 0px));
        }
        .sc__preview-wrap {
          width: 100%; max-width: 420px;
          border-radius: 16px; overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        }
        .sc__preview {
          display: block; width: 100%; height: auto;
        }
        .sc__hint {
          font-family: var(--font-ui); font-size: var(--text-sm);
          color: var(--ink-light); text-align: center; line-height: 1.6;
        }
        .sc__share-btn {
          width: 100%; max-width: 360px;
          padding: 18px 24px;
          background: #C62828; color: #FFF8E1;
          border-radius: 999px;
          font-family: var(--font-brush); font-size: 1.1rem; font-weight: 700;
          box-shadow: 0 4px 16px rgba(198,40,40,0.3);
          transition: transform 0.1s, opacity 0.1s;
        }
        .sc__share-btn:active:not(:disabled) { transform: scale(0.97); }
        .sc__share-btn:disabled { opacity: 0.6; }
      `}</style>
    </div>
  )
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}
