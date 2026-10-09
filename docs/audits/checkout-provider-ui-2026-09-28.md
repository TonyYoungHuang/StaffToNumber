# 支付渠道默认值与选中样式 · 2026-09-28

已于北京时间 12:41 发布 `20260928-checkout1`：进入结账页默认选中已启用的 Stripe；选中支付卡片采用深紫色 `#4134c6` 的 2px 边框、1px 外圈和淡紫背景，点击另一渠道后高亮同步切换。两张卡片保持同样的边框宽度，切换不改变尺寸。保留键盘焦点提示；如果以后关闭 Stripe，则回退到其他已启用渠道。

本次只修改 `AppCheckoutClient.tsx` 和 `AppCheckout.module.css`，生产构建及 TypeScript 检查通过。本地与正式域名均通过浏览器检查：默认 Stripe、Paddle 切换、空格键选择、重新进入恢复默认、390px 手机视口无横向溢出；已检查截图。本轮没有创建支付订单或提交付款，验收登录会话已注销。

发布只重建工作台 app 容器。共用选择器 `FRONTEND_RELEASE=20260928-checkout1`；www 的同名镜像标签指向既有 `20260928-redirect1` 镜像，未重建或重启官网。API 保持 `20260928-stripe1`，基础 `RELEASE=20260927-cutover2`。其余 16 个容器 ID 均未变化，本项目 8 个容器 healthy，本站 3 个及邻站 7 个 HTTPS 检查均返回 200。

服务器回退点：`/srv/sites/scoretransposer/backups/pre-checkout-ui-20260928/`，含 `compose.env`、`compose.yaml` 和校验清单。如需回退，将备份 `compose.env` 恢复为项目根 `.env`（权限 600），在 `/srv/sites/scoretransposer` 使用项目名 `scoretransposer-prod`、`compose.yaml`、`releases/20260927-cutover2/deploy/hetzner/edge.override.yaml`，执行 `up -d --no-deps app` 后核验健康。无需数据库回退。

服务器发布记录：`releases/20260928-checkout1/activation.json`。本机证据：`.tmp/checkout-provider-ui/` 下的构建日志、源码校验清单、浏览器验证 JSON、截图、HTTPS 检查和发布记录。
