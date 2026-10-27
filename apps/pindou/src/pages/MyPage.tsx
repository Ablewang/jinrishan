import { useState } from 'react'
import { Header } from '../components/Header'
import { BackTitle } from '../components/BackTitle'
import { PaletteSegment } from '../components/PaletteSegment'
import { WishlistTab } from './tabs/WishlistTab'
import { InventoryTab } from './tabs/InventoryTab'
import { PurchaseTab } from './tabs/PurchaseTab'
import { BackupTab } from './tabs/BackupTab'
import type { NavTarget } from '../App'
import styles from './MyPage.module.css'

type Tab = 'wishlist' | 'inventory' | 'purchase' | 'backup'

const TABS: { id: Tab; label: string }[] = [
  { id: 'wishlist', label: '收藏' },
  { id: 'inventory', label: '库存' },
  { id: 'purchase', label: '购买清单' },
  { id: 'backup', label: '数据备份' },
]

interface Props {
  onBack: () => void
  onNavigate: (target: NavTarget) => void
  initialTab?: Tab
}

export function MyPage({ onBack, onNavigate, initialTab = 'wishlist' }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [wishlistStat, setWishlistStat] = useState<React.ReactNode>(undefined)
  const [purchaseStat, setPurchaseStat] = useState<React.ReactNode>(undefined)

  const headerRight = activeTab === 'inventory'
    ? <PaletteSegment />
    : activeTab === 'purchase'
    ? purchaseStat
    : activeTab === 'wishlist'
    ? wishlistStat
    : undefined

  return (
    <div className={styles.page}>
      <Header left={<BackTitle title="我的" onBack={onBack} />} right={headerRight} />
      <div className={styles.content}>
        {activeTab === 'wishlist' && <WishlistTab onNavigate={onNavigate} onStat={setWishlistStat} />}
        {activeTab === 'inventory' && <InventoryTab />}
        {activeTab === 'purchase' && <PurchaseTab onStat={setPurchaseStat} />}
        {activeTab === 'backup' && <BackupTab />}
      </div>
      <div className={styles.tabBar}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${styles.tabBtn} ${activeTab === t.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
