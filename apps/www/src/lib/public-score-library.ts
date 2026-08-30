import { SUPPORTED_LOCALES, getLocalizedValue, type SupportedLocale } from "@score/i18n";
import {
  getLibraryCatalog,
  getLibraryCollator,
  getLibrarySearchLabels,
  type LibraryAssetLicense,
  type LibraryAssetStatus,
  type LibraryDifficulty,
  type LibraryEnsemble,
  type LibraryEra,
  type LibraryFormat,
  type LibraryInstrument,
  type LibraryLocalizedValue,
  type LibraryWorkRights,
} from "./library-localization";
import { defineLibraryLocalizedValue } from "./library-localization/types";

export type PublicScoreRecord = {
  slug: string;
  title: LibraryLocalizedValue;
  composer: LibraryLocalizedValue;
  composerDates: string;
  description: LibraryLocalizedValue;
  era: LibraryEra;
  instruments: readonly LibraryInstrument[];
  ensemble: LibraryEnsemble;
  difficulty: LibraryDifficulty;
  formats: readonly LibraryFormat[];
  sourceProvider: "ScoreTransposer" | "Mutopia" | "CPDL" | "IMSLP";
  sourceUrl: string;
  workRights: LibraryWorkRights;
  assetLicense: string;
  assetLicenseKey: LibraryAssetLicense;
  assetStatus: LibraryAssetStatus;
  localMusicXmlUrl?: string;
  featured?: boolean;
};

const sourceLinkedLicense = "Work-level public domain. The edition and file remain at the named source and must be reviewed under that source's regional and file-level terms before import.";

