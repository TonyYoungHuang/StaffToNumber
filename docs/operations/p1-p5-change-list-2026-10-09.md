# P1–P5 转化改动提交清单（2026-10-09）

执行范围：交接卡第 8 步，提交到 `codex/commercial-mvp-seo-production` 并推送至远程同名分支，不部署。以下是完整暂存文件列表，共 75 个；跨阶段文件只列一次，说明中注明其他阶段。

提交方式：对核对过的明确路径批量执行 `git add -- path1 path2 ...`，整文件暂存，不使用交互式暂存。49 个混合文件在风险栏逐行标注 **整文件提交（含历史未提交片段）**；历史片段包括已存在的未跟踪文件内容，不因今天修改时间而全部算作今天新增实现。独立的历史未提交文件、环境文件、密钥、`.tmp`、依赖目录和测试产物不在提交范围。

SEO 边界：本次提交操作没有改写任何产品源码，未新增 SEO 落地页 URL/title/H1 变更。英、西语首页字典相对旧 HEAD 已有历史 `heroTitle`、正文及 FAQ 差异；按用户规定整文件提交时一并带入，不能把本提交相对 HEAD 描述为“完全没有 SEO 差异”。相关条目已明确标注。独立的 SEO 页面、路由和元数据改动未暂存。

验证在本次提交前重新执行，均通过：`npm run build -w @score/shared`、www/app 各自 `typecheck`、www 单测 95/95、app 单测 158/158，两份浏览器验证脚本 `node --check`。测试后未再改产品代码。浏览器 10+7 项结果复用当日质量核验文档，本次未重跑浏览器、未做真实 Google/Stripe/GA4 验证。

暂存后逐路径自审与清单一致，未发现常见私钥/token 特征。完整暂存的默认 `git diff --cached --check` 有 5 处既有格式提示：交接卡 4 处 Markdown 双空格换行、预检字典 1 处文件尾空行。保留原内容；排除这两类空白后无其他格式问题，不将默认检查写成全通过。

验证范围是当前完整工作区。本仓库仍有未提交历史依赖，例如 `flow-return.ts`、`AppAuthModal.tsx`、`recognition-options.ts`、`single-score-copy.ts` 等；它们未因被相关文件引用而自动加入本次提交。此次提交不是可独立复现构建的完整历史工作区快照，干净检出或部署前仍须处理历史依赖。本次不部署。

## P1 — 分析埋点、漏斗与交接记录

| 文件 | 改了什么 | 用户可见变化 | 风险点 |
| --- | --- | --- | --- |
| `apps/app/src/components/AppChrome.tsx` | 顶部升级入口发送 `upgrade_click`，保留工作返回路径 | 顶部升级可按入口统计 | **整文件提交（含历史未提交片段）**：包含既有导航、余额刷新、登录状态同步 |
| `apps/app/src/components/ScoreDetailClient.tsx` | 锁定详情页升级入口补齐事件和返回路径 | 解锁后可继续原乐谱工作 | **整文件提交（含历史未提交片段）**：包含大量既有编辑、预检、合奏、导出及任务反馈变更 |
| `docs/operations/google-seo-funnel-runbook.md` | 校准八步漏斗、事件参数、P5 source 后缀和分析配置说明 | 无直接界面变化；运营按统一漏斗核验 | GA4 后台配置及上线实测仍需另做 |
| `docs/operations/ga4-key-events-checklist.md` | 新增关键事件、自定义维度和跨子域同意核验清单 | 无直接界面变化；提供后台操作步骤 | 文档不代表 GA4/Clarity 已配置 |
| `docs/operations/production-launch-checklist-2026-08-10.md` | 引用 GA4 清单并记录 Clarity 尚未配置 | 无直接界面变化 | 历史文件名保留，新增说明日期为 2026-10-09 |
| `docs/prd/commercial-mvp-prd-v1.md` | 指标事件补齐 `product_cta_click` 并对齐官方顺序 | 无直接界面变化 | 事件定义不代表已有真实转化数据 |
| `docs/operations/codex-handoff-p1-p5-conversion-2026-10-09.md` | 保存 P1–P5 背景、步骤、提交信息和验收标准 | 无直接界面变化；支持后续接手 | 当前只执行第 8 步，卡内部署/后台配置不是本次完成项 |
| `docs/audits/p1-p5-conversion-quality-2026-10-09.md` | 保存 Billing i18n 修复及当日单测、类型和模拟浏览器证据 | 无直接界面变化；可审查验证边界 | 模拟浏览器不证明真实支付、OAuth、webhook 或 GA4 已通过 |
| `docs/operations/p1-p5-change-list-2026-10-09.md` | 新增本次完整暂存列表、阶段说明、混合标注和验证范围 | 无直接界面变化；提交范围可逐文件复核 | 包含历史片段及工作区依赖限制须一并阅读 |

