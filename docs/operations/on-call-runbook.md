# 值班与告警运行手册

## 适用范围

本手册适用于 ScoreTransposer 的 API、Worker、Collaboration、Redis/BullMQ、ClamAV、R2/S3 与 PostgreSQL 主仓储。所有事故记录必须包含 UTC 时间、影响范围、负责人、`x-request-id`、`x-trace-id`、相关 job/score/revision ID、处置动作和恢复证据。不得在工单、日志或聊天中记录密码、session、LTI token、支付 webhook 原文、版权查询码或未脱敏用户文件。

## 值班级别

| 级别 | 响应 | 处理目标 | 示例 |
| --- | --- | --- | --- |
| P1 | 15 分钟 | 4 小时内恢复或降级 | API 不可用、持续 5xx、审计写入失败、数据/密钥疑似泄漏。 |
| P2 | 4 小时 | 下一个工作日恢复 | p95 延迟升高、导出/OMR 队列积压、LMS 或支付 webhook 连续失败。 |
| P3 | 1 个工作日 | 排入版本计划 | 单一格式渲染错误、非阻断 SEO 或后台页面缺陷。 |

P1 由当班人员立即创建事故频道、指定 incident commander；30 分钟内给产品负责人同步用户影响。任何疑似泄漏、未授权访问、误删或付费权益错误均按 P1 处理，并停止相关自动化动作直到证据保全完成。

## 首十分钟通用步骤

1. 确认 Alertmanager 的告警、Grafana 时间范围和 `/health`，避免把单个采集失败误判为业务故障。
2. 用 `x-request-id`/`x-trace-id` 在 Loki 查询关联 API 日志；记录首个异常时间和最近一次正常时间。
3. 查阅 API、Worker、Collaboration 的 `service_runtime`、PostgreSQL 连接/事务/复制状态、Redis/BullMQ 积压、ClamAV 和 R2/S3 状态。
4. 只执行可逆操作：扩容 Worker、暂停入口、重放可证明幂等的 outbox。禁止删库、清 Redis、批量重跑支付 webhook 或覆盖候选修订。
5. 形成假设、证据和下一次更新时间；恢复后保留日志、队列、数据库和对象存储证据以供复盘。

## 告警处置

### API 不可用

核对入口 Worker、API 容器健康检查、PostgreSQL 连接池/慢查询/锁等待、Redis/ClamAV 依赖和最近部署。先回滚最新镜像或流量配置，再确认 `/__edge/health`、`/health`、经过认证的 `/metrics` 和一次登录/上传只读冒烟。不要因 API 容器重启而清理 BullMQ、outbox 或数据库记录。

### 持续 5xx 或高延迟

按 route template 分解 Prometheus 指标，再用 trace/request ID 查询 Loki。检查慢查询、S3 延迟、病毒扫描、媒体转码、Audiveris/MuseScore 子进程、队列年龄和速率限制。对重型任务可临时降低 Worker 并发或暂停新任务，但必须保留取消、重试和候选接受/拒绝流程。修复后至少观察 30 分钟并补回归测试。

### 安全审计写入失败

停止高风险管理、支付、版权和账户删除操作；检查 PostgreSQL 可用性、schema、权限、连接预算、审计盐和数据库锁。审计事件是证据链的一部分，未恢复前不得将服务标为完全恢复。恢复后核对缺失窗口，保留不可补写的时间段说明。

### 队列、Worker 或外部乐谱引擎异常

从 `score_jobs`/`jobs` 的稳定 ID 和输出快照定位；确认同一 dispatch 是否已经被 Worker 领取。只通过现有取消/重试接口重放，绝不直接编辑结果 revision。Audiveris、music21、MuseScore、FluidSynth、Basic Pitch、yt-dlp 与 ffmpeg 的超时、版本、命令输出和 SoundFont 许可证状态都要记录。若发现引擎输出异常，保持候选修订，不推广为正式谱。

### 对象存储或 PostgreSQL 异常

对象存储故障时停止提升隔离文件，保留本地隔离与删除 outbox；验证 SHA-256 后才恢复。PostgreSQL 异常时立即暂停写入型支付、账户删除、候选发布和管理操作，确认主库/只读副本角色、连接串、schema、恢复点与最近成功备份。不得自动回退到 SQLite；恢复或切换后必须运行表门禁、事务读写回滚探针和关键业务一致性核对。

## 恢复、复盘和演练

恢复条件是业务探针、指标、日志、队列、数据一致性和用户关键路径均正常，而不只是容器重新运行。P1/P2 在 5 个工作日内完成无责复盘：时间线、根因、用户影响、检测缺口、修复、回滚验证、负责人和截止日。

每季度至少演练一次：API 不可用、Redis/BullMQ 重启、ClamAV 不可达、R2/S3 恢复、PostgreSQL 主库恢复/切换、支付 webhook 重复交付、LTI token 失效和一条恶意文件阻断。演练必须在 staging 执行，记录 RTO/RPO、数据恢复校验和告警到达时间。
