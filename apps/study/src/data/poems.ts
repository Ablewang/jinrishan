// 首页只用这个轻量类型
export interface PoemSummary {
  id: number
  title: string
  dynasty: string | null
  author: string
  firstLine: string
}

export interface Char {
  char: string
  pinyin: string | null
}

export interface Line {
  text: string
  pinyin: string
  chars: Char[]
}

export interface Poem {
  id: number
  title: string
  dynasty: string | null
  author: string
  lines: Line[]
}

let summaryCache: PoemSummary[] | null = null

export async function loadPoemIndex(): Promise<PoemSummary[]> {
  if (summaryCache) return summaryCache
  const res = await fetch('/poems/index.json')
  summaryCache = await res.json()
  return summaryCache!
}

const poemCache = new Map<number, Poem>()

export async function loadPoem(id: number): Promise<Poem | null> {
  if (poemCache.has(id)) return poemCache.get(id)!
  try {
    const res = await fetch(`/poems/${id}.json`)
    if (!res.ok) return null
    const poem: Poem = await res.json()
    poemCache.set(id, poem)
    return poem
  } catch {
    return null
  }
}
