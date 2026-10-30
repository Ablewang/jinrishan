-- app 用户表（独立于现有 users 表）
CREATE TABLE IF NOT EXISTS app_users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  phone      TEXT    NOT NULL UNIQUE,
  password   TEXT    NOT NULL,  -- bcrypt hash
  name       TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- 通用 KV 存储表
-- app: 'pindou' | 'study' 等
-- key: 对应 localStorage 的 key
-- value: JSON 字符串
CREATE TABLE IF NOT EXISTS app_store (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  app        TEXT    NOT NULL,
  key        TEXT    NOT NULL,
  value      TEXT    NOT NULL DEFAULT '{}',
  updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, app, key)
);

CREATE INDEX IF NOT EXISTS idx_app_store_user_app ON app_store(user_id, app);
