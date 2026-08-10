# ScoreTransposer 生产发布清单

最后更新：2026-08-10

本清单是本次 P0 发布的唯一放行口径。任何能力只有在对应生产验证通过后，才可把环境开关改为 `true`。默认值全部失败关闭，避免官网把用户送向死链接，或让未验证页面进入索引。

## 1. 形成发布版本

- 审阅当前大量未提交文件，只纳入本次确认要发布的代码。
- 删除或忽略临时产物，例如根目录异常文件 `-`、`*.tsbuildinfo`、测试输出和本地数据。
- 创建 release commit 和版本 tag，记录 commit SHA、数据库 schema、Score JSON schema 与回滚版本。
- 在干净工作区执行 `npm run build`、`npm test`、`npm run release:manifest`、`npm run release:verify`。

## 2. 先部署长期运行服务

- `https://app.scoretransposer.com` 可访问，注册、登录和 `/scores` 路由正常。
- `https://api.scoretransposer.com/health` 返回 200，数据库、对象存储和 Worker 状态符合预期。
- Worker 在长期运行主机上完成 Audiveris、music21、MuseScore、FluidSynth/SoundFont、ffmpeg、Basic Pitch 与 yt-dlp 资格测试。
- Collaboration 服务仅在 WebSocket、鉴权、重连和日志均通过时开放。
- 完成一次真实上传、候选校对、修订、移调、播放和导出闭环；保存 job ID、trace ID 和结果证据。

## 3. 按能力开启环境开关

```dotenv
NEXT_PUBLIC_PUBLIC_LAUNCH_READY=false
NEXT_PUBLIC_PRODUCT_APP_AVAILABLE=true
NEXT_PUBLIC_CHECKOUT_AVAILABLE=false
NEXT_PUBLIC_OMR_AVAILABLE=false
NEXT_PUBLIC_AUDIO_TRANSCRIPTION_AVAILABLE=false
NEXT_PUBLIC_TEACHING_AVAILABLE=false
```

- App/API 核心链路通过后才开启 `NEXT_PUBLIC_PRODUCT_APP_AVAILABLE`。
- Audiveris 真实文件矩阵通过后才开启 `NEXT_PUBLIC_OMR_AVAILABLE`。
- Basic Pitch、版权确认和候选清理通过后才开启 `NEXT_PUBLIC_AUDIO_TRANSCRIPTION_AVAILABLE`。
- 学生账号、通知、资源权限与删除流程通过后才开启 `NEXT_PUBLIC_TEACHING_AVAILABLE`。
- Stripe/Paddle 成功、失败、重复 webhook、续费失败、退款和权益回收通过后才开启 `NEXT_PUBLIC_CHECKOUT_AVAILABLE`。
- 所有准备公开的页面完成人工事实审核、生产爬虫无阻断错误后，最后开启 `NEXT_PUBLIC_PUBLIC_LAUNCH_READY` 并构建最终候选版本。

## 4. 搜索与监测配置

- 配置 `GOOGLE_SITE_VERIFICATION`、`BING_SITE_VERIFICATION`，需要百度收录时再配置 `BAIDU_SITE_VERIFICATION`。
- 配置 GA4、Clarity 并设置 `NEXT_PUBLIC_ANALYTICS_ENABLED=true`；浏览器同意分析后确认 `page_view` 和 `product_cta_click` 事件到达。
- 生成至少 32 字符的 `INTERNAL_TOOLS_TOKEN`，生产环境的 `/seo-audit`、报告接口和 `/operations-checklist` 只能凭令牌访问。
- 在 AI TDK 后台导入 `/seo-audit/report?token=...`，逐页核对事实、截图、案例和内容哈希，由真实负责人批准。
- 不为 Cookie 切换的中文内容声明 hreflang。建立 `/zh-cn/...` 独立 URL 前只提交英文 URL。

## 5. 发布候选验证

在候选域名执行：

```powershell
npm run verify:production-config
node scripts/audit-production-seo.mjs --base-url https://candidate.example.com --app-url https://app.scoretransposer.com --api-url https://api.scoretransposer.com --required-paths "/staff-to-jianpu,/jianpu-to-staff,/transpose-score,/score-editor,/musicxml-midi"
```

检查生成的 `artifacts/production-seo-audit.json`：

- 所有可索引 URL 返回 200，Canonical 指向自身，只有一个 H1。
- Sitemap 不含 noindex、404、内部工具或未验证功能页，`lastmod` 与内容版本一致。
- 截图、示例下载、OG/Twitter 图片和所有内链正常。
- JSON-LD 可解析，并与页面可见的 Workflow、FAQ 和产品说明一致。
- `/scores`、App、API 健康检查和主要 CTA 不再返回 404。

## 6. 人工操作

- 在 Vercel/长期运行主机配置正式环境变量和 DNS，部署 App、API、Worker、Collaboration 与官网。
- 在 Stripe/Paddle、GSC、Bing、GA4、Clarity 和邮件服务后台完成账号级验证。
- 完成人工 AI TDK 审批、真实支付/退款和真实文件闭环，这些不能由源码自动代替。
- 最终部署后重新运行生产爬虫，提交 Sitemap，保存上线基线，并观察错误、队列、支付和支持请求至少 24 小时。
