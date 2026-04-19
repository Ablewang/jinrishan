-- Allow virtual family members (no user account)
-- SQLite doesn't support ALTER COLUMN, so recreate the table

CREATE TABLE family_members_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  user_id INTEGER,
  display_name TEXT,
  nickname TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO family_members_new (id, family_id, user_id, nickname, role, joined_at)
SELECT id, family_id, user_id, nickname, role, joined_at FROM family_members;

DROP TABLE family_members;
ALTER TABLE family_members_new RENAME TO family_members;
