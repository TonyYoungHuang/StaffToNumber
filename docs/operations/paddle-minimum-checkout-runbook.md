# Paddle 最小收款链路上线清单

## 目标与边界

当前只上线一个个人订阅购买入口，验证用户是否愿意购买。Stripe 的代码和配置接口保留，但不要求现在完成 Stripe Live 审核。首发不做学校套餐、自助退款、优惠券和复杂税务页面。

代码链路为：注册用户点击升级 → API 创建 Paddle Transaction → Paddle Checkout 收款 → 签名 Webhook 更新订单和订阅 → 当前账户自动获得付费权益 → 用户继续 OMR、校对和完整导出。

## 0. 当前账户策略

- 现在先用独立的 Paddle Sandbox 账号跑通技术验收；Sandbox 不收真钱，不要求网站审批，因此不需要先有香港银行卡。
- Live 收款仍需 Paddle 完成网站、业务和身份审核。中国大陆不在 Paddle 当前公布的不支持供应商国家清单中，但最终是否接受账户以 Paddle 审核结果为准。
- Paddle 当前公布的出款方式是银行电汇或 Payoneer，并支持 CNY 出款币种。要实际收到出款，仍需在 Payout Settings 填写有效的收款资料；不要把“余额暂存在平台”视为一定可以无限期跳过出款审核的承诺。
- 因此最省事的顺序是：Sandbox 验证代码 → 免费版获客 → 出现真实升级意向时完成 Live 审核和出款设置 → 做一笔 Live 小额付款与退款 → 打开生产结账。

## 1. Paddle 后台准备

先在 Sandbox 完成以下配置，再在 Live 重复一次：

1. 创建 `ScoreTransposer Personal` 产品。
2. 创建一个 USD 9.99/月的循环价格，保存 `pri_...` Price ID。
3. 将默认支付链接设置为对应环境的 `/checkout/paddle`：
   - Sandbox：`https://staging.scoretransposer.com/checkout/paddle`
   - Live：`https://scoretransposer.com/checkout/paddle`
4. 创建 API Key，至少允许读取/创建 Transaction，以及读取/取消 Subscription。
5. 创建 Client-side Token。它可以交给浏览器使用，但不能替代 API Key。
6. 创建 Notification Destination：
   - Sandbox：`https://api-staging.scoretransposer.com/webhooks/paddle`
   - Live：`https://api.scoretransposer.com/webhooks/paddle`
7. 至少订阅以下事件：
   - `transaction.paid`
   - `transaction.completed`
   - `transaction.payment_failed`
   - `subscription.created`
   - `subscription.activated`
   - `subscription.updated`
   - `subscription.canceled`
   - `subscription.past_due`
   - `subscription.paused`
   - `subscription.resumed`
   - `adjustment.updated`
8. 保存 Notification Destination 生成的 Endpoint Secret。

任何 API Key、Endpoint Secret 和 Live 凭据都不要写入 Git、PRD、聊天或截图。

## 2. 后端配置

在 Cloudflare Gateway 对应环境设置 Secret：

- `PADDLE_API_KEY`
- `PADDLE_WEBHOOK_SECRET`
- `PADDLE_PRICE_ID`

当前阶段不设置 `PADDLE_SCHOOL_PRICE_ID`。环境变量使用：

- Sandbox：`PADDLE_ENVIRONMENT=sandbox`
- Live：`PADDLE_ENVIRONMENT=production`
- 启用时：`PAYMENT_PROVIDERS=paddle`

生产配置默认保持 `PAYMENT_PROVIDERS` 为空，避免商户审核或验收未完成时误收款。Stripe Secret 不删除；只有明确切换回 Stripe 时才把它加入 provider 列表。

## 3. 前端构建配置

构建两个前端时提供：

- `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=test_...`（Sandbox）或 Live token
- `NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox` 或 `production`
- `NEXT_PUBLIC_PAYMENT_PROVIDERS=paddle`
- `NEXT_PUBLIC_CHECKOUT_AVAILABLE=true`

部署脚本已支持通过这些变量开启结账，不需要再次改源码。

## 4. 上线前验收

必须逐项通过：

1. 新注册用户能完成一次免费单页 OMR，但不能导出。
2. 升级按钮打开 Paddle Checkout，价格、币种和循环周期正确。
3. 使用 Paddle Sandbox 测试卡付款后进入站内成功页。
4. Webhook 返回 2xx，同一个事件重复投递不会重复开通。
5. `/auth/me` 的 entitlement 为 `active`，provider 为 `paddle`。
6. 原来被拦截的完整导出立即可用。
7. 取消订阅后，在已付周期结束前仍可用，周期结束后失效。
8. 后台全额退款后，账单状态和权益按当前策略同步取消。
9. 以上步骤在 Live 用一笔小额真实付款再验证一次，随后退款。

只有九项全部通过，才保持生产结账开关为 `true`。否则立即把 `PAYMENT_PROVIDERS` 和 `NEXT_PUBLIC_CHECKOUT_AVAILABLE` 关闭；这不会影响免费体验。

## 5. 首单后的判断

首批只记录五个指标：升级按钮点击、Checkout 打开、付款成功、自动解锁、首次完整导出。没有真实购买信号前，不扩展第二套餐或更多支付平台；若 Paddle 账户审核不通过，继续开放免费单页体验并收集升级点击和邮箱，Stripe 代码仍可在银行卡准备好后启用。
