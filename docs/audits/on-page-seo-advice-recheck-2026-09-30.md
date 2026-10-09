# 与用户原文逐项复核 · 2026-09-30

> 后续处理：用户随后明确简谱只调整中简／中繁／日／韩，欧洲语言保留，并要求恢复 MIDI 描述及 FAQ 标题、核对九语言七个重点页。该轮修正已发布 `20260930-seo9`，见[九语言原文对照报告](nine-language-on-page-seo-2026-09-30.md)。下文保留修正前的历史发现；欧洲语言简谱不再属于本轮待补项，其他音频／教学次要页仍在本轮专项范围之外。

结论：主要关键词布局和重点页面标题已经落实，但不能认定原文所有要求均已严格完成。存在简谱页专属 FAQ / 正文内链遗漏，以及把同样规则扩展到英西其他工具页时的覆盖缺口。另有少量意思一致但没有逐字采用的文案。此前的技术验收通过，不等于这份原文的逐条验收通过。

本轮仅复核、记录差异，没有修改网站源码或重新发布。

依据：[用户提供的完整原文](<C:/Users/Administrator/.codex/attachments/bdbeefa6-a613-4372-b455-4c2eafd96fe1/已粘贴的文本.txt>)。复核时间为北京时间 2026-09-30 21:46；直接 HTTP GET 抓取正式站 22 个英语 / 西语页面，另外检查九语言旧扫描路径和 sitemap。使用实际返回的 HTML，对照本地源码；没有将搜索服务的缓存摘要当作当前页面。

证据：[逐页原值及比较结果](<E:/AI WEB/21.wuxianpu/artifacts/on-page-seo/advice-recheck/comparison.json>)。同目录保存每页 HTML。词组比较忽略英文大小写；Title、Description、明确指定的 H1 和 H2 使用原文字符串比较。

## 原文重点页面

| 原文要求 | 正式站结果 | 判定 |
| --- | --- | --- |
| 首页使用建议 Title、Description、H1 | 三项均逐字一致 | 已落实 |
| 首页增加 `How to scan sheet music into an editable score`，上传→识别→校正 | H2 一致；三步为 Upload a PDF or photo / Scan the printed notes / Correct and export | 已落实 |
| 扫描页改为 `/sheet-music-scanner`，旧路径 301 | 九语言均 301，语言与查询参数保留；sitemap 只有新路径 | 已落实 |
| 扫描页建议 Title、三个 H2、五个问句 | 均逐字匹配 | 已落实 |
| 移调页建议 Title | 逐字一致 | 已落实 |
| PDF 页保留 Title、使用建议 Description、H1 | 均逐字一致 | 已落实 |
| PDF 页两个业务 H2 | `How to convert a PDF to MusicXML`、`Fix the notes OMR got wrong` 均存在 | 已落实 |
| 编辑器建议 Title、Description、H1、三个业务 H2 | 均逐字一致 | 已落实 |
| MIDI 页按真实功能选择 Title | 采用原文“双向转换”分支，逐字一致；代码已有 MIDI 导入、导出路由 | 已落实 |
| MIDI 页三个业务 H2 | `How to convert MIDI to sheet music`、`Clean up a messy MIDI import`、`MusicXML to MIDI` 均存在 | 已落实 |
| MIDI 页建议 Description | 改写为带完整主词并补充反向转换的句子，未逐字采用 | 文案差异，见下文 |
| 简谱页保留，补全 Title，增加一两个含词 H2 | 建议 Title 后附品牌名；有两个对应 H2；没有新增专题页或文章 | 已落实，但不代表该页其他要求已完成 |
| 四个内页各写专属 FAQ | PDF、编辑器、MIDI 已完成；简谱仍走通用 FAQ | **未全部落实** |
| 清理重复功能卡说明 | 英语工具页、六个西语重点工具页已替换为各卡不同的说明 | 重点页已落实；西语其他工具页有遗漏 |
| PDF 正文串起编辑→移调→MIDI | 四个对应锚文本链接均存在，另含扫描页链接；西语链接保持 `/es/` | 已落实 |
| 四页加入正文上下文内链 | PDF、编辑器、MIDI 已有；简谱仍只有面包屑和相关工具卡片等链接 | **未全部落实** |
| 单 H1，去掉 meta keywords | 本轮 22 页均只有一个 H1，均不输出 meta keywords | 已落实 |
| 不为同义需求另开第五个落地页 | 本轮修改现有页面并迁移扫描路径，未新建同义词落地页 | 已落实 |

七个重点英文页面的 Title 均采用了建议文本；简谱页额外保留站点品牌后缀。首页、PDF、编辑器的指定 Description / H1 均一致。不要将这个结论扩大为所有正文也逐字一致。

## 明确遗漏

1. **英语、西语 `/staff-to-jianpu` 没有专属问答。** 英语仍是 `What source material can I use?`、`Can I review and edit the score?`、`What limitations should I check?`。这些问句与简谱转五线谱等工具页相同，编辑回答也相同，限制回答直接复用了本页已有提示。这没有完成原文“本周：四页各写一套自己的 FAQ”。FAQ 的标题包含主词，但问题和答案内没有完整的 `staff notation to Jianpu`。

