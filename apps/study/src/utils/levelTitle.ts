export function getLevelTitle(totalMemorized: number): string {
  if (totalMemorized >= 70) return '诗词状元'
  if (totalMemorized >= 50) return '满腹诗书'
  if (totalMemorized >= 30) return '资深诗友'
  if (totalMemorized >= 15) return '进阶书生'
  if (totalMemorized >= 5) return '初阶诗童'
  return '学诗新苗'
}
