# 原工作台免费结构预检

原工作台和官网首页保留现有上传与工具入口，扫描文件进入以下流程：

1. 上传完整 PDF 或乐谱图片，免费检查结构。
2. 显示简单/复杂建议、检测依据和服务器返回的实际积分价格。
3. 用户可以在同一页改选模式，文件保持选中。
4. 用户明确确认后，重新核对价格并开始正式识谱。简单默认 1 分，复杂默认 5 分，后端仍为可配置项。
5. 简单任务进入已有编辑工作台；复杂任务进入总谱工作台。

预检阶段不建立乐谱、版本、文件记录或识别任务，不预留、扣除任何积分。额度为零的有效登录账户也可预检。临时原稿和输出在返回响应前删除。

## 推荐与完整原稿

预检使用纯图像谱线与连接小节线判断结构，不调用识谱模型、OCR、网络下载或付费识别队列。

- 多个前后排列的单旋律谱段仍属于简单乐谱；页数不能单独决定模式。
- 常规连接双谱表属于钢琴类结构，可推荐简单模式。预检不会据此保证实际乐器身份。
- 同一谱段三个以上谱表或 TAB 谱线提示复杂模式。
- 方向、谱表归组、清晰度不可靠时，以及页数/像素/时间超出轻检查预算时，返回待判断。初始不勾选任何模式，用户必须手动选择。
- `complete` 仅表示源文件各页已检查，不保证所有乐器、音符或记号已识别正确。

前端始终保存完整原文件，正式识谱提交这个文件。预检的缩放、部分扫描或预算退出不会删页、裁切原稿。

默认上传限制 20 MB，轻检查最多 60 页、每页 1 MP、合计 30 MP、100 DPI，算法软预算 15 秒，进程硬超时 25 秒；前端网络超时 30 秒。达到分析预算属于待判断结果，服务不可用/上传损坏属于可重试失败，失败时禁止付费提交。

免费 PDF 校验只检查合法页面元数据（最多 2000 页、画布最长边 14400 pt），不套用付费识谱的 300 DPI 全稿像素预算。20 页正常 A4 PDF 已实测完整送入预检并返回全页分析。正式导入仍执行已有识谱安全预算；超过正式导入上限时拒绝，且不扣分。

## 收费与异步边界

最终确认先查询 `/api/scores/recognition-options`。如果价格已改变，显示新价格并等待再次确认。

正式导入附带 `recognitionMode` 和 `expectedCreditCost`。服务器在上传前、上传后和创建任务的同步入口比较当前价格；变化时返回 `409 OMR_PRICE_CHANGED`，不创建任务或预留额度。`expectedCreditCost` 仅用于拒绝过期确认，实际计费始终由服务器决定。旧调用方未传比较参数仍兼容。

预检使用取消控制和请求版本，快速换文件时旧建议不能覆盖新文件。后端检测上传或响应连接中断并终止轻检查，释放同用户并发槽。确认有提交锁；站内隐式 Enter 提交不能越过显式收费确认。

预检默认每用户每分钟 6 次、同用户 1 个、单 API 实例 2 个并发。多实例限流不是全局配额，部署扩容时应重新评估总 CPU、RAM 和限流策略。

## 实现位置

- 官网：`apps/www/src/components/HomeHeroWorkbench.tsx`。
- 站内：`apps/app/src/components/ScoreLibraryManager.tsx`、`ScoreRecognitionPreflight.tsx`、`RecognitionModeCards.tsx`。
- 接口：`POST /api/scores/import/omr/preflight`，`services/api/src/routes/score-structure-preflight.ts`。
- 受控进程：`services/api/src/lib/score-structure-preflight.ts`。
- 纯图像实现与原创测试：`services/worker/python/score_structure_preflight.py`、`test_score_structure_preflight.py`。
- 共享契约：`ScoreStructurePreflight`；九语文案：`packages/i18n/src/score-preflight-messages.ts`。

## 运行依赖

这是 API 调用的独立轻量 Python 环境，不能只在 Worker 安装依赖。使用 `services/worker/python/requirements-preflight.txt`，并保留同目录的 `complex_omr_adapter.py`（仅导入纯图像函数）。

Hetzner、传统后端及 Cloudflare API Dockerfile 已配置 `/opt/score-preflight`，与 Music21/basic-pitch/TensorFlow 环境隔离。无须为免费预检准备 homr 权重。

API 配置见 `services/api/.env.example`：`SCORE_PREFLIGHT_PYTHON_COMMAND`、`SCORE_PREFLIGHT_ADAPTER_PATH`、`SCORE_PREFLIGHT_TIMEOUT_MS`、`SCORE_PREFLIGHT_MAX_PAGES`、`SCORE_PREFLIGHT_REQUESTS_PER_MINUTE`、`SCORE_PREFLIGHT_MAX_CONCURRENCY`。

本次新增原生依赖，首次上线须重新构建支持预检的后端基础镜像，不能直接使用缺少 `/opt/score-preflight` 的旧基础镜像执行应用代码更新。

详细算法、限制与 CLI 见 [Python 预检说明](../services/worker/python/STRUCTURE_PREFLIGHT.md)。

## 验证记录

官网 Chrome 隔离验收 10 场景通过，覆盖确认前零付费提交、简单/复杂实际价格、保留文件改选、未知/部分结构手选、快速换文件、客户端与服务器价格变化、登录恢复、零额度、失败重试和 390px 布局。

站内 Chrome 隔离验收 14 场景通过，包含原工作台/扫描入口、简单/复杂编辑页跳转、隐式 Enter 防误提交、MusicXML/MIDI/简谱原导入保留及 390px 布局。浏览器全部使用模拟 API 和隔离数据。

后端已验证真实 Python/API 的完整两页原创 PDF：全页分析，文件、乐谱和任务表保持零记录，积分不变且临时文件清理。另覆盖鉴权、零额度、损坏/超限上传、超时、不可用、取消连接释放槽、价格变更与原计费/上传安全回归。

纯图像 23 项原创测试在固定轻依赖的全新 Windows Python 3.11 与隔离 Debian 12/Python 3.11 环境通过，`pip check` 通过；Linux 安装与运行使用官方 wheel、只读脚本及禁用网络的容器。原有模型和音频环境未被改动。

最终单元回归：站内 156/156，官网 93/93，i18n 19/19。shared、API、Worker 编译通过；站内 36 页与官网 49 页的 Next.js 16.3.0 正式构建通过。正式构建使用各应用自身安装的 Next CLI，不使用仓库根目录的另一版本。首页资源预算检查通过（JavaScript gzip 86.8 KiB，CSS gzip 30.9 KiB）。

最后一轮隔离后端回归 31/31、零跳过：11 项免费预检（含实际生产固定依赖的 Python/API 联调）、6 项识谱计价与 14 项上传安全。浏览器验收和 Python 资格验证不调用付费识别模型。

本次流程已于 2026-10-07 上线，使用独立验收账号验证真实预检、扣费、识别与编辑／导出。未对生产客户创建验收任务或扣费。详见 [发布记录](./deployments/score-workspaces-2026-10-07.md)。
