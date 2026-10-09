# Codex 接手卡：ScoreTransposer 转化漏斗 P1–P5（2026-10-09）

## 角色与工作区

你是 **Codex**，在本机仓库工作：

- 路径：`E:\AI WEB\21.wuxianpu`
- 远程：`StaffToNumber`（常见分支名：`codex/commercial-mvp-seo-production`，以 `git status` / `git branch` 为准）
- 仓库里**已有大量未提交改动**，来自转化漏斗改造 **P1→P5**。你的任务是：**核实这些改动、修好任何回归、协助完成需人工批准的 GA4 / Clarity / Google Cloud 配置、在用户明确要求时干净提交、并按现有 Hetzner 脚本部署 www + app 到生产**。

不要假设聊天历史存在。本文件是完整上下文。

---

## 业务背景与目标

**产品**：ScoreTransposer（乐谱扫描 / 编辑 / 移调）  
**线上**：

- 官网：`https://scoretransposer.com`（及本地化路径）
- 应用：`https://app.scoretransposer.com`

**问题**：访问 → 使用 → 付费漏斗掉点严重。  
**目标**：降低登录与付费摩擦；免费识谱后用 **One Score Pass US$2.99** 承接「再处理一首」；中文区分银行卡支付与激活码兑换；免费文案与真实配额一致。

**分析**：GA4 Measurement ID `G-CERGG48WWE`（媒体资源 ScoreTransposer，Property ID 见 `docs/operations/ga4-key-events-checklist.md`）。

**SEO / GEO 红线**：未经用户明确同意，**不要改**公开 SEO 落地页的 URL / `<title>` / H1 / meta / FAQ（含结构化数据里的 FAQ）。P5 已改的是定价卡 **body/subcopy** 与应用内文案；若发现仍有「无限 25 积分免费扫描」类虚假表述，先报告再改，不要擅自动 H1/URL。

---

## 已完成改动（先核实，不要盲目重做）

以下按优先级完成；实现说明见 `docs/operations/p2-*.md` … `p5-*.md` 与 `google-seo-funnel-runbook.md`。

### P1 — 分析埋点与漏斗文档

- 规范 `upgrade_click` / `free_omr_created` 等漏斗事件参数。
- 关键文件（示例）：`ScoreLibraryManager.tsx`、`ScoreDetailClient.tsx`、`EntitlementGate.tsx`、`AppChrome.tsx`；`free_omr_created` 带 `recognition_mode`。
- 文档：`docs/operations/google-seo-funnel-runbook.md`、**新建** `docs/operations/ga4-key-events-checklist.md`。

### P2 — Google 登录 + 免费扫描登录摩擦

- GIS Google 按钮、游客导入草稿、登录后恢复。
- 关键文件：`AuthForm.tsx`、`auth-storage.ts`、Google button 相关 route、`HomeGoogleSignIn`、`SessionBootstrap`、`EntitlementGate`（guest）、`ScoreLibraryManager` + `import-draft`、`app-theme`（Google 按钮最小宽度）。
- 文档：`docs/operations/p2-google-signin-and-free-scan.md`。

### P3 — 移动端免费扫描两步路径

- 结构预检通过且仍有免费额度时：默认简单路径，高级模式折叠。
- 关键文件：`ScoreLibraryManager.tsx`、`score-recognition-preflight.ts`（+test）、`ScoreRecognitionPreflight.tsx`、`RecognitionModeCards.tsx`、`app-theme`（移动端约 44px 触控）、`score-preflight-messages`（9 语言）、部分 `score-entry` locales。
- 文档：`docs/operations/p3-free-scan-two-step.md`。

### P4 — 选套餐后登录自动继续结账

- www 定价弹窗与 app `/checkout`：登录/注册成功后**自动**走现有 `purchase()` / `startCheckout()` 一次；`sessionStorage` pending（约 30 分钟 TTL）；防双提交；成功/失败/取消清 pending；`begin_checkout` 仍在跳转前触发。
- **默认套餐**：无 `?plan=` 时用 **`starter-monthly`**（最低付费承诺），不再默认 featured 年付。
- 关键文件：www `purchase-flow.ts`（+test）、`PurchaseFlowProvider.tsx`、`PricingOffersClient.tsx`；app `AppCheckoutClient.tsx`、`CheckoutPlanSelector.tsx`。
- 文档：`docs/operations/p4-auto-continue-checkout.md`。

