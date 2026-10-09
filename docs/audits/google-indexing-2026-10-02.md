# Google 未收录、首页 5xx 与重定向排查

执行日期：2026-10-02。网站：`https://scoretransposer.com/`。

## 结论与证据边界

用户当前截图显示 **312 个未收录：308 个已发现未收录、3 个重定向、1 个服务器错误**，另有 2 个已收录；口述的 1312 尚无对应列表。此报告接受这些未收录状态作为待处理问题，不以报表更新时间解释掉它们。

用户补充的首页网址检查截图确认：Googlebot 智能手机版抓取首页失败，原因是服务器错误（5xx）；允许抓取，索引与 canonical 项不适用，sitemap 显示“临时处理错误”。该图是网址检查记录，右上仍有“测试实际网址”按钮，不能当作本次实时测试成功或失败的结果。尚未取得 Google 实时抓取结果。

**首页失败的高可信原因是旧平台停站期间统一返回 503。** 原维护代码 `scoretransposer-www-production-maintenance.mjs` 的 `fetch()` 对所有路径返回 HTTP 503，附带 `retry-after: 86400` 和 `x-scoretransposer-status: paused`，没有为首页、robots 或 sitemap 设置例外。停站在 9 月 12 日验收，9 月 27 日迁移前仍验证为 503；截图的失败抓取发生在 9 月 17 日，处于这一期间。代码和公开响应验收均有证据；未取得那次 Google 请求的原始 Cloudflare 日志，不能进一步声称已找到逐请求追踪。

