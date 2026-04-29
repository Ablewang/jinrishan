# 一套「按模型能力自适应」的 Harness Engineering 设计（通用版）

下面是我会落地的一套整体设计。它的**根本目标**和 harness engineering 的初衷一致：**让 Agent = Model + Harness 中，Harness 这一层可以独立演化、可度量、可拆装，并且会随着模型变强而「主动让位」**。

> **通用版说明**：本设计**不绑定编码 agent**。第一~八节是**业务无关的内核**（治理一个会出错的智能体的一般理论）；第九节给出"换业务时的适配 Checklist"；第十节给出 **5 个常见业务场景**各自需要补充哪些能力插件。编码 agent 只是它最先成熟的一个应用领域。

---

## 一、设计哲学（5 条不可妥协的原则）

1. **Agent = Model + Harness**：模型是**可替换组件**，Harness 是**主体工程**；模型升级不应推翻 Harness。
2. **能力即合约**：每种能力都是一个**有标准接口**的模块（Capability），任何强弱实现都可互换（Linter / LLM Judge / 规则机 / 人工 都遵守同一个接口）。
3. **前馈 + 反馈双闭环（Guides + Sensors）**：所有控制要么在动作前**引导**，要么在动作后**度量并纠偏**——没有第三种存在形式。
4. **能力自适应（Capability-Aware）**：用一份 **Model Capability Profile** 决定每个模块在当前模型/任务/风险下，是 **强约束 / 弱约束 / 关闭 / 由模型自己负责**。
5. **可观测先于一切**：先有 trace、再加约束；**没有信号就不能加规则**。Harness 自己也需要被评估（harness-of-harness）。

---

## 二、整体架构（分层 + 能力总线）

```text
                       ┌──────────────────────────────────┐
                       │       Human-in-the-Loop          │  审批 / 复核 / 干预
                       └──────────────┬───────────────────┘
                                      │
┌─────────────────────────────────────┴───────────────────────────────────┐
│                     Harness Runtime (Kernel / 调度核心)                  │
│   - 任务编排（plan→act→verify→repair→commit）                            │
│   - 能力解析（按 Capability Profile 注入合适的能力实现）                  │
│   - 事件总线（pre-hook / post-hook / signal / repair）                   │
└──┬───────────┬───────────┬───────────┬───────────┬───────────┬──────────┘
   │           │           │           │           │           │
┌──▼──┐    ┌───▼────┐  ┌───▼────┐  ┌───▼────┐  ┌──▼─────┐ ┌───▼─────┐
│Ctx  │    │ Tool   │  │ Guide  │  │ Sensor │  │ Safety │ │ Cost &  │
│Layer│    │ Layer  │  │ Layer  │  │ Layer  │  │ Layer  │ │ Quota   │
└──┬──┘    └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘ └───┬─────┘
   │           │           │           │           │          │
┌──▼───────────▼───────────▼───────────▼───────────▼──────────▼─────────┐
│                       Observability & Memory Plane                    │
│       structured logs / traces / replays / episodic memory            │
└───────────────────────────────────────────────────────────────────────┘
                                  ▲
                                  │
                          ┌───────┴────────┐
                          │ Eval & Harness │   持续评估 Harness 本身的覆盖与质量
                          │  Coverage      │
                          └────────────────┘
```

**关键不在层数，而在**：所有层之间通过**统一事件契约**通信（`pre_action`、`post_action`、`signal`、`repair_request`、`approval_request`）；外部能加新模块、删旧模块，不用改 Kernel。

---

## 三、能力组件目录（每个都是可插拔模块）

每个模块都有：`name`、`scope`（task/file/system）、`mode`（computational / inferential / hybrid）、`strength`（block / warn / hint / off）、`adapter`（具体实现）。