### P5 — One Score Pass $2.99 主 CTA + 中文支付拆分 + 免费文案澄清

- 免费 OMR 预览成功后：**主 CTA = One Score Pass US$2.99**（Stripe one_time）；订阅为次级；**zh-CN / zh-TW** 另有「激活码兑换」独立按钮（不再「升级」一点进激活码）。
- `upgrade_click` 的 `source` 现为：`<surface>_one_score` / `_subscription` / `_activation_code`，并带 `plan_type`。表面含：`trial_score_preview`、`free_omr_review`、`score_import`；另有 `checkout_activation_code`。
- **旧值** `trial_score_preview`、`score_import`（无后缀）部署后不再发出——GA 探索/筛选需更新。
- 免费真相（与 `FREE_TRIAL_OMR_JOBS=1`、`free-trial.ts`、`QUOTA_FREE_JOBS_PER_MONTH=25`、50MB 一致）：**终身 1 次免费识谱项目**；月度 25 积分用于导出/工具等，**再用积分开新扫描需 Pass 或套餐**。
- 关键文件：新建 `OneScorePassUpsell.tsx`、`one-score-upsell-copy.ts`；改 `TrialScorePreview.tsx`、`ScoreCandidateReviewWorkspace.tsx`、`ScoreLibraryManager.tsx`、`AppCheckoutClient.tsx`；`auth-messages` / `billing-messages` / `workspace-messages` / `score-entry` zh-CN；`packages/shared` `FREE_PLAN_CATALOG`；www homepage **free 卡 body**（9 语言，未动 H1/URL/title/FAQ）。
- 文档：`docs/operations/p5-one-score-pass-upsell.md`；runbook 中已注明 source 拆分。

---

## 官方漏斗事件（必须对齐）

```text
seo_landing_view → product_cta_click → sign_up → free_omr_created
  → free_omr_preview_viewed → upgrade_click → begin_checkout → purchase
```

**建议标记为 Key events**：`sign_up`、`free_omr_created`、`upgrade_click`、`begin_checkout`、`purchase`。

**自定义维度（事件范围，参数名与维度名一致）**：

- `free_trial`
- `source_type`
- `recognition_mode`
- `source`（upgrade_click 入口；现含 `_one_score` / `_subscription` / `_activation_code` 后缀）
- `landing_path`
- `method`（sign_up：email / google）

细节清单：`docs/operations/ga4-key-events-checklist.md`。

---

## 可执行任务清单（按序号做）

### 1. 核实代码与质量门禁

1. `git status` / `git diff`，聚焦 P1–P5 相关路径（见上节与各 `pN-*.md`）。**不要** `git reset --hard` / 丢弃无关未提交改动。
2. 修复发现的回归（类型错误、挂掉的单元测试、明显逻辑错误）。已知：`BillingManager.tsx` 内仍有硬编码 `locale === "zh-CN"` 分支，可能使 billing-messages 相关测试失败——属既有问题，非 P5 引入；不要为「消测试」大范围改文案架构，除非用户要求。
3. 构建 shared（若改过 `packages/shared`）：`npm run build -w @score/shared`
4. Typecheck：`npm run typecheck -w @score/www` 与 `npm run typecheck -w @score/app`
5. 相关单测：至少 `npm run test -w @score/www`；app 侧关注 `purchase-flow`、`score-recognition-preflight`、score-entry / billing 相关测试。记录失败是否为既有。
6. 临时文件**只**放在项目 `E:\AI WEB\21.wuxianpu\.tmp\`，用完删除；**禁止**把临时产物留在 `C:\`。

### 2. Stripe One Score Pass（single-score）线上配置

1. 阅读：`docs/operations/stripe-production-activation.md`、`deploy/hetzner/stripe.production.env.example`、历史说明 `docs/deployments/homepage-auth-single-score-2026-10-01.md`。
2. 确认生产存在 **Stripe one-time Price**，并写入运行时机密 **`STRIPE_SINGLE_SCORE_PRICE_ID`**（勿把密钥写进 git / 聊天）。
3. 确认 `NEXT_PUBLIC_CHECKOUT_AVAILABLE=true` 且 live providers 含 stripe（见 `deploy/hetzner/public.env`）。
4. 勿随意改 webhook secret 或 webhook 处理逻辑；若必须轮换，按现有支付 runbook 并征得用户确认。

### 3. Google Cloud Console（GIS）

客户端 ID 已在 `deploy/hetzner/public.env`：`NEXT_PUBLIC_GOOGLE_CLIENT_ID=…`。

在 Google Cloud → API 与服务 → 凭据 → 该 OAuth 2.0 客户端 ID 中，确认 **已获授权的 JavaScript 来源** 至少包含：

- `https://app.scoretransposer.com`
- `https://scoretransposer.com`
- （若生产实际使用 www 主机）`https://www.scoretransposer.com`

