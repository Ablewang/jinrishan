// 6 种中国风装饰插画，对应 6 种卡片颜色
// 依次：梅花、菊花、荷花、竹子、山水、兰花

const Plum = () => (
  <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">
    <path d="M56 60 Q38 46 18 28 Q24 20 36 16" stroke="#CC0000" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M28 38 Q34 30 42 28" stroke="#CC0000" strokeWidth="1.5" strokeLinecap="round"/>
    {/* 大花 */}
    <g transform="translate(36,16)">
      <circle cx="0" cy="-6" r="4.5" fill="#FF5252"/>
      <circle cx="5.7" cy="-1.9" r="4.5" fill="#FF5252"/>
      <circle cx="3.5" cy="5" r="4.5" fill="#FF5252"/>
      <circle cx="-3.5" cy="5" r="4.5" fill="#FF5252"/>
      <circle cx="-5.7" cy="-1.9" r="4.5" fill="#FF5252"/>
      <circle cx="0" cy="0" r="3.5" fill="#FFD0D0"/>
      <circle cx="0" cy="0" r="1.5" fill="#FFAA00"/>
    </g>
    {/* 小花 */}
    <g transform="translate(18,28)">
      <circle cx="0" cy="-4.5" r="3.5" fill="#FF7070"/>
      <circle cx="4.3" cy="-1.4" r="3.5" fill="#FF7070"/>
      <circle cx="2.7" cy="3.8" r="3.5" fill="#FF7070"/>
      <circle cx="-2.7" cy="3.8" r="3.5" fill="#FF7070"/>
      <circle cx="-4.3" cy="-1.4" r="3.5" fill="#FF7070"/>
      <circle cx="0" cy="0" r="2.5" fill="#FFD0D0"/>
    </g>
    {/* 花苞 */}
    <ellipse cx="42" cy="28" rx="3" ry="4.5" fill="#FF9090" transform="rotate(-15,42,28)"/>
  </svg>
)

const Chrysanthemum = () => (
  <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">
    <g transform="translate(30,28)">
      {[0,30,60,90,120,150,180,210,240,270,300,330].map(r => (
        <ellipse key={r} cx="0" cy="-14" rx="3.5" ry="7.5" fill="#FF8C00" transform={`rotate(${r})`}/>
      ))}
      {[15,75,135,195,255,315].map(r => (
        <ellipse key={r} cx="0" cy="-9" rx="3" ry="5" fill="#FFB74D" transform={`rotate(${r})`}/>
      ))}
      <circle cx="0" cy="0" r="5" fill="#FFC107"/>
      <circle cx="0" cy="0" r="2.5" fill="#FFDE80"/>
    </g>
    <path d="M30 42 L30 58" stroke="#66BB6A" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M30 50 Q19 46 17 40" stroke="#66BB6A" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
  </svg>
)

