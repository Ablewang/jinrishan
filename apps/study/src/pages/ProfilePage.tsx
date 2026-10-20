import './ProfilePage.css'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { goBack } from '../utils/navigation'
import { useProgress } from '../hooks/useProgress'
import { getLevelTitle } from '../utils/levelTitle'
import { storage } from '../lib/storage'

const NICKNAME_KEY = 'poem_nickname'
const REMINDER_KEY = 'reminder_time'

async function loadNickname(): Promise<string> {
  try { return await storage.get(NICKNAME_KEY) ?? '小诗人' } catch { return '小诗人' }
}
async function saveNickname(n: string) {
  try { await storage.set(NICKNAME_KEY, n) } catch {}
}
async function loadReminder(): Promise<string> {
  try { return await storage.get(REMINDER_KEY) ?? '18:30' } catch { return '18:30' }
}
async function saveReminder(t: string) {
  try { await storage.set(REMINDER_KEY, t) } catch {}
}

const REMINDER_OPTIONS = [
  { label: '放学后', time: '16:00' },
  { label: '晚饭后', time: '18:30' },
  { label: '睡前',   time: '20:00' },
  { label: '自定义', time: null },
]

export default function ProfilePage() {
  const navigate = useNavigate()
  const { totalMemorized, totalChars, streakCount } = useProgress()
  const [selected, setSelected] = useState<string>('18:30')
  const [nickname, setNickname] = useState<string>('小诗人')
  const [nicknameEdit, setNicknameEdit] = useState(false)
  const [nicknameInput, setNicknameInput] = useState(nickname)
  const title = getLevelTitle(totalMemorized)

  useEffect(() => {
    loadNickname().then(setNickname)
    loadReminder().then(setSelected)
  }, [])

  function selectTime(time: string | null) {
    if (time === null) return
    setSelected(time)
    saveReminder(time)
  }

  function confirmNickname() {
    const trimmed = nicknameInput.trim().slice(0, 6)
    const val = trimmed || '小诗人'
    setNickname(val)
    setNicknameInput(val)
    saveNickname(val)
    setNicknameEdit(false)
  }

  return (
    <div className="pp">
      <div className="pp__backdrop" />
      <div className="pp__sheet">
        <div className="pp__handle" />

        <h2 className="pp__title">家长设置</h2>
        <p className="pp__subtitle">为孩子定制学习计划</p>

        <div className="pp__divider" />

        {/* 昵称设置 */}
        <div className="pp__section-label">孩子昵称</div>
        <div className="pp__nickname-row">
          {nicknameEdit ? (
            <>
              <input
                className="pp__nickname-input"
                value={nicknameInput}
                maxLength={6}
                autoFocus
                onChange={e => setNicknameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmNickname()}
                placeholder="1-6个字"
              />
              <button className="pp__nickname-confirm" onClick={confirmNickname}>确认</button>
            </>
          ) : (
            <>
              <span className="pp__nickname-val">{nickname}</span>
              <span className="pp__nickname-title">{title}</span>
              <button className="pp__nickname-edit" onClick={() => { setNicknameInput(nickname); setNicknameEdit(true) }}>修改</button>
            </>
          )}
        </div>
        <p className="pp__hint" style={{ marginBottom: 20 }}>昵称用于分享卡片，1-6个字</p>

        <div className="pp__divider" />

        {/* 每日提醒时间 */}
        <div className="pp__section-label">每日提醒时间</div>
        <div className="pp__chips">
          {REMINDER_OPTIONS.map(opt => (
            <button
              key={opt.label}
              className={`pp__chip${opt.time !== null && selected === opt.time ? ' pp__chip--active' : ''}`}
              onClick={() => selectTime(opt.time)}
            >
              {opt.time ? `${opt.label} ${opt.time}` : opt.label}
            </button>
          ))}
        </div>
        <p className="pp__hint">提示：可在手机日历设置每日提醒，建议由家长操作</p>

        {/* 学习统计 */}
        <div className="pp__stats-box">
          <div className="pp__stats-title">学习统计</div>
          <div className="pp__stats-row">
            <div className="pp__stat">
              <div className="pp__stat-num">{totalMemorized}</div>
              <div className="pp__stat-label">已背诵</div>
            </div>
            <div className="pp__stat">
              <div className="pp__stat-num">{streakCount}</div>
              <div className="pp__stat-label">坚持天数</div>
            </div>
            <div className="pp__stat">
              <div className="pp__stat-num">{totalChars}</div>
              <div className="pp__stat-label">累计字数</div>
            </div>
          </div>
        </div>

        <button className="pp__close-btn" onClick={() => goBack(navigate)}>关闭</button>
      </div>

    </div>
  )
}
