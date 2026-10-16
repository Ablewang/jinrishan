# T08 · 每周学习报告页

## 背景

用户目前无法感知自己一周内的学习节奏和进步。当前分享卡只有累计数字，缺乏叙事感。`poem_memorize_history`、`poem_streak`、`review_schedules` 已有足够数据支撑一份有意义的周报。

## 目标

- 每周自动生成学习报告，用户可查看和分享
- 首页有红点提示未读周报
- 报告可生成分享卡片

## 不在范围内

- 后端推送周报（T12 处理）
- 家长端数据看板（远期）

## 功能需求

### 1. 周报数据聚合

新建 `src/lib/weeklyReport.ts`，`buildWeeklyReport(weekStart: string)` 函数：

| 字段 | 数据来源 |
|---|---|
| 本周背了几首新诗 | `poem_memorize_history` 按 date 过滤本周 |
| 本周背的诗名列表 | 同上 |
| 本周打卡天数 | `recitation_sessions` 按 date 去重计数 |
| 当前连续打卡 | `poem_streak.count` |
| 本周满星首数 | `poem_memorize_history` 中 stars===3 的条数 |
| 本周最难的诗 | `review_schedules` 中 ef 最低且本周有背诵记录的诗 |
| 累计总字数 | `poem_total_chars` |
| 本周较上周进步 | 对比上周同字段（可选，数据允许时展示） |

### 2. 新增路由 `/weekly-report`

`WeeklyReportPage` 组件：
- 展示当前周（周一到周日）的报告
- 顶部 tab 可切换查看「本周」/「上周」
- 底部「分享本周报告」按钮

### 3. 首页红点提示

App 启动时检查：
- 上周（周一到周日）是否有背诵记录
- `poem_last_report_week` 是否记录了已查看上周报告
- 满足条件 → 首页底部导航「学习记录」tab 显示红点

查看报告后写入 `poem_last_report_week = 上周开始日期`，红点消失。

### 4. 周报分享卡片

扩展 `ShareCardContext`（与 T09 协同），新增 `type: 'weekly'`：
- 本周背了 N 首，连续打卡 X 天
- 本周最难克服的诗：《XXX》
- 累计 N 字，进度 N/70

原型图见 → [prototype.md](prototype.md)

## 验收标准

- [ ] 有上周学习记录且未查看时，首页红点正确显示
- [ ] 查看报告后红点消失
- [ ] 周报数据与 `recitation_sessions` 实际记录一致
- [ ] 无本周记录时展示空状态引导
- [ ] 分享卡片内容正确生成

## 工作量估算

3–4 天
