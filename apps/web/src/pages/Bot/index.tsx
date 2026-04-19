import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { botApi } from '../../api/bot'
import { eventsApi } from '../../api/events'
import LoginPrompt from '../../components/LoginPrompt'
import styles from './Bot.module.css'

interface BotCard {
  recipe_id: number
  name: string
  tags: string[]
  cook_time: number
  actions: string[]
}

interface Message {
  id: number
  role: 'user' | 'bot'
  text: string
  cards?: BotCard[]
  loading?: boolean
}

const QUICK_PROMPTS = ['今晚吃什么？', '推荐一道快手菜', '想吃辣的', '来个素菜', '有什么简单的菜？']

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function Bot() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: 'bot', text: '你好！我是今日膳助手，告诉我你今天想吃什么，或者让我来帮你推荐～' }
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const familyId = Number(localStorage.getItem('familyId') ?? '0')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!user) return <LoginPrompt title="今天想吃什么？" desc="说出你的想法或心情，膳食助手为你找到最合适的那道菜" />

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return
    const userMsg: Message = { id: Date.now(), role: 'user', text: text.trim() }
    const loadingMsg: Message = { id: Date.now() + 1, role: 'bot', text: '', loading: true }
    setMessages(prev => [...prev, userMsg, loadingMsg])
    setInput('')
    setSending(true)

    try {
      const res = await botApi.message(familyId, text.trim(), { date: todayStr() })
      setMessages(prev => prev.map(m =>
        m.loading ? { ...m, text: res.reply, cards: res.cards, loading: false } : m
      ))
      if (res.cards?.length) {
        res.cards.forEach(card => {
          eventsApi.post({
            family_id: familyId,
            recipe_id: card.recipe_id,
            event_type: 'shown',
            event_date: todayStr(),
            source: 'bot',
          }).catch(() => {})
        })
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.loading ? { ...m, text: '抱歉，出了点问题，请稍后再试', loading: false } : m
      ))
    } finally {
      setSending(false)
    }
  }

  function handleCardAction(card: BotCard, action: string) {
    if (action === 'accept' || action === 'view_detail') {
      eventsApi.post({
        family_id: familyId,
        recipe_id: card.recipe_id,
        event_type: action === 'accept' ? 'accepted' : 'accepted',
        event_date: todayStr(),
        source: 'bot',
      }).catch(() => {})
      navigate(`/recipe/${card.recipe_id}`)
    } else if (action === 'reject') {
      eventsApi.post({
        family_id: familyId,
        recipe_id: card.recipe_id,
        event_type: 'rejected',
        event_date: todayStr(),
        source: 'bot',
      }).catch(() => {})
      sendMessage(`不想吃${card.name}，换一个`)
    }
  }

  const ACTION_LABEL: Record<string, string> = {
    accept: '✓ 就这个',
    reject: '✕ 换一个',
    view_detail: '看做法',
    add_to_plan: '加入计划',
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Bot 助手</h1>
        {!user && (
          <button className={styles.loginHint} onClick={() => navigate('/auth/login')}>
            登录获取家庭专属推荐
          </button>
        )}
      </header>

      <div className={styles.messages}>
        {messages.map(msg => (
          <div key={msg.id} className={`${styles.bubble} ${msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot}`}>
            {msg.loading ? (
              <div className={styles.typing}>
                <span /><span /><span />
              </div>
            ) : (
              <>
                <p className={styles.bubbleText}>{msg.text}</p>
                {msg.cards && msg.cards.length > 0 && (
                  <div className={styles.cards}>
                    {msg.cards.map(card => (
                      <div key={card.recipe_id} className={styles.recipeCard}>
                        <div className={styles.recipeCardName}>{card.name}</div>
                        <div className={styles.recipeCardTags}>
                          {card.tags.map(t => <span key={t} className={styles.cardTag}>{t}</span>)}
                          <span className={styles.cardTag}>{card.cook_time}分钟</span>
                        </div>
                        <div className={styles.cardActions}>
                          {card.actions.map(action => (
                            <button
                              key={action}
                              className={`${styles.cardAction} ${action === 'accept' ? styles.cardActionPrimary : ''}`}
                              onClick={() => handleCardAction(card, action)}
                            >
                              {ACTION_LABEL[action] ?? action}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className={styles.quickPrompts}>
        {QUICK_PROMPTS.map(p => (
          <button key={p} className={styles.quickBtn} onClick={() => sendMessage(p)} disabled={sending}>
            {p}
          </button>
        ))}
      </div>

      <div className={styles.inputArea}>
        <input
          className={styles.input}
          type="text"
          placeholder="说说你想吃什么..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
          disabled={sending}
        />
        <button
          className={styles.sendBtn}
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || sending}
        >
          发送
        </button>
      </div>
    </div>
  )
}
