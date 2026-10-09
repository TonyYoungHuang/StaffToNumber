# Stripe 支付方式开通检查 · 2026-10-01

状态：当前可直接开通的渠道已处理完。15 项账户级可用；微信、支付宝、Cartes Bancaires 等待审批；P24 返回不支持当前业务。本人验证缺项已消除。用户已授权启用该账户所有可开通支付方式，无需再次索取开通授权。

## 已确认账户和范围

- 账户：`acct_1UKHj3LCnXfyZDqL`，香港，正式环境。
- 默认支付方式配置：`pmc_1UKHjcLCnXfyZDqLu5Z8NOhL`。
- 先通过 Stripe 官方 API 读取并更新显示偏好，再通过 Windows 可访问性接口操作用户已登录的 Stripe Dashboard，提交渠道激活。
- 未修改网站代码、价格、既有订单、客户订阅、收款银行或服务器配置。

## 执行结果

Google Pay 从显示关闭且不可用变为 `preference=on`、`available=true`。

初次 API 操作另将 15 项原先关闭的显示偏好设为 `on`：WeChat Pay、Alipay、ACSS Debit、Bizum、Cartes Bancaires、Crypto、Customer Balance、iDEAL、韩国银行卡、P24、Pay by Bank、Satispay、Scalapay、SEPA Debit、US Bank Account。当时这些项目仍为 `available=false`；随后通过 Dashboard 激活了其中符合条件的渠道，最终状态见下文。显示开启不代表收款能力已激活。

已有方式保持原状；已停用的历史方式 Giropay、Sofort 保持关闭。Klarna 原先显示偏好即为开启，但账户不可用。

截至 05:47:09 UTC（北京时间 13:47:09），15 项账户级可用：银行卡、Apple Pay、Google Pay、Link、Bancontact、EPS、MB WAY、Kakao Pay、Naver Pay、PAYCO、Samsung Pay、韩国银行卡、iDEAL、SEPA 直接借记、银行转账。银行转账的实际能力是 gb_bank_transfer_payments=active，支持已获批的英镑转账。实际客户所见还受币种、所在地、设备、购买模式等条件限制。

Dashboard 实际操作：微信支付、支付宝均点击“启用”并进入“待批准”；韩国银行卡点击“启用”后显示“已启用”，API 回读 kr_card_payments=active；iDEAL 单次付款申请后曾显示“需要操作”。SEPA 点击启用后弹出本人证件/活体验证二维码，已交由用户完成，未代操作身份验证。用户后续发回截图后，05:42:51 UTC 回读发现 iDEAL、SEPA 均已 active，账户不再有身份验证缺项。随后通过 Dashboard 启用银行转账，05:46:32 UTC 回读 gb_bank_transfer_payments=active、customer_balance.available=true。

## 未完成项与原因

| 项目 | 真实状态 / 缺项 |
| --- | --- |
| 微信支付、支付宝 | 已通过 Dashboard 提交，显示“待批准”，API available=false，尚不能认定已可收款 |
| 韩国银行卡 | 已通过 Dashboard 启用并 API 复核 active、available=true |
| P24 | 后续复查 requested=true、inactive，disabled_reason=rejected.unsupported_business，Dashboard 显示“不符合资格”。不能再归因为仅缺税号，也不能宣称补税号即可开通；未尝试更改业务类别绕过资格限制。其网站商家地址、税号、注册号要求仍属额外前置条件 |
| iDEAL、SEPA Debit | 本人验证缺项已消除，均 active、available=true |
| 英镑银行转账 | 已启用，gb_bank_transfer_payments=active、customer_balance.available=true |
| Cartes Bancaires | 既有申请处于 pending.onboarding，未宣称已获批 |
| Klarna、ACSS Debit、Bizum、Crypto、Pay by Bank、Satispay、Scalapay、美国 ACH | Capability API 明确返回当前 HK 账户不可申请 |

现有生产受限密钥可以改 Payment Method Configuration，但不能写 Account Capabilities（403，缺少 Accounts Write）。未提升密钥权限、替换密钥或规避限制。

### Dashboard 登录进展

