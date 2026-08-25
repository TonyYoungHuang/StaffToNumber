# 公版与开放授权乐谱库建设方案

> 核验日期：2026-08-24
> 适用产品：ScoreTransposer / 五线谱综合工作台
> 本文是产品、数据与运营方案，不替代目标市场律师的正式法律意见。

## 1. 结论

可以建设古典、古乐、交响乐、室内乐、钢琴、吉他、声乐、合唱与阿卡贝拉等公版乐谱库，但不能把“作曲家的作品已经进入公版”理解成“网上找到的任何 PDF、校订版、编曲、歌词、封面和录音都可以直接复制”。

建议采用以下产品策略：

- 公版/开放授权曲库的浏览、搜索、预览、基础播放和来源说明保持免费，以获得 SEO 页面、自然外链和用户信任。
- 订阅收入来自识谱、私人项目、深度校正、移调、五线谱/简谱转换、多格式导出、批处理和高质量音频，不把“别人已经公版的内容”包装成独占资产。
- 曲库以 MusicXML 为主要交换与归档格式；编辑器内部继续以 Score JSON 为工作源，二者必须能够追溯到同一版本。
- 优先接入已有明确开放许可的结构化乐谱，不要先对海量扫描 PDF 做 OMR。
- 不爬取、不绕过下载限制、不镜像没有明确批量授权的网站。优先使用官方仓库、API、数据发布包、合作授权或人工挑选的小批量来源。

## 2. 必须分开的四层权利

一首乐曲至少包含四种不同对象，必须逐层审核：

1. **作品 Work**：作曲本身，例如贝多芬第五交响曲。
2. **表达/改编 Expression**：编曲、配器、移调版本、歌词翻译、简谱版等。
3. **版本 Edition**：某位编辑者的校订、指法、前言、排版或现代 Urtext/critical edition。
4. **资产 Asset**：具体 PDF、扫描图片、MusicXML、MuseScore、MIDI、封面和录音文件。

典型风险：

- 原作品已公版，但现代编曲仍受保护。
- 音符主体已公版，但现代编辑者新增的指法、校订、前言或翻译仍受保护。
- 乐谱已公版，不代表演奏录音也已公版；录音权必须单独判断。
- 某个国家已公版，不代表全球所有国家都已公版。
- 图书馆把文件放到网上，只表示可以访问，不自动表示可以商业再发布。
- “古乐谱”中的原作可能已有数百年历史，但现代学术校订版仍可能受保护。

因此，系统不得仅根据作曲家去世年份自动批准发布，也不得把工作页的总体公版标签套用到该页的全部版本和文件。

## 3. 来源优先级与使用方式

