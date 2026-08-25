import type { Metadata } from "next";
import Link from "next/link";
import { Panel, SectionIntro } from "@score/ui";
import { readSiteLocale } from "../../lib/locale";
import { getLocalizedAbsoluteUrl, getLocalizedAlternates, localizePublicHref } from "../../lib/locale-routing";
import { siteConfig } from "../../lib/site";

const canonicalPath = "/numbered-notation-converter";
const keywords = [
  "numbered notation converter",
  "staff to jianpu",
  "jianpu to staff notation",
  "five-line staff to numbered notation",
  "五线谱转简谱",
  "简谱转五线谱",
];

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();
  const chinese = locale === "zh-CN";
  const title = chinese ? "五线谱与简谱双向转换器" : "Numbered Notation Converter | ScoreTransposer";
  const description = chinese
    ? "在同一个结构化乐谱工程中完成五线谱转简谱或简谱转五线谱，并继续校正、移调、播放以及导出 MusicXML 和 MIDI。"
    : "Use a numbered notation converter for staff-to-Jianpu and Jianpu-to-staff workflows, then edit, transpose, play, or export the same structured score.";

  return {
    title,
    description,
    keywords,
    alternates: getLocalizedAlternates(canonicalPath, locale),
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
      url: getLocalizedAbsoluteUrl(siteConfig.siteUrl, canonicalPath, locale),
      siteName: siteConfig.siteName,
      locale: chinese ? "zh_CN" : "en_US",
      type: "website",
      images: [{
        url: "/product/feature-staff-to-jianpu-real.png",
        width: 1425,
        height: 891,
        alt: chinese ? "五线谱转简谱的结构化乐谱工作区" : "Structured staff-to-Jianpu numbered notation workspace",
      }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/product/feature-staff-to-jianpu-real.png"] },
  };
}

export default async function NumberedNotationConverterPage() {
  const locale = await readSiteLocale();
  const chinese = locale === "zh-CN";
  const copy = chinese
    ? {
        eyebrow: "双向记谱转换",
        title: "五线谱与简谱双向转换器",
        intro: "选择需要的转换方向。两种路径都使用 MusicXML 与 Score JSON 结构，不会把 PDF 像素或图片文字当作可以直接编辑的乐谱。",
        staffTitle: "五线谱转简谱",
        staffBody: "从结构化五线谱生成带调号、音级、八度点、时值、歌词和和弦信息的数字简谱。",
        staffAction: "打开五线谱转简谱",
        jianpuTitle: "简谱转五线谱",
        jianpuBody: "输入结构化简谱，生成可预览、校正和导出的五线谱、MusicXML 与 Score JSON。",
        jianpuAction: "打开简谱转五线谱",
        modelTitle: "为什么使用结构化乐谱",
        modelBody: "转换后的结果可以继续编辑、移调、播放和导出，而不是得到一张无法修改的图片。",
        limitsTitle: "转换前需要知道",
        limitsBody: "扫描 PDF 应先进入乐谱识别和校正流程；当前简谱转五线谱路径优先支持输入或粘贴的结构化简谱文本。",
        faqTitle: "简谱转换常见问题",
        faqs: [
          ["转换后还能修改音符吗？", "可以。结果进入同一个 Score JSON 乐谱工程，可以继续修正音高、节奏、调号和小节。"],
          ["能把扫描简谱图片直接转成五线谱吗？", "当前版本优先支持结构化简谱文本。任意图片简谱识别仍属于后续导入能力。"],
        ],
      }
    : {
        eyebrow: "Two-way notation conversion",
        title: "Numbered Notation Converter for Staff and Jianpu",
        intro: "Choose the conversion direction you need. Both paths use structured MusicXML and Score JSON rather than treating PDF pixels or image text as editable notation.",
        staffTitle: "Staff to Jianpu",
        staffBody: "Convert structured staff notation to numbered notation with key center, scale degrees, octave marks, duration, lyrics, and chord context.",
        staffAction: "Open staff-to-Jianpu converter",
        jianpuTitle: "Jianpu to staff notation",
        jianpuBody: "Enter structured Jianpu and create staff notation, MusicXML, and Score JSON that can be previewed, corrected, and exported.",
        jianpuAction: "Open Jianpu-to-staff converter",
        modelTitle: "Why structured notation matters",
        modelBody: "The result can be edited, transposed, played, and exported instead of becoming a flat image that cannot be corrected.",
        limitsTitle: "What to know before conversion",
        limitsBody: "Scan a PDF through the recognition-and-correction workflow first. The current Jianpu-to-staff path expects typed or pasted structured Jianpu text.",
        faqTitle: "Questions about numbered notation conversion",
        faqs: [
          ["Can I edit notes after conversion?", "Yes. The result enters the shared Score JSON project, where pitch, rhythm, key, and measures remain correctable."],
          ["Can any scanned Jianpu image become staff notation?", "Not yet. The current path prioritizes structured Jianpu text; arbitrary image recognition remains a later import capability."],
        ],
      };

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: copy.title,
      description: copy.intro,
      url: getLocalizedAbsoluteUrl(siteConfig.siteUrl, canonicalPath, locale),
      inLanguage: locale,
      keywords: keywords.join(", "),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: chinese ? "首页" : "Home", item: getLocalizedAbsoluteUrl(siteConfig.siteUrl, "/", locale) },
        { "@type": "ListItem", position: 2, name: copy.title, item: getLocalizedAbsoluteUrl(siteConfig.siteUrl, canonicalPath, locale) },
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
    <div className="public-container page-stack">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <section className="page-banner">
        <SectionIntro eyebrow={copy.eyebrow} title={copy.title} body={copy.intro} titleAs="h1" largeBody />
      </section>

      <section className="split-layout">
        <Panel className="stack-lg">
          <SectionIntro eyebrow={chinese ? "转换方向一" : "Direction one"} title={copy.staffTitle} body={copy.staffBody} />
          <Link className="public-button primary" href={localizePublicHref("/staff-to-jianpu", locale)}>{copy.staffAction}</Link>
        </Panel>
        <Panel className="stack-lg">
          <SectionIntro eyebrow={chinese ? "转换方向二" : "Direction two"} title={copy.jianpuTitle} body={copy.jianpuBody} />
          <Link className="public-button primary" href={localizePublicHref("/jianpu-to-staff", locale)}>{copy.jianpuAction}</Link>
        </Panel>
      </section>

      <section className="split-layout">
        <Panel variant="glass" className="stack-sm">
          <h2 className="item-title">{copy.modelTitle}</h2>
          <p className="body-copy">{copy.modelBody}</p>
        </Panel>
        <Panel variant="glass" className="stack-sm">
          <h2 className="item-title">{copy.limitsTitle}</h2>
          <p className="body-copy">{copy.limitsBody}</p>
        </Panel>
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
    </div>
  );
}
