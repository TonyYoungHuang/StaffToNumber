import type { SupportLegalLocalization } from "../types";

export const zhCNSupportLegal = {
  openGraphLocale: "zh_CN",
  homeBreadcrumb: "首页",
  legalReviewNotice: { eyebrow: "法律翻译提示", title: "本页译文为待审草案", body: "本译文仅供参考，须由专业法律人士审核；如与英文版本存在冲突，以英文版本为准。", ariaLabel: "法律译文审核提示" },
  support: {
    metadata: { title: "支持 / 联系我们 / 订单核查 | ScoreTransposer", description: "联系 ScoreTransposer 支持，处理账号、激活码、上传识别、结果下载和隐私请求。", keywords: ["ScoreTransposer 支持", "激活帮助", "乐谱上传支持", "订单核查", "隐私请求"], socialImageAlt: "英文界面的 ScoreTransposer 乐谱工作区输出预览" },
    schemaName: "ScoreTransposer 支持",
    schemaContactType: "客户支持",
    hero: { eyebrow: "支持 / 联系 / 核查", title: "需要帮助？请告诉我们遇到了什么问题", body: "你可以在这里提交账号、激活、识谱、下载或隐私相关问题。信息越完整，我们越容易定位并回复。", submitAction: "提交支持请求", faqAction: "查看 FAQ", checkoutAction: "查看购买路径" },
    form: {
      eyebrow: "提交支持请求", title: "站内 Support 表单", body: "直接在站内提交支持请求。表单会发送到 API，系统会记录工单，并自动向你的联系邮箱发送确认邮件。", categoryLabel: "问题类别", categoryAriaLabel: "选择支持问题类别", nameLabel: "联系人姓名（可选）", contactEmailLabel: "联系邮箱", accountEmailLabel: "账号邮箱（可选）", orderReferenceLabel: "订单号 / 支付参考（可选）", jobReferenceLabel: "任务号 / 文件名（可选）", subjectLabel: "主题", messageLabel: "问题描述", messageHint: "请尽量写清楚触发步骤、出现时间、报错现象，以及你已经尝试过的操作。", honeypotLabel: "网站", submitting: "提交中...", submit: "提交支持请求", emailAction: "切换到公开支持邮箱", emailFallback: "若自动邮件暂时不可用，仍可直接写信到 {supportEmail}。", successSent: "已收到你的请求，编号 {referenceCode}。支持确认邮件已经发送，请留意收件箱。", successPreview: "已收到你的请求，编号 {referenceCode}。当前环境未启用正式邮件服务，确认邮件内容已写入 API 预览日志。", successFailed: "已收到你的请求，编号 {referenceCode}。但确认邮件暂时发送失败，可直接引用该编号联系支持。",
      categories: {
        payment: { label: "支付 / 订单", helper: "支付成功但账户权益未出现、回跳异常、重复扣款疑问或人工核查。", subject: "支付 / 订单核查请求" },
        activation: { label: "激活 / 权限", helper: "激活码无法兑换、权限未生效或到期时间异常。", subject: "激活 / 权限问题" },
        job: { label: "上传 / 结果", helper: "PDF 上传失败、任务卡住、结果下载异常或 final / draft 争议。", subject: "上传 / 结果支持请求" },
        privacy: { label: "隐私 / 删除", helper: "删除数据、导出数据或隐私相关人工处理。", subject: "隐私 / 删除请求" },
        general: { label: "其他", helper: "不属于以上分类，或需要人工判断支持流程。", subject: "一般支持请求" },
      },
    },
    workflows: { eyebrow: "支持分类", title: "先把问题分对类，再进入人工核查", items: [["01", "支付 / 订单问题", "适用于支付成功后账户权益未生效、支付回跳异常、重复扣款疑问，或需要人工核查订单状态。"], ["02", "激活 / 权限问题", "适用于激活码无法兑换、权限未生效、到期时间异常，或需要人工确认授权范围。"], ["03", "上传 / 结果问题", "适用于 PDF 上传失败、任务卡住、结果下载异常，或 final / draft 结果需要人工判断。"]] },
    evidence: { eyebrow: "提交建议", title: "支持请求写得越完整，人工处理通常越快", status: "建议附带信息", points: ["联系邮箱或账号邮箱", "购买时间、支付渠道、支付截图", "激活码、订单号、任务号、文件名等可核对信息", "报错截图、触发步骤、问题出现的大致时间"] },
    boundary: { eyebrow: "处理边界", title: "我们可以帮助处理哪些问题", body: "支持范围包括账户访问、激活码、文件上传、识谱任务、结果查看与下载，以及隐私请求。", metrics: [["产品问题", "账号与乐谱", "账号、支付、激活码、上传、任务与结果下载问题。"], ["识别说明", "候选需复核", "自动识别结果可能需要人工校对；复杂谱面请附上原文件和问题截图。"], ["人工核查", "可处理", "订单核查、兑换异常、下载异常、删除请求等。"]] },
    after: { eyebrow: "提交之后", title: "提交后会发生什么", body: "提交成功后会生成请求编号。请保存编号；如邮件通知已启用，你也会在联系邮箱收到确认。", aboutAction: "查看 About", privacyAction: "隐私政策", termsAction: "服务条款" },
    final: { title: "现在提交支持请求", body: "请先选择问题类型，并附上账号邮箱、任务号、文件名、发生时间和相关截图。", formAction: "填写 Support 表单", faqAction: "常见问题", checkoutAction: "购买 / 开通" },
  },
  copyright: {
    metadata: { title: "版权与侵权投诉 | ScoreTransposer", description: "提交乐谱、录音或分享链接的版权投诉，获取受理编号和私密查询码，并在线查看公开处理进度。", keywords: ["版权投诉", "乐谱下架申请", "侵权乐谱链接", "版权案件进度", "ScoreTransposer 版权"], socialImageAlt: "英文界面的 ScoreTransposer 乐谱预览，用于版权投诉流程" },
    hero: { eyebrow: "版权与合规", title: "版权投诉与处理进度", body: "结构化提交、私密查询、公开处理记录和内部审计彼此分离。首次响应目标为 48 小时，不代表法律结论或固定处置时限。" },
    faqTitle: "常见问题",
    faqs: [["哪些链接可以投诉？", "请提交 ScoreTransposer 官网、应用或公开分享域名下的具体链接。"], ["查询码为什么只显示一次？", "平台只保存查询码哈希，无法从数据库还原原查询码，以降低投诉材料泄露风险。"], ["提交后会自动删除内容吗？", "不会。平台会先核验材料，并通过公开处理记录说明补充材料、采取措施或驳回的原因。"]],
    form: {
      submitTitle: "提交版权投诉", submitBody: "请提供权利基础、原创作品说明和平台内目标链接。提交后会生成投诉编号与一次性查询码。", submitFormAriaLabel: "版权投诉提交表单", name: "投诉人姓名", email: "联系邮箱", organization: "机构 / 出版方（可选）", relationship: "与作品的关系", owner: "版权所有者", agent: "经授权代理人", work: "原创作品与权利说明", workHint: "说明作品名称、作者、首发或登记信息，以及你主张权利的范围。", targets: "涉嫌侵权的 ScoreTransposer 链接", targetsHint: "每行一个平台内 URL，最多 20 个。", evidence: "补充证据链接（可选）", evidenceHint: "每行一个公开可访问 URL，最多 10 个。请勿在链接中放入敏感个人信息。", action: "请求平台采取的措施", goodFaith: "我诚信相信，上述使用未经权利人、代理人或法律授权。", accuracy: "我确认所填信息准确，并有权代表相关权利人提交本投诉。", signature: "电子签名（输入真实姓名）", honeypotLabel: "网站", submit: "提交投诉", submitting: "正在提交...", receiptTitle: "投诉已登记", receiptStatus: "已收到", receiptBody: "请立即保存编号和查询码。出于安全原因，查询码不会再次在网页中显示。", receiptAriaLabel: "版权投诉回执", due: "首次响应目标", trackTitle: "查询处理进度", trackBody: "查询使用 POST 请求，查询码不会写入 URL 或浏览器历史。", trackFormAriaLabel: "版权投诉进度查询表单", reference: "投诉编号", access: "查询码", lookup: "查询进度", lookingUp: "查询中...", current: "当前状态", actionTaken: "已采取措施", history: "公开处理记录", emptyHistory: "暂时没有公开处理更新。", statuses: { received: "已收到", validating: "材料核验中", info_required: "需要补充信息", reviewing: "审核中", actioned: "已采取措施", rejected: "已驳回", closed: "已结案" },
    },
  },
  privacy: {
    metadata: { title: "在线乐谱平台隐私政策 | ScoreTransposer", description: "查看在线乐谱平台如何处理账号信息、上传乐谱、音频视频、生成结果和支持记录，以及数据导出、删除宽限期与文件保留规则。", keywords: ["ScoreTransposer 隐私", "乐谱文件保留", "账号删除", "音乐数据隐私", "访问分析同意"], socialImageAlt: "英文界面的 ScoreTransposer 乐谱预览，用于隐私政策" },
    hero: { eyebrow: "隐私政策", title: "scoretransposer.com 当前隐私基线", body: "这份政策说明 ScoreTransposer 如何处理账号数据、上传乐谱和媒体、结构化修订、生成结果以及支持记录。", updatedPrefix: "更新于", termsAction: "查看服务条款" },
    sections: [
      { title: "收集哪些信息", points: ["账号数据，例如邮箱、密码哈希、激活状态和授权期限。", "上传的乐谱、扫描件、音频或视频、结构化 MusicXML 与 Score JSON、生成的导出文件和校对修订历史。", "运行元数据，例如上传时间、任务状态、文件名和支持联系记录。"] },
      { title: "如何使用这些数据", points: ["用于认证用户、校验付费权限，并交付乐谱扫描、编辑、互换、移调、播放、练习和导出流程。", "用于为已登录用户保留源文件和生成结果，方便其在应用内查看和下载。", "用于排查失败任务、响应支持请求，并持续改进启发式识别质量。"] },
      { title: "保留与删除", points: ["账号和授权记录会在账号活跃期间保留，并在需要时用于后续支持。", "上传源文件和生成结果会被保留，以支持下载、复核和服务排障。", "登录用户可下载结构化数据副本，并在再次验证密码后申请删除账户；删除申请有 14 天可取消宽限期。", "宽限期结束后会删除用户乐谱、课堂数据、支持记录和存储文件；依法需要保留的支付审计记录会去标识化。"] },
      { title: "数据共享", points: ["客户文件不会被出售。", "为了交付服务，流量、托管、DNS、存储、日志和部署供应商可能处理必要的运行数据。", "在法律要求或为防止滥用、欺诈和安全事件时，数据可能被依法披露。"] },
      { title: "Cookie 与访问分析", points: ["功能性语言 Cookie 用于记住用户选择的界面语言。", "Cloudflare Web Analytics 的真实用户监测（RUM）已全局启用，用于统计页面访问和加载性能；它不使用 Cookie、不读取浏览器存储，并会在 Cloudflare 边缘节点丢弃访客 IP 地址。", "只有在用户明确同意且生产分析配置已启用时，才会加载 GA4 或 Microsoft Clarity。", "拒绝需要同意的访问分析不会影响公开内容或产品功能的使用。"] },
      { title: "安全基线", points: ["转换工具通过用户认证和基于激活的权限校验来控制访问。", "生产环境访问应限制给授权操作人员，密钥也应保存在托管平台而不是源码中。", "用户仍需自行避免非法或未授权上传，并在发布或演出前核对音乐内容是否正确。"] },
    ],
    contact: { title: "联系与政策更新", body: "数据导出和账号删除可在登录后的账户控制台自助完成；如果无法登录或需要政策解释，请通过公开支持渠道提交请求并确认账号身份。", note: "如我们的托管、存储、分析、支付或账号处理方式发生重大变化，本政策也会相应更新。", action: "提交隐私请求" },
    related: { eyebrow: "相关说明", title: "继续了解服务条款和产品说明", body: "如果访客是从搜索结果或支付流程进入这里，他们通常还会继续确认产品定位、使用边界和购买路径。", aboutAction: "打开 About / 支持页", termsAction: "打开服务条款", checkoutAction: "查看开通路径" },
    continue: { eyebrow: "继续浏览", title: "下一步最常见的去向，就是支持、条款和购买说明。", body: "如对数据处理、账户删除或隐私权利有疑问，请通过支持表单联系我们。", supportAction: "联系支持", homeAction: "返回首页" },
  },
  terms: {
    metadata: { title: "全功能乐谱平台服务条款 | ScoreTransposer", description: "查看 MusicXML 乐谱平台的导入识别、编辑、移调、简谱、播放、导出、教学、版权和可接受使用规则。", keywords: ["ScoreTransposer 条款", "乐谱订阅条款", "乐谱上传规则", "订阅取消", "版权与可接受使用"], socialImageAlt: "英文界面的 ScoreTransposer 乐谱预览，用于服务条款" },
    hero: { eyebrow: "服务条款", title: "ScoreTransposer 服务条款", body: "这些条款说明 ScoreTransposer 的免费项目、订阅开通、自动续费、取消、结果交付和用户责任。", updatedPrefix: "更新于", privacyAction: "查看隐私政策" },
    sections: [
      { title: "服务范围", points: ["服务支持乐谱工程、结构化乐谱导入、五线谱/简谱转换、移调、校对、播放练习、教学流程和已配置的导出格式。", "OMR、PDF/图片渲染、高质量音频和音频转谱依赖外部工具配置，可能在特定部署环境中暂不可用。", "网站、应用和输出材料可能随服务演进而变化，但用户购买时应仅以当时公开发布的范围为准。"] },
      { title: "账号与订阅开通", points: ["注册 Free 账号后，可以在公开的月度任务和存储限制内创建一个完整乐谱项目；该免费项目不要求绑定支付卡或兑换激活码。", "付费订阅可在支付渠道确认付款后自动开通，也可以通过授权渠道发放的有效激活码开通。", "订阅或激活权限与对应授权期限绑定；如发生欺诈、滥用、拒付争议或违反政策，权限可能被暂停。", "用户需自行妥善保管账号凭证，并对该账号下发生的行为负责。"] },
      { title: "上传与结果", points: ["用户只能上传自己有权处理的内容。", "当系统无法稳定提升结果时，交付可能是正式 PDF，也可能是草稿包。", "在发布、教学、排练或演出前，用户仍需自行核对音乐准确性、版权合规性和实际适用性。"] },
      { title: "计费、续费、取消与退款", points: ["Starter 与 Converter Pro 是按月或按年计费的自动续费订阅，价格、币种、税费和计费周期以结账页展示为准。", "如未取消，支付渠道会在每个新计费周期开始时使用已保存的付款方式自动扣款。", "用户可在账单中心取消，或在下次续费前联系支持。取消会停止后续续费；除退款、拒付、欺诈审查或法律要求导致提前处理外，已付权益通常保留到当前付费周期结束。", "可通过支持入口提交退款申请。是否符合条件，以购买时展示的条款、支付渠道适用规则及强制性消费者法律为准；获批退款会同步到账单，全额退款可能结束对应付费权益。"] },
      { title: "可接受使用", points: ["用户不得利用本服务上传恶意软件、侵权内容或故意干扰平台运行的文件。", "禁止自动化滥用、共享账号、抓取私人客户数据或绕过权限控制。", "当检测到滥用、安全风险或法律暴露时，ScoreTransposer 可暂停或终止访问权限。"] },
    ],
    purchase: { title: "购买与退款说明", body: "订阅价格、计费周期、税费和支付方式以结账页为准；取消和退款按本条款、购买时展示内容及支付渠道规则处理。", note: "如套餐、价格、续费方式或服务范围发生实质变化，我们会更新相关说明。", supportAction: "提交支持请求" },
    related: { eyebrow: "相关页面", title: "继续查看隐私政策、产品说明和支持入口", body: "用户在这里确认服务边界后，通常还会继续核对数据处理方式、支持入口和真实开通路径。", privacyAction: "打开隐私政策", copyrightAction: "提交版权投诉", aboutAction: "打开 About / 支持页", checkoutAction: "查看开通路径" },
    help: { eyebrow: "需要帮助", title: "对条款或账户权限有疑问？", body: "你可以继续查看隐私政策和产品说明，或通过支持表单提交具体问题。", supportAction: "联系支持", homeAction: "返回首页" },
  },
} as const satisfies SupportLegalLocalization;