| 层 | 能力（Capability） | 典型实现（强→弱可替换） |
|---|---|---|
| **Context** | 仓库索引 / 记忆 / 知识检索 / 上下文预算 | 向量检索、AST 检索、`AGENTS.md`、Episodic memory |
| **Tool** | 工具注册 / 权限 / 沙箱 / Schema 校验 | MCP server、内置 shell、白名单文件系统、只读模式 |
| **Guide（前馈）** | 任务模板 / 规则 / Schema / 架构边界 | system prompt、`AGENTS.md`、依赖方向规则、骨架代码 |
| **Sensor（反馈）** | Lint / 类型 / 测试 / 评测 / LLM Judge | tsc / ruff、单测、契约测试、规则机、Judge LLM |
| **Safety** | 危险操作拦截 / 影响半径 / 数据脱敏 | 命令白名单、`rm -rf` 拦截、PII 过滤、网络隔离 |
| **Cost & Quota** | Token 预算 / 调用次数 / 模型选择 | 分级模型路由、stop-on-budget、缓存复用 |
| **Memory & State** | 会话 / scratchpad / 长期事实 | KV、git、文件、向量库 |
| **Recovery** | 重试 / 回滚 / 降级 / 替代路径 | 工具重试、checkpoint 回退、降级到弱模式 |
| **HITL** | 审批门 / 高风险检查点 / 审计 | 阻塞式审批、异步 review、采样人审 |
| **Observability** | 日志 / Trace / Replay / 指标 | OpenTelemetry、回放器、决策审计 |
| **Eval** | 离线集 / 在线 A/B / 影子运行 | golden set、shadow mode、回归套件 |

> 这里**不是越多越好**。每个能力都要回答一句：**"它在防什么？它产生什么信号？"** 答不上来的，先不要加。

> **关于"典型实现"列**：上表偏编码 agent，因为这一领域的 Sensor 现成又便宜（lint/test/type）。**框架本身不偏科**：换业务时，把"典型实现"列替换为该业务的等价物即可（见 §十）。

---

## 四、Capability Profile：让 Harness 跟着模型「呼吸」

这是把这套设计**和一般「插件框架」拉开差距**的关键件。

```yaml
profile: coding-agent@prod
model:
  id: "model-X"
  tier: strong            # weak | medium | strong | frontier
  cost_class: high
risk: medium               # low | medium | high
task: refactor             # codegen | refactor | bugfix | infra | research

capabilities:
  context.repo_index:      { strength: required }
  context.budgeting:       { strength: required, mode: computational }

  guide.architecture_rules: { strength: required, mode: computational }
  guide.task_template:      { strength: hint }     # 强模型不需要逐步模板

  sensor.lint:             { strength: block }
  sensor.types:            { strength: block }
  sensor.unit_tests:       { strength: block }
  sensor.llm_judge:        { strength: warn, model: cheap-judge }

  safety.shell_whitelist:  { strength: block }
  safety.network_isolation:{ strength: block }

  cost.budget:             { tokens: 200k, stop_on_exceed: true }
  recovery.auto_repair:    { max_loops: 3 }

  hitl.approval:
    - on: "git push --force"
    - on: "delete > 100 files"
  hitl.review_sampling: 0.05
```

### Profile 的运行规则
- **模型变强 → 自动「让位」**：`strength` 从 `block` 降到 `warn`，再降到 `hint`，最后 `off`，把决策权还给模型。
- **任务变难/风险变高 → 自动「补位」**：相反方向收紧。
- **每个能力只能有一种 strength**，并且 Harness Runtime 在运行时把 profile 编译成**可执行策略图**，使整个会话期间策略可追溯。

---

## 五、核心循环：Plan → Act → Verify → Repair → Commit

```text
plan          ── Guide 注入 → 模型产出计划 + 受 Schema 约束
  │
act           ── Tool 调用 → 经 Safety 校验 → Cost 计费
  │
verify        ── 计算型 Sensors (lint/type/test) + 推理型 Sensors (judge)
  │           │
  │           └── 任一 Sensor 触发 → 进入 repair
  │
repair        ── 把信号注入下一轮上下文（"为 LLM 优化的错误信息"）
  │           ── 超过 max_loops → 升级到 HITL 或回滚
  │
commit        ── HITL 门禁 → 写入 / 合并 / 发布
```

> **设计要点**：Sensor 输出的不是给人看的报错，而是**"自纠正提示"**——这是 Fowler 强调过的「面向 LLM 的良性 prompt injection」。每一个 Sensor 都要带一份「**当我触发时，agent 应当如何理解我**」的 message-template。

---

## 六、能力的「拆解 / 补充」机制（你最关心的那一段）

为了真正做到**根据模型能力自由拆解、补充**，我会做三件事：

### 1. 能力契约（Capability Contract）
每个能力实现以下接口：

```ts
interface Capability {
  id: string;                          // 'sensor.lint'
  scope: Scope;                        // file | task | session | system
  inputs: Schema;                      // 它需要看到什么
  emits: Signal[];                     // 它会发什么信号
  cost: CostHint;                      // p50/p99 token & latency
  competence: Competence;              // 它"代替"模型解决了什么子问题
}
```

