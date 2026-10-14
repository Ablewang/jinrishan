import { useProgress } from '../hooks/useProgress'
import { useQueue } from '../hooks/useQueue'
import { loadPoemIndex } from '../data/poems'
import type { PoemSummary } from '../data/poems'
import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react'
import { useShareCard } from '../contexts/ShareCardContext'
import avatarBoy from '../assets/avatar-boy.svg'
import avatarGirl from '../assets/avatar-gril.svg'
import BottomSheet, { type BottomSheetActions } from './BottomSheet'

const NICKNAME_KEY = 'poem_nickname'

function readNickname() {
  try { return localStorage.getItem(NICKNAME_KEY) || '小诗人' } catch { return '小诗人' }
}
function saveNickname(v: string) {
  try { localStorage.setItem(NICKNAME_KEY, v || '小诗人') } catch {}
}

export interface ProfileSheetActions {
  open: () => void
  close: () => void
}

const TOTAL_POEMS = 70

const ProfileSheet = forwardRef<ProfileSheetActions>((_, ref) => {
  const { totalMemorized, totalChars, masteredCount, reviewingCount, memorizeHistory } = useProgress()
  const { streakCount } = useQueue()
  const [poems, setPoems] = useState<PoemSummary[]>([])
  const [gender, setGender] = useState<'boy' | 'girl'>(() => {
    try { return (localStorage.getItem('avatar_gender') as 'boy' | 'girl') || 'girl' } catch { return 'girl' }
  })
  const [nickname, setNickname] = useState(readNickname)
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { open: openShareCard } = useShareCard()
  const sheetRef = useRef<BottomSheetActions>(null)

  useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.open(),
    close: () => sheetRef.current?.close(),
  }))

  useEffect(() => { loadPoemIndex().then(setPoems) }, [])

  const startEdit = useCallback(() => {
    setEditVal(nickname)
    setEditing(true)
    setTimeout(() => { inputRef.current?.select() }, 30)
  }, [nickname])

  const commitEdit = useCallback(() => {
    const val = editVal.trim().slice(0, 6) || '小诗人'
    setNickname(val)
    saveNickname(val)
    setEditing(false)
  }, [editVal])

  const masteredPct = totalMemorized > 0 ? Math.round((masteredCount / TOTAL_POEMS) * 100) : 0

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = (() => {
    const d = new Date(today + 'T00:00:00'); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10)
  })()

  const recentPoems = [...memorizeHistory].reverse().slice(0, 5).map(r => ({
    ...r,
    poem: poems.find(p => p.id === r.id),
  }))

  return (
    <BottomSheet ref={sheetRef}>
      {/* 红色 header */}
      <div className="ps-profile-header">
        <div className="ps-profile-avatar">
          <img src={gender === 'girl' ? avatarGirl : avatarBoy} alt="头像" />
        </div>
        <div className="ps-profile-name-row">
          {editing ? (
            <input
              ref={inputRef}
              className="ps-nick-input"
              value={editVal}
              maxLength={6}
              placeholder="取个名字吧"
              onChange={e => setEditVal(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => { if (e.key === 'Enter') commitEdit() }}
              autoFocus
            />
          ) : (
            <button className="ps-profile-name" onClick={startEdit}>
              {nickname}
              <svg className="ps-edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          )}
        </div>
        <div className="ps-profile-sub">坚持学习 · 连续 {streakCount} 天</div>
        <div className="ps-gender-switch">
          <button className={`ps-gender-btn${gender === 'girl' ? ' ps-gender-btn--active' : ''}`} onClick={() => { setGender('girl'); try { localStorage.setItem('avatar_gender', 'girl') } catch {} }}>女孩</button>
          <button className={`ps-gender-btn${gender === 'boy' ? ' ps-gender-btn--active' : ''}`} onClick={() => { setGender('boy'); try { localStorage.setItem('avatar_gender', 'boy') } catch {} }}>男孩</button>
        </div>
      </div>

      <div className="ps-scroll">
        <div className="ps-section-title">学习概览</div>

        <div className="ps-overview">
          <div className="ps-ov-grid">
            <div className="ps-ov-cell">
              <div className="ps-ov-num">{totalMemorized}</div>
              <div className="ps-ov-label">已背诵</div>
            </div>
            <div className="ps-ov-cell">
              <div className="ps-ov-num ps-ov-num--green">{masteredCount}</div>
              <div className="ps-ov-label">已掌握</div>
            </div>
            <div className="ps-ov-cell ps-ov-cell--last">
              <div className="ps-ov-num">{streakCount}</div>
              <div className="ps-ov-label">坚持天数</div>
            </div>
          </div>
          <div className="ps-ov-chars">
            <span className="ps-ov-chars-label">累计背诵字数</span>
            <span className="ps-ov-chars-val">{totalChars.toLocaleString()} 字</span>
          </div>
        </div>

        <div className="ps-section-title" style={{ marginTop: 12 }}>掌握进度</div>
        <div className="ps-mastered-progress">
          <div className="ps-mp-label">
            <span className="ps-mp-title">{TOTAL_POEMS} 首古诗</span>
            <span className="ps-mp-pct">{masteredPct}% 已掌握</span>
          </div>
          <div className="ps-mp-bar">
            <div className="ps-mp-fill" style={{ width: `${masteredPct}%` }} />
          </div>
          <div className="ps-mp-segments">
            <div className="ps-mp-seg"><div className="ps-mp-seg-dot" style={{ background: '#10B981' }} />已掌握 {masteredCount}</div>
            <div className="ps-mp-seg"><div className="ps-mp-seg-dot" style={{ background: '#C62828' }} />复习中 {reviewingCount}</div>
            <div className="ps-mp-seg"><div className="ps-mp-seg-dot" style={{ background: 'var(--border)' }} />未开始 {TOTAL_POEMS - totalMemorized}</div>
          </div>
        </div>

        {recentPoems.length > 0 && (
          <>
            <div className="ps-section-title" style={{ marginTop: 12 }}>最近背诵</div>
            <div className="ps-recent-list">
              {recentPoems.map(r => {
                const dateLabel = r.date === today ? '今天' : r.date === yesterday ? '昨天' : (r.date ?? '').slice(5)
                const pillClass = r.date === today ? 'ps-pill-red' : r.date === yesterday ? 'ps-pill-gold' : 'ps-pill-grey'
                return (
                  <div key={r.id} className="ps-recent-item">
                    <span className="ps-recent-title">《{r.poem?.title ?? `诗${r.id}`}》</span>
                    <span className="ps-recent-stars">{'★'.repeat(r.stars)}{'☆'.repeat(3 - r.stars)}</span>
                    {dateLabel && <span className={`ps-pill ${pillClass}`}>{dateLabel}</span>}
                  </div>
                )
              })}
            </div>
          </>
        )}

        <button
          className="ps-share-btn"
          onClick={() => openShareCard({ type: 'checkin' })}
        >
          生成成果卡片
        </button>

        <button className="ps-close-btn" onClick={() => sheetRef.current?.close()}>关闭</button>
      </div>

      <style>{`
        .ps-profile-header {
          background: #C62828; padding: 0 16px 20px;
          text-align: center; flex-shrink: 0;
        }
        .bs-handle-area { background: #C62828; }
        .bs-handle { background: rgba(255,255,255,0.4) !important; }
        .ps-profile-avatar {
          width: 80px; height: 80px; border-radius: 50%;
          background: #fff; margin: 0 auto 10px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 12px rgba(0,0,0,0.15);
          overflow: hidden;
        }
        .ps-profile-avatar img { width: 72px; height: 72px; object-fit: contain; }
        .ps-gender-switch {
          display: flex; gap: 8px; justify-content: center; margin-top: 10px;
        }
        .ps-gender-btn {
          padding: 4px 16px; border-radius: 999px;
          font-size: 0.72rem; font-weight: 600;
          background: rgba(255,255,255,0.15); color: rgba(255,248,225,0.7);
          border: 1.5px solid rgba(255,255,255,0.2);
          transition: all 0.15s;
        }
        .ps-gender-btn--active { background: #fff; color: #C62828; border-color: #fff; }
        .ps-profile-name-row { display: flex; justify-content: center; }
        .ps-profile-name {
          font-family: var(--font-brush); font-size: 1.2rem; color: #FFF8E1;
          display: flex; align-items: center; gap: 6px;
          background: transparent;
        }
        .ps-edit-icon { width: 14px; height: 14px; opacity: 0.65; flex-shrink: 0; }
        .ps-nick-input {
          font-family: var(--font-brush); font-size: 1.2rem; color: #FFF8E1;
          background: rgba(255,255,255,0.15); border: 1.5px solid rgba(255,255,255,0.4);
          border-radius: 8px; padding: 3px 10px; text-align: center;
          outline: none; width: 140px;
        }
        .ps-nick-input::placeholder { color: rgba(255,248,225,0.45); }
        .ps-profile-sub { font-size: 0.72rem; color: rgba(255,248,225,0.7); margin-top: 3px; }
        .ps-scroll {
          flex: 1; overflow-y: auto;
          padding: 14px 16px calc(16px + env(safe-area-inset-bottom,0px));
          display: flex; flex-direction: column; gap: 0;
          background: var(--bg);
        }
        .ps-section-title {
          font-size: 0.72rem; font-weight: 700; color: var(--ink-light);
          text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px;
        }
        .ps-overview {
          background: var(--surface); border-radius: 14px;
          border: 1.5px solid var(--border); overflow: hidden;
          box-shadow: var(--shadow-card);
        }
        .ps-ov-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; }
        .ps-ov-cell {
          padding: 14px 8px; text-align: center;
          border-right: 1px solid var(--border);
        }
        .ps-ov-cell--last { border-right: none; }
        .ps-ov-num {
          font-family: var(--font-brush); font-size: 1.4rem;
          color: #C62828; line-height: 1; margin-bottom: 5px;
          font-variant-numeric: tabular-nums;
        }
        .ps-ov-num--green { color: #10B981; }
        .ps-ov-label { font-size: 0.65rem; color: var(--ink-light); }
        .ps-ov-chars {
          padding: 12px 14px; border-top: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
        }
        .ps-ov-chars-label { font-size: 0.75rem; color: var(--ink-light); }
        .ps-ov-chars-val { font-family: var(--font-brush); font-size: 1rem; color: #C62828; font-variant-numeric: tabular-nums; }
        .ps-mastered-progress {
          background: var(--surface); border-radius: 14px;
          border: 1.5px solid var(--border); padding: 14px;
          box-shadow: var(--shadow-card);
        }
        .ps-mp-label { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .ps-mp-title { font-size: 0.78rem; font-weight: 700; color: var(--ink); }
        .ps-mp-pct { font-size: 0.72rem; color: #C62828; font-weight: 700; }
        .ps-mp-bar { height: 8px; background: var(--border); border-radius: 999px; overflow: hidden; margin-bottom: 10px; }
        .ps-mp-fill { height: 100%; border-radius: 999px; background: linear-gradient(to right, #C62828, #e57373); transition: width 0.4s ease; }
        .ps-mp-segments { display: flex; gap: 10px; flex-wrap: wrap; }
        .ps-mp-seg { display: flex; align-items: center; gap: 4px; font-size: 0.65rem; color: var(--ink-light); }
        .ps-mp-seg-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .ps-recent-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .ps-recent-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; background: var(--surface);
          border-radius: 10px; border: 1px solid var(--border);
        }
        .ps-recent-title { font-family: var(--font-brush); font-size: 0.9rem; color: var(--ink); flex: 1; }
        .ps-recent-stars { color: #F59E0B; font-size: 12px; letter-spacing: 1px; flex-shrink: 0; }
        .ps-pill {
          display: inline-flex; align-items: center;
          font-size: 0.62rem; font-weight: 700;
          padding: 2px 8px; border-radius: 999px; flex-shrink: 0;
        }
        .ps-pill-red { background: rgba(198,40,40,0.08); color: #C62828; }
        .ps-pill-gold { background: rgba(245,158,11,0.12); color: #F59E0B; }
        .ps-pill-grey { background: var(--border); color: var(--ink-light); }
        .ps-share-btn {
          display: block; width: 100%; padding: 14px;
          background: transparent; color: #C62828;
          border: 2px solid #C62828; border-radius: 999px;
          font-size: var(--text-base); font-weight: 700; text-align: center;
          transition: transform 0.1s, opacity 0.1s; margin-top: 12px; margin-bottom: 10px;
        }
        .ps-share-btn:active { transform: scale(0.97); opacity: 0.8; }
        .ps-close-btn {
          display: block; width: 100%; padding: 14px;
          background: #C62828; color: #fff; border-radius: 999px;
          font-size: var(--text-base); font-weight: 700; text-align: center;
          box-shadow: 0 4px 16px rgba(198,40,40,0.3);
          transition: transform 0.1s, opacity 0.1s; margin-top: auto;
        }
        .ps-close-btn:active { transform: scale(0.97); opacity: 0.88; }
      `}</style>
    </BottomSheet>
  )
})

ProfileSheet.displayName = 'ProfileSheet'
export default ProfileSheet