## P2 — Google 登录与游客草稿恢复

| 文件 | 改了什么 | 用户可见变化 | 风险点 |
| --- | --- | --- | --- |
| `apps/app/src/components/AuthForm.tsx` | GIS 已加载检测、按钮宽度重算、超时失败回退、登录方式记录 | Google 按钮更稳定；失败时可用邮箱登录 | **整文件提交（含历史未提交片段）**：包含既有会话恢复、错误本地化等改动；授权来源需另核 |
| `apps/app/src/components/EntitlementGate.tsx` | 免费预览允许游客停留，登录后刷新权益；补升级事件 | 游客可先选择文件，再登录 | **整文件提交（含历史未提交片段）**：包含既有登录弹窗、错误重试和返回路径逻辑 |
| `apps/app/src/lib/auth-storage.ts` | 正确保留 Google 首选登录方式 | 后续登录入口遵循既有选择 | **整文件提交（含历史未提交片段）**：包含既有认证状态订阅及激活码登录偏好 |
| `apps/app/src/app/api/auth/google-button/route.ts` | Google iframe 按钮宽度回退及延后重算 | 官网嵌入按钮在初始宽度不足时仍可显示 | **整文件提交（含历史未提交片段）**：原 iframe route、CSP 和来源校验整体带入 |
| `apps/app/src/components/SessionBootstrap.tsx` | 会话引导兼容游客免费扫描路径 | 游客不被提前赶离扫描入口 | **整文件提交（含历史未提交片段）**：原会话桥接、旧令牌清理整体带入 |
| `apps/app/src/lib/import-draft.ts` | 增加游客草稿保存及登录后归属转移 | 登录后无需重选文件 | **整文件提交（含历史未提交片段）**：包含原 IndexedDB 草稿实现；存储受浏览器能力限制 |
| `apps/www/src/components/HomeGoogleSignIn.tsx` | 增加 Google 不可用提示与按钮最小宽度 | 首页/定价弹窗出现邮箱回退提示 | **整文件提交（含历史未提交片段）**：原 iframe 消息校验和认证桥接整体带入 |
| `docs/operations/p2-google-signin-and-free-scan.md` | 记录 Google 按钮修复、游客草稿及后台授权待办 | 无直接界面变化 | 游客仍须登录后调用预检/识谱 API |

## P3 — 移动端免费扫描两步路径

| 文件 | 改了什么 | 用户可见变化 | 风险点 |
| --- | --- | --- | --- |
| `apps/app/src/components/ScoreLibraryManager.tsx` | 串联游客草稿、免费简单预检后一键识谱、折叠模式选择、P1 识谱参数和 P5 升单 | 选文件、预检后一次点击开始；额度不足显示 Pass | **整文件提交（含历史未提交片段）**：包含原工作区重构、价格复核和结构预检流程 |
| `apps/app/src/app/app-theme.css` | Google 按钮最小宽度与移动扫描控件约 44px 点击区域 | 手机按钮更易点击，扫描表单减少横向溢出 | **整文件提交（含历史未提交片段）**：包含原导航、订阅管理、工作区及操作提示样式 |
| `apps/app/src/components/RecognitionModeCards.tsx` | 模式选择加入整行标签与禁用控制 | 高级模式更易点击并明确选中状态 | **整文件提交（含历史未提交片段）**：原模式报价卡整体带入 |
| `apps/app/src/components/ScoreEnsembleWorkspace.module.css` | 增加模式标签触控尺寸与移动单列布局 | 手机模式卡完整显示 | **整文件提交（含历史未提交片段）**：同文件既有合奏工作区样式整体带入 |
| `apps/app/src/components/ScoreRecognitionPreflight.tsx` | 增加 compact 预检展示 | 免费简单路径保留必要状态，减少重复说明 | **整文件提交（含历史未提交片段）**：原结构摘要、支持判断、失败重试整体带入 |
| `apps/app/src/lib/score-recognition-preflight.ts` | 增加免费简单路径判定 | 仅预检支持且免费额度可用时走一键路径 | **整文件提交（含历史未提交片段）**：原预检解析、请求竞态保护、模式判定整体带入 |
| `apps/app/src/lib/score-recognition-preflight.test.ts` | 覆盖免费简单路径及排除条件 | 无直接界面变化；约束错误模式进入简化流程 | **整文件提交（含历史未提交片段）**：包含原预检测试 |
| `packages/i18n/src/score-preflight-messages.ts` | 补齐九语言开始识谱、免费使用和展开模式文案 | 九语言显示两步扫描提示 | **整文件提交（含历史未提交片段）**：原预检、结构原因及识谱支持字典整体带入 |
| `apps/app/src/lib/score-entry-messages/locales/en.ts` | 英文扫描入口说明改为免费预检后一键开始 | 英文用户看到实际步骤 | 免费路径依赖预检和剩余额度 |
| `apps/app/src/lib/score-entry-messages/locales/ja.ts` | 日文扫描入口说明改为免费预检后一键开始 | 日文用户看到实际步骤 | 免费路径依赖预检和剩余额度 |
| `apps/app/src/lib/score-entry-messages/locales/zh-CN.ts` | 中文扫描说明改为预检后开始，并调整 P5 额度不足动作文案 | 中文用户区分预检、识谱及开通完整功能 | 与 P5 独立银行卡/激活码入口共同使用 |
| `docs/operations/p3-free-scan-two-step.md` | 记录两步路径、复杂模式展开及价格复核边界 | 无直接界面变化 | 复杂/付费场景仍保留模式和价格确认 |

