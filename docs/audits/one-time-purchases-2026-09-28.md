# 单次套餐与取消自动续费 · 2026-09-28

发布版本：`20260928-onetime1`。上线结果见本文末尾验收记录。

## 产品行为

在原有自动续费订阅之外增加单次购买。用户确认沿用价格：

| 套餐 | 单次价格 | Stripe Live Price ID |
| --- | --- | --- |
| Starter 一个月 | USD 7.99 | `price_1UKX0ZLCnXfyZDqL2uyyew63` |
| Starter 一年 | USD 49.00 | `price_1UKX0aLCnXfyZDqLc2buiftd` |
| Converter Pro 一个月 | USD 14.99 | `price_1UKX0bLCnXfyZDqLmbrZmDI5` |
| Converter Pro 一年 | USD 99.00 | `price_1UKX0cLCnXfyZDqLSpwN1s16` |

官网定价区新增单次购买入口，登录前后保留 `billing=one_time`。工作台可切换两种购买方式。单次使用 Stripe Checkout `mode=payment` 和独立非循环 Price；原 Stripe/Paddle 订阅保持原价格与流程。Stripe 默认选中，保留深紫选中边框。新模式、有效期和取消按钮文案覆盖九种语言。

单次购买使用一个或十二个自然月；月末按目标月末截断。支付确认后直接归属账户，无需兑换码。同档位重复购买从现有期限末尾接续。有自动续费订阅时提示先取消后续续费；已取消续费但尚未到期的订阅，先保留其付费时间，单次权益随后开始。不同档位存在重叠时按当前有效的最高档位计算配额；月积分仍按原规则重置。

顶部导航新增“管理订阅”。账单页第一块显示订阅、当前周期结束时间和明显的“取消自动续费”按钮。确认后执行既有周期末取消接口，已付费权益保留。单次购买单列开始、到期、退款状态，不显示续费按钮。

## 支付与数据

新增 `billing_one_time_purchases` 表（SQLite schema version 22、PostgreSQL additive migration）。创建 Checkout 前保存用户、套餐与 Price 绑定；完成事件核对绑定及付款状态。重复或乱序通知不重复延期；未到账不发权益，异步到账事件可发放。用户维度事务锁保护并发接续。全额退款撤销对应购买，部分退款保留权限，先退款后到账也不会重开权限。

账户权限、API 与 Worker 配额、付款返回页、账单记录和账户数据导出均读取此权益。新表不依赖定时清理来到期失效。新增四个 `STRIPE_*_ONE_TIME_PRICE_ID` 环境变量；不更改原四个自动续费 Price。

## 验证

- 27 项支付、安全、计费及配额检查通过，其中 8 项覆盖本次单次购买规则。
- 本地签名 webhook 集成通过：错误签名、未到账、异步到账、账户权限与 200 积分/500 MB 配额、重复事件、退款及退款后重试。
- 独立 PostgreSQL 实例验证 additive migration 可重复执行，权益事务、延期、额度与退款 SQL 均可运行。
- 26 项定价、语言路由及账单多语言回归通过。API TypeScript 与两个前端生产构建通过。
- 本地浏览器验证四个单次价格、默认 Stripe、保留订阅选择、账单首屏取消按钮、取消确认和手机布局；取消测试拦截请求，不修改真实订阅。

本轮不进行真实扣款、真实客户取消、退款或银行提现。测试付款通知只在本地输出预览，不发送邮件。线上使用专用验收账户和未付款 Checkout，会话验证后过期清理；真实实付及到账仍需另行验收。

## 部署与回退

保留 `RELEASE=20260927-cutover2` 及其引擎挂载。更新 `FRONTEND_RELEASE`、`API_RELEASE`、`WORKER_RELEASE` 为本版本，`API_IMAGE=scoretransposer-api`。仅重建 api、worker、app、www。协作、数据库、存储、Redis 和其他网站不重启。

上线前备份 `/srv/sites/scoretransposer/backups/pre-onetime-20260928/` 包含已验证的 PostgreSQL dump、私有配置及容器清单。离线 DPAPI 加密副本在 `E:/CodexData/backups/scoretransposer/pre-onetime-20260928/`，已解密回读核对。

回退应先备份当前新订单，再恢复本次备份的 `compose.env` 为根 `.env`、`compose.yaml` 和 `runtime.env` 为 `shared/runtime.env`，权限 600。在 `/srv/sites/scoretransposer` 使用项目 `scoretransposer-prod`、根 Compose 与 `releases/20260927-cutover2/deploy/hetzner/edge.override.yaml`，执行 `up -d --no-deps api worker app www`，验证服务和旧支付路径。新增表保留，不用旧数据库覆盖新订单。若已有单次实付款，旧版本不能识别新权益，应优先前向修复，避免回退导致权益暂时不可见。

执行证据：`.tmp/one-time-purchase/`；服务器记录：`releases/20260928-onetime1/activation.json`。

## 线上验收记录

已于北京时间 13:43 完成正式域名验收：官网单次入口经真实登录后保留套餐与模式，网站付款按钮进入 Live Stripe 单次收银台；四个单次会话的金额、Price ID、payment mode 与无 Subscription 均经 Stripe API 核验，原自动续费模式仍正常，跨购买模式不复用订单。5 个未付款会话均过期并标记取消，验收登录会话已注销。

线上浏览器同时验证了选择、导航、取消按钮与手机布局（取消请求为浏览器拦截的测试数据）。本项目八个服务正常，目标外 13 个容器 ID 未变；本项目 3 个、邻站 7 个 HTTPS 检查均返回 200。初次发布 SSH 连接中断发生于镜像构建阶段，现有业务容器未变；随后用持久运行的发布脚本完成部署。

API/Worker 镜像分别为 `22905c5eb7b2`、`86f3799fcad5`，app/www 镜像分别为 `fd68fefd934c`、`2b0d9a71e782`。正式 Stripe 收银台显示“支付”和 one-time 商品说明，不出现月度订阅确认。
