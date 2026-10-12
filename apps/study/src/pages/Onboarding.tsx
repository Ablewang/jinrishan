import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueue } from '../hooks/useQueue'

const ONBOARDING_DONE_KEY = 'poem_onboarding_done'
const ONBOARDING_STEP_KEY = 'poem_onboarding_step'

// 入门三首诗
const STARTER_POEMS = [
  { id: 4,  title: '咏鹅', author: '骆宾王', dynasty: '唐', firstLine: '鹅，鹅，鹅，曲项向天歌。' },
  { id: 10, title: '春晓', author: '孟浩然', dynasty: '唐', firstLine: '春眠不觉晓，处处闻啼鸟。' },
  { id: 19, title: '静夜思', author: '李白',  dynasty: '唐', firstLine: '床前明月光，疑是地上霜。' },
]

function loadStep(): number {
  try { return Number(localStorage.getItem(ONBOARDING_STEP_KEY) ?? '0') } catch { return 0 }
}

function saveStep(n: number) {
  try { localStorage.setItem(ONBOARDING_STEP_KEY, String(n)) } catch { /* ignore */ }
}

export function markOnboardingDone() {
  try { localStorage.setItem(ONBOARDING_DONE_KEY, '1') } catch { /* ignore */ }
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { addToQueue } = useQueue()
  const [step, setStep] = useState<number>(loadStep)
  const [selectedId, setSelectedId] = useState<number>(4)

  useEffect(() => { saveStep(step) }, [step])

  function skip() {
    markOnboardingDone()
    navigate('/', { replace: true })
  }

  function startFirstPoem() {
    // 将3首入门诗全部加入计划
    STARTER_POEMS.forEach(p => addToQueue(p.id))
    // 直接进入选中的诗
    navigate(`/poem/${selectedId}?onboarding=1`, { replace: true })
  }

  if (step === 0) {
    return (
      <div className="ob">
        <button className="ob__skip" onClick={skip}>跳过，自己挑诗 →</button>

        <div className="ob__welcome-wrap">
          <div className="ob__icon-wrap">
            <img src="/icon.png" alt="" className="ob__icon" />
          </div>
          <h1 className="ob__title">来背一首古诗吧！</h1>
          <p className="ob__sub">背诗超有趣，跟我一起来！</p>
          <button className="ob__cta" onClick={() => setStep(1)}>开始第一首</button>
        </div>

        <style>{style}</style>
      </div>
    )
  }

  // step 1：选诗
  const selected = STARTER_POEMS.find(p => p.id === selectedId)!
  return (
    <div className="ob">
      <button className="ob__skip" onClick={skip}>跳过</button>

      <div className="ob__step2-wrap">
        <p className="ob__step2-label">这3首是入门关卡，选一首开始！</p>

        <div className="ob__cards">
          {STARTER_POEMS.map(p => (
            <button
              key={p.id}
              className={`ob__card${selectedId === p.id ? ' ob__card--active' : ''}`}
              onClick={() => setSelectedId(p.id)}
            >
              <div className="ob__card-head">
                <span className="ob__card-title">《{p.title}》</span>
                <span className="ob__card-badge">入门</span>
              </div>
              <div className="ob__card-author">{p.dynasty}·{p.author}</div>
              <div className="ob__card-line">{p.firstLine}</div>
              <div className="ob__card-meta">约3-5分钟</div>
            </button>
          ))}
        </div>

        <button className="ob__cta" onClick={startFirstPoem}>
          从《{selected.title}》开始 →
        </button>
      </div>

      <style>{style}</style>
    </div>
  )
}

const style = `
  .ob {
    position: fixed; inset: 0;
    background: #C62828;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 0 24px env(safe-area-inset-bottom, 0px);
    overflow-y: auto;
  }
  .ob__skip {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 16px);
    right: 20px;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: rgba(255,248,225,0.8);
    background: transparent;
    padding: 6px 0;
    z-index: 10;
  }
  .ob__skip:active { opacity: 0.6; }

  /* Step 1 */
  .ob__welcome-wrap {
    display: flex; flex-direction: column;
    align-items: center; gap: 16px;
    padding: 60px 0 40px;
  }
  .ob__icon-wrap {
    width: 88px; height: 88px;
    background: rgba(255,255,255,0.15);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 8px;
  }
  .ob__icon { width: 60px; height: 60px; }
  .ob__title {
    font-family: var(--font-brush);
    font-size: 2rem; color: #FFF8E1;
    text-align: center; line-height: 1.3;
  }
  .ob__sub {
    font-family: var(--font-ui);
    font-size: var(--text-base);
    color: rgba(255,248,225,0.85);
    text-align: center;
  }
  .ob__cta {
    margin-top: 8px;
    width: 100%; max-width: 320px;
    padding: 18px 24px;
    background: #FFF8E1; color: #C62828;
    border-radius: 999px;
    font-family: var(--font-brush); font-size: 1.2rem;
    font-weight: 700;
    box-shadow: 0 6px 24px rgba(0,0,0,0.18);
    transition: transform 0.1s, opacity 0.1s;
  }
  .ob__cta:active { transform: scale(0.97); opacity: 0.9; }

  /* Step 2 */
  .ob__step2-wrap {
    width: 100%; max-width: 400px;
    display: flex; flex-direction: column; gap: 14px;
    padding: 60px 0 20px;
  }
  .ob__step2-label {
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: rgba(255,248,225,0.85);
    text-align: center;
  }
  .ob__cards {
    display: flex; flex-direction: column; gap: 10px;
  }
  .ob__card {
    background: rgba(255,255,255,0.12);
    border: 2px solid transparent;
    border-radius: 16px; padding: 16px;
    text-align: left;
    transition: all 0.15s;
  }
  .ob__card--active {
    background: rgba(255,255,255,0.22);
    border-color: #FFF8E1;
  }
  .ob__card:active { opacity: 0.8; }
  .ob__card-head {
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 4px;
  }
  .ob__card-title {
    font-family: var(--font-brush); font-size: 1.1rem; color: #FFF8E1;
  }
  .ob__card-badge {
    font-family: var(--font-ui); font-size: 0.65rem;
    background: rgba(255,248,225,0.2); color: #FFF8E1;
    border: 1px solid rgba(255,248,225,0.4);
    border-radius: 999px; padding: 2px 8px;
  }
  .ob__card-author {
    font-family: var(--font-ui); font-size: var(--text-xs);
    color: rgba(255,248,225,0.7); margin-bottom: 6px;
  }
  .ob__card-line {
    font-family: var(--font-brush); font-size: 0.9rem;
    color: rgba(255,248,225,0.9); margin-bottom: 6px;
  }
  .ob__card-meta {
    font-family: var(--font-ui); font-size: 0.65rem;
    color: rgba(255,248,225,0.55);
  }
`
