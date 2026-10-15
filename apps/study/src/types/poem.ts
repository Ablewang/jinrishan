export type MasteryLevel = 'unlearned' | 'pending' | 'learning' | 'mastered'

export const MASTERY_CONFIG: Record<MasteryLevel, { label: string; color: string; bg: string; stripColor: string }> = {
  unlearned: { label: '未学',   color: '#9E9E9E', bg: '#fff',    stripColor: '#BDBDBD' },
  pending:   { label: '待背诵', color: '#C62828', bg: '#FFF5F5', stripColor: '#C62828' },
  learning:  { label: '背诵中', color: '#E65100', bg: '#FFF3E0', stripColor: '#FF8F00' },
  mastered:  { label: '已掌握', color: '#2E7D32', bg: '#F1F8F2', stripColor: '#388E3C' },
}