2. **英语、西语 `/staff-to-jianpu` 没有正文流程内链。** 目前有相关工具卡片，不能把它等同于原文要求的正文上下文链接。源码中该页未设置 `nextSteps`。可通过改写现有一句说明补足，不需要扩写新专题。

3. **西语另外三个已开放工具页仍重复使用模块说明。** `/es/jianpu-to-staff`、`/es/score-to-audio`、`/es/teaching` 分别重复 4、6、7 次 `Conectado al flujo del proyecto musical.`；首个 H2 也仍为 `Creado sobre MusicXML y Score JSON`，未采用对应工具主词。六个重点西语页面已处理，但用户合并英语、西语任务后，不能把结果说成所有西语工具页均已完成同样优化。未开放且 noindex 的 `/es/audio-to-score` 也保留模板，单独记为非当前引流页。

4. **“每页开篇使用完整目标词”没有在所有英语工具页首段贯彻。** `/jianpu-to-staff` 首段仍写 `Paste structured Jianpu text into a score project, convert it into internal Score JSON...`；`/teaching` 使用 `music education software`，没有原样写入其 Title / H1 的主词 `music notation software for students`。这些页面的 H1 / 第一个 H2 已包含主词，不能把标题中的出现算成首段正文已经改写。以上为对原文全页规则的扩展复核，区别于原文给出逐句方案的七个重点页面。

对应源码：[英语页面文案](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/feature-on-page.ts:138>)、[西语页面文案](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/feature-on-page-es.ts:123>)、[通用问答回退](<E:/AI WEB/21.wuxianpu/apps/www/src/lib/feature-localization/en-es-faq.ts:28>)。现有次要页保留部分 score project / Score JSON 等表述，不能宣称全站产品内部术语已全部清理。

## 语义一致但不是逐字采用

- **MIDI Description**：原文以 `Upload a MIDI file and get editable sheet music in your browser...` 开头；现在线上是 `Convert MIDI to sheet music in your browser: clean up the notation, transpose, play it back, and export MusicXML, PDF or a new MIDI. Convert sheet music to MIDI too. Free to try.`。它对应原文允许的双向功能，但属于自行调整；若按逐字要求，应恢复原文描述，把反向补充放在可见正文中。
- **FAQ 的 H2**：原文在 PDF、编辑器、MIDI 页列出 `FAQ`；实际使用 `Questions about ...`，`FAQ` 只是眉题。FAQ 内容存在，这不是整块缺失，但 HTML 的 H2 文本确实与建议不同。
- **三个问句为加入主词而改写**：PDF 的 `Can it read handwritten sheet music?` 改为 `Can PDF to MusicXML read handwritten sheet music?`；编辑器的 `Do I need music theory to use it?` 改为 `Do I need music theory to use the sheet music maker?`；MIDI 的 `Does it keep tempo and dynamics?` 改为 `Does MIDI to sheet music keep tempo and dynamics?`。问题意图一致，也照顾原文“FAQ 出现主词”的要求，不应归为问句主题遗漏。
- **简谱页的低投入要求**：除 Title / H2 外，也改写了已有介绍及四张卡片说明；现有工作步骤和详情没有扩写。没有新增长文章或外链，但也不是只改了两个标题。原文同时要求去掉重复卡片、改写 FAQ，宜在已有内容体量内完成。

## 仍未完成的外部数据工作

- **关键词难度**：没有得到 `sheet music maker` / `midi to sheet music` 的新 KD 结果。用户后续说明无法继续付费查询并要求直接落实，故执行时不再将其作为前置条件。这是用户后续指令决定的调整，不能宣称原文“先查难度再决定”已经完成。Trends 截图没有证明关键词难度或绝对搜索量。
- **GSC 当前数据**：项目[既有记录](<E:/AI WEB/21.wuxianpu/docs/operations/google-seo-funnel-runbook.md:15>)记载 2026-08-18 已验证 Domain property、读取 sitemap。此次没有登录 GSC 复核当前收录、曝光及查询词，不能称为本次已完成搜索反馈闭环，也不能断言从未接入 GSC。
- **外链**：没有做引用域建设。原文把它列为页面改完后的工作，当前请求聚焦 On-page，不属于已经完成的页面代码事项。

## 本次验收与此前结果的关系

本轮 22 个直接请求均为 200；九语言旧扫描地址均为 301；sitemap 含九个新扫描页、不含旧扫描路径。工具页可见 FAQ 与其 JSON-LD 一致。这些检查证明页面可访问和技术结构一致，不能证明文案任务全部完成或带来排名提升。

此前 `verify-on-page-seo.mjs` 对简谱页的专属 FAQ 数量配置为 0，因此跳过该页问句去重与上下文链接断言；仅覆盖 14 个英西重点落地页，也没有检查这次发现的西语三个其他工具页。这解释了为何先前检查通过，而本轮仍能发现原文执行缺口。后续补齐时，验收范围应覆盖这些遗漏，不应继续使用“自动检查通过”代替原文逐项核对。