| 优先级 | 来源 | 适合内容 | 可用格式 | 权利与接入结论 |
|---|---|---|---|---|
| P0 | [OpenScore](https://openscore.cc/project/) / [官方 GitHub](https://github.com/openscore) | 艺术歌曲、弦乐四重奏、经典大型作品 | MuseScore、MusicXML/派生格式、元数据 | 优先使用逐仓库明确标注 CC0 的正式 release；OpenScore Lieder 等结构化程度高，适合直接进入交互曲库。仍需保存仓库、release、文件和许可证据，不能仅凭 “OpenScore” 品牌批量推定所有文件许可相同。 |
| P1 | [Mutopia](https://www.mutopiaproject.org/) / [官方 GitHub](https://github.com/MutopiaProject/MutopiaProject) | 钢琴、吉他、古典、巴洛克、室内乐 | LilyPond、PDF、MIDI | 官方当前列出 2,124 首，并声明可下载、修改、复制、分发、演奏和录制；但每一首的具体许可版本不同，常见 CC BY 或 CC BY-SA。通过官方仓库接入，逐资产保留署名和 ShareAlike 义务。 |
| P1 | [CPDL / ChoralWiki](https://www.cpdl.org/) | 合唱、宗教声乐、复调、阿卡贝拉 | PDF、MusicXML、MuseScore、Finale、MIDI 等，因版本而异 | 只导入实际托管在 CPDL 且单个版本明确为 Public Domain、CC0、CC BY、CC BY-SA 或经审核可兼容的 CPDL License 文件。CPDL 明确要求查看具体 edition；外链文件可能采用完全不同的许可。避免 Personal、NC、ND、All rights reserved 和许可不明文件。 |
| P2 | [Library of Congress Notated Music](https://www.loc.gov/notated-music/) | 19 世纪美国乐谱、历史扫描、声乐、钢琴、乐队与管弦乐资料 | 扫描图片/PDF、元数据、IIIF | 使用官方 [JSON/YAML API](https://www.loc.gov/apis/json-and-yaml/) 和 IIIF；API 无需密钥但有速率限制。优先选择 collection 权利页明确写明 “public domain and free to use and reuse” 的集合，例如 [Music for the Nation: American Sheet Music, After 1885](https://www.loc.gov/collections/american-sheet-music-after-1885/about-this-collection/rights-and-access/)。其他集合和单件必须分别审核，不能因馆藏年代久远自动通过。 |
| P2 | [IMSLP](https://imslp.org/wiki/Main_Page) | 古典、古乐、交响乐总谱与分谱的丰富扫描来源 | 主要为扫描 PDF，也有编辑文件和录音 | 适合做作品发现、版本研究和经过审核的 OMR 底稿；不适合未经许可整站镜像。IMSLP 明确说明公版状态因国家而异，文件可能只在加拿大、美国或亚洲特定服务器可用。仅接收单文件版权标签和目标地区均通过审核的版本；优先联系 IMSLP 获得合作或合规批量接口。 |

补充事实：IMSLP 首页在核验日显示约 260,000 个作品和 878,000 份乐谱，但这个体量不能直接等同于“全球都可由商业网站再发布的 878,000 个文件”。

### 明确不作为导入源的内容

- Noteflight 的 80,000+ 授权曲库。
- MuseScore.com 的 Official Scores、受版权保护的社区改编和未明确开放许可的用户上传。
- 来源网站上标记为 Personal、All rights reserved、CC BY-NC、CC BY-ND 或许可不明的文件。
- 仅能在线播放、需要订阅下载或存在技术访问限制的文件，除非取得书面许可。
- 受保护的演奏录音、音色采样和封面美术，即使其演奏的作品本身已经公版。

## 4. 平台许可白名单

第一阶段只允许以下权利状态进入公开曲库：

| 权利状态 | 可否进入商业平台 | 发布要求 |
|---|---|---|
| Public Domain，且目标地区已核验 | 可以 | 展示来源、版本和地区结论；不要宣称平台拥有原作品版权。 |
| CC0 1.0 | 可以 | 法律上通常无强制署名，但产品仍保留来源和贡献者致谢。 |
| CC BY | 可以 | 在页面和下载包中显示作者/编辑者、来源、许可链接和修改说明。 |
| CC BY-SA | 可以 | 除完整署名外，修改后的版本必须按兼容的相同许可发布。 |
| CPDL License | 条件允许 | 保存具体许可文本和版本；修改版沿用该许可。正式批量使用前做一次法律兼容性复核。 |
| CC BY-NC / NC-SA | 暂不接收 | 商业订阅网站的使用边界不值得冒险。 |
| CC BY-ND | 不接收可编辑曲库 | 平台的校正、移调、简谱转换和格式转换可能构成改编。 |
| Personal / All rights reserved / Unknown | 不接收 | 必须取得书面授权后才能改变状态。 |

每个下载包自动附带 `ATTRIBUTION.txt` 和机器可读的 `rights.json`。页面必须显示：

- 原作作者、编辑者、编曲者、歌词/翻译者。
- 原始来源和单件来源 URL。
- 原文件许可、许可版本和许可全文链接。
- 平台做过的修改，例如 “OMR 转录并人工校对”“转为 MusicXML 4.0”“增加简谱视图”。
- 允许地区、受限地区、权利复核日期。

## 5. MusicXML-first 数据模型

公共曲库与用户私人项目分离。公共主库只允许审核流程写入；用户点击“编辑副本”后，再创建现有的 `score_document` 和 `score_revision`，不能直接修改公共母版。

### 5.1 核心实体

#### `catalog_works`

表示抽象作品，而不是某个 PDF。

- `id`
- `canonical_title`
- `localized_titles_json`
- `composer_person_id`
- `co_authors_json`：歌词作者等
- `catalog_number`：BWV、K、Op.、D、Hob. 等
- `composition_year_from` / `composition_year_to`
- `musical_period`
- `forms_json`：symphony、sonata、mass 等
- `original_instrumentation_json`
- `primary_language`
- `authority_ids_json`：VIAF、ISNI、Wikidata、LoC 等
- `work_fingerprint`

#### `catalog_expressions`

表示编制、改编、歌词语言或移调不同的表达。

- `id`, `work_id`
- `expression_type`：original、arrangement、reduction、transcription、translation、jianpu
- `arranger_person_id`, `translator_person_id`
- `instrumentation_json`, `voicing`
- `language`, `target_key`
- `source_expression_id`

#### `catalog_editions`

表示一个具体校订/排印版本。

- `id`, `expression_id`
- `editor_person_ids_json`
- `publisher`, `publication_place`, `publication_year`, `plate_number`
- `edition_statement`
- `source_provider`, `source_record_id`, `source_url`
- `status`：pending_rights、processing、published、geo_restricted、withheld、taken_down
- `canonical_musicxml_asset_id`
- `quality_level`

#### `catalog_assets`

每一个文件独立记录权利与来源，不能只在 work 层记录。

- `id`, `edition_id`
- `asset_kind`：original_scan、source_pdf、musicxml、mxl、musescore、lilypond、midi、rendered_pdf、svg、png、audio_preview
- `storage_key`, `mime_type`, `byte_size`, `page_count`
- `sha256`, `perceptual_hash`
- `derived_from_asset_id`
- `normalizer_version`, `musicxml_version`
- `created_by`：source、OMR、human_transcription、platform_transform
- `publication_status`

#### `catalog_rights`

- `asset_id`
- `underlying_work_status`
- `edition_status`
- `asset_status`
- `license_code`, `license_version`, `license_url`
- `rights_holder`, `required_attribution`
- `commercial_use_allowed`, `derivatives_allowed`, `share_alike_required`
- `allowed_regions_json`, `blocked_regions_json`
- `evidence_urls_json`, `evidence_snapshot_key`
- `reviewed_by`, `reviewed_at`, `review_due_at`
- `legal_notes`

#### 其他必要表

- `catalog_people`：作曲家、编辑者、编曲者、歌词作者与权威标识。
- `catalog_taxonomy_terms` / `catalog_work_terms`：多语言分类和同义词。
- `catalog_source_records`：官方仓库/API 的原始元数据快照和同步游标。
- `catalog_quality_reviews`：自动检查、人工校对、问题清单和签字。
- `catalog_takedowns`：投诉、证据、处理日志和禁止重新导入的文件指纹。

### 5.2 结构化乐谱规则

- 不修改原始来源文件；原文件不可变存档，并保存 SHA-256。
- MusicXML 是长期交换母版；压缩分发使用 `.mxl`。
- 现有编辑器的 Score JSON 由特定 MusicXML 版本生成并记录转换器版本。
- 所有播放、简谱、移调、MIDI、PDF、SVG 和音频预览均从同一 Score JSON/MusicXML revision 派生。
- 每次人工校正产生新 revision，保留前后差异、审核者和来源页坐标。
- 大型管弦乐作品同时建 “总谱” 和 “分谱” 关系；一部作品可能对应几十个 asset，统计时必须区分作品数、版本数和文件数。

## 6. 合规导入流水线

```text
官方仓库/API/人工候选
        ↓
来源隔离区（不公开）
        ↓
作品权利 → 改编权利 → 版本权利 → 文件权利 → 目标地区
        ↓
拒绝 / 限区 / 许可白名单通过
        ↓
格式解析或 OMR 候选
        ↓
MusicXML 规范化 → Score JSON → 自动校验 → 人工校对
        ↓
去重与作品归并
        ↓
发布页面、播放器、下载包与署名
```

接入要求：

1. OpenScore 使用官方 GitHub release、Zenodo 数据发布或项目明确提供的下载包。
2. Mutopia 使用官方 GitHub 仓库，不通过网页逐页抓取；解析每首 LilyPond 文件中的许可和来源字段。
3. Library of Congress 使用官方 API/IIIF，遵守速率限制并缓存响应；每条记录继续读取 collection 和 item 权利说明。
4. CPDL 和 IMSLP 第一阶段人工挑选；需要扩大规模时先联系站方取得 API、数据包或书面批量许可。
5. 所有自动同步任务必须有来源级速率限制、User-Agent、断点续传和删除/许可变更同步机制。

## 7. 质量校验与发布等级

| 等级 | 定义 | 是否可交互编辑 |
|---|---|---|
| Q0 | 只有作品元数据和外部来源链接 | 否 |
| Q1 | 权利通过的扫描/PDF，尚未结构化 | 否，仅查看 |
| Q2 | OMR 或自动转换候选，仍有诊断问题 | 否；只能进入内部校正队列 |
| Q3 | MusicXML 通过结构和音乐规则检查，并完成抽样人工复核 | 可以，标记“机器转换/基础校对” |
| Q4 | 全曲双人或完整人工校对，播放、排版、分谱和导出均验证 | 可以，标记“Verified” |

### 自动检查

- MusicXML XSD/解析校验。
- 每小节各声部时值与拍号一致性。
- part、staff、voice、clef、key、time 和移调乐器完整性。
- tie/slur、tuplet、beam、歌词音节和反复跳转闭合检查。
- MIDI 渲染与播放时间线可生成。
- MusicXML → Score JSON → MusicXML 往返后关键音乐事件不丢失。
- 使用至少两种渲染器输出预览，检查致命解析差异。
- 与来源页做系统/小节级视觉对照；低置信区域必须进入人工队列。

### 人工检查

- 标题、作曲家、作品号、版本、编制和权利信息。
- 音高、节奏、临时记号、连音、歌词与排版。
- 总谱和分谱一致性。
- 播放抽检与 MusicXML/MIDI/PDF 导出测试。
- 发布前再次确认页面署名和许可包。

## 8. 去重策略

不能只按标题去重；同一作品可能有不同编曲、语言、调性和校订版本。

按以下层级处理：

1. **文件去重**：SHA-256 完全相同即复用同一二进制对象。
2. **扫描去重**：页面 perceptual hash 和页序列相似度识别裁边、压缩或加封面的同一扫描。
3. **版本去重**：publisher + editor + year + plate number + source record。
4. **作品去重**：composer authority ID + catalog/opus number + 标准化标题。
5. **音乐内容去重**：从 MusicXML 提取各声部音程、时值和小节序列，生成可移调音乐指纹；高相似项进入人工归并。

归并只合并目录记录，不删除合法的不同 edition。用户应能选择“原始版、现代开放校订版、钢琴缩编、合唱版、简谱版”等变体。

## 9. 搜索和分类体系

不要给一首乐谱只放一个类目。采用多轴分类，并为中文、英文等语言维护同义词。

### 9.1 乐器族与乐器

- 键盘：钢琴、管风琴、羽管键琴、手风琴、簧风琴。
- 拨弦：古典吉他、原声吉他、鲁特琴、曼陀林、竖琴。
- 弓弦：小提琴、中提琴、大提琴、低音提琴。
- 木管：长笛、双簧管、单簧管、巴松、萨克斯。
- 铜管：圆号、小号、长号、上低音号、大号。
- 口吹/簧片：口琴、口风琴等。
- 打击乐：定音鼓、键盘打击乐、无固定音高打击乐。
- 声乐：独唱、二重唱、合唱、阿卡贝拉；进一步按 SATB、SSA、TTBB、儿童合唱等声部筛选。

### 9.2 编制

- 独奏、独奏+钢琴伴奏。
- 二重奏、三重奏、弦乐四重奏、室内乐。
- 合唱无伴奏、合唱+键盘、合唱+乐团。
- 管乐团、铜管乐团、室内乐团、交响乐团。
- 协奏曲、歌剧、清唱剧、弥撒等大型形式。

### 9.3 其他筛选轴

- 时期：中世纪、文艺复兴、巴洛克、古典、浪漫、20 世纪、当代开放授权。
- 体裁/曲式：交响曲、协奏曲、奏鸣曲、练习曲、前奏曲、赋格、舞曲、艺术歌曲、咏叹调、弥撒、经文歌、牧歌、赞美诗等。
- 难度、预计时长、调性、拍号、速度、页数。
- 声乐语言、歌词是否完整、声部分配。
- 总谱/分谱、是否可编辑、是否可播放、是否有 MusicXML/MIDI/PDF/简谱。
- 质量等级和许可：Q3/Q4、PD/CC0/CC BY/CC BY-SA、允许地区。

每个分类使用稳定 canonical ID，中文名称只是展示层。例如 `instrument.piano` 同时关联 “钢琴谱、piano sheet music、Klaviernoten”等搜索同义词，避免把翻译文本直接当数据库主键。

## 10. 分阶段规模建议

规模按“作品”统计，不按文件统计。一部交响曲的总谱、管弦分谱、MusicXML、PDF 和 MIDI 仍然是一部作品。

### 阶段 A：版权与数据试运行，30 部作品

- 10 部 OpenScore CC0 作品。
- 10 部 Mutopia 逐条核验作品。
- 5 部 CPDL 合唱/阿卡贝拉作品。
- 5 部 LoC/IMSLP 扫描转 MusicXML 的内部测试作品。
- 目标：跑通权利证据、MusicXML/Score JSON、署名包、下架和地区限制，不追求数量。

### 阶段 B：首个公开曲库，300 部作品

- 钢琴/键盘：100。
- 吉他及其他拨弦：50。
- 独唱+钢琴：50。
- 合唱/阿卡贝拉：50。
- 室内乐：30。
- 管弦乐/交响乐：20。

全部达到 Q3，搜索量最高的 50 部达到 Q4。手风琴和口琴开放独立类目，但若来源不足，先通过“公版旋律 + 平台自行编配 + CC0/CC BY 发布”的方式建设，不能复制现代教材或他人编曲。

### 阶段 C：1,500 部作品

- 扩展 OpenScore、Mutopia 和 CPDL 的结构化条目。
- 建立 100～200 部管弦乐作品的总谱/分谱关系。
- 增加教学难度、练习曲、乐器组合、歌词语言和演奏时长筛选。
- 开放用户提交，但只接受原创、CC0、CC BY、CC BY-SA 或经权利审核的公版来源。

### 阶段 D：5,000 部精选作品

- 只有在权利复核、自动质量检测、重复归并和投诉下架均稳定后扩大。
- 重点提升结构化、校订准确和分类覆盖，而不是追求 IMSLP 式扫描文件数量。
- 10,000 部以上应通过来源方合作、开放数据包和社区校订实现，不采用网页爬虫堆量。

## 11. 下架和权利变更机制

必须在上线曲库前完成：

1. 公布版权/权利投诉入口和处理邮箱。
2. 投诉进入 `catalog_takedowns` 后，先把相关 asset 软隐藏并停止新下载；紧急或证据充分时同步停止播放和搜索展示。
3. 删除或禁用对象存储、CDN、搜索索引和派生下载，保留仅供审计的内部证据。
4. 按 asset 指纹加入禁止重新导入列表，避免下一次同步重新上线。
5. 如果只在部分地区受保护，使用 geo restriction，而不是无差别删除全球可用版本。
6. 许可或来源页面变化时进入重新审核；公开条目至少每 12 个月复核一次。
7. 恢复发布必须有新的权利证据和第二名审核者批准。

正式投诉通知、反通知、保存期限和响应 SLA 应由公司主体所在地及主要市场的律师确定。

## 12. 上线验收标准

- 100% 公开 asset 有单件来源 URL、许可代码、证据快照、目标地区和复核人。
- 100% 可编辑乐谱达到 Q3；“Verified” 标识只授予 Q4。
- MusicXML 解析、Score JSON 转换和基础播放成功率不低于 99%。
- 每个下载包都有 `ATTRIBUTION.txt` 与 `rights.json`。
- 同一二进制文件重复存储率接近 0；疑似作品/版本重复都有人工处理队列。
- 乐器、编制、时期、体裁、难度、格式、质量和许可均可筛选。
- 删除、地区限制和 CDN 清理流程通过演练后才开始大批量导入。

## 13. 权威来源

- [IMSLP：Public domain](https://imslp.org/wiki/Public_domain)
- [IMSLP：Licensing Policy and Guidelines](https://imslp.org/wiki/IMSLP:Free_content_licenses)
- [IMSLP：API / 版权标签与地区阻断信息](https://imslp.org/wiki/IMSLP:OldAPI)
- [Mutopia：License details](https://www.mutopiaproject.org/legal.html)
- [Mutopia：How to contribute（要求来源处于公版）](https://www.mutopiaproject.org/contribute.html)
- [Mutopia 官方 GitHub](https://github.com/MutopiaProject/MutopiaProject)
- [CPDL：What copyright rules apply to CPDL scores?](https://www.cpdl.org/wiki/index.php/ChoralWiki:Copyrights)
- [CPDL：Format choice / MusicXML](https://www.cpdl.org/wiki/index.php/Help:Format_Choice)
- [OpenScore：Project](https://openscore.cc/project/)
- [OpenScore 官方 GitHub](https://github.com/openscore)
- [OpenScore Lieder：CC0 license](https://github.com/OpenScore/Lieder)
- [Library of Congress：JSON/YAML API](https://www.loc.gov/apis/json-and-yaml/)
- [Library of Congress：API endpoints / Notated Music](https://www.loc.gov/apis/json-and-yaml/requests/endpoints/)
- [Library of Congress：Free to Use and Reuse](https://www.loc.gov/free-to-use/)
- [Library of Congress：Historic Sheet Music 权利说明示例](https://www.loc.gov/collections/historic-sheet-music/about-this-collection/rights-and-access/)
