# ScoreTransposer 对标 Noteflight / MuseScore 的功能差距与补齐路线图

> 调研日期：2026-08-24
> 比较对象：Noteflight Premium、Noteflight Learn、MuseScore Studio、MuseScore.com
> 本文只规划产品能力，不修改套餐价格、支付配置或权益代码。

## 1. 结论

ScoreTransposer 已经拥有一批比公开页面所呈现的能力更深的本地实现：结构化校正、专业符号模型、分谱提取、复杂移调、简谱双向转换、练习播放、录音分析、分享权限、实时协作、作业和课堂等。它们多数仍处于“本地可用”或“开发中”，不能直接当作生产权益开放。

最优补齐顺序不是立刻复制一个完整 MuseScore，而是：

1. **先把已有能力经过真实引擎、生产环境和跨设备 QA 后开放**，快速扩大 Starter / Converter Pro 的可感知权益。
2. **短期补齐空白制谱、乐器目录、模板、公共曲库分类/搜索/收藏**，让 `sheet music maker` 用户不必先上传文件才能开始。
3. **保留并强化 OMR、五线谱/简谱互换、音域与移调乐器处理**，这是 Noteflight 和 MuseScore 没有形成同样闭环的差异化工作流。
4. **市场销售、大规模版权曲库、官方课程和 MuseScore 级全符号雕版属于长期业务**，需要法务、内容运营、支付分账、审核与客服体系，不能当作普通编辑功能排期。

## 2. 比较口径

这些产品不是同一种形态：

- **Noteflight Premium**：浏览器制谱器 + 互动曲库 + 分享/社区 + ArrangeMe 销售入口。
- **Noteflight Learn**：课堂、作业、活动模板和 LMS，不能把 Learn 能力算进个人 Premium 套餐。
- **MuseScore Studio**：免费、开源的桌面专业制谱软件；编辑能力不能和 MuseScore.com 订阅混为一谈。
- **MuseScore.com**：云端曲库、搜索、播放、收藏、课程、Official Scores 和社区。
- **ScoreTransposer**：浏览器内“导入/识别 -> 校正 -> 转换/移调 -> 练习 -> 导出”的 MusicXML-first 工程工作流。

因此本文按用户任务比较，不按官网功能条目数量简单计分。

## 3. 官方功能基线

### 3.1 Noteflight