`competence` 是**关键字段**：声明这个能力替模型补的是哪类不可靠（"无法稳定保持依赖方向"、"会忘记测试"……），用于 profile 决策时回答：**模型已经能稳定做这件事 → 关闭这个能力。**

### 2. 能力市场（Capability Registry）
- 每条能力可以有**多种实现强度**（计算型 / 规则型 / LLM Judge / 人工）。
- Profile 引用 `id`，由 Registry 解析具体实现。
- 升级模型时，只改 profile，不改代码。

### 3. Harness Coverage（自评估）
仿照 code coverage / mutation testing：
- **Guide coverage**：哪些任务类别没有对应的引导模板？
- **Sensor coverage**：注入已知缺陷，看 Sensor 能否捕获（mutation testing for harness）。
- **Signal-to-fix ratio**：信号触发后最终被修复的比例。
- **False-positive 率**：导致 agent 走弯路的虚假信号。
- **Idle Sensor**：长期不触发——是质量高了还是检测漏了？

> 没有这一层，"能力是否冗余/缺失"全靠拍脑袋；有了它，**harness 的演化变成数据驱动**。

---

## 七、一个最小可运行雏形（落地建议）

如果今天就要落地，我会按这个顺序做（每一步都能独立产出价值）：

1. **Observability 先行**：把 agent 每一次 `plan / act / observe` 写成结构化 trace + 可重放（没有这个，后面所有讨论都是空的）。
2. **沿用既有计算型 Sensor**：lint、type、test、安全扫描——只做"信号注入到下一轮上下文"，先解决"agent 看不到自己错"的问题。
3. **写第一份 `AGENTS.md` / 架构边界规则**（Guide 层）：把团队隐性规则显性化，并把违反这些规则做成 Sensor。
4. **加 Safety / Cost 两道硬护栏**：危险命令白名单 + token 预算上限——防止失控烧钱。
5. **建立 Capability Profile + Registry**：让前面这堆东西**通过配置开关**，而不是散落在 prompt 里。
6. **加 HITL 门禁 + 采样复核**：给高风险动作（force push、删除大量文件、生产部署）加同步审批。
7. **再补 Eval & Harness Coverage**：golden set + mutation 测试 sensor，**回头反向裁剪不必要的能力**——这是模型变强时**自动让位**的依据。

> **非编码场景的顺序调整**：编码场景里第 2 步（接计算型 Sensor）几乎是免费午餐；多数业务场景里**没有这种现成 Sensor**，需要先建 Eval 集和 LLM judge。建议改为：**1 → 2'(建 Eval 黄金集) → 3 → 4 → 5 → 6 → 7**。Eval 集会成为这些业务里的**核心资产**，必须早做。

---

## 八、和初衷的对照（自检表）

| 初衷 | 在这套设计中如何兑现 |
|---|---|
| 让 Agent 在生产里**可靠** | Sensors + Repair Loop + HITL，构成可度量的可靠性基线 |
| **模型外**的工程化 | Kernel + 能力总线，模型仅作为可替换适配器 |
| **前馈+反馈** 的控制论结构 | Guide 层与 Sensor 层显式分离，强制都有 message-template |
| **可拆解、可补充** | Capability Contract + Profile + Registry 三件套 |
| **跟随模型能力进化** | Profile 中 `strength` 可被降级到 `off`，Harness 主动让位 |
| Harness **本身**的工程化 | Harness Coverage / Eval / 影子运行 |

---

## 九、业务适配 Checklist（换业务前先回答这 10 个问题）

把这套框架搬到任何新业务前，**先逼团队答完下面 10 个问题**。哪一个答不上，就先补哪一个，不要急着写代码。

1. **"做错了"如何定义？** 能否定量描述（错误类别、严重等级、可观测信号）？
2. **哪些动作不可逆？** 影响半径多大（一个用户、一个团队、一个市场）？
3. **能写出至少一个不依赖 LLM 的计算型 Sensor 吗？** 如果不能，**最便宜的推理型 Sensor**（规则 + 小模型 judge）是什么？
4. **Ground truth 从哪儿来？** 历史数据 / 专家标注 / 用户反馈 / 业务后置指标？
5. **HITL 的最低触发条件是什么？** 谁审？SLA 多久？审不及怎么办（默认放行还是默认拒绝）？
6. **一次错误的代价是多少？** 金钱、合规罚款、信誉、健康——量化或分级。
7. **能力默认档位是 block 还是 warn？** 也就是：**愿意放弃多少自动化换确定性？**
8. **单次任务的成本上限**（token / API 调用 / 金额）多少？超了怎么办？
9. **影子运行（shadow mode）可行吗？** 先让 agent 跑、不真正执行，能不能比对结果？
10. **监管/合规要求**有哪些？（PII / HIPAA / PCI / SOX / GDPR / 行业牌照）

