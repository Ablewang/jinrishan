# T10 · 多孩子档案系统

## 背景

家庭多孩子场景下，所有孩子共用一套 localStorage 数据，无法各自独立记录学习进度。`poem_nickname` 字段已预示个人化概念，但缺少真正的多用户隔离。

localStorage key 加前缀是成本最低的隔离方案，无需重构数据结构，只需在读写层统一加前缀。

## 目标

- 支持多个孩子各自独立的学习数据
- 家长可在首页切换当前孩子
- 老用户数据无缝迁移为默认档案，不丢失

## 不在范围内

- 家长端数据看板（远期）
- 云端多设备同步（更远期）
- 档案密码保护

## 功能需求

### 1. 存储 Key 前缀隔离

新建 `src/lib/storageKey.ts`：
```ts
export function getStorageKey(rawKey: string): string
```
- 读取 `poem_active_profile`（全局，不加前缀）
- 返回 `${profileId}:${rawKey}`
- `poem_profiles`、`poem_active_profile` 本身不加前缀（全局共享）

全量替换：所有 hook 中 `localStorage.getItem('poem_xxx')` → `localStorage.getItem(getStorageKey('poem_xxx'))`

### 2. Profile 数据结构

```ts
interface Profile {
  id: string        // 'p1', 'p2', ...（自增）
  name: string      // 孩子昵称
  avatar: string    // 头像 emoji，如 '🦁'
  createdAt: string // ISO 日期
}
```

`poem_profiles`：`Profile[]`，全局，不加前缀
`poem_active_profile`：当前激活的 profileId，全局，不加前缀

### 3. 老数据迁移

App 首次启动时（无 `poem_profiles` key）：
- 检测是否有旧的无前缀数据（如 `poem_progress` 存在）
- 若有，调用 `migrateToProfile('default')`：将所有旧 key 复制为 `default:poem_xxx`
- 创建默认 Profile `{id: 'default', name: 读取poem_nickname或'小诗人', avatar: '📖'}`
- 删除原无前缀 key
- 设置 `poem_active_profile = 'default'`

### 4. 切换档案 UI

入口：首页顶部右侧头像气泡（现在显示昵称）→ 点击弹出 ProfilePicker

ProfilePicker 底部弹窗：
- 展示所有档案列表，当前激活高亮
- 「+ 添加孩子」入口
- 点击切换 → 写 `poem_active_profile` → 强制重载页面（`window.location.reload()`）

添加档案流程：
- 弹窗：输入昵称 + 选择头像 emoji（预设8个选项）
- 确认后创建新 Profile，自动切换到新档案

原型图见 → [prototype.md](prototype.md)

### 5. 根组件强制重置

切换档案时调用 `window.location.reload()`，确保所有 hook 的 useState 完全重新初始化，不留旧档案数据残影。

## 验收标准

- [ ] 老用户升级后数据迁移为默认档案，进度不丢失
- [ ] 新建第二个档案，两个档案数据完全隔离
- [ ] 切换档案后首页展示对应孩子的数据
- [ ] 删除档案时提示确认，数据随档案一同删除

## 依赖

建议 T02、T04 完成后执行（数据结构稳定后再做迁移，避免迁移两次）

## 工作量估算

4–6 天
