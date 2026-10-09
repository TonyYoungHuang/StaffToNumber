# ScoreTransposer 英语、西班牙语全栈文字与 SEO 审计

检查日期：2026-09-30（生产抓取与浏览器复核约 19:18–19:37，北京时间）。本次工作为审计，未修改产品代码、未部署，未发起真实支付或发送邮件。

结论：基础技术 SEO 自动检查通过，但英西内容仍有实质问题，尤其是定价、购买方式、积分扣除、激活期限和音视频转谱可用性。共整理 16 组已确认的整改事项：5 组 P1（购买与功能承诺），8 组 P2（漏译及使用说明），3 组 P3（细节、素材与后台）。另列 3 项低优先级观察。

## 覆盖与核实方式

| 范围 | 本次覆盖 |
|---|---|
| 公开页面 | 英语 33 页、西语 33 页，覆盖 sitemap 中这两种语言的全部 66 页；包含首页、10 类功能落地页、指南、曲库索引及每种语言 12 个曲目详情、支持及政策页 |
| 附加路由 | 两种语言各 5 个：audio-to-score、checkout、success、cancel、未知路径；合计抓取 76 个 URL，74 个 HTTP 200、2 个预期未知页面 HTTP 404，抓取异常 0 |
| 技术 SEO | 全站 sitemap 297 页，297 页完成；错误 0、警告 1；检查状态、robots、canonical、hreflang、sitemap、lastmod、标题/描述/H1、JSON-LD、社交元数据、链接及图片 |
| 翻译词条 | 32 个英西词条目录对象，共 6,740 个字符串（英语 3,391、西语 3,349）；另提取 16 个源文件中的 927 个内联英西文本。必需词条缺失 0、占位变量不一致 0；关键词数组长度差异不当作必需键缺失 |
| 全栈源码 | 523 个非测试源文件，覆盖 www/app、共享 UI/i18n、API、worker、存储/数据库及协作服务；检查 194 个语言分支、113 个 JSX 硬编码候选。这些是候选数量，不是缺陷数 |
| 浏览器 | 36 个英西页面/视口场景，覆盖登录、注册、密码流程、兑换、结账及回跳、未开放/未知路由、官网首页/定价/教学/播放；登录 390/1280/1920，首页/定价 390/1280。另做 8 项稳定状态复核 |
| 媒体与示例 | 114 个不同媒体/示例下载地址全部 HTTP 200；检查教学截图、音频演示封面及视频中间帧；22 个功能页（含未开放页面）示例区提取比对 |
| 后端消息 | 本地纯构造器验证英语/西语错误、货币、密码重置邮件、客服确认和系统事务文本；只使用合成邮箱及无效测试令牌，没有触发邮件发送 |

词条检查采用全量提取、完整性与占位符检查，并按购买、账户、乐谱、教学、支持等业务链路复核；不把自动扫描等同于每个字符串都通过母语人工逐字审校。没有使用真实客户账户访问私人项目，也没有进行真实支付、兑换、退款或版权投诉提交。需要登录的复杂交互主要以源码和消息构造器核实；本轮不声称完成全部付费功能端到端验收。

## 已确认问题

| 编号 | 优先级 | 语言/范围 | 问题 |
|---|---|---|---|
| F01 | P1 | 英语、西班牙语 | 独立定价页没有真正的套餐与价格比较 |
| F02 | P1 | 英语、西班牙语 | 付费条款与购买说明遗漏一次性购买 |
| F03 | P1 | 英语、西班牙语 | 积分扣除时点写成操作成功，与实际计数逻辑不一致 |
| F04 | P1 | 英语、西班牙语 | 首页和部分介绍仍把未开放的音视频转谱说成可用 |
| F05 | P1 | 英语、西班牙语 | 激活页固定承诺一年访问，与月度码等实际期限不符 |
| F06 | P2 | 西班牙语为主；英语错误提示也需改善 | 公共 API 和后台任务错误仍绕过本地化 |
| F07 | P2 | 西班牙语 | 重置密码、客服、版权及课堂通知的系统文本漏译 |
| F08 | P2 | 西班牙语 | 11 个功能页的示例输入/输出说明沿用英文 |
| F09 | P2 | 英语、西班牙语 | 教学等功能页套用转换器 FAQ，输入问答答非所问 |
| F10 | P2 | 英语 | 应用教学说明仍把评分和学生账户写成未来功能 |
| F11 | P2 | 英语、西班牙语 | 客户页面混入面向开发者的部署与配置说明 |
| F12 | P2 | 英语、西班牙语 | 支持材料说明没有区分激活码与安全的订单凭据 |
| F13 | P2 | 英语、西班牙语 | 版权查询码误写成一次性使用 |
| F14 | P3 | 西班牙语为主；单复数涉及两种语言 | 价格格式、单复数及部分英文残留未统一 |
| F15 | P3 | 英语、西班牙语 | 两种语言的教学截图含中文日期占位文字 |
| F16 | P3 | 西班牙语；内部管理界面 | 五类管理模块尚无完整西语文本 |

