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

      <style>{style}</style>
    </div>
  )
}

const style = `
  .ob {
    min-height: 100dvh;
    background: linear-gradient(150deg, #D32F2F 0%, #8B0000 100%);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: env(safe-area-inset-top, 0px) 24px calc(env(safe-area-inset-bottom, 0px) + 24px);
    overflow: hidden;
  }

  /* 跳过 */
  .ob__skip {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 16px); right: 20px;
    font-family: var(--font-ui); font-size: var(--text-sm);
    color: rgba(255,248,225,0.6);
    background: transparent; padding: 6px 0; z-index: 10;
    animation: obFadeIn 0.5s ease both 2.2s;
  }
  .ob__skip:active { opacity: 0.4; }

  /* 水印大字 */
  .ob__bg-char {
    position: absolute;
    font-family: var(--font-brush); font-size: 72vw;
    color: rgba(255,255,255,0.04);
    right: -18vw; top: -8vw;
    line-height: 1; pointer-events: none; user-select: none;
    animation: obBgSpin 60s linear infinite;
  }
  @keyframes obBgSpin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  /* 浮动圆 */
  .ob__deco {
    position: absolute; border-radius: 50%; pointer-events: none;
  }
  .ob__deco--1 {
    width: 320px; height: 320px;
    background: radial-gradient(circle, rgba(255,255,255,0.09) 0%, transparent 70%);
    top: -110px; left: -110px;
    animation: obFloat 11s ease-in-out infinite;
  }
  .ob__deco--2 {
    width: 210px; height: 210px;
    background: radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%);
    bottom: 6%; right: -65px;
    animation: obFloat 14s ease-in-out infinite reverse; animation-delay: -5s;
  }
  .ob__deco--3 {
    width: 110px; height: 110px;
    background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
    top: 28%; left: 6%;
    animation: obFloat 8s ease-in-out infinite; animation-delay: -3s;
  }
  @keyframes obFloat {
    0%, 100% { transform: translateY(0) scale(1); }
    50%       { transform: translateY(-20px) scale(1.05); }
  }

  /* ── Step 0 欢迎页 ── */
  .ob__welcome {
    display: flex; flex-direction: column;
    align-items: center; gap: 0;
    position: relative; z-index: 1;
    width: 100%; max-width: 360px;
  }

  /* Logo 角色跑入 */
  .ob__icon-runner {
    margin-bottom: 32px;
    animation: obRunIn 1.1s cubic-bezier(0.22, 1, 0.36, 1) both 0.05s;
    transform-origin: bottom center;
  }
  @keyframes obRunIn {
    0%   { transform: translateX(110vw) rotate(22deg) scaleX(1.18); }
    42%  { transform: translateX(6px)   rotate(-10deg) scaleX(0.92); }
    58%  { transform: translateX(-4px)  rotate(6deg)  scaleX(1.05); }
    72%  { transform: translateX(2px)   rotate(-3deg) scaleX(0.98); }
    84%  { transform: translateX(-1px)  rotate(1.5deg) scaleX(1.01); }
    100% { transform: translateX(0)     rotate(0deg)  scaleX(1); }
  }
  .ob__icon-wrap {
    width: 96px; height: 96px;
    background: rgba(255,255,255,0.18); border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    position: relative;
    box-shadow: 0 0 0 14px rgba(255,255,255,0.07), 0 0 0 28px rgba(255,255,255,0.03);
    animation: obSquish 1.1s ease both 0.05s;
    transform-origin: bottom center;
  }
  @keyframes obSquish {
    0%   { transform: scaleX(1.1)  scaleY(0.95); }
    42%  { transform: scaleX(1.28) scaleY(0.68); }
    54%  { transform: scaleX(0.82) scaleY(1.28); }
    68%  { transform: scaleX(1.08) scaleY(0.92); }
    80%  { transform: scaleX(0.96) scaleY(1.06); }
    90%  { transform: scaleX(1.02) scaleY(0.98); }
    100% { transform: scaleX(1)    scaleY(1); }
  }
  .ob__icon-wrap::after {
    content: ''; position: absolute; inset: -16px; border-radius: 50%;
    border: 1.5px solid rgba(255,248,225,0.28);
    animation: obRing 3s ease-in-out infinite 1.2s;
  }
  @keyframes obRing {
    0%, 100% { transform: scale(1); opacity: 0.9; }
    50%       { transform: scale(1.15); opacity: 0.15; }
  }
  .ob__icon { width: 64px; height: 64px; }

  /* 诗句主视觉 */
  .ob__quote {
    text-align: center; margin-bottom: 20px;
  }
  .ob__quote-line {
    display: block;
    font-family: var(--font-brush); font-size: 2.5rem;
    color: #FFF8E1; line-height: 1.45; letter-spacing: 0.06em;
  }
  .ob__qchar {
    display: inline-block;
    animation: obCharIn 0.45s cubic-bezier(0.34, 1.4, 0.64, 1) both;
  }
  @keyframes obCharIn {
    from { opacity: 0; transform: translateY(24px) scale(0.65); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .ob__quote-attr {
    font-family: var(--font-ui); font-size: 0.72rem;
    color: rgba(255,248,225,0.5); margin-top: 10px;
    animation: obFadeIn 0.5s ease both 1.6s;
  }

  /* 副标题 */
  .ob__tagline {
    font-family: var(--font-ui); font-size: var(--text-base);
    color: rgba(255,248,225,0.8); text-align: center; line-height: 1.5;
    margin-bottom: 14px;
    animation: obSlideUp 0.5s ease both 1.7s;
  }

  /* 数据徽章 */
  .ob__badges {
    display: flex; gap: 8px; margin-bottom: 28px;
    animation: obSlideUp 0.5s ease both 1.8s;
  }
  .ob__badge {
    font-family: var(--font-ui); font-size: 0.68rem;
    color: rgba(255,248,225,0.75);
    border: 1px solid rgba(255,248,225,0.3);
    border-radius: 999px; padding: 3px 10px;
    background: rgba(255,255,255,0.08);
  }

  /* CTA */
  .ob__cta {
    width: 100%; max-width: 280px;
    padding: 18px 24px;
    background: #FFF8E1; color: #C62828;
    border-radius: 999px;
    font-family: var(--font-brush); font-size: 1.2rem; font-weight: 700;
    box-shadow: 0 10px 36px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.1);
    transition: transform 0.15s, box-shadow 0.15s;
    animation: obBounceIn 0.65s cubic-bezier(0.34,1.56,0.64,1) both 1.9s;
  }
  .ob__cta:active { transform: scale(0.96); box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
  @keyframes obBounceIn {
    from { opacity: 0; transform: scale(0.65) translateY(24px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }

  /* ── Step 1 选诗页 ── */
  .ob__step2 {
    width: 100%; max-width: 400px;
    display: flex; flex-direction: column; gap: 12px;
    padding: 72px 0 8px;
    position: relative; z-index: 1;
    overflow-y: auto;
    animation: obPageIn 0.4s ease both;
  }
  .ob__step2-label {
    font-family: var(--font-ui); font-size: var(--text-sm);
    color: rgba(255,248,225,0.85); text-align: center;
    animation: obSlideUp 0.4s ease both 0.06s;
  }
  .ob__cards { display: flex; flex-direction: column; gap: 10px; }
  .ob__card {
    background: rgba(255,255,255,0.13);
    border: 1.5px solid rgba(255,248,225,0.18);
    border-radius: 18px; padding: 14px 14px 14px 16px;
    text-align: left;
    display: flex; align-items: center; gap: 12px;
    overflow: hidden;
    transition: transform 0.15s, background 0.15s, border-color 0.15s, box-shadow 0.15s;
    animation: obCardIn 0.45s cubic-bezier(0.34,1.2,0.64,1) both;
    -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  }
  .ob__card:active {
    transform: scale(0.97);
    background: rgba(255,255,255,0.24);
    border-color: rgba(255,248,225,0.55);
    box-shadow: 0 6px 24px rgba(0,0,0,0.18);
  }
  .ob__card-left { flex: 1; min-width: 0; }
  .ob__card-thumb {
    width: 80px; height: 80px; flex-shrink: 0;
    border-radius: 12px;
    background-size: cover; background-position: center;
    opacity: 0.9; box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  }
  .ob__card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .ob__card-title { font-family: var(--font-brush); font-size: 1.1rem; color: #FFF8E1; }
  .ob__card-badge {
    font-family: var(--font-ui); font-size: 0.62rem;
    background: rgba(255,248,225,0.18); color: rgba(255,248,225,0.9);
    border: 1px solid rgba(255,248,225,0.35);
    border-radius: 999px; padding: 2px 8px;
  }
  .ob__card-author {
    font-family: var(--font-ui); font-size: var(--text-xs);
    color: rgba(255,248,225,0.65); margin-bottom: 6px;
  }
  .ob__card-line {
    font-family: var(--font-brush); font-size: 0.9rem;
    color: rgba(255,248,225,0.9); margin-bottom: 5px;
  }
  .ob__card-meta { font-family: var(--font-ui); font-size: 0.62rem; color: rgba(255,248,225,0.5); }
  .ob__to-home {
    font-family: var(--font-ui); font-size: var(--text-sm);
    color: rgba(255,248,225,0.6);
    background: transparent; padding: 14px 0;
    text-align: center; width: 100%;
    animation: obFadeIn 0.5s ease both 0.4s;
  }
  .ob__to-home:active { opacity: 0.4; }

  /* 公共动画 */
  @keyframes obPageIn {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes obSlideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes obCardIn {
    from { opacity: 0; transform: translateY(28px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes obFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
`