> 经验法则：**前 3 题答不清，先不要上 agent**；**第 5 题答不清，先不要让 agent 直接面向用户**。

---

## 十、5 个常见业务场景下需要补充的内容

下面 5 个场景，**第二节的 Kernel 完全不动**，只换"插件"。每个场景都按相同结构给出："业务定位 / Tool / Guide / Sensor（计算型）/ Sensor（推理型）/ Safety / HITL / Eval / 关键风险"。

### 场景 1：编码 Agent（基线参考）

| 维度 | 需要补充的内容 |
|---|---|
| **业务定位** | 在仓库里完成需求/修 bug/重构，并自走 PR。 |
| **Tool** | 文件读写、shell（沙箱）、git、包管理器、测试运行器、CI 触发。 |
| **Guide** | `AGENTS.md`、依赖方向规则、骨架代码、PR 模板、commit message 规范。 |
| **Sensor（计算型）** | 编译器、tsc / mypy、ESLint / ruff、单元测试、覆盖率、安全扫描（Semgrep）。 |
| **Sensor（推理型）** | LLM judge 评估"是否真的解决了 issue"、"是否引入隐性技术债"。 |
| **Safety** | 命令白名单、禁止 `rm -rf`、禁止 force push 主分支、网络隔离、密钥扫描。 |
| **HITL** | 高风险路径（迁移脚本、生产 infra）、跨包改动、首次合入主分支。 |
| **Eval** | golden bug-fix set、SWE-bench 子集、回归测试套件。 |
| **关键风险** | 多数动作可逆（git revert）；**Sensor 最丰富、最便宜**；HITL 偶发即可。 |

### 场景 2：客服 / 工单 Agent

| 维度 | 需要补充的内容 |
|---|---|
| **业务定位** | 阅读用户问题，调 CRM/订单/退款/物流接口，给用户回复或登记工单。 |
| **Tool** | CRM 查询、订单/物流查询、发邮件/IM、退款、改地址、升级工单、知识库检索。 |
| **Guide** | 品牌话术手册、合规话术、不可承诺事项清单、对话 schema、升级矩阵、tone of voice。 |
| **Sensor（计算型）** | 敏感词、PII 泄漏、违禁承诺词、退款/赠品**金额上限校验**、必含字段（订单号/工单号）。 |
| **Sensor（推理型）** | LLM judge："是否回答了用户问题"、"语气是否符合品牌"、"是否暗示了我们做不到的事"。 |
| **Safety** | 单次退款 > 阈值需 HITL；外发邮件**先沙箱预览再发送**；账户敏感操作二次确认。 |
| **HITL** | 高金额退款、VIP / 投诉升级 / 二次升级工单、舆情风险关键词。 |
| **Eval** | 1000 条历史工单 golden set（人工标注满意度+合规）+ 上线后影子比对人工客服。 |
| **关键风险** | 文字几乎不可逆（用户已读）；ground truth 偏主观；**HITL 走采样人审是常态**。 |

### 场景 3：数据分析 / BI Agent

| 维度 | 需要补充的内容 |
|---|---|
| **业务定位** | 把自然语言问题转为 SQL / Notebook / 看板，给业务方答案。 |
| **Tool** | SQL 执行、看板创建、Python / Notebook 运行、指标平台查询、文件导出。 |
| **Guide** | 表 schema 注释、**指标口径文档**、查询模板（DAU/留存/漏斗）、命名规范。 |
| **Sensor（计算型）** | SQL **dry-run + EXPLAIN**、行数上限、`SELECT *` 拦截、跨库 join 警告、PII 列访问审计、查询超时。 |
| **Sensor（推理型）** | LLM judge："这个 SQL 是否回答了原问题"、"指标口径是否被错用"。 |
| **Safety** | 禁止 DROP / TRUNCATE / UPDATE 生产；生产库**默认只读**；PII 列脱敏；只允许在数仓查。 |
| **HITL** | 写库 / DDL；跨业务域 join；对外报表；金额/营收类指标。 |
| **Eval** | 黄金问答对（自然语言 → 期望 SQL/结果）、指标口径回归集。 |
| **关键风险** | "看似对、其实错"——指标口径错了**没人会立刻发现**；推理型 Sensor 是主力。 |

