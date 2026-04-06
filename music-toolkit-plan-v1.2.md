# 乐谱工具箱 Music Toolkit（Web + 桌面客户端 + 微信小程序）统一后端开发方案 v1.2

> 方向确认（不可偏离的产品边界）
> - **同一后端**服务 Web / 桌面客户端 / 微信小程序  
> - **自动处理承诺输入**：MusicXML / MIDI（稳定）  
> - **PDF 自动移调/转简谱**不承诺：走“PDF服务化订单”  
> - **免费版 PDF 工具箱限制**：每天 3 次  
> - **简谱 MVP 输出**：只做“旋律简谱”  
> - **曲库秒出**：首批 20 首已校对 MusicXML  
> - **桌面客户端**：重点做“批量处理工具”  
> - **微信小程序**：实现 MVP 功能（轻量入口/下单/交付/曲库/部分轻处理）  

---

## 0. 总览：三端一体 + 一套后端
### 0.1 三端定位（明确分工，避免做成“三套重复产品”）
| 端 | 定位 | 最强场景 | 不做/少做 |
|---|---|---|---|
| Web SaaS（主产品） | 完整功能中心 | 上传处理、订单、曲库、会员、下载交付 | 极端大批量本地文件管理 |
| 桌面客户端（增强工具） | 批量处理工作台 | 多文件批量、离线队列、断点续传、本地文件管理 | 复杂运营/支付页面（跳 Web） |
| 微信小程序（MVP） | 入口 & 承接 & 轻使用 | 登录、曲库秒出、订单提交、订单查看下载 | 重处理/大文件批量/复杂编辑 |

> 核心原则：**重处理 = Web/桌面 + 后端任务；小程序 = 入口/承接/交付。**

---

## 1. 统一架构（前后端分离 + 异步任务）
### 1.1 组件
- **API 服务（统一后端）**：认证、文件、任务、订单、曲库、会员/用量  
- **Worker 集群**：PDF处理、移调、简谱渲染、音频合成、曲库生成  
- **任务队列**：Redis / BullMQ（或同类方案）  
- **存储**：  
  - 对象存储（S3/OSS）：上传文件、生成文件、交付文件  
  - 数据库（Postgres）：用户/订单/任务/曲库/用量  
  - 缓存（Redis）：OTP、会话、任务状态快照  
- **三端客户端**：  
  - Web：工具页 + 订单/会员  
  - Desktop：批量处理工作台 + 本地文件映射  
  - Mini Program：MVP入口 + 曲库 + 订单 + 交付  

### 1.2 统一任务模型（核心复用点）
所有处理统一抽象为 `jobs`：  
**三端流程一致：创建任务 → 轮询/订阅任务状态 → 下载结果**  
> 这样桌面/小程序不重复实现处理逻辑，开发与维护成本最低。

---

## 2. 认证与登录（Web + 桌面 + 小程序）
### 2.1 手机号验证码（全端通用）
- Web/桌面：输入手机号 → 获取验证码 → 登录  
- 小程序：同样支持手机号登录（如需要更强可用性）  

### 2.2 微信登录（扫码/小程序登录并账户合并）
**目标：同一用户多端同账号、权益互通。**

#### Web/桌面：微信扫码登录
- 后端生成 `scene_id` 与二维码内容  
- 前端展示二维码  
- 用户用微信扫描并确认后，后端将 `scene_id -> user_id` 绑定  
- Web/桌面轮询 `/auth/wechat/scene/:scene_id` 获取登录结果并发放 token  

#### 小程序：微信一键登录（openid）
- 小程序端获取 code → 后端换取 openid/session_key → 登录/注册  
- 用户绑定手机号后 **账号合并**（同一 user_id 下挂 phone 与 openid）  

> 关键点：统一用户表字段 `phone` 与 `wechat_openid`，支持同一 user 同时拥有两种登录方式。

---

## 3. 功能范围：三端能力矩阵（MVP）
### 3.1 Web（主功能，MVP全量）
1) PDF 工具箱（免费每天 3 次）  
2) 移调（MusicXML/MIDI，付费核心）  
3) 五线谱 → 简谱（MusicXML，旋律简谱，付费核心）  
4) PDF 服务化订单（移调/简谱/音频/MusicXML）  
5) 曲库秒出（首批 20 首）  
6) 会员与用量  
7) 我的任务 / 我的订单 / 下载中心  

