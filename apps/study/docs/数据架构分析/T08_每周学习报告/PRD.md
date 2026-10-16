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

### 3. 入口：进度页顶部周报卡片

入口放在 `ProgressPage.tsx` 顶部（四格统计 tiles 上方），展示一张周报预览卡：

```
┌──────────────────────────────────────┐
│  本周报告  10月10日–16日        查看 → │
│  背了 3 首  打卡 5 天  连续 14 天      │
└──────────────────────────────────────┘
```

- 有上周未读报告时，卡片右上角显示红点
- 点击卡片跳转 `/weekly-report`
- 查看后红点消失，写入 `poem_last_report_week`
- 无本周记录时不展示此卡片（不显示空状态）

不在底部导航 tab 上显示红点（原 PRD 方案作废）。

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
