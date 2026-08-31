import type { LayerEntry } from '../hooks/useLayerStack'

const SHELL_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'var(--bg)',
  willChange: 'transform',
  overflow: 'hidden',
}

interface Props {
  stack: LayerEntry[]
  renderContent: (entry: LayerEntry) => React.ReactNode
  layerRefs: React.MutableRefObject<Map<number, HTMLDivElement>>
}

export function LayerRenderer({ stack, renderContent, layerRefs }: Props) {
  return (
    <>
      {stack.map((entry, idx) => (
        <div
          key={entry.id}
          style={{ ...SHELL_STYLE, zIndex: idx + 1 }}
          ref={el => {
            if (el) layerRefs.current.set(entry.id, el)
            else    layerRefs.current.delete(entry.id)
          }}
        >
          {entry.alive ? renderContent(entry) : null}
        </div>
      ))}
    </>
  )
}