保存后用无痕窗口验证 Google 按钮可加载；若 GSI 被拦，应仍有邮箱登录回退（P2）。

### 4. GA4 控制台（通常需账号所有者点击）

按 `docs/operations/ga4-key-events-checklist.md`：

1. 标记 Key events（上列 5 个）。
2. 注册自定义维度（上列 6 个参数）。
3. 重建**漏斗探索** 8 步（仅用官方事件名，勿用 `first_visit` / `session_start`）。
4. 确认分析同意 Cookie 域为 **`.scoretransposer.com`**（`NEXT_PUBLIC_LOCALE_COOKIE_DOMAIN`，见 public.env）；未点「接受」则不加载 GA。
5. **更新**任何仍过滤旧 `upgrade_click` source=`trial_score_preview` 或 `score_import`（无后缀）的报告；改为 `*_one_score` / `*_subscription` / `*_activation_code`，或按 `plan_type` 拆分。

### 5. （可选）Microsoft Clarity

1. 新建 Clarity 项目，取得 Project ID。
2. 写入 `deploy/hetzner/public.env` 的 `NEXT_PUBLIC_CLARITY_PROJECT_ID`（勿提交密钥类文件若被 gitignore）。
3. **www + app** 都需用该环境变量重新构建部署后才有热力/录屏。

### 6. 部署 www + app（Hetzner 生产）

**两个前端都要部署**：P4/P5 改了 client，且 **shared 包**参与定价卡文案。

权威说明：

- `deploy/hetzner/README.md`（镜像构建示例、`FRONTEND=www|app`、主机 `polyadmin@2.29.25.230` 等）
- `deploy/hetzner/build-frontends.mjs`
- cutover / ops：`docs/operations/hetzner-cutover-2026-09-27.md`、`on-call-runbook.md`、`stripe-production-activation.md`

构建注意（README）：

- 优先在本地开发机构建；服务器避免并发构建。
- 示例：  
  `docker build -f deploy/hetzner/Dockerfile --target frontend --build-arg FRONTEND=www -t scoretransposer-www:RELEASE .`  
  `docker build -f deploy/hetzner/Dockerfile --target frontend --build-arg FRONTEND=app -t scoretransposer-app:RELEASE .`
- 前端脚本从**各自 workspace** 解析 Next.js，勿拿错根目录 Next 版本。
- 部署后按仓库惯例更新服务器 `.env` 的 `FRONTEND_RELEASE` / `APP_RELEASE`（若 app 与 www 解耦选择器），记录 release 目录与回滚点。

**不要**在未要求时改 API/worker/webhook，除非烟雾测试证明必须（例如 single-score price 未挂）。

### 7. 部署后烟雾测试

| 场景 | 期望 |
| --- | --- |
| 移动端免费扫描 | 两步：预检 → 一键简单识别（高级模式可展开） |
| 游客选文件 → 登录 | 草稿恢复，无需重选文件 |
| Google 按钮 | 可见可点，或邮箱回退可用 |
| www 定价：未登录选套餐 → 登录 | **自动**继续结账，无需二次点击同一套餐 |
| 免费预览成功页 | **主按钮** One Score Pass $2.99；订阅次级 |
| zh-CN / zh-TW | 三路径清晰：银行卡 Pass / 银行卡订阅 / 激活码兑换（文案勿混） |
| GA DebugView | 同意 Cookie 后串行看到漏斗事件；`upgrade_click` 的 `source` 带新后缀；跨子域无第二道 Cookie 墙 |

