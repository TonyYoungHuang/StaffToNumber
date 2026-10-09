# Google 搜索网站图标与名称标记

版本 `20261002-brand1`，北京时间 2026-10-02 15:24:45 上线。[正式首页](https://scoretransposer.com/)。

## 变更

- 沿用现有紫蓝底白色音符 SVG，新增 96×96、192×192 PNG 和包含 16、32、48、64px 的 ICO；没有重新设计图标。
- 使用 Next.js 原生文件式图标约定，在公共页面自动输出对应 `link rel="icon"`。可访问 `/favicon.ico`、`/icon1.png`、`/icon2.png`，原 `/icon.svg` 保留。
- 首页新增一份 `WebSite` JSON-LD：`name=ScoreTransposer`、`alternateName=scoretransposer.com`、`url=https://scoretransposer.com/`、`@id=https://scoretransposer.com/#website`。九语言首页指向同一个域名级网站身份；JSON 序列化转义 `<`。
- 原标题、描述、canonical、hreflang、H1、Organization 和 SoftwareApplication 标记保留。页面内容、定价、登录、视频和间距未改动。
- 图标可通过 `node apps/www/scripts/generate-site-icons.mjs` 从现有 SVG 重建，产物随代码保留。

## 验证与范围

Linux 生产构建、TypeScript、93 项现有官网测试通过。本地和正式浏览器核对 11 个页面：九语言首页、移调页和定价页；HTML 原始响应中的标记和图标链接均正确，首页网站名称标记无重复，九语言既有 SEO 逐项一致。PNG 尺寸、ICO 四个子图、MIME 类型、资源哈希与本地一致，均返回 200，robots 未阻止抓取。

本地及正式站点全量自动 SEO 爬取 297 个页面，检查 JSON-LD、描述、H1、社交 metadata、九语 hreflang 等；正式站额外检查 canonical 主机重定向。结果见验收记录。该检查不代表 Google 已收录、确定排名或已采用图标和名称。

仅重建 WWW，489 个运行文件哈希一致；其他 16 个容器 ID 未变，17 个容器运行，15 个具有健康检查的容器均健康。9 个对外服务地址全部 200。账户、支付、数据库、编辑器、共享入口及 DNS 未修改；没有操作 Search Console。

[生产验收记录](../audits/site-brand-search-production-2026-10-02.json)。完整抓取、截图和构建日志在 `.tmp/site-brand-release-20261002/`。

## 发布与回滚

镜像 `scoretransposer-www:20261002-brand1`，ID `sha256:f18da0700726e8989ea5aa0f8bf79da3b1eb3fc20a803a7d851f7d61ec94593f`。`FRONTEND_RELEASE=20261002-brand1`；编辑器同名标签仅为原 pass1 镜像的别名，未重建或重启。服务器剩余磁盘约 7.76 GiB。

备份 `/srv/sites/scoretransposer/backups/pre-brand1-20261002/` 包含部署配置及验证过的数据库导出；导出 SHA-256：`d6296142d6efedc4c81996768db76b577f427b537d13711f466644c01a8f74b1`。

读取共享服务器操作说明、核对当前版本后，可回滚到 `20261002-spacing1`：

```sh
sudo python3 /srv/sites/scoretransposer/releases/20261002-brand1/rollback.py
```

回滚只恢复 WWW 和前端版本选择器，不恢复数据库或订单。本次未执行回滚。

Google 根据重新抓取结果决定是否使用图标及网站名称，更新不会立即反映在搜索结果。参考：[网站图标规范](https://developers.google.com/search/docs/appearance/favicon-in-search)、[网站名称规范](https://developers.google.com/search/docs/appearance/site-names)。
