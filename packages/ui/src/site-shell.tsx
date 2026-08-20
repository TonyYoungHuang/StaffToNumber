"use client";

import * as React from "react";
import { BrandIcon } from "./icons";

export type SiteShellNavItem = {
  href?: string;
  label: string;
  active?: boolean;
  external?: boolean;
  children?: Array<{
    href: string;
    label: string;
    external?: boolean;
  }>;
};

export type SiteShellAction = {
  href: string;
  label: string;
  tone?: "primary" | "secondary" | "tertiary";
  external?: boolean;
  icon?: React.ReactNode;
  desktopOnly?: boolean;
};

function externalLinkProps(external?: boolean) {
  return external ? { target: "_blank" as const, rel: "noreferrer" } : {};
}

export function SiteShellHeader({
  brandHref,
  brandCaption,
  navItems,
  actions,
  localeControl,
  navLabel,
  openMenuLabel,
  closeMenuLabel,
  linkComponent,
}: {
  brandHref: string;
  brandCaption: string;
  navItems: SiteShellNavItem[];
  actions: SiteShellAction[];
  localeControl: React.ReactNode;
  navLabel: string;
  openMenuLabel: string;
  closeMenuLabel: string;
  linkComponent?: React.ElementType;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const LinkComponent = linkComponent ?? "a";

  return (
    <header className="site-shell-header">
      <div className="site-shell-container site-shell-header-inner">
        <LinkComponent href={brandHref} className="site-shell-brand" onClick={() => setMenuOpen(false)}>
          <span className="site-shell-brand-mark" aria-hidden="true">
            <BrandIcon width={22} height={22} />
          </span>
          <span className="site-shell-brand-copy">
            <span className="site-shell-brand-title">ScoreTransposer</span>
            <span className="site-shell-brand-caption">{brandCaption}</span>
          </span>
        </LinkComponent>

        <nav
          id="site-shell-primary-navigation"
          className={`site-shell-nav${menuOpen ? " is-open" : ""}`}
          aria-label={navLabel}
        >
          {navItems.map((item) => {
            if (item.children?.length) {
              return (
                <details key={item.label} className="site-shell-nav-group">
                  <summary className="site-shell-nav-link">
                    {item.label}<span aria-hidden="true">⌄</span>
                  </summary>
                  <div className="site-shell-nav-menu">
                    {item.children.map((child) => (
                      <LinkComponent
                        key={`${child.label}:${child.href}`}
                        href={child.href}
                        onClick={() => setMenuOpen(false)}
                        {...externalLinkProps(child.external)}
                      >
                        {child.label}
                      </LinkComponent>
                    ))}
                  </div>
                </details>
              );
            }

            return item.href ? (
              <LinkComponent
                key={`${item.label}:${item.href}`}
                href={item.href}
                className={`site-shell-nav-link${item.active ? " is-active" : ""}`}
                onClick={() => setMenuOpen(false)}
                {...externalLinkProps(item.external)}
              >
                {item.label}
              </LinkComponent>
            ) : null;
          })}
        </nav>

        <div className="site-shell-actions">
          <div className="site-shell-locale">{localeControl}</div>
          {actions.map((action) => (
            <LinkComponent
              key={`${action.label}:${action.href}`}
              href={action.href}
              className={`site-shell-button ${action.tone ?? "secondary"}${action.desktopOnly ? " is-desktop-only" : ""}`}
              {...externalLinkProps(action.external)}
            >
              {action.label}
              {action.icon}
            </LinkComponent>
          ))}
          <button
            type="button"
            className="site-shell-menu-toggle"
            aria-controls="site-shell-primary-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? closeMenuLabel : openMenuLabel}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}

export function SiteShellFooter({
  title,
  description,
  links,
  localeControl,
  linkComponent,
}: {
  title: string;
  description: string;
  links: Array<{ href: string; label: string; external?: boolean }>;
  localeControl?: React.ReactNode;
  linkComponent?: React.ElementType;
}) {
  const LinkComponent = linkComponent ?? "a";

  return (
    <footer className="site-shell-footer">
      <div className="site-shell-container site-shell-footer-inner">
        <div className="site-shell-footer-copy">
          <p className="site-shell-footer-title">{title}</p>
          <p>{description}</p>
        </div>
        <div className="site-shell-footer-links">
          {links.map((link) => (
            <LinkComponent key={`${link.label}:${link.href}`} href={link.href} {...externalLinkProps(link.external)}>
              {link.label}
            </LinkComponent>
          ))}
        </div>
        {localeControl ? <div className="site-shell-footer-locale">{localeControl}</div> : null}
      </div>
    </footer>
  );
}