### F01 · P1 · 独立定价页没有真正的套餐与价格比较

**核实结果：**线上 /pricing 和 /es/pricing 仍使用通用功能介绍模板：有输入/输出下载、“转换后能否编辑”等问答，却没有 Free、Starter、Converter Pro 的价格、周期和购买类型比较。首页确实有价格，因此问题限定为独立定价页。

**影响：**搜索价格的用户到达页面后无法完成比较；页面标题与内容意图不一致。

**建议：**将英语和西班牙语接入实际定价组件，展示统一价格源、月度/年度、一次性购买/订阅、额度及续费规则；换成定价专属 FAQ 和相应结构化数据。

定位：[apps/www/src/app/[featureSlug]/page.tsx](<E:/AI WEB/21.wuxianpu/apps/www/src/app/[featureSlug]/page.tsx:142>)。

证据：[_pricing.html](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/_pricing.html>)、[_es_pricing.html](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/_es_pricing.html>)、[en-www-pricing-1280.png](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/en-www-pricing-1280.png>)、[es-www-pricing-1280.png](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/es-www-pricing-1280.png>)。

### F02 · P1 · 付费条款与购买说明遗漏一次性购买

**核实结果：**两种语言 /terms 把 Starter、Converter Pro 统一描述为月付/年付自动续费订阅；/about、/faq 也把付款后的权限统一称为 subscription / suscripción。实际首页有一次性购买入口，浏览器验证能携带 billing=one_time 到登录后的结账目标。隐私页还沿用 activation-based access 表述，不能清楚涵盖免费账户和付款自动开通。

**影响：**用户可能误以为一次性付款也会续费；跨页面规则相互矛盾。此次核实的是文案与产品逻辑的一致性。

**建议：**明确区分订阅和一次性限期访问：前者按选定周期续费，后者到期结束、不自动扣款；同步条款、关于、FAQ、结账和隐私页的权限说明。

定位：[apps/www/src/lib/support-legal-localization/locales/en.ts](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/support-legal-localization/locales/en.ts:197>)；[apps/www/src/lib/support-legal-localization/locales/es.ts](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/support-legal-localization/locales/es.ts:48>)；[apps/www/src/lib/static-marketing-localization/locales/en.ts](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/static-marketing-localization/locales/en.ts:67>)；[apps/www/src/lib/static-marketing-localization/locales/es.ts](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/static-marketing-localization/locales/es.ts:13>)。

证据：[_terms.html](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/_terms.html>)、[_es_terms.html](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/_es_terms.html>)、[browser-rechecks.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/browser-rechecks.json>)。

### F03 · P1 · 积分扣除时点写成操作成功，与实际计数逻辑不一致

**核实结果：**首页和应用计费词条使用 “Each eligible successful operation” / “Cada operación apta completada correctamente”。同页较下方却说任务创建成功即计数。服务端按 UTC 自然月统计 jobs 与 score_jobs 的创建记录，没有成功状态过滤；已经创建的排队或失败记录仍在统计中。

**影响：**用户可能把失败或仍在排队的任务理解为不占额度，导致账单和配额争议。

**建议：**统一为“符合计费条件的服务端任务创建后使用 1 个积分”，解释失败记录、重试、自然月重置、不结转及不消耗积分的同步操作；不要承诺只对成功结果扣费。

定位：[services/api/src/lib/plan-quotas.ts](<E:/AI WEB/21.wuxianpu/services/api/src/lib/plan-quotas.ts:62>)；[apps/www/src/lib/homepage-localization/locales/en.ts](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/homepage-localization/locales/en.ts:72>)；[apps/www/src/lib/homepage-localization/locales/es.ts](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/homepage-localization/locales/es.ts:44>)；[apps/app/src/lib/billing-messages/locales/en.ts](<E:/AI WEB/21.wuxianpu/apps/app/src/lib/billing-messages/locales/en.ts:127>)。

证据：[_.html](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/_.html>)、[_es.html](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/_es.html>)、[catalogs.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/catalogs.json>)。

### F04 · P1 · 首页和部分介绍仍把未开放的音视频转谱说成可用

**核实结果：**两种语言首页的步骤、音频输入能力、FAQ 和部分结构化描述仍介绍实验性音视频导入；英语 /score-to-audio 也写音频转谱可从另一路径使用。线上 /audio-to-score 已标注待生产验证且 noindex；应用 /scores/new/audio 显示“页面不存在”。其 HTML 流式响应 HTTP 200，不能写成 HTTP 404。

**影响：**功能介绍会把用户引向尚未开放的路径，搜索摘要也可能继承错误承诺。乐谱播放、乐谱导出音频是另一项已开放能力，不应一并下架。

