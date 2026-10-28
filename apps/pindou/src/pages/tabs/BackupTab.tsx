import { useStore } from '../../hooks/useStore'
import styles from './BackupTab.module.css'

export function BackupTab() {
  const { wishlist, inventory, done } = useStore()

  function exportData() {
    const data = {
      w: wishlist.items.map(i => [i.cat, i.name, i.display_name]),
      i: Object.fromEntries(
        Object.entries(inventory.inventory).filter(([, v]) => v > 0)
      ),
      d: done.items.map(i => [i.cat, i.name, i.display_name, i.doneAt]),
    }
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pindou-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.w) wishlist.addAll(data.w.map(([cat, name, display_name]: [string, string, string]) => ({ cat, name, display_name })))
        if (data.i) {
          for (const [code, count] of Object.entries(data.i)) {
            inventory.set(code, count as number)
          }
        }
        if (data.d) {
          for (const [cat, name, display_name] of data.d) {
            done.mark({ cat, name, display_name })
          }
        }
        alert('导入成功')
      } catch {
        alert('文件格式错误')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className={styles.page}>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>导出数据</div>
        <div className={styles.desc}>将收藏、拼豆库、已拼数据导出为 JSON 文件，可用于备份或迁移到其他设备。</div>
        <button className={styles.btn} onClick={exportData}>导出备份文件</button>
      </div>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>导入数据</div>
        <div className={styles.desc}>从之前导出的 JSON 文件中恢复数据，已有数据会被合并。</div>
        <label className={styles.btn}>
          选择备份文件
          <input type="file" accept=".json" style={{ display: 'none' }} onChange={importData} />
        </label>
      </div>
    </div>
  )
}