### 3.2 桌面客户端（重点：批量处理工作台）
- 批量选择本地文件（PDF/MusicXML/MIDI）  
- 批量配置处理规则（统一页码、统一装订边距、统一移调等）  
- 队列与任务管理：并发、失败重试、断点续传、网络恢复自动继续  
- 输出路径管理（下载回本地指定目录）  

**处理范围（MVP）：**
1) PDF 批处理（合并/拆分/页码/装订版/裁边）  
2) MusicXML/MIDI 批量移调  
3) MusicXML 批量旋律简谱导出  

> 桌面端不强制做支付：权益不足时一键跳转 Web 购买。

### 3.3 微信小程序（MVP轻量）
- 登录（微信一键 + 可选手机号绑定）  
- 曲库浏览与秒出  
- 订单提交（上传PDF → 选择需求 → 下单/支付）  
- 订单列表 / 详情 / 交付下载  
- 可选：轻量 PDF 工具箱（不做批量）

---

## 4. 统一后端模块设计（可拆分服务）
### 4.1 服务模块
1) `auth-service`：OTP、微信扫码、微信小程序登录、账户合并  
2) `file-service`：上传/下载/签名URL、文件 hash、生命周期清理  
3) `job-service`：创建任务、状态查询、进度、产物列表、权限校验  
4) `pdf-service`：生成 job wrapper（真正处理在 worker）  
5) `score-service`：移调/简谱/音频任务创建与参数校验  
6) `order-service`：PDF服务化订单（报价、支付、状态流转、交付上传）  
7) `library-service`：曲库管理、曲库生成任务  
8) `billing-service`：会员/用量扣减（MVP可内置在 job-service）

### 4.2 Worker 模块（单独进程/容器）
- `worker-pdf`：merge / split / crop / paginate / bind  
- `worker-score`：transpose / jianpu  
- `worker-audio`：midi -> audio（可后置）  
- `worker-library`：曲库秒出生成（组合任务）

---

## 5. 核心数据模型（多端共享）
### 5.1 users
- id  
- phone（nullable）  
- wechat_openid（nullable）  
- created_at / updated_at  

### 5.2 client_devices（可选，用于桌面授权/风控）
- id  
- user_id  
- device_id（桌面端生成并持久化）  
- client_type: web | desktop | mini  
- last_seen_at  

### 5.3 jobs
- id, user_id  
- type  
- status / progress  
- input(json)  
- output(json) -> { file_ids:[], download_bundle_file_id?, previews? }  
- created_at / updated_at  

---

## 6. API 设计（三端复用，不做端专属接口）
### 6.1 Auth
- POST `/api/auth/otp/send` { phone }  
- POST `/api/auth/otp/verify` { phone, code } -> tokens  
- GET  `/api/auth/wechat/qrcode` -> { qrcode_url, scene_id }  
- GET  `/api/auth/wechat/scene/:scene_id` -> { status, tokens? }  
- POST `/api/auth/wechat/mini/login` { code } -> tokens  
- POST `/api/auth/bind/phone` { phone, code } -> merge/bind  
- POST `/api/auth/refresh`  
- POST `/api/auth/logout`  

### 6.2 Files
- POST `/api/files/upload` (multipart) -> { file_id }  
- GET  `/api/files/:id/download` -> signed_url  
- GET  `/api/files/:id/meta`  

### 6.3 Jobs（所有处理统一走这里）
- POST `/api/jobs` { type, input } -> { job_id }  
- GET  `/api/jobs/:id`  
- GET  `/api/jobs?mine=1&page=1`  

### 6.4 Orders（PDF服务化）
- POST `/api/orders` { pdf_file_id, service_type, target, urgency, notes } -> { order_id, price_quote }  
- POST `/api/orders/:id/pay` -> pay params  
- GET  `/api/orders`  
- GET  `/api/orders/:id`  
- POST `/api/orders/:id/revision` { notes, file_id? }  
- POST `/api/orders/:id/deliver` (admin) { delivery_file_ids[] }  

### 6.5 Library
- GET `/api/library/scores`  
- GET `/api/library/scores/:id`  
- POST `/api/library/scores/:id/generate` { transpose?, need_jianpu?, need_audio? } -> { job_id }  

---

## 7. 桌面客户端（批量工具）设计方案
### 7.1 技术形态（推荐）
- **Electron**（Windows/Mac）或 **Tauri**（更轻）  
- 核心能力：  
  - 本地文件选择器（多选、拖拽文件夹）  
  - 本地任务队列（前端队列 + 服务端 job）  
  - 断点续传上传（大文件可选分片）  
  - 下载到本地指定目录（保持原文件命名规则）  

