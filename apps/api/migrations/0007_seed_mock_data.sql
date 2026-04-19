-- Mock 数据：测试用户、家庭、偏好、周计划、饮食记录

-- 测试用户（手机号仅用于本地开发）
INSERT OR IGNORE INTO users (id, phone, name, avatar) VALUES
  (1, '13800001111', '王大厨', NULL),
  (2, '13800002222', '李小厨', NULL),
  (3, '13800003333', '张三', NULL);

-- 测试家庭
INSERT OR IGNORE INTO families (id, name, invite_code, created_by) VALUES
  (1, '王家饭桌', 'MOCK0001', 1),
  (2, '美食之家', 'MOCK0002', 3);

-- 家庭成员
INSERT OR IGNORE INTO family_members (id, family_id, user_id, nickname, role) VALUES
  (1, 1, 1, '老王', 'admin'),
  (2, 1, 2, '小李', 'member'),
  (3, 2, 3, '张三', 'admin');

-- 用户偏好
INSERT OR IGNORE INTO user_preferences (member_id, pref_type, target_type, target_value) VALUES
  -- 老王：喜欢川菜、咸鲜，不喜欢甜口
  (1, 'liked', 'cuisine', '川菜'),
  (1, 'liked', 'flavor', '咸鲜'),
  (1, 'liked', 'flavor', '麻辣'),
  (1, 'disliked', 'flavor', '酸甜'),
  -- 小李：喜欢粤菜、清淡，过敏花生
  (2, 'liked', 'cuisine', '粤菜'),
  (2, 'liked', 'flavor', '清淡'),
  (2, 'allergy', 'ingredient', '花生'),
  -- 张三：喜欢家常、不吃羊肉
  (3, 'liked', 'cuisine', '家常'),
  (3, 'disliked', 'protein_type', '羊肉');

-- 本周计划（2026-04-14 周一）
INSERT OR IGNORE INTO weekly_plans (id, family_id, week_start_date, status) VALUES
  (1, 1, '2026-04-14', 'confirmed'),
  (2, 2, '2026-04-14', 'draft');

-- 周计划菜谱（家庭1，本周一到周五午晚餐）
INSERT OR IGNORE INTO weekly_plan_items (plan_id, date, meal_type, recipe_id) VALUES
  -- 周一
  (1, '2026-04-14', 'lunch', 2),   -- 西红柿炒鸡蛋
  (1, '2026-04-14', 'dinner', 1),  -- 红烧肉
  -- 周二
  (1, '2026-04-15', 'lunch', 8),   -- 宫保鸡丁
  (1, '2026-04-15', 'dinner', 7),  -- 猪骨萝卜汤
  -- 周三
  (1, '2026-04-16', 'lunch', 4),   -- 清蒸鲈鱼
  (1, '2026-04-16', 'dinner', 9),  -- 手撕包菜
  -- 周四
  (1, '2026-04-17', 'lunch', 5),   -- 麻婆豆腐
  (1, '2026-04-17', 'dinner', 11), -- 番茄牛腩
  -- 周五
  (1, '2026-04-18', 'lunch', 20),  -- 回锅肉
  (1, '2026-04-18', 'dinner', 3);  -- 鱼香肉丝

-- 上周饮食记录（家庭1）
INSERT OR IGNORE INTO meal_logs (family_id, date, meal_type, recipe_id) VALUES
  (1, '2026-04-07', 'lunch', 2),
  (1, '2026-04-07', 'dinner', 10),  -- 糖醋里脊
  (1, '2026-04-08', 'lunch', 8),
  (1, '2026-04-08', 'dinner', 14),  -- 剁椒鱼头
  (1, '2026-04-09', 'breakfast', 15), -- 皮蛋瘦肉粥
  (1, '2026-04-09', 'lunch', 4),
  (1, '2026-04-09', 'dinner', 1),
  (1, '2026-04-10', 'lunch', 21),   -- 水煮牛肉
  (1, '2026-04-10', 'dinner', 9),
  (1, '2026-04-11', 'lunch', 13),   -- 白斩鸡
  (1, '2026-04-11', 'dinner', 5),
  (1, '2026-04-12', 'lunch', 6),    -- 扬州炒饭
  (1, '2026-04-12', 'dinner', 11),
  (1, '2026-04-13', 'lunch', 3),
  (1, '2026-04-13', 'dinner', 7);

-- 推荐事件记录（家庭1，近期）
INSERT OR IGNORE INTO recommendation_events (family_id, recipe_id, event_type, meal_type, event_date, source) VALUES
  (1, 1,  'shown',    'dinner', '2026-04-14', 'daily'),
  (1, 1,  'accepted', 'dinner', '2026-04-14', 'daily'),
  (1, 2,  'shown',    'lunch',  '2026-04-14', 'daily'),
  (1, 2,  'accepted', 'lunch',  '2026-04-14', 'daily'),
  (1, 8,  'shown',    'lunch',  '2026-04-15', 'daily'),
  (1, 8,  'accepted', 'lunch',  '2026-04-15', 'daily'),
  (1, 22, 'shown',    'dinner', '2026-04-15', 'daily'),
  (1, 22, 'rejected', 'dinner', '2026-04-15', 'daily'),
  (1, 4,  'shown',    'lunch',  '2026-04-16', 'daily'),
  (1, 4,  'accepted', 'lunch',  '2026-04-16', 'daily'),
  (1, 5,  'shown',    'lunch',  '2026-04-17', 'daily'),
  (1, 5,  'cooked',   'lunch',  '2026-04-17', 'daily');
