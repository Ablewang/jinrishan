import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../logo-exports')
fs.mkdirSync(OUT, { recursive: true })

const SERIF = "'Songti SC', 'Noto Serif CJK SC', serif"
const SANS = "-apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif"

function makeHtml(darkMode) {
  const bg = darkMode ? '#141414' : 'transparent'
  const textColor = darkMode ? '#fff' : '#141414'
  const pinyinColor = darkMode ? 'rgba(255,255,255,.45)' : 'rgba(20,20,20,.45)'
  const slashColor  = darkMode ? 'rgba(255,255,255,.70)' : 'rgba(20,20,20,.60)'
  const dividerColor = darkMode ? 'rgba(255,255,255,.15)' : 'rgba(20,20,20,.15)'
  const bodyBg = darkMode ? '#141414' : 'transparent'

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: ${bodyBg}; display: inline-block; }
  .logo-full {
    display: inline-flex; align-items: center; gap: 0;
    padding: 5px 10px 7px 8px; background: ${bg};
  }
  .shan {
    font-family: ${SERIF};
    font-size: 34px; line-height: 1; color: ${textColor};
    transform: translateY(-0.06em); display: block;
    margin-right: 10px;
  }
  .divider {
    width: 1px; height: 28px; background: ${dividerColor}; flex-shrink: 0;
    margin-right: 13px;
  }
  .right {
    display: flex; flex-direction: column; justify-content: space-between;
    height: 28px; padding: 1px 0;
  }
  .pinyin {
    font-family: ${SERIF}; font-style: italic;
    font-size: 10.5px; color: ${pinyinColor};
    letter-spacing: 0.05em; line-height: 1;
  }
  .pinyin .slash { color: ${slashColor}; }
  .jinri {
    font-family: ${SANS}; font-weight: 600;
    font-size: 13px; letter-spacing: 0.2em;
    color: ${textColor}; line-height: 1;
  }
  .logo-left {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 5px 10px 7px 8px; background: ${bg};
  }
  .logo-right {
    display: inline-flex; align-items: center;
    padding: 5px 10px 7px 10px; background: ${bg};
  }
</style>
</head>
<body>

<div id="full" class="logo-full">
  <span class="shan">膳</span>
  <div class="divider"></div>
  <div class="right">
    <span class="pinyin"><span class="slash">/</span> shàn <span class="slash">/</span></span>
    <span class="jinri">JINRI</span>
  </div>
</div>

<br>

<div id="left" class="logo-left">
  <span class="shan">膳</span>
</div>

<br>

<div id="right" class="logo-right">
  <div class="right">
    <span class="pinyin"><span class="slash">/</span> shàn <span class="slash">/</span></span>
    <span class="jinri">JINRI</span>
  </div>
</div>

</body>
</html>`
}

const browser = await chromium.launch()

for (const [darkMode, suffix] of [[true, 'dark'], [false, 'light']]) {
  const page = await browser.newPage({ deviceScaleFactor: 3 })
  if (!darkMode) {
    // transparent background needs omitBackground
    await page.setContent(makeHtml(darkMode), { waitUntil: 'networkidle' })
  } else {
    await page.setContent(makeHtml(darkMode), { waitUntil: 'networkidle' })
  }

  for (const [id, name] of [['full', 'logo-full'], ['left', 'logo-left'], ['right', 'logo-right']]) {
    const el = page.locator(`#${id}`)
    const outFile = path.join(OUT, `${name}-${suffix}.png`)
    await el.screenshot({
      path: outFile,
      omitBackground: !darkMode,  // transparent for light version
    })
    const box = await el.boundingBox()
    console.log(`✓ ${path.basename(outFile)}  ${Math.round(box.width * 3)}×${Math.round(box.height * 3)}`)
  }
  await page.close()
}

await browser.close()
console.log(`\n输出目录: ${OUT}`)
