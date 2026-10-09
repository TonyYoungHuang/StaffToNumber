# Stripe 生产接入操作说明

当前接入已发布；结果与验收边界见[核验记录](../audits/stripe-activation-status-2026-09-27.md)。这是本站收款，使用标准 Stripe Payments 订阅，不使用 Connect 或 Managed Payments。

## 正式配置

账户为 `ScoreTransposer HK`（`acct_1UKHj3LCnXfyZDqL`）。2026-09-28 API 返回收款和提现均启用、待补资料为空。ZA BANK LIMITED，HKD，每周提现。没有进行真实扣款和实际银行到账测试。

| 套餐 | USD | 周期 | 环境变量 |
| --- | --- | --- | --- |
| Starter 月付 | 7.99 | month | STRIPE_STARTER_MONTHLY_PRICE_ID |
| Starter 年付 | 49.00 | year | STRIPE_STARTER_ANNUAL_PRICE_ID |
| Converter Pro 月付 | 14.99 | month | STRIPE_CONVERTER_PRO_MONTHLY_PRICE_ID |
| Converter Pro 年付 | 99.00 | year | STRIPE_CONVERTER_PRO_ANNUAL_PRICE_ID |

金额以 `packages/shared` 的 `getCheckoutPlanCatalog("en")` 为准；四个套餐使用独立 Live Price ID。实际 ID 见核验记录。

生产回调地址：`https://api.scoretransposer.com/api/webhooks/stripe`。原生 API 必须保留 `/api` 前缀；事件清单来自 `scripts/stripe-production-preflight.mjs` 的 `requiredStripeEvents`。使用该端点独立的 `whsec_` 密钥。默认 Live 客户门户支持到期取消订阅、更新付款方式与账单历史。

服务器私有文件 `/srv/sites/scoretransposer/shared/runtime.env` 保持权限 600。模板为 `deploy/hetzner/stripe.production.env.example`。服务端使用 Live 受限密钥；不得把密钥写入 Git、日志或 `NEXT_PUBLIC_*`。当前 `PAYMENT_PROVIDERS=paddle,stripe`，Paddle 原配置保留。

## 只读预检

在进程内安全加载生产环境变量后运行：

```sh
node scripts/stripe-production-preflight.mjs
```

脚本需要已安装依赖和构建后的 `@score/shared`；只读取账户、价格、回调和门户，不创建交易。`readyForAcceptance=false` 时退出码 1。通过表示配置允许验收，不能证明真实付款后会员权益、退款或银行卡实际到账。

2026-09-28 本机与服务器 24 项检查通过；正式结账页、四个价格、订单归属、幂等、未付款取消、回调签名及 Stripe 实际事件投递也已验证。四笔未付款验收订单全部取消。支付相关 20 项测试及预检 4 项测试通过，API 类型检查、构建通过。

## 数据库前置条件

迁移结账实测发现遗漏 `public.score_payment_orders`，已补齐。新建或迁移数据库时，除了运行时主表，还须以数据库 owner 执行：

```sh
psql -v ON_ERROR_STOP=1 -v runtime_schema=scoretransposer \
  -v runtime_role=scoretransposer_app -f deploy/hetzner/payment-order-durable-store.sql
```

该事务创建恢复表和索引、授予应用角色 DML 权限，并从主订单表回填记录；访问 token 只保存 SHA-256。既有订单不删除，脚本可重复执行。若服务已经因缺表缓存过失败，需要重启本项目 API，再验证创建及取消。

## 当前部署

发布 `20260928-stripe1` 更新了 www、app、api 三个服务。两个前端已重建，`NEXT_PUBLIC_LIVE_PAYMENT_PROVIDERS=paddle,stripe`。API 使用 `Dockerfile.stripe-update` 在原生引擎镜像上仅更新三个支付模块。Worker、协作和数据服务沿用迁移发布，共享入口不变。

后续前端发布 `20260928-redirect1` 修复官网未登录购买入口及语言切换错误使用容器地址的问题；www/app 使用该新版本，API 保留 Stripe 发布。详见[回归验收与前端回退](../audits/checkout-redirect-fix-2026-09-28.md)。

此前前端选择器为 `20260928-checkout1`，工作台默认选择 Stripe 并加深支付卡片选中边框；官网同名镜像标签仍指向 redirect1 的原镜像，官网容器未重建。详见[本次验证与回退](../audits/checkout-provider-ui-2026-09-28.md)。

当前发布为 `20260928-onetime1`：新增四个按现价销售的单次月/年套餐，以及顶部管理订阅入口和醒目的取消自动续费按钮。API、Worker、app、www 同步更新，PostgreSQL 已增加单次权益表。SKU、有效期规则、真实 Checkout 验证与本次回退点见[单次套餐发布记录](../audits/one-time-purchases-2026-09-28.md)。

服务器根 `.env` 保留 `RELEASE=20260927-cutover2`，用于协作及原生引擎挂载，另外设置：

```dotenv
FRONTEND_RELEASE=20260928-onetime1
API_IMAGE=scoretransposer-api
API_RELEASE=20260928-onetime1
WORKER_RELEASE=20260928-onetime1
```

后续完整发布必须同步更新或移除这些覆盖值，不能只修改 RELEASE。始终保留共享网络 override：

```sh
cd /srv/sites/scoretransposer
sudo docker compose -p scoretransposer-prod -f compose.yaml \
  -f releases/20260927-cutover2/deploy/hetzner/edge.override.yaml \
  --profile runtime --profile jobs config --quiet
```

## 备份与回退

发布前服务器恢复点：`/srv/sites/scoretransposer/backups/pre-stripe-20260928/`。数据库、私有配置、旧镜像标识与 SHA-256 清单均已保存；补表前另存数据库快照。本机副本为 `E:/CodexData/backups/scoretransposer/pre-stripe-20260928/`，数据库和私有配置使用 Windows DPAPI 加密。

验收后快照为同级 `post-stripe-20260928/`，包含新增支付恢复表和最终生产配置；同名本机加密副本已校验。它用于当前状态恢复，不能与发布前回退点混用。

回退本次支付发布前先备份当前配置与新业务数据。恢复备份中的 `compose.yaml`、`compose.env`（对应根 `.env`）、`runtime.env`（对应 `shared/runtime.env`），保持私有文件权限 600；使用上述 Compose 文件组合执行 `up -d --no-deps api www app`，再验证健康和 Paddle。不要用旧数据库覆盖新订单，不要删除新增恢复表或重启其他网站。

## 真实交易验收边界

本轮没有真实扣款、实付后的会员开通、订阅续费/失败、实际退款或银行到账验收。应在真实交易发生后逐项记录；自动测试及未付款 Checkout 验证不能替代这些结果。不使用用户真实银行卡模拟支付。

独立网站使用各自的商户账户、价格、凭据与回调；可以通过同一 Stripe 登录管理，不直接复制五线谱的整套变量到其他项目。
