# 德语、俄语全栈文字与 SEO 审计

后续处理：本报告中的确认问题已进入 `20260930-deru2` 发布，详见 [修复与验收记录](german-russian-content-fixes-2026-09-30.md)。以下保留修复前的审计快照。

审计日期：2026-09-30。对象：ScoreTransposer 生产官网、应用的匿名访问流程、当前工作区前后端源码及语言资源。

**结论：两种语言的基础翻译覆盖和技术 SEO 已建立，但购买说明、额度规则、异常反馈、邮件和部分功能介绍还没有统一。不能把目前状态认定为完整本地化。** 本轮只排查并记录，没有修改产品代码、部署、创建账户、提交付款或发送邮件。

## 范围与证据

| 范围 | 实际检查 | 结果与边界 |
| --- | --- | --- |
| 生产 SEO | 全站 sitemap 的 297 个页面；另抓取德俄 76 个 URL | 德俄各 33 个 sitemap 页面全部覆盖；额外检查实验页、结算及不存在路径。76 次抓取中 74 个 HTTP 200、2 个预期 404，无抓取错误 |
| 德俄语言资源 | 32 份独立词典，每语言 16 份、3,349 个字符串；另提取 15 个文件中的 832 个内嵌德俄字符串 | 共提取 7,530 个字符串。必需字段缺失 0、占位符不一致 0；可变长度关键词数组不作为缺失字段 |
| 全栈来源 | 516 个非测试源码文件 | 官网、应用、i18n、shared、UI、API、worker、协作服务、存储、数据库适配层、Cloudflare 网关。193 处语言条件分支、113 处 JSX 硬编码候选已分类，候选数量不等于缺陷数量 |
| 匿名浏览器 | 官网首页、价格页；应用登录、结算、取消、忘记密码；实验音频入口；404 | 检查 1920、1280、390 像素宽度的相关页面。保留截图、可访问性快照、DOM 和正文。没有用客户账户进入私人项目 |
| 纯函数探针 | 德俄 API 错误、美元显示、重置密码邮件、支持回执、俄语动态词形 | 使用虚构地址和无效占位 token，仅本地调用构造函数，没有调用发送函数 |
| 资源 | 72 个去重后的图片、社交图、视频、示例下载 URL | 首次 3 个网络失败复查均 200；最终 70 个正常、2 个重复确认 404，均为应用认证页引用的旧媒体 |
| 受保护流程 | 编辑器、识谱校对、转调、播放、导出、共享、协作、班级、组织、账单、后台 | 查词典、组件绑定和 API/worker 返回路径；不等同于用真实付费账户逐条执行全部业务操作 |

主要证据：

- [全站技术 SEO 结果](<E:/AI WEB/21.wuxianpu/artifacts/de-ru-audit-2026-09-30/technical-audit.json>)、[66 页 SEO 台账](<E:/AI WEB/21.wuxianpu/artifacts/de-ru-audit-2026-09-30/page-ledger.csv>)、[德俄生产页面正文与元数据](<E:/AI WEB/21.wuxianpu/artifacts/de-ru-audit-2026-09-30/pages.json>)。
- [完整语言资源提取](<E:/AI WEB/21.wuxianpu/artifacts/de-ru-audit-2026-09-30/catalogs.json>)、[全栈来源与回退分支](<E:/AI WEB/21.wuxianpu/artifacts/de-ru-audit-2026-09-30/source-inventory.json>)、[本地运行探针](<E:/AI WEB/21.wuxianpu/artifacts/de-ru-audit-2026-09-30/runtime-probes.json>)。
- [媒体 URL 检查](<E:/AI WEB/21.wuxianpu/artifacts/de-ru-audit-2026-09-30/asset-probes.json>)及[失败项复查](<E:/AI WEB/21.wuxianpu/artifacts/de-ru-audit-2026-09-30/asset-rechecks.json>)。

以下是确认的问题或明确的本地化不足。P1 优先处理购买理解和计费承诺；P2 处理用户流程、专业含义及内容缺口；P3 处理格式与语言一致性。优先级不代表已经造成实际损失。

