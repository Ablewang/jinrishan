# 菜品数据库方案

## 背景

今日膳需要一个菜品基础数据库，作为用户口味档案和每日推荐的数据基础。
用户不手动录入喜好，而是从现有菜品库中圈选。

## 数据结构

```ts
type Dish = {
  id: number
  name: string           // 红烧肉
  cuisine: string        // 家常菜 / 川菜 / 粤菜 / 苏菜 ...
  meal_type: string[]    // 早餐 / 午餐 / 晚餐
  main_ingredient: string // 猪肉 / 鸡肉 / 豆腐 / 蔬菜 ...
  flavor: string[]       // 咸鲜 / 辣 / 清淡 / 微甜 ...
  meat_type: '荤' | '素' | '半荤素'
  cooking_method: string // 炖煮 / 爆炒 / 蒸 / 凉拌 ...
  difficulty: '简单' | '中等' | '复杂'
}
```

## 数据来源方案

**推荐：用 AI 生成结构化数据**（备用方案）
- 生成 300-500 道常见家庭菜
- 覆盖各大菜系、主要食材、各类口味
- 直接生成 SQL insert 语句，入库 D1

不建议爬虫：法律风险 + 数据脏 + 维护成本高。

## 用户选喜好的交互方式

卡片滑动模式（类 Tinder）：
- 展示菜品卡片（名称 + 菜系 + 主要口味）
- 操作：喜欢 / 不吃 / 跳过
- 约 20 张完成初始化，控制在 2 分钟内
- 后续吃过某道菜后也可继续补充偏好

## 实现步骤（待做）

1. 编写生成脚本，调用 Claude API 批量生成菜品数据
2. 生成 migration SQL 文件
3. `pnpm db:migrate:remote` 入库
4. 提供 `GET /api/dishes` 查询接口
5. 前端实现卡片滑动选喜好的 onboarding 流程
