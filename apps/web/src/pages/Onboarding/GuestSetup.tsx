import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { GuestPrefs } from '../../types'
import Logo from '../../components/Logo'
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
      <div className={styles.wrapper}>
        <header className={styles.header}>
          <Logo className={styles.logo} />
          <span className={styles.stepIndicator}>Step 0{step} / 02</span>
        </header>

        <main className={styles.main}>
          {step === 1 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}>
                <h1 className={styles.stepTitle}>有没有绝对不吃的？</h1>
                <p className={styles.stepDesc}>含有以下食材的菜不会出现在推荐里。</p>
              </div>
              <div className={styles.tagGrid}>
                {COMMON_ALLERGIES.map(tag => (
                  <button
                    key={tag}
                    className={`${styles.tag} ${allergies.includes(tag) ? styles.tagSelected : ''}`}
                    onClick={() => toggle(allergies, setAllergies, tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className={styles.actionArea}>
                <button className={styles.btnNext} onClick={() => setStep(2)}>
                  下一步 (Next)
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}>
                <h1 className={styles.stepTitle}>喜欢什么口味？</h1>
                <p className={styles.stepDesc}>选几个你喜欢的，推荐会优先匹配。</p>
              </div>
              <div className={styles.tagGrid}>
                {FLAVOR_TAGS.map(tag => (
                  <button
                    key={tag}
                    className={`${styles.tag} ${flavors.includes(tag) ? styles.tagSelected : ''}`}
                    onClick={() => toggle(flavors, setFlavors, tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className={styles.actionArea}>
                <button className={styles.btnNext} onClick={finish}>
                  完成 (Complete)
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}