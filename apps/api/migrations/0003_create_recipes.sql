-- 菜谱主表、食材、步骤

CREATE TABLE IF NOT EXISTS recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  images TEXT NOT NULL DEFAULT '[]',        -- JSON array of R2 keys
  cuisine TEXT,
  category TEXT,
  meal_types TEXT NOT NULL DEFAULT '[]',    -- JSON array
  main_ingredient TEXT,
  protein_type TEXT,
  flavors TEXT NOT NULL DEFAULT '[]',       -- JSON array
  spicy_level INTEGER NOT NULL DEFAULT 0,   -- 0/1/2/3
  cooking_method TEXT,
  prep_time INTEGER,
  cook_time INTEGER,
  difficulty TEXT NOT NULL DEFAULT 'easy',  -- easy/medium/hard
  nutrition_tags TEXT NOT NULL DEFAULT '[]',-- JSON array
  season TEXT NOT NULL DEFAULT '["全年"]',  -- JSON array
  source TEXT NOT NULL DEFAULT 'system',    -- system/user
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  amount TEXT,
  category TEXT,  -- 肉类/蔬菜/调料/主食
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recipe_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL,
  step_order INTEGER NOT NULL,
  description TEXT NOT NULL,
  images TEXT NOT NULL DEFAULT '[]',  -- JSON array of R2 keys
  duration INTEGER,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON recipes(cuisine);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_source ON recipes(source);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe ON recipe_steps(recipe_id);
