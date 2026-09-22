#!/usr/bin/env node
// 把大 JSON 拆成小文件：
// public/poems/index.json  —— 首页列表（5KB）
// public/poems/{id}.json   —— 单首完整数据（含 lines/chars）
// public/annotations/{id}.json —— 单首注释+译文

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const raw = JSON.parse(fs.readFileSync(path.join(root, '古诗70首_完整JSON.json'), 'utf8'))
const annotations = JSON.parse(fs.readFileSync(path.join(root, 'public/annotations.json'), 'utf8'))

const poemsDir = path.join(root, 'public/poems')
const annoDir = path.join(root, 'public/annotations')
fs.mkdirSync(poemsDir, { recursive: true })
fs.mkdirSync(annoDir, { recursive: true })

// 首页索引：只含首行文字，不含拼音/chars
const index = raw.poems.map(p => ({
  id: p.id,
  title: p.title,
  dynasty: p.dynasty ?? null,
  author: p.author,
  firstLine: p.lines[0]?.text ?? '',
}))
fs.writeFileSync(path.join(poemsDir, 'index.json'), JSON.stringify(index))
console.log(`index.json: ${(JSON.stringify(index).length / 1024).toFixed(1)} KB`)

// 单首诗完整数据（lines/chars/pinyin）
for (const p of raw.poems) {
  const out = { id: p.id, title: p.title, dynasty: p.dynasty ?? null, author: p.author, lines: p.lines }
  fs.writeFileSync(path.join(poemsDir, `${p.id}.json`), JSON.stringify(out))
}
console.log(`${raw.poems.length} poem files written`)

// 单首注释
const annoMap = {}
for (const a of (annotations.poems ?? [])) {
  annoMap[a.id] = a
}
for (const p of raw.poems) {
  const a = annoMap[p.id] ?? { id: p.id, notes: null, translation: null }
  fs.writeFileSync(path.join(annoDir, `${p.id}.json`), JSON.stringify(a))
}
console.log(`${raw.poems.length} annotation files written`)