- 用户尝试通过 Google 登录操作窗口后，Google 页面显示“无法登录”“此浏览器或应用可能不安全”。这属于 Google 对该浏览器登录的拒绝，不能据此认定 Stripe 密码错误或账户被封。
- 用户明确要求使用其已经登录的第三方浏览器，已定位普通 Chrome 中“ScoreTransposer HK”窗口，并通过 Windows 原生可访问性接口进入准确账户的支付设置页。
- 不再依赖受 Google 拒绝的操作窗口；该任务创建的 Stripe 登录窗口已关闭。用户原本登录的 Chrome 窗口保留。
- 未绕过 Google 浏览器安全检查，未读取、导出或迁移用户其他浏览器的会话凭据。登录问题不影响已完成的 Google Pay 配置修改。

## 网站适配与验证

- 当前 Stripe Checkout 参数未指定 payment_method_types，使用动态支付方式；无需为开启 Google Pay 发布代码。
- 当前网站兼有 `mode=payment` 单次购买和 `mode=subscription` 自动续费。
- 官方文档说明，微信和支付宝不支持普通 Checkout subscription/setup 模式，必须分开验证单次购买。
- 用现有 Starter 年付的单次与订阅 Price 分别建立未付款验证会话，两者都是 USD 49.00、Live、默认配置；API 返回 payment_method_types 为 card、link，adaptive_pricing.enabled 为 true。
- 钱包支付归属于银行卡能力，不能仅凭 payment_method_types 数组判断 Apple Pay / Google Pay 是否会在某一设备显示；本轮确认 Google Pay 账户配置可用，未做真实钱包扣款。
- 两个验证会话均已 expire，未扣款、未创建付费订阅、未改真实客户订单。
- 初次显示偏好修改后 charges_enabled 与 payouts_enabled 仍为 true，账户 currently_due 为空。Dashboard 申请 iDEAL 后，05:37:02 UTC 回读收款、提现仍为 true，currently_due 新增 individual.verification.proof_of_liveness，当前 disabled_reason=null。
- 最终回读：charges_enabled=true、payouts_enabled=true、currently_due=[]、pending_verification=[]、disabled_reason=null。
- 新增渠道完成后再次验证现有 $49 USD Starter 年付单次购买与订阅各一个未付款 Checkout，会话创建正常，默认配置正确，adaptive_pricing.enabled=true。两者均立即过期，未扣款；本任务合计创建并过期 4 个未付款验证会话。最后一次验证并不等于已逐一真实支付验证 15 种渠道。

## 原始执行证据

- `.tmp/stripe-payment-methods-20261001/configuration-log.jsonl`：修改前后状态与逐项更新回执。
- `.tmp/stripe-payment-methods-20261001/capability-log.jsonl`：支持范围、资料要求和权限拒绝。
- `.tmp/stripe-payment-methods-20261001/verification-log.jsonl`：两个未付款会话的创建、过期与最终配置回读。
- `.tmp/stripe-payment-methods-20261001/dashboard-progress-status.jsonl`：Dashboard 提交后的支付方式、能力和账户状态。
- `.tmp/stripe-payment-methods-20261001/dashboard-alipay-pending.jsonl`、`dashboard-p24-requirements.jsonl`：实际 Dashboard 状态和前置条件。
- `.tmp/stripe-payment-methods-20261001/dashboard-latest-status.jsonl`：最终 15 项可用、银行转账 active、P24 拒绝原因和账户状态。
- `.tmp/stripe-payment-methods-20261001/dashboard-final-checkout-verification.jsonl`：最终两个 Checkout 创建及过期结果。

以上为内部执行文件，未包含完整 API 密钥。配置回滚可按 configuration-log 的 before 记录逐项恢复显示偏好，不改支付交易。

## 官方依据

- [动态支付方式](https://docs.stripe.com/payments/payment-methods/dynamic-payment-methods)
- [微信支付](https://docs.stripe.com/payments/wechat-pay)
- [支付宝](https://docs.stripe.com/payments/alipay)
- [支付方式配置](https://docs.stripe.com/api/payment_method_configurations/object)
- [Capability 申请](https://docs.stripe.com/api/capabilities/update)
- [自动换币及本地方式](https://docs.stripe.com/payments/currencies/localize-prices/adaptive-pricing?payment-ui=stripe-hosted)
