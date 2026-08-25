# 活跃用户真人证据报表操作手册

更新时间：2026-08-25

## 目的与边界

该报表把同一 UTC 日期范围内的三类证据放在一起：

1. Cloudflare 的聚合请求、Bot 分类、ASN 和 unique IP 数量；
2. GA4 的活跃用户、互动会话、事件和关键事件；
3. 后端数据库中的注册账户、完成任务以及完成任务的去重账户数。

它用于判断流量是否同时产生了互动和真实产品动作，不会把 IP、GA4 active user 或一次点击直接宣称为一个真人。Cloudflare、GA4 与后端只做周期级交叉，不做访客身份拼接。

## 隐私要求

- 不上传或保存原始 IP、邮箱、`clientIp`、`ipAddress` 等直接标识符；接口会扫描结构化字段与自由文本并拒绝含这些内容的载荷。
- 只导入 `uniqueIpCount` 和 ASN 等聚合值。
- `path` 只填写不含查询参数或片段的站内 pathname，例如 `/score-editor`，避免把查询串中的标识符带入报表。
- GA4 数据必须来自同一日期范围，并记录是否已经排除内部流量。
- 后端数字由服务端在导入时计算并冻结，不由运营人员填写。
- 测试账户、员工账户或自动化任务若未排除，必须写入 `operatorNotes`，不得对外称为真实客户。

## 导入接口

管理员接口：

```text
POST /api/admin/seo/audience-evidence/import
X-Admin-API-Key: <ADMIN_API_KEY>
Content-Type: application/json
```

示例载荷：

```json
{
  "propertyUri": "https://scoretransposer.com",
  "startDate": "2026-08-18",
  "endDate": "2026-08-24",
  "cloudflare": {
    "zoneRef": "internal-export-reference",
    "exportedAt": "2026-08-25T02:00:00Z",
    "periodUniqueIpCount": 120,
    "rows": [
      {
        "date": "2026-08-24",
        "classification": "likely_human",
        "botScoreBucket": "30-99",
        "asn": 13335,
        "country": "US",
        "path": "/score-editor",
        "requests": 80,
        "uniqueIpCount": 12
      },
      {
        "date": "2026-08-24",
        "classification": "verified_bot",
        "botScoreBucket": "verified",
        "asn": 15169,
        "country": "US",
        "path": "/robots.txt",
        "requests": 20,
        "uniqueIpCount": 3
      }
    ],
    "sourceNotes": "Cloudflare export grouped by UTC date, bot class, ASN, country, and path."
  },
  "ga4": {
    "propertyRef": "internal-GA4-property-reference",
    "startDate": "2026-08-18",
    "endDate": "2026-08-24",
    "exportedAt": "2026-08-25T02:05:00Z",
    "activeUsers": 35,
    "engagedSessions": 24,
    "eventCount": 310,
    "keyEvents": 8,
    "internalTrafficExcluded": true,
    "consentMode": "consent_required",
    "topEvents": [
      { "eventName": "sign_up", "eventCount": 5, "activeUsers": 5 },
      { "eventName": "free_omr_preview_viewed", "eventCount": 3, "activeUsers": 2 }
    ],
    "sourceNotes": "GA4 totals queried for the whole period, not summed from overlapping page rows."
  },
  "operatorNotes": "Known employee and release-smoke accounts were excluded before interpretation."
}
```

`classification` 只接受：

- `likely_human`
- `verified_bot`
- `likely_automated`
- `unknown`

没有 Cloudflare Bot Score 时，不应臆造评分；根据已验证机器人标记和明确的运维规则分类，其余使用 `unknown`。

## 查看与导出

以下接口同样必须携带 `X-Admin-API-Key`：

```text
GET /api/admin/seo/audience-evidence
GET /api/admin/seo/audience-evidence?snapshotId=<SNAPSHOT_ID>
GET /api/admin/seo/audience-evidence/export?snapshotId=<SNAPSHOT_ID>
GET /api/admin/seo/audience-evidence/export?snapshotId=<SNAPSHOT_ID>&format=csv
```

报表会返回：

- Cloudflare 各分类请求数、自动化请求占比、聚合 unique IP 数和原始分段；
- GA4 同周期互动指标；
- 后端同周期注册数、完成的 legacy/score 任务数、完成任务的去重账户数；
- `signalLevel` 与固定方法论限制。

## 结论解释

| signalLevel | 含义 |
|---|---|
| `strong_cross_source_product_use_signal` | 边缘层存在 likely-human 请求、GA4 有互动会话、后端有完成任务账户；属于强跨来源产品使用信号，但仍不是逐人身份证明。 |
| `backend_product_use_signal` | 后端有完成任务账户，但另两类信号不完整或为零。 |
| `engaged_traffic_signal` | Cloudflare 与 GA4 有互动信号，但没有完成任务账户。 |
| `traffic_only` | 只有请求流量，不能证明用户真正使用产品。 |
| `no_observed_signal` | 本周期没有导入到可用信号。 |

对外汇报应使用“观察到产品使用信号”“完成任务的账户数”等表述，不使用“GA 活跃用户全部是真人”或“一个 IP 等于一个人”。
