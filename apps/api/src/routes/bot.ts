import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'
import { recommend } from '../lib/recommender'

type BotBindings = AppContext['Bindings'] & { GEMINI_API_KEY?: string }

const bot = new Hono<{ Bindings: BotBindings; Variables: AppContext['Variables'] }>()

type Intent = 'recommend' | 'ingredient_query' | 'preference_update' | 'weekly_plan' | 'unknown'

interface BotParams {
  meal_type?: string
  flavors?: string[]
  ingredients?: string[]
  action?: string
  target_type?: string
  target_value?: string
}

async function detectIntent(
  message: string,
  apiKey: string | undefined
): Promise<{ intent: Intent; params: BotParams }> {
  if (!apiKey) return fallbackIntent(message)

  const prompt = `你是今日膳AI助手，分析用户输入并返回JSON。
意图类型：recommend(推荐菜)、ingredient_query(以食材找菜)、preference_update(更新偏好)、weekly_plan(周计划)、unknown
只返回JSON，格式：{"intent":"...","params":{...}}
params示例：{"meal_type":"dinner","flavors":["清淡"],"ingredients":["土豆","排骨"]}
用户输入：${message}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    )
    const data = await res.json() as {
      candidates?: { content: { parts: { text: string }[] } }[]
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const json = text.match(/\{[\s\S]*\}/)?.[0]
    if (json) return JSON.parse(json) as { intent: Intent; params: BotParams }
  } catch {
    // fall through to fallback
  }
  return fallbackIntent(message)
}

function fallbackIntent(message: string): { intent: Intent; params: BotParams } {
  const lower = message.toLowerCase()
  if (lower.includes('吃什么') || lower.includes('推荐')) {
    return { intent: 'recommend', params: { meal_type: 'dinner' } }
  }
  if (lower.includes('清淡')) return { intent: 'recommend', params: { flavors: ['清淡'] } }
  if (lower.includes('辣')) return { intent: 'recommend', params: { flavors: ['麻辣', '辣'] } }
  if (lower.includes('周计划') || lower.includes('这周')) return { intent: 'weekly_plan', params: {} }
  return { intent: 'recommend', params: { meal_type: 'dinner' } }
}

bot.post('/message', authMiddleware, async (c) => {
  const { family_id, message, context } = await c.req.json<{
    family_id: number
    message: string
    context?: { meal_type?: string; date?: string }
  }>()

  if (!message?.trim()) return c.json({ error: '消息不能为空' }, 400)

  const apiKey = (c.env as BotBindings).GEMINI_API_KEY
  const { intent, params } = await detectIntent(message, apiKey)

  const date = context?.date ?? new Date().toISOString().slice(0, 10)
  const mealType = params.meal_type ?? context?.meal_type ?? 'dinner'

  let reply = ''
  let cards: unknown[] = []

  if (intent === 'recommend' || intent === 'ingredient_query') {
    const recipes = await recommend({
      familyId: family_id,
      date,
      mealType,
      count: 3,
      db: c.env.DB,
      ...(params.flavors?.length ? { guestFlavors: params.flavors } : {}),
    })

    const mealLabel = mealType === 'dinner' ? '晚餐' : mealType === 'lunch' ? '午餐' : '早餐'
    reply = recipes.length > 0
      ? `为你推荐今天的${mealLabel}，都是根据你的口味挑选的：`
      : '暂时没有符合条件的推荐，试试其他条件？'

    cards = recipes.map(r => ({
      recipe_id: r.id,
      name: r.name,
      tags: [r.cuisine, ...(Array.isArray(r.flavors) ? r.flavors.slice(0, 2) : [])],
      cook_time: r.cook_time,
      actions: ['accept', 'reject', 'swap', 'view_detail'],
    }))
  } else if (intent === 'weekly_plan') {
    reply = '周计划功能需要在周计划页面操作，我帮你跳转过去？'
  } else {
    reply = '我可以帮你推荐今天吃什么，或者根据冰箱食材找菜谱。试试说"今晚吃什么"？'
  }

  return c.json({ data: { reply, intent, cards } })
})

export default bot
