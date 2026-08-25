# AITDK 浏览器扩展中文全解与多网站 SEO 执行手册

> 版本基线：AITDK SEO Extension 2.7.0（Chrome Web Store 显示 2026-06-17 更新）
> 文档更新：2026-08-21
> 适用范围：新网站立项、竞品研究、页面发布前检查、上线验收、Google SEO 持续迭代
> 核心原则：AITDK 用于发现线索，Google Search Console 用于确认 Google 实际状态，GA4 与后端业务数据用于确认真实用户价值。

## 1. 这份手册解决什么问题

这不是一份“把 AITDK 全部变绿”的操作说明，而是一份把 AITDK 转换为真实 SEO 工作流的中文手册。它解决四个问题：

1. AITDK 官网和浏览器扩展分别提供什么。
2. 扩展侧栏每个模块、每个字段是什么意思。
3. 哪些提示会影响抓取、索引、搜索展示或用户体验，哪些只是工具自己的启发式规则。
4. 后续每个网站如何复用同一套建站、上线和迭代流程来增加相关搜索中的展示、点击和有效转化。

这里的“增加搜索量”需要准确理解：SEO 不能直接制造市场上的搜索需求，但可以提高网站在已有相关搜索中的可见性、点击率和转化率。关键词市场需求可参考 Google Trends 或 Keyword Planner；自己网站的真实展示、点击、查询和排名应以 Search Console 为准。

## 2. AITDK 是什么

AITDK 由两个部分组成。

### 2.1 AITDK 网站

