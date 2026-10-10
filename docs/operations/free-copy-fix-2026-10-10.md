# 免费套餐说明修复｜2026-10-10

## 范围与基线

从 `origin/codex/commercial-mvp-seo-production` 的 `c231bf6f4f8849e23c0a9ea82436e48359ff4020` 干净检出独立 worktree：`.tmp/free-copy-fix-20261010/worktree`。仅修改官网首页与价格页九种语言的免费套餐说明正文：终身 1 次免费扫谱项目、每月 25 积分用于导出和工具、50 MB 存储；扫描新乐谱需要 One Score Pass 或套餐。

共 18 处正文替换，涉及 16 个源码文件，另附本执行报告。未修改业务逻辑、权益规则、URL、title、H1、meta description、结构化数据或 FAQ（含问答文字）。未部署、未连接或修改生产服务器。

代码依据：`services/api/src/lib/free-trial.ts` 按账户历史累计免费 OMR 项目，不按月重置；`services/api/src/config.ts` 默认 `FREE_TRIAL_OMR_JOBS=1`、月额度 `25`、存储 `50 * 1024 * 1024`。既有 `free.credits` / `free.resources` 已说明终身一次及导出/工具用途，保持原样。

## 实际渲染路径与保留内容

- 首页九种语言：`app/page.tsx` → `getHomepageLocalization(locale).page.creditRules[0][2]`。免费套餐卡已被过滤，修改未渲染的 `free.credits` 无法修复首页说明。
- 英／西价格页：`LocalizedPricingPage.tsx` → `en-es-pricing.ts` 的 `freeBody`；德／俄价格页：同一组件 → `localized-pricing.ts` 的 `freeBody`。
- 法语价格页：`FrenchPricingPage.tsx` 的独立免费说明 `<p>`。
- 简／繁中文、日语、韩语价格页：`app/[featureSlug]/page.tsx` → 本语言 `feature-localization/locales/*.ts` 的 `pricing.details[0].body`。保留同段 Starter / Converter Pro 月额度；description、workflow 与 guardrail 同时用于元数据、结构化数据或 FAQ，均未修改。
- 英文首页主卖点 `One full project free, nothing to install` 位于 `en.ts:15` 的 `heroIntro[2]`，由 `app/page.tsx` 渲染为正文副标题 `<p>`，不是 H1；按要求保持不动。其他语言对应短句也保持原样。
- 首页事实栏“终身免费／一个完整项目”、创建首个项目的引导、已有准确的套餐字段保持原样。FAQ 中既有免费说明按硬性限制保留，包括英文 `one complete score project and 25 monthly credits` 等措辞。

## 逐处改动清单

以下行号为修改后源码行号（本次没有增删源码行）。格式：`文件:行 旧文字 → 新文字`。

- `apps/www/src/lib/homepage-localization/locales/en.ts:85`（en，首页） `Use one complete multi-page PDF or score image with all current project-level tools for life, with 25 credits monthly.` → `Your free account includes 1 lifetime free scan project, 25 credits / month for exports & tools, and 50 MB of storage. Scan a complete multi-page PDF or score image; scanning a new score requires a One Score Pass or plan.`

- `apps/www/src/lib/homepage-localization/locales/zh-CN.ts:85`（zh-CN，首页） `一份完整多页 PDF 或乐谱图片可终身使用现有项目级功能，每月包含 25 积分。` → `免费账户包含终身 1 次免费扫谱项目、每月 25 积分（用于导出和工具），以及 50 MB 文件存储空间。可扫描完整的多页 PDF 或乐谱图片；扫描新乐谱需要单曲处理包（One Score Pass）或套餐。`

- `apps/www/src/lib/homepage-localization/locales/zh-TW.ts:85`（zh-TW，首页） `一份完整的多頁 PDF 或樂譜圖片可終身使用所有目前的專案級工具，並且每月含 25 點。` → `免費帳戶包含終身 1 次免費樂譜掃描專案、每月 25 點數（用於匯出與工具），以及 50 MB 檔案儲存空間。可掃描完整的多頁 PDF 或樂譜圖片；掃描新樂譜需要單曲處理包（One Score Pass）或方案。`

