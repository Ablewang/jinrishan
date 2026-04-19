# 002 - 第一版全局 UI 重构设计方案 (V1 Full Restyle)

## 1. 目标与背景
用户反馈当前所有页面（包含 Onboarding、Home、Bot、Settings、Plan 等）的 UI 过于简陋（“太丑了”），同时 PC 端和 H5 端的样式混在一起，没有针对大屏做合理适配。
本次重构的目标是：**打造一个现代、优雅、清爽的美食/计划类应用界面，并且严格区分移动端（H5）与桌面端（PC）的布局体验。**

## 2. 全局设计系统 (Design System)
- **色彩规范 (Colors)**：
  - 保留原有的品牌色 **活力橙** (`#e67e22`)，配合更柔和的背景色和字色。
  - 主色: `--primary: #e67e22;` 悬浮/深色: `--primary-dark: #d35400;` 浅色背景: `--primary-bg: #fff8f0;`
  - 背景色: `--bg-color: #f7f8fa;` (稍微偏暖的灰白，增加温馨感)
  - 表面色: `--surface: #ffffff;`
  - 文字色: 标题 `--text-main: #1d1d1f;`，正文 `--text-secondary: #515256;`，辅助说明 `--text-muted: #8e8e93;`
  - 边框: `--border-color: #ebebeb;`
- **形态与阴影 (Shape & Shadow)**：
  - 圆角增大，摒弃尖锐感：卡片使用 `16px` 或 `20px`，按钮使用 `12px` 或全圆角 `99px`。
  - 阴影使用弥散的软阴影：`box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);`，悬浮时稍微加深上浮。
- **排版与留白 (Typography & Spacing)**：
  - 标题加大加粗，形成强烈的层级对比（如 28px/32px 的大标题）。
  - 模块间增加更充足的上下留白（margin-bottom: 24px 或 32px）。

## 3. 多端适配策略 (Responsive Design)
**所有页面必须遵循 Mobile-First（移动端优先），并在每个 CSS 文件的底部加入 `@media (min-width: 768px)` 来覆盖 PC 端样式。**

- **H5 端 (Mobile)**：
  - `MobileLayout`: 底部固定导航栏（Bottom Tab Bar），使用高斯模糊（backdrop-filter）和安全区适配 `env(safe-area-inset-bottom)`。
  - 页面内容 `100%` 宽度，卡片上下堆叠排列 (`flex-direction: column`)。
  - 弹窗（Swap Modal 等）采用底部抽屉形式（Bottom Sheet）。
- **PC 端 (Desktop / >=768px)**：
  - `DesktopLayout`: 左侧固定侧边栏（Sidebar Navigation），右侧内容区。
  - **最大宽度与居中**：在右侧巨大的内容区中，对于只适合窄屏的内容（如 Login/Settings表单），设置 `max-width: 560px; margin: 0 auto;`。
  - **网格布局 (Grid)**：对于列表流（如 Home推荐列表、WeeklyPlan多天卡片、Shopping清单），使用 `display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;`，充分利用 PC 的宽屏展示。
  - 弹窗采用屏幕正中央居中的经典模态框（Centered Modal），带有遮罩和圆角。

## 4. 各核心页面重构点
1. **布局框架 (Layouts)**：
   - 移除写死的 `max-width: 480px` 这种会让 PC 变窄的限制。
   - `DesktopLayout` 侧边栏增加浅灰色背景区分，导航项增加交互动效。
2. **新手引导 (Onboarding - GuestSetup)**：
   - 采用大标题 + 渐变背景引导风格。
   - 标签选择（Tags）做成饱满的圆角按钮，选中状态有明显的橙色背景反馈。
3. **认证 (Login)**：
   - 表单输入框增大内边距（padding），未激活时使用灰色边框，Focus 时边框高亮变橙色，提升输入体验。
