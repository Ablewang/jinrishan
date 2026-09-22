import type { PoemState, StreakData } from '../hooks/useProgress'

interface Badge {
  id: string
  label: string
  desc: string
  unlocked: boolean
}

interface Props {
  progress: Record<string, PoemState>
  streak: StreakData
  totalMemorized: number
  totalPerfect: number
}

function makeBadges(props: Props): Badge[] {
  const { totalMemorized, totalPerfect, streak } = props
  return [
    {
      id: 'first',
      label: '初出茅庐',
      desc: '背出第一首诗',
      unlocked: totalMemorized >= 1,
    },
    {
      id: 'ten',
      label: '小有成就',
      desc: '背出10首诗',
      unlocked: totalMemorized >= 10,
    },
    {
      id: 'thirty',
      label: '博闻强识',
      desc: '背出30首诗',
      unlocked: totalMemorized >= 30,
    },
    {
      id: 'all',
      label: '满腹经纶',
      desc: '背出全部70首',
      unlocked: totalMemorized >= 70,
    },
    {
      id: 'perfect',
      label: '一气呵成',
      desc: '获得第一个三星',
      unlocked: totalPerfect >= 1,
    },
    {
      id: 'streak',
      label: '持之以恒',
      desc: '连续学习7天',
      unlocked: streak.count >= 7,
    },
  ]
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

const ICONS: Record<string, string> = {
  first:   '卷',
  ten:     '十',
  thirty:  '卅',
  all:     '满',
  perfect: '星',
  streak:  '连',
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
