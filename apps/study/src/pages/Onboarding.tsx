import './Onboarding.css'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueue } from '../hooks/useQueue'

const ONBOARDING_DONE_KEY = 'poem_onboarding_done'

const STARTER_POEMS = [
  { id: 4,  title: '咏鹅', author: '骆宾王', dynasty: '唐', firstLine: '鹅，鹅，鹅，曲项向天歌。', img: '004 咏鹅.webp' },
  { id: 10, title: '春晓', author: '孟浩然', dynasty: '唐', firstLine: '春眠不觉晓，处处闻啼鸟。', img: '010 孟浩然：春晓.webp' },
  { id: 19, title: '静夜思', author: '李白',  dynasty: '唐', firstLine: '床前明月光，疑是地上霜。', img: '017 李白：静夜思.webp' },
]

export function markOnboardingDone() {
  try { localStorage.setItem(ONBOARDING_DONE_KEY, '1') } catch { /* ignore */ }
}

function AnimChars({ text, baseDelay }: { text: string; baseDelay: number }) {
  return (
    <>
      {text.split('').map((ch, i) => (
        <span key={i} className="ob__qchar" style={{ animationDelay: `${baseDelay + i * 0.07}s` }}>
          {ch}
        </span>
      ))}
    </>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { addToQueue } = useQueue()
  const step = searchParams.get('step') === '1' ? 1 : 0

  function skip() {
    markOnboardingDone()
    navigate('/', { replace: true })
  }

  function goStep1() {
    navigate('/onboarding?step=1')
  }

  function startFirstPoemById(id: number) {
    STARTER_POEMS.forEach(p => addToQueue(p.id))
    navigate(`/poem/${id}?onboarding=1`)
  }

  return (
    <div className="ob">
      <button className="ob__skip" onClick={skip}>跳过</button>

      {/* 背景水印大字 */}
      <div className="ob__bg-char" aria-hidden>诗</div>

      {/* 浮动装饰圆 */}
      <div className="ob__deco ob__deco--1" />
      <div className="ob__deco ob__deco--2" />
      <div className="ob__deco ob__deco--3" />

      {step === 0 ? (
        <div className="ob__welcome" key="step0">
          {/* Logo 角色跑入 */}
          <div className="ob__icon-runner">
            <div className="ob__icon-wrap">
              <img src="/icon.png" alt="" className="ob__icon" />
            </div>
          </div>

          {/* 诗句主视觉 */}
          <div className="ob__quote">
            <div className="ob__quote-line">
              <AnimChars text="举头望明月" baseDelay={0.55} />
            </div>
            <div className="ob__quote-line">
              <AnimChars text="低头思故乡" baseDelay={0.95} />
            </div>
            <p className="ob__quote-attr">—— 李白《静夜思》</p>
          </div>

          {/* 副标题 */}
          <p className="ob__tagline">每天几分钟，轻松背会百首古诗</p>

          {/* 数据徽章 */}
          <div className="ob__badges">
            <span className="ob__badge">70首名篇</span>
            <span className="ob__badge">科学复习</span>
            <span className="ob__badge">随时随地</span>
          </div>

          <button className="ob__cta" onClick={goStep1}>开始背诗 →</button>
        </div>
      ) : (
        <div className="ob__step2" key="step1">
          <p className="ob__step2-label">这3首是入门关卡，选一首开始！</p>
          <div className="ob__cards">
            {STARTER_POEMS.map((p, i) => (
              <button
                key={p.id}
                className="ob__card"
                style={{ animationDelay: `${i * 0.09}s` }}
                onClick={() => startFirstPoemById(p.id)}
              >
                <div className="ob__card-left">
                  <div className="ob__card-head">
                    <span className="ob__card-title">《{p.title}》</span>
                    <span className="ob__card-badge">入门</span>
                  </div>
                  <div className="ob__card-author">{p.dynasty}·{p.author}</div>
                  <div className="ob__card-line">{p.firstLine}</div>
                  <div className="ob__card-meta">约3-5分钟</div>
                </div>
                <div
                  className="ob__card-thumb"
                  style={{ backgroundImage: `url(/images/${encodeURIComponent(p.img)})` }}
                />
              </button>
            ))}
          </div>
          <button className="ob__to-home" onClick={skip}>跳过，直接进首页</button>
        </div>
      )}

    </div>
  )
}