- `apps/www/src/lib/homepage-localization/locales/ja.ts:85`（ja，首页） `楽譜全体を収めた複数ページ PDF または楽譜画像1件で、現在の全プロジェクト機能を生涯利用でき、毎月25クレジットが付与されます。` → `無料アカウントには、生涯で1回の無料楽譜スキャンプロジェクト、書き出しやツールに使える毎月25クレジット、50 MB のファイルストレージが含まれます。複数ページの PDF 全体や楽譜画像をスキャンできます。新しい楽譜をスキャンするには、1曲パス（One Score Pass）またはプランが必要です。`

- `apps/www/src/lib/homepage-localization/locales/ko.ts:85`（ko，首页） `악보 전체가 담긴 여러 페이지 PDF 또는 악보 이미지 1개로 현재의 모든 프로젝트 단위 도구를 평생 사용할 수 있으며, 매월 크레딧 25개가 제공됩니다.` → `무료 계정에는 평생 1회 무료 악보 스캔 프로젝트, 내보내기와 도구에 사용할 수 있는 월 25크레딧, 50 MB 파일 저장 공간이 포함됩니다. 여러 페이지 PDF 전체나 악보 이미지를 스캔할 수 있습니다. 새 악보를 스캔하려면 한 곡 이용권(One Score Pass) 또는 요금제가 필요합니다.`

- `apps/www/src/lib/homepage-localization/locales/fr.ts:81`（fr，首页） `Utilisez à vie un PDF multipage complet ou une image de partition avec tous les outils de projet actuels, plus 25 crédits par mois.` → `Le compte gratuit inclut un seul projet de numérisation gratuit à vie, 25 crédits par mois pour les exports et les outils, ainsi que 50 Mo de stockage. Numérisez un PDF multipage complet ou une image de partition ; pour numériser une nouvelle partition, il vous faut un Pass une partition (One Score Pass) ou une offre.`

- `apps/www/src/lib/homepage-localization/locales/es.ts:52`（es，首页） `Usa de por vida un PDF completo de varias páginas o una imagen de partitura con todas las herramientas actuales del proyecto y 25 créditos mensuales.` → `La cuenta gratuita incluye un único proyecto de escaneo gratis de por vida, 25 créditos al mes para exportaciones y herramientas y 50 MB de almacenamiento. Puedes escanear un PDF completo de varias páginas o una imagen de partitura; para escanear una nueva partitura necesitas un Pase para una partitura (One Score Pass) o un plan.`

- `apps/www/src/lib/homepage-localization/locales/de.ts:52`（de，首页） `Nutzen Sie eine vollständige mehrseitige PDF oder ein Partiturbild lebenslang mit allen aktuellen Projektwerkzeugen und monatlich 25 Credits.` → `Das kostenlose Konto umfasst lebenslang genau ein kostenloses Scan-Projekt, 25 Credits pro Monat für Exporte und Werkzeuge sowie 50 MB Dateispeicher. Scannen Sie ein vollständiges mehrseitiges PDF oder ein Notenbild; für eine neue Partitur benötigen Sie einen Einzelpartitur-Pass (One Score Pass) oder einen Tarif.`

- `apps/www/src/lib/homepage-localization/locales/ru.ts:52`（ru，首页） `Пожизненно используйте один полный многостраничный PDF или изображение нот со всеми текущими инструментами проекта и получайте 25 кредитов в месяц.` → `Бесплатная учётная запись включает один бесплатный проект сканирования за всё время использования, 25 кредитов в месяц на экспорт и инструменты и 50 МБ для файлов. Можно отсканировать полный многостраничный PDF или изображение нот; для сканирования новой партитуры нужен пакет для одной партитуры (One Score Pass) или тариф.`

