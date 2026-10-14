import { useRef, useState, useEffect, useCallback, forwardRef } from 'react'
import html2canvas from 'html2canvas'
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
async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const blob = await r.blob()
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
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

  const [poem, setPoem] = useState<Poem | null>(null)
  const [poemSummary, setPoemSummary] = useState<PoemSummary | null>(null)
  const [bgDataUrl, setBgDataUrl] = useState<string | null>(null)
  const [todayPoemTitle, setTodayPoemTitle] = useState<string | null>(null)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [showGenerating, setShowGenerating] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [showSaveTip, setShowSaveTip] = useState(false)

  const cardRef = useRef<HTMLDivElement>(null)

  // 锁定背景滚动
  useEffect(() => {
    if (params) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [params])

  // 每次打开重置
  useEffect(() => {
    if (!params) return
    setImgUrl(null)
    setPoem(null)
    setPoemSummary(null)
    setBgDataUrl(null)
    setTodayPoemTitle(null)
    setGenerating(false)
    setShowGenerating(false)
    setSharing(false)
    setShowSaveTip(false)
  }, [params])

  // poem：加载诗数据 + 背景图
  useEffect(() => {
    if (!params || params.type !== 'poem' || !params.poemId) return
    loadPoem(params.poemId).then(setPoem)
    loadPoemIndex().then(idx => setPoemSummary(idx.find(p => p.id === params.poemId!) ?? null))
    fetchAsDataUrl(getPoemImageUrl(params.poemId)).then(d => { if (d) setBgDataUrl(d) })
  }, [params])

  // checkin：加载今日诗标题
  useEffect(() => {
    if (!params || params.type !== 'checkin' || todayPoems.length !== 1) return
    loadPoemIndex().then(idx => {
      const s = idx.find(p => p.id === todayPoems[0].id)
      if (s) setTodayPoemTitle(s.title)
    })
  }, [params, todayPoems.length])

  const generate = useCallback(async () => {
    const card = cardRef.current
    if (!card) return
    setGenerating(true)
    setShowGenerating(true)
    const startTime = Date.now()
    try {
      const canvas = await html2canvas(card, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      })
      const url = canvas.toDataURL('image/png')
      // 强制生成中 UI 至少展示 500ms
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 2000 - elapsed)
      setTimeout(() => {
        setImgUrl(url)
        setGenerating(false)
        setShowGenerating(false)
      }, remaining)
    } catch (e) {
      console.error('html2canvas error', e)
      setGenerating(false)
      setShowGenerating(false)
    }
  }, [])

  // poem 等诗和背景图都就绪后生成
  useEffect(() => {
    if (!params || params.type !== 'poem') return
    if (!poem) return
    const t = setTimeout(generate, 150)
    return () => clearTimeout(t)
  }, [params, poem, bgDataUrl])

  // checkin 直接生成
  useEffect(() => {
    if (!params || params.type !== 'checkin') return
    const t = setTimeout(generate, 150)
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
  const dateStr = todayLabel()

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

        {/* 卡片放在屏幕外，仅用于截图 */}
        <div style={{ position:'fixed', left:'-9999px', top:0, pointerEvents:'none', zIndex:-1 }}>
          {isPoem ? (
            <PoemCard ref={cardRef} poem={poem} poemSummary={poemSummary} bgDataUrl={bgDataUrl} />
          ) : (
            <CheckinCard
              ref={cardRef}
              nickname={nickname} rankTitle={rankTitle} dateStr={dateStr}
              todayCount={todayCount} todayPoemTitle={todayPoemTitle}
              streakCount={streakCount} totalMemorized={totalMemorized} masteredCount={masteredCount}
            />
          )}
        </div>

        {/* 预览区 */}
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
          <button className="scm-btn" onClick={handleShare} disabled={!imgUrl || sharing || generating}>
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
          padding: 40px 0; position:relative;
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
          color:#C62828; padding: 0 20px 6px;
        }
        .scm-hint {
          text-align:center; font-size:var(--text-sm);
          color:var(--ink-light); padding: 0 20px 8px;
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

/* ─── 今日打卡卡片 ─── */
interface CheckinCardProps {
  nickname: string; rankTitle: string; dateStr: string
  todayCount: number; todayPoemTitle: string | null
  streakCount: number; totalMemorized: number; masteredCount: number
}
const CheckinCard = forwardRef<HTMLDivElement, CheckinCardProps>(({
  nickname, rankTitle, dateStr, todayCount, todayPoemTitle,
  streakCount, totalMemorized, masteredCount,
}, ref) => {
  const todayText = todayCount === 0 ? '今日休息'
    : todayCount === 1 && todayPoemTitle ? `《${todayPoemTitle}》`
    : `背了 ${todayCount} 首`
  return (
    <div ref={ref} style={{ width:300, background:'#fff', borderRadius:0, overflow:'hidden', fontFamily:'PingFang SC,Helvetica Neue,Arial,sans-serif' }}>
      <div style={{ background:'#C62828', padding:'16px 20px 20px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-40, top:-50, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.07)' }} />
        <div style={{ position:'absolute', right:50, bottom:-55, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />
        <div style={{ position:'absolute', left:-20, top:30, width:70, height:70, borderRadius:'50%', background:'rgba(255,255,255,0.05)' }} />
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.65)', letterSpacing:'0.06em', marginBottom:16 }}>{dateStr}</div>
          <div style={{ fontSize:'0.58rem', color:'rgba(255,255,255,0.7)', letterSpacing:'0.14em', marginBottom:2 }}>今日打卡</div>
          <div style={{ fontFamily:"'ZCOOL KuaiLe','PingFang SC',sans-serif", fontSize:'2.6rem', color:'#fff', lineHeight:1 }}>{nickname}</div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.15)', borderRadius:999, padding:'3px 10px 3px 8px', marginTop:8, fontSize:'0.6rem', color:'rgba(255,255,255,0.65)' }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:'rgba(255,255,255,0.7)', display:'inline-block' }} />
            {rankTitle}
          </div>
        </div>
      </div>
      <div style={{ padding:'14px 16px 12px', display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ background:'#FBF6F0', borderRadius:12, padding:'10px 14px', borderLeft:'3px solid #C62828' }}>
          <div style={{ fontSize:'0.55rem', color:'#A07050', letterSpacing:'0.08em', marginBottom:3 }}>今日背诗</div>
          <div style={{ fontFamily:"'Ma Shan Zheng','KaiTi',serif", fontSize:'1.1rem', color:'#2C1008' }}>{todayText}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {[{ num:streakCount, label:'坚持天数' }, { num:totalMemorized, label:'已背诵' }, { num:masteredCount, label:'已掌握' }].map(({ num, label }) => (
            <div key={label} style={{ flex:1, background:'#FBF6F0', borderRadius:12, padding:'10px 12px' }}>
              <div style={{ fontFamily:"'ZCOOL KuaiLe','PingFang SC',sans-serif", fontSize:'1.9rem', color:'#C62828', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{num}</div>
              <div style={{ fontSize:'0.55rem', color:'#A07050', marginTop:2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding:'9px 16px 13px', display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:'1px solid #F0E8DC' }}>
        <div>
          <div style={{ fontFamily:"'ZCOOL KuaiLe','PingFang SC',sans-serif", fontSize:'0.78rem', color:'#6B4226' }}>古诗小课堂</div>
          <div style={{ fontSize:'0.52rem', color:'#B08060', marginTop:1 }}>每天一首，积累经典</div>
        </div>
      </div>
    </div>
  )
})
CheckinCard.displayName = 'CheckinCard'

/* ─── 古诗分享卡片 ─── */
interface PoemCardProps {
  poem: Poem | null; poemSummary: PoemSummary | null; bgDataUrl: string | null
}
const PoemCard = forwardRef<HTMLDivElement, PoemCardProps>(({ poem, poemSummary, bgDataUrl }, ref) => {
  if (!poem) return <div ref={ref} style={{ width:300, height:420, background:'#2C1008', borderRadius:20 }} />

  return (
    <div ref={ref} style={{ width:300, background:'#2C1008', borderRadius:0, overflow:'hidden', display:'flex', flexDirection:'column', position:'relative', fontFamily:'PingFang SC,Helvetica Neue,Arial,sans-serif' }}>
      {bgDataUrl && <div style={{ position:'absolute', inset:0, backgroundImage:`url(${bgDataUrl})`, backgroundSize:'cover', backgroundPosition:'center' }} />}
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)' }} />
      <div style={{ position:'relative', zIndex:2, flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', padding:'20px 28px 36px', gap:4, textAlign:'center' }}>
        <div style={{ fontFamily:"'Ma Shan Zheng','KaiTi',serif", fontSize:'2.0rem', color:'#fff', lineHeight:1.1, textShadow:'0 2px 12px rgba(0,0,0,0.5)', marginBottom:4, whiteSpace:'nowrap' }}>{poem.title}</div>
        <div style={{ fontFamily:'PingFang SC,sans-serif', fontSize:'0.62rem', color:'rgba(255,255,255,0.75)', letterSpacing:'0.1em', marginBottom:6 }}>
          {poemSummary?.dynasty ? `【${poemSummary.dynasty}】` : ''}{poemSummary?.author ?? ''}
        </div>
        <div style={{ width:36, height:1, background:'linear-gradient(to right,transparent,rgba(255,248,225,0.5),transparent)', marginBottom:6 }} />
        <div style={{ display:'flex', flexDirection:'column', gap:0, padding:'10px 14px' }}>
          {poem.lines.map((line, i) => (
            <div key={i} style={{ marginBottom:8 }}>
              {/* 拼音行 */}
              <div style={{ display:'flex', justifyContent:'center' }}>
                {line.chars.map((c, j) => (
                  <div key={j} style={{ width:'1.9rem', textAlign:'center', fontFamily:'PingFang SC,sans-serif', fontSize:'0.52rem', color:'rgba(255,255,255,0.85)', lineHeight:1.3, letterSpacing:0 }}>
                    {c.pinyin ?? ''}
                  </div>
                ))}
              </div>
              {/* 汉字行 */}
              <div style={{ display:'flex', justifyContent:'center' }}>
                {line.chars.map((c, j) => (
                  <div key={j} style={{ width:'1.9rem', textAlign:'center', fontFamily:"'Ma Shan Zheng','KaiTi',serif", fontSize:'1.45rem', color:'#fff', textShadow:'0 1px 6px rgba(0,0,0,0.5)', lineHeight:1.1 }}>
                    {c.char}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position:'relative', zIndex:2, padding:'9px 16px 13px', display:'flex', alignItems:'center', background:'rgba(0,0,0,0.35)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <img src="/icon.png" alt="" style={{ width:28, height:28, borderRadius:6, objectFit:'contain' }} />
          <div>
            <div style={{ fontFamily:"'ZCOOL KuaiLe','PingFang SC',sans-serif", fontSize:'0.85rem', color:'rgba(255,248,225,0.85)', lineHeight:1 }}>古诗小课堂</div>
            <div style={{ fontSize:'0.55rem', color:'rgba(255,248,225,0.45)', marginTop:2 }}>每天一首，积累经典</div>
          </div>
        </div>
      </div>
    </div>
  )
})
PoemCard.displayName = 'PoemCard'
