import { useState, useEffect, useCallback } from 'react'
import { useShareCard } from '../contexts/ShareCardContext'
import { useProgress } from '../hooks/useProgress'
import { getLevelTitle } from '../utils/levelTitle'
import { loadPoem, loadPoemIndex } from '../data/poems'
import type { Poem, PoemSummary } from '../data/poems'
import { storage } from '../lib/storage'
import './ShareCardModal.css'

const NICKNAME_KEY = 'poem_nickname'
async function loadNickname(): Promise<string> {
  try { return await storage.get(NICKNAME_KEY) ?? '小诗人' } catch { return '小诗人' }
}
function todayLabel(): string {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}
function getPoemImageUrl(id: number): string {
  const ext = [56, 59, 60, 65].includes(id) ? 'png' : 'webp'
  return `/images/poem_${String(id).padStart(2, '0')}.${ext}`
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

const SCALE = 3
const W = 300

// 绘制古诗卡片
async function drawPoemCard(
  poem: Poem,
  poemSummary: PoemSummary | null,
  bgImg: HTMLImageElement | null,
): Promise<string> {
  await document.fonts.ready

  const PADDING_X = 28
  const TITLE_TOP = 24
  const TITLE_FONT_SIZE = 32
  const TITLE_H = 40        // 固定行高，不用乘数
  const AUTHOR_FONT_SIZE = 11
  const AUTHOR_H = 20       // 固定行高
  const DIVIDER_H = 16
  const PINYIN_H = 14       // 拼音行固定高度
  const CHAR_FONT_SIZE = 26
  const CHAR_H = 32         // 汉字行固定高度
  const LINE_GAP = 6
  const CONTENT_BOTTOM = 28
  const FOOTER_H = 52
  const CHAR_W = 34

  // 精确计算内容高度（全部用固定值，无乘数）
  const linesH = poem.lines.length * (PINYIN_H + CHAR_H) + (poem.lines.length - 1) * LINE_GAP
  const H = TITLE_TOP + TITLE_H + 6 + AUTHOR_H + DIVIDER_H + linesH + CONTENT_BOTTOM + FOOTER_H

  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)

  // 背景（用 H 整数高度完整填充）
  if (bgImg) {
    const sw = bgImg.naturalWidth, sh = bgImg.naturalHeight
    const sc = Math.max(W / sw, H / sh)
    const nw = sw * sc, nh = sh * sc
    ctx.drawImage(bgImg, (W - nw) / 2, (H - nh) / 2, nw, nh)
    ctx.fillStyle = 'rgba(0,0,0,0.48)'
    ctx.fillRect(0, 0, W, H)
  } else {
    ctx.fillStyle = '#2C1008'
    ctx.fillRect(0, 0, W, H)
  }

  // 标题
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#ffffff'
  ctx.font = `${TITLE_FONT_SIZE}px 'Ma Shan Zheng', cursive`
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 8
  ctx.fillText(poem.title, W / 2, TITLE_TOP + TITLE_FONT_SIZE)
  ctx.shadowBlur = 0

  // 作者
  let y = TITLE_TOP + TITLE_H + 6
  const authorText = (poemSummary?.dynasty ? `【${poemSummary.dynasty}】` : '') + (poemSummary?.author ?? '')
  ctx.font = `${AUTHOR_FONT_SIZE}px 'PingFang SC', sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.fillText(authorText, W / 2, y + AUTHOR_FONT_SIZE)
  y += AUTHOR_H

  // 分隔线
  const gradL = ctx.createLinearGradient(W / 2 - 20, 0, W / 2 + 20, 0)
  gradL.addColorStop(0, 'transparent')
  gradL.addColorStop(0.5, 'rgba(255,248,225,0.45)')
  gradL.addColorStop(1, 'transparent')
  ctx.strokeStyle = gradL
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(W / 2 - 20, y + 6)
  ctx.lineTo(W / 2 + 20, y + 6)
  ctx.stroke()
  y += DIVIDER_H

  // 诗句
  for (let li = 0; li < poem.lines.length; li++) {
    const chars = poem.lines[li].chars
    const lineW = chars.length * CHAR_W
    const startX = (W - lineW) / 2

    // 拼音行（baseline = top + PINYIN_H）
    ctx.font = `9px 'PingFang SC', sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.82)'
    ctx.textBaseline = 'alphabetic'
    for (let i = 0; i < chars.length; i++) {
      if (chars[i].pinyin) {
        ctx.fillText(chars[i].pinyin!, startX + i * CHAR_W + CHAR_W / 2, y + 10)
      }
    }
    y += PINYIN_H

    // 汉字行
    ctx.font = `${CHAR_FONT_SIZE}px 'Ma Shan Zheng', cursive`
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = 5
    for (let i = 0; i < chars.length; i++) {
      ctx.fillText(chars[i].char, startX + i * CHAR_W + CHAR_W / 2, y + CHAR_FONT_SIZE)
    }
    ctx.shadowBlur = 0
    y += CHAR_H
    if (li < poem.lines.length - 1) y += LINE_GAP
  }

  y += CONTENT_BOTTOM

  // 底栏背景（精确从 y 到 y+FOOTER_H，canvas 总高 H = y+FOOTER_H）
  ctx.fillStyle = 'rgba(0,0,0,0.38)'
  ctx.fillRect(0, y, W, FOOTER_H)

  // icon
  const iconImg = await loadImage('/icon.png')
  if (iconImg) {
    const ICON_SIZE = 32
    const ix = PADDING_X
    const iy = y + (FOOTER_H - ICON_SIZE) / 2
    ctx.save()
    ctx.beginPath()
    const r = 7
    ctx.moveTo(ix + r, iy)
    ctx.lineTo(ix + ICON_SIZE - r, iy)
    ctx.quadraticCurveTo(ix + ICON_SIZE, iy, ix + ICON_SIZE, iy + r)
    ctx.lineTo(ix + ICON_SIZE, iy + ICON_SIZE - r)
    ctx.quadraticCurveTo(ix + ICON_SIZE, iy + ICON_SIZE, ix + ICON_SIZE - r, iy + ICON_SIZE)
    ctx.lineTo(ix + r, iy + ICON_SIZE)
    ctx.quadraticCurveTo(ix, iy + ICON_SIZE, ix, iy + ICON_SIZE - r)
    ctx.lineTo(ix, iy + r)
    ctx.quadraticCurveTo(ix, iy, ix + r, iy)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(iconImg, ix, iy, ICON_SIZE, ICON_SIZE)
    ctx.restore()
  }

  // 品牌文字：两行作为整体垂直居中
  // 大字15px + 间距4px + 小字9px = 28px 总高，居中于 FOOTER_H
  const textX = PADDING_X + 40
  const textBlockH = 15 + 4 + 9
  const textBlockTop = y + (FOOTER_H - textBlockH) / 2
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.font = `15px 'ZCOOL KuaiLe', sans-serif`
  ctx.fillStyle = 'rgba(255,248,225,0.85)'
  ctx.fillText('古诗小课堂', textX, textBlockTop)
  ctx.font = `9px 'PingFang SC', sans-serif`
  ctx.fillStyle = 'rgba(255,248,225,0.45)'
  ctx.fillText('每天一首，积累经典', textX, textBlockTop + 15 + 4)
  ctx.textBaseline = 'alphabetic'

  return canvas.toDataURL('image/png')
}

