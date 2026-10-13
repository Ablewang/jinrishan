import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadPoemIndex } from '../data/poems'
import type { PoemSummary } from '../data/poems'
import { useProgress } from '../hooks/useProgress'
import { useQueue } from '../hooks/useQueue'
import { IconReview, IconSparkle, IconFireworks } from '../components/icons'
import { getLevelTitle } from '../utils/levelTitle'
import imgMap from '../data/poem_img_map.json'

export default function Home() {
  const navigate = useNavigate()
  const { todayDueReviews, reviewCards, totalMemorized } = useProgress()
  const { queue, streakCount, todayComplete, isReturning } = useQueue()
  const [poems, setPoems] = useState<PoemSummary[]>([])
  const [bannerVisible, setBannerVisible] = useState(false)
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const levelTitle = getLevelTitle(totalMemorized)

  useEffect(() => { loadPoemIndex().then(setPoems) }, [])

  // 久违横幅：每次会话只显示一次
  useEffect(() => {
    if (isReturning && !todayComplete && !sessionStorage.getItem('wb_shown')) {
      sessionStorage.setItem('wb_shown', '1')
      setBannerVisible(true)
      bannerTimer.current = setTimeout(() => setBannerVisible(false), 4000)
    }
    return () => { if (bannerTimer.current) clearTimeout(bannerTimer.current) }
  }, [isReturning, todayComplete])

  const [activeTab, setActiveTab] = useState<'plan' | 'review'>('plan')
  const [shakeReview, setShakeReview] = useState(false)
  const [showReviewTip, setShowReviewTip] = useState(false)

  function triggerShake() {
    setShakeReview(true)
    setShowReviewTip(true)
    setTimeout(() => setShakeReview(false), 600)
    setTimeout(() => setShowReviewTip(false), 2500)
  }

  const currentPoemId = queue[0] ?? null
  const currentPoem = poems.find(p => p.id === currentPoemId) ?? null

  // 今日复习：todayDueReviews 中对应诗信息
  const reviewPoems = useMemo(() =>
    todayDueReviews.map(rc => poems.find(p => p.id === rc.id)).filter(Boolean) as PoemSummary[],
    [todayDueReviews, poems]
  )

  // 今日复习是否全部完成（today所有due的卡片的lastDate===today）
  const today = new Date().toISOString().slice(0, 10)
  const reviewDoneToday = useMemo(() =>
    todayDueReviews.every(rc => rc.lastDate === today),
    [todayDueReviews, today, reviewCards]
  )
  const hasReviews = todayDueReviews.length > 0

  // 模式判断
  type Mode = 'pending' | 'done' | 'empty' | 'returning'
  const mode: Mode = (() => {
    if (queue.length === 0) return 'empty'
    if (todayComplete) return 'done'
    if (isReturning) return 'returning'
    return 'pending'
  })()


  function startReview() {
    if (reviewPoems.length === 0) return
    const ids = reviewPoems.map(p => p.id).join(',')
    navigate(`/poem/${reviewPoems[0].id}?review=1&reviewIds=${ids}&reviewIdx=0`)
  }

  return (
    <div className="home">
      {/* 顶部 hero */}
      <header className="home__hero">
        {/* 装饰暗纹 */}
        <svg className="home__hero-deco" viewBox="0 0 200 120" fill="none" aria-hidden="true">
          <text x="110" y="100" fontSize="96" fontFamily="serif" fill="rgba(255,255,255,0.06)" transform="rotate(-12,100,60)">诗</text>
          <text x="148" y="72" fontSize="48" fontFamily="serif" fill="rgba(255,255,255,0.04)" transform="rotate(-12,100,60)">词</text>
        </svg>
        <div className="home__hero-greeting">古诗小课堂 <span style={{color:'#F06292'}}>✦</span></div>
        <div className="home__hero-title-row">
          <span className="home__hero-title">小学必背古诗70首</span>
          <span className="home__level-title">{levelTitle}</span>
        </div>
        <div className="home__hero-streak">
          <span className="home__streak-chip">连续 {streakCount} 天</span>
          <span className="home__progress-chip">{totalMemorized} / 70 首</span>
          <button className="home__manage-btn" onClick={() => navigate('/queue')}>背诗计划</button>
        </div>
        <button className="home__share-card-btn" onClick={() => navigate('/share-card')}>
          生成成果卡片
        </button>
      </header>

      {/* 久违横幅 */}
      {bannerVisible && (
        <div className="home__welcome-back">好久不见，继续出发吧！</div>
      )}

      {/* 今日任务区块 */}
      <div className="home__scroll">
        <div className="home__section-title">今日任务</div>

        {todayComplete && !hasReviews ? (
          /* 全部完成 banner */
          <div className="done-banner">
            <div className="done-icon"><IconFireworks size={22} fill="#10B981" /></div>
            <div>
              <div className="done-text-main">今日任务全部完成！</div>
              <div className="done-text-sub">复习了 {todayDueReviews.length} 首 · 连续 {streakCount} 天</div>
            </div>
          </div>
        ) : (
          <div className="task-section">
            <div className="task-header">
              <div className="task-header-title">今日待完成</div>
              <span className="pill pill-red">{(hasReviews ? 1 : 0) + (queue.length > 0 ? 1 : 0)} 项</span>
            </div>

            {/* 复习行 */}
            {hasReviews && (
              <div className={`task-row${shakeReview ? ' task-row--shake' : ''}`}>
                <div className="task-row-icon task-row-icon--review"><IconReview size={18} fill="#F59E0B" /></div>
                <div className="task-row-info">
                  <div className="task-row-label">今日复习</div>
                  <div className="task-row-sub">
                    {reviewPoems.slice(0, 2).map(p => p.title).join('·')}，共 {todayDueReviews.length} 首到期
                  </div>
                </div>
                <div style={{ position: 'relative' }}>
                  <button
                    className="task-row-btn task-row-btn--red"
                    onClick={() => startReview()}
                  >开始</button>
                  {showReviewTip && (
                    <div className="review-tip-bubble">先复习！</div>
                  )}
                </div>
              </div>
            )}

            {/* 新诗行 */}
            {queue.length > 0 && (
              <div className="task-row">
                <div className="task-row-icon task-row-icon--new"><IconSparkle size={18} fill="#C62828" /></div>
                <div className="task-row-info">
                  <div className={`task-row-label${hasReviews && !reviewDoneToday ? ' task-row-label--dim' : ''}`}>学新诗</div>
                  <div className="task-row-sub">
                    {currentPoem ? `${currentPoem.title}` : ''}
                    {hasReviews && !reviewDoneToday ? ' · 先完成复习解锁' : ''}
                  </div>
                </div>
                {hasReviews && !reviewDoneToday ? (
                  <button className="task-row-btn task-row-btn--grey" onClick={triggerShake}>学习</button>
                ) : (
                  <button className="task-row-btn task-row-btn--red" onClick={() => currentPoemId && navigate(`/poem/${currentPoemId}`)}>开始</button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 明日预告（完成后显示） */}
        {(todayComplete || reviewDoneToday) && (() => {
          const tmr = new Date(today)
          tmr.setDate(tmr.getDate() + 1)
          const tomorrowStr = tmr.toISOString().slice(0, 10)
          const tomorrowReviews = reviewCards.filter(c => c.level < 5 && c.due === tomorrowStr)
          if (tomorrowReviews.length === 0) return null
          return (
            <>
              <div className="home__section-title" style={{ marginTop: 4 }}>明日预告</div>
              <div className="task-section">
                <div className="task-header">
                  <div className="task-header-title">明天到期复习</div>
                  <span className="pill pill-gold">{tomorrowReviews.length} 首</span>
                </div>
                {tomorrowReviews.slice(0, 2).map(rc => {
                  const p = poems.find(pm => pm.id === rc.id)
                  if (!p) return null
                  return (
                    <div key={rc.id} className="task-row">
                      <div className="task-row-icon task-row-icon--review"><IconReview size={18} fill="#F59E0B" /></div>
                      <div className="task-row-info">
                        <div className="task-row-label">{p.title}</div>
                        <div className="task-row-sub">明天到期 · 第 {rc.level} 档</div>
                      </div>
                      <div className="rpi-dots">
                        {[0,1,2,3,4].map(i => <div key={i} className={`rpi-dot${i < rc.level ? ' rpi-dot--filled' : ''}`} />)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )
        })()}

        {/* tabs：背诗计划 / 待复习 */}
        {mode !== 'empty' && (
          <>
            <div className="home__tabs">
              <button className={`home__tab${activeTab === 'plan' ? ' home__tab--active' : ''}`} onClick={() => setActiveTab('plan')}>背诗计划</button>
              <button className={`home__tab${activeTab === 'review' ? ' home__tab--active' : ''}`} onClick={() => setActiveTab('review')}>
                待复习
                {todayDueReviews.length > 0 && <span className="home__tab-badge">{todayDueReviews.length}</span>}
              </button>
            </div>

            {activeTab === 'plan' && (
              <div className="queue-preview">
                {queue.slice(0, 4).map((id, idx) => {
                  const p = poems.find(pm => pm.id === id)
                  if (!p) return null
                  return (
                    <div
                      key={id}
                      className="queue-preview__item"
                      onClick={() => navigate(`/poem/${id}`)}
                      role="button"
                    >
                      {(imgMap as Record<string, string>)[String(id)] && (
                        <img
                          className="queue-preview__bg"
                          src={`/images/${encodeURIComponent((imgMap as Record<string, string>)[String(id)])}`}
                          aria-hidden="true"
                        />
                      )}
                      <div className="queue-preview__header">
                        <span className={`queue-preview__index${idx === 0 ? ' queue-preview__index--active' : ''}`}>{idx + 1}</span>
                        <div className="queue-preview__title">《{p.title}》</div>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--ink-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.5 }}>
                        {p.dynasty ? `${p.dynasty}·` : ''}{p.author}{p.allLines ? ` · ${p.allLines}` : ''}
                      </div>
                      {idx === 0 && (
                        <div style={{ marginTop: 10 }}>
                          <button className="queue-preview__start-btn" onClick={e => { e.stopPropagation(); navigate(`/poem/${id}`) }}>去背诵</button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {queue.length > 4 && (
                  <div className="queue-preview__more" onClick={() => navigate('/queue')}>
                    还有 {queue.length - 4} 首 · 查看全部 <svg viewBox="0 0 1024 1024" width="14" height="14" fill="currentColor"><path d="M620.8 812.8l-59.744-59.744 198.4-198.4h-652.8v-85.344h652.8l-198.4-198.4L620.8 211.168l302.944 300.8z"/></svg>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'review' && (
              <div className="queue-preview">
                {reviewCards.length === 0 && (
                  <div className="queue-preview__empty">还没有需要复习的诗，继续背新诗吧</div>
                )}
                {reviewCards.map(rc => {
                  const p = poems.find(pm => pm.id === rc.id)
                  if (!p) return null
                  const isDue = rc.due <= today
                  const daysUntil = Math.round((new Date(rc.due).getTime() - new Date(today).getTime()) / 86400000)
                  const dueLabel = isDue ? '今日到期' : daysUntil === 1 ? '明天复习' : `${daysUntil} 天后复习`
                  return (
                    <div
                      key={rc.id}
                      className="queue-preview__item"
                      onClick={() => navigate(`/poem/${rc.id}`)}
                      role="button"
                    >
                      {(imgMap as Record<string, string>)[String(rc.id)] && (
                        <img
                          className="queue-preview__bg"
                          src={`/images/${encodeURIComponent((imgMap as Record<string, string>)[String(rc.id)])}`}
                          aria-hidden="true"
                        />
                      )}
                      <div className="queue-preview__title">《{p.title}》</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--ink-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.5 }}>
                        {p.dynasty ? `${p.dynasty}·` : ''}{p.author}{p.allLines ? ` · ${p.allLines}` : ''}
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className={`queue-preview__pill ${isDue ? 'queue-preview__pill--red' : 'queue-preview__pill--grey'}`}>
                          {dueLabel}
                        </span>
                        <span className="queue-preview__level">已复习 {rc.level} 次</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {mode === 'empty' && (
          <div className="queue-empty-state">
            <div className="queue-empty-mascot">
              <img src="/icon.png" alt="" />
              <div className="queue-empty-bubble">快来挑诗！</div>
            </div>
            <div className="queue-empty-text">
              <strong>计划空空如也～</strong><br />
              去诗集里挑几首，加入计划<br />每天背一首，积少成多
            </div>
            <button className="task-row-btn task-row-btn--red" style={{ marginTop: 12 }} onClick={() => navigate('/queue')}>去挑诗</button>
          </div>
        )}
      </div>

      <style>{styles}</style>
    </div>
  )
}

const styles = `
  .home {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: #FAF6F1;
    background-image: radial-gradient(circle, rgba(198,40,40,0.04) 1px, transparent 1px);
    background-size: 22px 22px;
  }

  /* ── hero ── */
  .home__hero {
    background: linear-gradient(160deg, #D32F2F 0%, #B71C1C 100%);
    padding: 16px 18px 28px;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
    border-radius: 0 0 28px 28px;
    box-shadow: 0 4px 20px rgba(183,28,28,0.35);
  }
  .home__hero-deco {
    position: absolute;
    right: -10px; top: -10px;
    width: 160px; height: 110px;
    pointer-events: none;
  }
  .home__hero-greeting {
    font-family: var(--font-brush);
    font-size: 1.5rem;
    color: #FFF8E1;
    letter-spacing: 0.06em;
    position: relative;
  }
  .home__hero-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
    position: relative;
  }
  .home__hero-title {
    font-size: 0.78rem;
    color: rgba(255,248,225,0.7);
  }
  .home__level-title {
    font-size: 0.7rem;
    color: rgba(255,248,225,0.9);
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,248,225,0.3);
    border-radius: 999px;
    padding: 2px 9px;
    font-family: var(--font-ui);
    font-weight: 600;
  }
  .home__share-card-btn {
    margin-top: 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-ui);
    font-size: 0.78rem;
    color: #FFF8E1;
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,248,225,0.3);
    border-radius: 999px;
    padding: 7px 16px;
    position: relative;
    transition: background 0.15s;
  }
  .home__share-card-btn:active { background: rgba(255,255,255,0.25); }
  .home__hero-streak {
    margin-top: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
  }
  .home__streak-chip {
    background: rgba(255,248,225,0.18);
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 0.72rem;
    color: #FFF8E1;
    font-weight: 700;
  }
  .home__progress-chip {
    background: rgba(255,248,225,0.12);
    border: 1px solid rgba(255,248,225,0.25);
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 0.72rem;
    color: rgba(255,248,225,0.85);
    font-variant-numeric: tabular-nums;
  }
  .home__manage-btn {
    margin-left: auto;
    font-size: 0.78rem;
    color: #FFF8E1;
    background: rgba(255,255,255,0.18);
    border-radius: 999px;
    padding: 5px 12px;
    flex-shrink: 0;
  }
  .home__manage-btn:active { background: rgba(255,255,255,0.28); }

  /* ── 久违横幅 ── */
  .home__welcome-back {
    background: linear-gradient(90deg, #FFB300, #FF6F00);
    color: #fff;
    font-size: var(--text-sm);
    font-weight: 600;
    text-align: center;
    padding: 8px 16px;
    animation: slideDown 0.3s ease;
  }
  @keyframes slideDown {
    from { transform: translateY(-100%); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  /* ── scroll area ── */
  .home__scroll {
    flex: 1;
    padding: 14px 14px calc(80px + env(safe-area-inset-bottom, 0px));
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .home__section-title {
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--ink-light);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding-left: 8px;
    border-left: 3px solid #C62828;
  }

  /* ── task section ── */
  .task-section {
    background: #fff;
    border-radius: 16px;
    border: none;
    box-shadow: 0 2px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04);
    overflow: hidden;
  }
  .task-header {
    padding: 12px 14px 10px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .task-header-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--ink);
    flex: 1;
  }
  .task-row {
    padding: 14px 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid var(--border);
    transition: background 0.3s;
  }
  .task-row:last-child { border-bottom: none; }
  .task-row--shake {
    animation: task-row-shake 0.5s ease;
    background: rgba(198,40,40,0.06);
  }
  @keyframes task-row-shake {
    0%   { transform: translateX(0); background: rgba(198,40,40,0); }
    15%  { transform: translateX(-6px); background: rgba(198,40,40,0.08); }
    35%  { transform: translateX(6px); }
    55%  { transform: translateX(-4px); }
    75%  { transform: translateX(4px); }
    90%  { transform: translateX(-2px); }
    100% { transform: translateX(0); background: rgba(198,40,40,0); }
  }
  .review-tip-bubble {
    position: absolute;
    bottom: calc(100% + 8px);
    right: 0;
    background: #fff;
    color: #C62828;
    border: 1.5px solid #C62828;
    font-size: 0.7rem; font-weight: 600;
    padding: 5px 10px;
    border-radius: 8px;
    white-space: nowrap;
    pointer-events: none;
    animation: bubble-in 0.2s ease;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  .review-tip-bubble::after {
    content: '';
    position: absolute;
    top: 100%; right: 12px;
    border: 5px solid transparent;
    border-top-color: #C62828;
  }
  @keyframes bubble-in {
    from { opacity: 0; transform: translateY(4px) scale(0.9); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .task-row-icon {
    width: 34px; height: 34px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }
  .task-row-icon--review { background: rgba(245,158,11,0.12); }
  .task-row-icon--new { background: rgba(198,40,40,0.08); }
  .task-row-info { flex: 1; min-width: 0; }
  .task-row-label { font-size: 1rem; font-weight: 700; color: var(--ink); }
  .task-row-label--dim { color: var(--ink-light); }
  .task-row-sub { font-size: 0.75rem; color: var(--ink-light); margin-top: 4px; }
  .task-row-btn {
    flex-shrink: 0;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 7px 14px;
    border-radius: 999px;
    transition: opacity 0.1s;
  }
  .task-row-btn:active { opacity: 0.82; }
  .task-row-btn--red { background: #C62828; color: #fff; box-shadow: 0 2px 8px rgba(198,40,40,0.25); }
  .task-row-btn--grey { background: var(--border); color: var(--ink-light); cursor: not-allowed; opacity: 0.7; }

  /* pill */
  .pill {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 0.7rem; font-weight: 700;
    padding: 3px 9px; border-radius: 999px;
  }
  .pill-red { background: rgba(198,40,40,0.08); color: #C62828; }
  .pill-gold { background: rgba(245,158,11,0.12); color: #F59E0B; }

  /* ── done banner ── */
  .done-banner {
    background: linear-gradient(135deg, #f0fdf4, #dcfce7);
    border: 1.5px solid rgba(16,185,129,0.25);
    border-radius: 14px;
    padding: 16px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .done-icon {
    width: 40px; height: 40px;
    border-radius: 50%;
    background: rgba(16,185,129,0.15);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }
  .done-text-main { font-size: 0.88rem; font-weight: 700; color: #047857; }
  .done-text-sub { font-size: 0.7rem; color: #6b7280; margin-top: 2px; }

  /* ── rpi dots ── */
  .rpi-dots { display: flex; gap: 3px; flex-shrink: 0; }
  .rpi-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--border);
  }
  .rpi-dot--filled { background: #C62828; }

  /* ── tabs ── */
  .home__tabs {
    display: flex; gap: 3px;
    margin: 10px 0 8px;
    background: var(--border);
    border-radius: 999px;
    padding: 2px;
    align-self: flex-start;
  }
  .home__tab {
    padding: 4px 14px;
    border-radius: 999px;
    font-size: 0.75rem; font-weight: 600;
    color: var(--ink-light);
    background: transparent;
    display: flex; align-items: center; gap: 4px;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
  }
  .home__tab--active {
    background: var(--surface);
    color: #C62828;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }
  .home__tab-badge {
    font-size: 0.6rem; font-weight: 700;
    background: #C62828; color: #fff;
    padding: 1px 5px; border-radius: 999px;
  }
  .queue-preview__empty {
    padding: 24px 0; text-align: center;
    font-size: 0.82rem; color: var(--ink-light);
  }
  .queue-preview__pill--red { background: rgba(198,40,40,0.1); color: #C62828; }
  .queue-preview__pill--grey { background: var(--border); color: var(--ink-light); }
  .queue-preview__level { font-size: 0.65rem; color: var(--ink-light); }

  /* ── 队列预览 ── */
  .queue-preview {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .queue-preview__item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: #fff;
    border-radius: 14px;
    padding: 14px;
    border: none;
    border-left: 4px solid #C62828;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s;
    position: relative;
    overflow: hidden;
  }
  .queue-preview__item:active { transform: scale(0.98); box-shadow: 0 1px 6px rgba(0,0,0,0.05); }
  .queue-preview__bg {
    position: absolute;
    bottom: 0; right: 0;
    width: 45%; height: 100%;
    object-fit: cover;
    object-position: center;
    opacity: 0.5;
    pointer-events: none;
    mask-image: linear-gradient(to left, rgba(0,0,0,0.8), transparent);
    -webkit-mask-image: linear-gradient(to left, rgba(0,0,0,0.8), transparent);
  }
  .queue-preview__header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
    min-width: 0;
  }
  .queue-preview__index {
    width: 20px; height: 20px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.65rem; font-weight: 700;
    flex-shrink: 0;
    background: var(--border); color: var(--ink-light);
  }
  .queue-preview__index--active {
    background: #C62828; color: #fff;
  }
    font-family: var(--font-brush);
    font-size: 1.05rem; color: var(--ink); line-height: 1.3;
    margin-bottom: 2px;
  }
  .queue-preview__meta {
    font-size: 0.72rem; color: var(--ink-light); line-height: 1.5;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .queue-preview__meta-sep { }
  .queue-preview__meta-line { }
  .queue-preview__pill {
    font-size: 0.65rem; font-weight: 600;
    padding: 2px 7px; border-radius: 999px;
  }
  .queue-preview__pill--green { background: rgba(16,185,129,0.15); color: #10B981; }
  .queue-preview__firstline {
    font-size: 0.78rem; color: var(--ink-light);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin-top: 2px;
  }
  .queue-preview__start-btn {
    display: inline-block; padding: 6px 14px;
    background: transparent; color: #C62828;
    border: 1.5px solid #C62828;
    border-radius: 999px; font-size: 0.75rem; font-weight: 700;
    transition: background 0.1s;
  }
  .queue-preview__start-btn:active { background: rgba(198,40,40,0.08); }
  .queue-preview__dots {
    display: flex; align-items: center; gap: 5px; margin-top: 6px;
  }
  .queue-preview__dot-circle {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--border);
  }
  .queue-preview__dot-circle--filled { background: #C62828; }
  .queue-preview__track {
    display: flex; align-items: center; gap: 0; margin-top: 8px;
  }
  .queue-preview__track-node {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    flex: 1; position: relative;
  }
  .queue-preview__track-node::after {
    content: ''; position: absolute;
    top: 5px; left: 50%; width: 100%; height: 2px;
    background: var(--border);
  }
  .queue-preview__track-node:last-child::after { display: none; }
  .queue-preview__track-node--done::after { background: #C62828; }
  .queue-preview__track-dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: var(--border); position: relative; z-index: 1;
  }
  .queue-preview__track-node--done .queue-preview__track-dot { background: #C62828; }
  .queue-preview__track-node--current .queue-preview__track-dot {
    background: #C62828; box-shadow: 0 0 0 3px rgba(198,40,40,0.2);
  }
  .queue-preview__track-label {
    font-size: 0.6rem; color: var(--ink-light); white-space: nowrap;
  }
  .queue-preview__track-node--done .queue-preview__track-label,
  .queue-preview__track-node--current .queue-preview__track-label { color: #C62828; font-weight: 600; }
  .queue-preview__more {
    display: flex; align-items: center; justify-content: center; gap: 4px;
    padding: 10px; font-size: var(--text-sm); color: var(--ink-light); cursor: pointer;
  }
  .queue-preview__more:active { color: var(--ink); }

  /* ── 空状态 ── */
  .queue-empty-state {
    display: flex; flex-direction: column;
    align-items: center; gap: 16px;
    padding: 24px 16px;
  }
  .queue-empty-mascot { position: relative; width: 72px; height: 72px; }
  .queue-empty-mascot img {
    width: 72px; height: 72px; border-radius: 20px;
    box-shadow: 0 4px 14px rgba(198,40,40,0.18); display: block;
  }
  .queue-empty-bubble {
    position: absolute; top: -10px; right: -60px;
    background: #fff; border: 1.5px solid #f5c6c6;
    border-radius: 12px 12px 12px 2px;
    padding: 5px 10px; font-size: 11px; color: #C62828;
    white-space: nowrap; font-weight: 600;
    box-shadow: 0 2px 8px rgba(198,40,40,0.1);
  }
  .queue-empty-text {
    font-size: 13px; color: var(--ink-light);
    text-align: center; line-height: 1.7;
  }
  .queue-empty-text strong { color: var(--ink); font-weight: 600; }
`
