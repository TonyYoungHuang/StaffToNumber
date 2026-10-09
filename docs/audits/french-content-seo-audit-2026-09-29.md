# ScoreTransposer 法语内容与 SEO 审计

检查日期：2026-09-29。模式：只读审计。没有修改产品代码、线上页面、支付配置或客户订单；本次只新增审计文件。

**结论：法语站的技术 SEO 基础完整，主要问题在价格落地页、购买说明的一致性，以及翻译没有覆盖完整服务流程。优先改善已经承接搜索和成交的页面。**

用户确认该订单来自法语搜索。本轮将其作为业务背景；截图能确认 49 USD 的 Starter 一年单次购买，但没有独立查询该客户的搜索词、落地页或归因数据，不据此推断具体关键词排名。

## 检查范围与证据

| 范围 | 实际完成 |
|---|---|
| 公开法语页 | 网站地图内全部 33 页逐页抓取，涵盖首页、功能、定价、指南、曲库、帮助、隐私与条款 |
| 额外路径 | 音频转谱实验页、官网付款入口/成功/取消页、不存在路径，共 5 个额外路径 |
| 技术 SEO | 全站 297 个 sitemap URL；检查状态、标题、描述、H1、canonical、hreflang、社交标签及结构化数据等 |
| 法语语言资源 | 16 个独立 fr.ts 文件，共 3,345 个字符串叶节点；自动核对英文基准的字段和变量占位符，人工检查重点内容；另检查共享导航、购买方式、错误处理和邮件代码 |
| 链接与媒体 | 对 100 个去重的本站链接、图片、视频、封面及分享图地址进行 HEAD 可达性检查，未发现失败；不等于逐帧验证所有视频内容 |
| 浏览器 | 法语首页→购买→法语登录、应用付款取消页；定价页 1280×900 与 390×844 视口 |
| 未覆盖 | 没有登录客户账号、下测试订单或发送邮件；登录后编辑器/账单依靠源码及语言资源检查，未逐个操作复现所有动态状态；没有读取最新 GSC/GA4 私有数据或做法国本地网络测速 |

原始证据：[技术检查 JSON](<E:/AI WEB/21.wuxianpu/artifacts/french-audit-2026-09-29/technical-audit.json>)、[33 页清单 CSV](<E:/AI WEB/21.wuxianpu/artifacts/french-audit-2026-09-29/french-page-ledger.csv>)、[页面与元数据](<E:/AI WEB/21.wuxianpu/artifacts/french-audit-2026-09-29/pages.json>)、[语言资源检查](<E:/AI WEB/21.wuxianpu/artifacts/french-audit-2026-09-29/catalogs.json>)、[100 个资源检查](<E:/AI WEB/21.wuxianpu/artifacts/french-audit-2026-09-29/resource-probes.json>)。

## 优先处理的问题

### 1. P1：真正的法语价格落地页没有价格表，套用了转换工具模板

