# 九语言 On-page SEO 原文对照与修正 · 2026-09-30

本轮依据用户提供的 SEO 原文，以及之后明确的三项要求：简谱只调整简体中文、繁体中文、日语、韩语；MIDI 描述和指定 FAQ 标题恢复原文；九语言复核七个重点页面及正文流程内链。已发布官网版本 `20260930-seo9`。这是对[上一轮复核](on-page-seo-advice-recheck-2026-09-30.md)发现差异的后续处理。

## 范围与结果

| 语言 | 首页、扫描、PDF、编辑器、MIDI、移调（每语言 6 页） | 五线谱→简谱、简谱→五线谱（每语言 2 页） |
| --- | --- | --- |
| 英语 en | 按原文核对并修正 | 按用户最新要求保留 |
| 简体中文 zh-CN | 对应本地化并核对 | 已调整专属标题、说明、FAQ、正文内链 |
| 繁体中文 zh-TW | 对应本地化并核对 | 已调整专属标题、说明、FAQ、正文内鏈 |
| 日语 ja | 对应本地化并核对 | 使用数字譜／簡譜／Jianpu 对应说明，调整双向页面 |
| 韩语 ko | 对应本地化并核对 | 使用 숫자악보 对应说明，调整双向页面 |
| 法语 fr | 对应本地化并核对 | 按用户最新要求保留 |
| 西语 es | 对应本地化并核对 | 按用户最新要求保留 |
| 德语 de | 对应本地化并核对 | 按用户最新要求保留 |
| 俄语 ru | 对应本地化并核对 | 按用户最新要求保留 |

总计核对 72 页：原文 7 个重点页面 × 9 语言 = 63 页，再加反向简谱页 × 9 语言 = 9 页。调整范围为 62 页；其余 10 个欧洲语言简谱页以发布前快照核对，Title、Description、H1、H2、首段、FAQ、模块说明及正文流程链接保持原样。共享“相关工具”卡片会显示其他工具更新后的标题和描述，因此这里不是声称整页 HTML 字节不变。

## 与原文逐项对应

| 原文要求 | 本轮正式站结果 |
| --- | --- |
| 七个重点页面建议 Title | 英语保持建议文本；简谱 Title 保留品牌后缀。其他语言使用对应意图的本地化 Title；欧洲语言简谱按最新指令冻结 |
| 首页指定 Description、H1 | 英语逐字一致；其他八语言表达扫描、纠错、移调、导出及完整项目免费体验，H1 对应扫描／移调／编辑 |
| 首页扫描 H2 与上传→识别→校正 | 九语言均有对应 H2 和三步流程；补齐西语原有步骤顺序 |
| PDF 指定 Description、H1、H2 | 英语逐字一致；其他八语言对应转换、OMR 错音校正与 FAQ |
| 编辑器指定 Description、H1、H2 | 英语逐字一致；其他八语言对应制谱、导入编辑、分谱及 FAQ |
| MIDI 描述严格原文 | 英语恢复原文整句，其他八语言按同一内容本地化；反向转换说明留在可见正文 |
| FAQ 的 H2 标题 | 英语 PDF、编辑器、MIDI 均恢复为 `FAQ`；其他八语言使用本地常见标题，如“常见问题”“よくある質問”“Preguntas frecuentes” |
| 原文给出的 FAQ 问句 | 英语 PDF 的 `Can it read handwritten sheet music?`、编辑器的 `Do I need music theory to use it?`、MIDI 的 `Does it keep tempo and dynamics?` 均恢复原句；主词自然写入回答，其他原文问句保留 |
| 目标词覆盖关键位置 | 62 个范围内页面在 Title、H1、首个 H2、开篇正文及 FAQ 中均使用该语言主词；未把英语搜索量视为其他语言数据 |
| 专属 FAQ 与模块差异说明 | 核心工具页及四语言双向简谱页使用对应内容；FAQ JSON-LD 与可见问答一致，各模块说明不再重复同一句模板 |
| PDF→编辑→移调→MIDI 正文内链 | 九语言 PDF 正文均包含三条对应工具链接，语言前缀正确；其余范围内页面也有上下文流程链接 |
| 扫描页九语言 301 | 旧 `/pdf-score-scanner` 指向 `/sheet-music-scanner`；保留语言和查询参数；旧下载与分享图入口一并验证 |
| 单 H1、无 meta keywords、URL 一致性 | 已核对单 H1、canonical、九语言及 x-default hreflang、sitemap 和可索引性 |

英语 MIDI Description 的正式站原值：

> Upload a MIDI file and get editable sheet music in your browser: clean up the notation, transpose it, play it back, and export MusicXML, PDF or a new MIDI. Free to try.

简谱描述明确区分两条实际路径：五线谱或已校正的识别结果生成简谱文本；结构化简谱文本转换成五线谱。没有宣称能可靠识别任意简谱照片，也没有把五线谱 PDF／图片导出描述成简谱排版导出。编辑器从导入乐谱或结构化简谱开始；分谱仍说明 Beta 和已有独立声部限制。

## 验证证据

- 官网 91 项单测、类型检查、仓库 lint、Windows 和最终 Linux 生产构建通过。
- [正式站 72 页对照](../../artifacts/nine-locale-seo/production/pages.json)：62 页范围检查、10 页保留对照、18 条扫描页面与分享图跳转，零错误。
- [正式站完整 sitemap 抓取](../../artifacts/nine-locale-seo/production/crawl.json)：297/297 页，零错误、零警告；包含站内链接检查。
- [扩展核对](../../artifacts/nine-locale-seo/production-extended/on-page-checks.json)：14 个英西重点页面、9 个扫描页、27 条页面／示例／分享图 301；99 张分享图在触发未缓存的图片优化后仍为有效的 1200×630 PNG。
- [本地浏览器检查](../../artifacts/nine-locale-seo/browser/browser-checks.json)：62 页 × 桌面／手机 = 124 个场景，通过 H1、首段、FAQ 展开、横向溢出和浏览器异常检查；抽查首页及工具页截图。
- [正式站浏览器检查](../../artifacts/nine-locale-seo/production-browser/browser-checks.json)：九语言首页、MIDI 及四语言双向简谱页，26 页 × 桌面／手机 = 52 个场景全部通过。
- [公开入口检查](../../artifacts/nine-locale-seo/production/public-smoke.json)：官网、应用登录页及受保护站点的首页／健康接口均返回 200。
- 发布后逐一校验 501 个官网发布文件；其余 16 个容器身份不变，17 个容器运行正常。详见[发布记录](../deployments/nine-language-on-page-release-2026-09-30.md)。

可复跑：`npx tsx scripts/verify-nine-locale-seo.ts https://scoretransposer.com artifacts/nine-locale-seo/production --before=artifacts/nine-locale-seo/before/pages.json`；浏览器使用 `scripts/verify-nine-locale-browser.mjs`，传入地址、输出目录、上述 pages.json，添加 `--smoke` 可复跑线上抽查范围。

## 范围边界

本轮针对用户点名的七个重点页面，并补上四语言反向简谱页。上一轮记录的其他英西音频、教学等次要页面不在此次七页专项修正范围；欧洲语言简谱模板按用户明确要求保留。通用抓取器的全站人工质量审校仍标记为待办；技术检查不代表全站经过母语逐字审校。

没有取得新的付费关键词难度数据，也没有登录 GSC 读取新的收录／曝光数据。用户已要求不再等待付费查询，直接落实 On-page；没有执行外链建设。以上不被记作已完成，也不据此承诺排名或流量。
