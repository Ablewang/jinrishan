import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadPoemIndex } from '../data/poems'
import type { PoemSummary } from '../data/poems'
import { useProgress } from '../hooks/useProgress'
import { useQueue } from '../hooks/useQueue'

export default function Home() {
  const navigate = useNavigate()
  const { getState, streak } = useProgress()
  const { queue, streakCount, todayComplete, isReturning } = useQueue()
  const [poems, setPoems] = useState<PoemSummary[]>([])
  const [bannerVisible, setBannerVisible] = useState(false)
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { loadPoemIndex().then(setPoems) }, [])

  // 久违横幅
  useEffect(() => {
    if (isReturning && !todayComplete) {
      setBannerVisible(true)
      bannerTimer.current = setTimeout(() => setBannerVisible(false), 4000)
    }
    return () => { if (bannerTimer.current) clearTimeout(bannerTimer.current) }
  }, [isReturning, todayComplete])

  const currentPoemId = queue[0] ?? null
  const currentPoem = poems.find(p => p.id === currentPoemId) ?? null

  // 模式判断
  type Mode = 'pending' | 'done' | 'empty' | 'returning'
  const mode: Mode = (() => {
    if (queue.length === 0) return 'empty'
    if (todayComplete) return 'done'
    if (isReturning) return 'returning'
    return 'pending'
  })()

  function startMem(poemId: number) {
    navigate(`/poem/${poemId}?autoMem=1`)
  }

  return (
    <div className="home">
      {/* 顶部导航 */}
      <header className="home__navbar">
        <span className="home__logo">古诗小课堂</span>
        <span className="home__subtitle">小学必背70首</span>
        <button className="home__manage-btn" onClick={() => navigate('/queue')}>管理队列</button>
      </header>

      {/* 久违横幅 */}
      {bannerVisible && (
        <div className="home__welcome-back">✨ 好久不见，继续出发吧！</div>
      )}

      {/* 进度条 */}
      <div className="home__progress" onClick={() => navigate('/progress')} role="button" style={{ cursor: 'pointer' }}>
        <div className="home__progress-row">
          <span className="home__progress-label">累计坚持</span>
          <span className="home__progress-nums">
            <strong>{streakCount || streak.count}</strong>
            <span className="home__progress-total"> 天</span>
          </span>
        </div>
        <div className="home__progress-bar" role="progressbar">
          <div className="home__progress-fill" style={{ width: `${Math.min(100, (streakCount || streak.count) * 5)}%` }} />
        </div>
      </div>

      {/* 今日任务卡片 */}
      <div className={`task-card${mode === 'done' ? ' task-card--done' : mode === 'empty' ? ' task-card--empty' : ''}`}>
        {mode === 'pending' || mode === 'returning' ? (
          <>
            <div className="task-card__tag">今日待背</div>
            <div className="task-card__poem-row">
              <div className="task-card__poem-info">
                <div className="task-card__poem-title">《{currentPoem?.title ?? '...'}》</div>
                <div className="task-card__poem-meta">{currentPoem?.dynasty ? `${currentPoem.dynasty} · ` : ''}{currentPoem?.author ?? ''}</div>
              </div>
            </div>
            {queue.length > 1 && (
              <div className="task-card__queue-hint">📋 队列还有 {queue.length} 首</div>
            )}
            <button className="task-card__start-btn" onClick={() => currentPoemId && startMem(currentPoemId)}>
              开始背诵 →
            </button>
            <div className="task-card__footer">
              <span className="task-card__streak">已坚持 {streakCount || streak.count} 天</span>
              <span className="task-card__footer-hint">今天还没背哦</span>
            </div>
          </>
        ) : mode === 'done' ? (
          <>
            <div className="task-card__tag task-card__tag--done">✓ 今天已背诵</div>
            <div className="task-card__done-chip">
              <span className="task-card__done-icon">✓</span>
              <div>
                <div className="task-card__done-title">《{currentPoem?.title ?? '已完成'}》背完了</div>
                <div className="task-card__done-sub">还可以继续背下一首</div>
              </div>
            </div>
            <div className="task-card__btn-row">
              <button className="task-card__btn-secondary" onClick={() => currentPoemId && startMem(currentPoemId)}>
                继续背下一首
              </button>
              <button className="task-card__btn-outline" onClick={() => navigate('/poems')}>
                去看诗词列表
              </button>
            </div>
            <div className="task-card__footer">
              <span className="task-card__streak">已坚持 {streakCount || streak.count} 天 <span className="task-card__plus-one">+1</span></span>
              <span className="task-card__footer-done">今天已打卡 ✓</span>
            </div>
          </>
        ) : (
          <>
            <div className="task-card__tag task-card__tag--empty">待背队列</div>
            <div className="task-card__empty-prompt">
              队列里还没有诗<br />
              <span>去挑几首，明天就能开始了</span>
            </div>
            <button className="task-card__start-btn" onClick={() => navigate('/queue')}>
              去挑诗 →
            </button>
            <div className="task-card__footer">
              <span className="task-card__streak">已坚持 {streakCount || streak.count} 天</span>
              <span className="task-card__footer-hint">添加诗后开始学习</span>
            </div>
          </>
        )}
      </div>

      {/* 队列预览列表 / 空状态 */}
      {mode === 'empty' ? (
        <div className="queue-empty-state">
          <div className="queue-empty-mascot">
            <img src="/icon.png" alt="" />
            <div className="queue-empty-bubble">快来挑诗！</div>
          </div>
          <div className="queue-empty-text">
            <strong>队列空空如也～</strong><br />
            去诗集里挑几首，放进队列<br />每天背一首，积少成多
          </div>
        </div>
      ) : (
        <div className="queue-preview">
          {queue.slice(0, 5).map((id, idx) => {
            const p = poems.find(pm => pm.id === id)
            if (!p) return null
            const state = getState(id)
            return (
              <div
                key={id}
                className={`queue-preview__item${idx === 0 ? ' queue-preview__item--today' : ''}`}
                onClick={() => navigate(`/poem/${id}`)}
                role="button"
              >
                <div className="queue-preview__index">{idx === 0 ? '今' : idx + 1}</div>
                <div className="queue-preview__info">
                  <div className="queue-preview__title">《{p.title}》</div>
                  <div className="queue-preview__meta">{p.dynasty ? `${p.dynasty}·` : ''}{p.author}</div>
                </div>
                {idx === 0 ? (
                  <button className="queue-preview__start-btn" onClick={e => { e.stopPropagation(); startMem(id) }}>
                    开始
                  </button>
                ) : (
                  <div className="queue-preview__first-line">{p.firstLine.slice(0, 8)}…</div>
                )}
                {state.memorized && <span className="queue-preview__done-badge">✓</span>}
              </div>
            )
          })}
          {queue.length > 5 && (
            <div className="queue-preview__more" onClick={() => navigate('/queue')}>
              还有 {queue.length - 5} 首 · 查看全部 →
            </div>
          )}
        </div>
      )}

      <style>{styles}</style>
    </div>
  )
}

