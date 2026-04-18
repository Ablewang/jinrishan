import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { GuestPrefs } from '../../types'
import styles from './GuestSetup.module.css'

const COMMON_ALLERGIES = ['花生', '海鲜', '香菜', '羊肉', '乳制品', '牛肉', '鸡蛋', '麸质']
const FLAVOR_TAGS = ['咸鲜', '清淡', '麻辣', '辣', '酸甜', '香浓', '酱香', '蒜香']

function saveGuestPrefs(prefs: GuestPrefs) {
  localStorage.setItem('guestPrefs', JSON.stringify(prefs))
}

export default function GuestSetup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [allergies, setAllergies] = useState<string[]>([])
  const [flavors, setFlavors] = useState<string[]>([])

  function toggle(list: string[], setList: (l: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  function finish() {
    saveGuestPrefs({ allergies, liked_flavors: flavors, swap_count: 0 })
    navigate('/home', { replace: true })
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>今日膳</h1>
        <p className={styles.sub}>帮你决定今天吃什么</p>
      </div>

      {step === 1 && (
        <div className={styles.step}>
          <h2>有没有绝对不吃的？</h2>
          <p className={styles.hint}>含有以下食材的菜不会出现在推荐里</p>
          <div className={styles.tags}>
            {COMMON_ALLERGIES.map(tag => (
              <button
                key={tag}
                className={`${styles.tag} ${allergies.includes(tag) ? styles.selected : ''}`}
                onClick={() => toggle(allergies, setAllergies, tag)}
              >
                {tag}
              </button>
            ))}
          </div>
          <button className={styles.btn} onClick={() => setStep(2)}>
            没有 / 下一步
          </button>
        </div>
      )}

      {step === 2 && (
        <div className={styles.step}>
          <h2>喜欢什么口味？</h2>
          <p className={styles.hint}>选几个你喜欢的，推荐会优先匹配</p>
          <div className={styles.tags}>
            {FLAVOR_TAGS.map(tag => (
              <button
                key={tag}
                className={`${styles.tag} ${flavors.includes(tag) ? styles.selected : ''}`}
                onClick={() => toggle(flavors, setFlavors, tag)}
              >
                {tag}
              </button>
            ))}
          </div>
          <button className={styles.btn} onClick={finish}>
            看推荐
          </button>
          <button className={styles.skip} onClick={finish}>
            跳过
          </button>
        </div>
      )}
    </div>
  )
}
