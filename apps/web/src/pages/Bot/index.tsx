import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { botApi } from '../../api/bot'
import { eventsApi } from '../../api/events'
import LoginPrompt from '../../components/LoginPrompt'
import { Paperclip, SendHorizontal, Bot as BotIcon, Sparkles } from 'lucide-react'
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
  time: string
}

const QUICK_PROMPTS = ['今晚吃什么？', '推荐快手菜', '想吃辣的', '来个素菜', '简单好做的']

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function timeStr() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const ACTION_LABEL: Record<string, string> = {
  accept: '就这个',
  reject: '换一个',
  view_detail: '看做法',
  add_to_plan: '加入计划',
}

export default function Bot() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: 'bot', text: '你好！我是你的专属 AI 助手。告诉我今天想吃什么，或者让我帮你推荐～', time: timeStr() }
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const familyId = Number(localStorage.getItem('familyId') ?? '0')

  const userInitial = user?.name?.slice(0, 1) ?? '我'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  if (!user) return <LoginPrompt title="今天想吃什么？" desc="说出你的想法或心情，AI 助手为你找到最合适的那道菜" />

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return
    const t = timeStr()
    const userMsg: Message = { id: Date.now(), role: 'user', text: text.trim(), time: t }
    const loadingMsg: Message = { id: Date.now() + 1, role: 'bot', text: '', loading: true, time: t }
    setMessages(prev => [...prev, userMsg, loadingMsg])
    setInput('')
    setSending(true)

    try {
      const res = await botApi.message(familyId, text.trim(), { date: todayStr() })
      setMessages(prev => prev.map(m =>
        m.loading ? { ...m, text: res.reply, cards: res.cards, loading: false } : m
      ))
      res.cards?.forEach(card => {
        eventsApi.post({ family_id: familyId, recipe_id: card.recipe_id, event_type: 'shown', event_date: todayStr(), source: 'bot' }).catch(() => {})
      })
    } catch {
      setMessages(prev => prev.map(m =>
        m.loading ? { ...m, text: '抱歉，出了点问题，请稍后再试', loading: false } : m
      ))
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function handleCardAction(card: BotCard, action: string) {
    eventsApi.post({
      family_id: familyId,
      recipe_id: card.recipe_id,
      event_type: action === 'reject' ? 'rejected' : 'accepted',
      event_date: todayStr(),
      source: 'bot',
    }).catch(() => {})

    if (action === 'reject') {
      sendMessage(`不想吃${card.name}，换一个`)
    } else {
      navigate(`/recipe/${card.recipe_id}`)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTitleRow}>
          <div className={styles.headerIndicator} />
          <Sparkles size={22} strokeWidth={2} className={styles.headerIcon} />
          <span className={styles.headerTitle}>AI 助手</span>
        </div>
      </header>

      <div className={styles.chatArea}>
        <div className={styles.timeDivider}>
          <span>今天</span>
        </div>

        {messages.map(msg => (
          <div key={msg.id} className={`${styles.row} ${msg.role === 'user' ? styles.rowUser : styles.rowBot}`}>
            {msg.role === 'bot' && (
              <div className={styles.avatarBot}>
                <BotIcon size={20} strokeWidth={1.5} />
              </div>
            )}
            
            <div className={styles.msgContent}>
              <div className={styles.msgMeta}>
                {msg.role === 'bot'
                  ? <><span className={styles.metaName}>AI 助手</span><span className={styles.metaTime}>{msg.time}</span></>
                  : <><span className={styles.metaTime}>{msg.time}</span><span className={styles.metaName}>我</span></>
                }
              </div>
              
              <div className={`${styles.bubbleWrapper} ${msg.role === 'user' ? styles.bubbleWrapperUser : styles.bubbleWrapperBot}`}>
                <div className={`${styles.bubble} ${msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot}`}>
                  {msg.loading ? (
                    <div className={styles.typing}>
                      <span className={styles.dot} />
                      <span className={styles.dot} />
                      <span className={styles.dot} />
                    </div>
                  ) : (
                    <>
                      {msg.text && <div className={styles.bubbleText}>{msg.text}</div>}
                      {msg.cards && msg.cards.length > 0 && (
                        <div className={styles.cards}>
                          {msg.cards.map(card => (
                            <div key={card.recipe_id} className={styles.card}>
                              <div className={styles.cardTop}>
                                <span className={styles.cardName}>{card.name}</span>
                                <span className={styles.cardTime}>{card.cook_time} min</span>
                              </div>
                              {card.tags.length > 0 && (
                                <div className={styles.cardTags}>
                                  {card.tags.map(t => <span key={t} className={styles.cardTag}>{t}</span>)}
                                </div>
                              )}
                              <div className={styles.cardActions}>
                                {card.actions.map(action => (
                                  <button
                                    key={action}
                                    className={`${styles.cardBtn} ${action === 'accept' ? styles.cardBtnPrimary : ''}`}
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
              </div>
            </div>
            
            {msg.role === 'user' && (
              <div className={styles.userAvatar}>{userInitial}</div>
            )}
          </div>
        ))}
        <div ref={bottomRef} className={styles.bottomSpacer} />
      </div>

      <div className={styles.inputAreaWrapper}>
        <div className={styles.quickPrompts}>
          {QUICK_PROMPTS.map(p => (
            <button key={p} className={styles.chip} onClick={() => sendMessage(p)} disabled={sending}>
              {p}
            </button>
          ))}
        </div>
        
        <div className={styles.inputContainer}>
          <textarea
            ref={inputRef}
            className={styles.input}
            placeholder="继续提问... (Shift+Enter 换行)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            rows={1}
          />
          <div className={styles.actionRow}>
            <button className={styles.attachBtn} disabled>
              <Paperclip size={18} />
            </button>
            <button
              className={`${styles.sendBtn} ${input.trim() ? styles.sendBtnActive : ''}`}
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || sending}
            >
              <SendHorizontal size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
