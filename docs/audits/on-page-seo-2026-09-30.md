# 英语、西语 On-page SEO 合并修改与验收 · 2026-09-30

> 最新状态：根据用户后续三项要求，已完成九语言重点页修正，并仅调整中简／中繁／日／韩的双向简谱页，发布 `20260930-seo9`。当前验收以[九语言原文对照报告](nine-language-on-page-seo-2026-09-30.md)为准，下文为前一发布的记录。

> 复核补充（2026-09-30 21:46）：下文记录已发布内容和当时的技术验收，不代表原文逐项全部完成。再次对照发现简谱页专属 FAQ / 正文内链及部分英西工具页覆盖遗漏，另有少量非逐字采用文案。以[原文逐项复核](<E:/AI WEB/21.wuxianpu/docs/audits/on-page-seo-advice-recheck-2026-09-30.md>)中的差异说明为准。

本次执行依据用户提供的哥飞 SEO Agent 原文。用户确认无法继续使用付费查询，要求直接落实建议，因此不再以补查 KD 为前置条件。Google Trends 截图为「全球、过去一个月、网页搜索」的相对热度，不能据此推导美国月搜索量、关键词难度或排名保证。原报告的搜索量、DR、外链预算和趋势数字均未在本次重新验证。

## 与另一任务的合并

