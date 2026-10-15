export interface LineResult {
  lineIndex: number
  passed: boolean
  hintCount: number   // 0=无提示 1=首字提示 2=全句提示
  mode: 'parent' | 'child'
}

export interface RecitationSession {
  id: string
  poemId: number
  mode: 'parent' | 'child'
  date: string            // "2026-10-15"
  timestamp: number
  lines: LineResult[]
  stars: number           // 1 | 2 | 3
  hintRate: number        // 用了提示的句子比例 0-1
  passRate: number        // 背出来的句子比例 0-1
  qScore: number          // SM-2 q值 0-5
}

export interface ReviewSchedule {
  poemId: number
  ef: number              // Easiness Factor，初始2.5，最低1.3
  interval: number        // 当前复习间隔（天）
  repetition: number      // 已完成轮次
  nextReviewDate: string  // ISO date "2026-10-16"
  lastSessionId: string
  totalSessions: number
  bestStars: number
}
