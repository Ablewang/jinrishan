-- 周计划、饮食记录、推荐事件、购物清单

CREATE TABLE IF NOT EXISTS weekly_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  week_start_date TEXT NOT NULL,  -- ISO date，周一
  status TEXT NOT NULL DEFAULT 'draft',  -- draft/confirmed
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  UNIQUE (family_id, week_start_date)
);

CREATE TABLE IF NOT EXISTS weekly_plan_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  meal_type TEXT NOT NULL,   -- breakfast/lunch/dinner
  recipe_id INTEGER NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES weekly_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

CREATE TABLE IF NOT EXISTS meal_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  recipe_id INTEGER NOT NULL,
  eaten_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

CREATE TABLE IF NOT EXISTS recommendation_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  recipe_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,  -- shown/accepted/rejected/swapped/cooked
  meal_type TEXT,
  event_date TEXT,
  source TEXT NOT NULL DEFAULT 'daily',  -- daily/weekly_plan/bot
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

CREATE TABLE IF NOT EXISTS shopping_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER,
  family_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id) REFERENCES weekly_plans(id) ON DELETE SET NULL,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shopping_list_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id INTEGER NOT NULL,
  ingredient_name TEXT NOT NULL,
  amount TEXT,
  category TEXT,
  checked INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meal_logs_family_date ON meal_logs(family_id, date);
CREATE INDEX IF NOT EXISTS idx_rec_events_family ON recommendation_events(family_id, created_at);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_family ON weekly_plans(family_id, week_start_date);