## P4 — 登录后自动继续结账

| 文件 | 改了什么 | 用户可见变化 | 风险点 |
| --- | --- | --- | --- |
| `apps/www/src/components/PurchaseFlowProvider.tsx` | 登录前保存待购方案，邮箱/Google 成功后单次继续，清理取消及终止失败 | 登录后不用再次点同一套餐 | **整文件提交（含历史未提交片段）**：原购买弹窗、支付请求、登录和 One Tap 整体带入 |
| `apps/www/src/components/PricingOffersClient.tsx` | 无指定方案时使用 Starter 月付 | 初始默认最低付费承诺 | **整文件提交（含历史未提交片段）**：原购买类型/支付服务选择界面整体带入 |
| `apps/www/src/lib/purchase-flow.ts` | Starter 月付默认值、待购 sessionStorage 快照与 30 分钟 TTL | 选好的套餐可跨登录恢复 | **整文件提交（含历史未提交片段）**：原方案解析、购买选择持久化整体带入 |
| `apps/www/src/lib/purchase-flow.test.ts` | 校验月付默认、待购保存读取、过期清理 | 无直接界面变化；约束恢复行为 | **整文件提交（含历史未提交片段）**：包含原套餐选择测试 |
| `apps/app/src/components/AppCheckoutClient.tsx` | 登录成功后单次自动 startCheckout，pending/锁清理；增加 P5 中文兑换入口 | app 登录后直接继续付款，兑换与卡支付分开 | **整文件提交（含历史未提交片段）**：包含原一次性购买、错误恢复及工作返回逻辑 |
| `apps/app/src/components/CheckoutPlanSelector.tsx` | 未指定方案优先 Starter 月付 | app 默认月付，显式选择仍优先 | **整文件提交（含历史未提交片段）**：包含原一次性/订阅选择、返回路径和卡片改动 |
| `scripts/verify-pricing-flow.mjs` | 改为验证默认月付、Google/邮箱自动结账、幂等重试、取消、返回及冷编译等待 | 无直接界面变化；纠正旧验证预期 | **整文件提交（含历史未提交片段）**：原官网模拟浏览器验证整体带入；只接受 loopback |
| `scripts/verify-conversion-flow.mjs` | 新增 app 本地模拟回归，覆盖邮箱自动结账、游客草稿、移动扫描、Pass 和双中文兑换 | 无直接界面变化；可复核关键流程 | API/Google/支付均模拟；不证明真实服务配置 |
| `docs/operations/p4-auto-continue-checkout.md` | 记录默认月付、pending TTL、一次性恢复与防双提交 | 无直接界面变化 | 已登录直接访问结账页不会自动创建付款 |

## P5 — US$2.99 Pass、中文支付拆分与免费文案