官网提供 13 个免费的 AI SEO 生成和改写工具，包括标题、描述、关键词、功能介绍、FAQ、用户证言和落地页相关工具。官网入口：[aitdk.com](https://aitdk.com/)。

### 2.2 AITDK SEO 浏览器扩展

扩展在当前网页旁打开侧栏，聚合以下能力：

- 当前页面的 title、description、canonical、robots、标题层级、图片、链接和结构化数据检查。
- 第三方网站流量估算、关键词和地区分布。
- Backlinks 和 Reverse AdSense 查询。
- Issues 与 GEO 启发式审计。
- SERP、Whois、域名和外部 SEO 工具快捷入口。

Chrome Web Store 当前公开信息：

- 扩展 ID：`hhfkpjffbhledfpkhhcoidplcebgdgbk`
- 版本：2.7.0
- 更新日期：2026-06-17
- 体积：196 KiB
- 语言：11 种，包含简体中文
- 商店展示：约 80,000 用户、4.7/5、132 条评分（会随时间变化）

官方入口：[AITDK 扩展介绍](https://aitdk.com/zh/extension)；[Chrome Web Store](https://chromewebstore.google.com/detail/aitdk-seo-extension-traff/hhfkpjffbhledfpkhhcoidplcebgdgbk)。

本手册对事实使用三类证据：`官网公开说明`、`Chrome Web Store 实时信息`、`AITDK 2.7.0 界面/扩展包观察`。后两类会随版本变化；当前实现细节不视为永久产品承诺。

### 2.3 用户截图中的完整模块地图

| 类别 | 模块 | 本质 |
| --- | --- | --- |
| 当前页面扫描 | Overview、Issues、GEO、Density、Headings、Images、Links、Social、Hreflangs、Structured | 读取渲染后的 DOM、标签和部分站点资源 |
| 搜索观察 | SERP | `site:` 查询、搜索结果预览或版本支持的第三方数据 |
| 域名/估算数据 | Traffic、Backlinks、AdSense、Whois | AITDK 后端、第三方估算、RDAP/Whois 或公开文件查询 |
| 扩展配置 | Settings | 显示、快捷键、账户、credits 和外部链接模板 |
| 外部快捷入口 | Archive、Similarweb、Semrush、Ahrefs、PageSpeed、Twitter | 把当前 URL/域名带到第三方服务，不是 AITDK 自己生成的报告 |

旧版官方资料还可能单列 DNS；2.7.0 用户截图中 DNS 信息归入 Whois 或相关入口。AITDK 官网的 13 个 AI 生成/改写工具属于网站功能，不能和侧栏审计模块混为一谈。

## 3. 使用前必须建立的判断框架

### 3.1 AITDK 不是 Google 排名评分器

AITDK 的绿色、橙色或红色状态是工具规则，不是 Google 的内部排名分数。满足基础技术要求也不保证抓取、收录或排名；Google 官方同样明确说明，遵守 Search Essentials 不代表一定会被抓取、索引或展示。

参考：[Google Search Essentials](https://developers.google.com/search/docs/essentials)。

### 3.2 数据分为四种可信层级

| 层级 | 典型数据 | 用途 | 注意事项 |
| --- | --- | --- | --- |
| A：当前页面直接读取 | title、description、canonical、H1-H6、图片 alt、链接、JSON-LD | 页面发布检查 | 通常较可靠，但扩展可能读取渲染后 DOM，与服务器原始 HTML 不同 |
| B：HTTP/域名查询 | robots.txt、sitemap、HTTP 状态、Whois | 技术与运维检查 | 可能受 CDN、地区、登录、缓存或 Whois 隐私保护影响 |
| C：第三方估算 | Monthly Visits、Bounce Rate、关键词流量、Backlinks | 竞品和趋势参考 | 不是站点第一方数据，小站误差可能很大 |
| D：启发式评分 | Issues、GEO、标题长度颜色、关键词密度 | 快速发现线索 | 逐条验证后再修改，不能按总分盲改 |

### 3.3 自有站点的数据优先级

对自己的网站，优先级应是：

1. 后端真实注册、任务、支付和业务记录。
2. Google Search Console 的查询、展示、点击、索引与 canonical 数据。
3. GA4 的落地页、互动、关键事件和转化数据。
4. Cloudflare/CDN/服务器日志。
5. AITDK、Similarweb、Semrush、Ahrefs 等第三方工具。

### 3.4 页面级与域名级不要混淆

- `Overview`、`Issues`、`Density`、`Headings`、`Images`、`Links`、`Social`、`Hreflangs`、`Structured` 主要针对当前 URL。
- `Traffic`、`Backlinks`、`AdSense`、`Whois` 更多是域名级数据。
- 同一个域名的首页通过，不代表所有功能页都通过。每个可索引页面都要单独检查。

## 4. 扩展界面的通用组成

### 4.1 顶部栏

| 界面元素 | 含义 | 使用方式 |
| --- | --- | --- |
| AITDK 标识 | 扩展品牌入口 | 不是 SEO 指标 |
| 当前 hostname | 当前分析的域名 | 切换标签页后确认这里是否已刷新为目标站点 |
| 弹出/独立显示图标 | 在更大视图中打开面板，具体表现随浏览器版本变化 | 长表格或详细审计时使用 |
| 刷新图标 | 重新读取当前页面 | 部署或修改后必须刷新，必要时先强制刷新网页 |
| 关闭图标 | 关闭侧栏 | 不改变网站数据 |

### 4.2 侧栏状态颜色

- 绿色：满足 AITDK 当前规则。
- 橙色：偏离 AITDK 建议或数据缺失，需要人工判断。
- 红色：通常是缺失或明显异常，但仍需确认是否适用于当前页面。
- `?`：字段说明或提示。
- 外链图标：跳到资源文件或第三方网站。

颜色不是 Google 的处罚或奖励信号。

### 4.3 广告位和推广横幅

面板顶部或底部可能出现 AITDK 自身的广告、评分邀请或产品推广。这些不是当前网站的 SEO 数据，不要写进审计结论。

## 5. Overview：页面 SEO 总览

`Overview` 是发布前的快速体检页。它混合了当前页面数据、域名数据、资源可用性和第三方脚本检测。

### 5.1 Title

| 项目 | 说明 |
| --- | --- |
| 读取内容 | HTML `<title>` 或渲染后的页面标题 |
| AITDK 显示 | 标题文本和类似 `60/60` 的长度徽标 |
| 正确用途 | 确认页面有独立、准确、可读的搜索标题 |
| 修改动作 | 让主要任务或主题自然靠前，品牌简短放后；每页唯一 |
| 常见误区 | 60 个字符不是 Google 硬性上限，绿色也不保证 Google 使用原文 |

Google 可能结合 `<title>`、页面主标题、视觉大标题、锚文字等生成搜索标题，并会按设备宽度截断。不要为了凑长度重复关键词。

参考：[Google 标题链接最佳实践](https://developers.google.com/search/docs/appearance/title-link)。

### 5.2 Description

| 项目 | 说明 |
| --- | --- |
| 读取内容 | `<meta name="description">` |
| AITDK 显示 | 描述文本和类似 `121/160` 的长度徽标 |
| 正确用途 | 为当前页面写一段具体、可信、能提高点击意愿的摘要候选 |
| 修改动作 | 写清用户能完成什么、输入/场景、差异点和下一步动作 |
| 常见误区 | 160 字符不是排名门槛；Google 可能依据查询改写摘要 |

描述不是关键词列表，也不要承诺页面没有提供的能力。

参考：[Google 搜索摘要与 Meta Description](https://developers.google.com/search/docs/appearance/snippet)。

### 5.3 Keywords

| 项目 | 说明 |
| --- | --- |
| 读取内容 | `<meta name="keywords">` |
| AITDK 显示 | 关键词字符串和长度徽标，例如 `300/100` |
| 正确用途 | 最多作为内部主题记录，不作为 Google SEO 验收项 |
| 修改动作 | 不要为了让徽标变绿而删改正文或堆词；可以直接不输出该标签 |
| Google 现实 | Google 网页搜索不使用 `meta keywords` 作为排名信号 |

因此 `Keywords 300/100` 即使显示橙色，也不是 Google SEO 故障。

### 5.4 URL

显示当前浏览器地址。检查：

- 是否为正式 HTTPS 地址。
- 是否意外带预发布域名、跟踪参数或无意义参数。
- 是否存在大小写、尾斜杠、www/非 www 的多版本混用。
- URL 是否长期稳定且可理解。

### 5.5 Canonical

`Canonical` 来自 `<link rel="canonical">`。

正确验收：

- 使用绝对 HTTPS URL。
- 指向返回 200 的正式页面。
- 当前唯一页面通常自引用。
- 站内链接、重定向、canonical 与 sitemap 尽量指向同一规范 URL。
- 多语言页面通常 canonical 到同语言版本，而不是全部 canonical 到英语首页。

Canonical 是强信号，但 Google 仍可能选择不同 canonical。

参考：[Google 重复 URL 与 canonical 指南](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)。

### 5.6 Domain Creation / Expiration

数据来自 Whois/RDAP。用于：

- 域名到期和自动续费运维。
- 粗略了解竞品上线时间。
- 识别刚注册的临时域名或过期风险。

不要把域名年龄当作可调的页面排名因素，也不要因为域名年轻就批量生产内容。隐私保护、新后缀或注册局策略也可能导致日期为空。

### 5.7 Favicon

AITDK 检测站点图标。建议：

- 保持 favicon URL 可抓取且稳定。
- 使用方形图标和支持的格式。
- 图标与品牌一致。
- 不频繁更换 URL。

Favicon 影响搜索结果品牌识别和浏览器体验，不是独立排名加分项。

### 5.8 SSR Check

截图中的灰色开关通常表示“SSR 检查尚未启用”，不能直接解读为“网站不是 SSR”。开启后要验证：

- 初始服务器响应或 Google 渲染结果中存在主要正文。
- title、description、canonical、结构化数据稳定输出。
- 重要内链是可渲染的 `<a href>`。
- 核心内容不依赖点击、滚动或登录后才出现。

SSR、静态生成和 hydration 能降低抓取与渲染风险，但 SSR 本身不是独立排名奖励。

参考：[Google JavaScript SEO 基础](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)。

### 5.9 Robots Tag

来自 `<meta name="robots">`。常见值：

- `index,follow`：允许索引并跟踪链接；未写时通常也是默认行为。
- `noindex`：不希望该 URL 出现在搜索结果。
- `nofollow`：不跟踪页面链接，通常不应对普通公开页面使用。
- `noarchive`、`nosnippet`、`max-snippet`、`max-image-preview`：控制搜索展示。

上线最常见事故是 staging 的 `noindex` 被带到生产。

### 5.10 X-Robots-Tag

来自 HTTP 响应头，常用于 PDF、图片等非 HTML 资源，也可控制 HTML。显示 `N/A` 不代表错误；普通 HTML 页面只使用 meta robots 完全可以。若 header 与 meta 冲突，应按更严格的限制检查。

参考：[Robots Meta 与 X-Robots-Tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)。

### 5.11 robots.txt

`Available` 只代表某个路径能返回内容，不代表规则正确。必须打开检查：

- HTTP 状态与 Content-Type 是否合理。
- 是否错误阻止核心页面、CSS、JS 或图片。
- 是否声明正确 sitemap 地址。
- staging 与生产规则是否分开。

`robots.txt` 控制抓取，不是可靠的删除索引方法。被 robots 阻止的 URL 仍可能因外链被发现，而 Google 无法读取页面上的 `noindex`。

参考：[Google robots.txt 指南](https://developers.google.com/search/docs/crawling-indexing/robots/intro)。

### 5.12 sitemap.xml

`Available` 后还要检查 sitemap 中只包含：

- 绝对正式 URL。
- 返回 200 的 URL。
- 希望索引的 URL。
- 规范 URL。
- 准确的更新时间。

不要包含 404、重定向、noindex、登录页、重复参数页或错误环境域名。Sitemap 帮助发现和表达规范偏好，但不保证收录。

参考：[Google Sitemap 指南](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)。

### 5.13 Google Analytics

AITDK 只检测页面是否发现常见 GA 脚本或标识：

- `Available` 不代表 GA4 数据正确、同意机制正确或关键事件已配置。
- `Missing` 不会直接降低 Google 排名。
- 对自有站应在 GA4 Realtime/DebugView 中实际验证访问和业务事件。
- 应排除内部、开发和自动化测试流量。

### 5.14 Google AdSense

- `Available`：检测到 AdSense 相关代码。
- `Missing`：没有检测到。
- 只有以广告变现的网站才需要关注。
- 未接 AdSense 不是 SEO 问题，也不应为了让插件变绿而安装广告。

广告过多反而可能影响用户体验、性能和内容可用性。

### 5.15 Word Count

这是扩展对当前渲染内容的粗略计数，可能忽略交互区、延迟加载、iframe、隐藏内容或不同语言的分词差异。

Google 没有首选字数。验收问题应该是“页面是否完整解决搜索者任务”，不是“是否达到 800/1500/2000 字”。

参考：[Google People-first 内容指南](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)。

### 5.16 Lang

通常来自 `<html lang="...">`。建议使用有效 BCP 47 语言标签，例如：

- 英语：`en`
- 简体中文：`zh-CN`
- 繁体中文：`zh-TW`
- 美式英语：`en-US`

它有助于浏览器、读屏器和语言处理，但不能替代真正的本地化内容或 hreflang。

### 5.17 H1-H6 数量汇总

数量用于发现明显结构问题，不存在固定比例。团队可采用以下内容规范：

- 一个视觉和语义上清晰的主标题作为 H1。
- H2 表达主要章节。
- H3 表达章节内的子问题。
- 不为字号样式滥用 heading。
- 不为增加关键词而制造空标题。

### 5.18 图片数量汇总

字段通常包括：

- `Images`：页面图片引用总数。
- `Unique`：去重后的图片 URL 数。
- `Without Alt`：缺少 `alt` 属性的数量。
- `Without Title`：缺少图片 `title` 属性的数量。

优先处理 `Without Alt`。内容图应写准确、简洁的 alt；装饰图应使用空 `alt=""`。图片 `title` 不是必需排名项，不要为了清零而给每张图塞关键词。

### 5.19 链接数量汇总

字段通常包括：

- `Links`：链接总数。
- `Unique`：去重链接数。
- `Internal`：站内链接。
- `External`：外部链接。
- `Dofollow`：未被 nofollow/sponsored/ugc 限制的链接。
- `Nofollow`：包含 nofollow 的链接。

不存在理想数量或比例。重要的是核心页面可被站内链接发现、锚文字自然具体、链接目标有效，付费和 UGC 链接使用合适属性。

## 6. Traffic：网站流量估算

Traffic 是竞品研究模块，不应替代自有站的 GA4、Search Console、服务器日志或后端业务数据。AITDK 界面明确把这些数字描述为估算值；官方未公开流量供应商、样本规模、估算算法或误差区间，所以不能据此判断“真实有多少人在用”，更不能排除爬虫、广告流量或测量误差。

### 6.1 顶部指标

| 字段 | 中文解释 | 正确用法 |
| --- | --- | --- |
| Monthly Visits | 上一完整自然月的估算 session，不是独立人数、活跃用户或真人数量 | 比较同一数据源下的竞品量级和趋势 |
| Bounce Rate | 估算跳出率 | 结合页面类型判断；工具站单页完成任务也可能自然跳出 |
| Pages Per Visit | 每次访问平均页数 | 判断是否有多页探索，但不能单独代表满意度 |
| Visit Duration | 平均访问时长 | 观察趋势，不能证明访问者是真人或已转化 |
| Global Rank | 第三方全球流量排名 | 仅作相对参考 |
| Country Rank | 第三方国家/地区排名 | 先确认工具采用的国家判断逻辑 |

### 6.2 Visits Over Time

按月显示流量变化。AITDK 当前界面说明月度数据通常在次月 10 日前更新。免费和不同套餐可见的历史跨度不同：免费/Starter 通常为 3 个月，Pro 官方页面写明最长 12 个月。

分析时关注：

- 至少连续三个月趋势，不根据单月尖峰下结论。
- 产品发布、广告投放、媒体报道、季节性或爬虫都可能造成波动。
- 小站或新站可能显示无数据，不等于零流量。

### 6.3 Traffic Sources

常见渠道：

- `direct`：无法明确归因或直接访问。
- `search`：搜索引擎。
- `social`：社交平台。
- `referrals`：其他站点引荐。
- `paidReferrals`：付费引荐或广告相关来源。
- `mail`：邮件。

第三方分类不一定与 GA4 一致。免费版、Starter、Pro 的渠道细度和趋势可见范围不同。

### 6.4 AI Traffic Trends

官方定价页把 AI Traffic Trends 列入 Traffic。它可用于观察来自 AI 助手或生成式搜索的第三方估算趋势，但应与服务器 referral、GA4 source/medium 和实际转化核对。大量 AI 客户端不会稳定传递 referrer，长尾 AI 来源也可能被省略，因此空数据不等于“没有 AI 可见性”，各来源比例也不一定合计 100%。

### 6.5 Top Keywords

常见列：

- `Keyword`：估算带来访问的查询。
- `Traffic`：该词估算贡献流量。
- `Volume`：第三方月搜索量估算。
- `CPC`：广告点击成本估算。

用途是发现主题和竞品入口，不是复制关键词列表。要回到真实 SERP 判断搜索意图，并用 Search Console 确认自己站点的数据。

### 6.6 Top Regions

显示估算流量地区占比。AITDK 当前说明该分布基于 panel IP 的地理位置推断，可用于语言、定价、支付方式和本地化优先级假设。它不能替代 GA4 或服务器日志，也不能证明每个访问都是真人。Global Rank 对小站尤其不稳定；界面说明其对 Top 100k 网站最可靠。

### 6.7 如何判断真人、爬虫和有效用户

AITDK Traffic 无法完成这项判断。对自有网站应交叉使用：

1. CDN/WAF 与服务器日志：User-Agent、IP/ASN、已验证搜索爬虫、请求频率、固定时间间隔、资源请求和状态码。
2. GA4：带 Cookie/JavaScript 的会话、页面路径、来源、互动和关键事件；先排除内部测试流量。
3. 后端业务数据：注册、上传成功、生成成功、保存、付费或其他不可由简单点击伪造的事件。
4. Bot Management：识别数据中心 IP、自动化浏览器、异常并发和重复路径；不要只凭一个 User-Agent 封禁。

“有访问”不等于“有人使用”，而“有人打开页面”也不等于“产品产生价值”。最终应以有效任务和转化漏斗判断。

## 7. Backlinks：外链查询

官方定价页明确：每次成功 Backlinks 查询消耗 1 个 credit；失败或空结果自动退还。字段可能随数据源和版本调整，常见内容包括：

- Backlinks 总数。
- Referring Domains 引荐域名数。
- Domain Rating 等第三方强度分数。
- Dofollow 外链与 Dofollow 引荐域名的数量/比例。
- 来源页面和目标页面。
- 锚文字。
- Dofollow/Nofollow。
- 首次发现、最近发现或状态信息。
- 数据源提供的域名/页面强度指标。

正确使用：

1. 发现值得争取的真实行业引用。
2. 找出竞品被教程、榜单、媒体或资源页引用的原因。
3. 检查重要外链是否指向 404、错误协议或旧 URL。
4. 观察域名多样性和链接上下文，不追求总数。

不要：

- 把 AITDK 的总数当成 Google 链接数据库。
- 购买传递排名信号的链接。
- 批量交换链接、目录提交、论坛签名或垃圾评论。
- 把第三方 Domain Rating/Authority 当成 Google 指标。

参考：[Google 垃圾链接政策](https://developers.google.com/search/docs/essentials/spam-policies)、[外部链接属性](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links)。

## 8. AdSense：Reverse AdSense 查询

这个模块与 Overview 的“是否安装 AdSense”不同。Reverse AdSense 通常用于：

- 读取目标站 `ads.txt` 或相关页面代码中的 Google Publisher ID，例如 `ca-pub-...`。
- 反查可能使用同一 Publisher ID 的其他域名。
- 研究竞品站群、广告变现或关联网站。

官方定价页明确：每次成功 Reverse AdSense 查询消耗 1 个 credit。

注意：

- 同一 Publisher ID 是关联线索，不是公司所有权的法律证明。
- 代理运营、账户迁移、缓存和历史代码会造成误判。
- 是否接 AdSense 不是 Google 自然搜索排名因素。
- 不要将检测结果用于骚扰、隐私侵害或未经验证的归属指控。

## 9. Issues：问题清单

Issues 将多个启发式检查汇总成待办，当前界面按 `error / warning / info / passed` 等级分类。常见项目包括：

- Title 缺失、过短或过长。
- Meta Description 缺失、过短或过长。
- Canonical 缺失或异常。
- Robots/Noindex 问题。
- H1 缺失、重复或层级提示。
- H2 数量或页面结构提示。
- 图片缺少 alt。
- Social Meta 缺失。
- robots.txt 或 sitemap 缺失。
- 结构化数据缺失或解析问题。
- SSR 检查。
- 链接或资源问题。

处理顺序：

1. 先修会阻断抓取、索引或规范化的真实错误。
2. 再修内容与搜索意图不匹配的问题。
3. 再处理搜索展示、社交预览和体验增强。
4. 最后审视纯长度、数量和密度类提示。

每条 Issues 都要记录为“真实缺失 / 有条件建议 / 无需修改”之一。不要为了清零而改变正确的产品和内容策略。

## 10. GEO：生成式引擎优化审计

AITDK 近期版本增加了 GEO Audit。它是 AITDK 自定义启发式评分，不是 Google、Bing、OpenAI 或其他生成式引擎的官方分数。2.7.0 界面观察到的综合权重为：AI Crawler Access 25%、Content & Citability 25%、Machine Readability 20%、Structured Data 15%、Trust & E-E-A-T 15%。项目已有一次实际审计记录，观察到五类分数：

| 分类 | 中文解释 | 可执行检查 | 重要边界 |
| --- | --- | --- | --- |
| AI Crawler Access | AI 相关爬虫能否访问 | robots、响应状态、资源访问策略 | 是否允许训练抓取器是站点策略，不等于 Google 搜索可见性 |
| Machine Readability | 页面是否容易被机器解析 | 清晰标题、直接摘要、主要正文可渲染、实体和关系明确 | 不要为机器牺牲用户可读性 |
| Structured Data | 是否有可解析的结构化标记 | JSON-LD、类型、必填字段、与可见内容一致 | Schema 正确不保证 AI 引用或富媒体展示 |
| Content & Citability | 内容是否包含可独立引用的事实和答案 | 明确结论、步骤、限制、更新时间、原创证据 | 不要编造统计、来源、用户评价或功能 |
| Trust & E-E-A-T | 主体、经验、专业性和可信入口 | About、Contact、Privacy、Terms、作者/审核、支持信息、真实案例 | E-E-A-T 不是一个可直接购买或堆标签的单项分数 |

### 10.1 GEO 的正确改法

- 用一两句话直接说明页面是什么、适合谁、解决什么问题。
- 把输入、输出、限制、价格和更新时间写清楚。
- 为重要事实提供真实来源或产品证据。
- 使用准确的小标题、列表、表格和问答提高可扫描性。
- 保留可见的主体、联系、隐私、条款和支持入口。
- 结构化数据只标记页面真实可见的内容。
- 对工具产品提供真实截图、操作流程、结果和失败边界。

### 10.2 不要把 GEO 变成另一套关键词堆积

Google 针对 AI 搜索功能的公开建议仍以正常 SEO、可抓取性和对用户有帮助的原创内容为基础。不要假设存在独立的“AI 排名秘籍”。`llms.txt` 可以作为实验性机器说明文件，但不是 Google Search 的必需文件，也不能替代 robots、sitemap、结构化数据或高质量正文。

参考：[Google AI 搜索优化指南](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)。

## 11. SERP：搜索结果与索引观察

AITDK 不同版本的 SERP 面板可能显示或查询：

- 搜索引擎索引页面数量。
- 当前页面或域名的关键词表现。
- 查询排名、搜索量或竞争度。
- 搜索结果摘要/标题预览。
- Google、Bing、Yahoo、Baidu、Yandex、DuckDuckGo、Naver、Sogou、Brave 等搜索引擎的 `site:` 快捷查询（支持范围随版本变化）。

正确解释：

- `site:` 查询和第三方索引数量只是粗略观察，不是完整索引报告。
- 排名会受国家、语言、设备、时间和个性化影响。
- 搜索量和竞争度通常来自第三方估算。
- Google 最终展示的 title 和 snippet 可能改写。
- 自有站以 Search Console 的 Page indexing、URL Inspection 和 Performance 报告为准。

参考：[Search Console 入门](https://developers.google.com/search/docs/monitor-debug/search-console-start)、[URL Inspection](https://support.google.com/webmasters/answer/9012289)。

## 12. Density：关键词密度

AITDK 通常提供 `1 word` 到 `5 words` 的短语标签，并显示：

- `Keyword`：单词或连续短语。
- `Count`：出现次数。
- `Density`：占扩展所统计文本的比例。

正确用途：

- 检查页面主题是否意外被导航、页脚或模板词主导。
- 发现品牌词、功能词和用户问题词是否自然出现在正文。
- 发现明显的重复、模板污染或关键词堆积。
- 对比竞品的信息架构，而不是照抄密度。

没有理想关键词密度，也不应把 3% 当作普遍排名公式。标题、开头、正文、图片说明和内链中的自然语义覆盖比机械重复更重要。

## 13. Headings：H1-H6 标题结构

面板通常包含：

- H1-H6 数量汇总。
- `All`、`H1`、`H2` 等筛选标签。
- 按 DOM 层级显示的标题树。
- 复制全部标题或仅 H1/H2。
- 当前版可复制或下载标题结构图；它用于沟通结构，不是额外的排名检测。

检查方法：

1. H1 是否准确表达页面唯一主任务。
2. H2 是否覆盖用户完成任务前需要了解的主要模块。
3. H3 是否属于正确 H2。
4. 是否出现跳级、空标题、纯样式标题或隐藏关键词标题。
5. 标题下是否真的有对应正文。

一页一个清晰 H1 可作为团队规范，但不是 Google 必须只允许一个 H1 的硬规则。

## 14. Images：图片审计

### 14.1 汇总字段与筛选

- `Images`
- `Unique`
- `Without Alt`
- `Without Title`
- `All / Unique / Without Alt / Without Title`

### 14.2 单张图片信息

通常显示：

- 缩略图。
- Alt。
- Title（版本支持时）。
- 图片 URL。

### 14.3 修改优先级

1. 修复加载失败、404 或受权限阻断的重要图片。
2. 为内容图写准确 alt。
3. 装饰图使用空 alt。
4. 给图片指定宽高或比例，降低 CLS。
5. 压缩并使用合适格式与响应式尺寸。
6. 首屏主图不要被错误懒加载拖慢 LCP。
7. 图片靠近相关正文并使用描述性文件名。

`Without Title` 不需要全部清零。图片 title 对 Google 图片理解的重要性远低于 alt 和上下文。

参考：[Google 图片 SEO](https://developers.google.com/search/docs/appearance/google-images)。

## 15. Links：页面链接审计

### 15.1 汇总与筛选

- `All`
- `Unique`
- `Internal`
- `External`
- `Dofollow`
- `Nofollow`

### 15.2 单条链接信息

通常显示：

- `Anchor`：可见锚文字。
- `Title`：链接 title 属性；Missing 通常不是 SEO 故障。
- `Link`：目标 URL。

### 15.3 验收重点

- 每个重要可索引页面至少有一个站内可抓取入口。
- 使用真实 `<a href>`，不要只依赖点击事件。
- 锚文字具体、自然并与目标一致。
- 404、循环跳转和无关重定向必须修复。
- 付费链接使用 `rel="sponsored"` 或 `nofollow`。
- 用户生成内容使用 `ugc` 或 `nofollow`。
- 新窗口链接按安全需要使用 `noopener`。

链接不是越多越好，Dofollow 也不是越高越好。

参考：[Google 可抓取链接最佳实践](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)。

## 16. Social：Open Graph 与 Twitter/X Card

### 16.1 Open Graph 常见字段

- `og:title`
- `og:type`
- `og:image`
- `og:url`
- `og:description`
- `og:site_name`

### 16.2 Twitter/X Card 常见字段

- `twitter:card`
- `twitter:site`
- `twitter:title`
- `twitter:description`
- `twitter:image`

### 16.3 正确用途

- 控制社交平台、聊天工具和部分链接预览。
- 标题、描述和图片要与页面可见内容一致。
- 分享图可采用常见的 1200×630 比例，并确保重要文字在安全区域。
- `og:url` 应与规范 URL 一致。

Social 标签主要改善分享体验和点击，不是 Google 基础收录要求或直接排名因素。

## 17. Hreflangs：多语言/多地区映射

面板通常显示：

- `Language`：语言或语言-地区代码。
- `URL`：对应版本的绝对地址。
- `Status`：HTTP 状态，如 200。

验收规则：

- 仅在真正存在等价语言/地区页面时使用。
- 每个版本列出自己和全部对应版本。
- 各版本互相返回链接。
- 使用完整绝对 URL。
- 语言代码有效。
- 需要时增加 `x-default`。
- 每个语言页 canonical 通常指向自己语言的规范 URL。
- 对应页面内容应真正本地化，而不只是导航翻译。

HTML、HTTP Header、sitemap 三种实现方式选一种即可，不必同时维护三套。

参考：[Google 本地化版本指南](https://developers.google.com/search/docs/specialty/international/localized-versions)。

## 18. Structured：结构化数据

面板会把 JSON-LD、Microdata 或其他可识别结构序列化为 Key/Value，常见内容包括：

- `@context`
- `@type`
- `name`
- `url`
- `logo`/`image`
- `description`
- `sameAs`
- 类型专属字段

正确流程：

1. 先确认页面实际内容类型。
2. 选择 Google 支持的搜索功能和合适 Schema.org 类型。
3. 优先 JSON-LD。
4. 标记必须与用户可见内容一致。
5. 不创建虚假评分、评论、价格、库存、作者或 FAQ。
6. 用 Rich Results Test 验证。
7. 上线后看 Search Console 富媒体结果报告。

常见类型：

- 首页：`Organization`、`WebSite`。
- 面包屑：`BreadcrumbList`。
- 文章：`Article`/`BlogPosting`。
- 软件产品：按页面事实和 Google 当前支持情况选择。
- FAQ：可以为用户提供真实问答，但不能默认期待 FAQ 富媒体结果。

结构化数据正确只代表有资格，不保证富媒体展示，也不等于普通排名提升。

参考：[Google 结构化数据简介](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)、[搜索功能库](https://developers.google.com/search/docs/appearance/structured-data/search-gallery)、[Schema.org](https://schema.org/docs/schemas.html)。

## 19. Whois：域名注册信息

常见字段：

- Domain
- Registrar
- Registrar URL
- Whois Server
- Created Date
- Expires Date
- Updated Date
- Domain Status
- Name Servers
- DNSSEC
- Raw Whois Data

当前版优先使用 RDAP，部分旧 TLD 再回退 WHOIS；DNSSEC、Nameserver 等 DNS 信息也可能合并在 Whois 区域。官方定价页仍把 DNS 列为核心工具，但用户截图中的 2.7.0 侧栏没有独立 DNS 菜单，因此不要依赖固定菜单位置。

用途：域名续费、注册商和 DNS 运维、竞品基本背景。隐私保护后注册人信息通常被隐藏。域名创建时间、注册商或 DNSSEC 状态不能直接推出页面内容质量和 Google 排名。

## 20. Settings：扩展设置、账户与额度

界面会随版本和登录状态变化。官方页面目前明确提到：

- 账户登录与套餐同步。
- `Credits`：余额和精确到期日。
- `Billing`：管理或取消订阅。
- `Payments`：收据与发票。
- 默认打开的报告、侧栏常驻/点外隐藏、Google SERP 工具自动或手动运行、SERP 流量徽章等显示设置。
- Quick Links 支持 `{url}`、`{hostname}` 模板，供团队添加自定义外部工具。
- 扩展支持 11 种语言，语言入口位置可能随版本变化。
- SSR Check 等实验/检查开关可能出现在 Issues、Overview 或 Settings 附近。

2.7.0 扩展包观察到的默认快捷键包括 `Alt+D` 隐藏侧栏、`Alt+S` 打开 Similarweb、`Alt+R` 打开 Semrush；浏览器或用户自定义可能覆盖这些组合键。

免费版官方当前提供每月 30 credits。只有 Backlinks 与 Reverse AdSense 成功查询各消耗 1 credit，其他核心面板免费；价格和额度未来可能变化，以[官方定价页](https://aitdk.com/zh/pricing)为准。

## 21. 外部快捷入口

这些菜单通常只是把当前域名带到第三方网站，并不表示 AITDK 已经在本地完成对应审计。

| 入口 | 作用 | 关键提醒 |
| --- | --- | --- |
| Archive | 打开 Wayback Machine 历史快照 | 没有快照不代表网站从未存在；归档也可能被排除 |
| Similarweb | 打开第三方流量分析 | 流量为估算，小站误差较大 |
| Semrush | 打开关键词、排名、广告和外链研究 | 数据库覆盖、地区和更新时间会影响结果 |
| Ahrefs | 打开外链、关键词和竞品研究 | DR/UR 等是 Ahrefs 指标，不是 Google 指标 |
| PageSpeed | 打开 Google PageSpeed Insights | 区分实验室数据和真实用户 CrUX 数据 |
| Twitter | 打开 AITDK 官方 X/Twitter 或更新入口 | 这是产品动态，不是当前页面 Social 标签检查 |

部分版本还显示 `Google`、`Bing` 或 `DNS`：

- Google/Bing 通常执行域名搜索或收录观察，不是完整索引数据。
- DNS 可能嵌入或跳转第三方 DNS 查询，显示 A、AAAA、MX、TXT、NS 等记录。

## 22. PageSpeed 与 Core Web Vitals 的正确验收

不要追求 Lighthouse 100 分。优先查看真实用户数据第 75 百分位，移动端和桌面端分别评估：

- LCP ≤ 2.5 秒。
- INP ≤ 200 毫秒。
- CLS ≤ 0.1。

工具分工：

- PageSpeed Insights：单页实验室数据和可用的 CrUX 现场数据。
- Search Console Core Web Vitals：真实用户的页面组数据。
- GA4 或自建 RUM：按模板、国家、设备和版本分析。

Core Web Vitals 被页面体验系统使用，但没有单一“页面体验总分”，好分数也不保证高排名。

参考：[Google 页面体验](https://developers.google.com/search/docs/appearance/page-experience)、[web.dev Web Vitals](https://web.dev/articles/vitals)。

## 23. AITDK 官网的 13 个 AI 工具

官网把工具分成“生成器”和“改写器”。这些工具适合形成初稿或备选方案，不应未经事实核验直接发布。

### 23.1 生成器

| 工具 | 正确用途 | 发布前必须检查 |
| --- | --- | --- |
| AI Title Generator | 为页面生成多个标题候选 | 搜索意图是否准确、页面是否真的提供承诺、是否与其他页面重复 |
| AI Description Generator | 生成 meta description 候选 | 是否页面专属、是否自然、是否有虚假功能或营销承诺 |
| AI Keywords Generator | 生成主题词、问题词和相关查询灵感 | 不要把结果全部塞进 meta keywords 或正文；先验证真实搜索意图与需求 |
| AI Feature Generator | 把产品能力整理成用户利益和功能点 | 每项能力必须已经真实可用；区分已上线、测试中和规划中 |
| AI FAQ Generator | 生成用户可能关心的问题和回答草稿 | 问答必须来自真实疑问，答案要准确，并在页面可见 |
| AI Testimonial Generator | 最多用于整理真实反馈的表达方式或示例占位 | 严禁生成并冒充真实客户评价、姓名、头像、评分或结果 |
| AI Landing Page Generator | 生成落地页结构和文案初稿 | 必须补充原创证据、截图、限制、价格、主体信息和真实 CTA |

### 23.2 改写器

官网提供六个改写器：

- AI Title Rewriter
- AI Description Rewriter
- AI Keywords Rewriter
- AI Feature Rewriter
- AI FAQ Rewriter
- AI Testimonial Rewriter

改写器的正确流程：

1. 输入经过事实核验的原文。
2. 要求保留产品边界、数字、格式、品牌和法律含义。
3. 生成多个版本，而不是直接覆盖。
4. 由产品或内容负责人逐条核对。
5. 检查与同站其他页面是否重复或抢同一搜索意图。
6. 发布后用 Search Console 和转化数据判断效果。

### 23.3 AI 文案不能替代产品证据

工具站、SaaS 和 AI 产品页至少应提供：

- 真实产品界面。
- 输入和输出示例。
- 完整操作流程。
- 支持和不支持的格式。
- 准确性、速度、额度或价格边界。
- 常见失败情况和人工处理方式。
- 联系、隐私、条款和退款信息。

大量批量生成、近似重复、没有产品价值的页面可能构成 scaled content abuse 或 doorway abuse。

参考：[Google 垃圾内容政策](https://developers.google.com/search/docs/essentials/spam-policies)。

## 24. AITDK 套餐与 credits

以下是 2026-08-21 从官方定价页读取的快照，未来可能变化：

| 套餐 | 当前公开价格/额度概览 | 适用方式 |
| --- | --- | --- |
| Free | $0；30 credits/月 | 偶尔查 Backlinks 或 Reverse AdSense |
| Starter | 月付标价约 $10；年付 $100（折算 $8.33/月）；7,200 credits/年 | 每周竞品研究 |
| Pro | 月付标价约 $20；年付 $200（折算 $16.67/月）；24,000 credits/年 | 高频日常研究，Traffic 最长 12 个月和更完整渠道趋势 |

规则：

- Backlinks 成功查询：1 credit。
- Reverse AdSense 成功查询：1 credit。
- 失败或无数据查询官方称会自动退还。
- 其他核心分析面板和官网 AI 工具目前免费。
- 月付 credits 每个账期刷新，不累计。
- 年付 credits 一次发放并在 12 个月内有效。
- 余额和到期日位于 Settings → Credits。

价格页存在两个需要购买前复核的差异：英文页在本次研究时显示 Starter 600→800/月、Pro 2,000→2,400/月的限时加赠，中文页没有同步；定价 FAQ 的退款条件写“7 天内且消耗不超过 5%”，独立退款政策写“不超过 10%”。购买或退款前应以结账页为准，并向 `support@aitdk.com` 取得书面确认。

最终以[官方定价页](https://aitdk.com/zh/pricing)为准。

## 25. 隐私、安全和使用边界

Chrome Web Store 披露该扩展会处理个人身份信息和财务/支付信息。AITDK 官网隐私政策还写明可能收集：

- 姓名。
- 邮箱。
- 支付信息。
- IP 地址。
- 浏览器类型。
- 在其网站访问的页面和使用详情。

2.7.0 扩展包使用 Manifest V3，观察到 `storage`、`contextMenus` 权限、匹配 `<all_urls>` 的内容脚本，以及 AITDK 域名的主机权限。读取当前网页 DOM 是分析 title、正文、图片和链接的必要条件；Traffic、Whois、Backlinks、Reverse AdSense 等查询至少需要把目标域名发送到 AITDK 服务。

现有隐私政策没有逐项说明扩展读取页面内容的处理位置、查询域名保存期限、删除机制、跨境处理、具体子处理商或所有安全措施。因此不能断言“所有页面分析都只在本机完成”。

实践建议：

- 只在公开网页、自己的测试环境或已获授权的网站上运行审计。
- 不要在含客户资料、后台管理、私有文档、支付信息或敏感 URL 参数的页面开启不必要的扩展。
- 企业环境应由安全负责人评估扩展权限、数据流和隐私政策。
- 不要把竞品 Whois、AdSense 或关联域名线索当作已验证身份结论。
- 记录外部工具版本和审计日期，避免旧报告与新页面混淆。

参考：[AITDK Privacy Policy](https://aitdk.com/privacy-policy)、[Chrome Web Store 隐私披露](https://chromewebstore.google.com/detail/aitdk-seo-extension-traff/hhfkpjffbhledfpkhhcoidplcebgdgbk)。

## 26. 可复用的多网站 SEO 建站流程

### 26.1 阶段一：定义业务和搜索目标

每个新网站先写清：

- 产品解决什么问题。
- 目标用户是谁。
- 用户所在国家和使用语言。
- 用户搜索时处于了解、比较、使用还是购买阶段。
- 网站希望用户完成什么动作。
- 哪些后端和 GA4 事件代表真实价值。

正确目标示例：

> 提升与产品真实能力相关查询中的展示份额、自然点击和有效注册，而不是追求 AITDK 满分。

### 26.2 阶段二：建立关键词与搜索意图地图

建议从六类查询建立主题：

1. 产品类别词。
2. 用户问题词。
3. 功能和动作词。
4. 使用场景词。
5. 输入、输出和文件格式词。
6. 对比、替代、教程和故障解决词。

建立页面规划表：

| URL | 目标用户 | 主要搜索意图 | 主查询组 | 页面承诺 | H1 | Title | Description | Canonical | Schema | 内链入口 | 核心 CTA | 关键事件 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/example` | 示例 | 示例 | 示例 | 示例 | 示例 | 示例 | 示例 | 示例 | 示例 | 示例 | 示例 | 示例 |

一个页面服务一个清晰的主要意图和一组自然相关查询。不要为每个近义词批量生成高度相似页面。

### 26.3 阶段三：URL 与信息架构

- URL 简短、稳定、可理解。
- 重要页面至少从一个站内页面获得可抓取链接。
- 导航和正文链接使用真实 `<a href>`。
- 参数、筛选、分页、打印和预览页提前定义 canonical/noindex 策略。
- 删除页返回 404/410，或重定向到真正等价的页面。
- 不把所有旧页面无差别重定向到首页。
- sitemap、canonical、内链和重定向采用同一 URL 规范。

### 26.4 阶段四：People-first 页面内容

每个核心页面至少回答：

1. 这是什么。
2. 适合谁。
3. 能完成什么。
4. 如何使用。
5. 输入和输出是什么。
6. 有什么限制和注意事项。
7. 有什么真实证据或示例。
8. 为什么值得信任。
9. 下一步应该做什么。

推荐页面结构：

```text
H1：用户主要任务和结果
首屏摘要：是什么 + 适合谁 + 核心差异 + CTA
H2：真实功能或工作流
H2：步骤
H2：输入/输出/格式
H2：真实案例和结果
H2：限制与可信边界
H2：价格或使用条件
H2：常见问题
最终 CTA
主体、联系、隐私、条款、支持
```

### 26.5 阶段五：页面级 SEO 模板

#### Title 内部写法

```text
主要用户任务或产品类别｜核心差异点｜品牌
```

要求：唯一、准确、自然；主要主题出现一次即可；不以 60 字符作为硬门槛。

#### Description 内部写法

```text
用户能完成什么 + 支持的输入/场景 + 核心差异点 + 下一步动作
```

要求：页面专属、与可见内容一致、不写成关键词列表、不虚假承诺。

#### 机器可读基础

```html
<title>页面专属标题</title>
<meta name="description" content="页面专属描述">
<link rel="canonical" href="https://example.com/canonical-path">
<meta name="robots" content="index,follow">
<meta property="og:title" content="分享标题">
<meta property="og:description" content="分享描述">
<meta property="og:url" content="https://example.com/canonical-path">
<meta property="og:image" content="https://example.com/social-image.png">
<meta name="twitter:card" content="summary_large_image">
```

多语言页面再加入互相返回的 hreflang；结构化数据按真实页面类型单独生成。

### 26.6 阶段六：抓取、索引与渲染

上线前确认：

- 正式页面返回 200。
- 没有遗留 `noindex`。
- robots.txt 未阻断核心页面和必要资源。
- 主要正文、元数据和内链能被渲染。
- HTTP/HTTPS、www/非 www、大小写和尾斜杠统一。
- canonical、sitemap 与内链一致。
- 移动端与桌面端主要内容等价。
- 登录墙、Cookie 弹窗和地域判断不会挡住公开正文。

Canonical 信号通常为：永久重定向和 `rel=canonical` 较强，sitemap 较弱；应保持一致。

### 26.7 阶段七：图片、结构化数据和多语言

#### 图片

- 重要图片使用 `<img>` 或 `<picture>`。
- 内容图 alt 准确，装饰图 alt 为空。
- 文件名和周围正文可描述图片。
- 指定宽高/比例，使用响应式尺寸和压缩。
- 首屏主图优化 LCP。

#### 结构化数据

- 只标记页面真实可见内容。
- 使用 Google 当前支持的类型和属性。
- 用 Rich Results Test 验证。
- 不伪造评分、评论、价格、库存、作者或 FAQ。

#### 多语言

- 内容真正本地化。
- 每个语言版本自引用 canonical。
- hreflang 完整且双向。
- 必要时使用 x-default。
- 语言切换链接可抓取。

### 26.8 阶段八：性能和移动端

- 先确保页面可用、内容相关和转化流程完整。
- 优先优化首屏 LCP、长任务导致的 INP 和布局跳动 CLS。
- 图片、字体、第三方脚本和客户端组件设置性能预算。
- 用真实移动设备和低速网络测试。
- 区分 PageSpeed 实验室分数与 CrUX 真实用户数据。

### 26.9 阶段九：Search Console、GA4 与业务数据

Search Console：

- 验证 Domain property。
- 提交 sitemap。
- 对首页、核心功能页和内容页分别做 URL Inspection。
- 查看 Google 选择的 canonical。
- 查看 Performance 的查询、页面、国家和设备。
- 检查 Manual Actions、Security Issues 和富媒体报告。

GA4：

- 只在正式环境按隐私要求加载。
- Realtime/DebugView 验证。
- 排除内部和开发流量。
- 定义注册、首次成功任务、升级、结账、购买等关键事件。
- 与 Search Console 连接。

业务数据：

- 注册账户数。
- 核心任务成功数。
- 真实文件处理或产品使用数。
- 付费订单和退款。
- 留存和复用。

## 27. 推荐的 AITDK 审计顺序

每个页面按以下顺序执行，避免在低价值提示上浪费时间。

### 27.1 第一轮：是否能被正确抓取和索引

1. URL 和 HTTP 状态。
2. Robots Tag 与 X-Robots-Tag。
3. robots.txt。
4. Canonical。
5. sitemap。
6. SSR/渲染后的主要内容。
7. 重要站内链接。

### 27.2 第二轮：页面是否准确回答搜索意图

1. Title。
2. Description。
3. H1 和页面首屏承诺。
4. H2/H3 结构。
5. 真实功能、步骤、示例和限制。
6. 图片 alt。
7. CTA 与关键事件。

### 27.3 第三轮：搜索展示与增强

1. Structured Data。
2. Hreflangs。
3. Social。
4. Favicon。
5. PageSpeed/Core Web Vitals。

### 27.4 第四轮：竞争和增长研究

1. Traffic 趋势。
2. SERP 和关键词。
3. Backlinks。
4. Top Regions。
5. Similarweb/Semrush/Ahrefs 交叉验证。

### 27.5 最后才看

- Meta Keywords。
- 固定字符分数。
- Word Count。
- Keyword Density。
- 图片 title。
- Domain Age。
- AdSense Missing。

## 28. 发布质量门槛

### 28.1 P0：必须通过

- [ ] 正式 URL 返回正确状态码。
- [ ] Googlebot 能获得主要正文。
- [ ] 无意外 noindex 或 robots 阻断。
- [ ] canonical、内链和 sitemap 一致。
- [ ] 每页 title 唯一且准确。
- [ ] 移动端与桌面端主要内容等价。
- [ ] 重要页面有站内入口。
- [ ] 多语言 hreflang 完整且双向。
- [ ] 结构化数据与可见内容一致。
- [ ] GA4 核心事件经真实操作验证。

### 28.2 P1：应尽量通过

- [ ] Description 页面专属且具有点击吸引力。
- [ ] 页面有真实证据、示例、限制和清晰 CTA。
- [ ] 内容图 alt、尺寸、压缩和上下文完整。
- [ ] Core Web Vitals 达到良好范围。
- [ ] 主体、支持、隐私和条款入口清晰。
- [ ] Search Console URL Inspection 无关键异常。

### 28.3 P2：观察项

- [ ] AITDK Issues/GEO 总分及具体项。
- [ ] 第三方 Traffic、SERP、Backlinks。
- [ ] Social/Twitter 预览。
- [ ] Whois 和域名日期。
- [ ] H1/H2/H3 绝对数量。

### 28.4 不作为发布阻断

- [ ] Meta keywords 是否绿色。
- [ ] Title 是否恰好 60 个字符。
- [ ] Description 是否恰好 160 个字符。
- [ ] 图片是否有 title 属性。
- [ ] 是否接入 AdSense。
- [ ] 是否达到某个关键词密度。
- [ ] Lighthouse 是否 100 分。

## 29. 上线后的 30/60/90 天迭代

### 0-30 天：发现与索引

- 检查 sitemap 读取状态。
- 对核心页面执行 URL Inspection。
- 记录 Google 选择的 canonical。
- 修复 404、重定向、抓取、渲染和结构化数据错误。
- 验证 GA4 与核心业务事件。
- 不因几天没有排名就批量重写网站。

### 31-60 天：查询与点击

- 在 Search Console 按查询和页面看展示、点击、CTR、平均排名。
- 找出已有展示但回答不完整的页面。
- 找出排名较好但 CTR 低的页面，改进 title、description 和首屏。
- 找出多个页面竞争同一意图的情况，合并或重新分工。
- 对有价值页面补充真实示例、教程和内链。

### 61-90 天：转化与权威

- 把自然点击与注册、首次成功任务、购买连接起来。
- 优先优化流量已有但关键事件低的落地页。
- 发布原创数据、工具、模板、案例或教程，争取真实编辑性外链。
- 扩展已验证的查询主题，不批量复制近似页面。
- 对 AITDK Traffic/Backlinks 只做趋势参考。

### 常用诊断表

| 数据表现 | 可能原因 | 优先动作 |
| --- | --- | --- |
| URL 未索引 | 抓取、canonical、重复、质量或渲染 | URL Inspection、robots、canonical、主要正文检查 |
| 有排名但展示少 | 需求小或查询覆盖窄 | 验证需求，补充真实相关主题 |
| 展示高、CTR 低 | 标题/摘要与意图不匹配或 SERP 竞争强 | 查看真实 SERP，改 title、description 和首屏 |
| 点击高、关键事件低 | 页面承诺、体验或 CTA 不匹配 | 检查落地页和产品流程 |
| 多页抢同一查询 | 页面高度重复或信息架构冲突 | 合并、重定向、canonical 或重分意图 |
| AITDK 有流量、GA4 没有 | 第三方估算误差、日期/域名/同意机制 | 以自有数据为准，检查 GA4 和日志 |
| AITDK 全绿但无展示 | 缺少需求、内容价值、发现或权威 | 查 Search Console、搜索意图、内容证据与链接发现 |

## 30. 竞品研究模板

不要只分析竞品首页。每个竞品至少抽样：

- 首页。
- 最强功能页。
- 价格页。
- 1-3 个主要自然搜索落地页。
- 教程/博客页。
- 关于、支持、条款页。

记录表：

| 维度 | 观察内容 | 数据来源 | 可信度 | 可借鉴原则 | 禁止照抄内容 |
| --- | --- | --- | --- | --- | --- |
| 搜索意图 | 用户任务、查询类型 | SERP + 页面 | 高 | 页面分工 | 文案、案例、结构原样复制 |
| 内容证据 | 截图、示例、数据、限制 | 页面 | 高 | 证据形式 | 竞品数据或用户评价 |
| 流量趋势 | 量级、渠道、地区 | AITDK/Similarweb | 中低 | 渠道假设 | 把估算当真实财务或用户数 |
| 关键词 | 入口主题和问题 | AITDK/Semrush/Ahrefs | 中 | 需求主题 | 机械复制词表和密度 |
| 外链 | 被引用原因和来源类型 | Backlinks/Ahrefs/GSC | 中 | 可链接资产类型 | 购买或复制链接 |
| 技术 | canonical、schema、hreflang、性能 | AITDK + 官方测试 | 高 | 正确实现模式 | 复制错误或无关 Schema |

## 31. ScoreTransposer 当前截图的逐项解读

用户在 2026-08-21 提供的首页 Overview 截图可得到以下结论。

### 31.1 已通过或方向正确

| 项目 | 截图状态 | 解释 |
| --- | --- | --- |
| Title | `60/60` 绿色 | 标题存在且符合 AITDK 长度规则；仍要按真实查询和 CTR 验证 |
| Description | `121/160` 绿色 | 描述存在且自然，不需要为凑满 160 再加词 |
| URL/Canonical | 均指向正式主域 | 方向正确；持续确保尾斜杠、内链和 sitemap 规范一致 |
| Favicon | 已检测 | 品牌图标存在 |
| Robots Tag | `index, follow` | 公开首页允许索引 |
| robots.txt | Available | 文件存在，还应持续检查内容 |
| sitemap.xml | Available | 文件存在，还应确保只列规范可索引 URL |
| Google Analytics | Available | 脚本已检测；真实数据需在 GA4 验证 |
| H1/H2/H3 | 1 / 8 / 13 | 有清晰内容层级，不应为了数字再增加标题 |
| Images Without Alt | 0 | 当前被插件统计到的图片均有 alt |

### 31.2 不应当作 SEO 故障

| 项目 | 截图状态 | 正确处理 |
| --- | --- | --- |
| Keywords | `300/100` 橙色 | Google 不使用 meta keywords；不要为了变绿修改正文 |
| Google AdSense | Missing | 当前产品不是依赖广告变现，无需安装 |
| X-Robots-Tag | N/A | 普通 HTML 已有 meta robots 时不是缺失 |
| Without Title | 3 | 图片 title 不是必需项；alt 已完整更重要 |
| Domain Creation | 2026-04-22 | 新域名只能通过长期产品、内容和真实引用积累，不能技术“修复” |

### 31.3 需要进一步验证，而不是从截图直接下结论

| 项目 | 截图状态 | 下一步 |
| --- | --- | --- |
| SSR Check | 开关呈灰色 | 启用检查；再用服务器 HTML 和 Search Console URL Inspection 确认正文与元数据 |
| Word Count | 313 | 插件可能只统计部分渲染文本；按页面是否完整回答任务评估，不设最低字数 |
| Structured | Overview 未展示细节 | 单独检查 JSON-LD，并用 Rich Results Test 验证 |
| Hreflangs | Overview 未展示细节 | 中英文版本逐页确认互相返回、状态 200、canonical 正确 |
| Social | Overview 未展示细节 | 检查 OG/Twitter 标题、描述、图片和 URL |
| Links | 截图下方未完整显示 | 检查核心功能页是否都有首页和正文入口 |

### 31.4 ScoreTransposer 最重要的下一步

不要继续围绕首页单页堆词。应按真实用户意图维护独立页面：

- `/pdf-score-scanner`
- `/staff-to-jianpu`
- `/jianpu-to-staff`
- `/transpose-score`
- `/score-editor`
- `/score-to-audio`
- `/musicxml-midi`
- 价格、FAQ、支持和可信边界页面

每页使用独立 title、description、H1、可见示例、输入输出说明和 CTA，并围绕同一个 MusicXML/Score JSON 结构化产品能力提供真实证据。不要承诺所有扫描谱都能完全自动识别，应继续表述为“导入候选 + 人工校正”。

项目已有的专项修复记录：[AITDK app 子域审计与修复记录](../audits/aitdk-app-audit-2026-08-19.md)。

## 32. 固定审计记录模板

每次发布建议保存一份 Markdown 记录：

```markdown
# [站点/页面] AITDK 与 Google SEO 审计

- URL：
- 环境：production/staging
- 审计日期：
- AITDK 版本：
- 代码版本/部署 ID：
- 审计人：

## P0 抓取与索引
| 项目 | AITDK | 官方验证 | 结论 | 修复 |
| --- | --- | --- | --- | --- |

## P1 内容与意图
| 项目 | 当前值 | 用户意图 | 结论 | 修复 |
| --- | --- | --- | --- | --- |

## P2 增强与体验
| 项目 | 当前值 | 官方验证 | 结论 | 修复 |
| --- | --- | --- | --- | --- |

## 发布后数据
- Search Console 展示/点击/CTR：
- GA4 自然落地页互动：
- 核心事件：
- 后端真实注册/任务/支付：

## 最终结论
- 真实缺失：
- 有条件建议：
- 无需修改：
- 下一次复测日期：
```

## 33. 最终决策规则

当 AITDK 建议和网站策略冲突时，按下面顺序判断：

1. 是否违反用户需求、事实、法律、隐私或产品边界。
2. 是否阻断 Google 抓取、索引或正确 canonical。
3. 是否与 Google 官方文档冲突。
4. 是否能在 Search Console、GA4 或业务数据中验证。
5. 是否只是 AITDK 的字符、数量、密度或总分规则。

最终记住：

> AITDK 用于发现问题，不负责证明排名；Search Console 用于确认 Google，GA4 与后端用于确认用户，真实产品价值与原创内容决定网站是否值得长期获得搜索流量。

## 34. 主要来源

### AITDK

- [AITDK 官网](https://aitdk.com/)
- [AITDK 中文扩展介绍](https://aitdk.com/zh/extension)
- [AITDK 中文定价](https://aitdk.com/zh/pricing)
- [AITDK Chrome Web Store](https://chromewebstore.google.com/detail/aitdk-seo-extension-traff/hhfkpjffbhledfpkhhcoidplcebgdgbk)
- [AITDK Privacy Policy](https://aitdk.com/privacy-policy)
- [AITDK 服务条款](https://aitdk.com/zh/terms-of-service)
- [AITDK 退款政策](https://aitdk.com/zh/refund-policy)

### Google Search 官方文档

- [Google Search Essentials](https://developers.google.com/search/docs/essentials)
- [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [People-first Content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Spam Policies](https://developers.google.com/search/docs/essentials/spam-policies)
- [Title Links](https://developers.google.com/search/docs/appearance/title-link)
- [Snippets and Meta Description](https://developers.google.com/search/docs/appearance/snippet)
- [Canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
- [Robots Meta/X-Robots-Tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Crawlable Links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
- [Localized Versions/Hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Structured Data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [Image SEO](https://developers.google.com/search/docs/appearance/google-images)
- [Page Experience](https://developers.google.com/search/docs/appearance/page-experience)
- [AI Features and Your Website](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Search Console](https://developers.google.com/search/docs/monitor-debug/search-console-start)

### 分析与性能

- [GA4 安装](https://support.google.com/analytics/answer/14183469)
- [GA4 连接 Search Console](https://support.google.com/analytics/answer/10737381)
- [GA4 排除内部流量](https://support.google.com/analytics/answer/10104470)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Core Web Vitals](https://web.dev/articles/vitals)

## 35. 维护说明

AITDK 是持续更新的第三方扩展。每次扩展大版本、侧栏菜单、credits 规则、GEO 规则或数据源发生变化时：

1. 更新本文件顶部版本基线和日期。
2. 保存新版每个模块的截图或字段清单。
3. 对比新增/删除字段。
4. 重新确认官方定价、隐私和 Chrome Store 披露。
5. 不因为工具新增评分就立即批量修改全部网站。
6. 先在一个非关键页面验证，再推广到站点模板。
