import type { Metadata } from "next";
import { CopyrightComplaintForm } from "../../components/CopyrightComplaintForm";
import { readSiteLocale } from "../../lib/locale";
import { siteConfig } from "../../lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await readSiteLocale();
  return {
    title: locale === "zh-CN" ? `版权与侵权投诉 | ${siteConfig.siteName}` : `Copyright Complaint Process | ${siteConfig.siteName}`,
    description: locale === "zh-CN" ? "提交乐谱、录音或分享链接的版权投诉，获取受理编号和私密查询码，并在线查看公开处理进度。" : "Submit a copyright complaint about a score, recording, or shared link, receive a private tracking code, and view public case updates.",
    alternates: { canonical: "/copyright-complaint" },
    robots: { index: true, follow: true },
  };
}

export default async function CopyrightComplaintPage() {
  const locale = await readSiteLocale();
  const isChinese = locale === "zh-CN";
  const faq = [
    { question: isChinese ? "哪些链接可以投诉？" : "Which URLs can I report?", answer: isChinese ? "请提交 ScoreTransposer 官网、应用或公开分享域名下的具体链接。" : "Submit specific URLs on the ScoreTransposer site, app, or public sharing domains." },
    { question: isChinese ? "查询码为什么只显示一次？" : "Why is the access code shown once?", answer: isChinese ? "平台只保存查询码哈希，无法从数据库还原原查询码，以降低投诉材料泄露风险。" : "Only a hash is stored, so the original code cannot be recovered from the database." },
    { question: isChinese ? "提交后会自动删除内容吗？" : "Does submission automatically remove content?", answer: isChinese ? "不会。平台会先核验材料，并通过公开处理记录说明补充材料、采取措施或驳回的原因。" : "No. The platform reviews the materials and records requests for information, action, or rejection reasons in the public case history." },
  ];
  const jsonLd = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: isChinese ? "首页" : "Home", item: siteConfig.siteUrl }, { "@type": "ListItem", position: 2, name: isChinese ? "版权投诉" : "Copyright complaint", item: `${siteConfig.siteUrl}/copyright-complaint` }] },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) },
  ];
  return (
    <section className="public-container page-shell stack-xl">
      <header className="page-banner"><p className="eyebrow">{isChinese ? "版权与合规" : "Copyright and compliance"}</p><h1 className="page-title">{isChinese ? "版权投诉与处理进度" : "Copyright complaint and case status"}</h1><p className="body-copy">{isChinese ? "结构化提交、私密查询、公开处理记录和内部审计彼此分离。首次响应目标为 48 小时，不代表法律结论或固定处置时限。" : "Structured submission, private lookup, public case updates, and internal audit remain separated. The 48-hour target is for an initial response, not a legal determination or guaranteed resolution deadline."}</p></header>
      <CopyrightComplaintForm locale={locale} />
      <section className="surface-panel stack-lg"><h2 className="card-title">{isChinese ? "常见问题" : "Frequently asked questions"}</h2>{faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p className="body-copy">{item.answer}</p></details>)}</section>
      {jsonLd.map((item, index) => <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }} />)}
    </section>
  );
}
