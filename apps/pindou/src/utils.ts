// 按色号排序：先按字母分组，组内按数字升序（A1 A2 A3...A10）
export function sortByCode(a: string, b: string): number {
  const letterA = a.match(/^[A-Za-z]+/)?.[0] ?? ''
  const letterB = b.match(/^[A-Za-z]+/)?.[0] ?? ''
  if (letterA !== letterB) return letterA.localeCompare(letterB)
  const numA = parseInt(a.replace(/^[A-Za-z]+/, '')) || 0
  const numB = parseInt(b.replace(/^[A-Za-z]+/, '')) || 0
  return numA - numB
}
