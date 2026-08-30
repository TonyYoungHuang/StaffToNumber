"use client";

import Link from "next/link";
import React from "react";
import { APP_ROUTES } from "@score/shared";
import { ArrowNorthEastIcon, CheckSealIcon, SparkIcon, VaultIcon } from "@score/ui";
import type { AuthMessageCatalog } from "../lib/auth-messages";
import { PUBLIC_SITE_URL } from "../lib/support";

export function AuthShell({
  title,
  description,
  copy,
  children,
}: {
  title: string;
  description: string;
  copy: AuthMessageCatalog["shell"];
  children: React.ReactNode;
}) {
  return (
    <section className="container page-shell">
      <div className="auth-layout">
        <div className="hero-copy">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 className="display-title">{title}</h1>
          <p className="body-copy large">{description}</p>
          <div className="kicker-line" />
          <p className="editorial-quote">{copy.quote}</p>
          <div className="auth-proof">
            <video
              src={`${PUBLIC_SITE_URL.replace(/\/$/, "")}/product/demo-score-to-audio.mp4`}
              poster={`${PUBLIC_SITE_URL.replace(/\/$/, "")}/product/feature-score-to-audio-real.png`}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label={copy.proofTitle}
            />
            <div><strong>{copy.proofTitle}</strong><span>{copy.proofBody}</span></div>
          </div>
          <div className="auth-copy-points">
            <div className="editorial-point">
              <span className="info-icon">
                <VaultIcon width={20} height={20} />
              </span>
              <div>
                <strong>{copy.accessTitle}</strong>
                <p className="helper-copy">{copy.accessBody}</p>
              </div>
            </div>
            <div className="editorial-point">
              <span className="info-icon tertiary">
                <SparkIcon width={20} height={20} />
              </span>
              <div>
                <strong>{copy.scopeTitle}</strong>
                <p className="helper-copy">{copy.scopeBody}</p>
              </div>
            </div>
            <div className="editorial-point">
              <span className="info-icon">
                <CheckSealIcon width={20} height={20} />
              </span>
              <div>
                <strong>{copy.draftTitle}</strong>
                <p className="helper-copy">{copy.draftBody}</p>
              </div>
            </div>
          </div>
          <div className="button-row">
            <Link href={APP_ROUTES.home} className="button button-secondary">
              {copy.back}
            </Link>
            <Link href={`${APP_ROUTES.scores}/new/scan`} className="button button-tertiary">
              {copy.preview}
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