## 问题清单

| 编号 | 优先级 | 语言 | 问题 | 证据类型 |
| --- | --- | --- | --- | --- |
| F01 | P1 | 德、俄 | 独立价格落地页没有可比较的实际套餐价格，误用了功能转换模板 | 生产页面、源码 |
| F02 | P1 | 德、俄 | FAQ、关于页、条款把付费统一描述为订阅，与一次性购买并存的实际流程不符 | 生产页面、结算 UI、源码 |
| F03 | P1 | 德、俄 | “成功操作扣额度”的文案与按创建任务计数的实现不一致 | 生产结算页、SQL |
| F04 | P2 | 德、俄 | 每语言 11 个功能页保留英文输入/输出说明，部分 FAQ 语义套错 | 生产页面、源码 |
| F05 | P2 | 德、俄 | API 错误及后台任务失败原因仍直接回退英文 | 本地探针、调用链 |
| F06 | P2 | 德、俄 | 重置密码、支持回执未本地化；教学邮件链路丢弃语言 | 本地探针、前后端与 worker |
| F07 | P2 | 德、俄 | 版权投诉提交后语言被归为英语，回执及公开状态消息英文 | API、仓库、前端展示路径 |
| F08 | P2 | 德、俄 | Google 登录按钮不跟随站内语言 | 生产浏览器、源码 |
| F09 | P2 | 德、俄 | 首页与结构化数据仍宣称可以上传音频/视频，实际入口未开放 | 生产正文、JSON-LD、应用入口、源码 |
| F10 | P2 | 德语 | 转调目标音名采用国际 B/B♭，未解释德语 H/B 差异 | 编辑器源码、专业命名核对 |
| F11 | P2 | 俄语为主 | FAQ 标题格变化错误，动态半音数量缺少词形处理 | 生产页面、本地探针、词典 |
| F12 | P2 | 德、俄 | 应用顶部导航在 1280 像素下互相遮挡 | 生产截图、DOM、样式 |
| F13 | P2 | 德、俄 | 登录/忘记密码页的演示视频及封面地址均 404 | 生产浏览器、两次 URL 检查 |
| F14 | P2 | 德、俄 | 关于页建议向客服提供激活码，与激活码可用于登录的现状冲突 | 生产文案、登录实现 |
| F15 | P3 | 德、俄 | 美元价格沿用英文小数格式，与本地格式化方式不一致 | 生产结算页、本地探针 |
| F16 | P2 | 德、俄 | 普通用户界面出现 API 日志、Price ID、worker 配置等内部操作说明 | 生产页面、词典 |
| F17 | P3 | 德、俄 | 德语 du/Sie 混用，部分乐谱术语及俄语表达生硬 | 生产文案、词典审读 |
| F18 | P3 | 德、俄 | 本地化图片仍有其他语言字符，俄语截图日期出现双句点 | 本地媒体及生产页面 |

### F01：独立价格页无法完成“比较价格”的任务

