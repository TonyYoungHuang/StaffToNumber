import type { ReactElement } from "react";
import { PRODUCT_NAME } from "@score/shared";
import {
  ArrowNorthEastIcon,
  CheckSealIcon,
  FeatureCard,
  FileStackIcon,
  GlobeIcon,
  MetricCard,
  Panel,
  PreviewStaffGraphic,
  SectionIntro,
  SparkIcon,
  StatusPill,
  UploadIcon,
  VaultIcon,
  WorkflowStep,
  sonataCopy,
} from "@score/ui";
import { siteConfig } from "../lib/site";

const appUrl = siteConfig.appUrl;

const featureCards: ReadonlyArray<{
  title: string;
  body: string;
  icon: ReactElement;
  tone?: "tertiary";
}> = [
  {
    title: "Focused conversion engine",
    body: "The public promise now matches the real product scope: five-line staff PDF to numbered notation, without exposing unfinished reverse conversion.",
    icon: <SparkIcon width={20} height={20} />,
  },
  {
    title: "Cross-market access",
    body: "The same website supports Google-friendly discoverability while the paid activation workflow can still be fulfilled through your external sales channels.",
    icon: <GlobeIcon width={20} height={20} />,
    tone: "tertiary" as const,
  },
  {
    title: "Draft-safe delivery",
    body: "Weak or unclear pages can stay in draft bundles, so users still get a workable package instead of a falsely polished result.",
    icon: <CheckSealIcon width={20} height={20} />,
  },
];

const workflow = [
  {
    step: "01",
    title: "Create account and redeem access",
    body: "Users register first and then unlock one year of access with a dedicated activation code.",
  },
  {
    step: "02",
    title: "Upload a five-line staff PDF",
    body: "The current live input format is PDF only, which keeps the QA surface tighter for the first release.",
  },
  {
    step: "03",
    title: "Queue Staff PDF to Jianpu",
    body: "The worker creates preview text, final output, or a draft bundle depending on confidence.",
  },
  {
    step: "04",
    title: "Download and review",
    body: "Users retrieve the final PDF or draft package for manual correction outside the browser.",
  },
] as const;

const useCases = [
  {
    title: "Music educators",
    body: "Turn staff PDFs into numbered notation handouts for Jianpu-first learners without rebuilding every arrangement manually.",
  },
  {
    title: "Performers in cross-cultural ensembles",
    body: "Share one score source while generating numbered drafts for players who rehearse faster with Jianpu.",
  },
  {
    title: "Arrangers and publishers",
    body: "Use draft-first delivery to reduce rework and isolate the pages that still need manual review.",
  },
] as const;

const faq = [
  {
    q: "What does the current live version support?",
    a: "Only five-line staff PDF to Jianpu is live in the current release. Reverse conversion, transposition, and in-browser manual editing are not included yet.",
  },
  {
    q: "Can users try the website for free?",
    a: "The public website is open for discovery and SEO. Actual use of the conversion tool is gated by account creation plus a paid activation code.",
  },
  {
    q: "What happens when a PDF is unclear?",
    a: "The pipeline can keep the result as a draft bundle instead of pretending confidence. That gives users a safer package for manual correction.",
  },
  {
    q: "Does the site support users outside mainland China?",
    a: "Yes. The public website is positioned for global search visibility, while activation and access can still follow your own external sales process.",
  },
] as const;

