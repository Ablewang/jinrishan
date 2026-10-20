/**
 * 场景 A：全新用户
 * 清空 IndexedDB poem_store 所有数据，模拟第一次打开 App
 * 在浏览器 DevTools Console 执行
 */
;(async function seedNewUser() {
  const DB_NAME = 'poem_store'
  const STORE = 'kv'

  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })

  // 同时清 localStorage 残留
  localStorage.clear()

  console.log('✅ 全新用户数据已清空（IDB + localStorage）')
  console.log('请刷新页面')
})()
