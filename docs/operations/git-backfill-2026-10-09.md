**Git 生产源码补录回执｜2026-10-09**

已把 9—10 月已经上线、但长期留在本地的实现补入 Git，并保留 10 月 9 日的 P1–P5。预付 50/200 积分套餐继续留在本地，没有加入这个分支。此次仅存档、构建、测试和推送；没有部署、修改服务器、迁移生产数据库或创建真实付款。

目标分支：`codex/commercial-mvp-seo-production`。补录前是 `fda09f2`，其父提交为 `fa380b9`；这两个提交仍在完整历史中。本轮代码验证对应 `00507b9`，最后另提交本文和两个包装脚本的执行标记，产品源码文本不再改变。

**本次以哪一个线上版本为准**

前端采用 `20261008-credits1`，API/Worker 采用 `20261007-progress1`。2026-10-09T14:52:47.162292+00:00 的只读 SSH 复核确认版本选择器和运行文件：WWW 1,996 项、App 1,836 项、API/Worker 各 199 项，哈希不匹配均为 0。正式 API 的 schema 为 25，没有预付套餐后端。

恢复来源是与服务器发布清单对应的已留存构建源码快照，而不是把本地全部文件一起提交。遇到本地比线上更新的文件，采用线上内容加已确认的 P1–P5；本地原文件完整保留。线上旧发布所写的 `4920c45` 只是当时脏工作区的 Git 基准，不能冒充完整生产提交。

**分组提交**

| 提交 | 补回什么 |
| --- | --- |
| `1ab2d5f`（93 个路径） | 补回单谱 US$2.99、一次性购买、支付回调及权益发放、激活码登录；失败/取消返还、简单 1 分/复杂 5 分、50/250/500 MB 存储；恢复正式 schema 25 和对应依赖。删除此前误混入的预付套餐共享入口，P5 免费规则保留。 |
| `978ae29`（164 个路径） | 补回简单/复杂识谱、原文件保护、图像与逐页 PDF 恢复、真实进度，以及 Python 适配器。128 个第三方源码文件与线上核对通过，附许可证和固定版本；模型与执行环境没有入库。 |
| `7a7b494`（97 个路径） | 补回根页面的语言、会话和登录弹窗接线、两个识谱工作台、编辑与合奏入口、已有显示资源；叠加保留 P2 游客草稿、P3 两步扫描、P4 自动结账和 P5 升单。 |
| `72922d3`（266 个路径） | 补回九语言正文、FAQ、SEO 元信息、当前扫描地址及旧地址 301、首页广告片、定价/购买接线、图标与分享图；保留 P1–P5 的购买和免费规则。 |
| `c84260d`（89 个路径） | 补回 Hetzner 构建/Compose/SQL、Cloudflare 暂停保护和发布记录。历史验收 JSON 的身份/凭据字段脱敏。公开前端构建值转为 public-build.json；真实 .env、密钥和临时文件不提交。 |
| `66da6e3`（5 个路径） | 把旧 Cloudflare 两个部署入口接上现有暂停保护，保留只构建的例外；README 对齐 Hetzner 现状，SEO 检查器对齐九语言，已部署 E2E 可指定 Hetzner 的健康地址。四个脚本语法和 i18n 引用通过；两条部署入口均确认在暂停状态下立即拒绝执行。 |
| `00507b9`（4 个路径） | 补回复杂识谱实际读取的 4 个 tokenizer JSON；本地原件与线上逐文件 SHA 一致，Git 仅归一换行，解析内容一致。这些是运行词表，不是模型权重。 |
| 本文的最后一次说明提交 | 中文归档说明、完整剩余差异与本轮验证结果；同时保留两个引擎包装脚本的 Git 可执行标记，与线上 755 一致；不增加产品功能。 |

每组都在项目 `.tmp` 下的隔离 Git worktree 中整理，用 `git add --` 明确完整文件路径暂存。没有使用全仓 `git add .`、交互式暂存、reset/clean/checkout 丢弃改动或强制推送。

**验证结果**

