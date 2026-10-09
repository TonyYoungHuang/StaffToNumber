# Google SEO 与注册—免费识谱—升级漏斗上线清单

更新日期：2026-08-18（第 4 节漏斗口径于 2026-10-09 校准）

## 1. 本阶段交付范围

- Google 可抓取的绝对 sitemap、robots、canonical、Open Graph 和结构化数据。
- `/pdf-score-scanner` 在生产 OMR 开关开启时进入 sitemap 并允许索引。
- 官网和 `app.scoretransposer.com` 共用同一份分析同意 Cookie 与同一个 GA4 数据流。
- 漏斗事件不发送邮箱、文件名、乐谱内容或识别结果。
- Paddle/Stripe 首次付款确认后向运营邮箱发送提醒；Sandbox/Test 邮件明确标为测试，只有 Live 邮件标为真实需求，重复 Webhook 不重复提醒。

## 2. 需要创建的 Google 配置

生产状态（2026-08-18）：

- Search Console Domain property：`scoretransposer.com`，已验证。
- Sitemap：`https://scoretransposer.com/sitemap.xml`，2026-08-18 读取成功，发现 14 个页面。
- GA4 媒体资源：`ScoreTransposer`，Property ID `550391758`。
- Web 数据流：`ScoreTransposer Production`，Stream ID `15458085141`。
- Measurement ID：`G-CERGG48WWE`，Google 官方安装检测通过并已收到实时访问。

1. 在 Google Analytics 创建一个 Web 数据流，域名填写 `https://scoretransposer.com`，取得 `G-...` Measurement ID。
2. 在 Search Console 添加站点：
   - 推荐添加 Domain property `scoretransposer.com`，按 Google 提供的值在 DNS 添加 TXT；这覆盖主域和 `app.` 子域。
   - 如暂时只使用 URL-prefix property，可把 HTML meta 标签的 `content` 值配置为 `GOOGLE_SITE_VERIFICATION`。
3. Search Console 验证成功后提交 `https://scoretransposer.com/sitemap.xml`。

不要把完整 `<meta>` 标签放入环境变量，只填写 `content` 值。Domain property 的 DNS TXT 不能由本仓库代码代替。

## 3. 生产环境变量

两个前端必须在同一次生产构建中使用相同的值：

```text
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-CERGG48WWE
NEXT_PUBLIC_CLARITY_PROJECT_ID=
GOOGLE_SITE_VERIFICATION=
```

支付需求提醒由 API 使用：

```text
PAYMENT_NOTIFICATION_EMAIL=owner@example.com
EMAIL_FROM_ADDRESS=ScoreTransposer <no-reply@notify.scoretransposer.com>
RESEND_API_KEY=re_...
```

若 `RESEND_API_KEY` 或发件地址缺失，邮件只进入 preview 模式，不会真实送达。

## 4. 漏斗事件定义（官方口径，2026-10-09 校准）

**官方漏斗（GA4 探索 → 漏斗探索，按此顺序逐步填写“事件名称”完全等于）：**

```text
seo_landing_view → product_cta_click → sign_up → free_omr_created → free_omr_preview_viewed → upgrade_click → begin_checkout → purchase
```

事件名以代码为准（`apps/www/src/lib/analytics.ts`、`apps/app/src/lib/analytics.ts` 的 `trackFunnelEvent`）。不存在 `free_user_created`、`app_landing_view` 这类事件；如在 GA 里看到或在漏斗里自定义了这类名称，以本表为准改回。

| 顺序 | GA4 事件 | 触发点（代码位置） | 关键参数 | 建议 Key event |
| --- | --- | --- | --- | --- |
| 1 | `seo_landing_view` | 官网打开核心 SEO 功能页或 `/pricing`（`ProductionAnalytics.tsx`） | `landing_path` | 否 |
| 2 | `product_cta_click` | 官网任一 `a.public-button` 主按钮点击（`ProductionAnalytics.tsx`） | `link_text`, `link_url`, `page_path` | 否 |
| 3 | `sign_up` | 新账号注册成功，邮箱或 Google（`AuthForm.tsx`、`PurchaseFlowProvider.tsx`） | `method=email\|google` | **是** |
| 4 | `free_omr_created` | OMR 识别任务创建成功（`ScoreLibraryManager.tsx`） | `free_trial`, `source_type=pdf\|image`, `recognition_mode=simple\|complex` | **是** |
| 5 | `free_omr_preview_viewed` | 免费候选五线谱完成并可查看，每个乐谱只记一次（`TrialScorePreview.tsx`） | `preview_type` | 否 |
| 6 | `upgrade_click` | 任一升级入口点击（见下方 `source` 取值） | `source` | **是** |
| 7 | `begin_checkout` | 本地订单创建成功、跳转支付前（官网 `CheckoutClient`/`PurchaseFlowProvider`，应用 `AppCheckoutClient`） | `payment_type`, `plan_code`, `plan_kind` | **是** |
| 8 | `purchase` | 成功页确认本地订单已支付，按订单 ID 去重（`CheckoutStatusClient`/`AppCheckoutStatusClient`） | `transaction_id`, `value`, `currency`, `items` | **是**（GA4 默认已是） |

