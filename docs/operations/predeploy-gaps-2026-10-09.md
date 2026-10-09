# 部署前补齐与人工清单（2026-10-09）

范围：从 `fa380b91a256cd3351f8c72a7df5fbe4ca000049` 续跑 P1–P5 的历史依赖补齐，提交并推送到 `codex/commercial-mvp-seo-production`。**本轮不部署 Hetzner，不改服务器、生产密钥或支付 webhook；不改 SEO 落地页 URL、标题、H1。**

## 已补齐：仓库依赖

- 补入四个明确遗漏：`apps/app/src/lib/flow-return.ts`、`apps/app/src/components/AppAuthModal.tsx`、`apps/app/src/lib/recognition-options.ts`、`packages/shared/src/single-score-copy.ts`。
- 从 `fa380b9` 的独立 worktree 查缺，补入官网购买卡片、One Tap、乐谱工作区、来源定位、处理进度、错误字典和共享模型的实际引用链。另补 `/api/session` 与 `/api/auth/google-one-tap` 路由：它们是会话恢复与 One Tap 的运行依赖，单纯类型检查不能发现其缺失。
- 增加 `@coderline/alphatab@1.8.4`、`fast-xml-parser@5.10.1` 及锁文件。保留原 API/worker 的依赖记录和版本；补齐 alphaTab 运行时 worker、worklet、core、字体、SF2 音源及许可证，以及 Smoosic selector 的 MIT 许可证。
- `packages/i18n/src/index.ts` 只新增前端实际需要的预检与错误字典出口；`packages/ui/src/index.ts` 只新增处理进度面板出口。`apps/www/src/lib/site.ts` 只补 `getCheckoutUrl` 的单次购买参数和本地化定价入口，原站点标题、描述和其他 URL 函数保留。
- 不把完整脏工作区当作发布快照。必要文件从独立验证快照非交互式暂存；其他历史代码、媒体、部署脚本和私有 env 保留在原工作区。

验证结果和逐文件依赖表见文末。本轮验证仅证明这一提交的 www/app 可构建；不代表 API/worker 整体历史改动已提交，也不证明真实 OAuth、支付入账或 GA4 后台已验收。

## 已核对：Stripe One Score Pass

复用断线前 `.tmp/codex-predeploy-20261009-204837.log` 的只读回执（日志第 3699 行），本轮没有再次连接服务器或 Stripe：

| 项目 | 已有证据 / 状态 |
| --- | --- |
| `STRIPE_SINGLE_SCORE_PRICE_ID` | 生产 `shared/runtime.env` 已存在，运行中 API 与其一致，匹配 `price_1ULkzJLCnXfyZDqLyDZXrlLj` |
| Stripe Price | `livemode=true`、`active=true`、`currency=usd`、`unit_amount=299`、`type=one_time` |
| API provider | 运行配置包含 `stripe`，密钥类型为 Live；没有复制密钥值 |
| `NEXT_PUBLIC_CHECKOUT_AVAILABLE` | 本地 `deploy/hetzner/public.env` 为 `true` |
| 前端 provider | 同文件 `NEXT_PUBLIC_PAYMENT_PROVIDERS=paddle,stripe`、`NEXT_PUBLIC_LIVE_PAYMENT_PROVIDERS=paddle,stripe` |
| env 示例 | 原 `deploy/hetzner/stripe.production.env.example` 漏了单谱 Price 字段；本轮补入空白 `STRIPE_SINGLE_SCORE_PRICE_ID=` 及说明，文件不含密钥 |

产品、价格与一次性权益说明复核自 [10 月 1 日发布记录](../deployments/homepage-auth-single-score-2026-10-01.md)；运行配置位置与密钥边界见 [Stripe 生产说明](stripe-production-activation.md)。生产已有配置无需重复创建产品或替换密钥。

注意：旧回执中 www/app 容器的 `NEXT_PUBLIC_*` runtime env 是 `null`，**不能由此断言缺配置**；Next 在构建时把公开变量写入浏览器产物。上述前端开关核对的是 `public.env` 的构建输入，不是对未来镜像或当前浏览器产物的新验收。后续获准发布时须让 www/app 同时使用该文件构建。