- `apps/www/src/lib/en-es-pricing.ts:3`（en，价格页） `Create one complete project from a multi-page PDF or score image. Your free project includes 25 credits each month and 50 MB of storage. Use the available tools to edit, transpose, play and export your score.` → `Your free account includes 1 lifetime free scan project, 25 credits / month for exports & tools, and 50 MB of storage. Scan a complete multi-page PDF or score image; scanning a new score requires a One Score Pass or plan.`

- `apps/www/src/lib/en-es-pricing.ts:13`（es，价格页） `Crea un proyecto completo a partir de un PDF de varias páginas o una imagen de partitura. Incluye 25 créditos al mes y 50 MB de almacenamiento. Usa las herramientas disponibles para editar, transponer, reproducir y exportar tu partitura.` → `La cuenta gratuita incluye un único proyecto de escaneo gratis de por vida, 25 créditos al mes para exportaciones y herramientas y 50 MB de almacenamiento. Puedes escanear un PDF completo de varias páginas o una imagen de partitura; para escanear una nueva partitura necesitas un Pase para una partitura (One Score Pass) o un plan.`

- `apps/www/src/lib/localized-pricing.ts:8`（de，价格页） `Erstellen Sie ein vollständiges Projekt aus einem mehrseitigen PDF oder Notenbild. Sie erhalten 25 Credits pro Monat und 50 MB Speicher. Bearbeiten, transponieren, spielen und exportieren Sie Ihre Partitur mit den verfügbaren Werkzeugen.` → `Das kostenlose Konto umfasst lebenslang genau ein kostenloses Scan-Projekt, 25 Credits pro Monat für Exporte und Werkzeuge sowie 50 MB Dateispeicher. Scannen Sie ein vollständiges mehrseitiges PDF oder ein Notenbild; für eine neue Partitur benötigen Sie einen Einzelpartitur-Pass (One Score Pass) oder einen Tarif.`

- `apps/www/src/lib/localized-pricing.ts:18`（ru，价格页） `Создайте один полный проект из многостраничного PDF или изображения нот. Доступны 25 кредитов в месяц и 50 МБ хранилища. Исправляйте, транспонируйте, воспроизводите и экспортируйте партитуру с помощью доступных инструментов.` → `Бесплатная учётная запись включает один бесплатный проект сканирования за всё время использования, 25 кредитов в месяц на экспорт и инструменты и 50 МБ для файлов. Можно отсканировать полный многостраничный PDF или изображение нот; для сканирования новой партитуры нужен пакет для одной партитуры (One Score Pass) или тариф.`

- `apps/www/src/components/FrenchPricingPage.tsx:24`（fr，价格页） `Créez un projet complet à partir d’un PDF multipage ou d’une image de partition, avec 25 crédits par mois et 50 Mo de stockage. Corrigez, transposez, écoutez et exportez votre partition avec les outils disponibles.` → `Le compte gratuit inclut un seul projet de numérisation gratuit à vie, 25 crédits par mois pour les exports et les outils, ainsi que 50 Mo de stockage. Numérisez un PDF multipage complet ou une image de partition ; pour numériser une nouvelle partition, il vous faut un Pass une partition (One Score Pass) ou une offre.`

- `apps/www/src/lib/feature-localization/locales/zh-CN.ts:100`（zh-CN，价格页） `Free 包含一个完整免费项目和每月 25 积分；Starter 每月 50 积分，Converter Pro 每月 200 积分。` → `免费账户包含终身 1 次免费扫谱项目、每月 25 积分（用于导出和工具），以及 50 MB 文件存储空间。可扫描完整的多页 PDF 或乐谱图片；扫描新乐谱需要单曲处理包（One Score Pass）或套餐。Starter 每月 50 积分，Converter Pro 每月 200 积分。`

- `apps/www/src/lib/feature-localization/locales/zh-TW.ts:78`（zh-TW，价格页） `Free 包含一個完整專案與每月 25 點；Starter 每月 50 點，Converter Pro 每月 200 點。` → `免費帳戶包含終身 1 次免費樂譜掃描專案、每月 25 點數（用於匯出與工具），以及 50 MB 檔案儲存空間。可掃描完整的多頁 PDF 或樂譜圖片；掃描新樂譜需要單曲處理包（One Score Pass）或方案。Starter 每月 50 點，Converter Pro 每月 200 點。`

