# 核心数据模型

## 菜谱对象（Recipe）

今日膳所有功能的数据基础，标签越丰富，推荐和统计越准确。

```ts
type Recipe = {
  id: number
  name: string                  // 红烧肉
  description: string           // 简短描述

  // 分类维度
  cuisine: Cuisine              // 菜系：家常 / 川 / 粤 / 湘 / 苏 / 东北 ...
  category: Category            // 品类：主菜 / 素菜 / 汤羹 / 主食 / 小吃 / 早餐
  meal_types: MealType[]        // 适合餐次：早 / 午 / 晚

  // 食材维度
  ingredients: Ingredient[]     // 食材列表（带用量）
  main_ingredient: string       // 主食材：猪肉 / 鸡肉 / 豆腐 / 时蔬 ...
  protein_type: ProteinType     // 荤 / 素 / 海鲜 / 蛋奶

  // 口味维度
  flavors: Flavor[]             // 咸鲜 / 辣 / 清淡 / 酸甜 / 香浓
  spicy_level: 0 | 1 | 2 | 3   // 不辣 / 微辣 / 中辣 / 重辣

  // 烹饪维度
  cooking_method: CookingMethod // 炒 / 炖 / 蒸 / 烤 / 凉拌 / 煮
  prep_time: number             // 备料时间（分钟）
  cook_time: number             // 烹饪时间（分钟）
  difficulty: 'easy' | 'medium' | 'hard'

  // 烹饪步骤
  steps: Step[]

  // 营养方向（不计算卡路里，只做定性）
  nutrition_tags: NutritionTag[] // 高蛋白 / 低脂 / 补钙 / 粗粮 / 少油少盐
  season: Season[]               // 适合季节：春 / 夏 / 秋 / 冬 / 全年
}

type Ingredient = {
  name: string      // 五花肉
  amount: string    // 500g
  category: string  // 肉类 / 蔬菜 / 调料 / 主食
}

type Step = {
  order: number       // 步骤序号
  description: string // 热锅冷油，放入姜片爆香
  image?: string      // 步骤配图（可选）
  duration?: number   // 这一步耗时（分钟，可选）
}
```

---

## 从菜谱对象衍生出的功能

### 1. 每日 / 每周推荐
- 根据家庭成员口味偏好（喜欢的菜系、口味、忌口食材）过滤
- 避免近期重复（最近 7 天已推荐过的降权）
- 保证多样性：荤素搭配、口味均衡、不全是同一菜系
- 考虑季节：优先推应季菜

### 2. 买菜清单
- 周计划确认后，汇总所有菜谱的 `ingredients`
- 按食材品类分组（肉类 / 蔬菜 / 豆制品 / 调料）
- 相同食材合并用量（两道菜都用到葱，合并成一条）
- 调料类可过滤（家里常备，不用每次买）

---

## 数据流

```
菜谱库（Recipe）
    ↓
用户口味档案（偏好标签）
    ↓
推荐引擎 → 今日推荐 / 周计划
    ↓
确认周计划 → 汇总食材 → 买菜清单
```

---

## 待定义的枚举值

```ts
type Cuisine = '家常' | '川菜' | '粤菜' | '湘菜' | '苏菜' | '东北菜' | '西餐' | '日料' | '快手菜'
type Category = '主菜' | '素菜' | '汤羹' | '主食' | '小吃' | '早餐点心'
type MealType = '早餐' | '午餐' | '晚餐'
type ProteinType = '猪肉' | '牛肉' | '羊肉' | '鸡肉' | '鱼虾' | '蛋奶' | '豆制品' | '纯素'
type Flavor = '咸鲜' | '辣' | '清淡' | '酸甜' | '香浓' | '酸辣'
type CookingMethod = '爆炒' | '红烧' | '清蒸' | '炖煮' | '凉拌' | '烤' | '煎' | '煮'
type NutritionTag = '高蛋白' | '低脂' | '补钙' | '粗粮' | '少油少盐' | '清热' | '滋补'
type Season = '春' | '夏' | '秋' | '冬' | '全年'
```