如新服务器或后续检查确实发现缺项，按以下清单人工补齐；本轮不执行：

1. Stripe Dashboard 切到 **Live** → **Product catalog / 产品目录** → 找到 One Score Pass（已有产品 `prod_VMTxgAC1cnNme1`）→ 核对价格为 USD 2.99、一次性、启用；复制相应 Price ID。已匹配现有价格时直接复用，不新增重复 SKU。
2. 在服务器私有 `/srv/sites/scoretransposer/shared/runtime.env` 填入 `STRIPE_SINGLE_SCORE_PRICE_ID=price_1ULkzJLCnXfyZDqLyDZXrlLj`；保留既有 Live 密钥、webhook 和 Paddle，确保 `PAYMENT_PROVIDERS` 包含 `stripe`，私有文件权限保持 600。Price ID 是价格标识，不是 secret；密钥不得写入 Git 或 `NEXT_PUBLIC_*`。
3. 双前端构建输入设 `NEXT_PUBLIC_CHECKOUT_AVAILABLE=true`，两份 provider 列表均保留 `stripe`。配置变化之后的 API 加载、双前端重建与发布留到另行授权的部署任务。

**仍待人工验收：** 真实 One Score Pass 付款、webhook 幂等入账、权益发放/退款及银行到账没有本轮证据。需在获准的测试环境或后续真实业务中核验，不能把 Price 读取成功当作付款成功。

## 待用户点：Google Cloud 授权来源

本地 `deploy/hetzner/public.env` 的公开客户端 ID 为：

```text
197772512602-qu2uh3poji5itp19ajaiu6birililo5o.apps.googleusercontent.com
```

本会话没有可用的已登录 Google Cloud 控制台连接，**未读取或修改控制台中的实际来源列表**。按 [Google 官方 GIS 设置说明](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) 完成以下点击：

