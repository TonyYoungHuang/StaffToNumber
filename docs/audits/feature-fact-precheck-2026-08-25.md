# 11 个公开功能页证据预审记录

- 预审日期：2026-08-25
- 预审主体：AI evidence precheck
- 批准日期：2026-08-28
- 批准主体：ScoreTransposer product owner
- 审批角色：`product_owner`
- 预审方式：逐项核对仓库中的现有产品截图、可解析原生示例、实现路径、测试和公开边界文案。
- 内容来源透明度：页面文案含 AI 辅助生成，记录保留 `generatedWithAi: true`。

本文件同时保留 2026-08-25 的 AI 证据预审和 2026-08-28 的产品所有者人工批准记录。产品所有者已明确同意按下表事实边界批准全部 11 个页面；代码审核状态已更新为 `approved`。

| 页面 | 预审结论 | 经批准的事实边界 |
|---|---|---|
| `/staff-to-jianpu` | Precheck complete | 从已复核的结构化 Score JSON/MusicXML 生成简谱，不从 PDF 像素直接编辑。 |
| `/jianpu-to-staff` | Precheck complete | 接受结构化简谱语法；自由文本或有歧义输入可能需要校正。 |
| `/transpose-score` | Precheck complete | 支持半音、目标调和移调乐器模式，并创建新 revision；音域和拼写仍需检查。 |
| `/score-editor` | Precheck complete | 已有小节/事件级校正、修订和协作能力；没有宣称已达到 MuseScore 全量雕版范围。 |
| `/score-to-audio` | Precheck complete | 现有播放和导出控制可核验；高质量 WAV/MP3 依赖 FluidSynth、SoundFont 与 ffmpeg。 |
| `/audio-to-score` | Precheck complete | Basic Pitch 是实验性候选流程，仅用于获准音源并要求人工复核；现有截图只证明统一任务队列，不证明识别精度。 |
| `/musicxml-midi` | Precheck complete | MusicXML/MIDI 示例和导出路径可核验；MIDI 制谱仍是需复核的结构草稿。 |
| `/pdf-score-scanner` | Precheck complete | 截图显示源谱、候选谱和诊断；明确采用“导入 + 校正”，不承诺普遍完美。 |
| `/pdf-to-musicxml` | Precheck complete | 输出是可复核的 MusicXML/Score JSON 候选，并保留来源和诊断。 |
| `/teaching` | Precheck complete | 当前只按 Classroom / School Beta 范围核验，包括班级、作业、提交、反馈和进度，不宣传为完整 LMS 替代品。 |
| `/pricing` | Precheck complete | 套餐目录和额度有测试覆盖；生产 checkout 受配置门槛控制，只有在 Live 支付闭环验证后才启用。 |

代码中的审批记录位于 `apps/www/src/lib/feature-seo.ts`。每条记录包含：

- `status: approved`
- `factsReviewedAt: 2026-08-28`
- `approvedBy: ScoreTransposer product owner`
- `reviewerRole: product_owner`
- 带日期和逐页证据边界的 `approvalBasis`

## 产品所有者一次性确认语句

产品所有者已于 2026-08-28 阅读上述 11 行并作出以下明确回复：

> 我作为 ScoreTransposer 产品所有者，已阅读 2026-08-25 的 11 个功能页证据预审记录，同意按表中事实边界批准这 11 个页面；请将它们的审核状态更新为 approved，并记录我的角色为 product_owner、确认日期为实际回复日期。

本次批准只覆盖上表记录的事实边界，不扩张为未列明的识别准确率、完整雕版能力或完整 LMS 能力承诺。页面内容或证据变化会改变 manifest hash；数据库侧既有审批也会随 hash 失效，必须重新核验。
