# 法语内容与 SEO 修复上线记录

2026-09-29（北京时间约 17:09 完成服务切换，随后完成线上核验）。版本：`20260929-french1`。

线上入口：[法语首页](https://scoretransposer.com/fr)、[法语价格页](https://scoretransposer.com/fr/pricing)。本轮内容见 [修复记录](<E:/AI WEB/21.wuxianpu/docs/audits/french-content-fixes-2026-09-29.md>)。

## 发布范围

目标为 Hetzner 上 `/srv/sites/scoretransposer`，Compose 项目 `scoretransposer-prod`。

| 服务 | 原版本 | 当前版本 | 当前镜像 ID 前缀 |
|---|---|---|---|
| 官网 www | 20260929-google1 | 20260929-french1 | 17168c5d0134 |
| 应用 app | 20260929-google1 | 20260929-french1 | 5fb76da08b19 |
| API | 20260929-core1 | 20260929-french1 | c6b36fe33826 |

官网、应用使用生产公开配置完成 Linux 构建，再将增量叠加到原生产镜像。API 只覆盖邮件、支付参数、认证、支付路由及客服路由的 5 个编译文件；已逐项核对与旧生产文件的差异。发布压缩包合计约 5.6 MB。

没有数据库迁移，没有改动运行密钥、套餐价格、历史订单、DNS、共享入口或转换 worker。其余 14 个容器的 ID 与发布前一致。用户已有源码修改通过快照保留，没有重置工作区。

依赖下载曾发生连接中断；核对依赖和锁文件一致后复用了之前的依赖缓存。首次隔离探测发现基础镜像默认命令为 worker，已按生产 Compose 的实际命令显式启动 API；修正后三个隔离探测通过，才切换流量。上述阶段没有替换线上服务。

## 上线验证

- 官网、应用、API 健康检查通过；API `/ready` 确认 PostgreSQL 可用，协作服务健康。
- 生产容器中 1,027 个发布文件的 SHA-256 与发布清单一致。
- 34 个法语页面检查通过：状态、语言、标题、描述、H1、canonical、hreflang 和价格页结构化数据；检查结果无异常。
- 8 个付费入口的套餐、单次购买/订阅及 `fr` 参数正确。
- 真实浏览器验证 1280 像素折叠菜单展开，390 像素手机无横向溢出。
- Starter 年度单次购买保留法语登录及返回参数；应用显示 49,00 $US、50 crédits / mois、无自动续费。
- 直接在生产运行文件中验证法语密码邮件、客服邮件及密码重置语言交接，仅构造测试内容，未发送邮件。
- 三个更新服务没有重启循环、OOM 或新增 error/fatal 级别日志。
- 11 个公开网址检查返回 200，包含本站、中英文入口、依赖健康接口及其他三个站点的主域名/www 域名。
- 核验时服务器可用磁盘约 6.18 GiB，仍高于应用保留的 6 GiB 阈值。

没有创建真实 Stripe Checkout 或实付订单，Stripe 商品对象、第三方收据及实付回调不属于本次已验证范围。

## 备份与回滚

服务器备份：`/srv/sites/scoretransposer/backups/pre-french-20260929`。包括已验证可读取的 PostgreSQL dump、原 Compose 选择器、Compose 文件及运行配置；权限为 600/700。

加密离线备份：`E:/CodexData/backups/scoretransposer/pre-french-20260929`。数据库与私有配置使用 Windows 当前用户 DPAPI 加密，已完成解密回读校验；没有将明文密钥下载到仓库。

原官网/应用 `20260929-google1` 与 API `20260929-core1` 镜像保留。需要回滚本次版本时，在服务器执行：

```sh
sudo python3 /srv/sites/scoretransposer/releases/20260929-french1/rollback.py
```

脚本仅在当前选择器仍为 `20260929-french1` 时执行，恢复原选择器并只重建 API、官网、应用，逐项核对旧镜像 ID 和健康状态。没有数据结构变更，因此不恢复数据库、不重启 worker。上线过程未实际执行回滚。

## 执行证据

- [源码及发布文件清单目录](<E:/AI WEB/21.wuxianpu/.tmp/french-release-20260929/>)
- [生产运行验证](<E:/AI WEB/21.wuxianpu/.tmp/french-release-20260929/runtime-verification.json>)
- [逐页 SEO 检查](<E:/AI WEB/21.wuxianpu/.tmp/french-release-20260929/pages.json>)
- [浏览器验证](<E:/AI WEB/21.wuxianpu/.tmp/french-release-20260929/browser-verification.json>)
- [其他站点与公开接口检查](<E:/AI WEB/21.wuxianpu/.tmp/french-release-20260929/public-health.json>)
- [发布后日志检查](<E:/AI WEB/21.wuxianpu/.tmp/french-release-20260929/post-deploy-logs.json>)

部署采用 [hetzner-multi-site-deployer 技能](<E:/CodexData/home/.codex/skills/hetzner-multi-site-deployer/SKILL.md>)，遵循共享服务器预检、限定服务更新、备份、隔离探测及回滚流程。