// 绘制打卡卡片
async function drawCheckinCard(
  nickname: string,
  rankTitle: string,
  dateStr: string,
  todayCount: number,
  todayPoemTitle: string | null,
  streakCount: number,
  totalMemorized: number,
  masteredCount: number,
): Promise<string> {
  await document.fonts.ready

  const HEADER_H = 140
  const BODY_H = 180
  const FOOTER_H = 48
  const totalH = HEADER_H + BODY_H + FOOTER_H

  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = totalH * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)

  // 红色头部
  ctx.fillStyle = '#C62828'
  ctx.fillRect(0, 0, W, HEADER_H)

  // 装饰圆
  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  ctx.beginPath(); ctx.arc(W - 20, -30, 80, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  ctx.beginPath(); ctx.arc(W - 60, HEADER_H + 10, 55, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  ctx.beginPath(); ctx.arc(-10, 50, 40, 0, Math.PI * 2); ctx.fill()

  // 日期
  ctx.textAlign = 'left'
  ctx.font = `10px 'PingFang SC', sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillText(dateStr, 20, 28)

  // 今日打卡 标签
  ctx.font = `9px 'PingFang SC', sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.fillText('今日打卡', 20, 50)

  // 昵称
  ctx.font = `42px 'ZCOOL KuaiLe', sans-serif`
  ctx.fillStyle = '#ffffff'
  ctx.fillText(nickname, 20, 96)

  // 称号胶囊
  const capsuleX = 20
  const capsuleY = 106
  const capsuleW = ctx.measureText(rankTitle).width + 28
  const capsuleH = 20
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.beginPath()
  ctx.roundRect(capsuleX, capsuleY, capsuleW, capsuleH, 999)
  ctx.fill()
  // 小圆点
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.beginPath(); ctx.arc(capsuleX + 10, capsuleY + capsuleH / 2, 3, 0, Math.PI * 2); ctx.fill()
  ctx.font = `10px 'PingFang SC', sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.fillText(rankTitle, capsuleX + 18, capsuleY + 13)

  // 白色主体
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, HEADER_H, W, BODY_H)

  // 今日背诗卡片
  const todayText = todayCount === 0 ? '今日休息'
    : todayCount === 1 && todayPoemTitle ? `《${todayPoemTitle}》`
    : `背了 ${todayCount} 首`
  const cardY = HEADER_H + 14
  ctx.fillStyle = '#FBF6F0'
  ctx.beginPath(); ctx.roundRect(16, cardY, W - 32, 52, 10); ctx.fill()
  ctx.fillStyle = '#C62828'
  ctx.fillRect(16, cardY, 3, 52)
  ctx.beginPath(); ctx.roundRect(16, cardY, 3, 52, [10, 0, 0, 10]); ctx.fill()
  ctx.font = `9px 'PingFang SC', sans-serif`
  ctx.fillStyle = '#A07050'
  ctx.textAlign = 'left'
  ctx.fillText('今日背诗', 26, cardY + 16)
  ctx.font = `18px 'Ma Shan Zheng', cursive`
  ctx.fillStyle = '#2C1008'
  ctx.fillText(todayText, 26, cardY + 38)

  // 三格统计
  const stats = [
    { num: streakCount, label: '坚持天数' },
    { num: totalMemorized, label: '已背诵' },
    { num: masteredCount, label: '已掌握' },
  ]
  const cellW = (W - 32 - 16) / 3
  const cellY = HEADER_H + 14 + 52 + 10
  for (let i = 0; i < stats.length; i++) {
    const cx = 16 + i * (cellW + 8)
    ctx.fillStyle = '#FBF6F0'
    ctx.beginPath(); ctx.roundRect(cx, cellY, cellW, 60, 10); ctx.fill()
    ctx.font = `28px 'ZCOOL KuaiLe', sans-serif`
    ctx.fillStyle = '#C62828'
    ctx.textAlign = 'center'
    ctx.fillText(String(stats[i].num), cx + cellW / 2, cellY + 36)
    ctx.font = `9px 'PingFang SC', sans-serif`
    ctx.fillStyle = '#A07050'
    ctx.fillText(stats[i].label, cx + cellW / 2, cellY + 52)
  }

  // 底栏
  const footerY = HEADER_H + BODY_H
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, footerY, W, FOOTER_H)
  ctx.strokeStyle = '#F0E8DC'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(16, footerY); ctx.lineTo(W - 16, footerY); ctx.stroke()

  const iconImg = await loadImage('/icon.png')
  if (iconImg) {
    const ix = 16; const iy = footerY + (FOOTER_H - 28) / 2
    ctx.save()
    ctx.beginPath()
    const r = 6
    ctx.moveTo(ix + r, iy)
    ctx.lineTo(ix + 28 - r, iy)
    ctx.quadraticCurveTo(ix + 28, iy, ix + 28, iy + r)
    ctx.lineTo(ix + 28, iy + 28 - r)
    ctx.quadraticCurveTo(ix + 28, iy + 28, ix + 28 - r, iy + 28)
    ctx.lineTo(ix + r, iy + 28)
    ctx.quadraticCurveTo(ix, iy + 28, ix, iy + 28 - r)
    ctx.lineTo(ix, iy + r)
    ctx.quadraticCurveTo(ix, iy, ix + r, iy)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(iconImg, ix, iy, 28, 28)
    ctx.restore()
  }
  ctx.textAlign = 'left'
  ctx.font = `13px 'ZCOOL KuaiLe', sans-serif`
  ctx.fillStyle = '#6B4226'
  ctx.fillText('古诗小课堂', 52, footerY + FOOTER_H / 2 + 1)
  ctx.font = `8px 'PingFang SC', sans-serif`
  ctx.fillStyle = '#B08060'
  ctx.fillText('每天一首，积累经典', 52, footerY + FOOTER_H / 2 + 13)

  return canvas.toDataURL('image/png')
}

// 绘制里程碑卡片
async function drawMilestoneCard(
  nickname: string,
  count: number,
  title: string,
  recentPoems: string[],
): Promise<string> {
  await document.fonts.ready
  const HEADER_H = 150
  const BODY_H = 160
  const FOOTER_H = 48
  const totalH = HEADER_H + BODY_H + FOOTER_H

  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = totalH * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)

  // 头部渐变
  const grad = ctx.createLinearGradient(0, 0, W, HEADER_H)
  grad.addColorStop(0, '#B71C1C')
  grad.addColorStop(1, '#C62828')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, HEADER_H)

  // 装饰圆
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.beginPath(); ctx.arc(W + 10, -20, 90, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  ctx.beginPath(); ctx.arc(-20, HEADER_H - 10, 60, 0, Math.PI * 2); ctx.fill()

  // 「第 N 首」大字
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `11px 'PingFang SC', sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillText('里程碑达成', 20, 32)

  ctx.font = `56px 'ZCOOL KuaiLe', sans-serif`
  ctx.fillStyle = '#ffffff'
  ctx.fillText(`第 ${count} 首`, 20, 96)

  // 称号胶囊
  const capsuleX = 20, capsuleY = 108
  const capsuleW = ctx.measureText(title).width + 28
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.beginPath(); ctx.roundRect(capsuleX, capsuleY, capsuleW, 22, 999); ctx.fill()
  ctx.font = `11px 'PingFang SC', sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText(title, capsuleX + 14, capsuleY + 14)

  // 白色主体
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, HEADER_H, W, BODY_H)

  // 昵称 + 说明
  ctx.textAlign = 'left'
  ctx.font = `13px 'PingFang SC', sans-serif`
  ctx.fillStyle = '#A07050'
  ctx.fillText(`${nickname} 已背诵`, 20, HEADER_H + 24)

  // 最近背的诗
  if (recentPoems.length > 0) {
    const poemText = recentPoems.slice(0, 3).map(t => `《${t}》`).join('  ')
    ctx.font = `16px 'Ma Shan Zheng', cursive`
    ctx.fillStyle = '#2C1008'
    ctx.fillText(poemText, 20, HEADER_H + 52)
  }

  // 分隔线
  ctx.strokeStyle = '#F0E8DC'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(20, HEADER_H + 68); ctx.lineTo(W - 20, HEADER_H + 68); ctx.stroke()

  // 鼓励文字
  ctx.textAlign = 'center'
  ctx.font = `13px 'PingFang SC', sans-serif`
  ctx.fillStyle = '#C62828'
  ctx.fillText('继续加油，诗书万卷！', W / 2, HEADER_H + 100)

  ctx.font = `10px 'PingFang SC', sans-serif`
  ctx.fillStyle = '#B08060'
  ctx.fillText('古诗小课堂 · 每天一首，积累经典', W / 2, HEADER_H + 120)

  // 底栏
  const footerY = HEADER_H + BODY_H
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, footerY, W, FOOTER_H)
  ctx.strokeStyle = '#F0E8DC'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(16, footerY); ctx.lineTo(W - 16, footerY); ctx.stroke()

  const iconImg = await loadImage('/icon.png')
  if (iconImg) {
    const ix = 16, iy = footerY + (FOOTER_H - 28) / 2
    ctx.save()
    ctx.beginPath()
    const r = 6
    ctx.moveTo(ix + r, iy); ctx.lineTo(ix + 28 - r, iy)
    ctx.quadraticCurveTo(ix + 28, iy, ix + 28, iy + r)
    ctx.lineTo(ix + 28, iy + 28 - r)
    ctx.quadraticCurveTo(ix + 28, iy + 28, ix + 28 - r, iy + 28)
    ctx.lineTo(ix + r, iy + 28)
    ctx.quadraticCurveTo(ix, iy + 28, ix, iy + 28 - r)
    ctx.lineTo(ix, iy + r)
    ctx.quadraticCurveTo(ix, iy, ix + r, iy)
    ctx.closePath(); ctx.clip()
    ctx.drawImage(iconImg, ix, iy, 28, 28)
    ctx.restore()
  }
  ctx.textAlign = 'left'
  ctx.font = `13px 'ZCOOL KuaiLe', sans-serif`
  ctx.fillStyle = '#6B4226'
  ctx.fillText('古诗小课堂', 52, footerY + FOOTER_H / 2 + 1)
  ctx.font = `8px 'PingFang SC', sans-serif`
  ctx.fillStyle = '#B08060'
  ctx.fillText('每天一首，积累经典', 52, footerY + FOOTER_H / 2 + 13)

  return canvas.toDataURL('image/png')
}

// 绘制满星成就卡片
async function drawPerfectCard(
  nickname: string,
  poemTitle: string,
  firstLine: string,
): Promise<string> {
  await document.fonts.ready
  const HEADER_H = 150
  const BODY_H = 160
  const FOOTER_H = 48
  const totalH = HEADER_H + BODY_H + FOOTER_H

  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = totalH * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)

  // 头部
  const grad = ctx.createLinearGradient(0, 0, W, HEADER_H)
  grad.addColorStop(0, '#B71C1C')
  grad.addColorStop(1, '#C62828')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, HEADER_H)

  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.beginPath(); ctx.arc(W + 10, -20, 90, 0, Math.PI * 2); ctx.fill()

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `11px 'PingFang SC', sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillText('无提示背诵达成', 20, 32)

  ctx.font = `36px 'Ma Shan Zheng', cursive`
  ctx.fillStyle = '#ffffff'
  ctx.fillText(`《${poemTitle}》`, 20, 80)

  // 三星
  ctx.font = `22px 'PingFang SC', sans-serif`
  ctx.fillStyle = '#FFD54F'
  ctx.fillText('★★★', 20, 114)

  ctx.font = `11px 'PingFang SC', sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.fillText('无提示完整背出', 20, 130)

  // 白色主体
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, HEADER_H, W, BODY_H)

  // 第一句诗
  const cardY = HEADER_H + 14
  ctx.fillStyle = '#FBF6F0'
  ctx.beginPath(); ctx.roundRect(16, cardY, W - 32, 60, 10); ctx.fill()
  ctx.fillStyle = '#C62828'
  ctx.beginPath(); ctx.roundRect(16, cardY, 3, 60, [10, 0, 0, 10]); ctx.fill()
  ctx.font = `10px 'PingFang SC', sans-serif`
  ctx.fillStyle = '#A07050'
  ctx.textAlign = 'left'
  ctx.fillText('诗句节选', 26, cardY + 18)
  ctx.font = `18px 'Ma Shan Zheng', cursive`
  ctx.fillStyle = '#2C1008'
  ctx.fillText(firstLine, 26, cardY + 44)

  // 昵称 + 鼓励
  ctx.font = `13px 'PingFang SC', sans-serif`
  ctx.fillStyle = '#A07050'
  ctx.textAlign = 'left'
  ctx.fillText(`${nickname} 无提示背出了这首诗！`, 20, HEADER_H + 100)

  ctx.font = `11px 'PingFang SC', sans-serif`
  ctx.fillStyle = '#C62828'
  ctx.fillText('继续挑战下一首吧', 20, HEADER_H + 122)

  // 底栏
  const footerY = HEADER_H + BODY_H
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, footerY, W, FOOTER_H)
  ctx.strokeStyle = '#F0E8DC'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(16, footerY); ctx.lineTo(W - 16, footerY); ctx.stroke()

  const iconImg = await loadImage('/icon.png')
  if (iconImg) {
    const ix = 16, iy = footerY + (FOOTER_H - 28) / 2
    ctx.save()
    ctx.beginPath()
    const r = 6
    ctx.moveTo(ix + r, iy); ctx.lineTo(ix + 28 - r, iy)
    ctx.quadraticCurveTo(ix + 28, iy, ix + 28, iy + r)
    ctx.lineTo(ix + 28, iy + 28 - r)
    ctx.quadraticCurveTo(ix + 28, iy + 28, ix + 28 - r, iy + 28)
    ctx.lineTo(ix + r, iy + 28)
    ctx.quadraticCurveTo(ix, iy + 28, ix, iy + 28 - r)
    ctx.lineTo(ix, iy + r)
    ctx.quadraticCurveTo(ix, iy, ix + r, iy)
    ctx.closePath(); ctx.clip()
    ctx.drawImage(iconImg, ix, iy, 28, 28)
    ctx.restore()
  }
  ctx.textAlign = 'left'
  ctx.font = `13px 'ZCOOL KuaiLe', sans-serif`
  ctx.fillStyle = '#6B4226'
  ctx.fillText('古诗小课堂', 52, footerY + FOOTER_H / 2 + 1)
  ctx.font = `8px 'PingFang SC', sans-serif`
  ctx.fillStyle = '#B08060'
  ctx.fillText('每天一首，积累经典', 52, footerY + FOOTER_H / 2 + 13)

  return canvas.toDataURL('image/png')
}

// 绘制周报卡片
async function drawWeeklyCard(
  newCount: number,
  checkInDays: number,
  streakCount: number,
  hardPoemTitle: string | null,
  totalChars: number,
  totalMemorized: number,
  weekStart: string,
  weekEnd: string,
  poemTitles: string[],
): Promise<string> {
  await document.fonts.ready
  const HEADER_H = 130
  const BODY_H = 200
  const FOOTER_H = 48
  const totalH = HEADER_H + BODY_H + FOOTER_H

  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = totalH * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)

  // 头部
  const grad = ctx.createLinearGradient(0, 0, W, HEADER_H)
  grad.addColorStop(0, '#B71C1C')
  grad.addColorStop(1, '#C62828')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, HEADER_H)

  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.beginPath(); ctx.arc(W + 10, -20, 90, 0, Math.PI * 2); ctx.fill()

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  ctx.font = `10px 'PingFang SC', sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  // 日期范围
  const ws = new Date(weekStart + 'T00:00:00')
  const we = new Date(weekEnd + 'T00:00:00')
  const rangeStr = `${ws.getMonth()+1}月${ws.getDate()}日 – ${we.getMonth()+1}月${we.getDate()}日`
  ctx.fillText(rangeStr, 20, 26)

  ctx.font = `13px 'PingFang SC', sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fillText('本周学习报告', 20, 48)

  ctx.font = `42px 'ZCOOL KuaiLe', sans-serif`
  ctx.fillStyle = '#ffffff'
  ctx.fillText(`背了 ${newCount} 首`, 20, 96)

  ctx.font = `12px 'PingFang SC', sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.fillText(`打卡 ${checkInDays} 天  连续 ${streakCount} 天`, 20, 118)

  // 白色主体
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, HEADER_H, W, BODY_H)

  // 诗名列表
  if (poemTitles.length > 0) {
    ctx.font = `13px 'Ma Shan Zheng', cursive`
    ctx.fillStyle = '#2C1008'
    ctx.textAlign = 'left'
    const text = poemTitles.slice(0, 4).map(t => `《${t}》`).join('  ')
    ctx.fillText(text, 20, HEADER_H + 28)
  }

  // 分隔线
  ctx.strokeStyle = '#F0E8DC'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(20, HEADER_H + 42); ctx.lineTo(W - 20, HEADER_H + 42); ctx.stroke()

  // 最难克服
  if (hardPoemTitle) {
    ctx.font = `11px 'PingFang SC', sans-serif`
    ctx.fillStyle = '#A07050'
    ctx.fillText('最难克服', 20, HEADER_H + 64)
    ctx.font = `16px 'Ma Shan Zheng', cursive`
    ctx.fillStyle = '#C62828'
    ctx.fillText(`《${hardPoemTitle}》`, 20, HEADER_H + 86)
    ctx.font = `10px 'PingFang SC', sans-serif`
    ctx.fillStyle = '#B08060'
    ctx.fillText('仍在挑战中，继续加油！', 20, HEADER_H + 104)
  }

  // 累计数据
  const statsY = HEADER_H + (hardPoemTitle ? 124 : 70)
  ctx.font = `11px 'PingFang SC', sans-serif`
  ctx.fillStyle = '#A07050'
  ctx.fillText('累计进度', 20, statsY)
  ctx.font = `15px 'ZCOOL KuaiLe', sans-serif`
  ctx.fillStyle = '#C62828'
  ctx.fillText(`${totalMemorized} / 70 首`, 20, statsY + 22)
  ctx.font = `11px 'PingFang SC', sans-serif`
  ctx.fillStyle = '#A07050'
  ctx.fillText(`${totalChars.toLocaleString()} 字`, 20, statsY + 40)

  // 底栏
  const footerY = HEADER_H + BODY_H
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, footerY, W, FOOTER_H)
  ctx.strokeStyle = '#F0E8DC'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(16, footerY); ctx.lineTo(W - 16, footerY); ctx.stroke()

  const iconImg = await loadImage('/icon.png')
  if (iconImg) {
    const ix = 16, iy = footerY + (FOOTER_H - 28) / 2
    ctx.save()
    ctx.beginPath()
    const r = 6
    ctx.moveTo(ix + r, iy); ctx.lineTo(ix + 28 - r, iy)
    ctx.quadraticCurveTo(ix + 28, iy, ix + 28, iy + r)
    ctx.lineTo(ix + 28, iy + 28 - r)
    ctx.quadraticCurveTo(ix + 28, iy + 28, ix + 28 - r, iy + 28)
    ctx.lineTo(ix + r, iy + 28)
    ctx.quadraticCurveTo(ix, iy + 28, ix, iy + 28 - r)
    ctx.lineTo(ix, iy + r)
    ctx.quadraticCurveTo(ix, iy, ix + r, iy)
    ctx.closePath(); ctx.clip()
    ctx.drawImage(iconImg, ix, iy, 28, 28)
    ctx.restore()
  }
  ctx.textAlign = 'left'
  ctx.font = `13px 'ZCOOL KuaiLe', sans-serif`
  ctx.fillStyle = '#6B4226'
  ctx.fillText('古诗小课堂', 52, footerY + FOOTER_H / 2 + 1)
  ctx.font = `8px 'PingFang SC', sans-serif`
  ctx.fillStyle = '#B08060'
  ctx.fillText('每天一首，积累经典', 52, footerY + FOOTER_H / 2 + 13)

  return canvas.toDataURL('image/png')
}

