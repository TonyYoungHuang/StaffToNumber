import type { ReactNode } from "react";
import Link from "next/link";
import { PRODUCT_NAME } from "@score/shared";
import { ArrowNorthEastIcon, BrandIcon, sonataCopy } from "@score/ui";

export function PublicChrome({ children, appUrl }: { children: ReactNode; appUrl: string }) {
  return (
    <div className="public-frame">
      <div className="public-ambient app-ambient-primary" />
      <div className="public-ambient app-ambient-secondary" />
      <div className="public-ambient app-ambient-tertiary" />

      <header className="public-header">
        <div className="public-container header-inner">
          <Link href="/" className="public-brand">
            <span className="brand-mark">
              <BrandIcon width={22} height={22} />
            </span>
            <span className="brand-copy">
              <span className="brand-title">{sonataCopy.productTitle}</span>
              <span className="brand-caption">{PRODUCT_NAME}</span>
            </span>
          </Link>

          <nav className="public-nav" aria-label="Public">
            <a href="#methods" className="nav-link">
              Methods
            </a>
            <a href="#use-cases" className="nav-link">
              Use Cases
            </a>
            <a href="#faq" className="nav-link">
              FAQ
            </a>
            <Link href="/terms" className="nav-link">
              Terms
            </Link>
          </nav>

          <a href={appUrl} className="public-button primary">
            Open app
            <ArrowNorthEastIcon width={16} height={16} />
          </a>
        </div>
      </header>

      <main className="public-main">{children}</main>

      <footer className="public-footer">
        <div className="public-container footer-shell">
          <div>
            <p className="footer-title">{sonataCopy.productTitle}</p>
            <p className="footer-copy">A Stitch-based public site for the current {sonataCopy.currentScope.toLowerCase()} workflow.</p>
          </div>
          <div className="footer-links">
            <a href="#methods">Methods</a>
            <a href="#use-cases">Use Cases</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <a href={appUrl}>Open app</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
