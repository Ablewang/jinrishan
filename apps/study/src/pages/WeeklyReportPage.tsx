import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildWeeklyReport, getWeekStart, markReportRead } from '../lib/weeklyReport'
import { loadPoemIndex } from '../data/poems'
import type { PoemSummary } from '../data/poems'
import { useShareCard } from '../contexts/ShareCardContext'
import './WeeklyReportPage.css'

const DOW_LABELS = ['一', '二', '三', '四', '五', '六', '日']

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const sm = s.getMonth() + 1
  const sd = s.getDate()
  const em = e.getMonth() + 1
  const ed = e.getDate()
  if (sm === em) return `${sm}月${sd}日 – ${ed}日`
  return `${sm}月${sd}日 – ${em}月${ed}日`
}

function starStr(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars)
}

export default function WeeklyReportPage() {
  const navigate = useNavigate()
  const { open: openShareCard } = useShareCard()
  const [tab, setTab] = useState<'this' | 'last'>('this')
  const [poems, setPoems] = useState<PoemSummary[]>([])

  useEffect(() => { loadPoemIndex().then(setPoems) }, [])

  const today = new Date().toISOString().slice(0, 10)
  const thisWeekStart = getWeekStart(today)
  const lastWeekStart = getWeekStart(
    new Date(new Date().getTime() - 7 * 86400000).toISOString().slice(0, 10)
  )

  const weekStart = tab === 'this' ? thisWeekStart : lastWeekStart
  const report = useMemo(() => buildWeeklyReport(weekStart), [weekStart])

  useEffect(() => {
    if (tab === 'last') markReportRead(lastWeekStart)
  }, [tab, lastWeekStart])

  useEffect(() => {
    markReportRead(thisWeekStart)
  }, [thisWeekStart])

  const hardestPoem = report.hardestPoemId ? poems.find(p => p.id === report.hardestPoemId) : null

  return (
    <div className="wr">
      <header className="wr__navbar">
        <button className="wr__back" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 1024 1024" width="18" height="18" fill="currentColor">
            <path d="M403.2 812.8L100.256 512 403.2 211.2l59.744 59.744-198.4 198.4h652.8v85.344h-652.8l198.4 198.4z"/>
          </svg>
          返回
        </button>
        <span className="wr__title">每周报告</span>
        <div style={{ width: 60 }} />
      </header>

      {/* 本周/上周 tab */}
      <div className="wr__tabs">
        <button className={`wr__tab${tab === 'this' ? ' wr__tab--active' : ''}`} onClick={() => setTab('this')}>本周</button>
        <button className={`wr__tab${tab === 'last' ? ' wr__tab--active' : ''}`} onClick={() => setTab('last')}>上周</button>
      </div>

      {!report.hasData ? (
        <div className="wr__empty">
          <div className="wr__empty-icon">📖</div>
          <div className="wr__empty-text">这周还没有学习记录</div>
          <div className="wr__empty-sub">去背一首诗吧</div>
          <button className="wr__empty-btn" onClick={() => navigate('/')}>去学习</button>
        </div>
      ) : (
        <div className="wr__body">
          {/* 日期范围 */}
          <div className="wr__range">{formatDateRange(report.weekStart, report.weekEnd)}</div>

          {/* 四格统计 */}
          <div className="wr__stats">
            {[
              { num: report.newPoemCount, label: '新背诗' },
              { num: report.checkInDays, label: '打卡天' },
              { num: report.perfectStarCount, label: '满星' },
              { num: report.streakCount, label: '连续天' },
            ].map(({ num, label }) => (
              <div key={label} className="wr__stat">
                <span className="wr__stat-num">{num}</span>
                <span className="wr__stat-label">{label}</span>
              </div>
            ))}
          </div>

          {/* 打卡日历 */}
          <div className="wr__section">
            <div className="wr__section-title">本周打卡</div>
            <div className="wr__calendar">
              {DOW_LABELS.map((label, i) => (
                <div key={i} className="wr__cal-col">
                  <div className="wr__cal-label">{label}</div>
                  <div className={`wr__cal-dot${report.checkedDows[i] ? ' wr__cal-dot--on' : ''}`} />
                </div>
              ))}
            </div>
          </div>

          {/* 本周背的诗 */}
          {report.newPoems.length > 0 && (
            <div className="wr__section">
              <div className="wr__section-title">本周背了这些诗</div>
              <div className="wr__poem-list">
                {report.newPoems.map((p, i) => {
                  const poem = poems.find(pm => pm.id === p.id)
                  return (
                    <button key={i} className="wr__poem-item" onClick={() => navigate(`/poem/${p.id}`)}>
                      <span className="wr__poem-stars" style={{ color: p.stars === 3 ? '#C62828' : '#999' }}>{starStr(p.stars)}</span>
                      <span className="wr__poem-title">《{poem?.title ?? `诗${p.id}`}》</span>
                      <span className="wr__poem-date">{p.date.slice(5).replace('-', '月')}日</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 本周最难克服 */}
          {hardestPoem && report.hardestPoemEf !== null && (
            <div className="wr__section">
              <div className="wr__section-title">本周最难克服</div>
              <button className="wr__hard-card" onClick={() => navigate(`/poem/${hardestPoem.id}`)}>
                <div className="wr__hard-title">《{hardestPoem.title}》</div>
                <div className="wr__hard-meta">
                  已练 {report.hardestPoemSessions} 次 · EF {report.hardestPoemEf.toFixed(1)} · 继续加油！
                </div>
              </button>
            </div>
          )}

          {/* 累计进度 */}
          <div className="wr__section">
            <div className="wr__section-title">累计进度</div>
            <div className="wr__progress-row">
              <div className="wr__progress-bar-track">
                <div className="wr__progress-bar-fill" style={{ width: `${Math.round(report.totalMemorized / 70 * 100)}%` }} />
              </div>
              <span className="wr__progress-label">{report.totalMemorized} / 70 首</span>
            </div>
            <div className="wr__chars">{report.totalChars.toLocaleString()} 字</div>
          </div>

          <div style={{ height: 32 }} />

          {/* 分享本周报告 */}
          <button
            className="wr__share-btn"
            onClick={() => openShareCard({
              type: 'weekly',
              weeklyNewCount: report.newPoemCount,
              weeklyCheckInDays: report.checkInDays,
              weeklyStreakCount: report.streakCount,
              weeklyHardPoemTitle: hardestPoem?.title,
              weeklyTotalChars: report.totalChars,
              weeklyTotalMemorized: report.totalMemorized,
              weeklyStart: report.weekStart,
              weeklyEnd: report.weekEnd,
              weeklyPoemTitles: report.newPoems.map(p => poems.find(pm => pm.id === p.id)?.title ?? `诗${p.id}`),
            })}
          >
            分享本周报告
          </button>

          <div style={{ height: 24 }} />
        </div>
      )}
    </div>
  )
}
