#!/usr/bin/env node
// 为每首诗的标题生成拼音，写入 public/poems/{id}.json

import { pinyin } from 'pinyin-pro'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const poemsDir = path.resolve(__dirname, '../public/poems')

const files = fs.readdirSync(poemsDir).filter(f => f !== 'index.json' && f.endsWith('.json'))

for (const file of files) {
  const fp = path.join(poemsDir, file)
  const poem = JSON.parse(fs.readFileSync(fp, 'utf8'))

  // 生成标题每个字的拼音数组
  const titlePinyin = pinyin(poem.title, { toneType: 'symbol', type: 'array', nonZh: 'consecutive' })
  poem.titlePinyin = titlePinyin

  fs.writeFileSync(fp, JSON.stringify(poem))
}

console.log(`${files.length} poem files updated with titlePinyin`)
