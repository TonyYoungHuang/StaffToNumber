# 首页英文广告片生产发布 · 2026-10-01

用户批准上线后，版本 `20261001-commercial1` 于北京时间 2026-10-01 17:39 切换到正式官网。

入口：[简体中文首页视频](https://scoretransposer.com/zh-cn#product-overview)、[英文首页视频](https://scoretransposer.com/#product-overview)。视频模块紧接首页操作台区域，位于原有四个功能演示之前。

## 发布范围

- 仅官网更新为 `scoretransposer-www:20261001-commercial1`，镜像 ID `sha256:90c72bc61d4dd3e09d376ca19de2cb50dfadd08e46dcda4f1e916aba40045754`。
- 与前一生产源码清单相比，本次交付为 8 个相关文件：首页、视频组件和样式、共享英文媒体配置、预算检查及 MP4／WebP／VTT 三个媒体文件。
- 单一 30 秒英文乐谱广告片共用于九语言首页；没有发布上一版九语言 80 秒教程。
- 在本地 Linux Docker 中构建，发布包 5,709,363 字节，包含 460 个运行文件。服务端复核归档及全部运行文件 SHA-256。
- 仅重建官网容器；API、编辑器、worker、数据库、共享入口及其他站点共 16 个常驻容器身份保持不变。
- Compose 共用前端版本选择，因此给原编辑器镜像增加 `scoretransposer-app:20261001-commercial1` 别名，镜像 ID 不变，编辑器未重建。
- 没有数据库迁移、密钥调整、支付流程改动、共享入口或 DNS 修改。

## 正式站验收

- 发布前隔离镜像检查九语言首页、定价页、sitemap、robots 与三个媒体资源通过后切换。
- 正式站九语言首页均返回 200；视频所在区域的上一个模块包含 `#home-workbench`，下一个模块为 `#demos`，几何位置也在操作台下方。
- 所有语言使用同一英文 MP4 和英文字幕；未点击不预加载影片，保留四个原有短演示。
- 九语言首页 title、description、canonical、hreflang、H1、JSON-LD 与发布前快照逐项完全一致。
- 1440px 桌面及 390px 手机真实播放通过：精确 30 秒、1920×1080、音轨实际解码、声音开启、英文字幕加载，无横向溢出或浏览器运行错误。
- 正式站视频、封面、字幕的哈希与用户批准的本地成品完全一致；视频 Range 请求返回 206，封面与字幕为 200。
- 现有默认 Stripe 的套餐选择及原地登录弹窗保持正常。本次没有登录真实账号或创建订单、付款会话。
- 官网、编辑器登录页、API health／ready、协作服务和 PolyOddsTools、AdiosTV、CTCSOLTeacher 外部 HTTPS 检查均为 200。
- 17 个常驻容器运行正常，15 个带健康检查的容器全部健康；官网启动后无错误级日志。服务器剩余磁盘约 7.77 GiB。

线上视频 SHA-256：`b710b191f7a12f7a96303d71e2a74b237e5dab4fcc9b75d2527c4b06a0b8d32e`。

本地执行证据：`.tmp/commercial-release-20261001/`，包含 `public-before.json`、`public-after.json`、`final-status.json`、`site-health.json`、Linux 构建日志、源码清单、发布文件清单和正式站桌面／手机截图。内容制作与本地验证见 [制作说明](../product-commercial-video.md) 及 [成片验收](../audits/product-commercial-video-2026-10-01.md)。

## 备份与回滚

- 发布目录：`/srv/sites/scoretransposer/releases/20261001-commercial1/`。
- 备份目录：`/srv/sites/scoretransposer/backups/pre-commercial1-20261001/`。
- 备份包含 PostgreSQL 逻辑导出、部署配置和运行配置；逐文件 SHA-256 已核验，数据库备份通过 `pg_restore -l` 可读性检查。目录权限 700，私密文件 600。
- 原官网镜像 `scoretransposer-www:20261001-pricing1` 保留。

确认当前仍为本次版本后执行：

```sh
sudo python3 /srv/sites/scoretransposer/releases/20261001-commercial1/rollback.py
```

脚本保护后续版本，恢复前一官网选择并只重建官网，等待原镜像健康，不覆盖数据库或改动其他服务。
