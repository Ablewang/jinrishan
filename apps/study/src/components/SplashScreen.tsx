import './SplashScreen.css'

export default function SplashScreen({ fadingOut = false }: { fadingOut?: boolean }) {
  return (
    <div className={`splash${fadingOut ? ' splash--out' : ''}`}>
      <div className="splash__bg-char" aria-hidden>诗</div>
      <div className="splash__deco splash__deco--1" />
      <div className="splash__deco splash__deco--2" />
      <div className="splash__deco splash__deco--3" />

      <div className="splash__body">
        <div className="splash__icon-wrap">
          <img className="splash__icon" src="/icon.png" alt="" />
        </div>
        <div className="splash__title">
          {'古诗小课堂'.split('').map((ch, i) => (
            <span key={i} className="splash__char" style={{ animationDelay: `${0.3 + i * 0.08}s` }}>{ch}</span>
          ))}
        </div>
        <div className="splash__sub">每天一首，积累经典</div>
      </div>
    </div>
  )
}
