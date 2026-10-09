# Pricing 付款流程生产发布 · 2026-10-01

用户明确批准改动并要求投产后，版本 `20261001-pricing1` 已于北京时间 2026-10-01 14:51 切换上线。入口：[英文定价页](https://scoretransposer.com/pricing)、[简体中文定价页](https://scoretransposer.com/zh-cn/pricing)。功能范围见[实现与验证记录](../audits/pricing-flow-2026-10-01.md)。

## 发布范围

- 官网镜像：`scoretransposer-www:20261001-pricing1`，镜像 ID `sha256:ae647f0f62fbf9e47b3095358e0bfddb4d0f23fe40bf168ee0adf3ddf1a959b4`。
- API 镜像：`scoretransposer-api:20261001-pricing1`，镜像 ID `sha256:7547364830c9b7a6b3020dcf83c1be3f397716663acfef7bba8d2dc6ca5272e9`。
- 本地 Linux 构建通过；与前一生产源码清单相比仅 22 个相关文件有差异。源码、发布归档与运行文件均使用 SHA-256 校验。官网 456 个发布文件、API 两个编译文件在生产容器逐项匹配。
- API 仅覆盖 `dist/lib/payments.js` 与 `dist/routes/payments.js`；官网保留现有运行依赖和公共媒体资产。没有数据库结构迁移、支付密钥调整、共享入口修改或套餐定价变更。
- 只重建官网和 API。编辑器、worker、数据库、共享入口及其他站点共 15 个常驻容器保持原身份。Compose 共用前端版本号，因此将原编辑器镜像额外标记为 `scoretransposer-app:20261001-pricing1`，对应原镜像 ID，未重建编辑器。

## 上线验证

- 发布前隔离镜像访问九种语言 Pricing、首页、sitemap 和 robots，通过后切换；API 编译文件语法及新取消付款地址函数验证通过。
- 正式站九种语言 Pricing 均返回 200、展示四个购买卡片并默认 Stripe。标题、描述、canonical、hreflang 与发布前快照完全一致。套餐权益和价格不变；已批准的购买交互文案、导航 Pricing、CJK 定价页结构与 HowTo 移除属于本次实现范围。
- 正式站原地登录弹窗打开正常；使用实际 Google 桥接页面，官方 Google 按钮成功加载。未使用用户个人 Google 账号完成真实 OAuth 授权。
- 使用独立 `example.invalid` 测试账号完成真实注册、退出和邮箱登录，确认安全 HttpOnly Cookie、右上角账号更新、弹窗关闭后 URL 与所选套餐保留。验证结束已申请该测试账号删除并撤销会话。
- 在已登录浏览器中截获结账响应，验证连点只发起一次请求，默认 Stripe、所选套餐、购买类型和幂等键准确。正式站另完成模拟 Google 回调、来源校验、Paddle 选择、刷新／后退、会话过期、重试和手机焦点恢复等九组浏览器检查，无运行错误。
- 通过生产 API 镜像中的实际 Stripe 结账函数，分别创建订阅、一次性购买的正式环境 Checkout 会话，核验金额、币种、Stripe 托管付款地址和保留套餐的取消地址；均处于 unpaid 状态并立即作废。没有真实扣款、应用订单或付费权益变动，也未触发应用的订单提醒邮件。
- Stripe 8 个价格均有效。Paddle 原配置保留，前端选择流程通过；现有 Paddle 密钥的价格读取接口返回 `403 / not authorized to read price`，这是切换前已确认的权限限制，未扩展权限或声称完成 Paddle 实付验证。
- 官网、编辑器登录页、API health/ready、协作服务，以及 PolyOddsTools、AdiosTV、CTCSOLTeacher 外部 HTTPS 检查均为 200。17 个常驻容器正常，15 个有健康检查的容器均健康。
- 官网和 API 本次启动后未发现错误级日志；服务器剩余磁盘约 7.82 GiB。

执行证据位于本地 `.tmp/pricing-release-20261001/`：`source-manifest.json`、`changed-files.json`、`image-manifest.json`、`final-status.json`、`public-before.json`、`public-after.json`、`live-login-report.json`、`stripe-checkout-report.json`、`site-health.json` 与 `deployed-fixtures/report.json`。正式站截图为 `production-pricing.png` 和 `production-sign-in.png`。

首次切换的保护检查把其他项目临时任务自然退出误判为常驻服务变化，自动恢复了旧版，两个旧容器健康已核实。修正为保护备份时清点的常驻服务后重新切换成功；首次日志保留为服务器发布目录中的 `activation-first.log`。

## 备份与回滚

服务器发布目录：`/srv/sites/scoretransposer/releases/20261001-pricing1/`。

服务器备份：`/srv/sites/scoretransposer/backups/pre-pricing1-20261001/`，包含 PostgreSQL 导出、部署配置和运行环境配置；完成文件校验及 `pg_restore -l` 可读检查。私密文件权限为 600，目录为 700。

离线加密备份：`E:/CodexData/backups/scoretransposer/pre-pricing1-20261001/`，使用 Windows 当前用户 DPAPI 加密并完成解密回读校验，未将明文密钥写入代码仓库。

旧镜像保留：官网 `20260930-seo9`、API `20260930-enes1`。核对当前仍为本次版本后，执行：

```sh
sudo python3 /srv/sites/scoretransposer/releases/20261001-pricing1/rollback.py
```

回滚脚本检查版本、恢复原部署选择并仅重建官网/API，等待原镜像健康，不覆盖数据库或其他服务。
