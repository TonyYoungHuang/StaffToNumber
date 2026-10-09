# 两种识谱工作台发布记录

2026-10-07 14:33（Asia/Shanghai）已在 Hetzner 切换 `20261007-score1`。官网、工作台、API、Worker 均通过健康检查，发布未进行数据库迁移。其余 16 个既有容器身份保持不变。

原工作台保留，并增加“上传 → 免费结构预检 → 推荐模式及报价 → 用户确认后识别”。简单模式每次 1 分；复杂模式每次 5 分，使用独立的总谱编辑路由 `/scores/:id/ensemble`。重新导出按现有导出任务额度规则计费。

## 发布与启动验证

- 工作台镜像：`scoretransposer-app:20261007-score1`，ID `sha256:e94b9d958dee85a82b3387c138cb5cf89e740ae8a3546ca18d6fcd043105ee92`。
- 官网镜像：`scoretransposer-www:20261007-score1`，ID `sha256:a6df97bf74b3567548993b90e9982417d8a28868a6294ad289826ebc317f9ebe`。
- API／Worker 共用原生后端镜像：`scoretransposer-worker:20261007-score1`，ID `sha256:34b829519677279fa8d7f48382d94f1ee9d5d195da0288976855f4fe8eee3d5b`。
- 两个前端候选对正式构建的完整运行文件逐项比对：1834／1996 项，内容、大小、权限、链接均一致。后端 197 项编译文件 SHA 校验一致。
- 六个固定版本模型全部离线校验。轻量预检 Python 与复杂识谱 Python 环境隔离，原 TensorFlow 环境保留。
- 修正 shared 对 `fast-xml-parser@5.10.1` 的解析位置，复用已有 Worker 的完整依赖树。完整 API／Worker 空库启动探针通过：无外网、无生产挂载、SQLite、数据库轮询队列、禁用邮件凭据。

API／Worker 的生产数据仍使用原 PostgreSQL、Redis 与存储。数据库 schema version 25，64 表／689 列与本地预期一致。

## 在线验收

使用独立的内部验收账号及原创乐谱，不创建付款、不发送邮件、不操作客户乐谱。线上浏览器与真实 API／Worker 联调完成，16 项检查通过，页面错误为 0。

已确认：20 页 PDF 免费结构预检全页完成，不预留积分、不增加计费存储；过期价格确认返回 409 且不扣费。首次低分辨率原创 PNG 的简单识谱被 Audiveris 拒绝，失败后预留的 1 分已退回；随后使用同一份原创 MusicXML 的完整 300 DPI 渲染继续核验。

完整 300 DPI 谱例在简单／复杂模式下均保留 8 音符、2 小节。简单候选确认、音高自动保存、刷新持久化通过；复杂候选预览 Enter 选择、完整总谱点击、分层选择与编辑器联动、实际音高保存通过。两种模式的正式队列导出均完成，对应正确版本；下载的 MusicXML 逐音核对，与编辑后的音高一致，并保留全部 8 音符／2 小节。

九种语言官网页面、价格页、robots.txt 与 sitemap.xml 返回 200。QA 共使用 8 分：识谱 1+5 分、两次导出各 1 分；初次失败识谱净消耗 0。测试结束后，仅撤销 QA 的 1 个会话、禁用其 1 个测试激活码并结束对应会员，测试谱例／任务作为私有证据保留。真实客户数据与额度未操作。

本次线上 300 DPI 单旋律谱例证明实际模式选择、扣费、识谱与编辑／导出流程可用；多乐器／跨页／TAB 的复杂完整性证据来自先前隔离验收，不能把该线上单旋律谱例宣称为所有复杂总谱的准确率证明。实际识别仍显示乐器身份／方向／覆盖待核实提示，需要人工确认。

## 部署配置与回滚

发布目录 `/srv/sites/scoretransposer/releases/20261007-score1/`，备份目录 `/srv/sites/scoretransposer/backups/pre-score1-20261007/`。数据库备份与旧配置已验签，`pg_restore -l` 验证通过；旧镜像保留。

后续操作须保持三个 Compose 文件的顺序：

```sh
cd /srv/sites/scoretransposer
docker compose -p scoretransposer-prod \
  -f compose.yaml \
  -f releases/20260927-cutover2/deploy/hetzner/edge.override.yaml \
  -f releases/20261007-score1/score-workspaces.override.yaml \
  --profile runtime --profile jobs up -d --no-deps worker api app www
```

已准备专用回滚脚本，仅允许回滚本次四个服务，先校验当前镜像及无处理中任务，恢复发布前 `.env` 后检查原镜像健康；不会回滚数据库或删除新数据：

```sh
sudo python3 /srv/sites/scoretransposer/releases/20261007-score1/rollback-score1.py
```

## 识别边界

复杂工作台支持分层识别、跨页乐器归组、缺口追踪、完整预览定位与编辑。自动 TAB 数字、复杂鼓谱、低质量图像和无明确乐器标记仍需要人工核对。完整性控制保留原稿、显示缺口并允许补录，不保证任意输入的所有音符自动准确识别。

技术实现见 [双工作台实现](../score-dual-workspaces-implementation-2026-10-06.md) 与 [免费预检实现](../score-structure-preflight-2026-10-06.md)。私有执行证据保留在工作区 `.tmp/score-release-20261007/`，认证材料不写入公开文档。

已脱敏的 [线上验收数据](../audits/score-workspaces-production-2026-10-07.json) 包含检查项目、镜像 ID、健康状态、测试范围与 QA 清理统计。
