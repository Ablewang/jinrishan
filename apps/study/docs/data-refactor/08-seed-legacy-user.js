/**
 * 场景 B：老用户迁移
 * 向 IndexedDB 注入旧格式数据，模拟从旧版本升级
 * 在浏览器 DevTools Console 执行
 */
;(async function seedLegacyUser() {
  const DB_NAME = 'poem_store'
  const STORE = 'kv'
  const DB_VERSION = 1

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)

  // 打开 IDB
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

  async function idbSet(key, value) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(JSON.stringify(value), key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async function idbSetRaw(key, value) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  // 先清空
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })

  // 1. recitation_sessions（旧格式，无 charCount，mode 缺失）
  await idbSet('recitation_sessions', [
    { id: '4_'  + twoDaysAgo + '_1', poemId: 4,  date: twoDaysAgo, timestamp: Date.now() - 2*86400000, stars: 3, qScore: 5, hintRate: 0,   passRate: 1,   lines: [] },
    { id: '10_' + yesterday  + '_2', poemId: 10, date: yesterday,  timestamp: Date.now() - 86400000,   stars: 2, qScore: 4, hintRate: 0.2, passRate: 0.8, lines: [] },
    { id: '15_' + today      + '_3', poemId: 15, date: today,      timestamp: Date.now(),              stars: 1, qScore: 2, hintRate: 0.5, passRate: 0.5, lines: [] },
  ])

  // 2. review_schedules（旧格式，字段 nextReviewDate）
  await idbSet('review_schedules', {
    4:  { poemId: 4,  ef: 2.5, interval: 3, repetition: 1, nextReviewDate: today,     lastSessionId: '4_'  + twoDaysAgo + '_1', totalSessions: 1, bestStars: 3 },
    10: { poemId: 10, ef: 2.3, interval: 2, repetition: 1, nextReviewDate: yesterday, lastSessionId: '10_' + yesterday  + '_2', totalSessions: 1, bestStars: 2 },
    15: { poemId: 15, ef: 1.6, interval: 1, repetition: 1, nextReviewDate: today,     lastSessionId: '15_' + today      + '_3', totalSessions: 1, bestStars: 1 },
  })

  // 3. poem_progress（旧格式）
  await idbSet('poem_progress', {
    '4':  { read: true, memorized: true, bestStars: 3 },
    '10': { read: true, memorized: true, bestStars: 2 },
    '15': { read: true, memorized: true, bestStars: 1 },
  })

  // 4. poem_memorize_history（旧格式）
  await idbSet('poem_memorize_history', [
    { id: 4,  stars: 3, date: twoDaysAgo },
    { id: 10, stars: 2, date: yesterday },
    { id: 15, stars: 1, date: today },
  ])

  // 5. poem_achievement_dates（旧格式，Record<string, string>）
  await idbSet('poem_achievement_dates', {
    first_poem: new Date(Date.now() - 2*86400000).toISOString(),
  })

  // 6. poem_total_chars（旧格式，纯数字字符串）
  await idbSetRaw('poem_total_chars', '120')

  // 7. poem_queue
  await idbSet('poem_queue', {
    queue: [20, 25],
    last_complete_date: today,
    today_complete: false,
  })

  // 8. poem_nickname / avatar_gender
  await idbSetRaw('poem_nickname', '测试用户')
  await idbSetRaw('avatar_gender', 'boy')

  // 9. poem_onboarding_done
  await idbSetRaw('poem_onboarding_done', '1')

  console.log('✅ 老用户数据注入完成（IDB）')
  console.log('  已背诗：#4（3星）、#10（2星）、#15（1星）')
  console.log('  连续天数：3 天（需迁移计算）')
  console.log('  待复习：#4、#15（今日到期）、#10（昨日到期）')
  console.log('  队列：#20、#25')
  console.log('  待迁移 key：review_schedules → srs_schedules，poem_achievement_dates → achievement_events')
  console.log('请刷新页面，观察 migrateToV2 是否正确运行')
})()
