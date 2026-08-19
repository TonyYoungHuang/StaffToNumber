# AITDK app 子域审计与修复记录（2026-08-19）

审计对象：`https://app.scoretransposer.com/`

本记录区分三类情况：真实缺失、需要语义化改进的建议、无需修改的策略项。线上复测必须在本次代码部署后进行；部署前 AITDK 仍会显示旧结果。

## SEO Issues

| AITDK 项目 | 审计结论 | 本次处理 |
| --- | --- | --- |
| Canonical URL Check | 真实缺失。部署前首页没有 `rel=canonical`。 | 首页增加绝对 canonical；登录与注册页也分别声明自己的 canonical。 |
| Meta Title Check | 标题存在，但插件认为 29 字符过短。该长度阈值是启发式规则。 | 中英文标题分别调整为 43 和 54 字符，同时保留明确的产品意图，避免堆砌关键词。 |
| H2 Check | 页面原来只有一个 H2，内容层级偏弱。 | 增加“从识别到导出”和“常见问题”两个真实内容区；最终首页为 1 个 H1、3 个 H2。 |
| Social Media Meta Tags Check | 真实缺失。部署前没有 Open Graph 或 Twitter 卡片标签。 | 增加 Open Graph、Twitter Card 及 1200×630 动态分享图。 |
| Sitemap.xml Check | 真实缺失。部署前 `/sitemap.xml` 返回应用 404 页面。 | 新增 Next.js sitemap，包含首页、登录、注册；同时新增 robots 声明 sitemap。 |
| Meta Description Check | 部署前已有 description，不属于缺失。 | 改写为面向用户的功能描述，去除内部架构词。 |
| Server Side Rendering Check | 页面本来已经由服务端输出主要正文。 | 保留 SSR；canonical、社交标签和结构化数据也由服务端输出。 |

## GEO Score

| GEO 分类 | 截图分数 | 解释 | 本次处理 |
| --- | ---: | --- | --- |
| AI Crawler Access | 100 | AI 搜索抓取器可以访问页面。 | 不改动。训练抓取器是否允许属于站点策略，不等同于 AI 搜索可见性。 |
| Machine Readability | 38 | 正文工程术语多、内容意图不够直接，且缺少适合机器读取的产品摘要。 | 首页、登录页与工作台改为用户语言；增加清晰标题层级和 `/llms.txt`。 |
| Structured Data | 33 | 部署前没有 JSON-LD。 | 新增 `SoftwareApplication` 与 `FAQPage` 结构化数据。 |
| Content & Citability | 36 | 缺少可以独立引用的产品事实、限制说明和常见问答。 | 增加识别准确性边界、Google 注册、识别后功能等 FAQ，并标注更新时间和支持邮箱。 |
| Trust & E-E-A-T | 44 | app 子域缺少明显的主体、支持和隐私入口。 | 页脚增加“关于我们、帮助与联系、隐私说明”链接，并在正文显示支持邮箱。 |

## 本次 UX 修复

- `/scores` 只显示已有乐谱，不再同时显示多个上传与生成表单。
- `/scores/new` 只负责让用户选择“从哪里开始”。
- `/scores/new/scan`、`jianpu`、`musicxml`、`midi`、`audio`、`backup` 每页只显示一个操作表单。
- 面向普通用户的入口移除 `OMR`、`Audiveris worker`、`Score JSON`、队列任务和阶段编号等内部术语。
- 登录页把“全流程乐谱工程”“候选优先的安全机制”等文案改为用户可理解的结果和保障。

## Google 注册/登录

代码已经接入 Google Identity Services：服务端验证 Google 签名、签发方、客户端 ID 和已验证邮箱；新邮箱创建账户，已有邮箱复用原账户。

部署前必须完成以下外部配置：

1. 在 Google Cloud Console 创建 Web OAuth Client。
2. 添加生产来源 `https://app.scoretransposer.com` 和实际使用的预发布来源。
3. 前端构建环境配置 `NEXT_PUBLIC_GOOGLE_CLIENT_ID`。
4. API 运行环境配置相同值的 `GOOGLE_CLIENT_ID`。
5. 部署后在登录页实际完成一次 Google 登录，再检查会话、试用额度和已有邮箱复用。

## 部署后 AITDK 复测顺序

1. 打开首页，强制刷新 AITDK 报告。
2. 确认 canonical、Open Graph、Twitter、H1/H2 和 JSON-LD。
3. 单独访问 `/sitemap.xml`、`/robots.txt`、`/llms.txt`，确认 HTTP 200 与正确内容类型。
4. 复测 GEO 五个分类；若仍有低分，保存每个分类的逐条明细，不根据总分猜测修改。
5. 检查 AITDK 自身的扩展控制台错误是否影响报告刷新。本次本地浏览器中观察到的脚本错误来自 Chrome 扩展资源，不来自本站页面。