| 文件 | 改了什么 | 用户可见变化 | 风险点 |
| --- | --- | --- | --- |
| `apps/app/src/components/OneScorePassUpsell.tsx` | 新增 single-score/Stripe/one_time 主 CTA、订阅次级和双中文兑换 CTA，带 source/plan_type | 免费预览后优先购买 US$2.99 单曲 Pass | 真实 Price、checkout 开关及付款入账未在本次验证 |
| `apps/app/src/lib/one-score-upsell-copy.ts` | 新增九语言 Pass/订阅文案和双中文兑换条件 | 用户按语言看到清晰购买路径 | checkout 未开放时显示对应兑换说明 |
| `apps/app/src/components/TrialScorePreview.tsx` | 免费预览主按钮换为 Pass，返回降为三级 | 完成免费扫描后可直接选择单曲购买 | **整文件提交（含历史未提交片段）**：包含原任务进度、失败重试、过期资产过滤 |
| `apps/app/src/components/ScoreCandidateReviewWorkspace.tsx` | 免费候选编辑区引入 `free_omr_review` Pass 升单 | 候选编辑区同样显示三类独立动作 | **整文件提交（含历史未提交片段）**：包含原合奏覆盖确认、导航锁和源区域定位 |
| `apps/app/src/lib/auth-messages.ts` | 九语言注册说明澄清月度积分用途和新扫描需付费 | 注册时不再把 25 积分误解为免费扫描次数 | **整文件提交（含历史未提交片段）**：包含原英/西/德/俄密码重置说明修订 |
| `packages/shared/src/index.ts` | FREE_PLAN_CATALOG 澄清终身一次免费扫描与月积分用途 | 共享定价卡免费规则一致 | **整文件提交（含历史未提交片段）**：包含原配额、识谱结构、购买类型、Pass、MusicXML/PDF 等扩展；依赖未提交历史文件 |
| `apps/app/src/components/BillingManager.tsx` | 当日核验修复：预付积分四处改用现有 i18n 字典和数字插值 | 非中文账单不再出现中文硬编码说明 | **整文件提交（含历史未提交片段）**：包含原预付余额、一次性购买展示和订阅管理；支付请求未在本次重写 |
| `apps/app/src/lib/billing-messages/index.ts` | 免费套餐资源采用独立月积分用途文案 | app 定价卡清楚区分免费项目和月度积分 | **整文件提交（含历史未提交片段）**：包含原 MB 配额解析与美元格式本地化 |
| `apps/app/src/lib/billing-messages/types.ts` | 增加免费积分资源字段及预付积分四个 i18n 字段 | 无直接界面变化；保证九语言字段完整 | 所有消费方需使用同一字典类型 |
| `apps/app/src/lib/billing-messages/locales/en.ts` | 英文免费规则及四项预付积分文案 | 英文账单/定价说明一致 | **整文件提交（含历史未提交片段）**：包含原激活、购买、计费、存储等说明 |
| `apps/app/src/lib/billing-messages/locales/zh-CN.ts` | 简中免费规则及四项预付积分文案 | 简中账单/定价说明一致 | **整文件提交（含历史未提交片段）**：包含原激活、购买、计费、存储等说明 |
| `apps/app/src/lib/billing-messages/locales/zh-TW.ts` | 繁中免费规则及四项预付积分文案 | 繁中账单/定价说明一致 | **整文件提交（含历史未提交片段）**：包含原积分预留和 MB 存储说明 |
| `apps/app/src/lib/billing-messages/locales/ja.ts` | 日文免费规则及四项预付积分文案 | 日文账单/定价说明一致 | **整文件提交（含历史未提交片段）**：包含原积分预留和 MB 存储说明 |
| `apps/app/src/lib/billing-messages/locales/ko.ts` | 韩文免费规则及四项预付积分文案 | 韩文账单/定价说明一致 | **整文件提交（含历史未提交片段）**：包含原积分预留和 MB 存储说明 |
| `apps/app/src/lib/billing-messages/locales/fr.ts` | 法文免费规则及四项预付积分文案 | 法文账单/定价说明一致 | **整文件提交（含历史未提交片段）**：包含原购买、美元、积分预留和 MB 存储说明 |
| `apps/app/src/lib/billing-messages/locales/es.ts` | 西文免费规则及四项预付积分文案 | 西文账单/定价说明一致 | **整文件提交（含历史未提交片段）**：包含原激活、购买、计费、存储等说明 |
| `apps/app/src/lib/billing-messages/locales/de.ts` | 德文免费规则及四项预付积分文案 | 德文账单/定价说明一致 | **整文件提交（含历史未提交片段）**：包含原积分预留和 MB 存储说明 |
| `apps/app/src/lib/billing-messages/locales/ru.ts` | 俄文免费规则及四项预付积分文案 | 俄文账单/定价说明一致 | **整文件提交（含历史未提交片段）**：包含原积分预留和 MB 存储说明 |
| `apps/app/src/lib/workspace-messages/locales/en.ts` | 英文免费项目说明澄清积分用途和 Pass | 工作区说明与定价一致 | 文案不改变实际免费配额 |
| `apps/app/src/lib/workspace-messages/locales/zh-CN.ts` | 简中免费项目说明澄清积分用途和 Pass | 工作区说明与定价一致 | 文案不改变实际免费配额 |
| `apps/app/src/lib/workspace-messages/locales/zh-TW.ts` | 繁中免费项目说明澄清积分用途和 Pass | 工作区说明与定价一致 | 文案不改变实际免费配额 |
| `apps/app/src/lib/workspace-messages/locales/ja.ts` | 日文免费项目说明澄清积分用途和 Pass | 工作区说明与定价一致 | 文案不改变实际免费配额 |
| `apps/app/src/lib/workspace-messages/locales/ko.ts` | 韩文免费项目说明澄清积分用途和 Pass | 工作区说明与定价一致 | 文案不改变实际免费配额 |
| `apps/app/src/lib/workspace-messages/locales/fr.ts` | 法文免费项目说明澄清积分用途和 Pass | 工作区说明与定价一致 | 文案不改变实际免费配额 |
| `apps/app/src/lib/workspace-messages/locales/es.ts` | 西文免费项目说明澄清积分用途和 Pass | 工作区说明与定价一致 | 文案不改变实际免费配额 |
| `apps/app/src/lib/workspace-messages/locales/de.ts` | 德文免费项目说明澄清积分用途和 Pass | 工作区说明与定价一致 | **整文件提交（含历史未提交片段）**：包含原工作区德文称谓修订 |
| `apps/app/src/lib/workspace-messages/locales/ru.ts` | 俄文免费项目说明澄清积分用途和 Pass | 工作区说明与定价一致 | 文案不改变实际免费配额 |
| `apps/www/src/lib/homepage-localization/locales/en.ts` | 英文 free 卡 body/subcopy 澄清免费次数与积分用途 | 英文定价卡显示终身一次扫描和后续购买条件 | **整文件提交（含历史未提交片段）**：含历史 heroTitle/H1、FAQ、正文、Google 字段、积分与存储说明差异；本次未改写 SEO 内容 |
| `apps/www/src/lib/homepage-localization/locales/zh-CN.ts` | 简中 free 卡 body/subcopy 澄清免费次数与积分用途 | 简中定价卡显示实际免费边界 | **整文件提交（含历史未提交片段）**：含原 Google 字段、积分预留及存储配额调整 |
| `apps/www/src/lib/homepage-localization/locales/zh-TW.ts` | 繁中 free 卡 body/subcopy 澄清免费次数与积分用途 | 繁中定价卡显示实际免费边界 | **整文件提交（含历史未提交片段）**：含原 Google 字段、积分预留及存储配额调整 |
| `apps/www/src/lib/homepage-localization/locales/ja.ts` | 日文 free 卡 body/subcopy 澄清免费次数与积分用途 | 日文定价卡显示实际免费边界 | **整文件提交（含历史未提交片段）**：含原 Google 字段、积分预留及存储配额调整 |
| `apps/www/src/lib/homepage-localization/locales/ko.ts` | 韩文 free 卡 body/subcopy 澄清免费次数与积分用途 | 韩文定价卡显示实际免费边界 | **整文件提交（含历史未提交片段）**：含原 Google 字段、积分预留及存储配额调整 |
| `apps/www/src/lib/homepage-localization/locales/fr.ts` | 法文 free 卡 body/subcopy 澄清免费次数与积分用途 | 法文定价卡显示实际免费边界 | **整文件提交（含历史未提交片段）**：含原正文、美元、Google 字段、积分及存储说明修订 |
| `apps/www/src/lib/homepage-localization/locales/es.ts` | 西文 free 卡 body/subcopy 澄清免费次数与积分用途 | 西文定价卡显示实际免费边界 | **整文件提交（含历史未提交片段）**：含历史 heroTitle/H1、FAQ、正文、Google 字段、积分与存储说明差异；本次未改写 SEO 内容 |
| `apps/www/src/lib/homepage-localization/locales/de.ts` | 德文 free 卡 body/subcopy 澄清免费次数与积分用途 | 德文定价卡显示实际免费边界 | **整文件提交（含历史未提交片段）**：含原 Google 字段、积分预留及存储配额调整 |
| `apps/www/src/lib/homepage-localization/locales/ru.ts` | 俄文 free 卡 body/subcopy 澄清免费次数与积分用途 | 俄文定价卡显示实际免费边界 | **整文件提交（含历史未提交片段）**：含原 Google 字段、积分预留及存储配额调整 |
| `docs/operations/p5-one-score-pass-upsell.md` | 记录 Pass 主 CTA、中文独立兑换、source 后缀和真实免费配额 | 无直接界面变化 | Stripe live Price、上线漏斗和入账验证尚未执行 |
