# 枚举配置

菜谱各维度的枚举值不硬编码，存数据库，分系统和用户两层。

## 数据结构

### 系统枚举（`system_enum_configs`）
官方维护，所有用户共用，只有管理员可修改。

```ts
type SystemEnumConfig = {
  id: number
  type: EnumType
  value: string       // 川菜
  sort_order: number
  is_active: boolean
}

type EnumType =
  | 'cuisine'         // 菜系
  | 'category'        // 品类
  | 'meal_type'       // 餐次
  | 'protein_type'    // 荤素
  | 'flavor'          // 口味
  | 'cooking_method'  // 烹饪方式
  | 'nutrition_tag'   // 营养标签
  | 'season'          // 季节
```

### 用户自定义枚举（`user_enum_configs`）
用户可以在系统值之外自由添加自己的值。

```ts
type UserEnumConfig = {
  id: number
  user_id: number
  type: EnumType
  value: string       // 用户自定义，如"云南菜"
}
```

## API

前端拉取枚举值时，系统值与用户自定义值合并返回：

```
GET /api/enums/:type
→ [...system_values, ...user_custom_values]
```

## 交互形式

Combobox 标签输入：
- 下拉展示系统值 + 用户已有自定义值
- 直接打字可新建，回车保存到 `user_enum_configs`

## 系统初始值

```
cuisine:        家常 / 川菜 / 粤菜 / 湘菜 / 苏菜 / 闽菜 / 浙菜 / 徽菜 / 东北菜 / 京菜 / 清真 / 西餐 / 日料 / 韩餐
category:       主菜 / 素菜 / 汤羹 / 主食 / 凉菜 / 小吃 / 早餐点心
meal_type:      早餐 / 午餐 / 晚餐
protein_type:   猪肉 / 牛肉 / 羊肉 / 鸡肉 / 鸭肉 / 鱼类 / 虾蟹贝 / 蛋奶 / 豆制品 / 纯素
flavor:         咸鲜 / 麻辣 / 辣 / 清淡 / 酸甜 / 香浓 / 酸辣 / 酱香 / 蒜香
cooking_method: 爆炒 / 红烧 / 清蒸 / 炖煮 / 凉拌 / 烤 / 煎 / 煮 / 炸 / 卤
nutrition_tag:  高蛋白 / 低脂 / 补钙 / 粗粮 / 少油少盐 / 清热 / 滋补
season:         春 / 夏 / 秋 / 冬 / 全年
```