**建议：**所有语言的首页、FAQ、JSON-LD、应用任务说明和相关功能页共用可用性开关；未开放时明确说明状态，移除导入操作入口，保留可用的音频输出介绍。

定位：[apps/www/src/lib/homepage-localization/index.ts](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/homepage-localization/index.ts:38>)；[apps/www/src/lib/platform-feature-pages.ts](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/platform-feature-pages.ts:232>)；[apps/app/src/app/scores/new/[source]/page.tsx](<E:/AI WEB/21.wuxianpu/apps/app/src/app/scores/new/[source]/page.tsx:18>)。

证据：[_.html](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/_.html>)、[_es.html](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/_es.html>)、[_audio-to-score.html](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/_audio-to-score.html>)、[_es_audio-to-score.html](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/_es_audio-to-score.html>)、[es-app-scores-new-audio-snapshot.txt](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/es-app-scores-new-audio-snapshot.txt>)、[final-checks.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/final-checks.json>)。

### F05 · P1 · 激活页固定承诺一年访问，与月度码等实际期限不符

**核实结果：**激活页介绍和标题分别写 “one year of access” 与 “un año de acceso”。实际激活逻辑按套餐计算 1 或 12 个日历月，旧码还存在按 entitlement_days 处理的分支。

**影响：**购买月度码的人可能被页面误导为获得一年。

**建议：**兑换前写“激活对应套餐及有效期”，兑换成功后展示服务端返回的套餐与起止日期；不要把所有代码期限硬编码成一年。

定位：[apps/app/src/lib/billing-messages/locales/en.ts](<E:/AI WEB/21.wuxianpu/apps/app/src/lib/billing-messages/locales/en.ts:8>)；[apps/app/src/lib/billing-messages/locales/es.ts](<E:/AI WEB/21.wuxianpu/apps/app/src/lib/billing-messages/locales/es.ts:6>)；[services/api/src/repositories/auth-repository.ts](<E:/AI WEB/21.wuxianpu/services/api/src/repositories/auth-repository.ts:313>)。

证据：[catalogs.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/catalogs.json>)、[es-app-activate-snapshot.txt](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/es-app-activate-snapshot.txt>)。

### F06 · P2 · 公共 API 和后台任务错误仍绕过本地化

**核实结果：**localizeApiError 只为法语、德语、俄语做映射，西语直接返回后端英文。纯函数探针确认无效登录、额度耗尽为英文，网络错误和 503 都只有 “Request failed.”。乐谱详情的下载、教学操作、失败任务和诊断也有只处理德俄、其余原样展示的分支。

**影响：**表面界面是西语，一旦失败就切回英文；英文提示也缺少明确恢复办法，有些任务还会暴露内部诊断。

**建议：**建立覆盖西语和英语的错误码、状态码及旧消息映射；用户提示给出可执行下一步，内部原始错误留给日志或技术详情。

定位：[packages/i18n/src/api-errors.ts](<E:/AI WEB/21.wuxianpu/packages/i18n/src/api-errors.ts:60>)；[apps/app/src/components/ScoreDetailClient.tsx](<E:/AI WEB/21.wuxianpu/apps/app/src/components/ScoreDetailClient.tsx:741>)；[apps/app/src/components/ScoreDetailClient.tsx](<E:/AI WEB/21.wuxianpu/apps/app/src/components/ScoreDetailClient.tsx:3053>)；[apps/app/src/components/ScoreDetailClient.tsx](<E:/AI WEB/21.wuxianpu/apps/app/src/components/ScoreDetailClient.tsx:4248>)。

证据：[runtime-probes.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/runtime-probes.json>)、[fallback-source-hits.txt](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/fallback-source-hits.txt>)。

### F07 · P2 · 重置密码、客服、版权及课堂通知的系统文本漏译

**核实结果：**本地构造邮件确认西语密码重置、客服收件确认仍生成英文；客服类别也回退英文。transactional.ts 没有 es 词条，版权投诉确认、初始公开状态、课堂邮件页脚/设置说明因此回退英文。链接可以保留西语，正文仍未本地化。

**影响：**用户从西语页面发起操作后收到英文邮件，版权状态页也会出现系统英文。教师自行输入的通知正文应保留原文，不应擅自机器翻译。

**建议：**补齐 es 系统邮件模板、客服类别、版权初始事件和课堂通知固定文本；使用合成数据验证主题、正文、链接语言和时间格式。

定位：[services/api/src/lib/email.ts](<E:/AI WEB/21.wuxianpu/services/api/src/lib/email.ts:90>)；[services/api/src/routes/support.ts](<E:/AI WEB/21.wuxianpu/services/api/src/routes/support.ts:95>)；[packages/i18n/src/transactional.ts](<E:/AI WEB/21.wuxianpu/packages/i18n/src/transactional.ts:11>)；[services/api/src/repositories/copyright-complaint-repository.ts](<E:/AI WEB/21.wuxianpu/services/api/src/repositories/copyright-complaint-repository.ts:162>)；[services/worker/src/notification-delivery.ts](<E:/AI WEB/21.wuxianpu/services/worker/src/notification-delivery.ts:115>)。