| 验证 | 结果 |
| --- | --- |
| 干净 Git 源码 | 工作树干净；Git archive 与实际测试源码不匹配 0。 |
| 与线上构建源码对比 | 1,117 文件一致（统一换行后）；60 文件为保留的 P1–P5及公开构建配置格式差异；预期外差异、应保留而缺失的源码均为 0。 |
| 不收入 Git 的构建上下文文件 | 6 个自动生成的协作/类型文件或旧迁移产物，不属于产品运行代码；公开 .env 改以 JSON 保存同值配置。 |
| 后端运行文件对照 | 192/199 相同，其中 API 92 项、Worker 31 项全部相同。3 项是 P3/P5 的 shared/i18n 编译文案；其余 4 项是旧镜像中未被当前源码引用的 shared 残留产物，干净构建不再生成。 |
| 依赖与编译 | 使用提交内 lockfile 完成 npm ci；i18n/shared/ui/storage/runtime-database 五包构建、WWW/App 类型检查、API/Worker/Collaboration 编译均通过。 |
| 两个前端打包 | 使用公开构建配置和 self-hosted 配置打包通过；99 个分享图均已验证，无新增重绘。 |
| 国际化 | 19 通过，0 跳过，0 失败。 |
| 存储 | 10 通过，0 跳过，0 失败。 |
| 运行数据库 | 11 通过，0 跳过，0 失败。 |
| 官网 | 95 通过，0 跳过，0 失败。 |
| App | 158 通过，0 跳过，0 失败。 |
| Worker | 79 通过，1 跳过，0 失败。 |
| API 单测 | 200 通过，0 跳过，0 失败。 |
| 识谱/额度 | 44 通过，2 跳过，0 失败。 |
| API 集成 | 72 通过，0 跳过，0 失败。 |
| 转化相关补充单测 | 11 通过，0 跳过，0 失败。 |
| Python | 结构预检 23 项、复杂识谱适配器 21 项全部通过。 |
| 本地生产包浏览器回归 | 官网 10 项、App 7 项通过，页面运行错误 0；Google/支付/API 使用模拟服务，外部分析请求被阻断。 |

Worker 第一次与多个检查并行时，有 1 项图像处理在约 2 秒的测试期限内超时。未改变生产代码，降低测试并发后完整复跑：79 通过、1 跳过、0 失败。共 3 项外部环境检查跳过：Worker 真实 Redis、PostgreSQL 用户锁并发，以及经认证 API 调用真实无模型 Python 适配器。没有提供相应专用环境，不能把它们写成新完成的真实联调验收；Python 适配器的 44 项独立测试已通过。

浏览器已实测：原地 Google/邮箱登录后自动续接购买、保持选中套餐和滚动位置、返回与取消、防重复提交、付款失败同幂等键重试、九语言定价；App 游客文件跨登录保留、移动免费扫描两步、US$2.99 单谱主入口、简繁中文银行卡/订阅/激活码分开及对应分析事件。此次没有真实 Google 账号授权、真实扣款或 GA4 后台配置验收。

**仍只在本地的内容**

- 预付套餐整体：50/200 积分定义、兑换/发码、余额、预留/释放、额外存储档位、schema 26 和迁移，以及配套测试；本轮没有另外建立或合并预付分支。
- 重点文件：`services/api/src/lib/prepaid-credits.ts`、`prepaid-schema.ts`、`prepaid-credits.test.ts`、`prepaid-postgres.test.ts`、`deploy/hetzner/prepaid-credit-packs.sql`、`packages/shared/src/shop-credit-packs.ts`。混合文件中的预付部分也保留在本地，见下面完整差异清单。
- 本地另外保留未采用的第三方完整源码/测试资料，例如完整 Smoosic 库。线上实际使用的已适配 selector 和 MIT 许可证已归档；不把整个研究库、样例数据库和模型权重一起提交。
- `.tmp`、依赖、编译产物、真实环境与认证文件继续留在本地或既有服务器位置，没有加入新提交。历史审计原文件保持原样，Git 中采用脱敏副本。

开工前 2554 个 Git 可见原文件逐项复核，原内容变化 0。与归档版本相比，本地有 44 个已有路径仍存在内容差异、948 个原文件未纳入归档；其中 third_party 为 941 个。文件数不等于功能数。完整逐文件分类和哈希证据保存在项目 `.tmp/git-backfill-2026-10-09/`，不会发布进 Git。

**是否可以从 Git 发布**