持续 5xx 会让 Google 放慢抓取，是当前积压的重要可能原因；不能据此认定 308 个 URL 都由同一个原因造成。“已发现—尚未编入索引”表示已发现但尚未抓取，不等于全部被判定为低质量或已触发处罚。[Google 索引原因说明](https://support.google.com/webmasters/answer/7440203?hl=en#discovered_-_currently_not_indexed)，[HTTP 状态码对抓取的影响](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes)。

历史记录：[停站维护验收](../operations/cloudflare-pause-2026-09-12.md)、[迁移前准备](../operations/hetzner-preparation-2026-09-27.md)、[公网迁移验收](../operations/hetzner-cutover-2026-09-27.md)。历史后台暂停状态不是恢复旧 Cloudflare 付费运行的指令；当前正式域名由 Hetzner 提供服务。

## 当前正式站实测

| 检查 | 本次结果 |
| --- | --- |
| 首页重复 GET | 12/12 次返回 200，正文、canonical、index/follow 正常 |
| 请求身份 | 普通审计客户端、模拟桌面 Googlebot、模拟手机 Googlebot 各 4 次；模拟 UA 不等于 Google 实时抓取 |
| sitemap | 200，297 个规范 URL，33 类页面 × 9 种语言 |
| robots | 200，未屏蔽公开页面 |
| 全部 sitemap 页面 | 297/297 直接 200，自动检查 0 错误、0 警告 |
| SEO 检查范围 | canonical、robots/googlebot/X-Robots-Tag、语言及互指 hreflang、sitemap 一致性、更新时间、标题、描述、H1、JSON-LD、社交 metadata |
| 站内链接 | 扩大检查上限至 800 后完整通过；首轮人为设置 400 上限造成“检查不完整”，不是网站错误 |
| 内链可发现性 | 在这 297 页之间没有完全无入链的 sitemap 页面；部分曲库页只有曲库目录这一处入链，不等于不能抓取 |
| 用户截图的 10 个“已发现未收录”示例 | 均返回 200、允许索引 |
| 历史 502 对应的 25 个不同路径 | 本次 GET 全部成功返回 200 |
| 服务器 | 官网及依赖健康，未发生官网容器 OOM；约 7.8 GiB 空闲磁盘、1.7 GiB 可用内存 |

297 是当前 sitemap 中的 URL 数，312 是 Google 报告未收录数量，含已知旧地址和不同排除原因，不能直接相减得出已修复或已收录数量。没有取得完整 308 URL 导出，不能称为逐条核对了那份名单。

自动审计的 `publishReady: false` 是因为未声明完成每页原创性、权益和内容人工审核，不是此次技术检查失败。技术通过不能证明 Google 已收录或保证未来全部收录。

## 三个重定向

| 原地址 | 实测状态 | 一跳目标 |
| --- | --- | --- |
| `http://scoretransposer.com/` | 308 | `https://scoretransposer.com/` |
| `http://www.scoretransposer.com/` | 301 | `https://scoretransposer.com/` |
| `https://www.scoretransposer.com/` | 301 | `https://scoretransposer.com/` |

它们是正确的主机名/HTTPS 统一，不是循环或错误跳转。保留原行为，不为让三个旧入口被收录而改为 200，也不提交这三项“验证修复”。目标是主域名规范页能够被抓取并收录。[Google 重定向说明](https://developers.google.com/search/docs/crawling-indexing/301-redirects)。

## 本次已上线的修复

保留的 Caddy 运行错误日志中发现 28 次官网 502：26 次旧社交图片请求 EOF、2 次资源请求上游连接被拒绝。没有首页 502 或声明 Googlebot 的对应请求。这批 Hetzner 错误发生在迁移后，**不把它们当成截图中旧平台首页 5xx 的直接证据**；它们揭示需要降低短暂断连影响的现实问题。

已在官网反向代理增加最长 5 秒重试、250ms 间隔，并明确 GET/HEAD 为已建连后失败可重试的方法。Caddy 对尚未连接成功的请求也允许重试。此措施缓冲短暂断连，不保证长时间停机可用，不会把应用返回的所有 500 伪装为 200。[Caddy 官方重试语义](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#load-balancing)。

同时启用官网专用、滚动限量的访问日志，记录路径、User-Agent、状态、时长和响应大小；删除请求对象、响应头和 user_id，不记录 IP、Cookie 或 query 参数。实测带虚构 Cookie/query 的探针仅留下 `/` 路径。日志为 `/data/scoretransposer-access.json`（Caddy 容器内），单文件 5 MiB，最多保留 3 个轮转文件、保留期 168 小时。UA 仅是客户端声明，不能独立认证 Googlebot 身份。

Caddy 配置验证通过后执行平滑 reload。未重启任何业务容器，17 个容器 ID 全部不变，其余网站路由哈希不变；11 个公网地址（含首页、sitemap、robots、服务健康地址和其他站点）检查通过。官网镜像仍为 `20261002-brand1`。

复验期间新日志 1,093 条，状态为 200/206/301/307，无 5xx；包含本次审计和资源请求，不是自然用户访问量，也不是持续可用性保证。

服务器备份：`/srv/sites/scoretransposer/backups/indexing-edge-20261002/`，包含原路由、Caddy 入口配置、容器清单与回执。回滚时先重新核对当前路由是否有其他后续改动，再恢复该目录的 `scoretransposer.caddy` 至 `/srv/edge/routes/scoretransposer.caddy`，验证并平滑 reload；本次未执行回滚。

## Search Console 后续操作

本机自动化浏览器进入 Search Console 后转到公开介绍页，没有可用的登录会话。本轮未提交 sitemap、未点击请求编入索引、未启动修复验证。

1. 网址检查 `https://scoretransposer.com/`，点击右上“测试实际网址”。查看“网页抓取：成功”及是否允许编入索引；保存结果。若失败，应按实际错误继续定位，不先反复提交。
2. 测试成功后，点击“请求编入索引”。成功提交不是已收录。
3. 返回“网页 → 服务器错误（5xx）”，点击“验证修复情况”。
4. 在“站点地图”重新提交 `https://scoretransposer.com/sitemap.xml`，确认 Google 的读取状态。网址检查中的“临时处理错误”本身不能证明现在的 XML 格式错误；以这次 sitemap 读取结果判断。
5. 检查并选择性请求核心规范页：`/sheet-music-scanner`、`/pdf-to-musicxml`、`/transpose-score`、`/score-editor`，以及有实际用户需求的语言版本。对仍处于已发现未抓取的页面，结合抓取统计与新日志判断恢复情况，不做 308 次重复批量点击，不请求收录故意 noindex 的页面。

无法通过网站代码或通用 Indexing API 强制将这批普通工具页面全部编入索引。后续是否收录、选择哪个 canonical、是否产生曝光，需要 Google 的实际结果。

## 本轮执行证据

- [完整生产爬取](../../artifacts/indexing-20261002/production-seo-after.json)
- [50 次重点请求与旧错误地址复验](../../artifacts/indexing-20261002/live-verification.json)
- [脱敏服务器错误记录](../../artifacts/indexing-20261002/server-errors-before.json)
- [上线回执](../../artifacts/indexing-20261002/edge-fix-receipt.json)
- [服务器与日志脱敏复验](../../artifacts/indexing-20261002/server-verification-after.json)
- [内链可发现性](../../artifacts/indexing-20261002/link-discovery.json)
- [浏览器首页截图](../../artifacts/indexing-20261002/homepage.png)

本文件是本次网站执行记录，未写回业务知识库或宣称形成新的正式经营 SOP。

## 追加：实际网址测试弹出“出了点问题”

用户随后提供的弹窗为“出了点问题／如果此问题仍然存在，请过几个小时再试”。这表示该操作没有返回有效测试结果，不能据此判定本次 Google 抓取成功或再次发生本站 5xx。背景仍是原网址检查记录。

2026-10-02 16:14（北京时间）复查：

- 首页和 sitemap 公网 GET 均返回 200。
- 官网最近 30 分钟访问日志 604 条：542 条 200、62 条 206；没有 5xx，Caddy 同期运行错误日志也没有本站 5xx。
- 自日志启用后未观察到带 `Google-InspectionTool` 的请求。它是 Google 网址检查使用的[官方 User-Agent](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers#google-inspectiontool)。未出现 HTTP 记录不能排除请求到达 HTTP 层之前的 DNS/TLS 等故障，不能单独断定 Google 平台故障。
- Google 公共 DNS over HTTPS 查询返回 A=`2.29.25.230`，无 AAAA；本机代理的虚拟 IP DNS 返回不作为公网 DNS 证据。
- Google 状态页未显示抓取/索引公开故障；未公布不代表没有账号级、地区或工具问题。
- 本机匿名浏览器访问富媒体测试也弹出“出了点问题”，但正文明确为“请登录，然后重试”。这是独立的登录限制，没有得到独立抓取结果；不能将它说成与用户的弹窗完全相同，或据此证明 Google 全局故障。

下一步先关闭弹窗，在无痕窗口只登录该站点的 Google 账号，重新进入 Search Console，对首页测试一次。若仍报相同通用错误，使用“站点地图”重新提交现有 sitemap 并检查读取结果；保留错误截图，可稍后重试或提交 Google 反馈。不根据这个无具体抓取结果的弹窗继续改动正常的 DNS、重定向或重启服务器。

本次未新增生产改动，也未声称已经请求编入索引或完成修复验证。[此次日志核验](../../artifacts/indexing-20261002/gsc-live-test-error-followup.json)。