### 场景 4：金融 / 交易 / 风控 Agent

| 维度 | 需要补充的内容 |
|---|---|
| **业务定位** | 行情解析、策略执行、订单管理、合规检查；强不可逆、强监管。 |
| **Tool** | 行情查询、下单/撤单、仓位查询、风控规则查询、合规黑名单、对账。 |
| **Guide** | 策略边界、监管约束、限额表、可交易品种白名单、时间窗规则、回测协议。 |
| **Sensor（计算型）** | 仓位/资金限额、滑点上限、撮合时间窗、合规黑名单匹配、异常波动熔断、订单 schema 校验。 |
| **Sensor（推理型）** | 异常解释合理性、行为漂移检测（agent 行为是否偏离历史分布）。 |
| **Safety** | **下单前强制双重校验**（影子计算 vs 实际指令一致性）；熔断器；限额；首次新策略**只许影子**。 |
| **HITL** | 超阈值订单、首次启用新策略、异常市场（停牌/涨跌停/极端波动）、人工 kill-switch。 |
| **Eval** | **历史回测** + **实时影子运行（shadow trading）**；对比 PnL / 滑点 / 合规命中率。 |
| **关键风险** | **不可逆且代价巨大**；监管留痕必须完整；strength 默认应是 **block**，能 warn 已是放权。 |

### 场景 5：医疗 / 法律 / 合同等高风险咨询 Agent

| 维度 | 需要补充的内容 |
|---|---|
| **业务定位** | 检索知识、起草草稿、给专业人士做"加速器"，**不直接面向终端用户出最终意见**。 |
| **Tool** | 医学/法规知识库检索、病历/合同读取、引用查询、起草模板、文献匹配。 |
| **Guide** | 专科指南、引用规范（强制带出处）、免责声明模板、禁用绝对化措辞清单。 |
| **Sensor（计算型）** | **必须给出引用**、**必须包含免责声明**、禁用词检测（"一定治愈"/"绝对胜诉"）、引用真实性校验。 |
| **Sensor（推理型）** | 事实一致性 judge（与引用文献对齐）、专科 LLM 复核、风险等级分类。 |
| **Safety** | 诊断/处方/最终法律意见**默认禁止直接输出给终端用户**；输出全部带"草稿"水印 + 审核流程。 |
| **HITL** | **几乎全场景都需要**——agent 主要做"草稿 + 检索"，专家做最终签字；按风险等级走不同 SLA。 |
| **Eval** | 专家标注集 + 错例库 + 引用一致性回归；新规/新指南上线后**回归全集**。 |
| **关键风险** | 错误代价极高（健康 / 法律责任）；ground truth 必须由持证专家提供；**Harness 是必需品而不是优化项**。 |

---

## 十一、跨场景的几条共性结论

把上面 5 个场景横着读，能看出几条规律——这是**通用版**真正想传达的东西：

1. **可逆性是第一变量**：编码 ≫ 客服 ≫ 数据分析 ≫ 医疗/法律 ≫ 金融。**越不可逆，HITL 默认越多、strength 默认越严**。
2. **Sensor 重心从计算型转到推理型**：编码场景 80% 计算型；客服/数据分析 50/50；金融/医疗多半要靠规则机 + 推理 judge + 专家。
3. **Eval 集的难度反向递增**：编码可以靠测试自动化，其他场景**几乎都靠人工标注**——这是真正的成本。
4. **Safety 不再是"别 rm -rf"**：在多数业务里，Safety = **不可逆动作的影响半径管理**（dry-run / shadow / 二次确认 / 熔断 / 限额）。
5. **HITL 不是"按钮"**：是**流程、责任人、SLA、漏审兜底策略**。这部分**永远是非技术问题**。

> **一句话总结**：Harness Engineering 的内核是"治理一个会出错的智能体"的一般理论；编码 agent 只是它最先成熟的应用领域。**换业务不会让框架失效，只会暴露你在那个业务里的真实短板**：是缺 Sensor、缺 Eval 集，还是缺 HITL 流程。

---

如果你愿意，我可以把这套设计**落到当前仓库**：先做 **trace + capability profile + 一个最小 Sensor 注入循环** 的脚手架，再逐个补能力模块，并配一份 `AGENTS.md` 的初稿。要不要直接开工？