import type { Metadata } from "next";
import Link from "next/link";
import { Panel, SectionIntro, StatusPill } from "@score/ui";
import { legalLastUpdated, siteConfig } from "../../lib/site";

export const metadata: Metadata = {
  title: `Terms of Service | ${siteConfig.siteName}`,
  description: "Terms of service for ScoreTransposer, covering service scope, activation access, draft results, and usage boundaries.",
  alternates: {
    canonical: "/terms",
  },
};

const sections = [
  {
    title: "Service scope",
    points: [
      "The current live service supports only five-line staff PDF to Jianpu conversion.",
      "Reverse conversion, in-browser editing, and transposition are not included in this production release unless explicitly announced later.",
      "The website, app, and output materials may change as the service evolves, but users should rely only on the published live scope when purchasing access.",
    ],
  },
  {
    title: "Accounts and activation",
    points: [
      "Users must create an account and redeem a valid activation code before using the conversion workflow.",
      "Activation access is tied to the purchased entitlement period and may be suspended for fraud, abuse, charge disputes, or policy violations.",
      "Customers are responsible for keeping account credentials confidential and for all activity performed through their account.",
    ],
  },
  {
    title: "Uploads and outputs",
    points: [
      "Users may upload only content they are authorized to process.",
      "Generated outputs can be delivered either as a final PDF or as a draft package when the system cannot confidently promote the result.",
      "Users remain responsible for reviewing musical accuracy, copyright compliance, and suitability before publication, teaching, rehearsal, or performance.",
    ],
  },
  {
    title: "Refunds and support",
    points: [
      "Refund decisions should follow the support and payment policy communicated to the customer at the time of sale.",
      "Support for the first release is limited to the published workflow, account access, upload handling, and result delivery questions.",
      "Draft output is part of the intended safety model for low-confidence source material and does not by itself indicate service failure.",
    ],
  },
  {
    title: "Acceptable use",
    points: [
      "Users may not use the service to upload malware, infringing content, or files intended to disrupt the platform.",
      "Automated abuse, credential sharing, scraping of private customer data, and attempts to bypass entitlement controls are prohibited.",
      "ScoreTransposer may suspend or terminate access when misuse, security risk, or legal exposure is detected.",
    ],
  },
] as const;

export default function TermsPage() {
  return (
    <section className="public-container public-page stack-xl">
      <Panel variant="surface" className="stack-lg">
        <SectionIntro
          eyebrow="Terms of service"
          title="Launch-day service terms for ScoreTransposer"
          body="These terms define the current commercial and operational boundaries for scoretransposer.com, including activation-gated access, draft-result delivery, and user responsibilities."
          titleAs="h1"
          largeBody
        />
        <div className="button-row">
          <StatusPill tone="cyan">Last updated {legalLastUpdated}</StatusPill>
          <Link href="/privacy" className="public-button secondary">
            View privacy policy
          </Link>
        </div>
      </Panel>

      <div className="stack-lg">
        {sections.map((section) => (
          <Panel key={section.title} variant="glass" className="stack-md">
            <h2 className="section-title">{section.title}</h2>
            <div className="stack-sm">
              {section.points.map((point) => (
                <p key={point} className="body-copy">
                  {point}
                </p>
              ))}
            </div>
          </Panel>
        ))}
      </div>

      <Panel variant="sunken" className="stack-md">
        <h2 className="card-title">Operational reminder</h2>
        <p className="body-copy">
          Keep the public terms aligned with the exact activation, refund, support, and delivery practices you execute offline or in external sales channels.
        </p>
        <p className="helper-copy">
          If the commercial model changes, update this page and your onboarding flow before the new offer is sold.
        </p>
      </Panel>
    </section>
  );
}
