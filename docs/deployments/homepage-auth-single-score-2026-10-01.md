# 首页顺序、原地登录与单谱套餐发布

正式版本 `20261001-pass1`，上线时间 `2026-10-01T14:55:18.458483+00:00`（北京时间 22:55）。入口：[官网](https://scoretransposer.com/)、[中文首页](https://scoretransposer.com/zh-cn)、[定价](https://scoretransposer.com/pricing)。

## 用户可见变化

- 白底、深色文字的 30 秒英文背景广告片移动到首页首个栏目，操作台紧随其后。静音自动播放、循环、声音开关、暂停、2K / 97 / 65K 数据及同一英文影片保持不变。
- 首页和定价页的登录、注册及未登录工作台入口打开当前页弹窗；成功后更新账号，保留 URL、套餐选择和滚动位置。选好套餐后登录不会自动扣款，再点一次进入支付。
- 接入 Google One Tap 官方账号提示，使用已授权的编辑器域名中间 iframe 完成凭据兑换，父页面只接收完成通知，不接收用户凭据。弹窗出现与否受 Google 会话、浏览器隐私设置、关闭冷却期等条件控制；不能保证每次访问都出现。普通邮箱账号仍通过邮箱弹窗登录。
- 编辑器会话失效、账单返回页、登录／注册链接、退出后重新登录、密码重设后的登录均使用原地弹窗。直接访问旧 `/login`、`/register` 书签仍保留兼容页面。
- 新增 **One Score Pass / US$2.99**：一次性付款、不订阅、不自动续费；一份新的 PDF／图片乐谱，最多 5 页，10 个专属处理积分，不按月清零、无到期时间。积分绑定该乐谱项目，识别与队列导出消耗积分，失败／取消释放积分；编辑、移调和浏览器播放保留现有功能。沿用账户存储限额。
- 免费首份完整乐谱仍优先使用；其后新增乐谱可使用未绑定单谱套餐。已绑定项目删除后不会重置套餐供其他项目复用。积分用完后需要升级订阅；退款撤销该套餐权限。
- 单谱套餐使用 Stripe；已有月／年订阅和月／年一次性套餐保留，Paddle 订阅入口保留。未启用音频转谱。

## 支付与积分实现

正式 Stripe 产品 `prod_VMTxgAC1cnNme1`，价格 `price_1ULkzJLCnXfyZDqLyDZXrlLj`，USD 299 minor units，`type=one_time`。API 运行配置新增 `STRIPE_SINGLE_SCORE_PRICE_ID`，结账固定 `mode=payment`。原有 8 个 Stripe／Paddle 订阅价格配置均已核验。

使用原有订单及已付款回调校验，在同一事务中幂等发放 `score_passes`。`score_pass_jobs` 保留项目任务积分流水；队列即预留，失败／取消返还，成功或删除任务仍计费。用户行锁串行化跨进程绑定、重试和最后一份积分的竞争。同步旧导出接口不会绕过专属积分；当前编辑器使用计费队列。

迁移 [single-score-passes.sql](../../deploy/hetzner/single-score-passes.sql) 仅新增两张表、索引和最小运行权限，没有改写旧客户数据。SQLite 开发版本为 25。生产 Worker 保留原镜像，积分通过现有任务状态结算。

## 验证证据

- API、官网和编辑器类型／生产构建通过；官网性能与媒体预算通过，视频约 2.86 MiB。
- 单谱支付状态、伪造／重复回调、项目绑定、5 页限制、10 积分、跨月、失败返还、重试、退款、TIFF 多页防绕过及 HTTP 导入／编辑权限检查通过。HTTP 测试最初的会话过期参数夹具错误修正后单独复测通过。
- 已签名 Stripe webhook 测试覆盖延迟支付、重复事件、退款及旧套餐回归；真实 PostgreSQL 16 并发试验中，两次绑定竞争只有一次成功，最后一份积分竞争也只有一次成功。
- 本地浏览器通过 8 组新流程及 9 组原订阅／Paddle 回归场景；包含邮箱注册、Google 完成回调、位置和套餐保留、重复点击、错误重试、手机弹窗与键盘关闭。
- 正式站九语言首页全部核验：视频在操作台之前、同一英文素材、白底深色、自动循环及 $2.99 套餐。原有 SEO 标题、描述、canonical、hreflang、H1、JSON-LD 与发布前逐项相同。
- 正式站 1440px／390px 验证实际视频循环边界、声音、暂停和滚动后恢复；视频和封面哈希匹配，MP4 Range 请求为 206，无页面脚本错误。
- 正式站真实加载 Google `/gsi/intermediate`、`/gsi/client`、`/gsi/intermediatesupport` 及本站受信任 iframe 均为 200，没有跨域嵌入／CSP 错误；匿名会话查询返回预期 401。恶意父域请求为 403。Google 完成回调使用夹具验证，**未使用客户真实 Google 账号完成登录，也未实际扣款**。
- 核验运行文件：API 143、编辑器 586、官网 458。17 个容器运行、15 个带健康检查的容器健康；另外 14 个容器身份不变。无新增致命／权限／OOM 日志。9 个站点／服务健康地址均返回 200，剩余磁盘约 7.67 GiB。

执行文件及原始日志：`.tmp/single-score-release-20261001/`；[发布验收数据](../audits/homepage-auth-single-score-production-2026-10-01.json)。原订阅回归数据在 `.tmp/pricing-flow/report.json`。

## 镜像、备份与回滚

仅替换本站 API、编辑器、官网，未更改共享入口、DNS、Worker 或其他站点。三个镜像均使用 `20261001-pass1`：

| 服务 | 生产镜像 ID |
| --- | --- |
| API | `sha256:58d86e679d548869cf2b6db44bb7763ee7b4277ecf90e40ff2f1574fb28c7f55` |
| app | `sha256:e93ce80969c2508a8625b747dee27010a1fd436ecbd8435391c5bb68db4ef91f` |
| www | `sha256:00ee27f20fd2c5c92ecf48d4218e2213d3f6e7369e9eda29bab80040c7671ac4` |

`RELEASE=20260927-cutover2`、`WORKER_RELEASE=20260930-enes1` 保留，`FRONTEND_RELEASE` 和 `API_RELEASE` 更新为 `20261001-pass1`。

发布目录 `/srv/sites/scoretransposer/releases/20261001-pass1/`。备份 `/srv/sites/scoretransposer/backups/pre-pass1-20261001/` 包含已验证可读取的 PostgreSQL 导出、部署配置、运行配置和容器快照；私密文件权限 600。数据库导出 SHA-256：`767e32c3b8e2e3f45247dfac5710f9b27d4360f8fecd6cf90b97551f87c5be94`。

需要恢复旧应用时，在读取共享服务器部署说明并核对当前版本后执行：

```sh
sudo python3 /srv/sites/scoretransposer/releases/20261001-pass1/rollback.py
```

脚本仅恢复前一 API／app／www 镜像和配置，保留新表及已付费记录，未实际执行回滚。若上线后已有单谱购买，旧代码不能使用这些权益，应优先前向修复；不得通过恢复旧数据库丢弃新订单。
