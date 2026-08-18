# Google SEO 与注册—免费识谱—升级漏斗上线清单

更新日期：2026-08-18

## 1. 本阶段交付范围

- Google 可抓取的绝对 sitemap、robots、canonical、Open Graph 和结构化数据。
- `/pdf-score-scanner` 在生产 OMR 开关开启时进入 sitemap 并允许索引。
- 官网和 `app.scoretransposer.com` 共用同一份分析同意 Cookie 与同一个 GA4 数据流。
- 漏斗事件不发送邮箱、文件名、乐谱内容或识别结果。
- Paddle/Stripe 首次付款确认后向运营邮箱发送提醒；Sandbox/Test 邮件明确标为测试，只有 Live 邮件标为真实需求，重复 Webhook 不重复提醒。

## 2. 需要创建的 Google 配置

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
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
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

## 4. 漏斗事件定义

| 顺序 | GA4 事件 | 触发点 | 关键参数 |
| --- | --- | --- | --- |
| 1 | `seo_landing_view` | 用户打开核心 SEO 功能页 | `landing_path` |
| 2 | `product_cta_click` | 官网主 CTA 点击 | `link_text`, `page_path` |
| 3 | `sign_up` | 邮箱注册成功 | `method=email` |
| 4 | `free_omr_created` | 首次 OMR 任务创建成功 | `free_trial`, `source_type` |
| 5 | `free_omr_preview_viewed` | 免费候选五线谱完成并可查看 | `preview_type` |
| 6 | `upgrade_click` | 免费额度页或候选页点击升级 | `source` |
| 7 | `begin_checkout` | 本地订单创建成功、跳转支付前 | `payment_type`, `plan_kind` |
| 8 | `purchase` | 成功页确认本地订单已支付 | `transaction_id`, `value`, `currency`, `items` |

`purchase` 使用本地订单 ID 去重。Paddle/Stripe Webhook 是付款和权益的真相源；浏览器事件只用于漏斗分析，不能用于发放权益。

在 GA4 Admin 中把 `sign_up`、`free_omr_created`、`upgrade_click` 和 `purchase` 标记为 Key events。零流量阶段先看每一步是否有数据，不设置虚假的转化率目标。

## 5. 发布与验收

1. 使用上述环境变量构建并部署官网和应用，不能只部署其中一个子域。
2. 运行：

```powershell
node scripts/audit-production-seo.mjs --base-url https://scoretransposer.com --required-paths /pdf-score-scanner --require-google-verification
```

3. 在浏览器同意分析 Cookie，确认 Cookie Domain 为 `.scoretransposer.com`，进入 `app.` 后不再次丢失同意状态。
4. 用 GA4 DebugView/Realtime 依次验证 `seo_landing_view → sign_up → free_omr_created → free_omr_preview_viewed → upgrade_click → begin_checkout`。
5. 用 Paddle Sandbox 完成一次支付，确认 `purchase` 只出现一次、账户权益已开通，并且 `PAYMENT_NOTIFICATION_EMAIL` 收到提醒。
6. Search Console 提交 sitemap 后检查抓取状态；收录可能需要数天到数周，提交 sitemap 不是排名保证。

## 6. 首批数据的判断方式

- 有展示、无点击：调整 Title、Description 和搜索意图，不扩页面数量。
- 有点击、无注册：检查落地页证据、免费承诺和 CTA。
- 有注册、无免费 OMR：检查上传格式说明、移动端和任务创建错误。
- 有候选预览、无升级：优先检查识别质量、付费边界和价格，而不是继续开发非核心功能。
- 有 Checkout、无付款：检查 Paddle 商户状态、付款方式、币种、信任信息和结账失败提示。
