import type { Metadata } from "next";
import Link from "next/link";
import { Panel, SectionIntro, StatusPill } from "@score/ui";
import { legalLastUpdated, siteConfig } from "../../lib/site";

export const metadata: Metadata = {
  title: `Privacy Policy | ${siteConfig.siteName}`,
  description: "Privacy policy for ScoreTransposer, including account, upload, and result-file handling for the current production release.",
  alternates: {
    canonical: "/privacy",
  },
};

const sections = [
  {
    title: "Information collected",
    points: [
      "Account data such as email address, password hash, activation status, and entitlement dates.",
      "Uploaded PDF files, generated preview text, output PDFs, and draft bundles required to fulfill conversions.",
      "Operational metadata such as upload timestamps, job status, file names, and support contact records.",
    ],
  },
  {
    title: "How data is used",
    points: [
      "To authenticate users, verify paid access, and deliver the requested staff PDF to Jianpu workflow.",
      "To retain source files and generated results for the signed-in user to review and download inside the app.",
      "To investigate failed jobs, respond to support requests, and improve heuristic conversion quality.",
    ],
  },
  {
    title: "Retention and deletion",
    points: [
      "Account and entitlement records are retained while the account remains active and for follow-up support when needed.",
      "Uploaded source files and generated outputs are retained to support download, review, and service troubleshooting.",
      "Deletion requests should be handled through manual support review until a self-service deletion flow is released.",
    ],
  },
  {
    title: "Data sharing",
    points: [
      "Customer files are not sold.",
      "Operational vendors may process traffic, hosting, DNS, storage, logging, and deployment data as part of delivering the service.",
      "Data may be disclosed when required by law or to protect the service from abuse, fraud, or security incidents.",
    ],
  },
  {
    title: "Security baseline",
    points: [
      "Access to the conversion tool is gated by user authentication and activation-based entitlement checks.",
      "Production access should be limited to authorized operators, and secrets should be managed in the hosting platform instead of source control.",
      "Users remain responsible for avoiding unlawful or unauthorized uploads and for verifying musical correctness before publication or performance.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <section className="public-container public-page stack-xl">
      <Panel variant="surface" className="stack-lg">
        <SectionIntro
          eyebrow="Privacy policy"
          title="Current privacy baseline for scoretransposer.com"
          body="This policy describes how ScoreTransposer handles account data, uploaded music PDFs, generated Jianpu outputs, and support records for the current production release."
          titleAs="h1"
          largeBody
        />
        <div className="button-row">
          <StatusPill tone="cyan">Last updated {legalLastUpdated}</StatusPill>
          <Link href="/terms" className="public-button secondary">
            View terms of service
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
        <h2 className="card-title">Contact and policy changes</h2>
        <p className="body-copy">
          If you need account deletion, data export, or policy clarification, route the request through your published support channel and confirm the account identity before taking action.
        </p>
        <p className="helper-copy">
          Material changes to hosting, storage, analytics, payment handling, or account workflows should trigger an immediate policy update before the new flow goes live.
        </p>
      </Panel>
    </section>
  );
}
