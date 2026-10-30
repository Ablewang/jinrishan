CREATE TABLE IF NOT EXISTS pindou_wishlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  cat TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, cat, name)
);

CREATE INDEX IF NOT EXISTS idx_pindou_wishlist_user ON pindou_wishlist(user_id);

CREATE TABLE IF NOT EXISTS pindou_done (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  cat TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  done_at INTEGER NOT NULL,
  UNIQUE(user_id, cat, name)
);

CREATE INDEX IF NOT EXISTS idx_pindou_done_user ON pindou_done(user_id);

CREATE TABLE IF NOT EXISTS pindou_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  palette TEXT NOT NULL,
  color_code TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, palette, color_code)
);

CREATE INDEX IF NOT EXISTS idx_pindou_inventory_user_palette ON pindou_inventory(user_id, palette);
