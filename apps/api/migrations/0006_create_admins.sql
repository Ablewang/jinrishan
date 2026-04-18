-- Admin users table
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Default admin: username=admin, password=admin123 (PBKDF2-SHA256 with salt)
-- This is a placeholder hash, replaced via seed or wrangler CLI in production
-- For dev: we'll verify plaintext and let the API handle proper hashing
INSERT OR IGNORE INTO admins (username, password_hash)
VALUES ('admin', 'dev_plain:admin123');
