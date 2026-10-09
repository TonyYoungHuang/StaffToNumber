# 首页背景广告片

2026-10-01。30 秒英文乐谱影片以自动循环背景展示，前景独立呈现标题、推广数据和体验入口。最新首页顺序为：主要功能标题与完整说明、背景影片、简短介绍与操作台。九语言首页共用同一支英文影片和英文推广层。最新位置与价格卡片调整见 [发布记录](deployments/home-layout-pricing-2026-10-01.md)，登录与单谱权益见 [前次发布](deployments/homepage-auth-single-score-2026-10-01.md)。

## 页面内容

- 标题：Your score. More possibilities.
- 副标题：Transpose. Refine. Hear it come alive.
- 推广数据：2K Users / 97 Countries / 65K Scores corrected。
- 三组数字由网站经营者在本次任务中明确提供，按累计使用人数、覆盖国家、累计批改乐谱展示；不是浏览器实时统计，不额外添加加号。
- Start with your score 返回本页操作台；Explore plans 进入当前语言的定价页。

## 播放与视觉

影片保持 30 秒、1920×1080、30fps、H.264/AAC。英文谱面沿用原创 FIRST LIGHT 的语义音符数据和原配乐，展示编辑、移调、谱面发声与多声部。音频转乐谱尚未上线，本片不宣传该功能。制作与功能边界沿用 [原广告片说明](product-commercial-video.md)。

背景版本去掉影片内烧录的大标题、品牌落版和按钮，仅保留英文谱面及乐器信息。结尾 1.5 秒融入开头画面，网页固定文案不会随影片切换。按用户的最新要求，桌面和手机均使用白色背景、深色乐谱与文字，叠加白色渐变保证前景可读，并保留官网的淡紫色点缀。

进入可视区域才加载影片，默认静音自动循环；离开视口或切换到后台标签页暂停。声音开关需要用户点击，手动暂停不会因滚动返回而被覆盖。系统减少动态效果或节省流量设置开启时，仅显示封面，允许用户主动播放。浏览器阻止自动播放时保留播放按钮；媒体错误时保留封面、推广内容及原版影片链接。

## 执行文件

- `apps/www/src/components/ProductCommercialBackdrop.tsx` 与 `.module.css`：前景内容、播放状态和响应式布局。
- `apps/www/src/lib/product-commercial.ts`：统一背景影片及旧版影片备用地址。
- `scripts/render-score-background.mjs`：复用原版语义谱面并重新构图、渲染、编码。
- `scripts/verify-product-backdrop.mjs`：本地九语言、桌面／手机循环、声音、暂停、减少动态效果、节省流量和失败回退检查。
- `apps/www/public/product/commercial/v4/score-motion-30s.mp4`：2,993,664 字节，SHA-256 `b0cac1bea57e344d3d40c8105428f8af45c217c83ae1b17c33a745a296bce94c`。
- `apps/www/public/product/commercial/v4/poster.webp`：7,040 字节，SHA-256 `c2b9492910134c4af52f81766d7041208f353ac623fedff8460d73b7f63b7a6b`。

生成原谱和音轨后，运行 `node scripts/render-score-background.mjs` 可重建背景资产。当前本地成品、检查日志与媒体参数位于 `.tmp/score-background-light/`。

本地完成 TypeScript 检查、23 项首页相关测试、官网生产构建、15 项浏览器场景及 FFmpeg 全片解码。图片预算、首屏媒体预算与独立背景视频 4 MiB 限额均通过；MP4 在进入可视区域前不请求。

发布详情与回滚见 [生产发布记录](deployments/product-background-light-2026-10-01.md)。
