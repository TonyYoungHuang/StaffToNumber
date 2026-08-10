# 生产观测栈

此目录为 `deploy/backend/compose.yaml` 提供 Prometheus、Alertmanager、Grafana、Loki 与 Grafana Alloy 的组合覆盖层。它只监听本机 `127.0.0.1:3002`；通过 SSH tunnel、VPN 或受认证的反向代理访问 Grafana，禁止直接暴露监控面板或 Prometheus/Loki/Alertmanager 端口。

## 启动前准备

在 `deploy/observability/secrets/` 创建以下三个私有文件。它们已被 Git 忽略，内容末尾允许换行。

| 文件 | 内容 |
| --- | --- |
| `api-metrics-bearer-token` | 与后端 `.env.production` 中 `METRICS_BEARER_TOKEN` 完全相同的随机值。 |
| `alert-webhook-url` | 经过验证、能接收 Alertmanager JSON 的 HTTPS 值班 Webhook。 |
| `grafana-admin-password` | 独立、高强度的 Grafana 管理员密码。 |

确认 `METRICS_BEARER_TOKEN` 不曾进入官网、产品端环境变量、Caddy 配置或日志。必要时可用 `openssl rand -base64 48` 生成令牌和密码；Alertmanager Webhook 必须使用 HTTPS。

从 `deploy` 目录启动：

```powershell
docker compose -f backend/compose.yaml -f observability/compose.yaml --profile observability up -d
```

`LOKI_IMAGE` 可在环境中覆盖，默认值是 `grafana/loki:3.7.0`。上线前应锁定并审查实际镜像 digest，而不是长期依赖浮动标签。

## 验收顺序

1. 访问 `http://127.0.0.1:3002` 并使用私有管理员密码登录。
2. 在 Prometheus targets 中确认 `score-api` 为 `UP`，在 Grafana Explore 查询 `{product="scoretransposer"}` 确认容器日志进入 Loki。
3. 临时停止 API 容器超过两分钟，确认 `ScoreApiUnavailable` 到达值班 Webhook；恢复容器后确认 resolved 事件也到达。
4. 将值班 Webhook、Grafana 管理员密码和指标令牌轮换一次，重启观测服务并复测。轮换过程与结论写入变更记录。

此栈提供集中日志、API 指标和可执行告警入口；它不替代跨 API/Worker/Collaboration 的 OpenTelemetry trace、外部告警平台升级规则或 24x7 人员排班。完整投产标准和事故步骤见 `docs/operations/on-call-runbook.md`。