export const publicScoreLibrary: readonly PublicScoreRecord[] = [
  {
    slug: "product-workflow-etude",
    title: defineLibraryLocalizedValue({
      en: "Product Workflow Etude",
      "zh-CN": "产品工作流练习曲",
      "zh-TW": "產品工作流程練習曲",
      ja: "製品ワークフロー練習曲",
      ko: "제품 워크플로 에튀드",
      fr: "Étude du flux de travail produit",
      es: "Estudio del flujo de trabajo del producto",
      de: "Etüde für den Produkt-Workflow",
      ru: "Этюд рабочего процесса продукта",
    }),
    composer: defineLibraryLocalizedValue({ en: "ScoreTransposer QA" }),
    composerDates: "2026",
    description: defineLibraryLocalizedValue({
      en: "A five-measure piano demo with lyrics, harmony, dynamics, repeats, slurs, and articulations for testing the complete browser workflow.",
      "zh-CN": "用于测试浏览器完整工作流的五小节钢琴示例，包含歌词、和弦、力度、反复、连线和奏法。",
      "zh-TW": "用於測試完整瀏覽器流程的五小節鋼琴範例，包含歌詞、和聲、力度、反覆、圓滑線與奏法。",
      ja: "歌詞、和声、強弱、反復、スラー、アーティキュレーションを含む5小節のピアノデモで、ブラウザーの全工程を検証します。",
      ko: "가사, 화성, 셈여림, 반복, 이음줄과 아티큘레이션을 포함한 5마디 피아노 데모로 전체 브라우저 작업 흐름을 시험합니다.",
      fr: "Une démonstration de piano de cinq mesures avec paroles, harmonie, nuances, reprises, liaisons et articulations pour tester tout le parcours dans le navigateur.",
      es: "Una demo de piano de cinco compases con letra, armonía, dinámica, repeticiones, ligaduras y articulaciones para probar todo el flujo del navegador.",
      de: "Eine fünftaktige Klavierdemo mit Text, Harmonie, Dynamik, Wiederholungen, Bindebögen und Artikulationen zum Testen des vollständigen Browser-Ablaufs.",
      ru: "Пятитактовый фортепианный пример с текстом, гармонией, динамикой, повторами, лигами и артикуляцией для проверки полного процесса в браузере.",
    }),
    era: "Contemporary",
    instruments: ["Piano"],
    ensemble: "Solo",
    difficulty: "Easy",
    formats: ["MusicXML"],
    sourceProvider: "ScoreTransposer",
    sourceUrl: "/library/product-workflow-etude.musicxml",
    workRights: "CC0",
    assetLicense: "Original ScoreTransposer QA fixture released as CC0 for product testing and derivative projects.",
    assetLicenseKey: "scoretransposer-cc0",
    assetStatus: "downloadable",
    localMusicXmlUrl: "/library/product-workflow-etude.musicxml",
    featured: true,
  },
  {
    slug: "bach-prelude-c-major-bwv-846",
    title: defineLibraryLocalizedValue({ en: "Prelude in C major, BWV 846", "zh-CN": "C 大调前奏曲 BWV 846", "zh-TW": "C 大調前奏曲 BWV 846", ja: "ハ長調 前奏曲 BWV 846", ko: "C장조 전주곡 BWV 846", fr: "Prélude en do majeur, BWV 846", es: "Preludio en do mayor, BWV 846", de: "Präludium in C-Dur, BWV 846", ru: "Прелюдия до мажор, BWV 846" }),
    composer: defineLibraryLocalizedValue({ en: "Johann Sebastian Bach", "zh-CN": "约翰·塞巴斯蒂安·巴赫", "zh-TW": "約翰·塞巴斯蒂安·巴赫", ja: "ヨハン・ゼバスティアン・バッハ", ko: "요한 제바스티안 바흐", fr: "Jean-Sébastien Bach", es: "Johann Sebastian Bach", de: "Johann Sebastian Bach", ru: "Иоганн Себастьян Бах" }),
    composerDates: "1685–1750",
    description: defineLibraryLocalizedValue({ en: "Keyboard prelude from The Well-Tempered Clavier, Book I.", "zh-CN": "《平均律键盘曲集》第一卷中的键盘前奏曲。", "zh-TW": "《平均律鍵盤曲集》第一卷中的鍵盤前奏曲。", ja: "『平均律クラヴィーア曲集』第1巻の鍵盤前奏曲。", ko: "《평균율 클라비어곡집》 제1권의 건반 전주곡입니다.", fr: "Prélude pour clavier tiré du premier livre du Clavier bien tempéré.", es: "Preludio para teclado del Libro I de El clave bien temperado.", de: "Klavierpräludium aus dem ersten Band des Wohltemperierten Klaviers.", ru: "Клавирная прелюдия из первого тома «Хорошо темперированного клавира»." }),
    era: "Baroque",
    instruments: ["Piano", "Keyboard"],
    ensemble: "Solo",
    difficulty: "Intermediate",
    formats: ["Source edition"],
    sourceProvider: "Mutopia",
    sourceUrl: "https://www.mutopiaproject.org/cgibin/make-table.cgi?Composer=BachJS",
    workRights: "Public domain",
    assetLicense: sourceLinkedLicense,
    assetLicenseKey: "source-linked-review",
    assetStatus: "source-linked",
    featured: true,
  },
  {
    slug: "bach-air-bwv-1068",
    title: defineLibraryLocalizedValue({ en: "Air from Orchestral Suite No. 3, BWV 1068", "zh-CN": "第三号管弦乐组曲《咏叹调》BWV 1068", "zh-TW": "第三號管弦樂組曲〈詠嘆調〉BWV 1068", ja: "管弦楽組曲第3番より「エア」BWV 1068", ko: "관현악 모음곡 3번 중 아리아, BWV 1068", fr: "Air de la Suite pour orchestre no 3, BWV 1068", es: "Aria de la Suite orquestal n.º 3, BWV 1068", de: "Air aus der Orchestersuite Nr. 3, BWV 1068", ru: "Ария из Оркестровой сюиты № 3, BWV 1068" }),
    composer: defineLibraryLocalizedValue({ en: "Johann Sebastian Bach", "zh-CN": "约翰·塞巴斯蒂安·巴赫", "zh-TW": "約翰·塞巴斯蒂安·巴赫", ja: "ヨハン・ゼバスティアン・バッハ", ko: "요한 제바스티안 바흐", fr: "Jean-Sébastien Bach", es: "Johann Sebastian Bach", de: "Johann Sebastian Bach", ru: "Иоганн Себастьян Бах" }),
    composerDates: "1685–1750",
    description: defineLibraryLocalizedValue({ en: "Slow orchestral movement frequently arranged for strings and keyboard.", "zh-CN": "常被改编为弦乐或键盘版本的慢板管弦乐乐章。", "zh-TW": "常被改編為弦樂或鍵盤版本的慢板管弦樂樂章。", ja: "弦楽や鍵盤楽器向けにしばしば編曲される、ゆったりした管弦楽楽章。", ko: "현악기나 건반악기용으로 자주 편곡되는 느린 관현악 악장입니다.", fr: "Mouvement orchestral lent, souvent arrangé pour cordes ou clavier.", es: "Movimiento orquestal lento, arreglado con frecuencia para cuerdas o teclado.", de: "Langsamer Orchestersatz, der häufig für Streicher oder Tasteninstrumente bearbeitet wird.", ru: "Медленная оркестровая часть, которую часто перекладывают для струнных или клавишных." }),
    era: "Baroque",
    instruments: ["Strings", "Violin", "Keyboard"],
    ensemble: "Orchestra",
    difficulty: "Intermediate",
    formats: ["Source edition"],
    sourceProvider: "Mutopia",
    sourceUrl: "https://www.mutopiaproject.org/cgibin/make-table.cgi?Composer=BachJS",
    workRights: "Public domain",
    assetLicense: sourceLinkedLicense,
    assetLicenseKey: "source-linked-review",
    assetStatus: "source-linked",
  },
  {
    slug: "beethoven-ode-to-joy-theme",
    title: defineLibraryLocalizedValue({ en: "Ode to Joy theme", "zh-CN": "《欢乐颂》主题", "zh-TW": "〈歡樂頌〉主題", ja: "「歓喜の歌」の主題", ko: "환희의 송가 주제", fr: "Thème de l’Ode à la joie", es: "Tema de la Oda a la alegría", de: "Thema der Ode an die Freude", ru: "Тема «Оды к радости»" }),
    composer: defineLibraryLocalizedValue({ en: "Ludwig van Beethoven", "zh-CN": "路德维希·凡·贝多芬", "zh-TW": "路德維希·范·貝多芬", ja: "ルートヴィヒ・ヴァン・ベートーヴェン", ko: "루트비히 판 베토벤", fr: "Ludwig van Beethoven", es: "Ludwig van Beethoven", de: "Ludwig van Beethoven", ru: "Людвиг ван Бетховен" }),
    composerDates: "1770–1827",
    description: defineLibraryLocalizedValue({ en: "The principal theme associated with the finale of Symphony No. 9.", "zh-CN": "贝多芬第九交响曲终乐章的主要主题。", "zh-TW": "貝多芬第九號交響曲終樂章的主要主題。", ja: "ベートーヴェンの交響曲第9番終楽章を代表する主題。", ko: "베토벤 교향곡 9번 마지막 악장의 대표 주제입니다.", fr: "Thème principal associé au finale de la Neuvième Symphonie.", es: "Tema principal asociado al final de la Novena Sinfonía.", de: "Das Hauptthema aus dem Finale der 9. Sinfonie.", ru: "Главная тема, связанная с финалом Девятой симфонии." }),
    era: "Classical",
    instruments: ["Voice", "Piano", "Orchestra"],
    ensemble: "Choir and orchestra",
    difficulty: "Beginner",
    formats: ["Source edition"],
    sourceProvider: "Mutopia",
    sourceUrl: "https://www.mutopiaproject.org/cgibin/make-table.cgi?Composer=BeethovenLv",
    workRights: "Public domain",
    assetLicense: sourceLinkedLicense,
    assetLicenseKey: "source-linked-review",
    assetStatus: "source-linked",
    featured: true,
  },
  {
    slug: "beethoven-symphony-5-op-67",
    title: defineLibraryLocalizedValue({ en: "Symphony No. 5, Op. 67", "zh-CN": "第五交响曲 Op. 67", "zh-TW": "第五號交響曲 Op. 67", ja: "交響曲第5番 Op. 67", ko: "교향곡 5번 Op. 67", fr: "Symphonie no 5, op. 67", es: "Sinfonía n.º 5, op. 67", de: "5. Sinfonie, Op. 67", ru: "Симфония № 5, соч. 67" }),
    composer: defineLibraryLocalizedValue({ en: "Ludwig van Beethoven", "zh-CN": "路德维希·凡·贝多芬", "zh-TW": "路德維希·范·貝多芬", ja: "ルートヴィヒ・ヴァン・ベートーヴェン", ko: "루트비히 판 베토벤", fr: "Ludwig van Beethoven", es: "Ludwig van Beethoven", de: "Ludwig van Beethoven", ru: "Людвиг ван Бетховен" }),
    composerDates: "1770–1827",
    description: defineLibraryLocalizedValue({ en: "Full orchestral symphony in C minor with four movements.", "zh-CN": "C 小调四乐章管弦乐交响曲。", "zh-TW": "C 小調、四個樂章的完整管弦樂交響曲。", ja: "ハ短調、全4楽章の管弦楽交響曲。", ko: "C단조의 네 악장으로 된 관현악 교향곡입니다.", fr: "Symphonie complète pour orchestre en do mineur, en quatre mouvements.", es: "Sinfonía orquestal completa en do menor y cuatro movimientos.", de: "Vollständige viersätzige Orchestersinfonie in c-Moll.", ru: "Полная оркестровая симфония до минор в четырёх частях." }),
    era: "Classical",
    instruments: ["Orchestra", "Strings", "Woodwinds", "Brass", "Percussion"],
    ensemble: "Symphony orchestra",
    difficulty: "Advanced",
    formats: ["Scans", "Source editions"],
    sourceProvider: "IMSLP",
    sourceUrl: "https://imslp.org/wiki/Symphony_No.5,_Op.67_(Beethoven,_Ludwig_van)",
    workRights: "Public domain",
    assetLicense: sourceLinkedLicense,
    assetLicenseKey: "source-linked-review",
    assetStatus: "source-linked",
    featured: true,
  },
  {
    slug: "mozart-eine-kleine-nachtmusik-k-525",
    title: defineLibraryLocalizedValue({ en: "Eine kleine Nachtmusik, K. 525", "zh-CN": "G 大调弦乐小夜曲 K. 525", "zh-TW": "G 大調弦樂小夜曲 K. 525", ja: "アイネ・クライネ・ナハトムジーク K. 525", ko: "아이네 클라이네 나흐트무지크 K. 525", fr: "Une petite musique de nuit, K. 525", es: "Pequeña serenata nocturna, K. 525", de: "Eine kleine Nachtmusik, K. 525", ru: "Маленькая ночная серенада, K. 525" }),
    composer: defineLibraryLocalizedValue({ en: "Wolfgang Amadeus Mozart", "zh-CN": "沃尔夫冈·阿马德乌斯·莫扎特", "zh-TW": "沃爾夫岡·阿瑪迪斯·莫札特", ja: "ヴォルフガング・アマデウス・モーツァルト", ko: "볼프강 아마데우스 모차르트", fr: "Wolfgang Amadeus Mozart", es: "Wolfgang Amadeus Mozart", de: "Wolfgang Amadeus Mozart", ru: "Вольфганг Амадей Моцарт" }),
    composerDates: "1756–1791",
    description: defineLibraryLocalizedValue({ en: "Serenade for string ensemble in four surviving movements.", "zh-CN": "为弦乐合奏创作、现存四个乐章的小夜曲。", "zh-TW": "為弦樂合奏創作、現存四個樂章的小夜曲。", ja: "現存する4楽章から成る弦楽合奏のためのセレナード。", ko: "현재 네 악장이 남아 있는 현악 합주용 세레나데입니다.", fr: "Sérénade pour ensemble à cordes dont quatre mouvements subsistent.", es: "Serenata para conjunto de cuerdas de la que se conservan cuatro movimientos.", de: "Serenade für Streicherensemble in vier erhaltenen Sätzen.", ru: "Серенада для струнного ансамбля в четырёх сохранившихся частях." }),
    era: "Classical",
    instruments: ["Violin", "Viola", "Cello", "Strings"],
    ensemble: "String ensemble",
    difficulty: "Intermediate",
    formats: ["Scans", "Source editions"],
    sourceProvider: "IMSLP",
    sourceUrl: "https://imslp.org/wiki/Eine_kleine_Nachtmusik,_K.525_(Mozart,_Wolfgang_Amadeus)",
    workRights: "Public domain",
    assetLicense: sourceLinkedLicense,
    assetLicenseKey: "source-linked-review",
    assetStatus: "source-linked",
  },
  {
    slug: "pachelbel-canon-d-major",
    title: defineLibraryLocalizedValue({ en: "Canon and Gigue in D major", "zh-CN": "D 大调卡农与吉格", "zh-TW": "D 大調卡農與吉格", ja: "ニ長調のカノンとジーグ", ko: "D장조 카논과 지그", fr: "Canon et gigue en ré majeur", es: "Canon y giga en re mayor", de: "Kanon und Gigue in D-Dur", ru: "Канон и жига ре мажор" }),
    composer: defineLibraryLocalizedValue({ en: "Johann Pachelbel", "zh-CN": "约翰·帕赫贝尔", "zh-TW": "約翰·帕赫貝爾", ja: "ヨハン・パッヘルベル", ko: "요한 파헬벨", fr: "Johann Pachelbel", es: "Johann Pachelbel", de: "Johann Pachelbel", ru: "Иоганн Пахельбель" }),
    composerDates: "1653–1706",
    description: defineLibraryLocalizedValue({ en: "Baroque canon for three violins and basso continuo.", "zh-CN": "为三把小提琴和通奏低音创作的巴洛克卡农。", "zh-TW": "為三把小提琴與通奏低音創作的巴洛克卡農。", ja: "3本のヴァイオリンと通奏低音のためのバロック・カノン。", ko: "세 대의 바이올린과 통주저음을 위한 바로크 카논입니다.", fr: "Canon baroque pour trois violons et basse continue.", es: "Canon barroco para tres violines y bajo continuo.", de: "Barocker Kanon für drei Violinen und Basso continuo.", ru: "Барочный канон для трёх скрипок и бассо континуо." }),
    era: "Baroque",
    instruments: ["Violin", "Cello", "Strings", "Keyboard"],
    ensemble: "Chamber ensemble",
    difficulty: "Intermediate",
    formats: ["Source edition"],
    sourceProvider: "Mutopia",
    sourceUrl: "https://www.mutopiaproject.org/cgibin/make-table.cgi?Composer=PachelbelJ",
    workRights: "Public domain",
    assetLicense: sourceLinkedLicense,
    assetLicenseKey: "source-linked-review",
    assetStatus: "source-linked",
    featured: true,
  },
  {
    slug: "vivaldi-spring-rv-269",
    title: defineLibraryLocalizedValue({ en: "Spring, RV 269", "zh-CN": "《春》RV 269", "zh-TW": "〈春〉RV 269", ja: "「春」RV 269", ko: "봄, RV 269", fr: "Le Printemps, RV 269", es: "La primavera, RV 269", de: "Der Frühling, RV 269", ru: "«Весна», RV 269" }),
    composer: defineLibraryLocalizedValue({ en: "Antonio Vivaldi", "zh-CN": "安东尼奥·维瓦尔第", "zh-TW": "安東尼奧·韋瓦第", ja: "アントニオ・ヴィヴァルディ", ko: "안토니오 비발디", fr: "Antonio Vivaldi", es: "Antonio Vivaldi", de: "Antonio Vivaldi", ru: "Антонио Вивальди" }),
    composerDates: "1678–1741",
    description: defineLibraryLocalizedValue({ en: "The first violin concerto from The Four Seasons.", "zh-CN": "小提琴协奏曲《四季》中的第一首。", "zh-TW": "小提琴協奏曲《四季》中的第一首。", ja: "ヴァイオリン協奏曲集『四季』の第1曲。", ko: "바이올린 협주곡 《사계》의 첫 번째 곡입니다.", fr: "Premier concerto pour violon des Quatre Saisons.", es: "Primer concierto para violín de Las cuatro estaciones.", de: "Das erste Violinkonzert aus den Vier Jahreszeiten.", ru: "Первый скрипичный концерт из цикла «Времена года»." }),
    era: "Baroque",
    instruments: ["Violin", "Strings", "Keyboard"],
    ensemble: "Solo and orchestra",
    difficulty: "Advanced",
    formats: ["Scans", "Source editions"],
    sourceProvider: "IMSLP",
    sourceUrl: "https://imslp.org/wiki/Le_quattro_stagioni_(Vivaldi,_Antonio)",
    workRights: "Public domain",
    assetLicense: sourceLinkedLicense,
    assetLicenseKey: "source-linked-review",
    assetStatus: "source-linked",
  },
  {
    slug: "handel-hallelujah-chorus",
    title: defineLibraryLocalizedValue({ en: "Hallelujah Chorus from Messiah", "zh-CN": "《弥赛亚》哈利路亚合唱", "zh-TW": "《彌賽亞》哈利路亞合唱", ja: "『メサイア』より「ハレルヤ」", ko: "《메시아》 중 할렐루야 합창", fr: "Chœur Hallelujah du Messie", es: "Coro Aleluya de El Mesías", de: "Halleluja-Chor aus dem Messias", ru: "Хор «Аллилуйя» из «Мессии»" }),
    composer: defineLibraryLocalizedValue({ en: "George Frideric Handel", "zh-CN": "乔治·弗里德里希·亨德尔", "zh-TW": "喬治·弗里德里希·韓德爾", ja: "ゲオルク・フリードリヒ・ヘンデル", ko: "게오르크 프리드리히 헨델", fr: "Georg Friedrich Haendel", es: "Georg Friedrich Händel", de: "Georg Friedrich Händel", ru: "Георг Фридрих Гендель" }),
    composerDates: "1685–1759",
    description: defineLibraryLocalizedValue({ en: "SATB chorus with orchestral accompaniment from Messiah.", "zh-CN": "《弥赛亚》中带管弦乐伴奏的 SATB 合唱。", "zh-TW": "《彌賽亞》中帶管弦樂伴奏的 SATB 合唱。", ja: "『メサイア』に含まれる、管弦楽伴奏付きのSATB合唱曲。", ko: "《메시아》에 나오는 관현악 반주의 SATB 합창곡입니다.", fr: "Chœur SATB avec accompagnement orchestral extrait du Messie.", es: "Coro SATB con acompañamiento orquestal de El Mesías.", de: "SATB-Chor mit Orchesterbegleitung aus dem Messias.", ru: "Хор SATB с оркестровым сопровождением из «Мессии»." }),
    era: "Baroque",
    instruments: ["Choir", "Voice", "Orchestra"],
    ensemble: "SATB choir and orchestra",
    difficulty: "Advanced",
    formats: ["Choral source editions"],
    sourceProvider: "CPDL",
    sourceUrl: "https://www.cpdl.org/wiki/index.php/George_Frideric_Handel",
    workRights: "Public domain",
    assetLicense: sourceLinkedLicense,
    assetLicenseKey: "source-linked-review",
    assetStatus: "source-linked",
    featured: true,
  },
  {
    slug: "schubert-ave-maria-d-839",
    title: defineLibraryLocalizedValue({ en: "Ave Maria, D. 839", "zh-CN": "圣母颂 D. 839", "zh-TW": "聖母頌 D. 839", ja: "アヴェ・マリア D. 839", ko: "아베 마리아 D. 839", fr: "Ave Maria, D. 839", es: "Ave María, D. 839", de: "Ave Maria, D. 839", ru: "Аве Мария, D. 839" }),
    composer: defineLibraryLocalizedValue({ en: "Franz Schubert", "zh-CN": "弗朗茨·舒伯特", "zh-TW": "法蘭茲·舒伯特", ja: "フランツ・シューベルト", ko: "프란츠 슈베르트", fr: "Franz Schubert", es: "Franz Schubert", de: "Franz Schubert", ru: "Франц Шуберт" }),
    composerDates: "1797–1828",
    description: defineLibraryLocalizedValue({ en: "Art song commonly performed by solo voice with piano accompaniment.", "zh-CN": "常以独唱和钢琴伴奏形式演出的艺术歌曲。", "zh-TW": "常以獨唱與鋼琴伴奏形式演出的藝術歌曲。", ja: "独唱とピアノ伴奏で広く演奏される芸術歌曲。", ko: "독창과 피아노 반주로 흔히 연주되는 예술가곡입니다.", fr: "Mélodie souvent interprétée par une voix soliste avec accompagnement de piano.", es: "Canción artística interpretada habitualmente por voz solista y piano.", de: "Kunstlied, das häufig für Solostimme mit Klavierbegleitung aufgeführt wird.", ru: "Художественная песня, обычно исполняемая солистом с фортепиано." }),
    era: "Romantic",
    instruments: ["Voice", "Piano"],
    ensemble: "Voice and piano",
    difficulty: "Intermediate",
    formats: ["Source edition"],
    sourceProvider: "Mutopia",
    sourceUrl: "https://www.mutopiaproject.org/cgibin/make-table.cgi?Composer=SchubertF",
    workRights: "Public domain",
    assetLicense: sourceLinkedLicense,
    assetLicenseKey: "source-linked-review",
    assetStatus: "source-linked",
  },
  {
    slug: "brahms-lullaby-op-49-4",
    title: defineLibraryLocalizedValue({ en: "Wiegenlied, Op. 49 No. 4", "zh-CN": "摇篮曲 Op. 49 No. 4", "zh-TW": "搖籃曲 Op. 49 No. 4", ja: "子守歌 Op. 49 No. 4", ko: "자장가 Op. 49 No. 4", fr: "Berceuse, op. 49 no 4", es: "Canción de cuna, op. 49 n.º 4", de: "Wiegenlied, Op. 49 Nr. 4", ru: "Колыбельная, соч. 49 № 4" }),
    composer: defineLibraryLocalizedValue({ en: "Johannes Brahms", "zh-CN": "约翰内斯·勃拉姆斯", "zh-TW": "約翰尼斯·布拉姆斯", ja: "ヨハネス・ブラームス", ko: "요하네스 브람스", fr: "Johannes Brahms", es: "Johannes Brahms", de: "Johannes Brahms", ru: "Иоганнес Брамс" }),
    composerDates: "1833–1897",
    description: defineLibraryLocalizedValue({ en: "Lullaby for solo voice and piano.", "zh-CN": "为独唱和钢琴创作的摇篮曲。", "zh-TW": "為獨唱與鋼琴創作的搖籃曲。", ja: "独唱とピアノのための子守歌。", ko: "독창과 피아노를 위한 자장가입니다.", fr: "Berceuse pour voix soliste et piano.", es: "Canción de cuna para voz solista y piano.", de: "Wiegenlied für Solostimme und Klavier.", ru: "Колыбельная для сольного голоса и фортепиано." }),
    era: "Romantic",
    instruments: ["Voice", "Piano"],
    ensemble: "Voice and piano",
    difficulty: "Easy",
    formats: ["Source edition"],
    sourceProvider: "Mutopia",
    sourceUrl: "https://www.mutopiaproject.org/cgibin/make-table.cgi?Composer=BrahmsJ",
    workRights: "Public domain",
    assetLicense: sourceLinkedLicense,
    assetLicenseKey: "source-linked-review",
    assetStatus: "source-linked",
  },
  {
    slug: "tallis-if-ye-love-me",
    title: defineLibraryLocalizedValue({ en: "If Ye Love Me", "zh-CN": "若你们爱我", "zh-TW": "若你們愛我", ja: "もしあなたがたが私を愛するなら", ko: "너희가 나를 사랑하면", fr: "Si vous m’aimez", es: "Si me amáis", de: "Wenn ihr mich liebt", ru: "Если любите Меня" }),
    composer: defineLibraryLocalizedValue({ en: "Thomas Tallis", "zh-CN": "托马斯·塔利斯", "zh-TW": "托馬斯·塔利斯", ja: "トマス・タリス", ko: "토머스 탤리스", fr: "Thomas Tallis", es: "Thomas Tallis", de: "Thomas Tallis", ru: "Томас Таллис" }),
    composerDates: "c.1505–1585",
    description: defineLibraryLocalizedValue({ en: "Four-part English Renaissance motet commonly sung a cappella.", "zh-CN": "常以阿卡贝拉形式演唱的四声部英国文艺复兴经文歌。", "zh-TW": "常以阿卡貝拉形式演唱的四聲部英國文藝復興經文歌。", ja: "アカペラで歌われることの多い、4声部のイングランド・ルネサンス期モテット。", ko: "보통 아카펠라로 부르는 4성부 영국 르네상스 모테트입니다.", fr: "Motet anglais de la Renaissance à quatre voix, généralement chanté a cappella.", es: "Motete inglés renacentista a cuatro voces, interpretado habitualmente a cappella.", de: "Vierstimmige englische Renaissance-Motette, die meist a cappella gesungen wird.", ru: "Четырёхголосный английский мотет эпохи Возрождения, обычно исполняемый а капелла." }),
    era: "Renaissance",
    instruments: ["Choir", "Voice"],
    ensemble: "SATB a cappella",
    difficulty: "Intermediate",
    formats: ["Choral source editions"],
    sourceProvider: "CPDL",
    sourceUrl: "https://www.cpdl.org/wiki/index.php/Thomas_Tallis",
    workRights: "Public domain",
    assetLicense: sourceLinkedLicense,
    assetLicenseKey: "source-linked-review",
    assetStatus: "source-linked",
    featured: true,
  },
] as const;

