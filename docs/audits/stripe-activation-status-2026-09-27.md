# Stripe 正式接入核验记录 · 2026-09-28

## 当前结论

**ScoreTransposer 已发布 Stripe 生产接入，网站保留 Paddle，并开放 Stripe 付款选项。** 香港账户 `ScoreTransposer HK`（`acct_1UKHj3LCnXfyZDqL`）在 2026-09-28 11:31 北京时间的 API 查询中，收款和提现均已启用，待补资料和待验证列表为空。

这代表当前账户能力与网站配置可用；**本轮没有真实扣款、实付后的会员开通、实际退款或银行到账测试**。四笔验收订单均未付款，已通过网站取消并在 Stripe 确认过期。

后续用户实测发现官网未登录购买入口跳转到容器内部地址。此前已登录验收未覆盖这条路径；2026-09-28 11:53 已发布前端修复，并补验“官网选择 7.99 套餐 → 登录 → Stripe 正式付款页”。详见[跳转修复记录](checkout-redirect-fix-2026-09-28.md)。

本文件是项目执行记录，不包含密钥、证件、银行账号、客户身份或支付原始载荷。业务为客户向本站付款，不涉及 Stripe Connect。

## 账户与收费设置

| 项目 | 实测结果 |
| --- | --- |
| 模式、地区 | Live；HK |
| 收款 | `charges_enabled=true`，银行卡能力 active |
| 提现 | `payouts_enabled=true` |
| 待补材料 | `currently_due=[]`、`pending_verification=[]`、无 disabled_reason |
| 结算银行 | ZA BANK LIMITED，HKD，银行对象 status 为 new；尚未实际到账验证 |
| 提现计划 | weekly；保留用户设置 |
| 账单描述符 | SCORETRANSPOSER；简短前缀 SCORETRANS |
| Radar | Lite（已包含） |
| Stripe Tax | 入驻时选择“先跳过” |
| Climate | 检查时仍显示“开始”开通入口；未由代理开通捐款 |
| 客户账单门户 | 默认 Live 门户；支持付款方式更新、账单历史、到期取消订阅 |

用户自行填写银行信息、配置验证器并提交证件。最初 API 返回提现暂停、缺少 `individual.verification.document`；用户提交后重新查询，两项能力均变为 true。记录依据是后续 API 结果，不把入驻步骤打勾当作通过审核的证据。

