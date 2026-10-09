# 首页模块间距调整

版本 `20261002-spacing1`，北京时间 2026-10-02 14:34:38 上线。[正式首页](https://scoretransposer.com/)。

仅修改首页 CSS 的三处上下内边距：完整标题说明到视频由桌面 82px／手机 72px 缩至 28px，视频底部到工作台标题由桌面约 104px／手机 82px 缩至 32px。视频尺寸、内部布局、内容、播放行为和其他页面模块不变。

验证：Linux 生产构建及 TypeScript 通过。中英文首页在 2560px、1440px、390px 的本地和正式浏览器测量均通过；检查桌面及手机截图，无横向溢出，视频自动播放、静音和循环正常。九语言 H1、SEO 标题、描述、canonical、hreflang、JSON-LD 与发布前逐项一致。

仅更新 WWW；458 个运行文件哈希一致，其他 16 个容器 ID 未变，17 个容器运行，15 个具有健康检查的容器均健康。9 个对外服务地址全部返回 200。账户、支付、数据库、编辑器和共享入口未修改。

镜像 `scoretransposer-www:20261002-spacing1`，ID `sha256:1c23e33a9957b39f63b5d2fa59805a674896e275e2f7eaee885d5e2e03dcb9d8`。`FRONTEND_RELEASE=20261002-spacing1`；同名 app 标签指向未改变的 pass1 镜像，未重启编辑器。发布后磁盘可用约 7.46 GiB。

备份 `/srv/sites/scoretransposer/backups/pre-spacing1-20261002/` 包含部署配置及已验证数据库导出，导出 SHA-256：`49c093a0d7e7457c94105a12dc45817235c765ffae18166158df74eb1551ddbb`。发布目录 `/srv/sites/scoretransposer/releases/20261002-spacing1/`。

读取共享服务器操作说明、核对当前版本后，可运行以下脚本恢复上一版官网。脚本保护非官网版本选择器，只恢复 WWW，不恢复数据库或订单；本次未执行回滚。

```sh
sudo python3 /srv/sites/scoretransposer/releases/20261002-spacing1/rollback.py
```

完整证据：[生产验收记录](../audits/home-spacing-production-2026-10-02.json)；本地截图、构建和检查日志位于 `.tmp/home-spacing-release-20261002/`。
