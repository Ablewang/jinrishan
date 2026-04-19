CREATE TABLE IF NOT EXISTS personal_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  pref_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_value TEXT NOT NULL,
  UNIQUE(user_id, pref_type, target_type, target_value),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
