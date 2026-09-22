import type { PoemState, StreakData, MemorizeRecord } from '../hooks/useProgress'

// 李白诗 id
const LIBAI_IDS = new Set([19, 20, 21, 22, 23, 24, 25])
// 含「月」字的诗 id（title 或 firstLine）
const MOON_IDS = new Set([13, 18, 19, 20, 31, 35, 36, 54, 64, 68])

interface Badge {
  id: string
  label: string
  desc: string
  unlocked: boolean
}

interface Props {
  progress: Record<string, PoemState>
  streak: StreakData
  totalChars: number
  memorizeHistory: MemorizeRecord[]
}

function hasConsecutiveHighStars(history: MemorizeRecord[], n: number): boolean {
  let count = 0
  for (const r of history) {
    if (r.stars >= 2) {
      count++
      if (count >= n) return true
    } else {
      count = 0
    }
  }
  return false
}

function makeBadges({ progress, streak, totalChars, memorizeHistory }: Props): Badge[] {
  const memorizedIds = new Set(
    Object.entries(progress).filter(([, s]) => s.memorized).map(([id]) => Number(id))
  )

  return [
    {
      id: 'perfect',
      label: '一气呵成',
      desc: '完成一首诗全程0次提示',
      unlocked: Object.values(progress).some(s => s.bestStars === 3),
    },
    {
      id: 'streak3',
      label: '三连击',
      desc: '连续3首诗★★以上',
      unlocked: hasConsecutiveHighStars(memorizeHistory, 3),
    },
    {
      id: 'moon',
      label: '月亮诗人',
      desc: '完成所有含「月」字的诗',
      unlocked: [...MOON_IDS].every(id => memorizedIds.has(id)),
    },
    {
      id: 'streak7',
      label: '每日学诗',
      desc: '连续学习7天',
      unlocked: streak.count >= 7,
    },
    {
      id: 'chars',
      label: '百字侠',
      desc: '累计背出100个汉字',
      unlocked: totalChars >= 100,
    },
    {
      id: 'libai',
      label: '小李白',
      desc: '完成所有李白诗目',
      unlocked: [...LIBAI_IDS].every(id => memorizedIds.has(id)),
    },
  ]
}

const ICONS: Record<string, string> = {
  perfect: '一',
  streak3: '连',
  moon:    '月',
  streak7: '恒',
  chars:   '百',
  libai:   '白',
}

export default function Achievements(props: Props) {
  const badges = makeBadges(props)
  const unlockedCount = badges.filter(b => b.unlocked).length

  return (
    <div className="ach">
      <div className="ach__header">
        <span className="ach__title">成就</span>
        <span className="ach__count">{unlockedCount} / {badges.length}</span>
      </div>
      <div className="ach__grid">
        {badges.map(b => (
          <div key={b.id} className={`ach__badge${b.unlocked ? ' ach__badge--on' : ''}`} title={b.desc}>
            <span className="ach__icon">{ICONS[b.id]}</span>
            <span className="ach__label">{b.label}</span>
          </div>
        ))}
      </div>
      <style>{style}</style>
    </div>
  )
}

const style = `
  .ach {
    margin: 12px 16px 0;
    background: var(--surface);
    border-radius: 14px;
    padding: 14px 16px;
    box-shadow: var(--shadow-card);
    border: 1.5px solid var(--border);
  }
  .ach__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .ach__title {
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--ink-light);
  }
  .ach__count {
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    color: #C62828;
    font-weight: 700;
  }
  .ach__grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
  }
  .ach__badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  .ach__icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-brush);
    font-size: 1rem;
    font-weight: 700;
    background: #f0f0f0;
    color: #ccc;
    transition: all 0.2s;
  }
  .ach__badge--on .ach__icon {
    background: rgba(198,40,40,0.1);
    color: #C62828;
    border: 2px solid rgba(198,40,40,0.3);
  }
  .ach__label {
    font-family: var(--font-ui);
    font-size: 0.6rem;
    color: #ccc;
    text-align: center;
    line-height: 1.2;
  }
  .ach__badge--on .ach__label {
    color: var(--ink-light);
  }
  @media (max-width: 340px) {
    .ach__grid { grid-template-columns: repeat(3, 1fr); }
  }
`
