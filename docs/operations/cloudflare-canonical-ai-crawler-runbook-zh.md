# Cloudflare 主域规范化与 AI 爬虫放行手册

更新时间：2026-08-25

## 目标状态

- `http://scoretransposer.com/*`
- `http://www.scoretransposer.com/*`
- `https://www.scoretransposer.com/*`

以上入口都应保留路径和查询参数，以 `301` 或 `308` 永久跳转到 `https://scoretransposer.com/*`。

公开 `robots.txt` 应允许 GPTBot、OAI-SearchBot、ClaudeBot、Google-Extended、PerplexityBot 等已声明 AI 爬虫访问；内部审计页 `/seo-audit` 与 `/operations-checklist` 继续禁止抓取。

## 本仓库实现

主域重定向在 Cloudflare Worker 的 Edge middleware 中完成，返回 `308`，先于 `/zh-cn` 语言路由改写执行。`wrangler.production.jsonc` 使用 `assets.run_worker_first=true`，确保图片、字体等静态资源也先经过主域规范化；这会增加 Worker 请求量，是覆盖“所有路径”所需的明确成本取舍。源站 `robots.txt` 显式列出需要放行的 AI user-agent，并保留内部审计页限制。

生产审计命令：

```powershell
node scripts/audit-production-seo.mjs `
  --base-url https://scoretransposer.com `
  --require-canonical-host `
  --require-ai-crawlers `
  --expected-sitemap-count 64
```

## Cloudflare 控制台必须同步的设置

Cloudflare 的 Managed robots.txt 会在 Worker 返回的源站内容之前追加规则。只改代码无法覆盖其针对 GPTBot、ClaudeBot、Google-Extended 等 user-agent 的 `Disallow: /`。

在域名 `scoretransposer.com` 的 Cloudflare 控制台完成：

1. 打开 **Security Settings → Bot traffic**，关闭 **Set your preference to block training in robots.txt**，即关闭 Managed robots.txt。
2. 打开 **Security Settings → Configure AI bot policies**。
3. 将 **Search、Agent、Training** 三类都设为 **Allow (do not block)**。
4. 如果单独启用了 **AI Labyrinth** 或自定义 WAF Bot 规则，确认这些规则没有拦截上述已允许的 verified bots。
5. 清理缓存后重新请求 `/robots.txt`，确认不再出现 Cloudflare Managed Content 中的 AI crawler `Disallow: /`。

Cloudflare 官方说明：

- [Managed robots.txt](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/)
- [Configure AI bot policies](https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/)
- [Bot Management API](https://developers.cloudflare.com/api/resources/bot_management/methods/update/)

## API 方式与权限

如使用 API Token，至少需要该 Zone 的 **Bot Management Write** 权限。更新时应关闭托管 robots 和旧版 AI crawler 阻断；行为级 Search / Agent / Training 设置仍以控制台显示为准。

建议的最小更新字段：

```json
{
  "ai_bots_protection": "disabled",
  "crawler_protection": "disabled",
  "is_robots_txt_managed": false,
  "cf_robots_variant": "off"
}
```

不要为了放行 verified AI crawlers 而无差别关闭所有 WAF、速率限制或登录防护。

## 2026-08-25 执行记录

- Worker 侧 308 规范化和源站 AI crawler Allow 已实现并有自动化测试。
- 当前 Wrangler OAuth 可以部署 Worker，但调用 Zone Bot Management 更新接口返回 `403`，缺少 **Bot Management Write**；因此 Cloudflare 控制台开关仍需使用具备该权限的会话完成。
- 生产验收必须同时通过主域重定向检查和 `--require-ai-crawlers` 检查；任何一个失败都不能宣称 AI crawler 已真正放行。