export default function ShareCardModal() {
  const { params, close } = useShareCard()
  const { totalMemorized, masteredCount, memorizeHistory, streakCount } = useProgress()

  const [nickname, setNickname] = useState('小诗人')
  const rankTitle = getLevelTitle(totalMemorized)

  useEffect(() => { loadNickname().then(setNickname) }, [])
  const today = new Date().toISOString().slice(0, 10)
  const todayPoems = memorizeHistory.filter(r => r.date === today)
  const todayCount = todayPoems.length

  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [showGenerating, setShowGenerating] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [showSaveTip, setShowSaveTip] = useState(false)

  // 锁定背景滚动
  useEffect(() => {
    if (params) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [params])

  // 每次打开重置并生成
  const generate = useCallback(async () => {
    if (!params) return
    setImgUrl(null)
    setShowGenerating(true)
    setSharing(false)
    setShowSaveTip(false)
    const startTime = Date.now()

    try {
      let url: string
      if (params.type === 'poem' && params.poemId) {
        const [poem, idx, bgImg] = await Promise.all([
          loadPoem(params.poemId),
          loadPoemIndex(),
          loadImage(getPoemImageUrl(params.poemId)),
        ])
        if (!poem) throw new Error('poem not found')
        const summary = idx.find(p => p.id === params.poemId!) ?? null
        url = await drawPoemCard(poem, summary, bgImg)
      } else if (params.type === 'milestone') {
        const idx = await loadPoemIndex()
        const recentPoems = (memorizeHistory.slice(-3).reverse()
          .map(r => idx.find(p => p.id === r.id)?.title ?? null)
          .filter(Boolean) as string[])
        url = await drawMilestoneCard(
          nickname,
          params.milestoneCount ?? memorizeHistory.length,
          params.milestoneTitle ?? '里程碑',
          recentPoems,
        )
      } else if (params.type === 'perfect') {
        url = await drawPerfectCard(
          nickname,
          params.perfectPoemTitle ?? '',
          params.perfectFirstLine ?? '',
        )
      } else if (params.type === 'weekly') {
        url = await drawWeeklyCard(
          params.weeklyNewCount ?? 0,
          params.weeklyCheckInDays ?? 0,
          params.weeklyStreakCount ?? 0,
          params.weeklyHardPoemTitle ?? null,
          params.weeklyTotalChars ?? 0,
          params.weeklyTotalMemorized ?? 0,
          params.weeklyStart ?? '',
          params.weeklyEnd ?? '',
          params.weeklyPoemTitles ?? [],
        )
      } else {
        // checkin
        let todayPoemTitle: string | null = null
        if (todayPoems.length === 1) {
          const idx = await loadPoemIndex()
          todayPoemTitle = idx.find(p => p.id === todayPoems[0].id)?.title ?? null
        }
        url = await drawCheckinCard(
          nickname, rankTitle, todayLabel(),
          todayCount, todayPoemTitle,
          streakCount, totalMemorized, masteredCount,
        )
      }

      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 2000 - elapsed)
      setTimeout(() => {
        setImgUrl(url)
        setShowGenerating(false)
      }, remaining)
    } catch (e) {
      console.error('draw card error', e)
      setShowGenerating(false)
    }
  }, [params, nickname, rankTitle, todayCount, todayPoems, streakCount, totalMemorized, masteredCount])

  useEffect(() => {
    if (!params) return
    setImgUrl(null)
    setShowGenerating(false)
    // 等弹窗动画完成（280ms）后再开始绘制，避免卡顿
    const t = setTimeout(() => { generate() }, 320)
    return () => clearTimeout(t)
  }, [params])

  async function handleShare() {
    if (!imgUrl) return
    setSharing(true)
    try {
      const res = await fetch(imgUrl)
      const blob = await res.blob()
      const file = new File([blob], 'poem-card.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${nickname}的古诗成果` })
      } else {
        setShowSaveTip(true)
        setTimeout(() => setShowSaveTip(false), 3000)
      }
    } catch { /* 用户取消 */ } finally {
      setSharing(false)
    }
  }

  if (!params) return null
  const titleMap: Record<string, string> = {
    poem: '分享这首诗',
    checkin: '今日打卡',
    milestone: '里程碑达成',
    perfect: '满星成就',
    weekly: '分享本周报告',
  }
  const cardTitle = titleMap[params.type] ?? '分享'

  return (
    <>
      <div className="scm-backdrop" onClick={close} />
      <div className="scm-sheet">
        <div className="scm-handle-bar"><div className="scm-handle" /></div>

        <div className="scm-header">
          <span className="scm-title">{cardTitle}</span>
          <button className="scm-close" onClick={close}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="scm-preview-area">
          {showGenerating && (
            <div className="scm-generating-ui">
              <div className="scm-ripple-wrap">
                <div className="scm-ripple-ring" style={{ animationDelay:'0ms' }} />
                <div className="scm-ripple-ring" style={{ animationDelay:'700ms' }} />
                <div className="scm-ripple-ring" style={{ animationDelay:'1400ms' }} />
                <div className="scm-ripple-core" />
              </div>
              <p className="scm-generating-text">正在生成卡片…</p>
            </div>
          )}
          {!showGenerating && imgUrl && (
            <div className="scm-preview-wrap">
              <img src={imgUrl} className="scm-preview" alt="分享卡片" />
            </div>
          )}
          {!showGenerating && !imgUrl && (
            <div className="scm-generating-ui">
              <div className="scm-ripple-wrap">
                <div className="scm-ripple-ring" style={{ animationDelay:'0ms' }} />
                <div className="scm-ripple-ring" style={{ animationDelay:'700ms' }} />
                <div className="scm-ripple-ring" style={{ animationDelay:'1400ms' }} />
                <div className="scm-ripple-core" />
              </div>
              <p className="scm-generating-text">准备中…</p>
            </div>
          )}
        </div>

        {showSaveTip && <p className="scm-save-tip">长按图片保存到相册</p>}
        <p className="scm-hint">长按图片可保存，或点击下方按钮分享</p>

        <div className="scm-actions">
          <button className="scm-btn" onClick={handleShare} disabled={!imgUrl || sharing || showGenerating}>
            {sharing ? '请稍候…' : '分享 / 保存'}
          </button>
        </div>
      </div>

    </>
  )
}
