# T2 · 双 SRS 系统合并（系统B → 系统A）

**类型：** 重构  
**优先级：** P1  
**估算工时：** 4–6天开发 + 2周观察期  

---

## 背景

当前系统存在两套并行的复习调度机制：

- **系统 A**（`review_schedules`）：SM-2 变体，EF 因子自适应，每次背诵后精确计算下次复习间隔。数据质量高，但 **UI 完全不读取**，纯技术债。
- **系统 B**（`poem_review_cards`）：5档固定间隔（1/3/7/15/30天），驱动首页"今日复习"、进度页全部 UI。算法粗糙，无个性化。

每次背诵结束，两套系统同时写入，但首页读的是系统 B，系统 A 积累的高质量数据被浪费。

---

## 需求

### 目标

将首页复习调度切换为系统 A，废弃系统 B，同时保证老用户数据不丢失。

### 功能需求

1. **Phase 1 — 读取切换**（1–2天）
   - 新建 `src/utils/scheduleAdapter.ts`，提供 `scheduleToCard()` 将 `ReviewSchedule` 适配为 `ReviewCard` 格式
   - `useProgress` 新增 `todayDueFromA`，默认关闭（`USE_SYSTEM_A = false`）
   - 验证两套数据差异后翻转 flag

2. **Phase 2 — 复习写入升级**（2–3天）
   - `useRecitation.ts` 新增 `saveReviewResult(poemId, lines, date)`
   - `RecitationSession` 新增 `sessionType: 'memorize' | 'review'` 字段
   - 复习流程改为调用 `saveReviewResult`，让复习也走 SM-2 路径

3. **Phase 3 — 老用户迁移**（1天）
   - 新建 `src/lib/migration.ts`，实现 `migrateSystemBToA()`
   - 将系统 B 的 `level` 映射为对应间隔天数，保留原 `due` 日期
   - 迁移用 `srs_migrated_v1` flag 做幂等保护

4. **Phase 4 — 清理**（观察期2周后）
   - 删除 `useProgress.ts` 中的系统 B 相关代码
   - 删除 `markReviewed`、`reviewCards`、`todayDueReviews` 等约60行代码

### 非功能需求

- Phase 1–3 任意阶段均可通过翻转 flag 回滚，不损失数据
- Phase 4 执行前需 TypeScript 全量检查确认无残留引用
- 老用户数据迁移后，首页"今日复习"日期不能发生突变（通过复用原 due 日期保证）

---

## 数据结构

**scheduleAdapter.ts 映射规则：**

| SM-2 interval | 对应 ReviewCard level |
|---|---|
| ≤1天 | 1 |
| ≤3天 | 2 |
| ≤7天 | 3 |
| ≤15天 | 4 |
| >15天 | 5 |

---

## 风险

| 风险 | 缓解 |
|---|---|
| 老用户系统A数据缺失 | Phase 3 迁移脚本补写，复用原 due 日期 |
| SM-2 间隔与系统B差异大 | Phase 1 观察期：console.log 对比两套列表 |
| streak 归零 | 见 T3 |

---

## 验收标准

- [ ] Phase 1：`USE_SYSTEM_A = true` 后，首页今日复习列表数据来源切换为系统A，页面正常展示
- [ ] Phase 2：复习背诵后，`review_schedules` 的 ef/interval 正确更新
- [ ] Phase 3：老用户 `poem_review_cards` 数据正确迁移，`srs_migrated_v1` 写入
- [ ] Phase 4：TypeScript 编译无报错，系统B相关代码全部删除