### 8. 提交（仅当用户明确要求 commit）

建议信息（可微调）：

```text
feat(conversion): P1–P5 funnel — analytics, Google/guest draft, free-scan 2-step, auto-checkout, $2.99 upsell

- P1: funnel events + GA4 checklists/runbook
- P2: GIS Google sign-in + guest import draft resume
- P3: mobile free simple OMR path after preflight
- P4: pending plan → auto purchase/checkout after auth; default starter-monthly
- P5: One Score Pass primary CTA; zh card vs activation split; free-tier copy honesty
```

提交前再次 `git status`，**只暂存**与本次转化相关的文件；不要把无关本地实验、`.tmp`、密钥塞进 commit。

---

## 硬约束

1. **禁止**临时文件落在 `C:\`；只用 `E:\AI WEB\21.wuxianpu\.tmp\`，用完清理。
2. **禁止** `git reset --hard` / clean 掉无关未提交工作。
3. **禁止**随意改支付 webhook secret 或 webhook 逻辑。
4. **禁止**擅自改 SEO 落地页 URL / title / H1 / meta / FAQ。
5. 对外可见操作（发邮件、改生产密钥、付费下单）需用户明确授权。
6. 不要把本文件里的示例客户端 ID 当成可提交密钥；生产机密留在服务器 env。

---

## 验收标准（Pass / Fail）

**代码与构建**

- [ ] Pass：`@score/www` 与 `@score/app` typecheck 通过（shared 已按需 rebuild）
- [ ] Pass：P1–P5 关键路径行为与各 `pN-*.md` 一致；无「登录后还要点第二次同一 CTA」回归（P4）
- [ ] Pass：免费预览主 CTA 为 $2.99 Pass；zh 有独立激活码 CTA（P5）
- [ ] Fail：误改 SEO H1/URL/title/FAQ；或丢弃大量无关未提交改动

**支付与登录配置**

- [ ] Pass：生产 `STRIPE_SINGLE_SCORE_PRICE_ID` 有效；Pass 结账能跳到 Stripe
- [ ] Pass：GIS 授权来源含 app + apex（+www 如需要）；Google 或邮箱登录可用
- [ ] Fail：webhook 被误改导致付款成功不入账

**分析**

- [ ] Pass：GA4 Key events + 自定义维度已登记（或已列出待人工勾选项并完成）
- [ ] Pass：漏斗探索用 8 个官方事件；筛选已适配新 `upgrade_click` source
- [ ] Pass：同意 Cookie Domain=`.scoretransposer.com`；DebugView 能走通主路径
- [ ] Fail：仍只按旧 source `trial_score_preview` / `score_import` 做关键报表且未更新

**部署**

- [ ] Pass：生产 **www 与 app** 均已用含 P1–P5 的镜像发布并完成上表烟雾测试
- [ ] Pass：回滚点 / RELEASE 标签已记录（按 hetzner README 惯例）
- [ ] Fail：只发了一个前端导致 shared 文案或结账行为不一致

**可选 Clarity**

- [ ] Pass 或 N/A：Project ID 已写入 public.env 且双前端重建；或明确记录为未做

---

## 快速索引

| 文档 | 用途 |
| --- | --- |
| `docs/operations/google-seo-funnel-runbook.md` | 官方漏斗与事件定义 |
| `docs/operations/ga4-key-events-checklist.md` | GA4 点击清单 |
| `docs/operations/p2-google-signin-and-free-scan.md` | P2 |
| `docs/operations/p3-free-scan-two-step.md` | P3 |
| `docs/operations/p4-auto-continue-checkout.md` | P4 |
| `docs/operations/p5-one-score-pass-upsell.md` | P5 |
| `docs/operations/stripe-production-activation.md` | Stripe 生产 |
| `deploy/hetzner/README.md` | Hetzner 构建与部署 |
| `deploy/hetzner/public.env` | 前端公开环境变量（含 GA4、Google Client ID） |

---

*本卡生成日期：2026-10-09（Asia/Shanghai）。执行时以仓库当前文件为准。*
