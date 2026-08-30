import type { WorkspaceMessages } from "../types";
import { enWorkspaceMessages } from "./en";

export const zhCNWorkspaceMessages = {
  ...enWorkspaceMessages,
  pages: {
    dashboard: { eyebrow: "控制台", title: "账户概览与授权状态。", body: "查看登录状态、当前授权有效期，以及“五线谱 PDF → 简谱”流程的下一步操作。", note: "激活、上传和排队任务集中在同一个乐谱工作台。" },
    jobs: { eyebrow: "转换工作台", title: "转换任务与结果查看。", body: "发起“五线谱 PDF → 简谱”任务，查看状态更新、预览文本，并下载最终 PDF 或草稿包。" },
  },
  banner: { payNow: "立即开通", activationOptions: "查看激活方式", accountSetup: "查看账户设置", importScore: "导入 PDF 或图片", openJobs: "打开任务页" },
  dashboard: {
    signInFirst: "请先登录后再查看控制台。", loadingEyebrow: "正在读取账户资料", loadingTitle: "账户详情加载中...", accessEyebrow: "需要登录", accessTitle: "这个工作台区域需要有效登录。", signIn: "登录", createAccount: "创建账户", lookupEyebrow: "账户查询", lookupTitle: "未找到该账户。",
    metrics: { email: "账户邮箱", emailBody: "当前已登录，可以继续上传文件或创建任务。", freeEmailBody: "当前已登录，可从一份完整 PDF 或乐谱图片创建终身免费项目。", entitlement: "授权状态", entitlementBody: "一年期访问权限由激活码统一管理。", route: "乐谱工作台", routeValue: "扫描、编辑、互换与移调", routeBody: "所有流程统一基于 MusicXML 与 Score JSON，并支持播放、练习和多格式导出。", freeRouteValue: "一个完整免费项目", freeRouteBody: "免费项目开放现有项目级功能，每月包含 25 积分；升级后可获得更多积分。" },
    statuses: { active: "有效", expired: "已过期", inactive: "未激活" },
    profile: { eyebrow: "资料", title: "账户概览", email: "邮箱", created: "创建时间" },
    entitlement: { eyebrow: "授权", title: "访问有效期", starts: "开始时间", ends: "结束时间", inactive: "尚未生效", missing: "暂无授权" },
    workflow: { eyebrow: "工作流", title: "下一步操作建议", step1Title: "1. 导入或创建乐谱", step1Body: "可从 PDF、图片、MusicXML、MIDI、简谱或音频进入结构化乐谱流程。", step1FreeBody: "上传一份完整多页 PDF 或一张乐谱图片，生成可校正的识别候选。", step2Title: "2. 校对、编辑与练习", step2Body: "在统一修订历史中完成识别校对、图形编辑、移调、播放和分声部练习。", step2FreeBody: "在“我的乐谱”校正候选，并继续播放、移调、转简谱、保留版本、分享和导出。", step3Title: "3. 导出交付版本", step3Body: "按当前正式修订生成 MusicXML、MIDI、PDF、图片或高质量音频。", step3FreeBody: "需要创建更多乐谱或更高月度任务容量时，再选择 Starter、Converter Pro 或兑换已有激活码。" },
    actions: { eyebrow: "操作", title: "管理当前工作台", checkout: "在线支付开通", uploads: "打开上传页", freeEditing: "打开免费编辑", jobs: "打开任务页", redeem: "兑换新的激活码", supportAdmin: "打开工单后台", signOut: "退出登录" },
    privacy: { eyebrow: "隐私与数据", title: "管理你的数据副本和账户生命周期", body: "数据导出不包含密码、会话令牌、重置令牌或分享密钥。账户删除有 14 天宽限期，到期后删除乐谱、课堂和文件，并对必须保留的支付审计记录去标识化。", export: "下载数据副本", exporting: "正在生成数据副本...", exportFailed: "数据导出失败。", password: "当前密码", confirmation: "输入 DELETE 确认", schedule: "申请删除账户", scheduling: "正在提交删除申请...", pending: "账户删除已进入宽限期", pendingBody: "计划删除时间", cancel: "取消账户删除", cancelling: "正在取消...", required: "请输入当前密码，并准确输入 DELETE。", scheduled: "删除申请已提交。当前会话已退出，可在宽限期内重新登录取消。", cancelled: "账户删除申请已取消。", exportReady: "数据副本已下载。", statusAria: "账户数据请求状态" },
  },
  operations: {
    operations: { eyebrow: "运行状态", title: "基础健康可视化", loading: "正在检查 API、存储、Worker、支付和邮件配置状态...", error: "暂时无法读取当前运行状态。", checked: "最近检查", technicalDetails: "技术详情", servicesAria: "运行服务状态" },
    support: { eyebrow: "支持入口", title: "站内 Support 表单", body: "这些入口会打开站内 Support 表单并预选问题类别。提交后 API 会记录请求并自动发送确认邮件。", openForm: "打开表单", publicPage: "公开支持页", templates: { payment: { title: "支付 / 订单核查", description: "适用于支付后未看到权限、回跳异常或需要人工核单。" }, activation: { title: "激活码 / 权限异常", description: "适用于兑换失败、权限未生效或到期时间异常。" }, job: { title: "上传 / 结果问题", description: "适用于 PDF 上传失败、任务卡住、下载异常或需人工确认结果。" }, privacy: { title: "删除 / 隐私请求", description: "适用于删除、导出或隐私相关人工处理。" } } },
    statuses: { ok: "正常", warning: "注意", error: "异常", disabled: "关闭" },
    serviceLabels: { api: "应用接口", database: "数据库", storage: "文件存储", worker: "识谱处理服务", payment: "支付配置", email: "邮件通知", unknown: "系统服务" },
    serviceMessages: { ok: "运行正常。", warning: "当前可用，但有配置或运行状态需要检查。", error: "当前不可用，请稍后重试或联系支持。", disabled: "当前未启用。" },
  },
  jobs: {
    signInFirst: "请先登录。", uploadFirst: "请先上传 PDF。", downloadFailed: "下载失败。", createdJob: "任务 {id} 已创建。",
    summary: { queued: ["排队中", "等待 Worker 处理。"], processing: ["处理中", "正在生成预览和输出包。"], completed: ["已完成", "可下载正式 PDF 或草稿包。"] },
    create: { eyebrow: "创建转换任务", title: "发起五线谱转简谱任务", body: "选择已上传的源文件，保持转换方向锁定，然后将 PDF 送入任务队列。", input: "输入文件", inputPlaceholder: "请选择已上传的 PDF", direction: "转换方向", lockedDirection: "五线谱 PDF 转简谱", draftTitle: "草稿优先机制", draftBody: "低置信度页面会保留为草稿结果，而不是过早升级为最终版。", source: "当前选中的源文件", noSource: "尚未选择源文件", uploadHint: "如果下拉为空，请先去上传页添加 PDF。", createButton: "创建任务", creating: "创建中...", refresh: "刷新队列", uploads: "打开上传页", recentSources: "最近源文件库", emptySources: "还没有上传 PDF。请先去上传页，再回来创建转换任务。", useThis: "使用此文件" },
    monitor: { eyebrow: "队列监控", title: "实时转换面板", auto: "自动刷新中", loading: "正在加载任务...", empty: "还没有任务。先在左侧选择 PDF 并创建第一条任务。", latest: "最新任务", created: "创建于", resultCenter: "结果中心", final: "该任务当前已被判定为最终结果。", draft: "该任务当前被保留为草稿结果。", none: "该任务暂未产出可下载结果。", previewWaiting: "Worker 输出预览文本后会显示在这里。", primary: "主输出", primaryTitle: "最终 PDF", primaryBody: "任务顺利提升为最终版后即可下载。", fallback: "兜底输出", fallbackTitle: "草稿包", fallbackBody: "结果仍需人工校对时可下载。", downloadPdf: "下载结果 PDF", downloadDraft: "下载草稿包", notReady: "未就绪", liveAria: "实时转换队列" },
    archive: { eyebrow: "最近任务", title: "任务归档", body: "预览文本、结果类型和下载入口都会保留，方便回看旧任务。" },
    statuses: { queued: "排队中", processing: "处理中", completed: "已完成", failed: "失败" }, resultKinds: { none: "暂无", final: "最终版", draft: "草稿" }, directions: { staff_pdf_to_numbered: "五线谱 PDF → 简谱" }, phases: { completed: "已完成", running: "运行中", waiting: "等待中" },
  },
  uploads: {
    signInFirst: "请先登录。", chooseFile: "请选择 PDF 文件。", uploadFailed: "上传失败。", downloadFailed: "下载失败。", uploaded: "已成功上传 {name}。", previewAwaiting: "等待上传 PDF",
    metrics: { stored: ["已存储乐谱", "每次上传都会形成一个可重复使用的源文件。"], format: ["支持格式", "当前正式环境只接受五线谱 PDF。"], storage: ["总存储量", "便于在批量上传前快速了解空间占用。"] },
    upload: { eyebrow: "上传乐谱", title: "把五线谱带入工作台", body: "使用专注的上传区域和预览上下文添加可复用源文件。", dropTitle: "拖拽乐谱到这里，或点击选择文件", dropBody: "当前仅支持五线谱 PDF。图片上传和反向转换暂未上线。", maxSize: "最大大小遵循 API 限制", cloud: "云端导入", planned: "规划中", selected: "已选择并可上传。", empty: "尚未选择文件。请选择一个 PDF 生成可复用的源文件记录。", uploadButton: "上传 PDF", uploading: "上传中...", clear: "清空选择", jobs: "前往任务页", inputAria: "选择五线谱 PDF" },
    preview: { eyebrow: "实时预览", title: "当前上传上下文", ready: "准备进入队列", numbered: "简谱预览", previewBody: "清晰的 PDF 后续可升级为最终结果；质量不稳定的素材会保留草稿交付。", latest: "最新源文件", latestEmpty: "暂无已存储源文件", latestHint: "上传一个 PDF 后即可进入任务队列。", next: "下一步", nextTitle: "创建转换任务", nextBody: "文件入库后，任务页会保持“五线谱 PDF → 简谱”的锁定方向。", openQueue: "打开任务队列", downloadSource: "下载源文件" },
    stored: { eyebrow: "已存储文件", title: "已上传的五线谱 PDF", body: "这些文件都可以作为任务输入，下载可用于核对 API 中保存的源文件。", loading: "文件加载中...", empty: "还没有上传文件。先上传一个五线谱 PDF 才能创建任务。", download: "下载" },
    fileKinds: { input_pdf: "输入 PDF", unknown: "文件" },
  },
} satisfies WorkspaceMessages;
