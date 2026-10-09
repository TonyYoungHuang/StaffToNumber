# 首页白底背景视频发布 · 2026-10-01

按用户要求，将首页操作台下方的黑底背景视频改为白底、深色乐谱和深色字体，搭配官网淡紫色点缀。最终版本 `20261001-light1`，上线时间 `2026-10-01T10:51:36.510078+00:00`。

入口：[首页视频](https://scoretransposer.com/zh-cn#product-overview)。

## 变更与验证

- 视频六个片段统一白底深色音符，移调目标调性改为深紫色。页面标题、三组数字、说明及播放按钮全部采用深色文字。
- 原 30 秒英文乐谱、原创配乐、2K / 97 / 65K 文案、可视区域静音自动循环、声音开关和暂停逻辑保留。
- 新视频使用 `/product/commercial/v4/` 地址，避免浏览器继续取旧黑底缓存；旧 v3 本地媒体归档至 `.tmp/score-background/dark-approved-v3/`，旧生产镜像保留用于回滚。
- TypeScript、官网生产构建、15 项本地浏览器场景、媒体预算和 FFmpeg 全片解码通过。桌面和手机实际画面均已查看。
- 最终正式站九语言白底与深色标题样式、统一 v4 影片、自动播放、循环、位置、数字和定价链接均通过。
- 正式站 1440px／390px 真实跨结尾循环、声音与暂停、视口暂停／恢复通过；媒体哈希一致，视频 Range=206，没有浏览器运行错误。
- 九语言 SEO 元数据、H1 和 JSON-LD 与发布前逐项一致；Stripe 默认套餐及原地登录弹窗正常。
- 官网运行文件哈希核验 459 项通过。仅重建官网；另外 16 个常驻容器身份保持不变。17 个容器运行，15 个带健康检查的容器均健康；官网无错误日志。9 个站点／服务外部健康地址均为 200。
- 原有 Next.js 缓存权限修复保留，并在候选镜像启动后实际验证写入能力。没有修改数据库、支付后端、编辑器、共享入口或 DNS。

最终镜像：`scoretransposer-www:20261001-light1`，ID `sha256:bde34b2ed6665e9d56ee431beca55eedb0e1804d1906c38075679ba5177cb0b2`。服务器剩余磁盘约 7.66 GiB。

视频 2,993,664 字节，SHA-256 `b0cac1bea57e344d3d40c8105428f8af45c217c83ae1b17c33a745a296bce94c`。封面 7,040 字节，SHA-256 `c2b9492910134c4af52f81766d7041208f353ac623fedff8460d73b7f63b7a6b`。

执行证据位于 `.tmp/light-release-20261001/` 与 `.tmp/score-background-light/`；[完整验收数据](../audits/product-background-light-production-2026-10-01.json)。

## 备份和回滚

发布目录：`/srv/sites/scoretransposer/releases/20261001-light1/`。

备份目录：`/srv/sites/scoretransposer/backups/pre-light1-20261001/`。数据库导出已用 `pg_restore -l` 验证，部署和运行配置已作 SHA-256 校验，私密文件权限 600。此次没有数据库变更。

原镜像 `scoretransposer-www:20261001-background2` 已保留。如需回滚：

```sh
sudo python3 /srv/sites/scoretransposer/releases/20261001-light1/rollback.py
```

脚本校验当前仍为 light1，保护后续其他服务版本，仅恢复前一官网镜像并等待健康。回滚脚本已准备，未执行回滚。
