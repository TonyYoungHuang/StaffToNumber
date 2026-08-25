export type PublicScoreLocale = "en" | "zh-CN";

export type PublicScoreRecord = {
  slug: string;
  title: Record<PublicScoreLocale, string>;
  composer: Record<PublicScoreLocale, string>;
  composerDates: string;
  description: Record<PublicScoreLocale, string>;
  era: "Baroque" | "Classical" | "Romantic" | "Renaissance" | "Contemporary";
  instruments: string[];
  ensemble: string;
  difficulty: "Beginner" | "Easy" | "Intermediate" | "Advanced";
  formats: string[];
  sourceProvider: "ScoreTransposer" | "Mutopia" | "CPDL" | "IMSLP";
  sourceUrl: string;
  workRights: "CC0" | "Public domain";
  assetLicense: string;
  assetStatus: "downloadable" | "source-linked";
  localMusicXmlUrl?: string;
  featured?: boolean;
};

const sourceLinkedLicense = "Work-level public domain. The edition and file remain at the named source and must be reviewed under that source's regional and file-level terms before import.";

export const publicScoreLibrary: readonly PublicScoreRecord[] = [
  {
    slug: "product-workflow-etude",
    title: { en: "Product Workflow Etude", "zh-CN": "产品工作流练习曲" },
    composer: { en: "ScoreTransposer QA", "zh-CN": "ScoreTransposer QA" },
    composerDates: "2026",
    description: {
      en: "A five-measure piano demo with lyrics, harmony, dynamics, repeats, slurs, and articulations for testing the complete browser workflow.",
      "zh-CN": "用于测试浏览器完整工作流的五小节钢琴示例，包含歌词、和弦、力度、反复、连线和奏法。",
    },
    era: "Contemporary",
    instruments: ["Piano"],
    ensemble: "Solo",
    difficulty: "Easy",
    formats: ["MusicXML"],
    sourceProvider: "ScoreTransposer",
    sourceUrl: "/library/product-workflow-etude.musicxml",
    workRights: "CC0",
    assetLicense: "Original ScoreTransposer QA fixture released as CC0 for product testing and derivative projects.",
    assetStatus: "downloadable",
    localMusicXmlUrl: "/library/product-workflow-etude.musicxml",
    featured: true,
  },
  {
    slug: "bach-prelude-c-major-bwv-846",
    title: { en: "Prelude in C major, BWV 846", "zh-CN": "C 大调前奏曲 BWV 846" },
    composer: { en: "Johann Sebastian Bach", "zh-CN": "约翰·塞巴斯蒂安·巴赫" },
    composerDates: "1685–1750",
    description: { en: "Keyboard prelude from The Well-Tempered Clavier, Book I.", "zh-CN": "《平均律键盘曲集》第一卷中的键盘前奏曲。" },
    era: "Baroque",
    instruments: ["Piano", "Keyboard"],
    ensemble: "Solo",
    difficulty: "Intermediate",
    formats: ["Source edition"],
    sourceProvider: "Mutopia",
    sourceUrl: "https://www.mutopiaproject.org/cgibin/make-table.cgi?Composer=BachJS",
    workRights: "Public domain",
    assetLicense: sourceLinkedLicense,
    assetStatus: "source-linked",
    featured: true,
  },
  {
    slug: "bach-air-bwv-1068",
    title: { en: "Air from Orchestral Suite No. 3, BWV 1068", "zh-CN": "第三号管弦乐组曲《咏叹调》BWV 1068" },
    composer: { en: "Johann Sebastian Bach", "zh-CN": "约翰·塞巴斯蒂安·巴赫" },
    composerDates: "1685–1750",
    description: { en: "Slow orchestral movement frequently arranged for strings and keyboard.", "zh-CN": "常被改编为弦乐或键盘版本的慢板管弦乐乐章。" },
    era: "Baroque",
    instruments: ["Strings", "Violin", "Keyboard"],
    ensemble: "Orchestra",
    difficulty: "Intermediate",
    formats: ["Source edition"],
    sourceProvider: "Mutopia",
    sourceUrl: "https://www.mutopiaproject.org/cgibin/make-table.cgi?Composer=BachJS",
    workRights: "Public domain",
    assetLicense: sourceLinkedLicense,
    assetStatus: "source-linked",
  },
  {
    slug: "beethoven-ode-to-joy-theme",
    title: { en: "Ode to Joy theme", "zh-CN": "《欢乐颂》主题" },
    composer: { en: "Ludwig van Beethoven", "zh-CN": "路德维希·凡·贝多芬" },
    composerDates: "1770–1827",
    description: { en: "The principal theme associated with the finale of Symphony No. 9.", "zh-CN": "贝多芬第九交响曲终乐章的主要主题。" },
    era: "Classical",
    instruments: ["Voice", "Piano", "Orchestra"],
    ensemble: "Choir and orchestra",
    difficulty: "Beginner",
    formats: ["Source edition"],
    sourceProvider: "Mutopia",
    sourceUrl: "https://www.mutopiaproject.org/cgibin/make-table.cgi?Composer=BeethovenLv",
    workRights: "Public domain",
    assetLicense: sourceLinkedLicense,
    assetStatus: "source-linked",
    featured: true,
  },
  {
    slug: "beethoven-symphony-5-op-67",
    title: { en: "Symphony No. 5, Op. 67", "zh-CN": "第五交响曲 Op. 67" },
    composer: { en: "Ludwig van Beethoven", "zh-CN": "路德维希·凡·贝多芬" },
    composerDates: "1770–1827",
    description: { en: "Full orchestral symphony in C minor with four movements.", "zh-CN": "C 小调四乐章管弦乐交响曲。" },
    era: "Classical",
    instruments: ["Orchestra", "Strings", "Woodwinds", "Brass", "Percussion"],
    ensemble: "Symphony orchestra",
    difficulty: "Advanced",
    formats: ["Scans", "Source editions"],
    sourceProvider: "IMSLP",
    sourceUrl: "https://imslp.org/wiki/Symphony_No.5,_Op.67_(Beethoven,_Ludwig_van)",
    workRights: "Public domain",
    assetLicense: sourceLinkedLicense,
    assetStatus: "source-linked",
    featured: true,
  },
  {
    slug: "mozart-eine-kleine-nachtmusik-k-525",
    title: { en: "Eine kleine Nachtmusik, K. 525", "zh-CN": "G 大调弦乐小夜曲 K. 525" },
    composer: { en: "Wolfgang Amadeus Mozart", "zh-CN": "沃尔夫冈·阿马德乌斯·莫扎特" },
    composerDates: "1756–1791",
    description: { en: "Serenade for string ensemble in four surviving movements.", "zh-CN": "为弦乐合奏创作、现存四个乐章的小夜曲。" },
    era: "Classical",
    instruments: ["Violin", "Viola", "Cello", "Strings"],
    ensemble: "String ensemble",
    difficulty: "Intermediate",
    formats: ["Scans", "Source editions"],
    sourceProvider: "IMSLP",
    sourceUrl: "https://imslp.org/wiki/Eine_kleine_Nachtmusik,_K.525_(Mozart,_Wolfgang_Amadeus)",
    workRights: "Public domain",
    assetLicense: sourceLinkedLicense,
    assetStatus: "source-linked",
  },
  {
    slug: "pachelbel-canon-d-major",
    title: { en: "Canon and Gigue in D major", "zh-CN": "D 大调卡农与吉格" },
    composer: { en: "Johann Pachelbel", "zh-CN": "约翰·帕赫贝尔" },
    composerDates: "1653–1706",
    description: { en: "Baroque canon for three violins and basso continuo.", "zh-CN": "为三把小提琴和通奏低音创作的巴洛克卡农。" },
    era: "Baroque",
    instruments: ["Violin", "Cello", "Strings", "Keyboard"],
    ensemble: "Chamber ensemble",
    difficulty: "Intermediate",
    formats: ["Source edition"],
    sourceProvider: "Mutopia",
    sourceUrl: "https://www.mutopiaproject.org/cgibin/make-table.cgi?Composer=PachelbelJ",
    workRights: "Public domain",
    assetLicense: sourceLinkedLicense,
    assetStatus: "source-linked",
    featured: true,
  },
  {
    slug: "vivaldi-spring-rv-269",
    title: { en: "Spring, RV 269", "zh-CN": "《春》RV 269" },
    composer: { en: "Antonio Vivaldi", "zh-CN": "安东尼奥·维瓦尔第" },
    composerDates: "1678–1741",
    description: { en: "The first violin concerto from The Four Seasons.", "zh-CN": "小提琴协奏曲《四季》中的第一首。" },
    era: "Baroque",
    instruments: ["Violin", "Strings", "Keyboard"],
    ensemble: "Solo and orchestra",
    difficulty: "Advanced",
    formats: ["Scans", "Source editions"],
    sourceProvider: "IMSLP",
    sourceUrl: "https://imslp.org/wiki/Le_quattro_stagioni_(Vivaldi,_Antonio)",
    workRights: "Public domain",
    assetLicense: sourceLinkedLicense,
    assetStatus: "source-linked",
  },
  {
    slug: "handel-hallelujah-chorus",
    title: { en: "Hallelujah Chorus from Messiah", "zh-CN": "《弥赛亚》哈利路亚合唱" },
    composer: { en: "George Frideric Handel", "zh-CN": "乔治·弗里德里希·亨德尔" },
    composerDates: "1685–1759",
    description: { en: "SATB chorus with orchestral accompaniment from Messiah.", "zh-CN": "《弥赛亚》中带管弦乐伴奏的 SATB 合唱。" },
    era: "Baroque",
    instruments: ["Choir", "Voice", "Orchestra"],
    ensemble: "SATB choir and orchestra",
    difficulty: "Advanced",
    formats: ["Choral source editions"],
    sourceProvider: "CPDL",
    sourceUrl: "https://www.cpdl.org/wiki/index.php/George_Frideric_Handel",
    workRights: "Public domain",
    assetLicense: sourceLinkedLicense,
    assetStatus: "source-linked",
    featured: true,
  },
  {
    slug: "schubert-ave-maria-d-839",
    title: { en: "Ave Maria, D. 839", "zh-CN": "圣母颂 D. 839" },
    composer: { en: "Franz Schubert", "zh-CN": "弗朗茨·舒伯特" },
    composerDates: "1797–1828",
    description: { en: "Art song commonly performed by solo voice with piano accompaniment.", "zh-CN": "常以独唱和钢琴伴奏形式演出的艺术歌曲。" },
    era: "Romantic",
    instruments: ["Voice", "Piano"],
    ensemble: "Voice and piano",
    difficulty: "Intermediate",
    formats: ["Source edition"],
    sourceProvider: "Mutopia",
    sourceUrl: "https://www.mutopiaproject.org/cgibin/make-table.cgi?Composer=SchubertF",
    workRights: "Public domain",
    assetLicense: sourceLinkedLicense,
    assetStatus: "source-linked",
  },
  {
    slug: "brahms-lullaby-op-49-4",
    title: { en: "Wiegenlied, Op. 49 No. 4", "zh-CN": "摇篮曲 Op. 49 No. 4" },
    composer: { en: "Johannes Brahms", "zh-CN": "约翰内斯·勃拉姆斯" },
    composerDates: "1833–1897",
    description: { en: "Lullaby for solo voice and piano.", "zh-CN": "为独唱和钢琴创作的摇篮曲。" },
    era: "Romantic",
    instruments: ["Voice", "Piano"],
    ensemble: "Voice and piano",
    difficulty: "Easy",
    formats: ["Source edition"],
    sourceProvider: "Mutopia",
    sourceUrl: "https://www.mutopiaproject.org/cgibin/make-table.cgi?Composer=BrahmsJ",
    workRights: "Public domain",
    assetLicense: sourceLinkedLicense,
    assetStatus: "source-linked",
  },
  {
    slug: "tallis-if-ye-love-me",
    title: { en: "If Ye Love Me", "zh-CN": "若你们爱我" },
    composer: { en: "Thomas Tallis", "zh-CN": "托马斯·塔利斯" },
    composerDates: "c.1505–1585",
    description: { en: "Four-part English Renaissance motet commonly sung a cappella.", "zh-CN": "常以阿卡贝拉形式演唱的四声部英国文艺复兴经文歌。" },
    era: "Renaissance",
    instruments: ["Choir", "Voice"],
    ensemble: "SATB a cappella",
    difficulty: "Intermediate",
    formats: ["Choral source editions"],
    sourceProvider: "CPDL",
    sourceUrl: "https://www.cpdl.org/wiki/index.php/Thomas_Tallis",
    workRights: "Public domain",
    assetLicense: sourceLinkedLicense,
    assetStatus: "source-linked",
    featured: true,
  },
] as const;

export function findPublicScore(slug: string) {
  return publicScoreLibrary.find((score) => score.slug === slug);
}

export function listPublicScoreFacets() {
  return {
    instruments: [...new Set(publicScoreLibrary.flatMap((score) => score.instruments))].sort(),
    ensembles: [...new Set(publicScoreLibrary.map((score) => score.ensemble))].sort(),
    eras: [...new Set(publicScoreLibrary.map((score) => score.era))].sort(),
  };
}

export function filterPublicScores(input: { query?: string; instrument?: string; ensemble?: string; era?: string }) {
  const query = input.query?.trim().toLocaleLowerCase() ?? "";
  return publicScoreLibrary.filter((score) => {
    const searchable = [score.title.en, score.title["zh-CN"], score.composer.en, score.composer["zh-CN"], ...score.instruments, score.ensemble, score.era]
      .join(" ")
      .toLocaleLowerCase();
    return (!query || searchable.includes(query))
      && (!input.instrument || score.instruments.includes(input.instrument))
      && (!input.ensemble || score.ensemble === input.ensemble)
      && (!input.era || score.era === input.era);
  });
}
