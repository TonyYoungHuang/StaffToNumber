import * as React from "react";
import type { SonataTone } from "./tokens";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Panel({
  variant = "surface",
  className,
  children,
}: {
  variant?: "surface" | "glass" | "sunken";
  className?: string;
  children: React.ReactNode;
}) {
  const baseClass = variant === "glass" ? "glass-panel" : variant === "sunken" ? "sunken-panel" : "surface-panel";
  return <div className={cn(baseClass, className)}>{children}</div>;
}

export function SectionIntro({
  eyebrow,
  title,
  body,
  className,
  titleAs = "h2",
  largeBody = false,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  className?: string;
  titleAs?: "h1" | "h2" | "h3";
  largeBody?: boolean;
}) {
  const TitleTag = titleAs;
  return (
    <div className={cn("stack-md", className)}>
      <p className="eyebrow">{eyebrow}</p>
      <TitleTag className={titleAs === "h1" ? "display-title" : "section-title"}>{title}</TitleTag>
      {body ? <p className={cn("body-copy", largeBody && "large")}>{body}</p> : null}
    </div>
  );
}

export function FeatureCard({
  icon,
  title,
  body,
  tone,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  tone?: "tertiary";
  className?: string;
}) {
  return (
    <div className={cn("feature-card stack-md", className)}>
      <span className={cn("info-icon", tone === "tertiary" && "tertiary")}>{icon}</span>
      <h3 className="card-title">{title}</h3>
      <p className="body-copy">{body}</p>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  body,
  className,
}: {
  label: string;
  value: React.ReactNode;
  body: string;
  className?: string;
}) {
  return (
    <div className={cn("metric-card", className)}>
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      <p className="helper-copy">{body}</p>
    </div>
  );
}

export function StatusPill({
  tone,
  children,
  icon,
  className,
}: {
  tone: SonataTone;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return <span className={cn("status-chip", `tone-${tone}`, className)}>{icon}{children}</span>;
}

export function WorkflowStep({
  step,
  title,
  body,
  className,
}: {
  step: string;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <div className={cn("workflow-item", className)}>
      <span className="workflow-number">{step}</span>
      <div className="stack-sm">
        <p className="workflow-title">{title}</p>
        <p className="item-copy">{body}</p>
      </div>
    </div>
  );
}

export function PreviewStaffGraphic() {
  return (
    <div className="preview-staff" aria-hidden="true">
      <div className="staff-line" />
      <div className="staff-line" />
      <div className="staff-line" />
      <div className="staff-line" />
      <div className="staff-line" />
      <span className="staff-note note-a" />
      <span className="staff-note note-b" />
      <span className="staff-note note-c" />
    </div>
  );
}

export { cn };