1. 打开 [Google Cloud Console](https://console.cloud.google.com/)，使用该 OAuth 客户端所属账号登录；顶部项目选择器选拥有此客户端的项目，不能只凭显示名称选错项目。
2. 左侧 **Google Auth Platform → Clients（客户端）**；旧界面可走 **API 与服务 → 凭据 → OAuth 2.0 客户端 ID**。
3. 打开类型为 **Web application** 的客户端，逐字核对完整 Client ID 与上面一致。
4. 在 **Authorized JavaScript origins / 已获授权的 JavaScript 来源** 点 **Add URI / 添加 URI**，核对下表；保留既有合法来源，点 **Save / 保存**。来源只有协议和主机，不带路径、查询、尾部 `/` 或通配符。

| 待用户点 | JavaScript 来源 | 用途 |
| --- | --- | --- |
| 必须核对 | `https://app.scoretransposer.com` | 实际 GIS 按钮与 One Tap 中间 iframe |
| 必须核对 | `https://scoretransposer.com` | 官网购买/登录入口 |
| 使用 www 登录入口时核对 | `https://www.scoretransposer.com` | www 别名；若全部先跳转 apex，则可不新增 |

当前代码走 GIS JavaScript credential callback；不需要因为本清单另造 OAuth redirect URI，尤其不要把上述 origin 填到“重定向 URI”里代替 JS 来源。只在明确启用本地 Google 登录时增加实际使用的 localhost 来源；本轮未增加。

- [ ] **待用户点：** 保存上述来源，记录核对日期与客户端 ID。
- [ ] **待用户点：** 用可访问 Google 的无痕浏览器测试真实账号登录、会话恢复和登录后继续已选结账；脚本未加载时仍应有邮箱回退。One Tap 是否弹出受账号/浏览器状态影响，不以每次弹出为通过条件。

## 待用户点：GA4 Key events 与自定义维度

按 [仓库 GA4 清单](ga4-key-events-checklist.md)，媒体资源 **ScoreTransposer**，Property ID **550391758**，Measurement ID **G-CERGG48WWE**。本会话没有已登录 GA4 管理连接，以下均未在后台核验或保存。

1. 打开 [Google Analytics](https://analytics.google.com/)，确认选中上述媒体资源。
2. **Admin / 管理 → Data display / 数据显示 → Events / 事件 → Recent events / 近期事件**，对以下事件打开星标。若事件尚未出现，新界面点 **+ Create event**、输入精确事件名并开启 **Mark as key event**；若界面仍有 **Key events → New key event**，用该入口登记同名事件。不要另建基于 `page_view` 的规则来重复发送已有代码事件。界面操作依据 [Google 官方 Key event 说明](https://support.google.com/analytics/answer/13128484?hl=en-SG)。

| 待用户点 | 关键事件 |
| --- | --- |
| 未核验 | `sign_up` |
| 未核验 | `free_omr_created` |
| 未核验 | `upgrade_click` |
| 未核验 | `begin_checkout` |
| 确认默认开启 | `purchase` |

3. **Admin → Data display → Custom definitions / 自定义定义 → Custom dimensions → Create custom dimensions**，下列每项范围选 **Event / 事件**，维度名与参数名一致。已存在时核对后复用，不重复创建；保存后范围与参数不可改，见 [Google 官方事件维度说明](https://support.google.com/analytics/answer/14239696?hl=en)。

| 待用户点 | 维度名 / 事件参数 | 用途 |
| --- | --- | --- |
| 未核验 | `free_trial` | 免费/付费 OMR |
| 未核验 | `source_type` | pdf / image |
| 未核验 | `recognition_mode` | simple / complex |
| 未核验 | `source` | 升单入口 |
| 未核验 | `landing_path` | SEO 落地页 |
| 未核验 | `method` | email / google 注册 |

关键事件标记不会重算历史数据；自定义维度创建并收集数据后通常需 24–48 小时才能用于报告/探索。没有按钮时请使用有编辑权限的账号。

4. **Explore / 探索 → Funnel exploration / 漏斗探索**，按 [官方漏斗定义](google-seo-funnel-runbook.md) 建八个“事件名称完全等于”步骤：

```text
seo_landing_view → product_cta_click → sign_up → free_omr_created
→ free_omr_preview_viewed → upgrade_click → begin_checkout → purchase
```

5. 升单来源报表须覆盖 `trial_score_preview_*`、`free_omr_review_*`、`score_import_*` 的 `_one_score` / `_subscription` / `_activation_code` 后缀及 `checkout_activation_code`；不能继续只筛旧的裸 `trial_score_preview` / `score_import`。参数 `plan_type` 已由代码发送，若要直接用于探索，再按事件范围登记该维度；它是对原六项清单的可选补充。
6. 获准发布新前端后，按 GA4 清单做 **DebugView**：官网接受分析 Cookie 后转 app，不再次弹 Cookie 提示；同意 Cookie `scoretransposer_analytics_consent=granted` 的域应为 `.scoretransposer.com`，两站保持同一 `_ga` 设备。串行确认八步及参数；付款步骤在授权测试环境进行，`purchase` 只出现一次。本轮未部署，也未把该线上验证标成完成。

- [ ] **待用户点：** 五项 Key events（含确认 `purchase`）。
- [ ] **待用户点：** 六项事件范围自定义维度。
- [ ] **待用户点：** 八步漏斗探索及新 source 筛选。
- [ ] **待用户点 / 后续发布后：** DebugView、跨子域同意与真实 OAuth/付款验收。
- [ ] **可选 Clarity：** 创建项目，将 Project ID 填入双前端公开构建变量 `NEXT_PUBLIC_CLARITY_PROJECT_ID`；本轮未配置，生效需另行授权重建发布。

## 独立验证结果

验证目录：`.tmp/predeploy-fa380b9`，基线为 `fa380b9`，仅补入下表文件；没有把主工作区的 `node_modules`、构建产物或私有 env 复制进去。Node 22.15.0 / npm 10.9.2 / Next 16.3.0 / TypeScript 5.8.3。

| 检查 | 结果 |
| --- | --- |
| 干净依赖安装 | 前端及 i18n/shared/ui workspace 的 `npm ci --ignore-scripts --no-audit --no-fund` 通过，146 个包；跳过服务端原生安装脚本，不代表 API/worker 安装验证 |
| 共享库构建 | `@score/i18n`、`@score/shared`、`@score/ui` 均 exit 0 |
| www / app 类型检查 | `npm run typecheck -w @score/www` 与 `@score/app` 均 exit 0 |
| 单测 | www **90/90**、app **152/152**、i18n **15/15**，无跳过项 |
| www / app 生产构建 | `npm run build -w @score/www` 与 `@score/app` 均 exit 0，完整执行类型检查与页面生成，没有关闭类型检查 |
| 构建配置 | 只在构建进程读取本地 `public.env` 的公开变量；Checkout/Stripe/Google/GA4 与上文一致；文件本身未暂存 |

第一轮单测暴露了旧测试与 `fa380b9` 已提交行为不一致：存储配额仍断言旧 GB 数值、账单价格仍要求英文格式、详情页仍要求旧错误/候选确认参数、激活链接仍要求旧入口。仅更新这些对应断言，保留配额、金额、错误本地化、覆盖确认和激活入口的约束；没有引入脏工作区里的独立 SEO 测试与页面改动。

原始日志保留在 `.tmp/predeploy-{npm-ci-final,typecheck-www,typecheck-app,test-www,test-app,test-i18n,build-www,build-app}.log`，不入 Git。构建会提示 middleware 文件约定已弃用；沿用现有代码，未在本轮迁移路由。没有运行 Hetzner Docker 镜像构建、生产部署或真实 Google/Stripe/GA4 浏览器验收；相关验收仍按上面的人工清单执行。

暂存清单与独立验证快照逐文件一致，未命中私钥/Stripe secret/token 特征。默认 `git diff --cached --check` 仅报告 alphaTab/Smoosic 上游 vendor 文件已有的尾部空白，保留上游原件；排除 `apps/app/public/vendor` 与 `apps/app/src/lib/vendor` 后产品代码、测试和文档的空白检查通过。主工作区 9 个混合文件的其他本地改动未被覆盖或一并提交。

## 本次提交的必要依赖清单

共 **80 个文件**，其中必要依赖与对应测试 78 个、env 示例与本说明 2 个。历史依赖按原内容补入，不把它们记成今日全新开发；少量已跟踪文件从基线只提取必要接口及对应断言。下表不包含 `.tmp`、私有 env 和其他历史实验。

| 文件 | 必要性 / 引用来源 |
| --- | --- |
| `apps/app/package.json` | ScoreAlphaTabPanel / alpha-tab-playback |
| `apps/app/public/vendor/alphatab/alphaTab.core.mjs` | ScoreAlphaTabPanel runtime URL / licenses |
| `apps/app/public/vendor/alphatab/alphaTab.worker.mjs` | ScoreAlphaTabPanel runtime URL / licenses |
| `apps/app/public/vendor/alphatab/alphaTab.worklet.mjs` | ScoreAlphaTabPanel runtime URL / licenses |
| `apps/app/public/vendor/alphatab/font/Bravura-OFL.txt` | ScoreAlphaTabPanel runtime URL / licenses |
| `apps/app/public/vendor/alphatab/font/Bravura.otf` | ScoreAlphaTabPanel runtime URL / licenses |
| `apps/app/public/vendor/alphatab/font/Bravura.woff` | ScoreAlphaTabPanel runtime URL / licenses |
| `apps/app/public/vendor/alphatab/font/Bravura.woff2` | ScoreAlphaTabPanel runtime URL / licenses |
| `apps/app/public/vendor/alphatab/LICENSE` | ScoreAlphaTabPanel runtime URL / licenses |
| `apps/app/public/vendor/alphatab/soundfont/LICENSE` | ScoreAlphaTabPanel runtime URL / licenses |
| `apps/app/public/vendor/alphatab/soundfont/README.md` | ScoreAlphaTabPanel runtime URL / licenses |
| `apps/app/public/vendor/alphatab/soundfont/sonivox.sf2` | ScoreAlphaTabPanel runtime URL / licenses |
| `apps/app/src/app/api/auth/google-button/route.test.ts` | P2 origin and button route tests |
| `apps/app/src/app/api/auth/google-one-tap/route.ts` | GoogleOneTap intermediate iframe |
| `apps/app/src/app/api/session/route.test.ts` | session restore security tests |
| `apps/app/src/app/api/session/route.ts` | SessionBootstrap session restore |
| `apps/app/src/app/scores/[id]/ensemble/page.tsx` | ScoreLibraryManager / ScoreDetailClient ensemble navigation |
| `apps/app/src/components/AppAuthModal.tsx` | apps/app/src/components/EntitlementGate.tsx |
| `apps/app/src/components/ScoreAccessWorkspace.tsx` | ensemble page: forward existing ScoreDetailClient ensemble option only |
| `apps/app/src/components/ScoreAlphaTabPanel.tsx` | apps/app/src/components/ScoreEnsembleWorkspace.tsx |
| `apps/app/src/components/ScoreEnsemblePartCreator.tsx` | apps/app/src/components/ScoreEnsembleWorkspace.tsx |
| `apps/app/src/components/ScoreEnsembleWorkspace.tsx` | apps/app/src/components/ScoreDetailClient.tsx |
| `apps/app/src/components/ScoreImportStatus.tsx` | apps/app/src/components/ScoreDetailClient.tsx |
| `apps/app/src/components/ScoreNotationProperties.tsx` | apps/app/src/components/ScoreEnsembleWorkspace.tsx |
| `apps/app/src/components/ScoreOmrReviewPanel.tsx` | ScoreCandidateReviewWorkspace / ScoreDetailClient focused source region |
| `apps/app/src/components/ScoreOperationBoundary.tsx` | apps/app/src/components/ScoreCandidateReviewWorkspace.tsx |
| `apps/app/src/components/ScoreWorkspace.tsx` | apps/app/src/components/ScoreDetailClient.tsx |
| `apps/app/src/lib/alpha-tab-event-map.ts` | apps/app/src/components/ScoreAlphaTabPanel.tsx |
| `apps/app/src/lib/alpha-tab-playback.test.ts` | alpha-tab-playback tests |
| `apps/app/src/lib/alpha-tab-playback.ts` | apps/app/src/components/ScoreAlphaTabPanel.tsx |
| `apps/app/src/lib/app-messages.ts` | AppChrome login label |
| `apps/app/src/lib/billing-messages/billing-messages.test.ts` | align regression tests with P1–P5 committed interfaces and catalog amounts |
| `apps/app/src/lib/ensemble-messages.ts` | apps/app/src/components/ScoreCandidateReviewWorkspace.tsx |
| `apps/app/src/lib/ensemble-score-selection.test.ts` | ensemble-score-selection tests |
| `apps/app/src/lib/ensemble-score-selection.ts` | apps/app/src/components/ScoreCandidateReviewWorkspace.tsx |
| `apps/app/src/lib/flow-messages.ts` | apps/app/src/lib/flow-messages/client.tsx |
| `apps/app/src/lib/flow-messages/client.tsx` | apps/app/src/components/AppCheckoutClient.tsx |
| `apps/app/src/lib/flow-return.ts` | apps/app/src/components/AppCheckoutClient.tsx |
| `apps/app/src/lib/music-labels.test.ts` | music-labels tests |
| `apps/app/src/lib/music-labels.ts` | apps/app/src/components/ScoreDetailClient.tsx |
| `apps/app/src/lib/recognition-options.ts` | apps/app/src/components/RecognitionModeCards.tsx |
| `apps/app/src/lib/score-detail-messages/score-detail-messages.test.ts` | align regression tests with P1–P5 committed interfaces and catalog amounts |
| `apps/app/src/lib/score-operation-messages.ts` | apps/app/src/lib/flow-messages.ts |
| `apps/app/src/lib/score-readiness-messages.ts` | apps/app/src/components/ScoreImportStatus.tsx |
| `apps/app/src/lib/shop-activation.ts` | apps/app/src/components/AuthForm.tsx |
| `apps/app/src/lib/vendor/smoosic/LICENSE.md` | selector.ts MIT notice |
| `apps/app/src/lib/vendor/smoosic/selector.ts` | apps/app/src/lib/ensemble-score-selection.ts |
| `apps/app/src/lib/workspace-messages/workspace-messages.test.ts` | align regression tests with P1–P5 committed interfaces and catalog amounts |
| `apps/www/package.json` | required dependency / P1–P5 regression test suite |
| `apps/www/src/components/GoogleOneTap.tsx` | apps/www/src/components/PurchaseFlowProvider.tsx |
| `apps/www/src/components/PlanCardFrame.module.css` | apps/www/src/components/PlanCardFrame.tsx |
| `apps/www/src/components/PlanCardFrame.tsx` | apps/www/src/components/PurchasePlanCard.tsx |
| `apps/www/src/components/PurchaseFlow.module.css` | apps/www/src/components/PricingOffersClient.tsx |
| `apps/www/src/components/PurchasePlanCard.tsx` | apps/www/src/components/PricingOffersClient.tsx |
| `apps/www/src/components/SingleScoreOffer.tsx` | apps/www/src/components/PricingOffersClient.tsx |
| `apps/www/src/lib/api.ts` | PurchaseFlowProvider status-aware auth/checkout errors |
| `apps/www/src/lib/home-presentation.ts` | apps/www/src/components/SingleScoreOffer.tsx |
| `apps/www/src/lib/homepage-localization/types.ts` | PurchaseFlowProvider Google copy |
| `apps/www/src/lib/pricing-catalog.test.ts` | align regression tests with P1–P5 committed interfaces and catalog amounts |
| `apps/www/src/lib/purchase-copy.ts` | apps/www/src/components/PurchaseFlowProvider.tsx |
| `apps/www/src/lib/site.ts` | P4 purchase cards and purchase-flow.test: billingKind and direct checkout URL only; preserve SEO metadata |
| `deploy/hetzner/stripe.production.env.example` | One Score Pass env 示例补字段（仅空值） |
| `docs/operations/predeploy-gaps-2026-10-09.md` | 已补齐 / 待用户点及独立验证记录 |
| `package-lock.json` | alphaTab and fast-xml-parser dependency lock |
| `packages/i18n/package.json` | required dependency / P1–P5 regression test suite |
| `packages/i18n/src/api-errors.test.ts` | checkout/quota diagnostics and USD catalog regression tests |
| `packages/i18n/src/api-errors.ts` | ScoreLibraryManager / ScoreDetailClient error localization |
| `packages/i18n/src/de-ru-errors.ts` | api-errors.ts |
| `packages/i18n/src/en-es-errors.ts` | api-errors.ts |
| `packages/i18n/src/formatters.ts` | P1–P5 pricing and billing import localizeUsdText |
| `packages/i18n/src/index.ts` | ScoreRecognitionPreflight / ScoreImportStatus |
| `packages/i18n/src/score-pass-errors.ts` | api-errors.ts |
| `packages/i18n/src/score-preflight-messages.test.ts` | score-preflight-messages dictionary tests |
| `packages/shared/package.json` | musicxml-preservation.ts |
| `packages/shared/src/musicxml-preservation.ts` | packages/shared/src/index.ts |
| `packages/shared/src/shop-credit-packs.ts` | packages/shared/src/index.ts |
| `packages/shared/src/single-score-copy.ts` | packages/shared/src/index.ts |
| `packages/ui/src/credit-plan-card.tsx` | PurchasePlanCard / SingleScoreOffer busy and click handlers |
| `packages/ui/src/index.ts` | ScoreImportStatus |
| `packages/ui/src/score-processing-panel.tsx` | ScoreImportStatus |
