# 7.99 套餐登录跳转修复 · 2026-09-28

用户从官网选择 Starter 月付后，被重定向到 `0.0.0.0:3000/login?next=%2Fcheckout%3Fplan%3Dstarter-monthly`，无法访问。修复已于北京时间 11:53 发布到正式网站。

## 原因与变更

反向代理后的 Next.js standalone 请求带有容器内部 origin。官网到工作台的 `/api/locale` 语言交接使用了这个 origin，导致登录跳转错误；语言 Cookie 的共享域和 Secure 判断也受到影响。此前 Stripe 验收从已登录结账页开始，未覆盖官网的未登录入口。

工作台与官网现在分别使用已配置的 `NEXT_PUBLIC_APP_URL`、`NEXT_PUBLIC_SITE_URL` 生成对外跳转和 Cookie 属性。官网语言切换、英文前缀及大小写规范跳转同步修复；保留同源校验与恶意 return URL 拦截，不从任意转发请求头选择域名。

## 验证

- 工作台登录/语言/中间件相关测试 10 项、官网语言/结账链接/规范域名相关测试 26 项通过；两个前端生产构建成功。
- 公网九种语言的登录交接均返回 `https://app.scoretransposer.com/login`，保留 `/checkout?plan=starter-monthly`，并设置共享域 Secure Cookie。
- 新浏览器会话从官网实际点击 Starter 月付按钮，进入正式域名登录页；登录后保留所选套餐，选择 Stripe 后进入 `checkout.stripe.com` 的 Starter USD 7.99/月正式表单。
- 浏览器结账使用真实 API 返回。测试提前创建未付款订单并复用其幂等键，避免触发新订单通知邮件；未提交付款，测试订单已取消，测试登录会话已注销。
- 本项目 8 个容器均 healthy；官网、工作台、API ready 及邻站 7 个 HTTPS 地址均返回 200。除 www/app 外的 15 个运行容器 ID 均未变化。

本机执行证据：`.tmp/checkout-redirect-fix/verification.json`、`https-health.json`、`activation.json`、登录页及 Stripe 截图、构建日志。

## 发布与回退

只更新 www/app 镜像为 `20260928-redirect1`，API 保持 `20260928-stripe1`，基础 `RELEASE` 保持 `20260927-cutover2`。未修改数据库或支付配置。

服务器回退点：`/srv/sites/scoretransposer/backups/pre-redirect-20260928/`，保存部署选择器、Compose 配置、镜像和容器标识及校验记录。发布记录位于 `releases/20260928-redirect1/activation.json`。

如需回退本次前端更新，将备份 `compose.env` 恢复为项目根 `.env`（权限 600），用现有 `compose.yaml` 和 `releases/20260927-cutover2/deploy/hetzner/edge.override.yaml`、项目名 `scoretransposer-prod` 执行 `up -d --no-deps www app`，再检查健康。无需回退数据库、Stripe 接入或重启 API。
