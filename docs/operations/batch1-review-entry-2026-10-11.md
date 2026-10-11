# 第 1 批：待校对入口与疑点白话说明

日期：2026-10-11。基线：`e54ee92e0771e1b4e21ac77f94fad7c6cbe9381f`（`20261010-prepaid2`）。仅实现方案第 11 条和第 1 条的 1a。此记录是代码交付与验收说明，本次没有部署。

## 改动清单

- 登录后的应用主界面新增醒目提醒：有一份或多份扫谱待校对。按钮直接进入最新一份，展开列表可选择其他待校对扫谱。
- 使用现有 `/api/scores` 数据，不新增接口。仅计算确有待确认版本且状态为 `candidate` 或 `needs_review` 的扫谱；音频、归档、已确认、已拒绝、失败及尚未产生候选的任务不计入。已修改的候选仅在现有识别层能明确说明来自扫谱时计入。
- 乐谱首页没有待校对任务时显示友好空状态；读取失败时显示本地化重试入口。登录、页面切换、任务完成、候选更新、确认或拒绝、重新激活窗口时刷新，不新增定时轮询。
- 切换账号时立即隐藏旧账号提醒；取消旧请求并忽略过期响应；退出登录后不显示提醒。
- 疑点列表改用九语白话解释符号不确定、小节拍数不合、时长不明、拍号不明等情况；未知原因显示本地化通用说明。没有疑点也提示抽查，有疑点但无法精确对应时说明应检查页面或小节。
- 技术分数、坐标及原始诊断收进默认折叠的“技术详情”。分数不解释为准确率。
- 较长的疑点说明按内容高度显示，列表仍可滚动；手机上的长语言按钮可换行，避免德语等语言撑出页面。
- 前置“对照原图校对”入口，加大原图显示切换和整份确认按钮，保留现有确认、拒绝、覆盖范围勾选及版本保存流程。页面中的确认进度仍只在当前页面，不新增本地存储或后端持久化。
- 九语为 `en`、`zh-CN`（HTML 为 `zh-Hans`）、`zh-TW`、`ja`、`ko`、`fr`、`es`、`de`、`ru`；数量文案包括俄语复数形式。语言包仍由服务器按当前语言传入客户端。

识别引擎、识别阈值、原图坐标计算、API 请求与确认载荷、付款、数据库 schema/migration、www 内容与 SEO 均保持原有实现。主工作树的未提交改动没有纳入本批。

## 测试结果

在 `.tmp/plan13-20261011/worktree` 从指定基线开始，开工前 porcelain 为空。交付前再次比较主工作树状态，原有 79 项未提交改动没有变化。

| 检查 | 结果 |
| --- | --- |
| `npm run build -w @score/shared` | 通过 |
| `npm.cmd run typecheck -w @score/app` | 通过，路由类型生成和 TypeScript 检查均退出 0 |
| 待校对筛选、疑点映射及语言包相关单测 | 12/12 通过 |
| `npm run test -w @score/app` | 165/165 通过，无失败、跳过或取消 |
| `npm.cmd run build -w @score/app -- --webpack` | 最终源码通过，编译、类型检查、36 个静态页面生成及构建追踪完成，退出 0 |
| 本地 Chrome，桌面 1440px、手机 390px | 通过，按钮可点击、原图可见、疑点文字未被压缩截断、页面无横向溢出 |
| 九语完整性与数量模板 | 单测通过；浏览器抽查 `en`、`zh-CN`（`zh-Hans`）、`fr`、`de` |
| 改动范围及空白检查 | 仅 `apps/app` 与本记录；`git diff --cached --check` 通过 |

本机默认 Turbopack 构建曾异常退出，Webpack 默认构建 worker 也曾停滞。最终本地验证临时采用 Next 支持的 `experimental.webpackBuildWorker: false` 与单 worker、`SCORE_SELF_HOSTED=true`，使用 Webpack 完成构建。临时 `next.config.ts` 已恢复为基线文件，不纳入提交；默认 Turbopack 未对最终源码再次成功复验。构建中的原有 middleware 弃用提示没有扩展到本批处理。

浏览器检查运行最终本地生产构建，API 使用固定模拟数据，不连接真实数据库、不调用识别引擎。检查了零份、单份、多份、音频与归档排除、最新一份入口、其他待校对列表、已知与未知疑点、无疑点抽查提示、默认折叠技术详情、原图对照与确认按钮。确认仍请求原有 `POST /api/scores/scan-1/candidate/accept`，载荷仍为 `{ pendingRevisionId: "revision-1" }`。同时验证确认后刷新提醒、读取失败与重试、切换账号忽略旧响应、退出登录隐藏提醒。浏览器没有页面脚本异常。

日志、检查脚本与截图仅留在 1 号电脑的 `E:/AI WEB/21.wuxianpu/.tmp/batch1-20261011/`，不纳入版本库。该目录内 `browser-results.json` 记录通过的场景与截图路径；`shared-build.log`、`app-typecheck.log`、`app-unit-tests.log`、`app-build.log`、`browser-check.log` 为检查输出。

截图清单（疑点面板按元素截取，宽度保持对应桌面/手机宽度）：

- `en-desktop-review-entry.png`
- `en-desktop-plain-warnings.png`
- `en-desktop-empty-state.png`
- `en-mobile-review-entry.png`
- `en-mobile-plain-warnings.png`
- `en-mobile-no-warnings.png`
- `zh-CN-desktop-review-entry.png`
- `zh-CN-desktop-plain-warnings.png`
- `zh-CN-mobile-review-entry.png`
- `zh-CN-mobile-plain-warnings.png`
- `fr-desktop-plain-warnings.png`
- `de-mobile-plain-warnings.png`

## 部署说明（尚未执行）

本批只需发布 app 前端及它构建所需的语言包。使用本次推送提交的干净检出构建，沿用当前生产 app 环境变量和现有发布流程。发布前由执行人记录 app 当前发布指针、镜像或构建标识，确认回退产物可用；其他服务的发布标识不能凭本批基线推定。

不发布 www、API、worker 或支付服务，不运行迁移，不重启识别任务。部署后用测试账号抽查九语入口、零/单份/多份、原图与疑点面板、确认与拒绝后的提醒变化、切号及手机宽度。

## 回滚说明（尚未执行）

只将 app 恢复到 `20261010-prepaid2` 的前端产物/发布指针，对应代码 `e54ee92e0771e1b4e21ac77f94fad7c6cbe9381f`。如果该 app 产物不可直接复用，应由发布执行人用这个提交与原 app 环境重新构建，按现有 app 发布流程切回。

不恢复数据库、不删除已确认乐谱或用户数据、不重跑扫谱、不回退其他服务。回滚后检查登录、乐谱列表、原图预览及已有确认流程即可。
