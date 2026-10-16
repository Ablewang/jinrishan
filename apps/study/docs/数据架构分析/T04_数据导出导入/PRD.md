# T04 · 数据导出与导入

## 背景

所有用户学习数据仅存于 localStorage，无任何备份机制。iOS Safari 私有模式、WebView 环境、手动清除浏览器数据，均会导致全部记录瞬间归零。对于有积累感诉求的产品（连续打卡、勋章、多首诗掌握度），这是核心体验风险。

## 目标

- 用户可一键导出全部数据为 JSON 文件
- 用户可导入备份文件恢复数据（merge / replace 两种模式）
- 提醒用户定期备份
- 设置页展示当前存储使用情况

## 不在范围内

- 云端同步（T11 预留接口，真正云同步在更远期）
- 跨设备同步

## 功能需求

### 1. 导出功能

新建 `src/lib/backup.ts`，`exportBackup()` / `downloadBackup()`：

- 导出12个核心 key，`recitation_sessions` 只导最近90天
- 导出格式包含 `version`、`exportedAt`、`appVersion`、`checksum`（FNV-32a）
- `downloadBackup()` 触发浏览器下载，文件名 `古诗学习备份_YYYY-MM-DD.json`
- 导出成功后写 `poem_last_backup_date`

### 2. 导入功能

`importBackup(json, mode)` 支持两种模式：

- **replace**：清空现有数据后全量写入备份
- **merge**（默认）：`poem_progress` 取 memorized/bestStars 的较大值合并，其余 key 直接覆盖

校验流程：
1. JSON 格式合法
2. `version === '1'`
3. `checksum` 与 data 内容匹配

### 3. 备份提醒

新建 `src/hooks/useBackupReminder.ts`：

触发条件（满足其一）：
- 已背 ≥ 3 首 且 从未备份
- 距上次备份 > 7 天 且 有新背诵记录
- sessionStorage 中有 `backup_reminder_dismissed` 则本次会话不再提示

### 4. 设置页 UI

设置页新增「数据管理」区块：

- 显示当前存储使用量（如「已用 1.2 MB / 5 MB」进度条）
- 「导出备份」按钮
- 「导入备份」按钮（file input，accept=".json"）
- 上次备份时间

原型图见 → [prototype.md](prototype.md)

## 验收标准

- [ ] 点击导出，浏览器下载 JSON 文件，文件名含日期
- [ ] 导入合法备份文件，数据正确恢复
- [ ] 导入损坏文件，显示错误提示，不影响现有数据
- [ ] merge 模式下 poem_progress 取星级较大值合并
- [ ] 超过7天未备份时首页顶部显示提醒 Banner

## 工作量估算

3–4 天