- `apps/www/src/lib/feature-localization/locales/ja.ts:78`（ja，价格页） `Free は完全な1プロジェクトと月25クレジット、Starter は月50、Converter Pro は月200クレジットです。` → `無料アカウントには、生涯で1回の無料楽譜スキャンプロジェクト、書き出しやツールに使える毎月25クレジット、50 MB のファイルストレージが含まれます。複数ページの PDF 全体や楽譜画像をスキャンできます。新しい楽譜をスキャンするには、1曲パス（One Score Pass）またはプランが必要です。 Starter は月50クレジット、Converter Pro は月200クレジットです。`

- `apps/www/src/lib/feature-localization/locales/ko.ts:78`（ko，价格页） `Free는 완전한 프로젝트 하나와 월 25크레딧, Starter는 50, Converter Pro는 월 200크레딧을 포함합니다.` → `무료 계정에는 평생 1회 무료 악보 스캔 프로젝트, 내보내기와 도구에 사용할 수 있는 월 25크레딧, 50 MB 파일 저장 공간이 포함됩니다. 여러 페이지 PDF 전체나 악보 이미지를 스캔할 수 있습니다. 새 악보를 스캔하려면 한 곡 이용권(One Score Pass) 또는 요금제가 필요합니다. Starter는 월 50크레딧, Converter Pro는 월 200크레딧을 포함합니다.`

## 验证结果

在隔离 worktree 内使用 `npm ci --no-audit --no-fund` 安装锁文件依赖。构建使用 `NEXT_TELEMETRY_DISABLED=1`；www 与 app 生产打包使用 `SCORE_SELF_HOSTED=true`，生成 standalone 构建。www 原版与修改版采用相同配置及 Next.js 16.3.0。app 的默认 Turbopack 构建在本机 compile 阶段长时间停滞，停止该本地进程后通过 `--webpack` 重试，51 秒完成编译并成功打包；没有修改构建脚本或配置源码。

| 检查 | 结果 |
| --- | --- |
| `npm ci --no-audit --no-fund` | 通过（exit 0） |
| `npm run build -w @score/i18n` | 通过（exit 0） |
| `npm run build -w @score/shared` | 通过（exit 0） |
| `npm run build -w @score/ui` | 通过（exit 0） |
| `npm run typecheck -w @score/www` | 通过（exit 0） |
| `npm run typecheck -w @score/app` | 通过（exit 0） |
| `npm run test -w @score/www (95/95)` | 通过（exit 0） |
| `npm run build -w @score/www (clean c231bf6 baseline)` | 通过（exit 0） |
| `npm run build -w @score/www (fixed)` | 通过（exit 0） |
| `npm run build -w @score/app -- --webpack` | 通过（exit 0） |
| `node ../evidence/verify-browser.cjs baseline + fixed (18 routes each)` | 通过（exit 0） |
| `node ../evidence/verify-curl.cjs baseline + fixed (4 routes each)` | 通过（exit 0） |

先对未修改的 `c231bf6` 构建并在 `127.0.0.1:21820` 启动 www，保存原版基线；随后停止该本地进程、修改正文、重新构建并启动修改版。真实 Microsoft Edge（Playwright 1.55.1，headless）在页面完成加载后逐页确认九种语言共 18 页，每页新说明恰好出现在一个可见 `<p>` 中，且对应旧正文已移除。首页启用了 `content-visibility: auto`，验收先滚动至 `#pricing`，再确认免费说明有实际可见文字，避免仅凭未滚动页面的 `body.innerText` 下结论。浏览器工具与 HTML 解析器只读复用本机已有依赖；被测源码、构建及运行进程均来自隔离 worktree。浏览器保留正文、CSS 与 JS，跳过图片和视频加载，并拦截外部请求与认证请求，不访问生产 API，也不创建账户或扫谱任务。本次截图用于说明正文验证，不作为图片、视频或完整视觉验收。

