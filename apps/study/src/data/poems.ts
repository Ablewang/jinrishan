import rawData from '../../古诗70首_完整JSON.json'

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

interface RawData {
  poems: Poem[]
}

export const poems: Poem[] = (rawData as RawData).poems
