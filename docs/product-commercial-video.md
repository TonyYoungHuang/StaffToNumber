# ScoreTransposer 30 秒英文广告片

2026-10-01。30 秒英文广告片已部署正式首页，位置紧接操作台区域。随后改为自动循环背景，当前生产版本 `20261001-light1`，见 [背景影片说明](product-background-video.md) 与 [当前发布记录](deployments/product-background-light-2026-10-01.md)。下文保留原版完整广告片的制作说明；`v2` 仍可作为独立影片播放，首页当前使用 `v4` 白底深色乐谱背景版。

新版以乐谱本身的变化表现编辑、移调、发声与多声部编配，替代此前首页的 80 秒操作教程。九种语言首页共用同一支 30 秒英文影片、英文字幕与封面；不再按语言制作九支长教程，也不保留教程式章节列表。

## 素材与功能边界

- 原创演示曲 **FIRST LIGHT**，4/4 拍、112 BPM。原谱 C 大调，编辑后整体升高两个半音至 D 大调。
- 谱面由结构化音符数据与 VexFlow 5 生成，保留音高、时值、调号、声部与稳定音符编号。MusicXML 经项目现有解析器和播放模型回读核验；画面是语义正确的乐谱动画，不是应用界面操作录像。
- 原创配乐从同一份音符数据合成：钢琴逐步加入小提琴和长笛，最后以 D 大调和弦及自然尾响结束。**这是广告配乐，不是应用实时音色录音**。影片不承诺浏览器实时切换为这些合成音色；独立乐器信息对应乐谱声部及 MIDI／SoundFont 导出能力。
- “Make every note yours”对应音高编辑；“Find your perfect key”对应真实移调；“Hear it come alive”对应由乐谱生成声音；“One score. More voices”对应多声部乐谱。输出提示限于 MusicXML、MIDI、Audio。
- 音频转五线谱尚未上线，本片不展示或承诺该功能；也不承诺扫描乐谱无须校对。

## 分镜与配乐同步

| 时间（秒） | 英文主文案 | 谱面与声音 |
| --- | --- | --- |
| 0–4.285714 | Your score. In motion. | original-C 前两小节，钢琴起奏 |
| 4.285714–8.571429 | Make every note yours. | edited-C 前两小节 |
| 8.571429–12.857143 | Find your perfect key. | edited-D 前两小节，小提琴轻叠入 |
| 12.857143–17.142857 | Hear it come alive. | edited-D 第三、四小节 |
| 17.142857–25.714286 | One score. More voices. | ensemble-D，长笛、小提琴、钢琴三声部 |
| 25.714286–30 | Bring your music to life. | D 大调终止和弦、品牌落版；CTA：Start with your score. |

音频时间轴包含 87 个与谱面编号逐一对应的事件，以及 8 个单独标记的收尾和弦音。收尾和弦不触发任意旋律音符高亮。音轨为精确 30 秒、48 kHz 立体声，实测 −15.9 LUFS、峰值约 −6.1 dBFS，尾部归零。

## 可复现制作

依赖：项目 Node.js 依赖及已构建的 API 乐谱解析模块、Microsoft Edge、Python NumPy／SciPy、FFmpeg。无需外部音乐素材、付费生成接口或 SoundFont 下载。

在项目根目录依次执行：

```powershell
node scripts/prepare-commercial-score.mjs
python scripts/render-commercial-audio.py
node scripts/render-score-commercial.mjs
```

制作文件：

- `scripts/prepare-commercial-score.mjs`：原创谱、各变体 MusicXML、语义谱面 SVG 与逐音符坐标。
- `scripts/render-commercial-audio.py`：从变体音符数据生成配乐、乐器分轨和同步事件。
- `scripts/render-score-commercial.mjs`：按分镜制作运动图形并合成最终影片、封面、英文字幕。
- `.tmp/score-commercial/score-assets/`：谱面、播放模型回读结果及 `verification.json`。
- `.tmp/score-commercial/audio/`：`first-light-30s.wav`、M4A、三条分轨、`timeline.json`、`validation.json`。

最终媒体路径：

- `apps/www/public/product/commercial/v2/scoretransposer-30s.mp4`
- `apps/www/public/product/commercial/v2/poster.webp`
- `apps/www/public/product/commercial/v2/captions-en.vtt`

首页通过 `apps/www/src/lib/product-commercial.ts` 引用统一媒体。旧 `scripts/verify-product-commercial.mjs` 针对点击播放版；当前背景版应运行 `node scripts/verify-product-backdrop.mjs`。正式站已另外完成九语言位置、SEO 快照、桌面／手机真实循环和声音开关及媒体哈希验收，证据见当前生产发布记录。
