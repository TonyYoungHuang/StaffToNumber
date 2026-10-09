# Pricing 原地登录与直接付款改造 · 2026-10-01

状态：已获用户批准并部署生产版本 `20261001-pricing1`，发布验证与回滚信息见[部署记录](../deployments/pricing-flow-release-2026-10-01.md)。参考用户提供的 BeatViz 四张流程截图及 https://beatviz.ai/pricing 。本次对齐购买流程，沿用本站套餐、价格、品牌和支付服务。

## 实现

- 顶部 Pricing 与公共购买链接进入当前语言的 `/pricing`。九种语言均首屏展示四个付费套餐，支持订阅／一次性购买切换；已有首页套餐也能原地登录和发起付款。
- 未登录点击套餐：打开原地登录弹窗，优先展示现有 Google 登录组件，另有邮箱登录／注册。复用已授权编辑器域名的 Google 按钮桥接与现有 HttpOnly Cookie 会话；保留来源和 iframe 窗口校验。
- 登录成功：关闭弹窗、更新右上角账号、保留页面、滚动位置和套餐。不会在登录完成后自动创建支付。
- 已登录点击套餐：直接调用 `/api/payments/checkout/authenticated`，默认 Stripe，在当前标签页进入支付服务商。订阅保留 Paddle 选择；一次性购买继续使用后端已支持的 Stripe。
- 所选套餐、购买类型、支付服务商写入当前地址。重复点击用请求锁阻止；失败重试复用幂等键；会话过期重新弹窗登录。
- 新流程 Stripe 取消付款返回当前语言 `/pricing` 并保留选择；原编辑器结账仍使用原取消路径。只接受 `returnTo: "pricing"` 固定目的地，不接受外部返回地址。
- 弹窗适配手机，支持 Escape、遮罩关闭和焦点恢复。价格、权益和支付成功后的到账处理仍使用现有实现。

## 验证证据

- `npm run build -w @score/ui` 通过。
- `npm run typecheck -w @score/www` 与 `npm run typecheck -w @score/api` 通过。
- `npm run build -w @score/www` 通过，46 个静态构建项完成。
- `npm run lint` 通过，包括编码与客户端语言包边界审计。
- 网站测试 93 项通过；支付安全测试 14 项通过，合计 107 项。
- `node scripts/verify-pricing-flow.mjs`：九种语言、Google 回调、伪造消息拒绝、账号更新、滚动和套餐保持、Stripe 默认值、重复点击、Paddle、刷新／后退、一次性购买、失败重试、过期会话、邮箱登录及手机焦点恢复通过，无浏览器运行错误。
- 浏览器结果：`.tmp/pricing-flow/report.json`；截图：`01-pricing.png`、`02-sign-in.png`、`03-signed-in.png`、`04-mobile-sign-in.png`。

以上开发阶段浏览器验证使用本地前端和模拟 Google／登录／支付接口。部署后另行完成正式站真实邮箱注册／登录、真实 Google 按钮加载、Stripe 正式环境未付款会话创建与作废，以及九语言 SEO 元数据比对；未使用个人 Google 账号完成 OAuth 授权，未进行真实扣款。详细验证边界见部署记录。模拟按钮截图不代表真实 Google 按钮外观。复跑本地脚本需要前端开启购买、Google 和两个支付服务商的公共配置；该脚本只允许 loopback 地址。

## 涉及代码

公共流程入口在 `apps/www/src/components/PurchaseFlowProvider.tsx`；套餐页面使用 `PricingOffers.tsx`、`PricingOffersClient.tsx` 和 `PurchasePlanCard.tsx`。公共导航与首页复用该流程。取消付款地址由 `services/api/src/lib/payments.ts` 中的 `buildCheckoutCancelUrl` 生成，支付路由使用该函数；原有结账路径保持兼容。

工作区原先已有其他任务的大量未提交改动，本轮未提交 Git、未重置它们。部署前按当前生产源码清单比较，只发布本次购买流程差异。
