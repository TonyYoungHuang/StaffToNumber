# ScoreTransposer 美国优先的 Cloudflare 部署方案

更新时间：2026-08-15

## 1. 市场与区域原则

ScoreTransposer 的首发市场是美国，欧洲是第二阶段市场，中国大陆不是目标生产市场。

- 默认产品语言使用美式英语，默认计价货币使用美元。
- 第一生产区域使用 Cloudflare `ENAM`（北美东部），以兼顾美国用户和跨大西洋访问。
- 官网和产品入口通过 Cloudflare 全球网络提供，不将美国用户流量回源到中国大陆。
- 欧洲扩展阶段增加 `WEUR` 计算池、R2 EU jurisdiction 和欧洲数据处理条款，不直接复用美国用户数据集作为欧洲数据驻留方案。

## 2. 目标生产拓扑

```text
Browser
  -> Cloudflare DNS / WAF / CDN / Turnstile
  -> www.scoretransposer.com       (Vercel during first release)
  -> app.scoretransposer.com       (Vercel during first release)
  -> api.scoretransposer.com       (Cloudflare ingress Worker)
       -> API Container            (ENAM)
       -> Collaboration Container  (ENAM, WebSocket)
       -> managed PostgreSQL       (US East)
       -> managed Redis/BullMQ     (US East, initial compatibility phase)
       -> private R2 bucket        (North America location hint)
       -> job containers
            -> OMR: Audiveris
            -> notation: music21 / MuseScore
            -> audio: FluidSynth / licensed SoundFont / ffmpeg
            -> transcription: Basic Pitch / restricted yt-dlp importer
```

Cloudflare Workers 只负责入口、鉴权前置、限流、签名上传、任务路由和轻量 API。Audiveris、MuseScore、FluidSynth、ffmpeg、Basic Pitch 等原生工具必须运行在 Cloudflare Containers，不得运行在普通 Worker 中。

## 3. Cloudflare 产品映射

| 平台能力 | 首发实现 | 后续演进 |
| --- | --- | --- |
| DNS、TLS、WAF、Bot 防护 | Cloudflare DNS/WAF/Turnstile | 按风险增加付费规则 |
| 官网与产品前端 | 首发保留 Vercel，由 Cloudflare 管理 DNS | 验证收益后再决定是否迁移 Workers Static Assets |
| API 入口 | Cloudflare Worker | 将适合边缘运行的只读接口逐步移入 Worker |
| API 运行时 | Cloudflare Container，固定 ENAM，PostgreSQL 主仓储 | 完成连接池压测与恢复演练后横向扩容 |
| 用户上传 | 浏览器通过短期签名直接 multipart 上传 R2 | 欧洲用户使用 EU jurisdiction bucket |
| 乐谱任务 | 按任务类型拆分 Container 镜像 | 按队列积压自动扩缩容并增加 WEUR 池 |
| 数据库 | 托管 PostgreSQL，美国东部 | 欧洲业务达到阈值后制定区域数据分区 |
| 队列与限流 | 首发使用托管 Redis/BullMQ 以兼容现有代码 | 稳定后评估 Cloudflare Queues/Workflows |
| 实时协作 | 首发使用 Hocuspocus Container + Redis | 评估 Durable Objects + Yjs 区域房间 |
| 文件存储 | 私有 R2，版本化、生命周期和校验和 | EU bucket、跨区域恢复副本 |
| 观测 | Cloudflare Logs/Analytics + 应用 trace ID + 外部告警 | OpenTelemetry collector 和统一值班平台 |

## 4. 运行时改造状态

API、Worker 和 Collaboration 已统一接入 PostgreSQL 运行时；staging/production 对 `RUNTIME_DATABASE_PRIMARY=postgres`、`POSTGRES_URL` 和合法 schema 强制 fail-closed，三个服务启动时验证各自依赖表。Neon staging 已完成目录校验与事务写入、读取、回滚探针，Worker 的专用 readiness 模式不会领取真实任务。SQLite 只保留为本地开发、测试和历史迁移来源，不能在 staging/production 被选择。

已完成：

1. API、Worker、Collaboration 共用 PostgreSQL runtime adapter，并绑定显式 schema 和单事务连接。
2. 保留 SQLite -> PostgreSQL 迁移、shadow parity 和回滚工具，用于受控数据迁移和证据生成。
3. 任务、候选修订、账单 webhook、通知 outbox、删除 outbox 和协作更新均从同一 PostgreSQL schema 读写。
4. API、Collaboration 启动门禁和 Worker 无消费 readiness 事务已在真实 Neon staging 连接上通过。

仍需在开放生产付费前完成：

1. R2 multipart 直传、恶意文件隔离、校验和、生命周期与恢复演练。
2. Worker 单任务临时目录清理和所有输入/产物回写 R2 的实际 Container 验收。
3. 外部引擎 `linux/amd64` 镜像资格、SoundFont 商用许可和声学 golden。
4. API、队列、Container、PostgreSQL、Redis、R2 与协作服务的完整分布式 trace、告警和值班升级演练。

PostgreSQL 运行时阻断已经解除；Cloudflare staging 可进行端到端验证，但仍不得绕过第 10 节中的其他生产阻断条件。

## 5. Container 划分与初始资源

| Container | 初始规格建议 | 并发 | 说明 |
| --- | --- | --- | --- |
| API | `standard-1` | 按压测调整 | 不运行音乐引擎，不保存本地状态 |
| Collaboration | `standard-1` | 按房间路由 | WebSocket、Yjs/Hocuspocus |
| OMR | `standard-4` | 每实例 1 个任务 | Audiveris/Java，多页 PDF 内存压力较高 |
| Render | `standard-3` 或 `standard-4` | 每实例 1 个任务 | MuseScore、FluidSynth、ffmpeg |
| Transcription | `standard-4` | 每实例 1 个任务 | Basic Pitch CPU 推理，首发标记实验功能 |

