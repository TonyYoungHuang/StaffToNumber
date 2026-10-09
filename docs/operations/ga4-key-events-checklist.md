# GA4 Key events 与跨子域验证清单

更新日期：2026-10-09 ・ 适用：GA4 媒体资源 `ScoreTransposer`（Property ID `550391758`，Measurement ID `G-CERGG48WWE`）

官方漏斗与事件定义见 `docs/operations/google-seo-funnel-runbook.md` 第 4 节：

```text
seo_landing_view → product_cta_click → sign_up → free_omr_created → free_omr_preview_viewed → upgrade_click → begin_checkout → purchase
```

## 1. 在 GA4 界面标记 Key events（需要账号所有者操作）

1. 打开 analytics.google.com，左上角确认媒体资源是 **ScoreTransposer**。
2. 左下角齿轮 **管理（Admin）** → 「数据显示（Data display）」→ **事件（Events）**。
3. 在「近期事件」列表里找到下面每个事件，把该行右侧的 **标记为关键事件（Mark as key event）** 星标/开关打开：
   - [ ] `sign_up`
   - [ ] `free_omr_created`
   - [ ] `upgrade_click`
   - [ ] `begin_checkout`
   - [ ] `purchase`（通常已默认开启，确认即可）
4. 列表里暂时没有的事件（例如还没人触发过的 `upgrade_click`），去 **管理 → 关键事件（Key events）→ 新建关键事件**，手动输入完全相同的事件名保存。
5. 标记只对之后的数据生效，不会回溯历史数据。

## 2. 注册自定义维度（让漏斗能按参数拆分）

**管理 → 自定义定义（Custom definitions）→ 创建自定义维度**，范围选「事件」，事件参数名与维度名一致：

- [ ] `free_trial`（区分免费 / 付费账号的 OMR）
- [ ] `source_type`（pdf / image）
- [ ] `recognition_mode`（simple / complex）
- [ ] `source`（`upgrade_click` 的入口）
- [ ] `landing_path`（SEO 落地页）
- [ ] `method`（`sign_up` 的 email / google）

注册后同样只对之后的数据生效。

## 3. 建官方漏斗探索

**探索 → 漏斗探索**，「步骤」里按顺序添加 8 步，每步条件都是「事件名称 完全等于 …」，依次填上面官方漏斗的 8 个事件名。可选：细分维度加「设备类别」「国家/地区」「会话默认渠道组」。不要使用 `first_visit`、`session_start` 或自起的标签名作为步骤。

## 4. DebugView 验证（含跨子域 Cookie 同意）

官网 `scoretransposer.com` 与应用 `app.scoretransposer.com` 共用同一个 GA4 数据流和同一个分析同意 Cookie。**访客不点「接受」时 GA 完全不加载**，所以 GA 里的人数会少于真实访客。

1. 在 Chrome 安装 Google 官方 **Tag Assistant** 扩展（或在 URL 加 `?gtm_debug=x` 由 Tag Assistant 打开），连接 `https://scoretransposer.com`。
2. 用无痕窗口打开官网，在底部 Cookie 提示点「接受」。
3. 打开开发者工具 → Application → Cookies，确认 `scoretransposer_analytics_consent=granted` 的 **Domain 为 `.scoretransposer.com`**（不是 `scoretransposer.com` 或 `app.scoretransposer.com`）。这依赖生产构建变量 `NEXT_PUBLIC_LOCALE_COOKIE_DOMAIN=.scoretransposer.com`（`deploy/hetzner/public.env` 已配置）。
4. GA4 → **管理 → DebugView**，选中当前调试设备，依次操作并确认事件出现：
   - [ ] 打开 `/sheet-music-scanner` → `page_view` + `seo_landing_view`
   - [ ] 点主按钮 → `product_cta_click`
   - [ ] 跳到 `app.` 后 **不再出现第二次 Cookie 提示**，且 `page_view` 的 `page_hostname` 为 `app.scoretransposer.com`、仍是同一个调试设备（同一 `_ga` Cookie）
   - [ ] 注册新号 → `sign_up`
   - [ ] 上传 PDF 识别 → `free_omr_created`（参数 `free_trial=true`）
   - [ ] 识别完成打开预览 → `free_omr_preview_viewed`
   - [ ] 点升级 → `upgrade_click`（看 `source`）
   - [ ] 选套餐去付款 → `begin_checkout`
   - [ ] Paddle/Stripe Sandbox 付款成功 → `purchase` 只出现一次
5. 如果到 `app.` 又弹一次 Cookie 提示，或者 DebugView 里变成了新设备：检查第 3 步 Cookie Domain，以及两个前端是否用同一套环境变量同时重新构建部署。

## 5. 仍需用户完成的事项

- [ ] 在 GA4 界面完成第 1、2 节（代码无法代替）。
- [ ] 申请 Microsoft Clarity 项目，把 Project ID 填入生产环境 `NEXT_PUBLIC_CLARITY_PROJECT_ID`（`deploy/hetzner/public.env`），两个前端重新构建部署后才有热力图和录屏。
