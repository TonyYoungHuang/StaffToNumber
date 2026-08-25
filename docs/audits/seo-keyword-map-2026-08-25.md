# ScoreTransposer 新功能英文 SEO 关键词地图

更新时间：2026-08-25

## 研究口径

本轮面向美国、英国、德国、法国和荷兰的英文搜索习惯，交叉查看了 Google Autocomplete、当前 Google 搜索结果，以及 Flat、Noteflight、MuseScore、IMSLP、Musopen 的公开产品用语。

Google Trends Explore 与非公开接口在研究时返回 429，公开版 Semrush／Ahrefs 也没有提供可验证的逐词搜索量。因此本文只记录真实出现的搜索表达和意图优先级，不把自动补全顺序冒充月搜索量，也不填写虚构的 Volume、KD 或 CPC。

证据等级：

- `E`：Google Autocomplete 在至少一个目标地区明确出现。
- `C`：当前竞品或搜索结果明确采用该表达。
- `I`：语义合理的长尾词，只适合正文或 FAQ，不宣称有搜索量。

## 已投产页面归属

| 优先级 | 搜索意图 | 主承载页 | 主词 | 同页覆盖词 | 页面落点 |
| --- | --- | --- | --- | --- | --- |
| P0 | 在线乐谱编辑、分谱、协作 | `/score-editor` | `sheet music maker` | `sheet music editor`、`extract parts from score`、`split score into parts`、`collaborative sheet music editor`、`collaborative music notation software` | Title、H1、首段、功能模块、H2、结构化数据、功能总览内链 |
| P0 | 乐谱生成音频与练习 | `/score-to-audio` | `sheet music to mp3` | `sheet music to mp3 converter`、`musicxml to mp3`、`sheet music to audio converter`、`sheet music player`、`music practice recording app`、`sheet music practice app` | Title、H1、首段、练习流程、H2、FAQ、功能总览内链 |
| P0 | MusicXML、MIDI 与打印图片导出 | `/musicxml-midi` | `musicxml editor` | `musicxml to midi`、`midi to sheet music`、`musicxml to pdf`、`export sheet music to pdf`、`sheet music svg`、`sheet music png` | Title、首段、模块、导出 H2、结构化数据、功能总览内链 |
| P1 | 音乐课堂与学校 | `/teaching` | `music notation software for students` | `music education software`、`music education platform`、`music classroom apps`、`music teacher software`、`music performance assessment` | Title、H1、首段、模块、课堂 Beta H2、功能总览内链 |
| P0 | 公版曲库 | `/library` | `public domain sheet music` | `public domain sheet music library`、`free sheet music`、`free classical sheet music PDF`、`piano sheet music`、`orchestral sheet music`、`choral sheet music` | Title、H1、首段、权利说明 H2、CollectionPage、单曲内链 |
| P1 | 全功能发现 | `/features` | `online sheet music software` | 上述新增能力的自然表达 | 独立 Title／Description／OG／Twitter、可见功能卡片、ItemList 与语义内链 |

这些页面采用“一项主意图一个主承载页”的策略。应用工作区保持 `noindex`，所以公开 SEO 文案必须存在于 `apps/www`，不能只写在登录后的功能页面。

## 新功能的正式名称与搜索表达

正式产品名继续用于功能卡片和 Beta 标识；搜索表达进入标题、正文和内部链接，避免要求用户先知道内部命名。

| 正式产品名 | 用户更常搜索的表达 | 边界 |
| --- | --- | --- |
| Part Copy Generator Beta | `extract parts from score`、`split score into parts`、`score part extractor` | 副本保留来源关系，但暂不跟随总谱后续修改。只有 PDF 识别入口真实可用时才使用 `extract parts from score pdf`。 |
| Browser Recording & Practice Feedback Beta | `music practice recording app`、`sheet music practice app`、`practice sheet music online` | 当前是单旋律、可复核的音高与节奏观察，不宣传认证评分或任意多声部自动准确率。 |
| Real-time Collaboration Beta | `collaborative sheet music editor`、`collaborative music notation software` | 避免主打 `online music collaboration`，该词常指 DAW 或远程合奏。 |
| High-quality PDF, SVG & PNG Export | `musicxml to pdf`、`convert sheet music to pdf`、`musicxml to png`、`musicxml to svg` | 对应 MuseScore 渲染服务可用时生成，不能在服务未配置时承诺即时成功。 |
| WAV & MP3 Audio Export | `sheet music to mp3`、`sheet music to mp3 converter`、`musicxml to mp3`、`musicxml to wav` | 与反向意图 `audio to sheet music` 分开；高质量导出依赖 FluidSynth、许可明确的 SoundFont 与 ffmpeg。 |
| Classroom / School Beta | `music notation software for students`、`music education software`、`music education platform`、`music classroom apps` | 只描述已有的班级、作业、提交、录音、评分量规、反馈与有限 LTI 试点；不宣称尚未证明的 LMS 或教育合规认证。 |

## 后续独立页面顺序

当前先把搜索意图合并到已有、具备真实产品截图和输入／输出证据的公开页，避免一次生成多个内容薄弱的转换器页面。取得对应真实截图与可复现案例后，再按以下顺序拆成独立 canonical 页面：

1. `/extract-parts-from-score`
2. `/sheet-music-to-mp3`
3. `/musicxml-to-pdf`
4. `/collaborative-sheet-music-editor`
5. `/music-practice-recorder`

拆页时必须同步补齐独立 Title、H1、Description、FAQ、HowTo、SoftwareApplication、真实截图、输入／输出案例，以及至少两条上下游内链。不能复用无关截图或用同义词批量生成薄页面。

## Google 收录规则

- Google 不使用 `meta keywords` 参与网页排名。关键词应自然进入独立 Title、H1、首段、少量 H2、FAQ、图片替代文本和上下文内部链接。
- Description 负责解释输入、输出和真实边界，不写逗号分隔的关键词堆。
- 每个精确查询只指定一个主要承载页面，防止多个页面竞争同一意图。
- `free` 只用于一个完整免费项目、明确 CC0 下载或真实免费边界，不暗示全部曲库文件都由本站免费下载。
- Google Search Console 出现真实 Impression／Click 后，再按国家、查询和页面复盘；获得 Keyword Planner 或付费 SEO 平台导出后，才补充 Volume、KD 与 CPC。

## 公开来源

- [Google Autocomplete 工作原理](https://support.google.com/websearch/answer/7368877?hl=en)
- [Google 对 meta keywords 的说明](https://developers.google.com/search/docs/crawling-indexing/special-tags)
- [Google 垃圾内容政策：关键词堆砌](https://developers.google.com/search/docs/essentials/spam-policies)
- [Google 搜索摘要说明](https://developers.google.com/search/docs/appearance/snippet)
- [Flat 实时乐谱协作](https://flat.io/collaboration)
- [Flat 音乐教育平台](https://flat.io/edu/)
- [Flat 学生演奏评估](https://flat.io/edu/performance)
- [Noteflight 录音与演奏评估](https://support.noteflight.com/hc/en-us/articles/360020205872-Recording-Audio-for-Performance-Assessment)
- [MuseScore Handbook：分谱与导出格式](https://handbook.musescore.org/appendix)
- [IMSLP 公版乐谱库](https://imslp.org/?lang=en_GB)
- [Musopen Free Sheet Music](https://musopen.org/sheetmusic/)
