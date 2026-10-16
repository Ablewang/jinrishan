# T02 · 双 SRS 系统合并（Phase 1–3）

## 背景

当前存在两套间隔复习系统并行运行：

- **系统 A**（`review_schedules`）：SM-2 变体，精密自适应，每次背诵都在写入，但 UI 从未读取
- **系统 B**（`poem_review_cards`）：简易5档固定间隔，驱动首页「今日复习」全部 UI

系统 A 的 EF 因子自适应能力被完全浪费，系统 B 对所有用户给出相同复习时间表，无法反映个体差异。

## 目标

- 让首页「今日复习」读取系统 A（`review_schedules`）
- 复习行为也通过 SM-2 路径写入，不再只传 `bool`
- 老用户数据从系统 B 迁移到系统 A，不丢失已有进度
- 全程可回滚，不影响用户体验

## 不在范围内

- Phase 4（删除系统 B 代码）：等观察期2周后执行，不在本任务内
- streak 统一：在 T03 中处理

## 功能需求

### Phase 1：读取切换

1. 新建 `src/utils/scheduleAdapter.ts`
   - `scheduleToDisplayLevel(s)` — 将 SM-2 interval 映射为 0–5 档展示等级
   - `scheduleToCard(s)` — 将 ReviewSchedule 转为 ReviewCard 格式供 UI 消费

2. `useProgress` 新增 `todayDueFromA`
   - 调用 `useRecitation.getTodayList()`
   - 用 `scheduleToCard` 映射后返回
   - 加 `USE_SYSTEM_A = false` flag，初始关闭

3. 灰度验证
   - 开启 flag，console.log 对比两套到期列表差异
   - 确认差异可接受后正式翻转 flag

### Phase 2：复习写入升级

1. `useRecitation.ts` 新增 `saveReviewResult(poemId, lines, date)`
   - 走完整 SM-2 路径（calcQScore → updateSchedule）
   - `RecitationSession` 新增 `sessionType: 'memorize' | 'review'` 字段

2. 复习流程调用方（`markReviewed` 的调用处）改为调用 `saveReviewResult`
   - 复习时需构造 `LineResult[]`：passed=true 所有行 hintCount=0，passed=false 所有行 hintCount=2

3. `markReviewed` 加 `@deprecated` 注释，暂时保留兼容

### Phase 3：老用户数据迁移

新建 `src/lib/migration.ts`，`migrateSystemBToA()` 函数：
- 检查 `srs_migrated_v1` flag，已迁移则跳过
- 遍历 `poem_review_cards`，为系统 A 没有记录的诗补写 `review_schedules` 条目
- 保留原有 `due` 日期，避免复习计划突变
- 在 `App.tsx` 启动时调用（一次性）

## 验收标准

- [ ] Phase 1：翻转 flag 后首页今日复习列表来自系统 A，内容与系统 B 基本一致
- [ ] Phase 2：复习后 `review_schedules` 的 `ef` 值有变化
- [ ] Phase 3：老用户启动后 `review_schedules` 中有从系统 B 迁移过来的记录
- [ ] 全程可通过翻转 `USE_SYSTEM_A` flag 回滚
- [ ] TypeScript 无新增类型错误

## 工作量估算

4–5 天