18 页 title、H1（文字及 HTML）、全部 meta、canonical/hreflang、页面链接 URL、JSON-LD、FAQ 问答及首页英雄区副标题均与原版逐项完全一致。额外使用 `curl.exe --fail --noproxy '*'` 检查 `/`、`/pricing`、`/zh-cn`、`/zh-cn/pricing`，确认新说明已存在于服务端渲染 HTML，四页 title/H1/meta、JSON-LD 与 FAQ 也与原版一致。

修改版本地运行入口为 `apps/www/.next/standalone/apps/www/server.js`。仅在 worktree 的忽略构建目录中，将 public 与 .next/static 连接到本 worktree 的对应资产目录，用于本机运行产物验收，没有向服务器或部署平台发布。

| 本地页面 | 新说明 | 与 c231bf6 的受保护内容比较 |
| --- | --- | --- |
| `/` | HTTP 200，可见正文通过 | 完全一致 |
| `/pricing` | HTTP 200，可见正文通过 | 完全一致 |
| `/zh-cn` | HTTP 200，可见正文通过 | 完全一致 |
| `/zh-cn/pricing` | HTTP 200，可见正文通过 | 完全一致 |
| `/zh-tw` | HTTP 200，可见正文通过 | 完全一致 |
| `/zh-tw/pricing` | HTTP 200，可见正文通过 | 完全一致 |
| `/ja` | HTTP 200，可见正文通过 | 完全一致 |
| `/ja/pricing` | HTTP 200，可见正文通过 | 完全一致 |
| `/ko` | HTTP 200，可见正文通过 | 完全一致 |
| `/ko/pricing` | HTTP 200，可见正文通过 | 完全一致 |
| `/fr` | HTTP 200，可见正文通过 | 完全一致 |
| `/fr/pricing` | HTTP 200，可见正文通过 | 完全一致 |
| `/es` | HTTP 200，可见正文通过 | 完全一致 |
| `/es/pricing` | HTTP 200，可见正文通过 | 完全一致 |
| `/de` | HTTP 200，可见正文通过 | 完全一致 |
| `/de/pricing` | HTTP 200，可见正文通过 | 完全一致 |
| `/ru` | HTTP 200，可见正文通过 | 完全一致 |
| `/ru/pricing` | HTTP 200，可见正文通过 | 完全一致 |

范围校验逐文件逆向还原 18 处字符串替换，与 `git show c231bf6:<file>` 比较：除 Git 换行归一外所有其他内容完全一致。构建自动生成的日语价格社交图及社交图 manifest 均已恢复到基线，不随提交加入；提交仅包含说明正文及本报告。

www 单测共 95 项，全部通过，无失败、跳过或取消。构建日志保留已有 middleware 弃用提示；app Webpack 构建还包含 Next.js 内部模块使用 `process.cwd` 与 Edge Runtime 不兼容的警告，最终编译、类型检查与打包均成功。Turbopack 的 app 打包本轮未验证成功，采用上述 Webpack 结果完成 app 打包检查。

执行证据保存在本机 `.tmp/free-copy-fix-20261010/evidence/`：`changes.json`、构建/类型检查/单测日志、`baseline/` 与 `fixed/` 的浏览器和 curl JSON、四个中英文页面的完整正文、HTML、截图。证据目录与本地构建产物不加入 Git。

主工作区最终复核：HEAD 未改变，78 条未提交状态逐字一致，开始时快照中的 993 个路径状态（含删除项）逐项一致；现有未提交内容未改变。

## Git 交付

使用 `git add -- <整文件路径...>` 纳入上述 16 个源码文件及本报告；英文提交说明：`fix(www): clarify lifetime free scan allowance across nine locales`。通过普通 `git push origin HEAD:refs/heads/codex/commercial-mvp-seo-production` 推送，未使用 `-p`、`-i` 或 force push。推送完成后的提交号与远端一致性以执行回执提供；本报告位于同一提交内。

本次到提交与普通推送为止。没有部署，也没有执行任何服务器操作。