4. **今日推荐 (Home) & 菜谱详情 (RecipeDetail)**：
   - 卡片图片比例优化（如 16:9），图片圆角与卡片一致。
   - 按钮组（查看做法、就吃这个、换一换）采用柔和的分割，主按钮橙色填充，次级按钮线框或灰色底。
   - PC 端采用多列 Grid 瀑布流。
5. **周计划 (WeeklyPlan)**：
   - 卡片化每一天的餐饮。移动端垂直排列，PC端 Grid 网格展示。
   - "草稿 / 已确认" 状态标签设计为圆角 Tag，带有背景色。
6. **购物清单 (Shopping)**：
   - 根据区域（菜系/种类）划分卡片。
   - 勾选框改为圆润现代的 Checkbox 设计，选中后呈现橙色填充并带有中划线和透明度变化。
7. **Bot 助手 (Bot) & 家庭设置 (Family/Settings)**：
   - 聊天界面采用微信/iMessage风格的圆角气泡，用户发出的为橙色底白字，Bot为白底黑字带阴影。
   - 设置页面信息块全部卡片化，带轻微阴影，不再生硬拼接。

---

## 5. 执行前审查与查缺补漏 (Self-Reviews)

### 第一轮审查：设计原则一致性与布局逻辑 (Round 1)
**批判性思考：**
1. **PC/H5 的具体区分是否彻底？**
   - *漏洞发现*：我只提到了 `Grid` 瀑布流和弹窗居中，但像 Login、GuestSetup 和 Settings 这类表单页面在 PC 上如果直接拉满会很难看。
   - *修复策略*：必须在媒体查询中，为这些页面明确加上 `max-width: 480px` 或 `600px`，以及 `margin: 0 auto;` 并且带上一层轻量卡片背景和边框，否则在 PC 宽屏上表单元素会被拉得畸形。
2. **交互态 (Hover/Active) 是否被忽视？**
   - *漏洞发现*：在移动端不需要太多 hover，但在 PC 端，没有 hover 的组件显得非常死板。
   - *修复策略*：给所有的 `.btn`, `.card`, `.tag` 补充 `:hover` 状态。比如卡片 hover 时需要 `transform: translateY(-2px)`，按钮需要变暗或加阴影。
3. **安全性（safe-area）问题？**
   - *验证*：H5 `MobileLayout` 导航栏明确提到了 `env(safe-area-inset-bottom)`，这一点保留，非常好。

### 第二轮审查：细节组件与工程实现 (Round 2)
**批判性思考：**
1. **CSS 变量的调用是否全局统一？**
   - *漏洞发现*：我可能会在写 CSS Module 时顺手硬编码写类似 `border: 1px solid #ebebeb` 的代码，而不是用 `--border-color`。
   - *修复策略*：强制要求在所有模块中必须完全使用 `var(--xxxx)`，绝对禁止出现硬编码颜色的情况，这样以后如果要切“暗黑模式”也更方便。
2. **弹窗（Modal）遮罩的 z-index 管理**
   - *漏洞发现*：如果弹窗的 `z-index` 小于 `MobileLayout` 或 `DesktopLayout` 的导航栏，弹窗会被遮挡。
   - *修复策略*：在设计文档中补充：所有 `modalOverlay` 必须设定 `z-index: 100;`。
3. **Typography (字体) 继承**
   - *漏洞发现*：有时候 `button` 和 `input` 不会默认继承 `body` 的字体。
   - *修复策略*：在 `index.css` 的全局重置里必须加上 `button, input { font-family: inherit; }`。

---

## 6. 执行步骤
在完成两轮批判性审查并修复漏洞后，我将：
1. 更新 `index.css` 全局变量及表单字体继承重置。
2. 依次更新 Layout 和各个页面的 `.module.css`，严格贯彻 CSS 变量替换与 Hover 交互补充。
3. 针对 `Login / Settings / GuestSetup` 在 `@media` 中补充表单卡片化和限宽逻辑。