# 九语言 On-page SEO 官网发布 · 2026-09-30

版本 `20260930-seo9` 已在 `https://scoretransposer.com` 发布。内容范围见[原文对照报告](../audits/nine-language-on-page-seo-2026-09-30.md)。沿用本任务已承接的“修改并部署”授权。

## 发布范围

- 官网镜像：`scoretransposer-www:20260930-seo9`，只重新创建官网容器。
- 使用最终 Linux 生产构建和已核对的静态资源；依赖清单与前一 `20260930-enes2` 版本相同。
- 发布包含 501 个文件，压缩后 4,748,570 字节；发布后全部逐一匹配。构建前后的源文件清单与校验记录保存在本地 `.tmp/nine-locale-seo-20260930/`。
- 应用、API、worker、数据库和共享入口未重建；没有数据库迁移、边缘路由或支付配置修改。
- Compose 的官网／应用共用 `FRONTEND_RELEASE`。将原应用镜像增加 `scoretransposer-app:20260930-seo9` 标签，指向原有镜像 ID；运行中的应用仍是原 `20260930-enes2` 容器。此处理使后续 Compose 能解析匹配标签，没有引入应用代码发布。

## 备份与恢复

服务器备份目录：`/srv/sites/scoretransposer/backups/pre-seo9-20260930`。包含经清单校验的数据库导出及配置归档；数据库导出经 `pg_restore` 列表检查可读。离线加密副本位于 `E:/CodexData/backups/scoretransposer/pre-seo9-20260930/`，使用当前 Windows 用户 DPAPI 加密，并完成解密回读校验；没有把私密配置写入仓库。

服务器发布目录：`/srv/sites/scoretransposer/releases/20260930-seo9/`。保留原镜像、发布配置和回滚脚本。需要回滚时，在核对当前发布版本后执行：

```sh
sudo python3 /srv/sites/scoretransposer/releases/20260930-seo9/rollback.py
```

脚本检查当前版本，恢复前一发布配置并只重新创建官网，等待健康检查通过；不恢复或覆盖数据库。

## 发布验证

- 新镜像隔离验证通过后切换官网；官网容器健康。
- 17 个运行容器中，16 个非官网容器的身份与发布前相同；15 个设有健康检查的容器均健康，另两个正常运行。
- 发布后可用磁盘约 8.3 GiB。
- 正式站 72 页专项检查、297 页 sitemap 与链接抓取、27 条旧入口 301、99 张分享图验证通过。
- 官网及应用登录页、共享服务器受保护业务的首页和健康接口均返回 200。
- 完整验收链接和浏览器检查范围见[原文对照报告](../audits/nine-language-on-page-seo-2026-09-30.md)。
