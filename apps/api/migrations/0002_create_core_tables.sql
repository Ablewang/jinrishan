-- 用户、家庭、偏好、枚举配置

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS families (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS family_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  nickname TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (family_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  pref_type TEXT NOT NULL,    -- liked / disliked / allergy
  target_type TEXT NOT NULL,  -- cuisine / flavor / ingredient / protein_type
  target_value TEXT NOT NULL,
  FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE,
  UNIQUE (member_id, pref_type, target_type, target_value)
);

CREATE TABLE IF NOT EXISTS system_enum_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  UNIQUE (type, value)
);

CREATE TABLE IF NOT EXISTS user_enum_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, type, value)
);

-- 系统枚举初始数据
INSERT OR IGNORE INTO system_enum_configs (type, value, sort_order) VALUES
  ('cuisine', '家常', 1), ('cuisine', '川菜', 2), ('cuisine', '粤菜', 3),
  ('cuisine', '湘菜', 4), ('cuisine', '苏菜', 5), ('cuisine', '闽菜', 6),
  ('cuisine', '浙菜', 7), ('cuisine', '徽菜', 8), ('cuisine', '东北菜', 9),
  ('cuisine', '京菜', 10), ('cuisine', '清真', 11), ('cuisine', '西餐', 12),
  ('cuisine', '日料', 13), ('cuisine', '韩餐', 14),

  ('category', '主菜', 1), ('category', '素菜', 2), ('category', '汤羹', 3),
  ('category', '主食', 4), ('category', '凉菜', 5), ('category', '小吃', 6),
  ('category', '早餐点心', 7),

  ('meal_type', '早餐', 1), ('meal_type', '午餐', 2), ('meal_type', '晚餐', 3),

  ('protein_type', '猪肉', 1), ('protein_type', '牛肉', 2), ('protein_type', '羊肉', 3),
  ('protein_type', '鸡肉', 4), ('protein_type', '鸭肉', 5), ('protein_type', '鱼类', 6),
  ('protein_type', '虾蟹贝', 7), ('protein_type', '蛋奶', 8),
  ('protein_type', '豆制品', 9), ('protein_type', '纯素', 10),

  ('flavor', '咸鲜', 1), ('flavor', '麻辣', 2), ('flavor', '辣', 3),
  ('flavor', '清淡', 4), ('flavor', '酸甜', 5), ('flavor', '香浓', 6),
  ('flavor', '酸辣', 7), ('flavor', '酱香', 8), ('flavor', '蒜香', 9),

  ('cooking_method', '爆炒', 1), ('cooking_method', '红烧', 2), ('cooking_method', '清蒸', 3),
  ('cooking_method', '炖煮', 4), ('cooking_method', '凉拌', 5), ('cooking_method', '烤', 6),
  ('cooking_method', '煎', 7), ('cooking_method', '煮', 8), ('cooking_method', '炸', 9),
  ('cooking_method', '卤', 10),

  ('nutrition_tag', '高蛋白', 1), ('nutrition_tag', '低脂', 2), ('nutrition_tag', '补钙', 3),
  ('nutrition_tag', '粗粮', 4), ('nutrition_tag', '少油少盐', 5),
  ('nutrition_tag', '清热', 6), ('nutrition_tag', '滋补', 7),

  ('season', '春', 1), ('season', '夏', 2), ('season', '秋', 3),
  ('season', '冬', 4), ('season', '全年', 5);