export default function HomePage() {
  return (
    <section className="public-container public-page">
      <div className="hero-section">
        <div className="hero-copy">
          <SectionIntro
            eyebrow="Precision manuscript engine"
            title="Convert music notation with a more editorial, premium interface."
            body={`${PRODUCT_NAME} now uses the Stitch visual direction across both the public website and the authenticated app. The current live offer is direct and honest: ${sonataCopy.currentScope}.`}
            titleAs="h1"
            largeBody
          />
          <div className="button-row">
            <a href={appUrl} className="public-button primary">
              Start conversion
              <ArrowNorthEastIcon width={16} height={16} />
            </a>
            <a href="#methods" className="public-button secondary">
              View workflow
            </a>
            <a href="#pricing" className="public-button tertiary">
              Pricing and access
            </a>
          </div>
          <Panel variant="sunken" className="stack-md">
            <StatusPill tone="cyan">Current live scope only</StatusPill>
            <p className="body-copy">
              Reverse conversion, in-browser manual editing, and transposition remain outside this release so the product story stays aligned with what users can do today.
            </p>
          </Panel>
        </div>

        <div className="preview-shell">
          <div className="button-row">
            <span className="live-chip">Live conversion concept</span>
          </div>
          <PreviewStaffGraphic />
          <Panel variant="sunken" className="stack-md">
            <p className="metric-label">Numbered preview</p>
            <div className="kianpu-line">
              <span>1</span>
              <span>.</span>
              <span>3</span>
              <span>5</span>
              <span>6</span>
            </div>
            <p className="helper-copy">When a source PDF is clear, the system aims for final output. Lower-confidence pages stay draft-first.</p>
          </Panel>
        </div>
      </div>

      <Panel className="stack-xl" variant="surface">
        <SectionIntro
          eyebrow="Methods"
          title="A clearer promise, now matched by the interface and the actual product scope."
          body="The public site is no longer a placeholder shell. It now speaks the same visual language as the tool itself and reflects the current production constraints you set."
          className="stack-md"
          largeBody
        />
        <div id="methods" className="feature-grid">
          {featureCards.map((card) => (
            <FeatureCard key={card.title} icon={card.icon} title={card.title} body={card.body} tone={card.tone} />
          ))}
        </div>
      </Panel>

      <section id="use-cases" className="preview-grid">
        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow="Use cases"
            title="Who the first release is really for"
            body="The early version is built for people who already work with real PDFs and need a controlled, practical route into Jianpu outputs."
          />
          <div className="feature-grid">
            {useCases.map((item, index) => (
              <Panel key={item.title} variant="sunken" className="stack-md">
                <StatusPill tone={index === 1 ? "cyan" : "primary"}>{item.title}</StatusPill>
                <p className="body-copy">{item.body}</p>
              </Panel>
            ))}
          </div>
        </Panel>

        <Panel variant="surface" className="stack-lg">
          <SectionIntro eyebrow="Converter surface" title="The public site previews the same studio vocabulary used inside the app." />
          <div className="cloud-grid">
            <div className="cloud-chip">
              <UploadIcon width={20} height={20} />
              <span>PDF upload</span>
            </div>
            <div className="cloud-chip">
              <FileStackIcon width={20} height={20} />
              <span>Preview text</span>
            </div>
            <div className="cloud-chip">
              <CheckSealIcon width={20} height={20} />
              <span>Result bundle</span>
            </div>
          </div>
          <p className="helper-copy">The same dark charcoal palette, tonal layering, serif-sans contrast, and gradient actions now apply consistently across marketing and product surfaces.</p>
        </Panel>
      </section>

      <Panel className="stack-xl" variant="surface">
        <SectionIntro eyebrow="Workflow" title="A four-step path from purchase to usable numbered notation." />
        <div id="workflow" className="workflow-grid">
          {workflow.map((item) => (
            <WorkflowStep key={item.step} step={item.step} title={item.title} body={item.body} />
          ))}
        </div>
      </Panel>

      <section id="pricing" className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro
            eyebrow="Pricing and access"
            title="The website stays open for discovery while actual tool usage stays activation-gated."
            body="That means Google can index the site, overseas users can learn the product clearly, and actual conversion access is still protected by the one-year activation-code workflow you already defined."
            largeBody
          />
          <div className="metric-grid">
            <MetricCard label="Public site" value="Free" body="Open to search engines and visitors without login." />
            <MetricCard label="Tool usage" value="Paid" body="Account plus activation code required before conversion." />
            <MetricCard label="Access term" value="1 year" body="The current activation model unlocks one year of use." />
          </div>
          <div className="button-row">
            <a href={appUrl} className="public-button primary">
              Open app
            </a>
            <a href={`${appUrl}/register`} className="public-button secondary">
              Create account
            </a>
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <div className="stack-sm">
            <span className="icon-badge tertiary">
              <VaultIcon width={20} height={20} />
            </span>
            <h2 className="card-title">Current commercial model</h2>
          </div>
          <WorkflowStep step="A" title="Public marketing stays open" body="The landing site is discoverable and readable without login, which supports SEO and top-of-funnel visibility." />
          <WorkflowStep step="B" title="Tool access stays paid" body="Users register, redeem the dedicated code, and receive one year of access after purchase." />
        </Panel>
      </section>

      <section id="faq" className="preview-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro eyebrow="FAQ" title="Short answers to the questions users will ask before they buy." />
          <div className="stack-md">
            {faq.map((item) => (
              <Panel key={item.q} variant="sunken" className="stack-sm">
                <p className="item-title">{item.q}</p>
                <p className="body-copy">{item.a}</p>
              </Panel>
            ))}
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro eyebrow="Delivery logic" title="Final when strong, draft when weak" />
          <div className="metric-grid">
            <MetricCard label="Input" value="PDF" body="Current source type in production." />
            <MetricCard label="Direction" value="One" body="Staff PDF -> Jianpu only." />
            <MetricCard label="Review path" value="Draft" body="Downloadable draft bundle when confidence is weak." />
          </div>
        </Panel>
      </section>

      <section id="privacy" className="access-grid">
        <Panel variant="surface" className="stack-lg">
          <SectionIntro
            eyebrow="Privacy"
            title="Privacy terms are published for launch-day operations"
            body="Uploaded PDFs are used to perform the requested conversion workflow, retain source files for user access inside the app, and generate final or draft outputs. The dedicated privacy page now publishes the current data-handling baseline for scoretransposer.com."
          />
          <div className="stack-sm">
            <p className="body-copy">The launch policy covers account identity data, uploaded source files, generated result files, support contact handling, and the current manual account-deletion flow.</p>
            <p className="helper-copy">Read the full document before launch approval and mirror it in your customer support workflow.</p>
            <div className="button-row">
              <a href="/privacy" className="public-button secondary">
                Open privacy policy
              </a>
            </div>
          </div>
        </Panel>

        <Panel variant="glass" className="stack-lg">
          <SectionIntro
            eyebrow="Terms"
            title="Usage boundaries are explicit before payment and activation"
            body="The production terms now state that support is limited to the published scope, that users remain responsible for checking musical correctness, and that transposition plus reverse conversion are not included in this release."
          />
          <div id="terms" className="stack-sm">
            <p className="body-copy">The launch terms define activation validity, refund boundary language, draft-result expectations, and acceptable-use limits for uploaded content.</p>
            <p className="helper-copy">These public legal pages should stay aligned with the exact activation, support, and refund process you operate offline.</p>
            <div className="button-row">
              <a href="/terms" className="public-button secondary">
                Open terms of service
              </a>
            </div>
          </div>
        </Panel>
      </section>
    </section>
  );
}