证据：[runtime-probes.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/runtime-probes.json>)。

### F08 · P2 · 11 个功能页的示例输入/输出说明沿用英文

**核实结果：**10 个可索引功能页加暂未开放的 audio-to-score，共 11 页，示例输入/输出说明没有西语覆盖。生产页面可见如 “Permitted mono WAV or MP3 melody recording” 等英文自然语言；示例模块的标题已经翻译。

**影响：**西语落地页在最能解释产品用途的示例区发生语言断层。

**建议：**为所有示例补齐西语标题、输入/输出和说明，并核对示例与真实功能对应。MusicXML、MIDI、JSON、音符输入语法等技术标识保留。

定位：[apps/www/src/lib/feature-localization/index.ts](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/feature-localization/index.ts:80>)。

证据：[feature-examples.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/feature-examples.json>)、[visible-text.txt](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/visible-text.txt>)。

### F09 · P2 · 教学等功能页套用转换器 FAQ，输入问答答非所问

**核实结果：**页面用统一 faqInput(page.title) 配 page.workflow[0].body。结果教学页询问“接受什么输入/转换后是否可编辑”，定价页也出现相同问题；PDF 等工具的输入问题常只回答上传后的排队行为，未回答支持的文件格式。

**影响：**FAQ 缺乏实际帮助；同样的内容被写入 FAQPage。本次比对发现可见问答与 JSON-LD 一致，因此不是隐藏 schema 和正文不一致，而是两者同时内容不合适。

**建议：**按转换、编辑、教学、购买场景维护真实问答；明确支持格式、限制、输出、审核要求，复用同一份问答给正文与结构化数据。

定位：[apps/www/src/app/[featureSlug]/page.tsx](<E:/AI WEB/21.wuxianpu/apps/www/src/app/[featureSlug]/page.tsx:161>)。

证据：[schema-content-comparison.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/schema-content-comparison.json>)、[_teaching.html](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/_teaching.html>)、[_es_teaching.html](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/_es_teaching.html>)、[_pricing.html](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/_pricing.html>)、[_es_pricing.html](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/_es_pricing.html>)。

### F10 · P2 · 应用教学说明仍把评分和学生账户写成未来功能

**核实结果：**英文 assignment.body 写 “grading and student accounts can build on this later”；当前已有评分、量表、学生入口等代码与公开介绍，西语对应文案已描述当前功能。英文教学截图也保留这段旧说明。

**影响：**现有功能被低估，官网、应用和截图描述不一致。

**建议：**按现有角色、作业、匿名提交、评分及学生账户能力重写英文说明，并同步重录教学截图。

定位：[apps/app/src/lib/score-detail-messages/locales/en.ts](<E:/AI WEB/21.wuxianpu/apps/app/src/lib/score-detail-messages/locales/en.ts:213>)；[apps/app/src/app/student/page.tsx](<E:/AI WEB/21.wuxianpu/apps/app/src/app/student/page.tsx:1>)。

证据：[catalogs.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/catalogs.json>)、[final-checks.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/final-checks.json>)。

### F11 · P2 · 客户页面混入面向开发者的部署与配置说明

**核实结果：**浏览器复现忘记密码页提示用户到 API preview logs 找链接。首页/定价页要求 Price ID 配置，MP3 失败词条要求检查 FluidSynth、SoundFont、ffmpeg。普通客户无法执行这些操作。

**影响：**失败恢复指引无效，容易被理解为产品仍是开发预览。

**建议：**客户侧说明实际状态、可尝试动作和联系客服方式；配置项与服务端诊断保留在运维/开发界面。并非所有技术名词都应删除，文件格式和能帮助用户选择的参数仍可保留。

定位：[apps/app/src/lib/auth-messages.ts](<E:/AI WEB/21.wuxianpu/apps/app/src/lib/auth-messages.ts:187>)；[apps/www/src/lib/homepage-localization/locales/en.ts](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/homepage-localization/locales/en.ts:89>)；[apps/www/src/lib/homepage-localization/locales/es.ts](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/homepage-localization/locales/es.ts:53>)；[apps/app/src/lib/score-detail-messages/locales/en.ts](<E:/AI WEB/21.wuxianpu/apps/app/src/lib/score-detail-messages/locales/en.ts:143>)；[apps/app/src/lib/score-detail-messages/locales/es.ts](<E:/AI WEB/21.wuxianpu/apps/app/src/lib/score-detail-messages/locales/es.ts:19>)。

