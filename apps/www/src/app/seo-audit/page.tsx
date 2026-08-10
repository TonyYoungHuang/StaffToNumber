import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MetricCard, Panel, SectionIntro, StatusPill } from "@score/ui";
import { auditFeatureSeo, buildSeoSuggestions, getFeatureSeoRecord } from "../../lib/feature-seo";
import { platformFeaturePages } from "../../lib/platform-feature-pages";
import { siteConfig } from "../../lib/site";
import { canAccessInternalTools } from "../../lib/internal-access";

export const metadata: Metadata = {
  title: `AI TDK and feature SEO audit | ${siteConfig.siteName}`,
  description: "Internal feature-page SEO quality report covering TDK, search intent, schema, evidence, internal links, and publication approval.",
  alternates: { canonical: "/seo-audit" },
  robots: { index: false, follow: false },
};

function issueTone(severity: "error" | "warning" | "info") {
  if (severity === "error") return "red" as const;
  if (severity === "warning") return "amber" as const;
  return "cyan" as const;
}

export default async function SeoAuditPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!canAccessInternalTools(token)) notFound();
  const report = auditFeatureSeo(platformFeaturePages);

  return (
    <div className="public-container page-stack">
      <section className="page-banner split">
        <SectionIntro
          eyebrow="AI TDK / SEO quality gate"
          title="Feature-page search readiness and publication review"
          body="A source-controlled audit of titles, descriptions, intent clusters, canonical routes, structured data, product evidence, internal links, and human approval. This page is noindex and is not included in the sitemap."
          titleAs="h1"
          largeBody
        />
        <Panel variant="glass" className="stack-md">
          <StatusPill tone={report.publishReady ? "green" : "amber"}>{report.publishReady ? "Publish ready" : "Review required"}</StatusPill>
          <p className="metric-value">{report.score}/100</p>
          <p className="body-copy">Generated {new Date(report.generatedAt).toLocaleString("en-US", { timeZone: "UTC" })} UTC</p>
          <a className="public-button secondary" href={`/seo-audit/report${token ? `?token=${encodeURIComponent(token)}` : ""}`} download>
            Download audit JSON
          </a>
        </Panel>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow="Coverage" title="Current feature SEO inventory" body="Errors block publication. Warnings identify editorial or human-review work that must be completed before production release." />
        <div className="metric-grid">
          <MetricCard label="Feature pages" value={String(report.metrics.pages)} body="All sitemap feature routes." />
          <MetricCard label="Blocking errors" value={String(report.metrics.errors)} body="Broken routes, duplicate metadata, schema, or evidence gaps." />
          <MetricCard label="Review warnings" value={String(report.metrics.warnings)} body="Snippet length, keyword, or approval follow-up." />
          <MetricCard label="Human-approved" value={`${report.metrics.approved}/${report.metrics.pages}`} body="Pages with reviewer and fact-check date." />
        </div>
      </section>

      <section className="surface-panel stack-lg">
        <SectionIntro eyebrow="Page inventory" title="Intent, metadata, evidence, and approval" body="AI suggestions remain proposals. The source record must carry a named human reviewer and fact-check date before it becomes publish-ready." />
        <div className="list-grid">
          {platformFeaturePages.map((page) => {
            const seo = getFeatureSeoRecord(page.slug);
            if (!seo) return null;
            const suggestions = buildSeoSuggestions(page, seo);
            const pageIssues = report.issues.filter((issue) => issue.slug === page.slug);
            return (
              <Panel key={page.slug} className="stack-md">
                <div className="score-review-toolbar">
                  <div>
                    <p className="item-title">{page.title}</p>
                    <p className="item-meta">{page.canonical} · {seo.keywordCluster}</p>
                  </div>
                  <StatusPill tone={seo.review.status === "approved" ? "green" : "amber"}>{seo.review.status}</StatusPill>
                </div>
                <div className="split-layout">
                  <div className="stack-sm">
                    <p className="eyebrow">Search intent</p>
                    <p className="body-copy">{seo.searchIntent}</p>
                    <p className="item-meta">Primary keyword: {seo.primaryKeyword}</p>
                  </div>
                  <div className="stack-sm">
                    <p className="eyebrow">SERP preview</p>
                    <p className="item-title">{page.title} | {siteConfig.siteName}</p>
                    <p className="body-copy">{page.description}</p>
                  </div>
                </div>
                <details className="list-item">
                  <summary className="item-title">AI-assisted suggestions and checks</summary>
                  <p className="item-meta">Suggested title: {suggestions.title}</p>
                  <p className="item-meta">Suggested description: {suggestions.description}</p>
                  <p className="item-meta">Internal links: {suggestions.internalLinks.join(", ")}</p>
                </details>
                <div className="list-grid">
                  {pageIssues.length === 0 ? (
                    <div className="list-item"><StatusPill tone="green">No open issues</StatusPill></div>
                  ) : pageIssues.map((issue) => (
                    <div key={`${issue.field}-${issue.message}`} className="list-item">
                      <StatusPill tone={issueTone(issue.severity)}>{issue.severity}</StatusPill>
                      <div className="list-item-content">
                        <p className="item-title">{issue.field}: {issue.message}</p>
                        <p className="item-meta">{issue.suggestion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            );
          })}
        </div>
      </section>
    </div>
  );
}
