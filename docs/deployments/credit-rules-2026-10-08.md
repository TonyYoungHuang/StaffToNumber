# 积分规则统一上线验收

前端 `20261008-credits1` 已于 2026-10-08T04:00:36.554805+00:00 上线。九种语言的官网首页、价格页、套餐通用说明、结账提示及账户额度说明统一为：

> 任务创建时预留积分；失败或取消后自动退回。

官网与应用前端基于已验证的 `20261007-progress2` 源码构建。在 1,184 个源文件中，只有批准的 21 个文案文件发生变化。依赖与公共素材逐文件比较均无变化。本次不涉及数据库迁移；API、Worker、计费后端及其他站点保持原版本。

## 验证

- 两应用 TypeScript 检查、Linux Next.js 正式构建、官网首页资源预算及编码审计通过。
- 定向本地化与价格目录测试 21 项通过。完整本地化测试中另有两项原有 BillingManager 源码结构断言失败，涉及未修改组件。
- 候选版本与真实线上版本分别验证九种语言的首页、价格页和匿名结账页，各 27 项全部通过。检查可见正文、语言、结账元信息及旧失败扣分说法，未使用私有账户或发起付费任务。
- 生产 App 和 WWW 健康、重启次数为 0、无 OOM；全部所需运行文件哈希匹配。其余 14 个运行容器的 ID 与镜像保持原样。
- API health／ready 与同机其他三个站点的公开首页均返回 HTTP 200。
- 验收时可用磁盘约 11.59 GB。

机器可读证据：[credit-rules-production-2026-10-08.json](../audits/credit-rules-production-2026-10-08.json)。

## 回滚

发布前配置与镜像记录保存在 `/srv/sites/scoretransposer/backups/pre-credits1-20261008`，原 `20261007-progress2` 镜像保留。只恢复 App／WWW 的回滚脚本为 `/srv/sites/scoretransposer/releases/20261008-credits1/rollback.py`，执行方式为 `sudo python3 /srv/sites/scoretransposer/releases/20261008-credits1/rollback.py`。脚本会检查当前前端仍属于本次发布，防止覆盖后续版本。
