import type { ReactNode } from 'react'
import './PageHeader.css'

interface Props {
  onBack: () => void
  title: string
  right?: ReactNode
}

export default function PageHeader({ onBack, title, right }: Props) {
  return (
    <header className="ph">
      <button className="ph__back" onClick={onBack}>
        <svg viewBox="0 0 1024 1024" width="16" height="16" fill="currentColor">
          <path d="M403.2 812.8L100.256 512 403.2 211.2l59.744 59.744-198.4 198.4h652.8v85.344h-652.8l198.4 198.4z"/>
        </svg>
        返回
      </button>
      <span className="ph__title">{title}</span>
      <div className="ph__right">{right ?? null}</div>
    </header>
  )
}
