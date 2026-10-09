# 登录入口与积分状态修正 · 2026-09-28

正式发布：`20260928-login1`，北京时间 14:26 完成上线与登录验收。

## 行为

- Google 登录增加全宽独立区域、标题、浅紫背景与边框。使用官方 GIS 按钮，宽度随容器变化，桌面最大 400 px，手机收窄；邮箱登录继续可用。九种语言共用相同布局。
- 登录、注册、找回密码及重置密码页不请求或显示个人积分。访客顶部显示“登录”，仅在已有会话且获取账户用量成功后显示余额，不使用默认 25 积分作为占位。
- 登录页发现已保存的 token 时，先由 `/api/auth/me` 验证。有效会话进入工作台或原始 `next`；401 清除过期 token 并保留登录表单。
- 积分状态关联 token，同页登录、退出及跨标签页变化同步更新。取消旧请求并丢弃过期返回，防止上一个账户的积分再次出现。

原问题可以由“浏览器保留有效会话，但直接打开 `/login` 仍显示登录表单”触发。旧表单只在有 `next` 时跳转，顶部却继续使用保存的会话查询积分。本次未读取用户个人浏览器的会话内容，不据截图推断其具体 token 状态。

## 验证

- App TypeScript 检查、生产 Docker 构建、10 项现有语言与登录返回测试通过。
- 9 项浏览器场景通过：访客、桌面/手机 Google 区域、过期 token、有效会话验证后跳转、保留单次年付与 Stripe、跨标签页换号与退出、丢弃延迟积分、邮箱登录、付款页内重新登录。
- 正式域名上实际 Google SDK 按钮正常显示。1557 px 桌面视口中模块约 500 × 152 px，官方按钮 400 × 40 px；390 px 手机视口没有横向溢出。
- 专用验收账户通过真实邮箱登录：返回 Starter 单次年付，默认 Stripe，成功读取账户积分；再次进入登录页自动进入工作台；服务器撤销验收会话后，过期 token 被清除且积分消失。
- 没有代替用户完成 Google 身份授权，也没有创建支付订单或扣款。验收账户本轮会话已注销。
- 八个项目服务健康；其他 16 个容器 ID 保持不变。项目及邻站共 10 个 HTTPS 检查均为 200。部署后磁盘可用约 6.4 GiB，内存可用约 1.8 GiB。

浏览器记录、截图、构建输出、源文件校验、镜像及部署记录在 `.tmp/login-polish/`。

## 发布与回退

本轮仅更新 `app`，镜像 `scoretransposer-app:20260928-login1`，ID `sha256:c295d9b43dee6464c9db0bb98bd22c5c5e7f36e278d365dfa9244b8f61e117e4`。先以隔离候选容器验证 `/login` 健康，再切换正式容器。`FRONTEND_RELEASE=20260928-login1`；现有 www 镜像增加相同版本别名，www 不重启。API、Worker 保持 `20260928-onetime1`，基础 RELEASE 保持 `20260927-cutover2`。没有数据迁移、私密配置或反向代理修改。

备份：服务器 `/srv/sites/scoretransposer/backups/pre-login-ui-20260928/`，包含原 `compose.env`、`compose.yaml`、容器镜像清单及校验。离线配置副本经 Windows DPAPI 加密并解密校验，位于 `E:/CodexData/backups/scoretransposer/pre-login-ui-20260928/`。

如需回退，先确认根 `.env` 没有被后续发布修改，再将备份 `compose.env` 恢复为 `/srv/sites/scoretransposer/.env`（权限 600），在该目录执行：

```sh
sudo docker compose -p scoretransposer-prod -f compose.yaml \
  -f releases/20260927-cutover2/deploy/hetzner/edge.override.yaml \
  --profile runtime --profile jobs up -d --no-deps app
```

等待 app 健康并验证登录页。旧 app 镜像为 `scoretransposer-app:20260928-onetime1`，无需恢复数据库。服务器发布记录：`/srv/sites/scoretransposer/releases/20260928-login1/activation.json`。
