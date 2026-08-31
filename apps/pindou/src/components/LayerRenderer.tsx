import type { LayerEntry } from '../hooks/useLayerStack'

const SHELL_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'var(--bg)',
  willChange: 'transform',
  overflowY: 'auto',
  overflowX: 'hidden',
}

interface Props {
  stack: LayerEntry[]
  onLayerMount: (id: number, el: HTMLDivElement, isNew: boolean) => void
  onLayerUnmount: (id: number) => void
  renderContent: (entry: LayerEntry) => React.ReactNode
}

export function LayerRenderer({ stack, onLayerMount, onLayerUnmount, renderContent }: Props) {
  return (
    <>
      {stack.map((entry, idx) => (
        <div
          key={entry.id}
          style={{ ...SHELL_STYLE, zIndex: idx + 1 }}
          ref={el => {
            if (el) onLayerMount(entry.id, el, entry.isNew)
            else    onLayerUnmount(entry.id)
          }}
        >
          {renderContent(entry)}
        </div>
      ))}
    </>
  )
}