### 7.2 信息架构
1) 登录页（手机号 / 微信扫码）  
2) 工作台 Dashboard（最近任务、剩余额度、快捷创建）  
3) 批量任务创建（文件选择 / 类型 / 规则模板 / 提交）  
4) 任务队列管理（进度 / 失败原因 / 重试 / 取消）  
5) 输出管理（目录 + 命名规则）  

### 7.3 批量策略
**方案A：多 job（MVP推荐）**  
- 每个文件对应一个 job  
- 客户端负责队列与并发（并发=3）  
- 优点：简单可靠；失败易定位  

**方案B：batch job（后续优化）**  
- 一个 batch job 包含多文件  
- worker 内部循环处理并更新 progress  
- 优点：UI简洁；后端可控  
- 缺点：实现复杂  

---

## 8. 微信小程序（MVP）方案
### 8.1 页面清单
- 首页：曲库入口 / 订单入口 / 我的  
- 曲库列表页：20首  
- 曲目详情页：选调号/简谱/音频 → 生成 → 下载  
- 订单提交页：上传PDF → 选需求 → 支付  
- 订单列表 / 详情页：状态 + 下载  
- 我的页：账号信息、绑定手机号、会员状态、客服入口  

### 8.2 小程序文件与下载策略
- 上传 PDF：走 `/files/upload`  
- 下载交付物：后端返回短期签名 URL  
- 小程序 `downloadFile` → `openDocument`（PDF）  
- 音频：URL 播放或下载  

### 8.3 小程序不做重处理原因
- 文件大、批量多、小程序体验差  
- 后台任务轮询易受限制  
- MVP优先“承接 & 交付 & 曲库”  

---

## 9. 里程碑（建议 6 周）
### Week 1
- 统一后端骨架 + Auth + Files + Jobs  

### Week 2
- Web MVP：PDF 工具箱 + Worker-PDF  

### Week 3
- Web MVP：移调 + 简谱 + Worker-Score  

### Week 4
- PDF 服务化订单（Web）+ 交付后台  

### Week 5
- 桌面客户端 Beta（批量工作台）  

### Week 6
- 微信小程序 MVP + 曲库20首秒出  

---

## 10. 关键“易投产”工程化建议
1) 统一 job 输入输出 schema  
2) 所有下载走签名 URL + 权限校验  
3) 多文件输出提供 zip  
4) 文件生命周期清理（7/30 天）  
5) job 失败信息可读 + 一键重试  
6) 监控：队列积压 / worker失败 / 存储带宽  

---

## 11. MVP 文案（三端一致）
- “自动移调/简谱仅支持 MusicXML/MIDI。只有 PDF？请使用 PDF 转换服务下单，24/48小时交付。”  
- “简谱用于练习辅助；复杂复调作品以五线谱为准。”  
- “免费版 PDF 工具箱：每天 3 次。”  

---

## 12. 配置（写死到配置文件，方便后期改）
```yaml
free_plan:
  pdf_tool_daily_limit: 3
jianpu:
  mode: melody_only
library:
  initial_count: 20
auto_processing_inputs:
  - musicxml
  - midi
pdf_auto_processing:
  transpose: false
  jianpu: false
```

---

# 附录：任务拆解（直接可排期）

## A. 后端
- Auth：OTP + 微信扫码 + 小程序登录 + 账户合并  
- Files：上传/下载/签名URL/权限校验  
- Jobs：创建/查询/列表/取消/重试（可选）  
- Billing：用量扣减（transpose/jianpu），免费 PDF 次数限制  
- Orders：创建/支付/状态/交付上传/下载  
- Library：曲库列表/详情/生成  

## B. Worker
- PDF：merge / split / crop / paginate / bind  
- Score：transpose（mxml/midi）、jianpu（mxml melody-only）  
- Library generate：组合调用 transpose/jianpu  

## C. Web
- 首页智能分流上传  
- PDF 工具箱全功能  
- 移调 / 简谱页  
- 订单页（提交 / 列表 / 详情 / 下载）  
- 曲库页（20 首）  
- 会员 / 额度展示  

## D. Desktop
- 登录（OTP/扫码）  
- 批量任务创建（多文件、多规则）  
- 队列并发 / 失败重试 / 下载到本地  
- 输出命名与目录管理  
- 权益不足跳 Web  

## E. Mini Program
- 登录（小程序一键 + 绑定手机）  
- 曲库列表 / 详情 / 生成下载  
- 订单提交 / 列表 / 详情 / 下载  
- 我的页（会员状态、客服）  
