import type { Metadata } from "next";
import Link from "next/link";
import { Panel, SectionIntro, WorkflowStep } from "@score/ui";
import { readSiteLocale } from "../../lib/locale";
import { siteConfig } from "../../lib/site";

const canonicalPath = "/how-to-read-sheet-music";
const keywords = [
  "how to read sheet music",
  "how to read music",
  "music notation symbols",
  "notes on staff",
  "read piano sheet music",
  "五线谱怎么看",
  "五线谱入门",
];

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();
  const chinese = locale === "zh-CN";
  const title = chinese ? "五线谱怎么看：音符、节奏与常用记号入门" : "How to Read Sheet Music | ScoreTransposer";
  const description = chinese
    ? "从谱表、谱号和音名开始学习五线谱，再理解时值、拍号、调号与常用音乐记号，并用在线乐谱工具继续查看、播放和编辑。"
    : "Learn how to read sheet music by recognizing notes on the staff, clefs, rhythm, time and key signatures, then practice with an editable online score.";

  return {
    title,
    description,
    keywords,
    alternates: { canonical: canonicalPath },
    robots: {
      index: siteConfig.release.publicLaunchReady,
      follow: siteConfig.release.publicLaunchReady,
      googleBot: {
        index: siteConfig.release.publicLaunchReady,
        follow: siteConfig.release.publicLaunchReady,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title,
      description,
      url: `${siteConfig.siteUrl}${canonicalPath}`,
      siteName: siteConfig.siteName,
      locale: chinese ? "zh_CN" : "en_US",
      type: "article",
      images: [{
        url: "/product/score-preview-output-real.png",
        width: 1265,
        height: 712,
        alt: chinese ? "用于学习音符与五线谱记号的乐谱预览" : "Sheet music preview for learning notes and notation symbols",
      }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/product/score-preview-output-real.png"],
    },
  };
}

export default async function HowToReadSheetMusicPage() {
  const locale = await readSiteLocale();
  const chinese = locale === "zh-CN";
  const copy = chinese
    ? {
        eyebrow: "五线谱入门指南",
        title: "五线谱怎么看：从谱表上的音符开始",
        intro: "学习五线谱不需要一次记住所有符号。先找到谱号和基准音，再按线、间和节奏逐步读取；遇到复杂乐谱时，可以在在线编辑器中播放、放慢并逐小节核对。",
        summaryTitle: "先掌握四个核心概念",
        summaryBody: "大多数入门乐谱都可以用谱表位置、谱号、节奏与调号四组信息读懂。",
        concepts: [
          ["谱表与音高", "五条线和四个间代表不同音高；音符越靠上，通常音高越高。"],
          ["谱号", "高音谱号常用于右手和高音乐器，低音谱号常用于左手与低音乐器。"],
          ["时值与节奏", "全音符、二分音符、四分音符和八分音符决定声音持续多久。"],
          ["拍号与调号", "拍号组织每小节的节拍，调号说明哪些音通常需要升高或降低。"],
        ],
        stepsTitle: "按这个顺序读一小节五线谱",
        stepsBody: "先确定环境，再读取音高与节奏，最后结合表情和演奏记号。",
        steps: [
          ["确认谱号和调号", "先看每行最左侧，确定音高参照以及默认升降音。"],
          ["找到谱表上的音符", "按线与间判断音名，超出谱表的音符通过加线继续延伸。"],
          ["计算每个音的时值", "结合音符形状、附点、连音线和休止符，确认每小节是否完整。"],
          ["检查临时记号", "升号、降号和还原号通常影响同一小节内后续的同名音。"],
          ["慢速播放并核对", "先按稳定节拍读谱，再逐步加入力度、奏法和速度变化。"],
        ],
        symbolsTitle: "常见音乐记号是什么意思",
        symbolsBody: "读谱时应把音高、时间和表情三个维度合在一起，而不是只看音名。",
        symbols: [
          ["♯、♭、♮", "升号、降号与还原号改变音高。"],
          ["休止符", "表示需要保持安静的时长，也属于节奏的一部分。"],
          ["连音线与延音线", "一个组织乐句，另一个把相同音高的时值连接起来。"],
          ["p、f、渐强与渐弱", "说明演奏力度以及力度如何随时间变化。"],
        ],
        practiceTitle: "把识谱练习连接到真实乐谱",
        practiceBody: "上传或打开你有权使用的乐谱，先核对识别候选，再在同一个工程中编辑、播放、移调或转换简谱。",
        edit: "打开在线五线谱编辑器",
        scan: "扫描 PDF 或乐谱图片",
        play: "使用在线乐谱播放器",
        faqTitle: "五线谱入门常见问题",
        faqs: [
          ["必须背下所有音符位置吗？", "不必一次背完。先记住高音谱号与低音谱号的基准音，再通过相邻音逐步推导。"],
          ["钢琴谱为什么有两行谱表？", "钢琴常用大谱表，上方通常是高音谱号、下方通常是低音谱号，两只手可以同时读取。"],
          ["扫描后的乐谱可以直接使用吗？", "应先检查音高、节奏、调号和小节。扫描识别会生成候选稿，不保证所有复杂乐谱完全正确。"],
        ],
      }
    : {
        eyebrow: "Beginner sheet music guide",
        title: "How to Read Sheet Music: Notes on the Staff",
        intro: "You do not need to memorize every music notation symbol at once. Start with the clef and a reference note, then read staff position and rhythm step by step. For a difficult score, use the online editor to play, slow down, and inspect each measure.",
        summaryTitle: "Start with four parts of music notation",
        summaryBody: "Most beginner sheet music becomes readable once you separate staff position, clef, rhythm, and key information.",
        concepts: [
          ["Staff and pitch", "Five lines and four spaces represent pitches. A note placed higher on the staff usually sounds higher."],
          ["Clefs", "Treble clef commonly covers higher notes; bass clef commonly covers lower notes and the left hand of piano music."],
          ["Note values and rhythm", "Whole, half, quarter, and eighth notes tell you how long a sound lasts."],
          ["Time and key signatures", "The time signature organizes beats in a measure, while the key signature establishes recurring sharps or flats."],
        ],
        stepsTitle: "Read one measure in this order",
        stepsBody: "Establish the musical context first, then combine pitch and rhythm before adding expression marks.",
        steps: [
          ["Check the clef and key signature", "Read the symbols at the left edge of the staff to establish pitch references and recurring accidentals."],
          ["Identify notes on the staff", "Use each line and space to find note names. Ledger lines extend the same pattern above and below the staff."],
          ["Count each note value", "Combine note shapes, dots, ties, tuplets, and rests so the duration of the measure adds up correctly."],
          ["Apply accidentals", "A sharp, flat, or natural normally affects later notes of the same pitch within that measure."],
          ["Play slowly and verify", "Read with a steady pulse first, then add dynamics, articulation, and tempo changes."],
        ],
        symbolsTitle: "Common music notation symbols",
        symbolsBody: "Reading sheet music means combining pitch, time, and expression rather than naming notes alone.",
        symbols: [
          ["♯, ♭, and ♮", "Sharps, flats, and naturals change a written pitch."],
          ["Rests", "A rest represents measured silence and must be counted as part of the rhythm."],
          ["Slurs and ties", "A slur groups a phrase; a tie combines the duration of repeated pitches."],
          ["p, f, crescendo, diminuendo", "Dynamics describe volume and how it changes over time."],
        ],
        practiceTitle: "Practice with a real, editable score",
        practiceBody: "Open or upload a score you may use, review any recognition candidate, then edit, play, transpose, or create Jianpu inside the same score project.",
        edit: "Open the online sheet music editor",
        scan: "Scan a PDF or score image",
        play: "Use the online sheet music player",
        faqTitle: "Questions about reading sheet music",
        faqs: [
          ["Do I need to memorize every note on the staff?", "No. Learn a few reference notes in treble and bass clef, then derive nearby notes by step."],
          ["Why does piano sheet music use two staves?", "Piano commonly uses a grand staff: treble clef above and bass clef below, allowing both hands to be read together."],
          ["Can I rely on scanned sheet music immediately?", "Review pitch, rhythm, key, and measures first. Optical music recognition creates a candidate and cannot guarantee a perfect result for every score."],
        ],
      };

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: copy.title,
      description: copy.intro,
      inLanguage: locale,
      dateModified: "2026-08-24",
      mainEntityOfPage: `${siteConfig.siteUrl}${canonicalPath}`,
      author: { "@type": "Organization", name: siteConfig.siteName },
      publisher: { "@type": "Organization", name: siteConfig.siteName },
      keywords: keywords.join(", "),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: chinese ? "首页" : "Home", item: siteConfig.siteUrl },
        { "@type": "ListItem", position: 2, name: copy.title, item: `${siteConfig.siteUrl}${canonicalPath}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: copy.faqs.map(([question, answer]) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    },
  ];

  return (
    <article className="public-container page-stack">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <section className="page-banner">
        <SectionIntro eyebrow={copy.eyebrow} title={copy.title} body={copy.intro} titleAs="h1" largeBody />
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={chinese ? "识谱基础" : "Reading basics"} title={copy.summaryTitle} body={copy.summaryBody} />
        <div className="metric-grid">
          {copy.concepts.map(([title, body]) => (
            <Panel key={title} className="stack-sm">
              <h3 className="item-title">{title}</h3>
              <p className="body-copy">{body}</p>
            </Panel>
          ))}
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={chinese ? "读谱顺序" : "Reading order"} title={copy.stepsTitle} body={copy.stepsBody} />
        <div className="workflow-list">
          {copy.steps.map(([title, body], index) => (
            <WorkflowStep key={title} step={String(index + 1).padStart(2, "0")} title={title} body={body} />
          ))}
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={chinese ? "音乐记号" : "Notation symbols"} title={copy.symbolsTitle} body={copy.symbolsBody} />
        <div className="list-grid">
          {copy.symbols.map(([title, body]) => (
            <div key={title} className="list-item">
              <div className="list-item-content">
                <h3 className="item-title">{title}</h3>
                <p className="item-meta">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow={chinese ? "继续练习" : "Practice"} title={copy.practiceTitle} body={copy.practiceBody} />
        <div className="button-row">
          <Link className="public-button primary" href="/score-editor">{copy.edit}</Link>
          <Link className="public-button secondary" href="/pdf-score-scanner">{copy.scan}</Link>
          <Link className="public-button tertiary" href="/score-to-audio">{copy.play}</Link>
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow="FAQ" title={copy.faqTitle} />
        <div className="list-grid">
          {copy.faqs.map(([question, answer]) => (
            <details key={question} className="list-item">
              <summary className="item-title">{question}</summary>
              <p className="body-copy">{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </article>
  );
}
