# 英西内容与 On-page SEO 合并发布 · 2026-09-30

已承接[原英西任务](codex://threads/01a0ebc4-ef51-7552-8cb0-1d31e2402b78)的修改及部署授权，按本任务提供的 SEO 文档统一上线。最后复测时间约为 2026-09-30 21:35（北京时间）。

## 发布范围

| 服务 | 当前版本 | 内容 |
| --- | --- | --- |
| 官网 www | `20260930-enes2` | 英西标题、描述、H1/H2、FAQ、正文内链；扫描页迁移；元标签清理；定价、政策与产品事实修复；99 张分享图；最后的编辑示例文案修正 |
| 应用 app | `20260930-enes2` | 英西额度／购买／激活／教学说明、错误和后台翻译；沿用 enes1 的应用代码 |
| API | `20260930-enes1` | 英西错误、邮件和客服消息等修复 |
| 后台任务 worker | `20260930-enes1` | 共享语言及通知文案修复 |

HTTP www 主域规范化改为直接 301，其他 Caddy 路由文件未改动。没有数据库 schema 迁移、实际扣款或测试邮件外发。

本地 Git 基准为 `4920c45773569ac5acba0899af07a79bedf44b10`，发布来自带既有改动的工作区，不声称这些修改已创建 Git 提交。分别用 `source-manifest.json`、`image-manifest.json` 和各服务文件清单固定发布内容并核对哈希。

## 备份与回滚

- 合并前四服务备份：`/srv/sites/scoretransposer/backups/pre-enes-seo-20260930`，数据库逻辑备份约 2.68 MB，已验证可列出内容并校验哈希。
- 最后前端修正前备份：`/srv/sites/scoretransposer/backups/pre-enes-final-20260930`。
- 加密离线副本：`E:/CodexData/backups/scoretransposer/` 下同名目录，使用当前 Windows 用户 DPAPI 加密，并验证解密哈希。未把明文环境文件存入仓库或报告。
- 旧版本 `20260930-deru2` 镜像和回滚脚本保留。

回滚最后一次前端修正（在服务器上执行）：

```sh
sudo python3 /srv/sites/scoretransposer/releases/20260930-enes2/rollback.py
```

如需回滚整个合并发布，先执行上述前端回滚，再执行：

```sh
sudo python3 /srv/sites/scoretransposer/releases/20260930-enes1/rollback.py
```

脚本核对当前版本、使用明确的 Compose 项目及目录，只恢复相应服务并等待健康。不会自动还原数据库。主域单跳重定向是独立改动，其原路由备份为 `pre-enes-seo-20260930/scoretransposer.caddy`。

## 验证与边界

验证结果和逐页修改见 [On-page SEO 执行记录](../audits/on-page-seo-2026-09-30.md)。原英西 16 项问题清单见 [全栈审计](../audits/english-spanish-fullstack-audit-2026-09-30.md)，其“未修改、未部署”描述属于原审计时点，现由本发布记录更新状态。

官网 91 项与应用 144 项测试通过，英西共享语言／邮件测试通过。生产抓取 297 页，最终技术检查零错误、零警告；首次抓取的两条临时链接请求失败已单独复查 200，证据保留。66 个英西公开页面的内容验证、28 个页面与视口场景、8 个登录／定价场景及购买回跳验证通过。最终前端发布文件 1,127 个均与打包哈希一致，API 和后台任务在合并初版也完成文件校验。

四个服务及依赖均健康，共用服务器上的其他站点正常；完成后剩余磁盘约 8.3 GiB。未登录 GSC 或提交 sitemap，未把技术通过解释为已收录、排名或流量增长。

本地证据：`artifacts/on-page-seo/production/`、`.tmp/enes-release-20260930/`、`.tmp/enes-final-20260930/`。服务器运行验收：两次 release 目录内的 `activation.json` 与 `runtime-verification.json`。
