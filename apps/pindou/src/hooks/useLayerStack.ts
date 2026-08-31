import { useRef, useState } from 'react'
import { useMemoizedFn } from './useMemoizedFn'

export interface LayerEntry {
  id: number
  hash: string
  alive: boolean  // false 时 content 卸载，DOM 壳保留
}

let nextId = 1

function getInitialStack(hash: string): LayerEntry[] {
  const stack: LayerEntry[] = [{ id: nextId++, hash: '#/', alive: true }]
  if (hash !== '#/' && hash !== '#') {
    if (hash.startsWith('#/item/')) {
      const rest = hash.slice('#/item/'.length)
      const slash = rest.indexOf('/')
      stack.push({ id: nextId++, hash: `#/category/${rest.slice(0, slash)}`, alive: true })
    }
    stack.push({ id: nextId++, hash, alive: true })
  }
  return stack
}

export function useLayerStack() {
  const [stack, setStack] = useState<LayerEntry[]>(() =>
    getInitialStack(location.hash || '#/')
  )
  const stackRef = useRef(stack)
  stackRef.current = stack

  const push = useMemoizedFn((hash: string) => {
    const prev = stackRef.current
    if (prev[prev.length - 1]?.hash === hash) return
    history.pushState(null, '', hash)
    setStack([...prev, { id: nextId++, hash, alive: true }])
  })

  // 标记顶层 alive=false，触发 content 卸载（动画由 LayerRenderer 负责）
  const pop = useMemoizedFn(() => {
    const prev = stackRef.current
    if (prev.length <= 1) return
    const topId = prev[prev.length - 1].id
    setStack(s => s.map(e => e.id === topId ? { ...e, alive: false } : e))
  })

  // 动画结束后真正移除该层
  const remove = useMemoizedFn((id: number) => {
    setStack(s => s.filter(e => e.id !== id))
  })

  const canPop = useMemoizedFn(() => stackRef.current.length > 1)

  return { stack, push, pop, remove, canPop }
}
