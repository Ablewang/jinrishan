import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadPoemIndex } from '../data/poems'
import type { PoemSummary } from '../data/poems'
import { useProgress } from '../hooks/useProgress'
import { useQueue } from '../hooks/useQueue'
import { useRecitation } from '../hooks/useRecitation'
import { IconReview, IconSparkle, IconFireworks } from '../components/icons'
import { getLevelTitle } from '../utils/levelTitle'
import imgMap from '../data/poem_img_map.json'
import './Home.css'

export default function Home() {
  const navigate = useNavigate()
  const { todayDueReviews, reviewCards, totalMemorized } = useProgress()
  const { queue, todayComplete, isReturning } = useQueue()
  const { srsStreak } = useRecitation()
  const streakCount = srsStreak.count
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
        <div className="home__hero-greeting">古诗小课堂 <span style={{color:'#FFD700'}}>✦</span></div>
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

    </div>
  )
}