[账户后台](https://dashboard.stripe.com/acct_1UKHj3LCnXfyZDqL)。原美国账户和原沙盒保留，未复用它们的价格、凭据或回调。

## 正式资源

| 套餐 | USD / 周期 | Live Price ID |
| --- | --- | --- |
| Starter 月付 | 7.99 / month | price_1UKUyRLCnXfyZDqLmnAmFa7J |
| Starter 年付 | 49.00 / year | price_1UKUySLCnXfyZDqLRWJaoZDC |
| Converter Pro 月付 | 14.99 / month | price_1UKUySLCnXfyZDqL5ZTl7fnn |
| Converter Pro 年付 | 99.00 / year | price_1UKUyTLCnXfyZDqLUVnlbuRU |

- 专用受限生产密钥：ScoreTransposer API production；本机 Windows DPAPI 加密，服务器仅保存在私有 runtime.env，权限 600。
- 生产 Webhook：`https://api.scoretransposer.com/api/webhooks/stripe`，端点 `we_1UKUyULCnXfyZDqLqRvcatxt`，API 版本 `2026-03-25.dahlia`。必须保留 `/api` 前缀。
- 默认门户：`bpc_1UKUyTLCnXfyZDqLFobUIj2b`。
- 四个价格按网站 `getCheckoutPlanCatalog("en")` 核验；标准订阅收费，Managed Payments 未启用。

## 已部署变更

发布 `20260928-stripe1` 更新 www、app、api 三个服务。Worker、协作、数据库、Redis、对象存储沿用迁移发布，未重建；共享入口及其他网站未修改。

支付代码修复：未到账 Checkout 不提前激活权益；读取新版 subscription item 的订阅周期；空日期不转换为 1970 年；回调验签后拒绝 Live/Test 模式混用，兼容受限密钥。

实测发现迁移数据库遗漏 `public.score_payment_orders`，导致创建订单报 503。已增加可重复执行的 `deploy/hetzner/payment-order-durable-store.sql`，恢复表、查询索引、受限应用角色 DML 权限，并回填 10 条既有订单的备份记录；访问 token 仅保存 SHA-256。已有订单表保留。迁移后重启本项目 API，重新验证订单创建和取消成功。

`PAYMENT_PROVIDERS` 与 `NEXT_PUBLIC_LIVE_PAYMENT_PROVIDERS` 均为 `paddle,stripe`。两个前端已重新构建；与发布前私有配置逐项比较，原 `PADDLE_*` 内容完全保留。

## 验收结果

| 检查 | 结果 |
| --- | --- |
| 账户、价格、事件、门户只读预检 | 本机及服务器 24 项均通过 |
| 官网、工作台登录页、API ready | 公网 HTTPS 200 |
| 已登录会员结账页 | Stripe 与 Paddle 均显示 Live |
| 正式 Stripe 托管结账页 | 浏览器实际加载 Starter USD 7.99/月，付款表单可见；未提交付款 |
| 四个套餐结账 API | 全部创建 Live subscription 会话，金额、币种、用户/订单归属正确 |
| 幂等 | 重复请求返回相同订单 |
| 未付款取消 | 4 笔网站订单全部取消，对应 Stripe 会话全部 expired |
| 回调签名 | 正确 Live 签名 200；错误签名及已签名的 Test 事件均 400 |
| Stripe 实际回调 | 临时订阅 product.updated 并更新测试元数据，真实 Live 事件成功投递；之后恢复原事件清单和产品元数据 |
| 自动测试 | 支付相关 20 项、生产预检 4 项通过；API 类型检查及构建通过 |
| 共享服务器 | 本项目 8 个容器 healthy、无 OOM；其他三个网站共 7 个 HTTPS 地址均 200 |

实际回调事件为 `evt_1UKVH9LCnXfyZDqLi6P5k5uZ`，`pending_webhooks=0`。Stripe 将该字段定义为尚未获得成功响应的回调数，见 [Event 对象文档](https://docs.stripe.com/api/events/object)。这验证了真实签名投递，不代表发生了真实支付或会员权益事件。

详细执行证据在本机 `.tmp/stripe-live-deploy/`：`verification.json`、`stripe-delivery.json`、`account-status.json`、`final-health.json`、两个结账截图、预检报告与构建日志。验收账户使用 example.invalid 邮箱；测试会话已退出，没有主动发送测试邮件或创建支付/提现交易。

## 备份与后续

- 发布前服务器备份：`/srv/sites/scoretransposer/backups/pre-stripe-20260928/`，包含数据库、配置、旧镜像标识及校验值；补表前另存数据库快照。
- 独立本机副本：`E:/CodexData/backups/scoretransposer/pre-stripe-20260928/`，数据库和私有配置使用 DPAPI 加密并核对 SHA-256。
- 验收后另存 `backups/post-stripe-20260928/`，含补表后的数据库及最终生产配置；对应本机 `E:/CodexData/backups/scoretransposer/post-stripe-20260928/` 加密副本也已校验。11:37 北京时间最终预检仍为 24 项全部通过。
- 部署选择器、恢复方法及重新核验步骤见[生产操作说明](../operations/stripe-production-activation.md)。

真实付款到会员权益、订阅续费/失败、实际退款和银行到账仍需在真实业务发生时核验。未使用用户银行卡模拟付款，未声称这些流程已实测通过。

历史背景：2026-09-27 仅有美国沙盒测试；9 月 28 日另建香港账户并完成上述生产工作。旧沙盒记录中的价格和端点不用于当前网站。
