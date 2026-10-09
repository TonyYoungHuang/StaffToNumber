# 店铺激活交付：实施与验收记录

2026-09-28 已发布。用户确认店铺 SKU 沿用网站的 Starter / Converter Pro 月度、年度套餐，尽量复用现有网站，不新建按次数或自定义期限的销售体系。

同日后续更新：买家流程已改为激活码直接登录，无需邮箱或密码。当前行为与后续发布信息见 [激活码登录验收](activation-code-login-2026-09-28.md)；以下保留首次店铺交付版本的实施记录。

## 实际入口

- 中文官网：<https://scoretransposer.com/zh-cn>
- 买家交付：<https://app.scoretransposer.com/cn>，设置中文并进入 `/activate?shop=1`。
- 店主管理：<https://app.scoretransposer.com/cn/admin>，设置中文并进入 `/admin/codes`。
- 管理接口继续使用服务器现有管理员凭据。私有交接文件保存在站主本机受限目录，不放入仓库或买家文案。

买家在同一页使用常用邮箱注册或登录、核对账户、输入激活码，再选择工具；店铺流程不加载 Google 登录。已激活账户显示实际到期时间、当前档位、积分与存储额度。激活失败显示中文原因，复制时出现的小写、空白、全角字符、常见长横线会被规范化。

店主可选择网站四种套餐、数量、平台、店铺与订单备注、可选兑换截止时间，生成后复制独立发货文案或下载 CSV。支持按码、店铺、订单、批次查询最近 200 条匹配记录，并停用未兑换的码。已兑换码不能用此按钮撤销；没有实现平台订单同步、自动退款撤权或跨平台自动发货。

## 权限行为

| SKU | 使用期限 | 当前月度额度 | 存储额度 |
| --- | --- | --- | --- |
| Starter 月度 | 激活后 1 个日历月 | 50 积分 | 250 MiB |
| Starter 年度 | 激活后 12 个日历月 | 50 积分 | 250 MiB |
| Converter Pro 月度 | 激活后 1 个日历月 | 200 积分 | 500 MiB |
| Converter Pro 年度 | 激活后 12 个日历月 | 200 积分 | 500 MiB |

额度复用网站配置，按既有 UTC 自然月重置；激活不会清空当月已使用额度。同档激活码续期顺延，不同档位保留原授权并立即开始新档位，生效期间采用较高额度。同一账户重复兑换同一码不会重复增加期限，另一账户无法兑换。既有按天码保留原期限与 Starter 额度。店铺码本身不会产生自动扣款，也不会取消账户另行购买的自动续费订阅。

## 验证证据与边界

- 18 项激活、套餐额度及原单次购买回归通过：四套餐、日历期限、旧码兼容、续期、重复兑换、跨账户拒绝、过期/停用、管理权限、输入校验及搜索。
- 前端 137 项测试通过；API 构建、前端生产镜像构建、类型检查、编码检查、客户端翻译边界检查与 repository lint 通过。
- 本地浏览器连接真实 Fastify 路由和隔离 SQLite，完成出码、注册、兑换、发货文本与 CSV 验证。
- 正式浏览器连接真实 PostgreSQL API：生成独立 QA 的 Pro 月度码，用新邮箱注册，兑换后显示 200/200 积分、500 MB，重复兑换没有重复加时，刷新后权限保留，并直接进入扫描上传页。390px 手机宽度无横向溢出，浏览器没有脚本异常。
- 正式验证发现旧的 host-only 英文 Cookie 会覆盖共享中文 Cookie；前端第二版删除旧 Cookie 后再设置共享语言，已实际覆盖英文旧设置重新验证两个中文入口。
- 中文/英文官网、API、协作健康地址及另外三个网站的 7 个 HTTPS 地址全部 200；发布前后 14 个非目标容器保持不变。
- QA 的激活码已停用、授权已过期、会话已撤销，测试账户已安排删除。没有真实付款、向买家发消息、修改店铺商品或处理客户授权。

**音频转五线谱目前正式站的功能开关仍关闭，原入口为 404。买家页显示“暂未开放”，发货文案明确说明激活不会开启它。** 本轮未将音频转谱作为可交付功能，也未重新验证各种复杂曲谱的转换准确率。本轮音乐工具验收止于激活后进入上传页，没有把打开页面算作实际转谱成功；不同中国大陆运营商和地区的网络速度未覆盖。

证据在项目本机 `.tmp/shop-activation/`：`live-verification.json`、`local-verification.json`、`live-entry.png`、`live-activated.png`、`live-mobile.png`、`live-admin.png`、`public-health.json`、测试及构建日志。测试记录中的邮箱和码是隔离 QA，不是买家数据。

## 发布与恢复

- App 镜像：`scoretransposer-app:20260928-shop2`。
- API / Worker：`scoretransposer-api:20260928-shop1`、`scoretransposer-worker:20260928-shop1`。
- WWW 未重建、未重启；前端选择器的 WWW 新标签仅指向原 flow4 镜像。SEO 页面和索引规则未改动。
- 新增可空 `activation_codes.plan_code`，迁移在 `deploy/hetzner/activation-plans.sql`，SQLite schema version 为 23。旧码保持 null。
- 项目级备份：`/srv/sites/scoretransposer/backups/pre-shop-20260928/`；数据库 dump 已校验可读取，配置及数据库在站主本机 `E:/CodexData/backups/scoretransposer/pre-shop-20260928/` 保存经回读验证的 DPAPI 加密副本。
- 初始空间不足：只在逐项校验本机镜像 ID / 压缩包 SHA-256 后，移除本项目服务器上的旧前端镜像副本和 13 个发布压缩包。运行容器、当前回滚镜像、数据库和客户文件未清理。记录在服务器 `backups/shop-release-space-20260928.json` 与 `backups/shop-release-archives-20260928.json`。发布后剩余约 6.47 GiB。
- 如仅回滚语言修复，恢复 `releases/20260928-shop2/previous.env` 的选择器并只重建 app。如整次回滚，恢复 `backups/pre-shop-20260928/compose.env`，仅重建 app、api、worker；使用项目现有 `compose.yaml` 和 `releases/20260927-cutover2/deploy/hetzner/edge.override.yaml`，Compose 项目名 `scoretransposer-prod`。新列可保留，生产数据库不回灌旧快照。
- **发出新套餐码之后的整次回滚须先处理已售未兑新码**：旧程序只理解天数并按 Starter 授权，不能直接用旧版本继续兑新 Pro 码。优先向前修复；恢复上线前必须核对未兑码和已授权账户。

前端静态构建使用脱敏上下文，服务器仅应用 7 个 API 编译文件与共享额度解析器补丁，保留原音乐引擎层与限额配置。
