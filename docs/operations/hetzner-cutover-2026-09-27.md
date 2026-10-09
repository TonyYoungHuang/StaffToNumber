# Hetzner 上线验收记录 · 2026-09-27

后续更新：2026-09-28 官网、工作台和 API 已发布 Stripe 接入版本 `20260928-stripe1`，其余服务仍沿用本次迁移版本。最新镜像选择器、支付数据库补充迁移和回退方法见 [Stripe 生产操作说明](stripe-production-activation.md)。下文保留迁移当天的验收记录。

用户已授权完成存储调整、会员全流程验收及域名/HTTPS 切换；不需要再次请求上线批准。用户明确不恢复旧 R2、不上传本地整套曲谱，产品是顾客自行上传曲谱的会员工具。

**当前状态：已迁移到 Hetzner，五个生产域名的 DNS/HTTPS 切换完成，公网会员全流程验收通过。** 2026-09-27 20:34（北京时间）使用真实浏览器、公共 DNS 和正式证书完成登录、上传、识谱、移调与下载。官网：<https://scoretransposer.com>；会员工作台：<https://app.scoretransposer.com>。

## 已部署

- 服务器目录 `/srv/sites/scoretransposer`，Compose 项目 `scoretransposer-prod`，发布 `20260927-cutover2`。
- 官网、工作台、API、协作、音乐 Worker、PostgreSQL、Redis、Garage 共八个服务。仅前四项连接共享 `edge` 网络，使用唯一上游名称；数据库和对象存储不暴露公网端口。
- API 和 Worker 使用包含全部音乐引擎的同一版本镜像，协作服务使用轻量后台镜像。未使用 Cloudflare Containers、R2 或旧外部数据库处理新测试数据。
- 原始数据库和历史记录保留。29 个没有原文件的旧待处理任务改为失败，提示重新上传；新队列使用 `scoretransposer-hetzner-v1`，旧 Redis 队列保留但不再消费。

## 存储和并发

| 项目 | 生效设置 |
| --- | --- |
| 免费账户 | 50 MiB |
| Starter / 激活码会员 | 250 MiB |
| Converter Pro | 500 MiB |
| 单次上传 | 20 MiB |
| 整站对象存储 | 3 GiB，最多 10,000 个对象 |
| 磁盘预留 | 6 GiB；不足时拒绝新上传和新处理任务 |
| 音乐任务队列 | 并发 1 |
| API 原生导出与 Worker 原生引擎 | 共享文件锁，串行运行 |
| 病毒扫描 | 独立并发 1；竞争时返回可重试错误 |

页面按 MB 显示，后台以 1024 换算。官网九种语言、结账套餐、会员用量均同步调整，价格和月度点数未改变。生成的输出文件也计算到会员额度。完成的 OMR/音频/导出任务清理本项目临时工作目录，已保存的顾客文件不会因本次迁移新增自动删除规则。

修复了实际超限测试发现的旧问题：multipart 流被框架截断后可能仍作为成功文件保存。现会在病毒扫描前检查截断状态，返回 413，并清理临时文件。分片上传也校验实际分片大小和声明的文件大小。

## 验收证据

| 验收项 | 结果 |
| --- | --- |
| 原生 API 完整流程 | 上传 88,209 字节 PNG；Audiveris 识别 4 个音符；确认候选、改音符、music21 升 2 半音、生成播放数据；约 50 秒 |
| 四种实际下载 | MusicXML 1,837 字节、MIDI 111 字节、WAV 924,204 字节、PDF 14,218 字节；检查文件头和 SHA-256 |
| 浏览器完整会员流程 | Edge 登录 → 上传图片 → 显示源图与识谱候选 → 确认 → 移调 → 队列导出 PDF → 浏览器下载 14,224 字节 PDF；无页面脚本错误 |
| 公网浏览器复验 | 正式域名、真实证书校验，无本地代理或 DNS 覆盖；完整流程约 63 秒，通过 |
| 域名与 HTTPS | 五个域名均 DNS-only A → `2.29.25.230`；Let's Encrypt 证书、TLS 1.3；HTTP 308 跳转 HTTPS，www 301 跳转主域 |
| API 与协作 | 公网 `/ready`、协作 `/health` 均正常；PostgreSQL、Redis 依赖就绪 |
| 支付回调入口 | 原 `/api/webhooks/paddle` 与 `/api/webhooks/stripe` 可达；无签名请求均返回 400；未发生真实扣款 |
| 套餐页面 | 官网、结账页、会员用量页已显示新额度 |
| 上传边界 | 超过 20 MiB 的实际 multipart 返回 413 / `FILE_TOO_LARGE`；超限分片声明返回 400 |
| 下载鉴权 | 未登录访问私有文件返回 401 |
| 跨服务重任务锁 | API 持锁时 Worker 获取锁返回 75，释放后返回 0 |
| 自动测试 | 存储 10 项、额度 5 项、上传安全 14 项、套餐与多语言 12 项通过；相关 TypeScript 构建通过 |
| 原有三个网站 | PolyOddsTools、AdiosTV、CTCSOL 及其 www/API，共 7 个公网 HTTPS 请求均 200，内容符合各项目 |