export function findPublicScore(slug: string) {
  return publicScoreLibrary.find((score) => score.slug === slug);
}

export function getPublicScoreText(value: LibraryLocalizedValue, locale: SupportedLocale) {
  return getLocalizedValue(value, locale);
}

export function listPublicScoreFacets(locale: SupportedLocale = "en") {
  const catalog = getLibraryCatalog(locale);
  const collator = getLibraryCollator(locale);
  return {
    instruments: [...new Set(publicScoreLibrary.flatMap((score) => score.instruments))]
      .sort((left, right) => collator.compare(catalog.values.instruments[left], catalog.values.instruments[right])),
    ensembles: [...new Set(publicScoreLibrary.map((score) => score.ensemble))]
      .sort((left, right) => collator.compare(catalog.values.ensembles[left], catalog.values.ensembles[right])),
    eras: [...new Set(publicScoreLibrary.map((score) => score.era))]
      .sort((left, right) => collator.compare(catalog.values.eras[left], catalog.values.eras[right])),
  };
}

function normalizePublicScoreSearchText(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase();
}

export function filterPublicScores(input: { query?: string; instrument?: string; ensemble?: string; era?: string }) {
  const query = normalizePublicScoreSearchText(input.query?.trim() ?? "");
  return publicScoreLibrary.filter((score) => {
    const searchable = [
      ...SUPPORTED_LOCALES.flatMap((locale) => [
        getPublicScoreText(score.title, locale),
        getPublicScoreText(score.composer, locale),
        getPublicScoreText(score.description, locale),
      ]),
      ...getLibrarySearchLabels(score),
      score.assetLicense,
      score.composerDates,
      score.sourceProvider,
      score.sourceUrl,
    ]
      .join(" ")
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLocaleLowerCase();
    return (!query || searchable.includes(query))
      && (!input.instrument || score.instruments.some((instrument) => instrument === input.instrument))
      && (!input.ensemble || score.ensemble === input.ensemble)
      && (!input.era || score.era === input.era);
  });
}
