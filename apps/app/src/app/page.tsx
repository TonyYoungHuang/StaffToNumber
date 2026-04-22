import Link from "next/link";
import { APP_ROUTES } from "@score/shared";
import {
  ArrowNorthEastIcon,
  CheckSealIcon,
  FeatureCard,
  FileStackIcon,
  PreviewStaffGraphic,
  SparkIcon,
  StatusPill,
  VaultIcon,
} from "@score/ui";

const featureCards = [
  {
    title: "Activation-led access",
    body: "Users register first, then unlock a one-year studio window with the dedicated activation code from your external sales workflow.",
    icon: VaultIcon,
    tone: "",
  },
  {
    title: "Focused conversion scope",
    body: "This release keeps the product narrow: only five-line staff PDF to numbered notation is live, so QA and user expectations stay aligned.",
    icon: SparkIcon,
    tone: " tertiary",
  },
  {
    title: "Draft-safe outputs",
    body: "The pipeline already distinguishes stronger pages from weak pages, which lets low-confidence material stay draft instead of over-promising final quality.",
    icon: CheckSealIcon,
    tone: "",
  },
] as const;

export default function AppHomePage() {
  return (
    <section className="container page-shell">
      <div className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">The Sonic Manuscript</p>
          <h1 className="display-title">
            A composed studio for <em>staff PDF</em> to Jianpu conversion.
          </h1>
          <p className="body-copy large">
            This authenticated app now carries the Stitch visual system across registration, activation, uploads, job creation, and result retrieval. Current live scope is intentionally narrow: only five-line staff PDF to numbered notation.
          </p>
          <div className="button-row">
            <Link href={APP_ROUTES.upload} className="button button-primary">
              Start with upload
              <ArrowNorthEastIcon width={16} height={16} />
            </Link>
            <Link href={APP_ROUTES.jobs} className="button button-secondary">
              Open job queue
            </Link>
            <Link href={APP_ROUTES.register} className="button button-tertiary">
              Create account
            </Link>
          </div>
          <div className="editorial-points">
            <div className="editorial-point">
              <div>
                <strong>Current product truth</strong>
                <p className="helper-copy">`numbered_pdf_to_staff` stays closed in the UI. Transposition is deferred to a future module on the same website.</p>
              </div>
            </div>
            <div className="editorial-point">
              <div>
                <strong>Operational sequence</strong>
                <p className="helper-copy">Create account {"->"} redeem activation code {"->"} upload PDF {"->"} create job {"->"} download final PDF or draft bundle.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-preview">
          <div className="stack-sm">
            <StatusPill tone="primary">Current live preview</StatusPill>
            <PreviewStaffGraphic />
            <div className="sunken-panel stack-sm">
              <p className="metric-label">Numbered preview</p>
              <div className="hero-notation">
                <span>1</span>
                <span>.</span>
                <span>3</span>
                <span>5</span>
                <span>6</span>
              </div>
              <p className="micro-copy">Preview text can remain draft when OCR or page confidence is weak.</p>
            </div>
          </div>

          <div className="list-grid">
            <div className="list-item">
              <div className="list-item-content">
                <p className="metric-label">Workflow step 1</p>
                <p className="item-title">Upload reusable source PDFs</p>
              </div>
              <span className="info-icon tertiary">
                <FileStackIcon width={20} height={20} />
              </span>
            </div>
            <div className="list-item">
              <div className="list-item-content">
                <p className="metric-label">Workflow step 2</p>
                <p className="item-title">Queue one locked conversion direction</p>
              </div>
              <StatusPill tone="cyan">Staff {"->"} Jianpu</StatusPill>
            </div>
          </div>
        </div>
      </div>

      <div className="feature-grid">
        {featureCards.map((card) => {
          const Icon = card.icon;
          return (
            <FeatureCard
              key={card.title}
              icon={<Icon width={20} height={20} />}
              title={card.title}
              body={card.body}
              tone={card.tone.trim() === "tertiary" ? "tertiary" : undefined}
            />
          );
        })}
      </div>

      <div className="page-banner split">
        <div className="stack-md">
          <p className="eyebrow">Current app surface</p>
          <h2 className="section-title">All active functionality now belongs inside this Stitch-based studio shell.</h2>
          <p className="body-copy">
            The migrated interface covers the pages that already work today: account creation, sign-in, activation code redemption, PDF upload, job queuing, preview display, and result download.
          </p>
        </div>
        <div className="stack-md">
          <div className="button-row">
            <Link href={APP_ROUTES.dashboard} className="button button-primary">
              Open dashboard
            </Link>
            <Link href={APP_ROUTES.login} className="button button-secondary">
              Sign in
            </Link>
          </div>
          <p className="micro-copy">If you later want, the same visual system can be extended into the public SEO site in `apps/www`.</p>
        </div>
      </div>
    </section>
  );
}
