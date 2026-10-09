# 首页自动循环背景生产发布 · 2026-10-01

最终生产版本 `20261001-background2` 于北京时间 2026-10-01 18:09 上线。入口：[首页背景展示](https://scoretransposer.com/zh-cn#product-overview)。

## 最终效果

- 位置紧接首页操作台区域、原四个功能演示之前。
- 所有语言共用 30 秒英文乐谱背景；进入可视区域自动静音循环，声音与暂停可手动控制。
- 影片不再烧录推广大标题，固定前景显示 “Your score. More possibilities.”、体验按钮与定价入口。
- 按经营者本次提供的数据展示 `2K Users / 97 Countries / 65K Scores corrected`，不额外加“+”。这些是经营者提供的累计数据，不接入实时统计。
- 影片、响应式与播放策略详见 [制作说明](../product-background-video.md)。

## 发布与验收

只替换 `scoretransposer-prod-www-1`。最终镜像为 `scoretransposer-www:20261001-background2`，ID `sha256:acc3ac499c7240934d78f50bf6305ccbf63bedf255c8ea90b023be909fe0173e`。

官网在本地 Linux Docker 完成构建，459 个运行文件以校验过的补丁交付。首次后台版本 `background1` 在正式站巡检发现 Next.js 图片缓存权限不足；随后以相同编译文件制作 `background2`，将交付文件归属运行用户，并确保 `.next/cache` 可由该用户写入。隔离候选容器实际写入／删除缓存探针通过后，仅重建官网。最终完整浏览器检查及启动后日志检查均通过。

- 本地 TypeScript、23 项相关测试、生产构建、15 项浏览器场景、全片解码与媒体预算通过。
- 隔离候选镜像九语言首页、定价页、sitemap、robots 和背景媒体均成功响应。
- 正式站九语言：首页自动播放，默认静音、循环、行内播放；三组数字、位置、当前语言定价链接正确；保留原四个短演示。
- 正式站 1440px／390px：实际跨越结尾循环、声音开关和音轨解码、手动暂停／继续、离开视口暂停与返回继续均通过；没有横向溢出或浏览器运行错误。
- 所有九语言首页的 title、description、canonical、hreflang、H1、JSON-LD 与修改前快照逐项一致。
- 背景 MP4／封面 SHA-256 与本地成品一致；MP4 Range 返回 206。
- 原地登录弹窗和默认 Stripe 套餐选择通过；没有创建订单或真实付款会话。
- 459 个交付文件逐项与运行容器哈希一致；官网最终日志无错误，17 个常驻容器运行、15 个健康检查全部通过。
- API、编辑器、worker、数据库、共享入口及其他项目共 16 个容器身份保持不变。独立 HTTPS 健康检查共 9 个地址均为 200。没有数据库迁移、支付、密钥、DNS 或共享入口变更。
- 共用前端版本选择需要给原编辑器镜像增加 `scoretransposer-app:20261001-background2` 别名，镜像 ID 不变，没有重建编辑器。
- 最终剩余磁盘约 7.70 GiB，高于项目 6 GiB 门槛。

执行证据位于 `.tmp/background-release-20261001/` 和 `.tmp/background-cachefix-20261001/`。最终浏览器与服务器结果汇总见 [验收数据](../audits/product-background-production-2026-10-01.json)。

## 备份与回滚

- 最终发布目录：`/srv/sites/scoretransposer/releases/20261001-background2/`。
- 原先点击播放版的备份：`/srv/sites/scoretransposer/backups/pre-background1-20261001/`。
- 缓存修复前的补充备份：`/srv/sites/scoretransposer/backups/pre-background2-20261001/`。
- 两份备份均包括经过 `pg_restore -l` 验证的 PostgreSQL 导出和经过 SHA-256 核验的部署／运行配置，目录 700、私密文件 600。此次没有改动数据库。
- 保留原官网镜像 `scoretransposer-www:20261001-commercial1`。

回滚直接恢复原先点击播放版，跳过存在缓存权限问题的中间版本：

```sh
sudo python3 /srv/sites/scoretransposer/releases/20261001-background2/rollback.py
```

脚本要求当前版本仍为 `background2`，校验其他选择器未发生后续变更，仅恢复官网选择并重建官网，等待原镜像健康；不回滚数据库或其他服务。回滚脚本已准备，未执行回滚。
