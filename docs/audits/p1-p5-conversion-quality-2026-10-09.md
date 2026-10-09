# P1–P5 接手质量核验（2026-10-09）

状态：第一大步通过，按用户要求暂停。尚未执行 Stripe / Google Cloud / GA4 后台配置、生产部署或真实支付验证。

## 工作区与改动边界

- 工作区：`E:/AI WEB/21.wuxianpu`。
- 分支：`codex/commercial-mvp-seo-production`。
- 接手时 `git status --porcelain=v1` 有 520 行，包含大量历史未提交改动及未跟踪目录，不能全部归为 P1–P5。
- 已完整读取接手卡及 P2–P5 说明，核对官方漏斗、免费项目配额、登录恢复、默认月付套餐和 Pass 入口的当前实现。
- 未使用 git reset / clean / checkout 丢弃改动，未提交代码。
- 核验前对 `apps/www/src`、`apps/app/src`、`packages/shared/src` 的 506 个现有文件建立 SHA-256 基线；核验后只有下列 11 个 app 源码文件变化。官网与 shared 源码保持基线一致，未修改公开 SEO URL、title、H1、meta 或 FAQ。接手时已有的 SEO 相关改动保留，不将其归为本轮新增改动。

## 修复

app 首轮单测 156 通过、2 失败；两项均指向交接卡已提示的既有 `BillingManager.tsx` 中文硬编码分支。

采用现有多语言字典做局部修复：为预付积分标题、余额说明、使用说明及追加余额增加 4 个字段，补齐全部 9 种语言，按现有数字格式化方法插值。支付请求、配额逻辑和 webhook 未修改。

源文件变化：

- `apps/app/src/components/BillingManager.tsx`
- `apps/app/src/lib/billing-messages/types.ts`
- `apps/app/src/lib/billing-messages/locales/{en,zh-CN,zh-TW,ja,ko,fr,es,de,ru}.ts`

验证脚本变化：

- 更新 `scripts/verify-pricing-flow.mjs`：旧脚本仍要求默认年付、登录后不自动结账，与 P4 相反。现检查默认月付、Google/邮箱认证后单次自动结账、重复点击、幂等重试、浏览器返回及取消清理；延长本地冷编译的导航等待，错误截图不覆盖原始失败原因。
- 新增 `scripts/verify-conversion-flow.mjs`：仅允许 loopback 前端，API、Google 网络和支付跳转均使用模拟数据，验证 app 转化流程。

## 验证结果

| 检查 | 结果 |
| --- | --- |
| `npm run build -w @score/shared` | 通过，exit 0 |
| `npm run typecheck -w @score/www` | 通过，exit 0 |
| `npm run typecheck -w @score/app` | 通过，exit 0 |
| `npm run test -w @score/www` | 95/95 通过，无跳过 |
| `npm run test -w @score/app` | 修复后 158/158 通过，无跳过 |
| 官网浏览器回归 | 10 项通过 |
| app 浏览器回归 | 7 项通过 |
| 两个浏览器验证脚本 `node --check` | 通过 |
| 本轮相关 tracked 路径 `git diff --check` | 通过 |

浏览器使用本机 Edge headless 和当前 workspace 的 Next 16.3.0 dev server。两个测试服务已停止，随后重新运行两个 workspace 的 typecheck；Next 自动产生的 dev 版 `next-env.d.ts` 引用已恢复为正常 typegen 引用，没有保留这两处生成文件改动。

官网浏览器覆盖：

1. 默认 Starter 月付；原有 5 张套餐卡与单曲 Pass 可见。
2. 模拟 Google 认证自动进入已选年付套餐结账，仅一次请求；拒绝伪造 frame 消息。
3. 浏览器返回恢复已选套餐，不重复结账。
4. 双击只产生一个结账请求。
5. Paddle 选择与刷新恢复。
6. 一次性购买强制 Stripe；失败后使用同一幂等键重试。
7. 过期会话邮箱登录后自动恢复已选一次性年付结账。
8. 移动端弹窗无溢出；Escape 关闭并清理 pending、恢复焦点。
9. 9 种语言定价页可打开登录弹窗。
10. 无浏览器运行时异常。

app 浏览器覆盖：

1. 邮箱登录后自动发起一次 Starter 月付结账，清理 pending。
2. 已登录直接访问 `/checkout` 不自动扣款或创建结账。
3. 游客选文件后邮箱登录，无需重选；移动端简单识谱可一键开始，高级模式默认折叠，无横向溢出。
4. 免费额度用完后，主 CTA 为 US$2.99 Pass、订阅次级；双击只创建一次 `stripe` / `one_time` / `single-score` 结账。
5. zh-CN 的银行卡 Pass、订阅和激活码入口独立；兑换不创建卡支付请求，`upgrade_click` 使用 `score_import_activation_code` 与 `plan_type=activation_code`。
6. zh-TW 同样通过。
7. 无浏览器运行时异常。

## 实际范围与待办

上述浏览器检查使用模拟 API / Google 回调 / 支付页面，不证明真实 Google OAuth、Stripe live Price、webhook 入账或 GA4 后台已配置。识谱预检也使用模拟数据，不包含真实 OMR worker 质量验收。

本轮仅只读核对公开构建变量：checkout 已开启，live providers 包含 Stripe，GA4 ID 为 `G-CERGG48WWE`，同意 Cookie 域为 `.scoretransposer.com`。生产运行时 `STRIPE_SINGLE_SCORE_PRICE_ID` 尚未核验。

下一大步依交接卡先进行 Stripe One Score Pass 线上配置，带用户逐项操作；随后 Google Cloud、GA4，再按 `deploy/hetzner` 发布 www 与 app，并记录 release / 回滚点和上线后实测。可选 Clarity 尚未执行。

临时日志、截图、npm cache 和浏览器临时目录使用项目 `.tmp`；本轮可识别的临时产物在记录结果后清理，既有其他临时目录不删除。
