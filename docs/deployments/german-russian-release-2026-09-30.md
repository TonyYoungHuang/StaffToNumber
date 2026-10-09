# 德语、俄语修复发布

日期：2026-09-30。发布版本：`20260930-deru2`。

用户已授权修改并部署。应用内容变更见 [修复与验收记录](../audits/german-russian-content-fixes-2026-09-30.md)。

## 发布状态

官网、应用、API、worker 已切换为 `20260930-deru2` 并通过健康检查。数据库 schema、业务金额和额度实现未改动。发布前后 13 个非目标运行容器 ID 一致，共享入口配置及运行环境文件一致。

| 服务 | 生产镜像 ID |
| --- | --- |
| API | `sha256:fd404e7bbf41ecf4708604f821ff6ebbf0a5783c9696ae47545676978b51a66a` |
| 官网 | `sha256:06fc3acd1bbe3fc1f366fb7753165638f35803b2a8e48c80f6c9fe7b6e859fda` |
| 应用 | `sha256:575e452a862b75dc0fdbc216b203ec69ecca0d535266afd0be8f565a06e7450e` |
| worker | `sha256:efc0e0af4fcb438db83c1a9d3cc1a89195efcdbafd9f387ccf8a93500b4dbdf2` |

前端在本地 Linux Docker 中构建，服务器使用当前运行镜像作为固定基底追加已验证文件。四个服务先在无外网的隔离容器中探测，再依次切换；worker 切换前查询生产 `scoretransposer` schema，确认无处理中的任务，并保留 120 秒停止宽限。

## 备份与回滚

- 服务器备份：`/srv/sites/scoretransposer/backups/pre-deru-20260930/`。包含通过 `pg_restore -l` 验证的数据库备份、环境文件、Compose 配置和原容器镜像清单。
- 离线加密备份：`E:/CodexData/backups/scoretransposer/pre-deru-20260930/`，DPAPI 加密并解密校验。
- 原运行镜像保留。只归档和清理了明确属于本项目、未被容器挂载的旧构建目录；归档已下载并加密。未执行全局 Docker 清理。
- 回滚脚本：`/srv/sites/scoretransposer/releases/20260930-deru2/rollback.py`。恢复原 Compose 镜像选择，验证原镜像 ID 与健康状态，不恢复或覆盖业务数据库。

第一轮 `deru1` 的 worker 空闲检查遗漏 schema 限定，触发回滚；已确认四个服务恢复原镜像并健康，再修正检查后发布 `deru2`。该过程没有数据库迁移或数据修复操作。发布期间补充修复了验收发现的旧演示视频错误画面，最终版本包含新录制资源。

## 线上验收

- 四个服务健康；API `/health`、`/ready`、协作服务健康端点通过。
- 1,137 个文件逐一哈希验证通过：API 56、官网 459、应用 571、worker 51。
- 德俄密码重置、支持回执、版权初始事件和错误消息在生产模块中构造验证通过，未发送邮件。
- 德俄各 38 个 URL 抽查，涵盖全部 66 个德俄 sitemap 页面及额外流程页；预期 404 正常。
- 线上浏览器的 Google 语言、菜单、价格入口、无横向溢出、媒体播放验证通过。中文浏览器点击购买后仍保留德语/俄语、套餐和购买类型。
- 6 个更新媒体文件在线响应哈希一致；本地媒体登记表审计通过，共 144 个可用媒体变体，无缺失输出。
- 中文入口及同服务器其他业务的 11 个公开 URL 健康检查通过。
- 最后运行校验时可用磁盘 6,541,914,112 字节，高于现行 6 GiB 预留线。

## 生产 SEO 复核

通用 SEO 爬虫完成全部 297 个 sitemap 页面，自动检查通过：0 个错误、1 个警告。检查包含文档语言、canonical、互相对应的 hreflang、lastmod、JSON-LD、社交元数据、H1、重复内容、站内链接和图片。唯一警告为原有 `http://www.scoretransposer.com/` 到正式 HTTPS 主域名需经过多次跳转；本次未改动共享入口配置。

仓库原生审计覆盖同样 297 个页面及 577 个站内链接，原始结果保留 1 次 `fetch failed` 和 141 项标题/摘要长度提示。失败的示例下载链接经 HEAD、GET 复查均为 200，未解决的技术错误为 0。长度提示仅作为搜索摘要的人工复核建议；其中 15 项德俄提示对应的标题、摘要与修复前相同，不作为发布阻断项。

证据位于 `artifacts/de-ru-release-2026-09-30/`：`technical-audit.json` 为通用爬虫结果，`native-technical-audit.json` 保留原生审计结果，`seo-reconciliation.json` 记录失败链接复查及德俄摘要比对，`page-ledger.csv` 记录发布后的 66 个德俄索引页面。实验音频入口、账户及私人业务页面继续排除于公开索引。

通用爬虫未设置全站人工审校完成标记，因此其 `manualReviewRequired: true`、`publishReady: false` 原样保留；这是该工具独立的人工审校状态，不代表生产部署失败。已完成的德俄缺陷验收及其边界见修复记录。