const styles = `
  .home {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
    background: var(--bg);
  }

  /* ── 顶部导航 ── */
  .home__navbar {
    position: sticky;
    top: env(safe-area-inset-top, 0px);
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 18px;
    height: var(--navbar-height);
    background: #C62828;
  }
  .home__logo {
    font-family: var(--font-brush);
    font-size: 1.5rem;
    color: #FFF8E1;
    letter-spacing: 0.06em;
  }
  .home__subtitle {
    font-family: var(--font-ui);
    font-size: 0.78rem;
    color: rgba(255,248,225,0.7);
    letter-spacing: 0.04em;
  }
  .home__manage-btn {
    margin-left: auto;
    font-family: var(--font-ui);
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

  /* ── 进度条 ── */
  .home__progress {
    margin: 14px 16px 0;
    background: var(--surface);
    border-radius: 14px;
    padding: 14px 16px;
    box-shadow: var(--shadow-card);
    border: 1.5px solid var(--border);
  }
  .home__progress-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 10px;
  }
  .home__progress-label { font-size: var(--text-sm); color: var(--ink-light); }
  .home__progress-nums { font-size: var(--text-sm); color: var(--ink); }
  .home__progress-nums strong { font-size: 1.1rem; color: #C62828; font-weight: 700; }
  .home__progress-total { color: var(--ink-light); }
  .home__progress-bar {
    height: 8px;
    background: #F5EDE8;
    border-radius: 999px;
    overflow: hidden;
  }
  .home__progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #E53935, #F59E0B);
    border-radius: 999px;
    transition: width 0.4s ease;
    min-width: 4px;
  }

  /* ── 任务卡片 ── */
  .task-card {
    margin: 12px 16px 0;
    background: var(--surface);
    border-radius: 16px;
    padding: 16px;
    box-shadow: var(--shadow-card);
    border: 1.5px solid var(--border);
  }
  .task-card--done {
    border-color: #10B981;
    background: #f0fdf4;
  }
  .task-card--empty {
    border: 1.5px dashed #e0d0c0;
    background: #fffdf8;
  }
  .task-card__tag {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    color: #C62828;
    background: rgba(198,40,40,0.08);
    border-radius: 999px;
    padding: 2px 10px;
    margin-bottom: 10px;
    letter-spacing: 0.04em;
  }
  .task-card__tag--done {
    color: #10B981;
    background: rgba(16,185,129,0.1);
  }
  .task-card__tag--empty {
    color: #b09070;
    background: rgba(176,144,112,0.1);
  }
  .task-card__poem-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 6px;
  }
  .task-card__poem-title {
    font-family: var(--font-brush);
    font-size: 1.5rem;
    color: #C62828;
    line-height: 1.2;
  }
  .task-card__poem-meta {
    font-size: 12px;
    color: var(--ink-light);
    margin-top: 2px;
  }
  .task-card__queue-hint {
    font-size: 12px;
    color: var(--ink-light);
    margin-bottom: 12px;
  }
  .task-card__start-btn {
    display: block;
    width: 100%;
    padding: 12px;
    background: #C62828;
    color: #fff;
    border-radius: 12px;
    font-size: var(--text-base);
    font-weight: 700;
    text-align: center;
    margin: 12px 0 0;
    box-shadow: 0 4px 14px rgba(198,40,40,0.28);
    transition: transform 0.1s, opacity 0.1s;
  }
  .task-card__start-btn:active { transform: scale(0.97); opacity: 0.88; }
  .task-card__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }
  .task-card__streak { font-size: 12px; color: var(--ink-light); }
  .task-card__plus-one {
    display: inline-block;
    color: #10B981;
    font-weight: 700;
    font-size: 11px;
    margin-left: 4px;
    animation: popUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes popUp {
    from { transform: translateY(4px) scale(0.6); opacity: 0; }
    to   { transform: translateY(0) scale(1); opacity: 1; }
  }
  .task-card__footer-hint { font-size: 11px; color: var(--ink-light); }
  .task-card__footer-done { font-size: 11px; color: #10B981; font-weight: 600; }

  /* done 状态 */
  .task-card__done-chip {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }
  .task-card__done-icon {
    width: 36px; height: 36px;
    border-radius: 50%;
    background: #10B981;
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }
  .task-card__done-title { font-size: 14px; color: var(--ink); font-weight: 600; }
  .task-card__done-sub { font-size: 11px; color: var(--ink-light); margin-top: 2px; }
  .task-card__btn-row {
    display: flex;
    gap: 8px;
  }
  .task-card__btn-secondary {
    flex: 1;
    padding: 11px 8px;
    background: #10B981;
    color: #fff;
    border-radius: 12px;
    font-size: var(--text-sm);
    font-weight: 700;
    text-align: center;
  }
  .task-card__btn-secondary:active { opacity: 0.85; }
  .task-card__btn-outline {
    flex: 1;
    padding: 11px 8px;
    border: 1.5px solid var(--border);
    color: var(--ink-light);
    border-radius: 12px;
    font-size: var(--text-sm);
    text-align: center;
  }
  .task-card__btn-outline:active { background: var(--border); }

  /* empty 状态 */
  .task-card__empty-prompt {
    font-size: 15px;
    color: var(--ink);
    text-align: center;
    padding: 8px 0 4px;
    line-height: 1.6;
  }
  .task-card__empty-prompt span { font-size: 12px; color: var(--ink-light); }

  /* ── 队列预览 ── */
  .queue-preview {
    margin: 12px 16px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .queue-preview__item {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--surface);
    border-radius: 12px;
    padding: 12px 12px;
    box-shadow: var(--shadow-card);
    border: 1.5px solid var(--border);
    cursor: pointer;
    transition: transform 0.1s;
  }
  .queue-preview__item:active { transform: scale(0.98); }
  .queue-preview__item--today {
    border-color: rgba(198,40,40,0.3);
    background: #fff8f8;
  }
  .queue-preview__index {
    width: 28px; height: 28px;
    border-radius: 50%;
    background: #f0e8e0;
    color: var(--ink-light);
    font-size: 12px;
    font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .queue-preview__item--today .queue-preview__index {
    background: #C62828;
    color: #fff;
    font-size: 11px;
  }
  .queue-preview__info { flex: 1; min-width: 0; }
  .queue-preview__title {
    font-family: var(--font-brush);
    font-size: 1rem;
    color: var(--ink);
    line-height: 1.2;
  }
  .queue-preview__meta {
    font-size: 11px;
    color: var(--ink-light);
    margin-top: 1px;
  }
  .queue-preview__first-line {
    font-size: 11px;
    color: var(--ink-light);
    flex-shrink: 0;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .queue-preview__start-btn {
    flex-shrink: 0;
    padding: 6px 14px;
    background: #C62828;
    color: #fff;
    border-radius: 999px;
    font-size: var(--text-sm);
    font-weight: 700;
  }
  .queue-preview__start-btn:active { opacity: 0.85; }
  .queue-preview__done-badge {
    flex-shrink: 0;
    font-size: 12px;
    color: #10B981;
    font-weight: 700;
  }
  .queue-preview__more {
    text-align: center;
    padding: 10px;
    font-size: var(--text-sm);
    color: var(--ink-light);
    cursor: pointer;
  }
  .queue-preview__more:active { color: var(--ink); }

  /* ── 空状态 ── */
  .queue-empty-state {
    margin: 24px 16px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 24px 16px;
  }
  .queue-empty-mascot {
    position: relative;
    width: 72px; height: 72px;
  }
  .queue-empty-mascot img {
    width: 72px; height: 72px;
    border-radius: 20px;
    box-shadow: 0 4px 14px rgba(198,40,40,0.18);
    display: block;
  }
  .queue-empty-bubble {
    position: absolute;
    top: -10px; right: -60px;
    background: #fff;
    border: 1.5px solid #f5c6c6;
    border-radius: 12px 12px 12px 2px;
    padding: 5px 10px;
    font-size: 11px;
    color: #C62828;
    white-space: nowrap;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(198,40,40,0.1);
  }
  .queue-empty-bubble::before {
    content: '';
    position: absolute;
    left: -7px; bottom: 6px;
    border: 5px solid transparent;
    border-right-color: #f5c6c6;
  }
  .queue-empty-bubble::after {
    content: '';
    position: absolute;
    left: -5px; bottom: 7px;
    border: 4px solid transparent;
    border-right-color: #fff;
  }
  .queue-empty-text {
    font-size: 13px;
    color: var(--ink-light);
    text-align: center;
    line-height: 1.7;
  }
  .queue-empty-text strong { color: var(--ink); font-weight: 600; }
`
