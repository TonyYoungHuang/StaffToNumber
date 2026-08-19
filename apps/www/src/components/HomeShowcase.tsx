"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type HomeExample = {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  category: string;
  categoryLabel: string;
  status: string;
  mediaRatio: "wide" | "landscape" | "square";
  inputLabel: string;
  outputLabel: string;
  evidenceLabel: string;
  evidence: string;
  capturedLabel: string;
  capturedAt: string;
  rightsLabel: string;
  reviewLabel: string;
  image: {
    src: string;
    width: number;
    height: number;
    alt: string;
  };
};

export type HomeProcessStage = {
  id: string;
  label: string;
  eyebrow: string;
  title: string;
  body: string;
  note: string;
  image: {
    src: string;
    width: number;
    height: number;
    alt: string;
  };
};

export function HomeExampleGallery({
  examples,
  allLabel,
  openLabel,
  evidenceToggleLabel,
  initialCategory = "all",
}: {
  examples: HomeExample[];
  allLabel: string;
  openLabel: string;
  evidenceToggleLabel: string;
  initialCategory?: string;
}) {
  const categories = useMemo(
    () => Array.from(new Map(examples.map((example) => [example.category, example.categoryLabel])).entries()),
    [examples],
  );
  const validCategories = useMemo(
    () => new Set(["all", ...categories.map(([category]) => category)]),
    [categories],
  );
  const [activeCategory, setActiveCategory] = useState(
    validCategories.has(initialCategory) ? initialCategory : "all",
  );
  const visibleExamples = activeCategory === "all"
    ? examples
    : examples.filter((example) => example.category === activeCategory);

  function selectCategory(category: string) {
    setActiveCategory(category);
    const url = new URL(window.location.href);
    if (category === "all") url.searchParams.delete("case");
    else url.searchParams.set("case", category);
    url.hash = "examples";
    window.history.replaceState(null, "", url);
  }

  useEffect(() => {
    function syncCategoryFromUrl() {
      const category = new URL(window.location.href).searchParams.get("case") ?? "all";
      setActiveCategory(validCategories.has(category) ? category : "all");
    }
    window.addEventListener("popstate", syncCategoryFromUrl);
    return () => window.removeEventListener("popstate", syncCategoryFromUrl);
  }, [validCategories]);

  return (
    <div className="home-gallery-shell">
      <div className="home-filter-row" aria-label={allLabel}>
        <button
          type="button"
          className={activeCategory === "all" ? "is-active" : undefined}
          aria-pressed={activeCategory === "all"}
          onClick={() => selectCategory("all")}
        >
          {allLabel}
        </button>
        {categories.map(([category, label]) => (
          <button
            key={category}
            type="button"
            className={activeCategory === category ? "is-active" : undefined}
            aria-pressed={activeCategory === category}
            onClick={() => selectCategory(category)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="home-example-grid" aria-live="polite">
        {visibleExamples.map((example) => (
          <article key={example.slug} className={`home-example-card is-${example.mediaRatio}`}>
            <Link href={`/${example.slug}`} className="home-example-media" aria-label={`${openLabel}: ${example.title}`}>
              <Image
                src={example.image.src}
                width={example.image.width}
                height={example.image.height}
                alt={example.image.alt}
                sizes={example.mediaRatio === "wide"
                  ? "(max-width: 760px) calc(100vw - 20px), (max-width: 1120px) 92vw, 62vw"
                  : "(max-width: 760px) calc(100vw - 20px), (max-width: 1120px) 45vw, 31vw"}
              />
              <span className="home-example-open" aria-hidden="true">↗</span>
            </Link>
            <div className="home-example-copy">
              <div className="home-example-meta">
                <span>{example.eyebrow}</span>
                <span>{example.status}</span>
              </div>
              <h3>{example.title}</h3>
              <p>{example.summary}</p>
              <dl className="home-example-facts">
                <div><dt>{example.inputLabel}</dt><dd>{example.eyebrow}</dd></div>
                <div><dt>{example.outputLabel}</dt><dd>{example.title}</dd></div>
              </dl>
              <details className="home-example-evidence">
                <summary>{evidenceToggleLabel}<span aria-hidden="true">+</span></summary>
                <dl>
                  <div><dt>{example.evidenceLabel}</dt><dd>{example.evidence}</dd></div>
                  <div><dt>{example.capturedLabel}</dt><dd>{example.capturedAt}</dd></div>
                  <div><dt>{example.rightsLabel}</dt><dd>{example.reviewLabel}</dd></div>
                </dl>
              </details>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function HomeProcessShowcase({ stages }: { stages: HomeProcessStage[] }) {
  const [activeId, setActiveId] = useState(stages[0]?.id ?? "");
  const activeStage = stages.find((stage) => stage.id === activeId) ?? stages[0];

  function activateStage(index: number) {
    const nextStage = stages[(index + stages.length) % stages.length];
    if (!nextStage) return;
    setActiveId(nextStage.id);
    requestAnimationFrame(() => document.getElementById(`process-tab-${nextStage.id}`)?.focus());
  }

  if (!activeStage) return null;

  return (
    <div className="home-process-shell">
      <div className="home-process-tabs" role="tablist" aria-label={activeStage.eyebrow}>
        {stages.map((stage, index) => (
          <button
            key={stage.id}
            id={`process-tab-${stage.id}`}
            type="button"
            role="tab"
            aria-selected={stage.id === activeStage.id}
            aria-controls={`process-panel-${stage.id}`}
            tabIndex={stage.id === activeStage.id ? 0 : -1}
            className={stage.id === activeStage.id ? "is-active" : undefined}
            onClick={() => setActiveId(stage.id)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                activateStage(index + 1);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                activateStage(index - 1);
              } else if (event.key === "Home") {
                event.preventDefault();
                activateStage(0);
              } else if (event.key === "End") {
                event.preventDefault();
                activateStage(stages.length - 1);
              }
            }}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {stage.label}
          </button>
        ))}
      </div>

      <div
        id={`process-panel-${activeStage.id}`}
        className="home-process-panel"
        role="tabpanel"
        aria-labelledby={`process-tab-${activeStage.id}`}
      >
        <div className="home-process-copy">
          <p className="home-kicker">{activeStage.eyebrow}</p>
          <h3>{activeStage.title}</h3>
          <p>{activeStage.body}</p>
          <div className="home-process-note">
            <span aria-hidden="true">✓</span>
            {activeStage.note}
          </div>
        </div>
        <div className="home-process-media">
          <div className="home-media-toolbar" aria-hidden="true">
            <span />
            <span />
            <span />
            <strong>ScoreTransposer</strong>
          </div>
          <Image
            src={activeStage.image.src}
            width={activeStage.image.width}
            height={activeStage.image.height}
            alt={activeStage.image.alt}
            sizes="(max-width: 900px) calc(100vw - 20px), 64vw"
          />
        </div>
      </div>
    </div>
  );
}
