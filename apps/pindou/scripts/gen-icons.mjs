import sharp from 'sharp'

// 直接从参考图采样的 8x8 颜色网格
const GRID = [
  ['#80c074','#2d9148','#42a43f','#80c074','#80c074','#2d9148','#42a43f','#2d9148'],
  ['#2d9148','#42a43f','#80c074','#2d9148','#42a43f','#80c074','#2d9148','#80c074'],
  ['#80c074','#000000','#000000','#2d9148','#80c074','#000000','#000000','#42a43f'],
  ['#42a43f','#000000','#000000','#42a43f','#2d9148','#000000','#000000','#2d9148'],
  ['#2d9148','#80c074','#42a43f','#000000','#000000','#2d9148','#80c074','#42a43f'],
  ['#42a43f','#2d9148','#000000','#000000','#000000','#000000','#2d9148','#80c074'],
  ['#2d9148','#80c074','#000000','#80c074','#2d9148','#000000','#42a43f','#2d9148'],
  ['#80c074','#42a43f','#80c074','#2d9148','#42a43f','#80c074','#2d9148','#80c074'],
]

const BG   = '#000000'
const BEAD = 7  // 豆子尺寸
const GAP  = 1  // 间距
const UNIT = BEAD + GAP  // 8px per slot

function makeSVG(n, totalSize) {
  const artSize = 8 * n * UNIT
  const pad = Math.floor((totalSize - artSize) / 2)
  const rr = 2  // 圆角

  let rects = ''
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const fill = GRID[row][col]
      for (let br = 0; br < n; br++) {
        for (let bc = 0; bc < n; bc++) {
          const x = pad + (col * n + bc) * UNIT
          const y = pad + (row * n + br) * UNIT
          rects += `<rect x="${x}" y="${y}" width="${BEAD}" height="${BEAD}" rx="${rr}" fill="${fill}"/>`
        }
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalSize}" height="${totalSize}"><rect width="${totalSize}" height="${totalSize}" fill="${BG}"/>${rects}</svg>`
}

const icons = [
  { file: 'public/pwa-64x64.png',                n: 1, size: 64  },
  { file: 'public/pwa-192x192.png',              n: 3, size: 192 },
  { file: 'public/pwa-512x512.png',              n: 8, size: 512 },
  { file: 'public/maskable-icon-512x512.png',    n: 6, size: 512 },
  { file: 'public/apple-touch-icon-180x180.png', n: 2, size: 180 },
]

for (const { file, n, size } of icons) {
  const svg = makeSVG(n, size)
  await sharp(Buffer.from(svg)).png().toFile(file)
  console.log(`✓ ${file}  (${n} bead/pixel)`)
}