证据：[browser-rechecks.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/browser-rechecks.json>)、[catalogs.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/catalogs.json>)。

### F12 · P2 · 支持材料说明没有区分激活码与安全的订单凭据

**核实结果：**英语关于页/支持页要求提供 activation code；西语对应内容笼统写 código。现有店铺登录流程中，启用后持有激活码可以访问对应账户的乐谱，不能把它等同于普通订单编号。

**影响：**现有指引可能促使用户在工单或截图里提交完整登录凭据；此为文案风险，没有发现或声称已发生泄露。

**建议：**默认索取订单号、购买时间和脱敏截图；明确不要提供密码、完整激活登录码及版权查询码。必要的码核验使用末几位或内部关联记录。

定位：[apps/www/src/lib/static-marketing-localization/locales/en.ts](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/static-marketing-localization/locales/en.ts:48>)；[apps/www/src/lib/static-marketing-localization/locales/es.ts](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/static-marketing-localization/locales/es.ts:12>)；[apps/www/src/lib/support-legal-localization/locales/en.ts](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/support-legal-localization/locales/en.ts:75>)；[apps/app/src/components/ShopActivation.tsx](<E:/AI WEB/21.wuxianpu/apps/app/src/components/ShopActivation.tsx:112>)。

证据：[_about.html](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/_about.html>)、[_es_about.html](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/_es_about.html>)、[_support.html](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/_support.html>)、[_es_support.html](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/_es_support.html>)。

### F13 · P2 · 版权查询码误写成一次性使用

**核实结果：**英语投诉表单写 “one-time access code”，西语明确写 “código de acceso de un solo uso”。实际上查询函数只校验代码哈希，不在查询后失效；页面另处解释的是只展示一次。

**影响：**用户可能误以为只能查询一次，和后续跟踪状态功能冲突。

**建议：**改为“私人查询码，仅在创建时显示一次，可用于后续查询”；不要混淆一次展示与一次使用。

定位：[apps/www/src/lib/support-legal-localization/locales/en.ts](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/support-legal-localization/locales/en.ts:125>)；[apps/www/src/lib/support-legal-localization/locales/es.ts](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/support-legal-localization/locales/es.ts:24>)；[services/api/src/repositories/copyright-complaint-repository.ts](<E:/AI WEB/21.wuxianpu/services/api/src/repositories/copyright-complaint-repository.ts:180>)。

证据：[_copyright-complaint.html](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/_copyright-complaint.html>)、[_es_copyright-complaint.html](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/_es_copyright-complaint.html>)。

### F14 · P3 · 价格格式、单复数及部分英文残留未统一

**核实结果：**西语价格仍混用 $7.99 和 0,16 $；localizeUsdText 没有 es 分支。浏览器在 library?q=Tallis 实际显示 “1 results” / “1 resultados”；移调词条同样固定为 semitones / semitonos。西语还有 “checkout, activation y support”、Billing、draft、Classroom / School Beta 等界面文本残留。

**影响：**降低语言质量和金额辨识度，主要属于本地化细节，不代表支付金额计算错误。

**建议：**用 es 对应的 Intl 数字/货币格式，并明确 USD；用复数规则处理 1、0、复数和负半音；统一普通界面用语。transportar 与 transponer 都是可用音乐术语，不把任一词简单判为错译。

定位：[packages/i18n/src/formatters.ts](<E:/AI WEB/21.wuxianpu/packages/i18n/src/formatters.ts:43>)；[apps/www/src/lib/library-localization/locales/en.ts](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/library-localization/locales/en.ts:24>)；[apps/www/src/lib/library-localization/locales/es.ts](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/library-localization/locales/es.ts:24>)；[apps/app/src/components/ScoreDetailClient.tsx](<E:/AI WEB/21.wuxianpu/apps/app/src/components/ScoreDetailClient.tsx:2545>)；[apps/www/src/lib/static-marketing-localization/locales/es.ts](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/static-marketing-localization/locales/es.ts:28>)；[apps/www/src/lib/feature-localization/locales/es.ts](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/feature-localization/locales/es.ts:71>)。

证据：[runtime-probes.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/runtime-probes.json>)、[browser-rechecks.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/browser-rechecks.json>)、[catalogs.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/catalogs.json>)。

### F15 · P3 · 两种语言的教学截图含中文日期占位文字

**核实结果：**feature-teaching-real.png 内截止日期输入框均显示 年/月/日。已比较线上图片与本地文件 SHA-256，两种语言均完全一致，因此确认是生产素材本身的问题。

**影响：**英语/西语访客看到混合语言截图；英文截图另有 F10 的过期教学说明。

**建议：**先修正文案，再用目标语言浏览器重新截取真实界面；校验图片、封面、示例说明和媒体来源标记。