以上规格只是 staging 起点。上线规格必须由真实多页 PDF、30 分钟音频、并发导出和冷启动测试决定。任何任务超过平台限制时，先保留同一任务协议，再将该任务池迁移到美国东部专用计算节点，不能退回中国大陆服务器。

## 6. 环境与域名

| 环境 | 域名 | 数据 |
| --- | --- | --- |
| development | localhost | 本地测试数据 |
| staging | `staging.scoretransposer.com`、`api-staging.scoretransposer.com` | 独立 PostgreSQL、Redis、R2 bucket |
| production | `scoretransposer.com`、`www.scoretransposer.com`、`app.scoretransposer.com`、`api.scoretransposer.com`、`collab.scoretransposer.com` | 独立生产资源 |

禁止 staging 与 production 共用数据库、R2 bucket、Redis namespace、Stripe webhook secret、Resend domain 或管理员凭据。生产密钥只进入 Cloudflare secrets 或对应托管服务的 secret store，不写入仓库、镜像和构建日志。

## 7. 美国首发顺序

### 阶段 A：基础资源

- 将 `scoretransposer.com` 接入 Cloudflare DNS，但先保留当前 Vercel 前端解析。
- 开通 Workers Paid、Containers、R2，并创建完全隔离的 staging 资源。
- 创建美国东部 PostgreSQL 和 Redis，配置最小权限、TLS、备份和恢复保留期。
- 创建 `api-staging`、`collab-staging` 和任务队列入口，不改生产 DNS。

### 阶段 B：运行时改造

- 已完成 PostgreSQL 主仓储、生产 fail-closed、表门禁和真实 Neon 事务探针。
- 完成 R2 multipart 直传、取消、断点续传、恶意文件隔离和生命周期清理。
- 构建并发布 API、Collaboration、OMR、Render、Transcription 镜像。
- 将现有 BullMQ/outbox 链路部署到托管 Redis，完成重复交付和实例中断恢复测试。

### 阶段 C：staging 验收

- 验证真实 Audiveris、music21、MuseScore、FluidSynth、ffmpeg、Basic Pitch 和 yt-dlp 工具矩阵。
- 验证 200 份合法真实乐谱基准、音频 golden、PDF 回开、30 分钟漂移和浏览器矩阵。
- 完成支付、退款、邮件、版权、账户导出/删除、备份恢复、告警和回滚演练。
- 连续完成至少 7 天 staging soak，期间不得出现未解释的数据丢失、任务重复结算或跨租户访问。

### 阶段 D：生产发布

- 冻结发布提交并生成 release manifest。
- 创建生产数据库、Redis、R2 和 Container deployments，不从 staging 复制密钥。
- 发布 `api`、`collab` DNS，更新 Vercel 的公开 API 地址，再发布官网和产品端。
- 验证 sitemap、robots、canonical、hreflang、OG、结构化数据和 Search Console。
- 灰度开放注册和支付，监控错误率、队列年龄、Container 冷启动、数据库连接和 R2 失败率。

## 8. 欧洲扩展触发条件

出现以下任一条件时启动欧洲区域建设：

- 欧洲月活或付费收入达到总量的 20%。
- 企业或学校客户明确要求欧盟数据驻留。
- 欧洲 P95 API/上传完成时间持续不达标。
- GDPR 数据处理评估要求欧盟境内存储或处理。

欧洲阶段增加 `WEUR` Container placement、R2 EU jurisdiction、欧洲数据库方案和区域路由。不能只增加 CDN 后就宣称已完成欧盟数据驻留。

## 9. 中国大陆基础设施隔离原则

中国大陆服务器及其全部程序属于其他独立业务，与 ScoreTransposer 没有任何产品、代码、数据或运维关系。本项目在设计、开发、测试、部署和故障处置中均视其不存在。

- 不连接、检查、修改或部署任何 ScoreTransposer 组件到中国大陆服务器。
- 不读取、迁移、复用或参考中国大陆服务器上的代码、配置和数据。
- 不将其用作开发、staging、生产、回源、故障转移、备份、日志、监控或运维跳板。
- 不让美国或欧洲用户的账户、乐谱、音频、支付信息、日志或任何生产数据经过中国大陆服务器。
- ScoreTransposer 的全部基础设施清单只能包含 Cloudflare、Vercel及明确批准的美国/欧洲托管服务。

当前 `scoretransposer.com` 和 `www.scoretransposer.com` 指向 Vercel；`app.scoretransposer.com` 和 `api.scoretransposer.com` 尚待按本方案配置。此域名体系不得增加指向中国大陆基础设施的记录。

## 10. 发布阻断条件

以下任一项未完成时，不得开放生产付费：

- R2 直传、隔离、校验和、生命周期或恢复演练未通过。
- Container 镜像没有真实引擎资格报告，或 SoundFont 商用许可未确认。
- PostgreSQL/Redis 没有备份恢复证据和故障切换演练。
- Stripe 生产 webhook、退款、续费失败和降级流程未验证。
- 端到端 trace、告警和值班升级链路未到达真实接收人。
- 隐私、版权、Cookie、GDPR/CCPA 和数据删除流程未完成签署与演练。
- 美国真实设备、移动网络、休眠恢复和 7 天 soak 未通过。