Noteflight Premium 官方页面当前列出的核心能力包括：无限乐谱、专业记谱和格式、85 种高级播放乐器、MIDI 乐器录入、音量/混响、80,000+ 互动乐谱、公开/私密分享、自定义群组、ArrangeMe 销售、录音、媒体同步和 Perform Mode。[Noteflight Premium](https://www.noteflight.com/premium)

官方帮助中心进一步确认：

- 可从空白模板创建，或直接导入 XML/MIDI；可导出 PDF、MIDI、WAV、MP3 等格式，部分导出是 Premium 权益。[导入与导出](https://support.noteflight.com/hc/en-us/articles/360021512951-Importing-and-Exporting-Music)
- 分享权限分为 View、Comment、Edit，可分享给指定用户或群组；新乐谱默认私密。[分享乐谱](https://support.noteflight.com/hc/en-us/articles/360021512371-Sharing-Scores)
- Premium 用户最多创建 3 个群组，群组含成员、论坛和群组乐谱。[群组与论坛](https://support.noteflight.com/hc/en-us/articles/360021269632-Groups-and-Forums)
- 社区支持评论、收藏和关注用户。[评论、收藏与关注](https://support.noteflight.com/hc/en-us/articles/360021269672-Commenting-Favoriting-and-Following)
- Premium 支持独立分谱格式和按乐器移调打印。[独立分谱格式](https://support.noteflight.com/hc/en-us/articles/360021512931-Independent-Parts-Formatting-video)、[打印乐谱](https://support.noteflight.com/hc/en-us/articles/360030499232-Printing-Scores)
- 编辑器覆盖歌词、多段歌词、和弦图、三连音/连音组、多声部、字体、样式、弱起小节等。[编辑器功能目录](https://support.noteflight.com/hc/en-us/sections/360003049772-Using-the-Editor)
- Premium/Learn 支持录音与 YouTube/SoundCloud 媒体同步、按声部混音。[Audio Sync](https://support.noteflight.com/hc/en-us/articles/360020205912-Recording-with-Audio-Sync)
- SoundCheck 可对音高、节奏和音准给出即时反馈，但这是可附加能力，不能默认等同于基础 Premium。[SoundCheck 概览](https://support.noteflight.com/hc/en-us/articles/4403653528212-SoundCheck-in-Noteflight-Premium-Assessment-Overview)
- Learn 的 Activity Template 会为每个学生生成独立副本并集中反馈，这是教学产品能力。[Noteflight Learn 作业](https://support.noteflight.com/hc/en-us/articles/360020579032-Creating-Assignments-in-a-Standalone-Site)
- 2026-06 的 PDF Imports 仍被官方标为 Premium Feature Preview、work-in-progress，并明确说明 OMR 远非完美；这会开始与 ScoreTransposer 的 OMR 重合，但“候选 + 校正 + 简谱/移调”仍可形成更完整的差异。[Noteflight 2026 夏季功能发布](https://notes.noteflight.com/noteflights-big-summer-feature-release/)

边界：Noteflight 可以授予他人编辑权限，但官方社区截至 2025 年仍在请求 Google Docs 式 simultaneous live edits，因此本文不把它记为已明确承诺的多人实时协同编辑。[功能请求证据](https://support.noteflight.com/hc/en-us/community/posts/33431147067156-LIVE-EDITS)

### 3.2 MuseScore Studio 与 MuseScore.com

MuseScore Studio Handbook 显示其免费桌面编辑器覆盖：空白/模板制谱、音符和休止符、多声部、乐器与谱表、节奏/调式、表情和反复、键盘/吉他/竖琴/打击乐专用记谱、歌词/指法/和弦/数字低音、专业页面排版、分谱、MusicXML/MIDI、Mixer、SoundFont、MuseSounds、VST、插件和盲文等。[MuseScore Studio Handbook](https://handbook.musescore.org/)

MuseScore 官网同时明确写着 Studio 免费且无限制、支持 MIDI 键盘、MusicXML/MIDI 互通和超过 500 种乐器；这决定了基础制谱能力不能单独成为 ScoreTransposer 的高价壁垒。[MuseScore Studio 官网](https://musescore.org/zh-hans)

重要细节：

- 新建向导可以按 Category 浏览或搜索模板，并设置初始调号、拍号、速度和弱起。[创建第一份乐谱](https://handbook.musescore.org/introduction/create-your-first-score)
- 每个乐器自动生成默认分谱，也可创建自定义分谱，并分别导出 PDF、图片、音频或盲文格式。[Parts](https://handbook.musescore.org/basics/parts)
- 支持 MIDI 输入/输出设备、MIDI 键映射和 MIDI/MusicXML 导入选项。[Preferences](https://handbook.musescore.org/customization/preferences)
- 可导出 PDF、SVG、PNG、MusicXML、MIDI、MEI、MP3、WAV 等。[File export](https://handbook.musescore.org/en_gb/file-management/file-export)
- 可使用 MuseSounds、SoundFont、VST/VSTi；Mixer 可按乐器控制音色、音量和声像。[MuseSounds](https://handbook.musescore.org/sound-and-playback/installing-musesounds)
- 云端乐谱具有 Private、Unlisted、Public 可见性，并支持备份、跨设备查看/播放、分享和评论。[打开与保存乐谱](https://handbook.musescore.org/file-management/opening-and-saving-scores)

MuseScore.com 的曲库是独立产品。当前搜索页公开展示以下筛选维度：难度、Official/Community、Interactive/PDF、合奏形式、乐器家族、曲风、声部数量、免费状态和许可，并显示播放、保存、评价等互动数据。[MuseScore.com 乐谱搜索](https://musescore.com/sheetmusic/pdf)

MuseScore.com 还把课程按乐器、难度、主题和时长分类，主题包括演奏、乐理、作曲、耳训、录音和软件等。[MuseScore Courses](https://musescore.com/courses)

边界：MuseScore Studio 本身不能直接把 PDF 当作可编辑乐谱打开；其 `Import PDF` 会转到 MuseScore.com 的转换服务。MusicXML 互操作也仍可能需要清理。[MusicXML 说明](https://handbook.musescore.org/file-management/working-with-musicxml-files)

## 4. 当前仓库的真实能力

状态词必须按仓库规则理解：有界面或代码不等于商用完成。当前 README 明确写着项目仍处于 pre-production，真实外部音乐引擎、生产存储、监控、备份和统一预发布仍有门禁。证据：`README.md:3-33`、`docs/music-notation-platform-development.md:67-94`、`docs/audits/manual-functional-qa-2026-08-21.md:1-13`。

### 4.1 已经实现或已有完整骨架

| 能力 | 仓库证据 | 当前判断 |
| --- | --- | --- |
| PDF/图片 OMR 候选、原图坐标、置信度、接受/拒绝 | `services/api/src/routes/scores.ts:5122`；`apps/app/src/components/ScoreOmrReviewPanel.tsx`；`services/worker/src/audiveris-omr-diagnostics.ts` | 核心差异化；仍需真实 Audiveris 容器和生产 QA |
| MusicXML/MXL、MIDI、结构化简谱、音频、备份导入 | `apps/app/src/app/scores/new/[source]/page.tsx:11-36`；`services/api/src/routes/scores.ts:4853-5285` | 多入口已存在；音频入口由环境开关控制 |
| Score JSON v2 专业符号模型 | `packages/shared/src/index.ts:386-694` | 支持调号、拍号、谱号、歌词、和弦、力度、速度、连音、奏法、连梁、连音组、装饰音、反复和排版提示 |
| 图形编辑和结构化校正 | `apps/app/src/components/ScoreVisualEditorPanel.tsx:910-1143`；`apps/app/src/components/ScoreCorrectionPanel.tsx:86-149` | 可插入/删除/移动/复制音符，并编辑大量符号；信息架构仍偏“校正面板”，不等同成熟制谱 palette |
| 分谱提取和谱号建议 | `services/api/src/routes/scores.ts:1807-1860`；`apps/app/src/components/ScoreDetailClient.tsx:2719-2770` | 可生成独立派生乐谱；还不是与总谱联动的 linked parts 排版体系 |
| 复杂移调、移调乐器和音域建议 | `packages/shared/src/index.ts:25-122`；`services/api/src/routes/scores.ts:3203-3547` | 明显差异化；复杂 music21 路径仍需真实引擎验收 |
| 五线谱/简谱双向工作流 | `packages/shared/src/index.ts:727-818`；`services/api/src/routes/scores.ts:4196-4226, 4664-4731, 4853-4911` | 中文市场一等能力；应持续做真实合法谱金标 |
| 练习播放 | `apps/app/src/components/ScorePlaybackPanel.tsx:138-201, 481-731` | 已有变速、选段循环、节拍器、倒拍、声部 solo/mute、声部音量和逐轮加速 |
| 录音和逐音反馈 | `apps/app/src/components/PracticeRecorder.tsx:57-132, 383-443` | 已有音高/节奏关注点和录音提交；不应在生产 QA 前对标 SoundCheck 的准确率 |
| 多格式导出 | `packages/shared/src/index.ts:338-369`；`services/api/src/routes/scores.ts:3103-3157, 4276-4847` | MusicXML/MIDI/PDF/SVG/PNG/WAV/MP3 均有路径；MuseScore/FluidSynth/ffmpeg/SoundFont 生产门禁未闭合 |
| View/Comment/Edit 分享和评论 | `services/collaboration/src/access.ts:6-32`；`services/api/src/routes/scores.ts:1963-2085` | 权限模型比普通公开链接完整；需要生产安全/到期/撤销回归 |
| Yjs/Hocuspocus 实时协作 | `services/collaboration/src/server.ts`；`services/collaboration/src/server.integration.test.ts:238-325` | 已有 20 人收敛、只读阻断、离线冲突测试；仍未完成生产故障演练 |
| 课堂、作业、提交、反馈和 LTI 骨架 | `services/api/src/routes/scores.ts:2356-3044`；`services/api/src/routes/education.ts`；`services/api/src/routes/lti.ts` | 功能面较深；真实 Canvas/Moodle、Deep Linking 和生产通知未闭合 |
| 版本和恢复 | `score_revisions` 数据表、`/scores/:id/revisions/:revisionId/restore` | 已有不可变修订；适合作为所有创作和协作能力的底座 |

### 4.2 当前明确缺少的产品层

1. **空白制谱入口缺失**：新建页只有 scan、jianpu、musicxml、midi、audio、backup，没有 blank/template。证据：`apps/app/src/app/scores/new/page.tsx:12-43`。
2. **没有正式乐器目录和模板系统**：目前只有少量移调乐器 profile 和 24 个 MIDI preset；没有带谱表数、默认谱号、音域、移调、TAB/打击乐规则、模板版本的 instrument catalog。证据：`packages/shared/src/index.ts:25-183`。
3. **没有公共曲库数据模型**：`score_documents` 只有所有者、标题、修订、来源和设置；没有作品/版本、公开发布状态、作者/年代、许可、分类、标签、难度等。证据：`services/api/src/db.ts:404-421`。
4. **没有曲库搜索、收藏、合集、关注**：`GET /scores` 只返回当前用户自己的乐谱，没有公共搜索、排序或筛选。证据：`services/api/src/routes/scores.ts:1580-1594`。
5. **没有社区群组/论坛**：课堂模型不能直接当作公开社区群组；缺少加入审批、版主、举报、封禁和 UGC 审核。
6. **没有销售市场**：虽有版权投诉后台，但没有 seller onboarding、商品、报价、许可范围、税务、分账、退款和销售报表。
7. **没有浏览器硬件 MIDI 输入**：仓库支持 MIDI 文件导入及编辑器内 MIDI 音高数值转换，但未发现 `requestMIDIAccess`/Web MIDI 接入。
8. **没有与总谱联动的独立分谱排版**：当前是提取声部并创建派生工程，不是 Noteflight/MuseScore 那种总谱内容变更自动反映到分谱、同时保留分谱独立布局覆盖。
9. **音色库尚不能形成稳定权益承诺**：有 MIDI program、FluidSynth、SoundFont 和导出参数，但商用 SoundFont 许可和真实工具容器尚未通过。
10. **不是 MuseScore 级全符号编辑器**：现有通用五线谱符号已经很强，但吉他 TAB/和弦图、打击乐映射、竖琴踏板、古乐谱、自由文本/框架、插件、盲文等专业边角仍缺失。

## 5. 功能差距矩阵

标记：`强` = 已形成成熟产品；`有` = 已有可用路径；`开发中` = 仓库有实现但不能直接商用；`缺` = 无完整产品路径。

| 用户任务 | Noteflight Premium | MuseScore Studio / .com | ScoreTransposer | 决策 |
| --- | --- | --- | --- | --- |
| 空白制谱 | 强，浏览器 | 很强，桌面模板 | 缺 | P0 短期必补 |
| 模板和乐器建制 | 有 | 很强 | 缺正式目录 | P0 与空白制谱一起做 |
| 常规符号编辑 | 强 | 很强 | 开发中且底层较强 | 先 QA、再重构 palette |
| 专业雕版/自由排版 | 有 | 很强 | 开发中，覆盖部分 | 聚焦常见谱型，不追求一次全补齐 |
| 总谱/联动分谱 | 强 | 很强 | 仅派生分谱 | P1 建 linked parts |
| MIDI 文件导入 | 有 | 有 | 有 | QA 后开放 |
| MIDI 键盘录入 | 有 | 强 | 缺 | P1 快速补齐 |
| 播放音色 | 85 种 | 500+ 乐器生态 | 音色路径开发中 | 先做 16–32 个许可清晰的核心音色 |
| 变速/循环/节拍器/分声部 | 有 | 强 | 开发中且功能面强 | QA 后优先开放 |
| 录音/练习反馈 | 可附加 SoundCheck | App/课程生态 | 开发中 | 以 Beta 开放，明确边界 |
| 公共曲库和搜索 | 80,000+ | 大型库 | 缺 | P0 先做公版/CC 小型精选库 |
| 分类、标签、难度筛选 | 有 | 很强 | 缺 | P0 和公共库一起做 |
| 收藏、合集、关注 | 有 | 有 | 缺 | P1 做收藏/合集，关注稍后 |
| 分享 View/Comment/Edit | 强 | 云端分享/评论 | 开发中且权限完整 | QA 后开放 |
| 多人实时编辑 | 未明确支持 | 非网页实时编辑器 | 开发中 | 可成为差异化，但需生产压测 |
| 群组/论坛 | 有 | 社区 | 缺公共社区 | P2，先做私有工作组 |
| 作业/课堂/LMS | Learn 产品 | 课程为主 | 开发中且较深 | 单独 School Beta，不塞进个人套餐首页 |
| 销售乐谱 | ArrangeMe | 内容生态 | 缺 | 长期、法务/分账型 |
| PDF/图片 OMR + 校正 | Beta/有限 | 外部网页转换 | 核心开发中 | 继续做第一差异化 |
| 五线谱/简谱双向 | 非核心 | 非核心 | 核心开发中 | 继续做第二差异化 |
| 音域/移调乐器优化 | 有 | 强 | 核心开发中 | 结合声乐/管乐模板强化 |

## 6. 可立即开通，但必须先完成 QA 的能力

“立即”指无需重建核心数据模型，通常已有代码和界面；不表示现在就可以上线宣传。

### 6.1 专业校正与符号编辑

开放范围：音高、时值、附点、声部、谱表、和弦音、歌词、指法、连音线、圆滑线、奏法、连梁、连音组、装饰音、调号、拍号、谱号、速度、力度、渐强/渐弱、反复和页面/系统换行。

上线前门禁：

- 单旋律、钢琴、SATB、移调乐器四套真实谱进行创建、编辑、刷新、MusicXML 导出、第三方重开。
- 图形 palette 与属性面板必须使用同一 canonical command，撤销/重做和协作结果一致。
- 不把“支持数据模型”写成“所有符号都能自由拖拽雕版”。

### 6.2 分谱提取

当前可先以“从总谱生成声部副本”开放，不宣传为“联动分谱”。

上线前门禁：多声部选择、标题、谱号推荐、移调乐器书写音高、MusicXML/PDF 导出全部回归；明确副本生成后不会自动跟随总谱继续更新。

### 6.3 练习播放与录音 Beta

可开放：变速、按小节循环、倒拍、节拍器、声部 solo/mute、音量、逐轮加速、浏览器录音、逐音音高/节奏关注点。

上线前门禁：Chrome/Safari/Edge、桌面/手机的 AudioContext、麦克风权限、休眠恢复、长谱漂移；反馈文案使用“建议人工复核”，不声称等同教师评分或 SoundCheck 准确率。

### 6.4 分享、评论和实时协作 Beta

可开放：view/comment/edit 链接、到期、撤销、谱面批注、在线 presence、离线队列、冲突处理和共享撤销/重做。

上线前门禁：生产 Redis/PostgreSQL、多实例 WebSocket、20 人压测、过期/撤销/跨文档越权、恶意 token、断网重连、备份恢复和事故演练。

### 6.5 作业和课堂私测

建议仅给受邀学校/教师开放，不作为 Starter 的常规权益文案。

可开放：课堂、名册、资源、作业、独立提交、录音、评分量规和反馈。LTI 在至少一个 Canvas/Moodle 沙箱真实完成安装、名册同步、成绩回写前保持 Beta。

### 6.6 高质量导出

MusicXML/MIDI 可优先；PDF/SVG/PNG/WAV/MP3 在 MuseScore、FluidSynth、ffmpeg 和商用 SoundFont 许可证全部通过后开放。失败时要明确显示引擎状态，不允许静默退化成较差音色却仍标记“高质量”。

## 7. 短期补齐方案（建议 8–12 周）

### P0-1：空白制谱与模板（最高优先级）

#### 最小产品

新建乐谱增加 `blank` 和 `template`：

- 标题、作曲者。
- 单乐器或多乐器选择。
- 调号、拍号、速度、弱起、小节数。
- 初始模板：单旋律、钢琴、吉他五线谱、SATB、声乐+钢琴、弦乐四重奏、小型管弦乐、concert band、lead sheet、简谱旋律。
- 创建后直接进入现有 VexFlow/Score JSON 编辑工程。

#### 数据模型

- `instrument_catalog`：稳定 ID、中英文名、家族、默认谱号、谱表数、移调、可演奏音域、书写音域、MIDI program、打击乐/TAB 标志、排序。
- `score_templates`：模板版本、乐器编制、初始 key/time/tempo、布局、公开状态、创建者、许可证。
- 所有模板最终只生成标准 Score JSON；模板本身不能形成另一套编辑模型。

#### 验收

从空白钢琴模板创建 C 大调 4/4 乐谱，插入双手音符和歌词/力度，保存、播放、移调、生成简谱、导出 MusicXML/PDF，再导回后音乐语义保持。

### P0-2：公共曲库最小闭环

先做 100–300 首权利清晰的精选谱，不追求数量宣传。

#### 必需实体

- `works`：抽象作品，标题、别名、作曲者、创作/首发年代。
- `editions`：具体编配/校订版本，关联一个可编辑 `score_document`。
- `contributors`：作曲、编曲、校订、录入、译配等角色。
- `rights_assertions`：版权状态、许可、司法辖区、来源 URL、证据文件、核验人、核验日期、允许下载/修改/商用的范围。
- `publications`：draft/review/published/blocked/takedown 状态。

不可只在 `score_documents.title` 上加一个 `public=true`；作品和版本的权利、作者、编配者必须可独立追踪。

#### 用户体验

- 曲库首页、最新、热门、精选、公版/开放许可。
- 乐谱详情：标题、作者、版本、权利、乐器、难度、声部数、时长、页数、预览、播放、移调、简谱视图、复制到我的工程。
- “复制到我的工程”生成用户私有派生版本，并保留来源和许可证链。

### P0-3：分类与搜索

分类使用多维 facet，不要用单一文件夹。一个“SATB + 钢琴”的作品同时属于声乐、合唱、钢琴、伴奏和四声部。

#### 推荐一级维度

| 维度 | 示例 |
| --- | --- |
| 乐器/声部 | 钢琴、手风琴、口琴、吉他、尤克里里、竖琴、小提琴、中提琴、大提琴、低音提琴、长笛、单簧管、双簧管、巴松、萨克斯、圆号、小号、长号、大号、打击乐、独唱、合唱 |
| 乐器家族 | Keyboard、Free Reed、Plucked Strings、Bowed Strings、Woodwinds、Brass、Pitched/Unpitched Percussion、Voice |
| 编制 | Solo、Solo + Accompaniment、Duet、Trio、Quartet、Chamber、Choir、A Cappella、Orchestra、Concert Band、Big Band |
| 声乐类型 | Solo Voice、SATB、SSA、TTBB、Children's Choir、A Cappella、Voice + Piano |
| 曲风/时期 | Baroque、Classical、Romantic、Modern、Jazz、Folk、World、Religious、Film/Game、Educational |
| 难度 | Beginner、Easy、Intermediate、Advanced；同时保存人工/算法来源 |
| 乐谱形态 | Full Score、Part、Lead Sheet、Staff、Jianpu、Staff+Jianpu、TAB、Chord Chart |
| 权利 | Public Domain、CC0、CC BY、CC BY-SA、Original、Licensed；另存司法辖区 |
| 质量状态 | Verified、Community、Imported、OMR Candidate；候选不能进入默认搜索结果 |

#### 技术路线

- 第一阶段用 PostgreSQL full-text + trigram，搜索标题、别名、作曲者、编曲者和标签。
- 结果支持乐器、编制、难度、时期、许可、格式、声部数筛选，并支持 relevance/newest/popular 排序。
- 曲库扩大后再引入 Meilisearch/OpenSearch；不要第一天就增加额外搜索基础设施。

### P0-4：收藏与合集

新增 `favorites`、`collections`、`collection_items`：

- 收藏公开版本，不复制文件。
- 合集支持私密、非公开链接、公开。
- 删除/下架版本后保留 tombstone 和原因，避免用户合集悄然变化。
- 第一版不做关注动态流，先把“保存以后练习”和“演出曲单”做好。

### P1-1：浏览器 MIDI 键盘输入

- Web MIDI 只在 HTTPS 和用户明确授权后启用。
- 支持单音、和弦、步进输入、时值选择、录入声部/谱表、输入延迟校准和 MIDI learn。
- Safari/iOS 不稳定或不支持时，明确回退到电脑键盘和 MIDI 文件导入。
- MIDI 只是输入投影，最终仍写 Score JSON canonical command。

### P1-2：核心音色包

不要一开始追求 85/500 种。先提供许可清晰、质量稳定的 16–32 个常用音色：钢琴、弦乐、木管、铜管、吉他、手风琴/口琴近似音色、合唱和打击乐。

验收包括：SoundFont 许可证清单、各音色 golden、跨音域听感、循环点、音量一致性、MP3/WAV 导出和 attribution。高级 MuseSounds/VST 式生态属于长期能力。

### P1-3：联动分谱

新增 `score_part_views`，保存：包含哪些 part/voice、显示名称、移调/Concert Pitch、页面布局覆盖、可见元素、最后生成版本。

内容编辑来自总谱，分谱只保存布局覆盖；总谱更新后自动失效并重新生成。不得用复制完整 Score JSON 伪装联动分谱。

### P1-4：把校正面板重构为制谱 palette

基于已有 command 和 Score JSON，不重写编辑引擎：

- 常用栏：音符、休止、附点、升降号、连音、力度、奏法、歌词、和弦。
- 结构栏：调号、拍号、谱号、小节、反复、速度、排版。
- 乐器专用栏：吉他/TAB、打击乐、声乐、键盘逐步增加。
- 搜索命令和快捷键帮助，参考 Noteflight Editor Guide，但不复制其界面。

## 8. 中期能力（3–6 个月）

### 8.1 私有工作组，而不是先做开放论坛

利用现有 classroom/share/collaboration 底座先做：工作组、邀请、角色、组内曲库、评论、排练列表和通知。补齐成员审批、管理员、举报和审计后，才考虑开放公共群组。

### 8.2 练习产品化

- 练习历史、目标速度、连续练习、每小节问题趋势。
- 教师可冻结速度、声部、循环区间和尝试次数。
- 反馈分“自动分析”和“教师评语”，两者视觉上严格区分。
- 建立单旋律/声乐/乐器类别基准，公开说明不支持或低可信的复音场景。

### 8.3 用户发布与社区审核

- 用户可把自有/有权内容发布为 Public/Unlisted。
- 发布前填写作者、编配、许可、来源和版权声明。
- 自动重复内容/元数据检查、人工举报、下架、申诉、DMCA/版权投诉关联。
- 评论、收藏可先开放；关注、动态流、榜单在有足够内容后再做。

### 8.4 曲库质量运营

建立“Verified Edition”流程：结构验证、播放检查、版面检查、来源/许可复核、双人审核、版本更新和撤回。OMR 自动结果只有通过复核后才能进入 Verified。

## 9. 长期高成本或版权型能力

### 9.1 乐谱销售市场

这不是增加一个“购买”按钮。至少需要：

- 卖家实名/KYB、税务资料和支付分账。
- 原创、公版编配、受版权保护歌曲授权的不同上架流程。
- 商品、地区、币种、许可范围、打印/下载次数、退款和撤回。
- 平台佣金、卖家结算、发票、欺诈、chargeback、客服和报表。
- 指纹/重复内容、版权投诉、反通知、法务保留和审计。

在没有版权合作方之前，不应承诺 Noteflight + ArrangeMe 或 MuseScore Official Scores 规模。

### 9.2 大型版权曲库与课程

80,000+ 或百万级曲库的难点是版权、编配、录入质量和内容运营，不是对象存储。应先证明公版/开放许可曲库能带来搜索、收藏、复制和付费转化，再谈出版社合作。

课程同样需要老师、视频版权、课程结构、进度、测验和客服。短期可先做与公开乐谱绑定的免费练习指南，而不是复制 MuseScore Courses。

### 9.3 MuseScore 级全专业雕版

吉他 TAB/推弦、鼓组映射、竖琴踏板、古乐谱、微分音、自由文本框架、插件、盲文、复杂碰撞和出版级分页是多年工程。建议按真实用户数据逐个扩展，而不是以“符号数量追平”为里程碑。

### 9.4 大型音色/VST 生态

高质量采样库涉及 GB 级下载、采样许可、流式加载、设备性能、效果器、离线渲染和内容商店。当前先把核心音色、练习播放和服务器导出做稳定。

## 10. 建议排期

| 阶段 | 时间 | 交付 |
| --- | --- | --- |
| Gate 0 | 2–3 周 | 真实引擎/生产 QA；开放现有编辑、练习、分享、分谱提取和导出中已通过的部分 |
| P0 | 4–6 周 | 空白制谱、乐器目录、10 个模板、公共曲库 schema、100–300 首权利清晰内容、分类/搜索 |
| P1 | 4–6 周 | 收藏/合集、Web MIDI、核心音色包、linked parts 第一版、编辑 palette 重构 |
| P2 | 6–10 周 | 私有工作组、社区发布审核、练习历史、School Beta 与真实 LMS 沙箱 |
| P3 | 按业务验证 | 出版社/ArrangeMe 类合作、销售市场、大型曲库、课程和专业雕版长尾 |

排期可以并行，但 Gate 0 不通过的能力不能因为 P0 页面完成就进入付费权益文案。

## 11. 每项功能的统一验收标准

1. **数据一致性**：导入、编辑、播放、移调、简谱和导出来自同一 Score JSON 修订。
2. **MusicXML round-trip**：核心音乐语义在导出、第三方打开、重新导入后保持。
3. **权限**：owner/editor/commenter/viewer、公开/非公开、过期/撤销均有越权测试。
4. **版权**：每个公共版本都有可审计 rights assertion；未知权利默认不发布。
5. **可恢复性**：删除、下架、任务失败、协作冲突和外部引擎失败均能恢复或解释。
6. **真实环境**：不能用配置存在、Dockerfile 存在或 mock 通过替代真实工具/存储/浏览器验收。
7. **口径**：OMR、音频转谱和自动练习分析必须标示候选/概率边界。
8. **可访问性**：键盘、屏幕阅读器、缩放、移动端和低性能设备走查。

## 12. 本轮不应做的事

- 不为了“有空白制谱”另建一套脱离 Score JSON 的 canvas 数据。
- 不把下载到的公版 PDF 直接当作可编辑源或默认全球公版。
- 不把 OMR 候选未经审核直接收入公共曲库。
- 不把课堂当作公共社区群组直接开放。
- 不把分谱副本宣传成 linked parts。
- 不把通用 MIDI program 数量宣传成高质量音色数量。
- 不在商用 SoundFont、真实容器和支付/存储未闭合时承诺高质量无限导出。
- 不把 MuseScore Studio 的免费桌面编辑能力算成 MuseScore.com 付费权益，也不把 Noteflight Learn 算进个人 Premium。

## 13. 推荐的对外定位

短期完成上述 P0/P1 后，产品可以准确表述为：

> Create a score from scratch or turn a PDF, image, MusicXML, MIDI, Jianpu, or melody recording into a reviewable score. Edit, transpose, practice, collaborate, convert staff notation and Jianpu, and export from one versioned browser workspace.

中文：

> 从空白开始制谱，或把 PDF、图片、MusicXML、MIDI、简谱和旋律录音导入为可校正乐谱；在同一个有版本记录的浏览器工作台中编辑、移调、练习、协作、转换五线谱与简谱并导出。

这比“我们也有一个在线 MuseScore”更可信，也能把 OMR、简谱和工程化转换三项差异展示出来。