定位：[apps/www/public/product/localized/en/feature-teaching-real.png](<E:/AI WEB/21.wuxianpu/apps/www/public/product/localized/en/feature-teaching-real.png>)；[apps/www/public/product/localized/es/feature-teaching-real.png](<E:/AI WEB/21.wuxianpu/apps/www/public/product/localized/es/feature-teaching-real.png>)。

证据：[final-checks.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/final-checks.json>)。

### F16 · P3 · 五类管理模块尚无完整西语文本

**核实结果：**codes、copyright、security、seo、support 管理页及组件大量使用中文/英文二选一，西语选择会回退英文；部分激活码销售渠道选项仍固定中文。

**影响：**属于“全栈所有文字”的覆盖缺口。这些为受保护的内部管理路径，不应与面向客户的搜索落地页问题混为一谈。

**建议：**如承诺后台跟随站点语言，则迁移到统一词条；若后台只服务中文运营人员，应明确后台语言范围。大陆专用 ShopActivation 的中文业务入口单独管理，不据此判定西语前台全部漏译。

定位：[apps/app/src/components/AdminActivationCodesManager.tsx](<E:/AI WEB/21.wuxianpu/apps/app/src/components/AdminActivationCodesManager.tsx:47>)；[apps/app/src/app/admin/codes/page.tsx](<E:/AI WEB/21.wuxianpu/apps/app/src/app/admin/codes/page.tsx:1>)；[apps/app/src/app/admin/copyright/page.tsx](<E:/AI WEB/21.wuxianpu/apps/app/src/app/admin/copyright/page.tsx:1>)；[apps/app/src/app/admin/security/page.tsx](<E:/AI WEB/21.wuxianpu/apps/app/src/app/admin/security/page.tsx:1>)；[apps/app/src/app/admin/seo/page.tsx](<E:/AI WEB/21.wuxianpu/apps/app/src/app/admin/seo/page.tsx:1>)；[apps/app/src/app/admin/support/page.tsx](<E:/AI WEB/21.wuxianpu/apps/app/src/app/admin/support/page.tsx:1>)。

证据：[source-inventory.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/source-inventory.json>)、[fallback-source-hits.txt](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/fallback-source-hits.txt>)。

## SEO 与无障碍的补充观察

