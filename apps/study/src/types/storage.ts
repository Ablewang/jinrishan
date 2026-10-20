import type { LineResult } from './recitation'

// 背诵记录（每次背诵追加一条，含复习）
export interface RecitationSessionV2 {
  id: string
  poemId: number
  mode: 'memorize' | 'review'   // memorize=首次背诵，review=间隔复习
  date: string                  // YYYY-MM-DD
  timestamp: number
  stars: number                 // 1|2|3
  qScore: number                // SM-2 质量分 0-5
  charCount: number             // 汉字数量（不含标点）
  lines: LineResult[]
  hintRate: number              // 用了提示的句子比例 0-1
  passRate: number              // 背出来的句子比例 0-1
}

// SM-2 调度状态（每首诗一条，每次背诵后更新）
export interface SrsSchedule {
  poemId: number
  ef: number                    // 难度因子，初始 2.5，最低 1.3
  interval: number              // 下次复习间隔（天）
  repetition: number            // 已完成轮次
  nextDue: string               // YYYY-MM-DD，下次复习日期
  lastSessionId?: string
  totalSessions: number
}

// 用户基本信息
export interface UserProfile {
  nickname: string
  gender?: 'male' | 'female'
  reminderTime?: string         // HH:MM
  onboardingDone: boolean
  createdAt: string             // ISO 时间
}

// 成就解锁事件（append-only）
export interface AchievementEvent {
  id: string                    // achievement id
  unlockedAt: string            // ISO 时间
}