**线上已确认。** [法语价格页](https://scoretransposer.com/fr/pricing) 有标题、套餐名称和额度，却没有直接给出各套餐金额，也没有完整展示订阅/单次购买的区别。主要 CTA 还要进入工作台或回到首页价格区。

页面用“输入→输出”的格式介绍买会员，示例是英文账户/权限说明，FAQ 甚至问价格页接受什么输入、转换后能否编辑。首屏还向买家解释 Price ID 配置。这些内容被写进同页 FAQPage/HowTo；JSON 能解析、内容也可见，但内容本身不适合定价搜索意图。

建议把 `/fr/pricing` 做成可独立完成购买判断的页面：列价格、USD 币种、有效期、每月额度、存储、单次购买与自动续费区别，再提供直接选择方案的按钮。FAQ 改为付款、到期、续费、额度重置与售后；不需要“转换输入输出”示例。首页价格区可继续保留。

定位：[法语 pricing 文案](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/feature-localization/locales/fr.ts:73>)、[通用 FAQ 模板](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/feature-localization/ui.ts:242>)、[功能页组件](<E:/AI WEB/21.wuxianpu/apps/www/src/app/[featureSlug]/page.tsx:136>)。

### 2. P1：单次购买已经上线，法语条款却把付费方案统称为自动续费订阅

**线上已确认。** [法语条款](https://scoretransposer.com/fr/terms) 把 Starter / Converter Pro 定义为按月或按年循环订阅，并说明未取消就会再次扣款；没有单独解释这笔订单对应的一年单次购买。About、FAQ 等页面也主要按订阅口径介绍交付。

需要明确区分 `abonnement avec renouvellement automatique` 与 `achat unique sans renouvellement automatique`，分别说明有效期、续费/再次购买、退款后的访问权限。用户的单次购买不是“每年扣一次的订阅”。

**不应把首页所有续费说明删掉。** 当前站点同时提供两种购买方式；首页已有法语“一次购买一个月或一年，不自动续费”的入口，共享购买方式文案也已经翻译。问题是条款和其他说明没有同步覆盖新方式。

隐私和条款页还明确标注法语译文尚未正式复核。应完成内容与译文核对后再更新状态，不能仅删除提示就称为已复核。本次没有对法国法律适用性作结论。

定位：[条款购买段落](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/support-legal-localization/locales/fr.ts:48>)、[译文状态提示](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/support-legal-localization/locales/fr.ts:5>)、[已有双购买方式文案](<E:/AI WEB/21.wuxianpu/packages/shared/src/index.ts:936>)。

### 3. P2：11 个法语功能/价格页的示例说明仍有英文

**线上已确认。** 包含 10 个可索引页和 1 个 noindex 音频实验页。移调页的示例仍使用 C major、transpose by two semitones 等英文描述；扫描、编辑、音频、教学等页也有同类情况。

根因是本地化函数只替换示例备注，没有替换 `example.input` 和 `example.output`。格式名 MusicXML、MIDI 和实际数据语法可以保留，描述性句子应翻译。例如移调说明改为 `Do majeur : do, ré, mi, sol. Transposition de deux demi-tons vers le haut.`，结果改为 `Ré majeur : ré, mi, fa dièse, la. Une nouvelle version est créée.`；精确音高编码可另附，保留原八度信息。

此外，教学页仍显示 `Classroom / School Beta`。完整页面与原句见 [英文示例清单](<E:/AI WEB/21.wuxianpu/artifacts/french-audit-2026-09-29/summary.json>)。

定位：[遗漏发生处](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/feature-localization/index.ts:76>)、[原始示例](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/feature-seo.ts:119>)。

### 4. P2：邮件与错误提示没有形成完整法语流程

**源码确认，未发送真实邮件。** 找回密码、客服请求确认邮件仅分简体中文与英文；法语会使用英文模板。结账和账单组件还会直接显示后端原始错误，而后端很多错误只有英文。

建议增加法语事务邮件；后端返回稳定错误码，前端按法语错误码映射显示，未知错误使用法语兜底。仅补全 fr.ts 不会解决直接透传英文报错的问题。

定位：[找回密码邮件](<E:/AI WEB/21.wuxianpu/services/api/src/lib/email.ts:76>)、[客服确认邮件](<E:/AI WEB/21.wuxianpu/services/api/src/lib/email.ts:125>)、[原始错误直接透传](<E:/AI WEB/21.wuxianpu/apps/app/src/lib/billing-messages/client.ts:8>)、[结账调用处](<E:/AI WEB/21.wuxianpu/apps/app/src/components/AppCheckoutClient.tsx:158>)。

### 5. P2：法语桌面导航会重叠

**浏览器复现。** 1280×900 视口中，品牌区域横坐标约 20—298，首个导航链接约 94—261，二者实际相交；右侧导航也挤入语言选择器。390×844 抽查没有横向溢出。

建议扩大折叠菜单适用宽度或按实际剩余空间折叠导航，并减少重复登录入口。此问题可能影响其他长文本语言，本轮确定了法语复现。

证据：[1280 像素截图](<E:/AI WEB/21.wuxianpu/artifacts/french-audit-2026-09-29/pricing-1280.png>)、[手机截图](<E:/AI WEB/21.wuxianpu/artifacts/french-audit-2026-09-29/pricing-mobile.png>)。相关样式：[导航布局](<E:/AI WEB/21.wuxianpu/apps/www/src/app/public-site.css:228>)。

### 6. P2：币种展示与 Stripe 语言偏好没有完全本地化

**价格展示线上确认。** 首页主价格使用 `$7.99`、`$49`，同张卡片的单位价却使用法语小数逗号，格式不一致；美元符号也没有明确区分 USD。建议统一为 `7,99 $US`、`49,00 $US` 等法语格式，并明确按 USD 收费。无需为了法语展示擅自改成欧元结算。

**Stripe 部分是源码发现与待验证项。** 创建 Checkout Session 时没有传入网站所选 locale。Stripe 官方说明，locale 留空会采用浏览器语言，因此不能保证用户在网站选了法语后收银台也跟随；这不意味着法国浏览器一定会显示英文。截图中的商品名称/说明是英文，但它是商户后台，不能据此声称该买家看到的整个收银台是英文。应单独核对商品文案和已选语言传递。[Stripe 官方 locale 说明](https://docs.stripe.com/api/checkout/sessions/create#parameter-locale)

定位：[价格字符串保留英文格式](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/homepage-localization/index.ts:49>)、[Session 参数](<E:/AI WEB/21.wuxianpu/services/api/src/lib/payments.ts:176>)。

### 7. P2：SEO 正文偏技术说明，法语搜索意图需要更明确

公开页面大量使用 Score JSON、内部 revision、引擎配置、Price ID、Webhook/API 等概念。法语并非普遍不可读，但读者要先理解产品内部实现，才知道能否处理自己的乐谱。首页、功能页和支持页应先说明输入文件、能完成的任务、实际输出、免费范围和必要校对，再将技术细节放到帮助文档。

现有已读关键词方案主要研究英文搜索，包括法国地区的英文搜索；它不能直接证明法语搜索需求。建议先在现有 URL 上明确意图，而不是扩建一批近义词页面。下列是编辑建议，**没有宣称搜索量或排名优势**：

| 当前页面 | 建议主要意图 | 可用的法语标题草案 |
|---|---|---|
| `/fr/transpose-score` | 在线乐谱移调 | Transposer une partition en ligne — ScoreTransposer |
| `/fr/pdf-score-scanner` | 从 PDF/图片识别乐谱 | Scanner une partition PDF ou image — ScoreTransposer |
| `/fr/pdf-to-musicxml` | PDF 乐谱转 MusicXML | Convertir une partition PDF en MusicXML — ScoreTransposer |
| `/fr/score-editor` | 在线修改乐谱 | Éditeur de partitions en ligne — ScoreTransposer |
| `/fr/score-to-audio` | 聆听乐谱并导出音频 | Écouter une partition et exporter en MP3 ou WAV — ScoreTransposer |
| `/fr/pricing` | 价格、付费方式比较 | Tarifs : abonnement ou achat unique — ScoreTransposer |

这些功能已存在对应法语标题，并非缺少整个法语 SEO。改善目标是表达更直接、正文更贴近任务。元数据、正文与结构化数据应同步；Google 要求结构化数据真实对应页面内容，标签齐全不能代替内容质量。[内容质量指南](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)、[结构化数据指南](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)

### 8. P2：主要页面的 sitemap 更新时间滞后

首页等核心页仍使用 2026-08-25 的固定更新时间，而当前页面已包含 9 月新增的单次购买和更新后的存储额度。曲库还有 8 月 10 日、24 日的独立日期；不能笼统说所有页面都是同一天。

建议按页面实际重要内容修改日期维护 lastmod，不要把所有页面每次构建都刷成当天。Google 建议 lastmod 反映页面的实际重要更新。[Google sitemap 指南](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

定位：[统一日期常量](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/site.ts:138>)。

### 9. P3：少量法语模板和专业措辞需要润色

| 当前表达 | 问题 | 建议 |
|---|---|---|
| `Partition de Ave Maria` | 省音不自然 | `Ave Maria : partition…` 或 `Partition d’Ave Maria` |
| `Partition de Le Printemps` | 冠词模板不自然 | `Le Printemps : partition…` |
| `Quelles entrées … accepte-t-il ?` | 对不少标题套入后语法和语义别扭 | 工具页直接问 `Quels formats de fichiers sont acceptés ?`；价格页另写购买问题 |
| `le confort de clé` | 含义不够明确 | 根据本意写成 `le choix de la clé et la lisibilité` |
| `paquet draft`、`Billing` | 法语说明夹杂英文 | `version provisoire`、`Facturation` 等，并与实际菜单一致 |
| `portée vers Jianpu` | 能理解，但面向普通用户可更明确 | `convertir une partition en notation chiffrée (Jianpu)` |

曲库标题根因：[统一 title 模板](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/library-localization/locales/fr.ts:47>)。无需改动乐曲实体名或已有 URL。

### 10. P3：曲库来源卡片的搜索价值需要单独评估

12 个法语曲库详情页中，多数是简短的作品信息、权利说明和外部来源入口；如果想承接“下载某首乐谱”的搜索，当前页未必充分满足需求。保留外部来源边界是合理的，不应为 SEO 擅自复制乐谱。

建议按真实需求补充具体可用版本、难度/编制说明、来源入口和合法可提供的示例；没有足够独立用途的测试页或薄内容页，再逐页考虑合并或 noindex。此项是内容改进建议，不是已确认的收录处罚。

## 已通过及不应误判的项目

- 33 个法语 sitemap 页均为 HTTP 200、`html lang=fr`、可索引、自指 canonical，并有独立 title、description、单个 H1。
- 每页输出 9 种语言加 x-default，共 10 个 hreflang；全站技术检查通过 HTML/sitemap 对应关系检查。通用 `fr` 是正常选择，不必仅因买家来自法国改成 `fr-FR`。[Google 多语言说明](https://developers.google.com/search/docs/specialty/international/localized-versions)
- 法语 OG/Twitter 文案、图片地址、JSON-LD 已存在；没有发现本次检查范围内的资源失效。
- 实验音频页为 noindex，未列 sitemap；不存在路径返回 404；支付与应用页不进入公开索引。
- 16 份语言资源未发现非 keywords 数组项的必需字段缺失，也没有变量占位符不一致。各语言关键词数组数量不同不构成翻译缺失；Google 不使用 meta keywords 作为排名信号，不应以补齐词数作为优化目标。[Google 标签说明](https://developers.google.com/search/docs/crawling-indexing/special-tags)
- 法语首页→购买→登录的真实浏览器流程保持法语。无 Cookie 的抓取程序得到英文登录页，是它没有保存语言 Cookie，不列为产品缺陷。应用取消付款页也正确显示法语。
- 当前线上存储文案已是免费 50 Mo、Starter 250 Mo、Pro 500 Mo。公开搜索缓存曾显示旧容量；本报告以本次直连页面为准。
- 全站技术检查唯一告警是 `http://www` 到规范 HTTPS 主域名存在多跳，优先级低于上面的内容问题。

## 建议修复顺序与验收

1. 先重做法语价格页、同步一次性购买说明与条款，解决成交前后最容易误解的内容。
2. 统一修复英文示例、邮件/报错、法语金额格式和导航重叠；Stripe 语言偏好单独验证。
3. 调整核心功能页的法语搜索表达和用户任务说明，更新真实 lastmod，复跑既有技术检查。
4. 使用 Search Console 按“法国＋法语页面”查看近 28 天/90 天查询、展示、点击和落地页，再决定扩展哪些内容。单笔订单不能证明某个词的搜索量，也不能把订单逐人关联到 GSC 的聚合查询数据。

验收至少覆盖：新访问者从法语搜索落地页进入、选择订阅/单次购买、登录后语言保留、金额与有效期明确、取消付款返回法语、密码/客服邮件法语模板、1280 像素导航不重叠，以及 HTML/JSON-LD/站点地图相互一致。真实收银台及付费成功后的检查应使用安全测试环境或已有授权测试账户，不使用该客户账户。

本轮技术通过仅代表自动检查项通过；不代表法语内容已经完成专业复核、Google 全部收录，或转化率已达到目标。
