import sharp from '/tmp/node_modules/sharp/lib/index.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'logo-exports')
fs.mkdirSync(OUT, { recursive: true })

const SCALE = 3
const BG = '#141414'

// All sizes in px (will be rendered at SCALE via sharp resize)
const FONT_SHAN = 34       // 膳 character
const FONT_PINYIN = 11     // / shàn /
const FONT_JINRI = 13      // JINRI
const PAD_X = 20           // horizontal padding
const PAD_Y = 12           // vertical padding
const GAP = 12             // gap between 膳 and divider, divider and text
const JINRI_LS = 3         // letter-spacing for JINRI

// Estimated text widths (SVG text measurement is tricky without a real browser,
// so we measure carefully based on known metrics)
// 膳: CJK square glyph ≈ font-size wide
const W_SHAN = FONT_SHAN
// / shàn / at font 11: roughly 52px
const W_PINYIN = 52
// JINRI at font 13 bold + letter-spacing 3 * 5 chars = ~58px
const W_JINRI = 13 * 3.5 + JINRI_LS * 5

const W_RIGHT = Math.max(W_PINYIN, W_JINRI)
const DIV_W = 1

// Heights
const H_CONTENT = FONT_SHAN  // total content height driven by 膳
const H_TOTAL = H_CONTENT + PAD_Y * 2

// ─── Full logo ─────────────────────────────────────────────────────────────
const W_FULL = PAD_X + W_SHAN + GAP + DIV_W + GAP + W_RIGHT + PAD_X

// Vertical positions
const CY = H_TOTAL / 2  // center Y

// 膳: dominant-baseline middle
const SHAN_Y = CY

// divider: centered, 82% of font height
const DIV_H = FONT_SHAN * 0.82
const DIV_Y = CY - DIV_H / 2

// right block: occupies DIV_H, split into pinyin (top) and JINRI (bottom)
const RY = CY - DIV_H / 2
// pinyin top = RY + 2px (small top padding)
const PINYIN_Y = RY + 2 + FONT_PINYIN  // text-anchor baseline
// JINRI bottom = RY + DIV_H - 2px
const JINRI_Y = RY + DIV_H - 2

const RX = PAD_X + W_SHAN + GAP + DIV_W + GAP

const fullSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${W_FULL}" height="${H_TOTAL}">
  <rect width="${W_FULL}" height="${H_TOTAL}" fill="${BG}"/>
  <text x="${PAD_X}" y="${SHAN_Y}"
    font-family="'Songti SC','Noto Serif CJK SC',serif"
    font-size="${FONT_SHAN}"
    fill="#ffffff"
    dominant-baseline="central">膳</text>
  <rect x="${PAD_X + W_SHAN + GAP}" y="${DIV_Y}" width="${DIV_W}" height="${DIV_H}" fill="rgba(255,255,255,0.15)"/>
  <text x="${RX}" y="${PINYIN_Y}"
    font-family="'Songti SC','Noto Serif CJK SC',serif"
    font-style="italic"
    font-size="${FONT_PINYIN}"
    fill="rgba(255,255,255,0.45)"
    letter-spacing="0.8">/ shàn /</text>
  <text x="${RX}" y="${JINRI_Y}"
    font-family="-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif"
    font-weight="800"
    font-size="${FONT_JINRI}"
    fill="#ffffff"
    letter-spacing="${JINRI_LS}">JINRI</text>
</svg>`

// ─── Left only (膳) ─────────────────────────────────────────────────────────
const W_LEFT = W_SHAN + PAD_X * 2
const leftSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${W_LEFT}" height="${H_TOTAL}">
  <rect width="${W_LEFT}" height="${H_TOTAL}" fill="${BG}"/>
  <text x="${W_LEFT / 2}" y="${CY}"
    font-family="'Songti SC','Noto Serif CJK SC',serif"
    font-size="${FONT_SHAN}"
    fill="#ffffff"
    text-anchor="middle"
    dominant-baseline="central">膳</text>
</svg>`

// ─── Right only (/ shàn / + JINRI) ─────────────────────────────────────────
const W_RIGHT_TOTAL = W_RIGHT + PAD_X * 2
const rightSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${W_RIGHT_TOTAL}" height="${H_TOTAL}">
  <rect width="${W_RIGHT_TOTAL}" height="${H_TOTAL}" fill="${BG}"/>
  <text x="${PAD_X}" y="${PINYIN_Y}"
    font-family="'Songti SC','Noto Serif CJK SC',serif"
    font-style="italic"
    font-size="${FONT_PINYIN}"
    fill="rgba(255,255,255,0.45)"
    letter-spacing="0.8">/ shàn /</text>
  <text x="${PAD_X}" y="${JINRI_Y}"
    font-family="-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif"
    font-weight="800"
    font-size="${FONT_JINRI}"
    fill="#ffffff"
    letter-spacing="${JINRI_LS}">JINRI</text>
</svg>`

async function svgToPng(svgStr, outFile) {
  const svg = Buffer.from(svgStr)
  const meta = await sharp(svg).metadata()
  await sharp(svg)
    .resize(meta.width * SCALE, meta.height * SCALE)
    .png()
    .toFile(outFile)
  const stats = fs.statSync(outFile)
  console.log(`✓ ${path.basename(outFile)}  ${meta.width * SCALE}×${meta.height * SCALE}  (${(stats.size/1024).toFixed(1)}KB)`)
}

await svgToPng(fullSVG,  path.join(OUT, 'logo-full.png'))
await svgToPng(leftSVG,  path.join(OUT, 'logo-left.png'))
await svgToPng(rightSVG, path.join(OUT, 'logo-right.png'))
console.log(`\n输出目录: ${OUT}`)