先通过 SSH 隧道和本机测试代理完成私有验收，随后在公网再次完成同样的会员流程。公网模式未跳过 HTTPS 校验，未使用本地 DNS 覆盖或测试代理。五张生产证书已签发，有效期至 2026-12-26，Caddy 负责自动续期；本项目明确使用 Let's Encrypt 签发，不改变其他网站的签发配置。

本机详细报告在 `.tmp/hetzner-cutover-20260927/`：`core-e2e-report.json`、`browser-private-report.json`、`browser-public-report.json`、`limits-report.json`，以及浏览器截图和实际下载 PDF。服务器 `backups/public-verification.json` 记录各域名证书、健康状态与非敏感配置检查。测试使用专用 `example.invalid` 账户及一天有效的激活码，没有创建实际付款或主动发送测试邮件。验收后撤销该账户的全部会话。

公网样例曲谱 ID 为 `179ef42e-1c3d-4c75-b92e-9b34296ad8b7`，导出任务 ID 为 `bc4f0d56-f4e1-42bb-8339-83718a3df587`；实际 PDF 的 SHA-256 为 `6e9b77983bd1bf88d1602b8e23fc88e013805e476104889e4f140a401da1a7d9`。

公网验收时约 1.8 GiB 可用内存、12 GiB 可用磁盘，八个项目容器全部 healthy、未出现容器 OOM。单页样例通过不等于大批多页曲谱或长音频压力验收；本次没有宣称完整音频转谱通过。旧 R2 文件未恢复，因此历史记录中的旧文件不能保证下载；顾客重新上传的文件已验证可完整处理。

## 恢复点

- 上线前快照：服务器 `backups/pre-cutover-20260927/`；包含数据库、Garage、Redis、共享 Caddy 配置与证书数据。
- 验收后快照：服务器 `backups/ready-for-dns-20260927/`；数据库及当前本地对象存储。
- 公网上线快照：服务器 `backups/public-cutover-20260927/`；包含最终数据库、Garage、Redis、正式邮件配置、共享边缘配置和正式证书。只短暂停止本项目写入服务，其他网站未停止。
- 独立本机副本：`E:/CodexData/backups/scoretransposer/hetzner-cutover-20260927/`。私有配置归档使用 Windows 当前账户 DPAPI 加密，并核对校验值。
- 新数据库恢复演练使用独立的 `scoretransposer_restore_cutover_20260927`，完成后删除该临时数据库，不覆盖运行中的数据库。

## 已完成的生产切换

1. 用户保存的区域 DNS 编辑令牌已验证可用；原 Worker 登录独立用于移除旧生产域名绑定。
2. 切换前已保存完整 DNS/Worker 绑定快照。切换后五个生产 Worker 自定义域名绑定均移除，暂存环境绑定保留。
3. `/srv/edge/Caddyfile` 已导入 `/etc/caddy/routes/scoretransposer.caddy`，完整配置校验后 reload，共享边缘容器没有重启。
4. apex、www、app、api、collab 均为 DNS-only A → `2.29.25.230`、TTL 300。与最初完整快照比较，8 条邮件、验证和暂存环境等其他记录完全不变。
5. 首次签发遇到旧 DNS 缓存，后将本项目五个站点明确配置为 Let's Encrypt 并 reload，全部成功签发。Caddy 的 `tls { ca … }` 设置仅作用于本项目；参见 [Caddy 官方说明](https://caddyserver.com/docs/caddyfile/directives/tls)。
6. 正式 Resend 邮件配置已恢复；启用前核对无旧通知待发送。Paddle 正式环境、原价格标识和签名凭证保留，恢复原订阅计费模式；回调地址未改变。邮件实际投递和真实支付扣款不属于这次实测结果。
7. 公网浏览器完整流程与其他三个网站复验通过。保留原数据库/Worker 和暂停部署保护以便排查或回退；本次迁移不代表 Cloudflare 或第三方账户账单归零。

运行命令必须包含 edge override，避免后续重建服务时丢失共享网络：

```sh
cd /srv/sites/scoretransposer
sudo docker compose -p scoretransposer-prod -f compose.yaml -f releases/20260927-cutover2/deploy/hetzner/edge.override.yaml --profile runtime --profile jobs up -d
```

切换后如果遇到问题，先保存 Hetzner 上产生的新数据，再依据 DNS/Worker 绑定快照评估回退。原 Worker 仍有维护暂停配置，不能将“恢复旧 DNS”当作完整业务恢复。保留目标数据，不删除任何本项目数据卷，也不修改其他网站配置。