已读取并承接[英西全栈审计与修复任务](codex://threads/01a0ebc4-ef51-7552-8cb0-1d31e2402b78)。该任务已获「修改并部署」授权，暂停在发布包与工作区差异核对阶段。两任务共用同一工作区；此次统一发布，不回退其中的定价、支付方式、额度、激活期限、功能可用性、错误及邮件翻译、专属 FAQ、示例和教学截图修复。

英西全栈问题清单见 [16 项审计记录](english-spanish-fullstack-audit-2026-09-30.md)。英语关键词和页面结构以用户提供的大佬文档为准；西语六个重点工具页和首页采用对应的自然西语说明、独立标题/问答和同语言正文内链。没有把英语搜索量或关键词难度当作西语数据。

## 页面对应关系

| 页面 | 主搜索需求 | 实际修改 |
| --- | --- | --- |
| `/` | sheet music scanner | 使用原文建议的 Title、H1、Description；首屏恢复可读的介绍，第一段包含完整主词；新增带主词 H2 和扫描三步流程；正文链接串联工具页 |
| `/sheet-music-scanner` | sheet music scanner for PDF / images | 从旧扫描地址迁移；使用原文建议 Title；独立说明 PDF、手机照片、准确性；五条专属 FAQ |
| `/transpose-score` | transpose sheet music | 采用原文建议 Title；单独的 H1、含主词 H2；简化开篇、步骤和限制；增加移调专属 FAQ |
| `/pdf-to-musicxml` | PDF to MusicXML | 保留原有 Title；采用建议 Description 和简洁 H1；加入转换步骤、错音校正 H2；独立 FAQ 与编辑→移调→MIDI 的正文内链 |
| `/score-editor` | sheet music maker | 采用建议 Title、Description 和 H1；新增制作、导入编辑、分谱 H2；四条专属 FAQ。明确从结构化简谱或导入乐谱开始，未宣称已有完整空白画布排版功能 |
| `/musicxml-midi` | MIDI to sheet music（同页覆盖反向转换） | 采用原文的双向转换 Title/H1 分支；说明导入 MIDI、修正节奏、MusicXML→MIDI、乐谱→MIDI；五条专属 FAQ |
| `/staff-to-jianpu` | staff notation to Jianpu | 保留页面，补全建议 Title，简化介绍并补关键词 H2；未另建长尾页或扩写专题文章 |

首页是扫描能力总入口；扫描内页解释 PDF / 照片输入、准备方法与使用限制。未额外创建同义词页面。

## 公共模板与迁移

- 网站不再输出 `meta name="keywords"`，根布局也不会把该标签继承到工具页。内部关键词清单保留用于现有管理与意图映射，不再当作排名标签。
- 英语、西语重点工具页把 metadata Title 与可见 H1 分开，保留每页一个 H1；结构化 FAQ 与可见问答使用同一数据。
- 英语和西语重点页功能卡片分别解释各功能，不再重复 `Connected to the score project workflow.`。
- 原文重点页面正文中的 candidate / diagnostics / revision 改为 notes / mistakes / score / version；技术名只在必要的文件示例和支持说明中保留。
- `/pdf-score-scanner` → `/sheet-music-scanner` 使用 HTTP 301，覆盖英语及其他八种语言，保留查询参数。旧示例下载和社交图片地址一并重定向。
- 导航、首页入口、站内关系、示例文件索引、分析事件路径、canonical、hreflang、sitemap 使用新地址；截图文件名和截图时间保留真实原记录。
- 西语首页及六个重点工具页按相同意图本地化；其他七种语言正文保留，只参与共享路由迁移、关键词标签清理和分享图生成。
- Sitemap 的英语、西语内容日期按合并修改范围更新，其他语言沿用各自实际编辑日期。
- 元信息长度继续作为提示保留；不再以建议字数上限阻断原文给出的较长标题。

## 产品事实核对

- API 有 `/scores/import/midi` 导入路径和 `/scores/:id/export/midi` 导出路径，支持选择双向转换文案；本次未修改转换引擎。
- 免费方案沿用一个完整乐谱项目、每月 25 credits 的现行口径。
- 手机照片列明格式和拍摄要求，不承诺固定识别时间、百分百准确率或可靠手写识别。
- 分谱和实时协作继续标明 Beta；MIDI 不被描述为保留原录音音色的音频格式。

## 验证

本地最终代码已通过：

- 官网单测 91 项、应用单测 144 项、共享语言测试 17 项、邮件及英西错误相关测试 15 项通过；类型检查、仓库 lint、Windows 与 Linux 生产构建通过。
- 全站 sitemap 297/297 页抓取：0 错误、0 警告。检查标题、描述、H1、canonical、hreflang、JSON-LD、可索引性及站内链接。
- 英西 14 个重点落地页实测：关键词在标题、H1、首个 H2、开头正文中一致；问答可见内容与 JSON-LD 一致；西语正文内链保留 `/es`。
- 九语言扫描页和示例下载正常；27 条旧页面、下载、分享图路径均为 301 并保留语言及查询参数。
- 28 个桌面／手机页面场景通过：单 H1、无横向溢出、无浏览器运行错误、FAQ 可展开。首页和重点页截图已目检。
- 99 张分享图的 PNG 文件头及 1200×630 尺寸均通过；额外先触发一次未缓存的 `next/image` 优化，再逐张请求分享图，均返回 200。

证据保存在 `artifacts/on-page-seo/`。通用抓取器仍将全站人工质量审校标为待办，这不是排名或全站母语逐字审校保证。本次人工复核范围为修改后的重点文案、源代码与桌面／移动截图。

可复跑的验收入口：

```powershell
npm run test -w @score/www
npm run typecheck -w @score/www
npm run build -w @score/www
node scripts/verify-on-page-seo.mjs http://localhost:3100 artifacts/on-page-seo
```

验证预览使用与正式站一致的 public launch / product app / OMR 开关；音频转谱开关保持实际关闭状态。可用 `node scripts/verify-on-page-browser.mjs <base-url> <output-dir>` 复跑浏览器检查。

## 线上合并验收

- 最终版本英西 14 个重点页、九语言扫描页、27 条 301 和 99 张分享图再次线上验证通过。
- 最终正式站 sitemap 297 页检查完成，元信息、单 H1、canonical、hreflang、结构化数据等自动检查为 0 错误、0 警告。
- 初次含站内链接的抓取出现 2 条临时连接失败：法语 Bach 曲目页与中文 MIDI 示例下载。两条分别用 HEAD、GET 复查均为 200；原始报告与复查结果保留在 `production/crawl-initial.json` 和 `production/link-rechecks.json`，没有把失败记录删除或静默忽略。
- 英西全部 66 个可索引页面、实际套餐金额、一次性购买说明、教学专属 FAQ、未开放音频页 noindex、两张教学截图哈希校验通过。
- 线上 28 个桌面／手机页面场景通过；最终示例文案另外检查桌面与手机两种视口。英西登录及价格页 8 个浏览器场景通过，一次性购买入口分别保持语言、套餐和购买类型；没有发起真实支付。
- API 运行容器中构造验证英西密码邮件、客服邮件、版权文本和错误提示，语言与链接正确；没有向用户发送测试邮件。
- 合并初版校验四个运行服务共 1,233 个发布文件；最终前端小修校验官网与应用 1,127 个发布文件，与打包哈希一致。
- `http://www.scoretransposer.com/score-editor?ref=canonical-check` 单跳 301 到主域同路径并保留查询参数。共用服务器上的其他站点 HTTPS 检查通过，17 个运行容器健康状态正常。

## 分享图运行问题

已复现 Next.js 16.3.0 的进程级 Sharp 冲突：未缓存的图片优化会禁止 SVG 加载，随后运行时 `ImageResponse` 断开连接。与 [Next.js 上游 issue #96612](https://github.com/vercel/next.js/issues/96612) 的复现顺序一致。

修复采用独立构建进程生成九语言 99 张 PNG，原分享图地址继续返回同一规格图片。`generate-social-images.tsx` 校验文案/布局及图片哈希；普通构建和 Hetzner 构建入口都会更新变更的图片。没有放宽图片优化器的加载限制，也没有升级框架。已撤除排查时的原生模块绕行方案。

## 发布与搜索数据状态

已完成合并发布：官网／应用为 `20260930-enes2`，API／后台任务为 `20260930-enes1`。运行服务健康，配置及其他站点未被替换。详细备份和回滚方式见 [发布记录](../deployments/english-spanish-on-page-release-2026-09-30.md)。本次没有购买外链、开通付费工具、操作 GSC 账号或提交 sitemap。

项目既有 `docs/operations/google-seo-funnel-runbook.md` 记载 2026-08-18 已验证 GSC Domain property 并成功读取 sitemap；本次没有登录后台确认当前状态，因此不能重复宣称“完全未接 GSC”，也不能宣称已拿到最新曝光数据。

部署后检查新地址 200、旧地址 301 及九语言 sitemap，再在现有 GSC 资源查看页面索引和查询／网页维度。7 天检查抓取与迁移，30 天比较曝光、点击和注册转化，60–90 天再决定是否加厚内容；不把某次关键词查询或提交 sitemap 当作排名结果。