说明：

- `free_omr_created` 对付费账号也会触发；看“免费”漏斗时按 `free_trial = true` 过滤（需先把 `free_trial` 注册为自定义维度，见 `docs/operations/ga4-key-events-checklist.md`）。
- `upgrade_click` 的 `source` 取值：`trial_score_preview`（免费预览页解锁）、`score_import`（上传页额度不足/升级）、`score_import_draft_failed`、`score_detail_locked`（乐谱详情页无权限）、`entitlement_gate` / `entitlement_gate_activation`（权益拦截面板）、`app_header`（应用顶部“升级”按钮）。
- P5 起：`trial_score_preview` / `score_import` 拆分为 `<surface>_one_score` / `<surface>_subscription` / `<surface>_activation_code`（新增 `free_omr_review_*`、`checkout_activation_code`），并附带 `plan_type` 参数；详见 `p5-one-score-pass-upsell.md`。
- 辅助事件（不进主漏斗，但保留）：`page_view`（两站手动发送，`send_page_view=false`）、`login`（老用户登录）、`view_item_list` / `select_item`（应用结账页套餐列表与选择）。GA4 自动事件 `first_visit`、`session_start`、`user_engagement`、`scroll`、`form_start` 等不是本站埋点，不要放进漏斗。

`purchase` 使用本地订单 ID 去重。Paddle/Stripe Webhook 是付款和权益的真相源；浏览器事件只用于漏斗分析，不能用于发放权益。

**Key events 建议**：`sign_up`、`free_omr_created`、`upgrade_click`、`begin_checkout`、`purchase`。截至 2026-10-09 GA 事件表已收到 `sign_up`、`free_omr_created`，可以直接标记；具体点击路径见 `docs/operations/ga4-key-events-checklist.md`。零流量阶段先看每一步是否有数据，不设置虚假的转化率目标。

**Clarity 仍未启用**：生产环境 `NEXT_PUBLIC_CLARITY_PROJECT_ID` 为空（`deploy/hetzner/public.env` 未配置），因此热力图和会话录屏目前没有数据。需要在 clarity.microsoft.com 创建项目、取得 Project ID，填入后两个前端一起重新构建部署。

## 5. 发布与验收

1. 使用上述环境变量构建并部署官网和应用，不能只部署其中一个子域。
2. 运行：

```powershell
node scripts/audit-production-seo.mjs --base-url https://scoretransposer.com --required-paths /pdf-score-scanner
```

当前使用已验证的 Domain property，不依赖 HTML verification meta，因此不要为该模式添加 `--require-google-verification`。

3. 在浏览器同意分析 Cookie，确认 Cookie Domain 为 `.scoretransposer.com`，进入 `app.` 后不再次丢失同意状态。
4. 用 GA4 DebugView/Realtime 依次验证 `seo_landing_view → product_cta_click → sign_up → free_omr_created → free_omr_preview_viewed → upgrade_click → begin_checkout`（逐项清单见 `docs/operations/ga4-key-events-checklist.md`）。
5. 用 Paddle Sandbox 完成一次支付，确认 `purchase` 只出现一次、账户权益已开通，并且 `PAYMENT_NOTIFICATION_EMAIL` 收到提醒。
6. Search Console 提交 sitemap 后检查抓取状态；收录可能需要数天到数周，提交 sitemap 不是排名保证。

## 6. 首批数据的判断方式

- 有展示、无点击：调整 Title、Description 和搜索意图，不扩页面数量。
- 有点击、无注册：检查落地页证据、免费承诺和 CTA。
- 有注册、无免费 OMR：检查上传格式说明、移动端和任务创建错误。
- 有候选预览、无升级：优先检查识别质量、付费边界和价格，而不是继续开发非核心功能。
- 有 Checkout、无付款：检查 Paddle 商户状态、付款方式、币种、信任信息和结账失败提示。