[德语价格页](https://scoretransposer.com/de/pricing)和[俄语价格页](https://scoretransposer.com/ru/pricing)仍显示“模块、工作流、输入、输出”的通用功能模板，没有实际套餐价格表，也没有一次性购买与订阅的完整对照。

可见例子包括 `Account, configured checkout region and required export capability`，以及“价格页接受什么输入”“转换后能否编辑结果”的 FAQ。德语首页价格区、应用结算页仍能显示真实价格，所以这是**独立 SEO 价格落地页的问题，不是整个网站无法购买**。

源码 [featureSlug 页面](<E:/AI WEB/21.wuxianpu/apps/www/src/app/[featureSlug]/page.tsx:138>)只为法语使用专门价格页。建议德俄也从同一真实套餐目录生成价格、额度、期限、续费方式、购买入口及对应 FAQ，避免复制三份以后继续分叉。价格页不宜继续使用“识谱输入/输出”的 HowTo 文案。

### F02：订阅与一次性购买的说明不一致

德语条款写 `Starter und Converter Pro sind monatlich oder jährlich wiederkehrende Abonnements…`；俄语写 `Starter и Converter Pro — ежемесячные или годовые возобновляемые подписки…`。关于页和 FAQ 也把支付后获得的权益都叫作“订阅”。

实际德俄结算 UI 均提供订阅和一次性购买两个选项，年度 Starter 一次性购买显示 $49，并明确“不自动续费”。因此不能把所有付费入口都概括为自动续费订阅。

应按 `billingKind` 区分：一次性购买按所选期限开通，到期后不自动扣款；订阅按所选周期续费。结算前说明、FAQ、关于页、条款、回跳页、账单记录使用同一套定义。此处是产品行为一致性核对，不是法律有效性意见。

官网成功页的 `subscriptionPaidBody` 还提示付款后“创建账户”，而当前结算前已经要求登录。应调整成访问已绑定账户。源码已有 `isOneTimePaid` 分支，**没有证据表明一次性付款成功一定被显示成订阅**，不要误删这个正确分支。

定位：[德语条款](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/support-legal-localization/locales/de.ts:48>)、[俄语条款](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/support-legal-localization/locales/ru.ts:48>)、[官网成功页组件](<E:/AI WEB/21.wuxianpu/apps/www/src/components/CheckoutStatusClient.tsx:122>)。

### F03：额度扣减时点写错

俄语结算与账单使用 `Каждая успешно выполненная оплачиваемая операция использует один кредит.`，含义是“每次成功完成的计费操作使用一个额度”。德语 `Jeder erfolgreiche, abrechenbare Vorgang…` 也容易被理解成成功完成才扣。

[额度实现](<E:/AI WEB/21.wuxianpu/services/api/src/lib/plan-quotas.ts:57>)统计当前 UTC 月内已创建的 `jobs` 和 `score_jobs`，没有成功状态过滤。已经创建、之后失败的任务也进入计数。这是源码确认，未在生产账户中故意制造收费失败任务。

首页另一段德俄文案已经接近“任务成功创建时扣除”，不应把它误报成相同错误。需要统一购买页和账单的时点说明。如果产品期望“只有成功才扣”，则需要业务实现一起变更，不能仅靠翻译掩盖差异。

### F04：英文示例和不适用的 FAQ

共 22 个德俄功能页面有英文自然语言示例，每语言 11 页：audio-to-score、jianpu-to-staff、musicxml-midi、pdf-score-scanner、pdf-to-musicxml、pricing、score-editor、score-to-audio、staff-to-jianpu、teaching、transpose-score。其中音频导入页为实验 noindex 页面。

例如 `Selected event: E4 quarter note in measure 2`、`Corrected event: F-sharp4 eighth note in a new revision`。这些说明句需要翻译；MusicXML、MIDI、JSON、音符数据及简谱代码不用机械翻译。`Classroom / School Beta` 等展示标题也未处理。

根因：[localizeFeatureEvidence](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/feature-localization/index.ts:76>)仅法语覆盖 `example`，德俄继续继承英语。完整范围见[功能示例清单](<E:/AI WEB/21.wuxianpu/artifacts/de-ru-audit-2026-09-30/feature-examples.json>)。FAQ 应按功能写实际输入、限制与输出；价格页和教学页尤其不适合统一套用转换工具问答。同步修改可见 FAQ 和 JSON-LD。

### F05：错误信息绕过翻译

[API 错误处理](<E:/AI WEB/21.wuxianpu/packages/i18n/src/api-errors.ts:56>)只有法语映射，其他语言直接返回原始 `error` 或 `Request failed.`。本地传入德语/俄语后，密码错误、额度耗尽、网络失败仍返回英文。

后台任务还有独立路径：[ScoreDetailClient](<E:/AI WEB/21.wuxianpu/apps/app/src/components/ScoreDetailClient.tsx:740>)显示导出任务的 `job.errorMessage`，识谱任务区域也直接展示它。只补 API helper 不能覆盖这些消息。建议稳定错误码映射用户提示，诊断详情保留给可展开的高级信息。网关 503 也应在客户端映射，机器日志无需全部翻译。

### F06：客户邮件与教学通知没有全链路语言支持

纯函数输出确认：德语、俄语的密码重置主题均为英文 `… password reset link`，支持回执均为英文 `… support request received`。邮件正文也英文。模板引用的 `PRODUCT_NAME` 仍是 `MusicXML Sheet Music Workspace`，与前台 ScoreTransposer 品牌不同。

密码重置 URL 已能通过 `/api/locale` 保留德俄语言，**这个链接行为正常，不需要重写成英语直链**。

教学通知更深一层：学生组件提交偏好时将除简中外的语言都写成 `en`，repository 类型只接受简中/英语，worker 查询又做一次同样归并。仅新增两份邮件模板不会修好它，需要贯通保存、读取和发送三个环节。教师自行输入的公告正文不应未经要求被自动翻译。

定位：[邮件模板](<E:/AI WEB/21.wuxianpu/services/api/src/lib/email.ts:87>)、[产品名称](<E:/AI WEB/21.wuxianpu/packages/shared/src/index.ts:19>)、[学生通知偏好](<E:/AI WEB/21.wuxianpu/apps/app/src/components/StudentHome.tsx:151>)、[偏好仓库](<E:/AI WEB/21.wuxianpu/services/api/src/repositories/notification-preferences-repository.ts:18>)、[worker 投递](<E:/AI WEB/21.wuxianpu/services/worker/src/notification-delivery.ts:98>)。未发送真实邮件。

### F07：版权投诉语言被强制变为英语

表单本身有德俄翻译，但 [copyright 路由](<E:/AI WEB/21.wuxianpu/services/api/src/routes/copyright.ts:97>)使用 `body.locale === "zh-CN" ? "zh-CN" : "en"`。邮件回执标题、查询信息和[初始公开事件](<E:/AI WEB/21.wuxianpu/services/api/src/repositories/copyright-complaint-repository.ts:161>)因此为英文。前端会显示 `publicMessage`。

建议保留受支持的原始语言，为平台生成的回执及状态事件使用消息码/模板；人工输入的回复另按客服实际语言处理。未提交虚假版权投诉。

### F08：Google 登录按钮采用浏览器语言

本次浏览器为中文环境，德语和俄语登录、结算表单中实际显示“通过 Google 继续操作”。[德语截图](<E:/AI WEB/21.wuxianpu/artifacts/de-ru-audit-2026-09-30/de-app-login-1280.png>)、[俄语截图](<E:/AI WEB/21.wuxianpu/artifacts/de-ru-audit-2026-09-30/ru-app-login-1280.png>)可复现。

[AuthForm](<E:/AI WEB/21.wuxianpu/apps/app/src/components/AuthForm.tsx:143>)的 `renderButton` 未传 `locale`。Google 官方说明未配置时跟随浏览器或 Google 账户偏好，因此问题是在“站内选择与浏览器默认语言不一致”时出现，不是所有德国/俄语用户都会看到中文。应传站内语言并在切换时重绘。[Google 按钮 locale 文档](https://developers.google.com/identity/gsi/web/reference/js-reference#locale)。

### F09：音频输入能力与上线状态不一致

德语首页步骤写“从 PDF、图片、MusicXML 或音频/视频开始”；俄语同样如此。首页 `SoftwareApplication.description` 和 `featureList` 也包含音频转谱。与此同时，德俄 audio-to-score 页明确写生产验证待完成，带 noindex；应用 `/scores/new/audio` 返回本地化不存在页面。

应用源码在 `NEXT_PUBLIC_AUDIO_TRANSCRIPTION_AVAILABLE` 未开启时调用 `notFound()`：[音频入口](<E:/AI WEB/21.wuxianpu/apps/app/src/app/scores/new/[source]/page.tsx:18>)。首页营销步骤、FAQ、schema 应统一读取上线状态。这里讨论的是**音频转乐谱输入**，不是已经存在的乐谱播放或乐谱导出音频。

Google 要求结构化数据真实反映当前内容和能力；语法校验成功不足以证明内容正确。[结构化数据质量规范](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)。

### F10：德语音名需要消除 B/H 歧义

[TARGET_KEY_OPTIONS](<E:/AI WEB/21.wuxianpu/apps/app/src/components/ScoreDetailClient.tsx:371>)采用 `B`、`Bb` 等国际值，[选项展示](<E:/AI WEB/21.wuxianpu/apps/app/src/components/ScoreDetailClient.tsx:2522>)直接显示原值。德语用户通常区分 H 与 B；MuseScore 德语文档也专门解释键盘 B 对应音名 H。[MuseScore 德语音名说明](https://musescore.org/de/handbuch/noteneingabe)。

建议保留底层 MusicXML/API 音高编码，仅在德语显示 `H (B)` 与 `B (B♭)`，或清楚注明使用国际音名。未发现证据说明转调引擎算错，此项是避免用户选错目标调的显示歧义。

### F11：俄语格变化和数量词形

生产价格页出现 `Вопросы о Тарифы ScoreTransposer`，标题被直接放在需要变格的介词后；`Какие данные принимает Тарифы ScoreTransposer?` 还有语义和数一致性问题。根因是 [feature UI](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/feature-localization/ui.ts:361>)直接拼接标题。可用不依赖标题变格的 `Частые вопросы`，再按模块写具体问题。

转调建议 `На {value} полутонов в {target}` 本地代入后得到 `На 1 полутонов…`、`На 2 полутонов…`。应处理 `1 полутон / 2 полутона / 5 полутонов`，包括负数、11–14 和 21 等情况，或采用不要求变格的中性结构。德语 `{count} Halbtöne` 也缺少 1 时的 `Halbton`。不应把已有的俄语 `Полутонов: {count}` 等中性结构误报为同样错误。

定位：[德语转调词典](<E:/AI WEB/21.wuxianpu/apps/app/src/lib/score-detail-messages/locales/de.ts:11>)、[俄语转调词典](<E:/AI WEB/21.wuxianpu/apps/app/src/lib/score-detail-messages/locales/ru.ts:12>)。

### F12：应用导航长文本遮挡

在 1280×900，德语 `Code einlösen` 与品牌区域重叠，转调菜单靠近/被语言选择器覆盖；俄语同样复现。官网在该宽度已经折叠菜单，应用没有采用足够宽的折叠阈值。390 像素抽查没有发现横向溢出。

定位：[AppChrome](<E:/AI WEB/21.wuxianpu/apps/app/src/components/AppChrome.tsx:114>)、[共享导航样式](<E:/AI WEB/21.wuxianpu/packages/ui/src/sonata.css:2819>)。应让导航根据内容宽度提前收起，验证德俄长标签和登录/已登录两种按钮组合。截图同 F08。

### F13：认证页演示媒体失效

[AuthShell](<E:/AI WEB/21.wuxianpu/apps/app/src/components/AuthShell.tsx:31>)仍引用 `/product/demo-score-to-audio.mp4` 和 `/product/feature-score-to-audio-real.png`。两个 URL 两次检查均 404，浏览器视频报告错误码 4，认证页显示灰色空白演示区。

官网已使用 `/product/localized/de/…`、`/product/localized/ru/…` 下的实际媒体。应用应接入相同媒体登记表，避免写死旧扩展名和路径。这是两种语言都会遇到的共用组件缺陷。

### F14：支持说明不应索要完整登录凭证

关于页“提供什么信息”仍建议提供 `Aktivierungscode` / `код активации`。当前[激活码登录组件](<E:/AI WEB/21.wuxianpu/apps/app/src/components/ShopActivation.tsx:98>)明确提示激活码不能分享；启用此方式后持有码可访问账户。

普通支持表单没有单独的激活码字段，但关于页的提示仍会引导用户粘贴到描述中。建议改为订单编号、购买渠道和必要时的码尾数，并提示不要提交密码或完整激活码。不涉及读取客户的真实码，也没有声称已经发生泄露。

定位：[德语关于页支持说明](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/static-marketing-localization/locales/de.ts:12>)、[俄语说明](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/static-marketing-localization/locales/ru.ts:48>)。

### F15：美元格式未随语言本地化

德俄结算目前显示 `$7.99`、`$49`、`$0.082`。[localizeUsdText](<E:/AI WEB/21.wuxianpu/packages/i18n/src/formatters.ts:44>)仅处理法语；项目已有 `Intl.NumberFormat` 可输出逗号小数和合适空格。

这是显示格式一致性问题，**不是金额计算错误**。建议用数值、币种及 locale 格式化，并明确 USD；不要仅因选德语或俄语就改成 EUR/RUB，也不要在货币单位不变时换算数值。

### F16：用户文案残留内部运行说明

忘记密码表单告诉用户“未配置邮件时，链接会出现在 API 预览日志”；价格页提醒等每个 Price ID 配置完成才开放；部分导出失败帮助要求配置 FluidSynth、SoundFont 或 ffmpeg。普通用户无法完成这些操作。

开发配置提示可留在内部诊断视图；用户界面应解释是否已提交、是否已扣款/消耗额度、现在能做什么、何时联系支持。专业格式名称可以保留，服务端部署说明不应作为客户操作步骤。现有结算页“翻译尚未专业审核”的说明也表明商业文案仍待完成，不能仅删除提示后宣布已审核。

### F17：语言风格与专业术语

这些项目属于清晰度和一致性改进，不应包装成每条都导致功能失效：

| 语言/位置 | 当前表达 | 建议方向 |
| --- | --- | --- |
| 德语登录 vs. 编辑器/价格 | `Melden Sie…` 与 `Starte…`、`du/deine…` 混用 | 统一称呼；考虑沿用现有登录与帮助区的 Sie |
| 德语拍号分母 | `Schlagnenner` | `Nenner der Taktart` |
| 德语适宜转调建议 | `Bequeme Vorschläge` | `Vorschläge für einen passenden Tonumfang` 或更短的 `Geeignete Transpositionen` |
| 德语偏好降号 | `Bes bevorzugen` | `b-Vorzeichen bevorzugen`，避免与 B/H 音名问题混在一起 |
| 俄语实际音高→记谱音高 | `От концертного к нотированному` | `Из реального звучания в записанные ноты`；反向对应说明 |
| 俄语兑换码 | `погасить код` | `активировать код` / `использовать код`，按登录/兑换实际动作选择 |
| 俄语识别结果与版本 | `кандидат`、`ревизия/редакция` 混用 | 面向新用户优先 `результат распознавания`、`версия`，高级诊断可保留技术词 |
| 俄语内容过期 | `Содержимое истекло` | `Срок хранения истёк`，明确是保存期限 |
| 俄语数字简谱 | `цифровая нотация` | 首次出现解释为数字记谱 Jianpu/цзяньпу，避免用户理解成泛指电子乐谱 |

### F18：媒体本地化细节

[俄语教学截图](<E:/AI WEB/21.wuxianpu/apps/www/public/product/localized/ru/feature-teaching-real.png>)的日期输入占位仍有中文“年/月/日”。这来自截图采集环境的原生控件语言；不能据此声称所有俄语用户的浏览器日期控件都是中文。面向俄语发布的固定截图应在相应浏览器语言下重新采集。

生产俄语功能页的截图日期出现 `29 авг. 2026 г..`，格式化日期已有句点，模板又附加一个。德语、俄语媒体的主要 UI 已有本地化版本，不能把它们笼统描述成全是英文图。媒体里的用户输入曲名、声部名及国际格式名称也不要求一律翻译。

## SEO 判定及没有发现的问题

全站自动检查结果为 **297/297 页面、0 error、1 warning**。唯一警告是 `http://www.scoretransposer.com/` 归一化经过多跳，是全站共性事项。

德俄 66 个 sitemap 页面具备预期语言、标题、描述、H1、canonical、社交标签、结构化数据和语言替代链接；自动检查包含 hreflang 与 sitemap 匹配。`de`、`ru` 是有效的语言级标记，不必为了“本地化”强制改成国家代码。[Google 多语言页面文档](https://developers.google.com/search/docs/specialty/international/localized-versions)。

技术通过不代表内容通过：F01/F04 的模板问答、F09 的能力声明、F11 的俄语语法会同时出现在用户内容或结构化数据中，应一起修。没有证据可据此断言已被 Google 降权。

其他核对结论：

- 官网到应用的 locale handoff 能保留德语/俄语，也保留 `plan=starter-annual&billing=one_time`。应用页面设置 noindex；正常私有工作区无需公开索引。
- 两种语言的实验音频导入页均 noindex，并不在 sitemap 中；不存在的官网路径返回 HTTP 404，浏览器渲染本地语言说明。原始 HTML 抓取器未取到 404 正文是流式渲染解析差异，已用浏览器排除“空白/英文 404”的误报。
- 语言词典字段和占位符完整，基础编辑、音符时值、播放、协作角色等大部分标签已有翻译。没有发现“整个德语/俄语模块没有翻译”的情况。
- 共享媒体的 alt 主体已按语言生成。主页图、功能页媒体、社交图和一个 MusicXML 示例文件复查可达；两个认证页旧链接的 404 已单独列为 F13。
- `Organization.contactPoint.availableLanguage` 目前只列英语、中文。这表示客服能力，不能因为界面支持德俄就擅自宣称客服也支持德俄，暂不判为 SEO 错误。

## 覆盖到但不应混作外部客户漏译的区域

内部管理员页面包括激活码、SEO、安全审计、支持和版权处理，仍主要提供中文/英文；内部 operations-checklist 同样如此。已记录这些分支，但没有证据表明普通德俄客户会进入后台，因此不列为客户流程缺陷。中国渠道专用 ShopActivation 的中文 UI 也不是德俄公共页面漏译；其登录能力只用于核对 F14 文案。

MusicXML/MIDI/JSON 等格式标识、Yjs、SHA-256、BPM、文件名、用户自建曲名和日志字段保持原样通常是合理的。需要翻译的是用户解释、操作标签和平台生成的提示，不是所有拉丁字母。

## 仍需外部证据的事项

1. **Stripe/Paddle 托管收银台、商家收据及邮件。** 本轮没有创建付费 session 或付款。源码传入德俄 locale，但使用已有 Price ID；不能据此确认第三方产品名称、税费说明、失败页和收据已完整翻译。原订单截图中的英文商品名提示这里值得专项核验，但它不是德俄真实会话的证据。
2. **搜索效果。** 没有本次德俄 Search Console 查询、索引覆盖、曝光、点击、转化数据，也未进入 Yandex Webmaster 核验俄语索引。不能声称所有页已收录或给出关键词搜索量。SEO 台账提供后续按语言筛选的起点；俄语界面不等同于用户居住在俄罗斯。
3. **lastmod。** 德俄 sitemap 日期仍为 2026-08-10/24/25，法语另有 9 月更新覆盖。需要与各德俄页面实质更新记录核对；不能只因今天是 9 月就批量改成今天。后续修复应写真实内容修改日期。[Google sitemap lastmod 说明](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap#lastmod)。
4. **私有/多人/付费工作流运行状态。** 已核对文字来源和传递链，没有用真实学生、教师、付费客户账户逐项操作。修复后需要受控测试账号和样例项目验收异常状态、多人冲突、导出及通知。

## 建议修复与验收次序

先统一 F01–F03 的购买、期限和额度说明；同时处理 F14，避免引导提交完整登录凭证。再修正错误映射、邮件/通知/版权 locale 传递及 F08/F12/F13 的可见流程问题；之后补齐功能示例、上线状态与 schema，并统一两种语言术语和格式。

验收应覆盖一次性购买/订阅两个分支，任务创建与失败提示，德俄邮件纯函数快照，俄语 1/2/5/11/21 数量词形，以及 390/1280/1920 宽度。重新抓取 66 个德俄页面，检查可见内容与 JSON-LD 一致、媒体无 404、支付和重置密码回跳保留语言。第三方托管页面单独记录，不能用本站词典检查代替。

本轮产出为审计报告和证据文件，产品代码与生产环境未因本轮审计变更。
