import { useMemo } from 'react'
import { getLastBackupDate } from '../lib/backup'

const SESSION_KEY = 'backup_reminder_dismissed'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function useBackupReminder(totalMemorized: number): boolean {
  return useMemo(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return false
    } catch {}

    const lastBackup = getLastBackupDate()

    // 已背 ≥ 3 首且从未备份
    if (totalMemorized >= 3 && !lastBackup) return true

    if (lastBackup) {
      const daysSince = Math.floor(
        (new Date(todayStr()).getTime() - new Date(lastBackup).getTime()) / 86400000
      )
      // 距上次备份 > 7 天且有背诵记录
      if (daysSince > 7 && totalMemorized > 0) return true
    }

    return false
  }, [totalMemorized])
}

export function dismissBackupReminder(): void {
  try { sessionStorage.setItem(SESSION_KEY, '1') } catch {}
}
