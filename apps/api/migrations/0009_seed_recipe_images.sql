-- 为所有菜谱填入 mock 图片 URL
-- 使用 loremflickr.com，按食物关键词返回真实照片，开发环境直接可用

UPDATE recipes SET images = '["https://loremflickr.com/800/600/braised,pork,chinese?lock=1"]'      WHERE id = 1;  -- 红烧肉
UPDATE recipes SET images = '["https://loremflickr.com/800/600/tomato,egg,stir,fry?lock=2"]'       WHERE id = 2;  -- 西红柿炒鸡蛋
UPDATE recipes SET images = '["https://loremflickr.com/800/600/chinese,pork,stirfry?lock=3"]'      WHERE id = 3;  -- 鱼香肉丝
UPDATE recipes SET images = '["https://loremflickr.com/800/600/steamed,fish,chinese?lock=4"]'      WHERE id = 4;  -- 清蒸鲈鱼
UPDATE recipes SET images = '["https://loremflickr.com/800/600/mapo,tofu,chinese?lock=5"]'         WHERE id = 5;  -- 麻婆豆腐
UPDATE recipes SET images = '["https://loremflickr.com/800/600/fried,rice,chinese?lock=6"]'        WHERE id = 6;  -- 扬州炒饭
UPDATE recipes SET images = '["https://loremflickr.com/800/600/pork,bone,soup?lock=7"]'            WHERE id = 7;  -- 猪骨萝卜汤
UPDATE recipes SET images = '["https://loremflickr.com/800/600/kung,pao,chicken?lock=8"]'          WHERE id = 8;  -- 宫保鸡丁
UPDATE recipes SET images = '["https://loremflickr.com/800/600/cabbage,stirfry,chinese?lock=9"]'   WHERE id = 9;  -- 手撕包菜
UPDATE recipes SET images = '["https://loremflickr.com/800/600/sweet,sour,pork?lock=10"]'          WHERE id = 10; -- 糖醋里脊
UPDATE recipes SET images = '["https://loremflickr.com/800/600/beef,tomato,stew?lock=11"]'         WHERE id = 11; -- 番茄牛腩
UPDATE recipes SET images = '["https://loremflickr.com/800/600/snow,peas,stir,fry?lock=12"]'       WHERE id = 12; -- 清炒荷兰豆
UPDATE recipes SET images = '["https://loremflickr.com/800/600/poached,chicken,chinese?lock=13"]'  WHERE id = 13; -- 白斩鸡
UPDATE recipes SET images = '["https://loremflickr.com/800/600/fish,head,spicy,chinese?lock=14"]'  WHERE id = 14; -- 剁椒鱼头
UPDATE recipes SET images = '["https://loremflickr.com/800/600/congee,porridge,chinese?lock=15"]'  WHERE id = 15; -- 皮蛋瘦肉粥
UPDATE recipes SET images = '["https://loremflickr.com/800/600/tofu,scallion,cold?lock=16"]'       WHERE id = 16; -- 小葱拌豆腐
UPDATE recipes SET images = '["https://loremflickr.com/800/600/seaweed,egg,soup?lock=17"]'         WHERE id = 17; -- 紫菜蛋花汤
UPDATE recipes SET images = '["https://loremflickr.com/800/600/beef,spicy,sichuan?lock=18"]'       WHERE id = 18; -- 水煮牛肉
UPDATE recipes SET images = '["https://loremflickr.com/800/600/twice,cooked,pork,sichuan?lock=19"]' WHERE id = 19; -- 回锅肉
UPDATE recipes SET images = '["https://loremflickr.com/800/600/garlic,shrimp,chinese?lock=20"]'    WHERE id = 20; -- 蒜蓉虾
UPDATE recipes SET images = '["https://loremflickr.com/800/600/braised,ribs,chinese?lock=21"]'     WHERE id = 21; -- 红烧排骨
UPDATE recipes SET images = '["https://loremflickr.com/800/600/green,beans,stirfry?lock=22"]'      WHERE id = 22; -- 干煸四季豆
UPDATE recipes SET images = '["https://loremflickr.com/800/600/sichuan,chicken,cold?lock=23"]'     WHERE id = 23; -- 口水鸡
UPDATE recipes SET images = '["https://loremflickr.com/800/600/oyster,sauce,lettuce?lock=24"]'     WHERE id = 24; -- 蚝油生菜
UPDATE recipes SET images = '["https://loremflickr.com/800/600/scallion,oil,noodles?lock=25"]'     WHERE id = 25; -- 葱油拌面