const Lotus = () => (
  <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">
    {/* 荷叶 */}
    <ellipse cx="32" cy="52" rx="22" ry="8" fill="#00BFA5" opacity="0.6"/>
    <path d="M32 44 L32 52" stroke="#00897B" strokeWidth="1.5"/>
    {/* 花瓣外层 */}
    <ellipse cx="32" cy="28" rx="6" ry="14" fill="#00BFA5" opacity="0.8"/>
    <ellipse cx="32" cy="28" rx="6" ry="14" fill="#00BFA5" opacity="0.8" transform="rotate(30,32,36)"/>
    <ellipse cx="32" cy="28" rx="6" ry="14" fill="#00BFA5" opacity="0.8" transform="rotate(-30,32,36)"/>
    <ellipse cx="32" cy="28" rx="6" ry="14" fill="#00BFA5" opacity="0.8" transform="rotate(60,32,36)"/>
    <ellipse cx="32" cy="28" rx="6" ry="14" fill="#00BFA5" opacity="0.8" transform="rotate(-60,32,36)"/>
    {/* 花瓣内层 */}
    <ellipse cx="32" cy="30" rx="4.5" ry="10" fill="#64FFDA"/>
    <ellipse cx="32" cy="30" rx="4.5" ry="10" fill="#64FFDA" transform="rotate(25,32,36)"/>
    <ellipse cx="32" cy="30" rx="4.5" ry="10" fill="#64FFDA" transform="rotate(-25,32,36)"/>
    {/* 花心 */}
    <circle cx="32" cy="36" r="4" fill="#FFECB3"/>
    {/* 茎 */}
    <path d="M32 44 Q34 40 32 36" stroke="#00897B" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const Bamboo = () => (
  <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">
    {/* 竹杆 1 */}
    <rect x="20" y="8" width="7" height="52" rx="3.5" fill="#00BFA5" opacity="0.7"/>
    <line x1="20" y1="20" x2="27" y2="20" stroke="#007A68" strokeWidth="1.5"/>
    <line x1="20" y1="32" x2="27" y2="32" stroke="#007A68" strokeWidth="1.5"/>
    <line x1="20" y1="44" x2="27" y2="44" stroke="#007A68" strokeWidth="1.5"/>
    {/* 竹杆 2 */}
    <rect x="33" y="14" width="6" height="46" rx="3" fill="#26C6A6" opacity="0.65"/>
    <line x1="33" y1="26" x2="39" y2="26" stroke="#007A68" strokeWidth="1.5"/>
    <line x1="33" y1="38" x2="39" y2="38" stroke="#007A68" strokeWidth="1.5"/>
    <line x1="33" y1="50" x2="39" y2="50" stroke="#007A68" strokeWidth="1.5"/>
    {/* 叶子 */}
    <path d="M27 16 Q38 10 46 14" stroke="#00897B" strokeWidth="2" strokeLinecap="round"/>
    <path d="M27 28 Q16 22 10 26" stroke="#00897B" strokeWidth="2" strokeLinecap="round"/>
    <path d="M39 22 Q50 16 56 20" stroke="#00897B" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M39 34 Q48 28 54 32" stroke="#00897B" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

const Mountain = () => (
  <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">
    {/* 远山 */}
    <path d="M4 44 L22 20 L40 44 Z" fill="#BBDEFB" opacity="0.8"/>
    {/* 近山 */}
    <path d="M18 44 L38 12 L58 44 Z" fill="#2196F3" opacity="0.7"/>
    {/* 水面 */}
    <rect x="4" y="44" width="56" height="14" rx="2" fill="#90CAF9" opacity="0.5"/>
    {/* 水波 */}
    <path d="M8 50 Q16 47 24 50 Q32 53 40 50 Q48 47 56 50" stroke="#1565C0" strokeWidth="1" opacity="0.6"/>
    <path d="M8 54 Q18 51 28 54 Q38 57 48 54" stroke="#1565C0" strokeWidth="1" opacity="0.5"/>
    {/* 树 */}
    <path d="M38 20 L38 14" stroke="#1565C0" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="38" cy="12" r="3" fill="#42A5F5" opacity="0.7"/>
  </svg>
)

const Orchid = () => (
  <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">
    {/* 长叶子 */}
    <path d="M32 56 Q20 40 14 20" stroke="#9C27B0" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M32 56 Q44 38 50 18" stroke="#9C27B0" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M32 56 Q26 36 30 12" stroke="#9C27B0" strokeWidth="2" strokeLinecap="round"/>
    {/* 花 1 */}
    <g transform="translate(18,22)">
      <ellipse cx="0" cy="-5" rx="3" ry="5.5" fill="#CE93D8"/>
      <ellipse cx="0" cy="-5" rx="3" ry="5.5" fill="#CE93D8" transform="rotate(72,0,0)"/>
      <ellipse cx="0" cy="-5" rx="3" ry="5.5" fill="#CE93D8" transform="rotate(144,0,0)"/>
      <ellipse cx="0" cy="-5" rx="3" ry="5.5" fill="#CE93D8" transform="rotate(216,0,0)"/>
      <ellipse cx="0" cy="-5" rx="3" ry="5.5" fill="#CE93D8" transform="rotate(288,0,0)"/>
      <circle cx="0" cy="0" r="2.5" fill="#F3E5F5"/>
    </g>
    {/* 花 2 */}
    <g transform="translate(48,20)">
      <ellipse cx="0" cy="-4" rx="2.5" ry="4.5" fill="#BA68C8"/>
      <ellipse cx="0" cy="-4" rx="2.5" ry="4.5" fill="#BA68C8" transform="rotate(72,0,0)"/>
      <ellipse cx="0" cy="-4" rx="2.5" ry="4.5" fill="#BA68C8" transform="rotate(144,0,0)"/>
      <ellipse cx="0" cy="-4" rx="2.5" ry="4.5" fill="#BA68C8" transform="rotate(216,0,0)"/>
      <ellipse cx="0" cy="-4" rx="2.5" ry="4.5" fill="#BA68C8" transform="rotate(288,0,0)"/>
      <circle cx="0" cy="0" r="2" fill="#F3E5F5"/>
    </g>
    {/* 小花苞 */}
    <ellipse cx="30" cy="14" rx="2" ry="4" fill="#AB47BC" transform="rotate(-10,30,14)"/>
  </svg>
)

const ILLUSTRATIONS = [Plum, Chrysanthemum, Lotus, Bamboo, Mountain, Orchid]

export default function CardIllustration({ index }: { index: number }) {
  const Comp = ILLUSTRATIONS[index % 6]
  return <Comp />
}