1. **8 个英语功能页的 keywords 混有中文。** 涉及 jianpu-to-staff、pdf-score-scanner、pricing、score-editor、score-to-audio、staff-to-jianpu、teaching、transpose-score；同一词表也用于部分 JSON-LD。属于语言维护一致性问题，建议清理，不应夸大为排名处罚原因。Google 明确不使用 meta keywords 影响索引或排名：[官方说明](https://developers.google.com/search/docs/crawling-indexing/special-tags)。
2. **HTTP www 域名规范化有多跳。** 自动检查唯一警告：`http://www.scoretransposer.com/` 最终能到 HTTPS 主域，但超过一次跳转。可在后续路由维护时合并为直接永久重定向。
3. **Google 登录按钮的 iframe 无障碍标题跟随浏览器语言。** 在 zh-CN 浏览器里，英西页面的按钮文字分别正确显示 “Continue with Google” 和 “Continuar con Google”，但 iframe title 是中文。它是第三方组件外层标签的语言行为；列为无障碍改进观察，不判定可见登录按钮翻译失败，也没有发现 Google 登录无法使用。

生产证据：[final-checks.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/final-checks.json>)、[technical-audit.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/technical-audit.json>)、[browser-rechecks.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/browser-rechecks.json>)。

## 已通过的项目与判断边界

- 英西 sitemap 页面全部正常获取；语言、canonical、hreflang/回链及社交元数据未出现自动检查错误。英语规范地址为根路径，西语为 `/es`。跨语言版本的参考标准见 [Google 官方多语言页面指南](https://developers.google.com/search/docs/specialty/international/localized-versions)。
- 两种语言首页的一次性购买按钮经真实浏览器点击，均保留目标语言、Starter 月度套餐和 `billing=one_time`，进入带正确 `next` 的登录页；未启动付款。
- 应用与交易回跳页有 noindex 控制；未开放的音频转谱介绍页也有 noindex。查询过滤页的 canonical 归并到曲库索引，不把这种归并单独报成错误。
- 114 个媒体及示例 URL 均可访问，36 个浏览器场景未检测到横向溢出或 video.error。并非每个页面都测试了所有视口；媒体可访问不代表图片内所有文字已正确，F15 另列。
- 必需翻译键和占位符检查通过。音乐术语、产品名、文件格式、示例语法及用户自行输入文本，没有因“与英文相同”一概判为漏译。
- FAQ 正文与结构化数据比对未发现不一致；语义和页面用途仍存在 F01/F09。结构化数据能解析不代表一定获得搜索富结果。
- 本轮没有接入 Search Console 查询词、点击率或实际索引报告，因此不把站内技术通过解释为已收录、流量增长或排名保证；也不据一笔订单判断具体搜索词归因。
- 技术工具结果 `automatedGatePassed=true`，同时 `manualReviewRequired=true`、`publishReady=false`；这些状态如实保留，内容问题尚未整改。

## 每个公开页面的核查台账

下表每行包含英语和西班牙语两个生产 URL；共 33 行、66 页。所有行都已抓取正文、标题、描述、H1、canonical、hreflang 和结构化数据；详细字段见 [page-ledger.csv](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/page-ledger.csv>)。没有新增专属问题的页面仍受全局导航、价格用语或消息流程等共享问题影响，不能据此推断全部功能已经实测无误。

| 页面 | 英语 | 西班牙语 | 本次主要定位 |
|---|---|---|---|
| `/` | [查看](https://scoretransposer.com/) | [查看](https://scoretransposer.com/es) | F03、F04、F11、F14 |
| `/about` | [查看](https://scoretransposer.com/about) | [查看](https://scoretransposer.com/es/about) | F02、F12 |
| `/faq` | [查看](https://scoretransposer.com/faq) | [查看](https://scoretransposer.com/es/faq) | F02、F14 |
| `/how-to-read-sheet-music` | [查看](https://scoretransposer.com/how-to-read-sheet-music) | [查看](https://scoretransposer.com/es/how-to-read-sheet-music) | 已核查；未新增页面专属问题 |
| `/numbered-notation-converter` | [查看](https://scoretransposer.com/numbered-notation-converter) | [查看](https://scoretransposer.com/es/numbered-notation-converter) | 已核查；未新增页面专属问题 |
| `/features` | [查看](https://scoretransposer.com/features) | [查看](https://scoretransposer.com/es/features) | 已核查；未新增页面专属问题 |
| `/library` | [查看](https://scoretransposer.com/library) | [查看](https://scoretransposer.com/es/library) | F14 |
| `/support` | [查看](https://scoretransposer.com/support) | [查看](https://scoretransposer.com/es/support) | F06、F07、F11、F12、F14 |
| `/privacy` | [查看](https://scoretransposer.com/privacy) | [查看](https://scoretransposer.com/es/privacy) | F02 |
| `/terms` | [查看](https://scoretransposer.com/terms) | [查看](https://scoretransposer.com/es/terms) | F02、F14 |
| `/copyright-complaint` | [查看](https://scoretransposer.com/copyright-complaint) | [查看](https://scoretransposer.com/es/copyright-complaint) | F06、F07、F13 |
| `/staff-to-jianpu` | [查看](https://scoretransposer.com/staff-to-jianpu) | [查看](https://scoretransposer.com/es/staff-to-jianpu) | F08、F09 |
| `/jianpu-to-staff` | [查看](https://scoretransposer.com/jianpu-to-staff) | [查看](https://scoretransposer.com/es/jianpu-to-staff) | F08、F09 |
| `/transpose-score` | [查看](https://scoretransposer.com/transpose-score) | [查看](https://scoretransposer.com/es/transpose-score) | F08、F09 |
| `/score-editor` | [查看](https://scoretransposer.com/score-editor) | [查看](https://scoretransposer.com/es/score-editor) | F08、F09 |
| `/score-to-audio` | [查看](https://scoretransposer.com/score-to-audio) | [查看](https://scoretransposer.com/es/score-to-audio) | F04、F08、F09、F11 |
| `/musicxml-midi` | [查看](https://scoretransposer.com/musicxml-midi) | [查看](https://scoretransposer.com/es/musicxml-midi) | F08、F09 |
| `/pdf-score-scanner` | [查看](https://scoretransposer.com/pdf-score-scanner) | [查看](https://scoretransposer.com/es/pdf-score-scanner) | F08、F09 |
| `/pdf-to-musicxml` | [查看](https://scoretransposer.com/pdf-to-musicxml) | [查看](https://scoretransposer.com/es/pdf-to-musicxml) | F08、F09 |
| `/teaching` | [查看](https://scoretransposer.com/teaching) | [查看](https://scoretransposer.com/es/teaching) | F08、F09、F10、F14、F15 |
| `/pricing` | [查看](https://scoretransposer.com/pricing) | [查看](https://scoretransposer.com/es/pricing) | F01、F02、F08、F09、F11 |
| `/library/product-workflow-etude` | [查看](https://scoretransposer.com/library/product-workflow-etude) | [查看](https://scoretransposer.com/es/library/product-workflow-etude) | 已核查；未新增页面专属问题 |
| `/library/bach-prelude-c-major-bwv-846` | [查看](https://scoretransposer.com/library/bach-prelude-c-major-bwv-846) | [查看](https://scoretransposer.com/es/library/bach-prelude-c-major-bwv-846) | 已核查；未新增页面专属问题 |
| `/library/bach-air-bwv-1068` | [查看](https://scoretransposer.com/library/bach-air-bwv-1068) | [查看](https://scoretransposer.com/es/library/bach-air-bwv-1068) | 已核查；未新增页面专属问题 |
| `/library/beethoven-ode-to-joy-theme` | [查看](https://scoretransposer.com/library/beethoven-ode-to-joy-theme) | [查看](https://scoretransposer.com/es/library/beethoven-ode-to-joy-theme) | 已核查；未新增页面专属问题 |
| `/library/beethoven-symphony-5-op-67` | [查看](https://scoretransposer.com/library/beethoven-symphony-5-op-67) | [查看](https://scoretransposer.com/es/library/beethoven-symphony-5-op-67) | 已核查；未新增页面专属问题 |
| `/library/mozart-eine-kleine-nachtmusik-k-525` | [查看](https://scoretransposer.com/library/mozart-eine-kleine-nachtmusik-k-525) | [查看](https://scoretransposer.com/es/library/mozart-eine-kleine-nachtmusik-k-525) | 已核查；未新增页面专属问题 |
| `/library/pachelbel-canon-d-major` | [查看](https://scoretransposer.com/library/pachelbel-canon-d-major) | [查看](https://scoretransposer.com/es/library/pachelbel-canon-d-major) | 已核查；未新增页面专属问题 |
| `/library/vivaldi-spring-rv-269` | [查看](https://scoretransposer.com/library/vivaldi-spring-rv-269) | [查看](https://scoretransposer.com/es/library/vivaldi-spring-rv-269) | 已核查；未新增页面专属问题 |
| `/library/handel-hallelujah-chorus` | [查看](https://scoretransposer.com/library/handel-hallelujah-chorus) | [查看](https://scoretransposer.com/es/library/handel-hallelujah-chorus) | 已核查；未新增页面专属问题 |
| `/library/schubert-ave-maria-d-839` | [查看](https://scoretransposer.com/library/schubert-ave-maria-d-839) | [查看](https://scoretransposer.com/es/library/schubert-ave-maria-d-839) | 已核查；未新增页面专属问题 |
| `/library/brahms-lullaby-op-49-4` | [查看](https://scoretransposer.com/library/brahms-lullaby-op-49-4) | [查看](https://scoretransposer.com/es/library/brahms-lullaby-op-49-4) | 已核查；未新增页面专属问题 |
| `/library/tallis-if-ye-love-me` | [查看](https://scoretransposer.com/library/tallis-if-ye-love-me) | [查看](https://scoretransposer.com/es/library/tallis-if-ye-love-me) | 已核查；未新增页面专属问题 |

应用路由范围补充：login/register/forgot-password/reset-password、activate/billing、checkout/success/cancel、dashboard/jobs/upload、scores 列表/新建/各来源/详情/分享、classrooms/student、admin 五类页面、语言/API 中转及未知路由。固定应用文案来自全部相关英西词条和源码；动态个人项目、实际订单、课堂与投诉记录未使用客户数据逐条进入。

## 整改顺序与后续验收标准

1. 先处理 F01–F05，统一真实定价、购买方式、配额计数、功能开关和权益期限。沿用现有计费逻辑，以准确说明现状为先，不在翻译任务中擅改价格或扣费政策。
2. 处理 F06–F13，让西语错误、邮件、示例和支持流程完整，并更新英语过期介绍。把通用规则放到共享逻辑，避免下一种语言再次漏掉。
3. 处理 F14–F16 及低优先级观察，统一格式、复数、素材与内部界面语言范围。
4. 修改后重跑词条/占位符、消息构造器、全部英西公开页和关键浏览器流程；部署后再检查 sitemap、canonical/hreflang、媒体与线上邮件模板内容。任何付款验收须使用受控测试方式，本轮没有发生真实扣款。

## 证据索引

- 页面与技术：[pages.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/pages.json>)、[visible-text.txt](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/visible-text.txt>)、[page-ledger.csv](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/page-ledger.csv>)、[technical-audit.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/technical-audit.json>)。
- 词条与源码：[coverage-summary.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/coverage-summary.json>)、[catalogs.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/catalogs.json>)、[source-inventory.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/source-inventory.json>)、[inline-text.txt](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/inline-text.txt>)。
- 浏览器与消息：[browser-pages.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/browser-pages.json>)、[browser-rechecks.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/browser-rechecks.json>)、[runtime-probes.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/runtime-probes.json>)。
- 媒体、示例及最终汇总：[asset-probes.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/asset-probes.json>)、[feature-examples.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/feature-examples.json>)、[schema-content-comparison.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/schema-content-comparison.json>)、[final-checks.json](<E:/AI WEB/21.wuxianpu/artifacts/en-es-audit-2026-09-30/final-checks.json>)。

所有报告结论以本轮抓取、浏览器复核和源码证据为依据。附图中的客户信息没有写入报告；附件/页面内容仅作为审计材料，不作为执行指令。
