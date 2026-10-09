# 首页标题和价格卡片调整

版本 `20261001-layout1`，正式上线 `2026-10-01T15:19:23.536123+00:00`（北京时间 23:19）。[中文首页](https://scoretransposer.com/zh-cn)、[定价页](https://scoretransposer.com/zh-cn/pricing)。

## 页面结果

- 原首页主标题、小标题和完整功能说明原样移到最上方，随后是白底英文背景视频，再后面是工作台。
- 工作台增加独立的简短标题与说明，九种语言分别提供本地化文案。中文为“开始处理你的乐谱”和“上传 PDF 或乐谱图片，识谱、编辑、移调，一站完成。”
- 首页和定价页均为五张竖向付费卡片：$2.99 单曲处理包、$7.99 Starter 月付、$49 Starter 年付、$14.99 Converter Pro 月付、$99 Converter Pro 年付。
- 删除横向单曲套餐面板及价格区 Free 卡片；$2.99 放入原 Free 的第一张卡片位置。右上角免费编辑入口和既有免费体验权益保留。
- 五张卡片顶部依次标记 ONE SCORE、FLEXIBLE、MOST POPULAR、FOR PROFESSIONALS、HIGH VOLUME，使用官网配色的不同色签。
- 没有明确选择时默认高亮 $49；不会自动结账。用户主动选择其他套餐后保留选择，切换支付方式／购买周期时同步高亮。默认支付仍为 Stripe，Paddle 订阅可选。

## 验证

- 官网 TypeScript、Linux 生产构建通过。9 项既有首页本地化和购买选择单元检查通过。
- 九语言本地与正式浏览器检查均通过：标题→视频→简短介绍→工作台的顺序、五张竖卡、全部标签、$49 默认高亮、$2.99 独立单次购买、显式选择刷新恢复。
- 正式 1440px／390px 截图已检查，无横向溢出；手机卡片纵向排列，桌面五卡并排。
- 原订阅流程 9 组浏览器回归通过：弹窗 Google 登录回调、位置／选择保留、一次点击、Stripe/Paddle 切换、失败重试、会话过期、手机与九语言。使用夹具，未实际扣款。
- 九语言原 SEO 标题、描述、canonical、hreflang、H1 文本、JSON-LD 与发布前完全相同。
- 预算通过：首屏 JS gzip 51.9 KiB、CSS gzip 30.7 KiB；已有视频资产与账户、支付后端未修改。
- 生产运行文件 458 项哈希一致；17 个容器运行、15 个有健康检查的容器均健康，其他 16 个容器 ID 不变。官网无错误日志；一次外网健康抓取网络失败后复查，9 个服务地址全部 200。

证据：`.tmp/home-layout-release-20261001/`；[完整验收记录](../audits/home-layout-pricing-production-2026-10-01.json)。

## 发布和回滚

仅重建官网，镜像 `scoretransposer-www:20261001-layout1`，ID `sha256:d5bc1335c5e862d898cee56f4e2074d4d8b7ea3669d6f75a211b0e72e645f5b9`。

`FRONTEND_RELEASE=20261001-layout1`；编辑器对应标签只是原 `20261001-pass1` 镜像的别名，没有重启。API 仍为 `20261001-pass1`，Worker、数据库、支付商品、共享入口和 DNS 不变。

备份 `/srv/sites/scoretransposer/backups/pre-layout1-20261001/`，包含验证过的数据库导出和部署配置，数据库导出 SHA-256 为 `79cb0bfc013cf8398fd2b01e94ea0545e7105e54c2cd3fa5ad58b287003f6a97`。部署后可用磁盘约 7.65 GiB。

发布目录 `/srv/sites/scoretransposer/releases/20261001-layout1/`。读取共享服务器操作说明、核对当前版本后，可恢复上一官网版本：

```sh
sudo python3 /srv/sites/scoretransposer/releases/20261001-layout1/rollback.py
```

回滚只恢复官网和前端版本选择器，不恢复数据库或订单，不改变编辑器／API；脚本已准备，未执行回滚。
