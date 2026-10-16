import './ProfileSheet.css'
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

    </BottomSheet>
  )
})

ProfileSheet.displayName = 'ProfileSheet'
export default ProfileSheet
