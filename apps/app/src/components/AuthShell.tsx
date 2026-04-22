import Link from "next/link";
import React from "react";
import { APP_ROUTES } from "@score/shared";
import { ArrowNorthEastIcon, CheckSealIcon, SparkIcon, VaultIcon } from "@score/ui";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="container page-shell">
      <div className="auth-layout">
        <div className="hero-copy">
          <p className="eyebrow">Activation-first access</p>
          <h1 className="display-title">{title}</h1>
          <p className="body-copy large">{description}</p>
          <div className="kicker-line" />
          <p className="editorial-quote">A composed workflow for purchasing access, uploading staff PDFs, and retrieving clean Jianpu output.</p>
          <div className="auth-copy-points">
            <div className="editorial-point">
              <span className="info-icon">
                <VaultIcon width={20} height={20} />
              </span>
              <div>
                <strong>One-year activation access</strong>
                <p className="helper-copy">Users register first, then unlock the studio with an exclusive code from your external sales flow.</p>
              </div>
            </div>
            <div className="editorial-point">
              <span className="info-icon tertiary">
                <SparkIcon width={20} height={20} />
              </span>
              <div>
                <strong>Current production scope is narrow by design</strong>
                <p className="helper-copy">Only five-line staff PDF to numbered notation is live in this build, so the interface stays focused and teachable.</p>
              </div>
            </div>
            <div className="editorial-point">
              <span className="info-icon">
                <CheckSealIcon width={20} height={20} />
              </span>
              <div>
                <strong>Draft-first safety net</strong>
                <p className="helper-copy">When source quality is weak, the pipeline can keep work in draft output instead of pretending confidence.</p>
              </div>
            </div>
          </div>
          <div className="button-row">
            <Link href={APP_ROUTES.home} className="button button-secondary">
              Return to studio
            </Link>
            <Link href={APP_ROUTES.upload} className="button button-tertiary">
              Preview the workflow
              <ArrowNorthEastIcon width={16} height={16} />
            </Link>
          </div>
        </div>

        <div className="auth-card stack-lg">
          {children}
        </div>
      </div>
    </section>
  );
}
