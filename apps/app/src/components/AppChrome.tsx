"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { APP_ROUTES } from "@score/shared";
import { ArrowNorthEastIcon, BrandIcon, DotIcon, sonataCopy } from "@score/ui";

const navItems = [
  { href: APP_ROUTES.home, label: "Studio" },
  { href: APP_ROUTES.dashboard, label: "Account" },
  { href: APP_ROUTES.upload, label: "Uploads" },
  { href: APP_ROUTES.jobs, label: "Jobs" },
];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const primaryHref = pathname === APP_ROUTES.upload ? APP_ROUTES.jobs : APP_ROUTES.upload;
  const primaryLabel = pathname === APP_ROUTES.upload ? "Open Jobs" : "Start Conversion";

  return (
    <div className="app-frame">
      <div className="app-ambient app-ambient-primary" />
      <div className="app-ambient app-ambient-secondary" />
      <div className="app-ambient app-ambient-tertiary" />

      <header className="app-header">
        <div className="container header-inner">
          <Link href={APP_ROUTES.home} className="brand">
            <span className="brand-mark">
              <BrandIcon width={22} height={22} />
            </span>
            <span className="brand-copy">
              <span className="brand-title">The Digital Score</span>
              <span className="brand-caption">{sonataCopy.currentScope} studio</span>
            </span>
          </Link>

          <nav className="nav-links" aria-label="Primary">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={`nav-link${isActive ? " is-active" : ""}`}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="header-actions">
            <span className="status-chip tone-cyan">
              <DotIcon width={10} height={10} />
              Current scope only
            </span>
            <Link href={primaryHref} className="button button-primary">
              {primaryLabel}
              <ArrowNorthEastIcon width={16} height={16} />
            </Link>
          </div>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        <div className="container footer-shell">
          <div>
            <p className="footer-title">The Digital Score</p>
            <p className="footer-copy">
              Current live workflow only supports five-line staff PDF to numbered notation. Reverse conversion, in-browser
              manual editing, and transposition stay in later modules.
            </p>
          </div>
          <div className="footer-links">
            <Link href={APP_ROUTES.register}>Create account</Link>
            <Link href={APP_ROUTES.activate}>Redeem code</Link>
            <Link href={APP_ROUTES.upload}>Upload score</Link>
            <Link href={APP_ROUTES.jobs}>Track jobs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