可以把这次 Git 版本作为下一次应用发布的源码候选：类型检查、打包、业务单测和本地转化流程均已通过，已补齐当前生产功能，没有把预付 schema 26 混入。它不是当前线上版本的逐字复制，因为明确保留了尚未上线的 P1–P5。

真正制作后端发布镜像时，须继续承接当前已验收的 `scoretransposer-worker:20261007-progress1` 原生环境，或在隔离环境按固定源码/六个模型 SHA 重新完成原生环境资格检查。模型、Python 原生执行环境及私有运行配置不存进 Git；基础 Dockerfile.worker 本身不能被当作已包含全部复杂识谱环境的新镜像。应用更新定义和固定版本初始化/离线核验脚本已归档，本轮没有重建或验收新的原生容器。

后续应从这个提交的干净检出构建，沿用既有正式配置、schema 25、模式报价和存储限制，再完成真实登录/支付与发布健康检查。不要使用仍包含预付实验内容的原脏工作区直接覆盖线上。

**本地与归档仍有差异的完整路径**

以下包含预付混合文件、更新的测试、脱敏记录和公开配置格式差异；不是说这些路径全都代表一个未上线功能。

- `.dockerignore`
- `apps/app/src/components/ActivationForm.tsx`
- `apps/app/src/components/AdminActivationCodesManager.tsx`
- `apps/app/src/components/BillingManager.tsx`
- `apps/app/src/components/ShopActivation.tsx`
- `apps/app/src/lib/billing-messages/locales/de.ts`
- `apps/app/src/lib/billing-messages/locales/en.ts`
- `apps/app/src/lib/billing-messages/locales/es.ts`
- `apps/app/src/lib/billing-messages/locales/fr.ts`
- `apps/app/src/lib/billing-messages/locales/ja.ts`
- `apps/app/src/lib/billing-messages/locales/ko.ts`
- `apps/app/src/lib/billing-messages/locales/ru.ts`
- `apps/app/src/lib/billing-messages/locales/zh-CN.ts`
- `apps/app/src/lib/billing-messages/locales/zh-TW.ts`
- `apps/app/src/lib/billing-messages/types.ts`
- `apps/app/src/lib/shop-activation.ts`
- `deploy/backend/Dockerfile`
- `deploy/cloudflare/Dockerfile.api`
- `deploy/hetzner/Dockerfile`
- `deploy/hetzner/build-frontends.mjs`
- `docs/audits/home-layout-pricing-production-2026-10-01.json`
- `docs/audits/homepage-auth-single-score-production-2026-10-01.json`
- `docs/audits/product-background-light-production-2026-10-01.json`
- `docs/audits/product-background-production-2026-10-01.json`
- `docs/audits/product-commercial-production-2026-10-01.json`
- `docs/music-notation-platform-development.md`
- `packages/runtime-database/src/storage-quota.ts`
- `packages/shared/src/index.ts`
- `services/api/.env.example`
- `services/api/src/db.ts`
- `services/api/src/lib/plan-quotas.ts`
- `services/api/src/lib/postgres-migration.ts`
- `services/api/src/lib/recognition-options.ts`
- `services/api/src/plugins/auth.ts`
- `services/api/src/repositories/account-lifecycle-repository.ts`
- `services/api/src/repositories/auth-repository.ts`
- `services/api/src/repositories/job-repository.ts`
- `services/api/src/repositories/score-repository.ts`
- `services/api/src/routes/activation.test.ts`
- `services/api/src/routes/admin-activation.ts`
- `services/api/src/schema-version.ts`
- `services/worker/.env.example`
- `services/worker/src/audiveris-runner.test.ts`
- `services/worker/src/pdf-recovery.test.ts`

**可继续核对的记录**

[P1–P5 文件与边界](p1-p5-change-list-2026-10-09.md)、[此前部署前依赖/人工配置检查](predeploy-gaps-2026-10-09.md)、[双工作台发布](../deployments/score-workspaces-2026-10-07.md)、[恢复发布](../deployments/score-recovery-2026-10-07.md)、[进度发布](../deployments/score-processing-feedback-2026-10-07.md)、[积分文案发布](../deployments/credit-rules-2026-10-08.md)。

本轮服务器操作全部只读。推送使用 origin 同名工作分支的普通快进；main 与其他分支不改动。本地临时文件均位于本项目 `.tmp`。
