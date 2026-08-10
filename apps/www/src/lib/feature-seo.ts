import { createHash } from "node:crypto";
import type { PlatformFeaturePage } from "./platform-feature-pages";

export const requiredFeatureSchemas = ["BreadcrumbList", "HowTo", "FAQPage", "SoftwareApplication"] as const;

export type FeatureSchemaType = (typeof requiredFeatureSchemas)[number];
export type FeatureSeoReviewStatus = "draft" | "in_review" | "approved";

export type FeatureSeoRecord = {
  searchIntent: string;
  keywordCluster: string;
  primaryKeyword: string;
  relatedSlugs: string[];
  schemas: FeatureSchemaType[];
  screenshot: {
    src: string;
    width: number;
    height: number;
    alt: string;
    evidence: string;
    capturedAt: string;
  };
  example: {
    input: string;
    output: string;
    notes: string;
  };
  review: {
    status: FeatureSeoReviewStatus;
    factsReviewedAt: string | null;
    approvedBy: string | null;
    generatedWithAi: boolean;
  };
};

const commonSchemas: FeatureSchemaType[] = [...requiredFeatureSchemas];

export const featureSeoRecords: Record<string, FeatureSeoRecord> = {
  "staff-to-jianpu": {
    searchIntent: "Convert an existing staff score into readable numbered notation.",
    keywordCluster: "staff notation to Jianpu conversion",
    primaryKeyword: "staff to jianpu",
    relatedSlugs: ["jianpu-to-staff", "musicxml-midi", "score-editor"],
    schemas: commonSchemas,
    screenshot: {
      src: "/product/feature-staff-to-jianpu-real.png",
      width: 1425,
      height: 891,
      alt: "Rendered five-line staff preview used as the source for staff-to-Jianpu conversion",
      evidence: "Captured from a local MusicXML score project in the running product.",
      capturedAt: "2026-07-15",
    },
    example: {
      input: "MusicXML: C4 D4 E4 G4 in C major and 4/4",
      output: "1=C 4/4 | 1 2 3 5 |",
      notes: "Pitch, duration, key and measure data are read from Score JSON rather than PDF text.",
    },
    review: { status: "in_review", factsReviewedAt: null, approvedBy: null, generatedWithAi: true },
  },
  "jianpu-to-staff": {
    searchIntent: "Turn structured numbered notation into an editable five-line staff score.",
    keywordCluster: "Jianpu to staff notation conversion",
    primaryKeyword: "jianpu to staff",
    relatedSlugs: ["staff-to-jianpu", "musicxml-midi", "score-editor"],
    schemas: commonSchemas,
    screenshot: {
      src: "/product/feature-jianpu-to-staff-real.png",
      width: 885,
      height: 885,
      alt: "Five-line staff rendered from a structured Jianpu score project",
      evidence: "Captured from the product's OSMD MusicXML preview.",
      capturedAt: "2026-07-15",
    },
    example: {
      input: "1=C 4/4 | 1 2 3 5 |",
      output: "MusicXML and Score JSON containing C4 D4 E4 G4",
      notes: "The structured Jianpu parser creates the same revision model used by the editor and exports.",
    },
    review: { status: "in_review", factsReviewedAt: null, approvedBy: null, generatedWithAi: true },
  },
  "transpose-score": {
    searchIntent: "Transpose a structured score to a target key or instrument transposition.",
    keywordCluster: "online sheet music transposition",
    primaryKeyword: "transpose sheet music",
    relatedSlugs: ["score-editor", "musicxml-midi", "score-to-audio"],
    schemas: commonSchemas,
    screenshot: {
      src: "/product/feature-transpose-score-real.png",
      width: 1425,
      height: 891,
      alt: "Score workspace where transposition creates a new editable score revision",
      evidence: "Captured from the running score project workspace and revision workflow.",
      capturedAt: "2026-07-15",
    },
    example: {
      input: "C major, C4 D4 E4 G4, transpose by two semitones",
      output: "D major, D4 E4 F-sharp4 A4, stored as a new revision",
      notes: "The current implementation supports semitone, target-key and transposing-instrument modes.",
    },
    review: { status: "in_review", factsReviewedAt: null, approvedBy: null, generatedWithAi: true },
  },
  "score-editor": {
    searchIntent: "Correct recognition mistakes and edit structured notation in the browser.",
    keywordCluster: "online staff notation correction editor",
    primaryKeyword: "online score editor",
    relatedSlugs: ["pdf-score-scanner", "transpose-score", "musicxml-midi"],
    schemas: commonSchemas,
    screenshot: {
      src: "/product/feature-score-editor-real.png",
      width: 1425,
      height: 891,
      alt: "Visual score editor with rendered notation, revision controls and correction tools",
      evidence: "Captured from the running score workspace after importing test MusicXML.",
      capturedAt: "2026-07-15",
    },
    example: {
      input: "Selected event: E4 quarter note in measure 2",
      output: "Corrected event: F-sharp4 eighth note in a new revision",
      notes: "Selection, insertion, deletion, drag editing and structured properties operate on Score JSON.",
    },
    review: { status: "in_review", factsReviewedAt: null, approvedBy: null, generatedWithAi: true },
  },
  "score-to-audio": {
    searchIntent: "Generate configurable rehearsal audio and MIDI from a sheet music project.",
    keywordCluster: "sheet music playback and practice audio",
    primaryKeyword: "score to audio",
    relatedSlugs: ["musicxml-midi", "transpose-score", "teaching"],
    schemas: commonSchemas,
    screenshot: {
      src: "/product/feature-score-to-audio-real.png",
      width: 1425,
      height: 891,
      alt: "Score workspace with playback, part controls and queued audio export jobs",
      evidence: "Captured from the product workspace that owns playback and export controls.",
      capturedAt: "2026-07-15",
    },
    example: {
      input: "Piano Score JSON at 96 BPM with a four-measure loop",
      output: "Browser practice playback plus reproducible MIDI, WAV or MP3 export",
      notes: "High-quality server audio requires FluidSynth, a SoundFont and ffmpeg.",
    },
    review: { status: "in_review", factsReviewedAt: null, approvedBy: null, generatedWithAi: true },
  },
  "audio-to-score": {
    searchIntent: "Create an editable draft score from an owned or permitted audio recording.",
    keywordCluster: "audio to MIDI and sheet music transcription",
    primaryKeyword: "audio to score",
    relatedSlugs: ["score-editor", "musicxml-midi", "score-to-audio"],
    schemas: commonSchemas,
    screenshot: {
      src: "/product/feature-audio-to-score-real.png",
      width: 885,
      height: 885,
      alt: "Score project workspace used to review an audio transcription candidate",
      evidence: "Captured from the candidate and revision workspace used after transcription.",
      capturedAt: "2026-07-15",
    },
    example: {
      input: "Permitted mono WAV or MP3 melody recording",
      output: "Basic Pitch MIDI candidate and first-pass editable Score JSON",
      notes: "Polyphony, reverb and noisy accompaniment can reduce accuracy and require correction.",
    },
    review: { status: "in_review", factsReviewedAt: null, approvedBy: null, generatedWithAi: true },
  },
  "musicxml-midi": {
    searchIntent: "Import, normalize and export portable structured score formats.",
    keywordCluster: "MusicXML MIDI score conversion",
    primaryKeyword: "MusicXML converter",
    relatedSlugs: ["score-editor", "staff-to-jianpu", "score-to-audio"],
    schemas: commonSchemas,
    screenshot: {
      src: "/product/feature-musicxml-midi-real.png",
      width: 1425,
      height: 891,
      alt: "MusicXML score rendered in the product before MIDI and Score JSON export",
      evidence: "Captured from a real MusicXML import and OSMD render in the local product.",
      capturedAt: "2026-07-15",
    },
    example: {
      input: "MusicXML, MXL, MIDI or Score JSON snapshot",
      output: "Normalized revision with MusicXML, MIDI and Score JSON downloads",
      notes: "MIDI engraving is a structural draft and remains reviewable in the editor.",
    },
    review: { status: "in_review", factsReviewedAt: null, approvedBy: null, generatedWithAi: true },
  },
  "pdf-score-scanner": {
    searchIntent: "Scan a PDF or score image into editable structured notation.",
    keywordCluster: "PDF image optical music recognition",
    primaryKeyword: "pdf score scanner",
    relatedSlugs: ["score-editor", "musicxml-midi", "staff-to-jianpu"],
    schemas: commonSchemas,
    screenshot: {
      src: "/product/feature-pdf-score-scanner-real.png",
      width: 1425,
      height: 891,
      alt: "OMR review workspace for comparing a source scan with recognized notation",
      evidence: "Captured from the product workspace that hosts OMR candidates and correction.",
      capturedAt: "2026-07-15",
    },
    example: {
      input: "Scanned score PDF, PNG, JPEG, WebP or TIFF",
      output: "Audiveris MusicXML candidate with diagnostics, confidence and editable Score JSON",
      notes: "Recognition is an import-and-correct workflow; it is not advertised as universally perfect.",
    },
    review: { status: "in_review", factsReviewedAt: null, approvedBy: null, generatedWithAi: true },
  },
  teaching: {
    searchIntent: "Assign a score, collect a performance and return structured teacher feedback.",
    keywordCluster: "online music teaching assignments",
    primaryKeyword: "music teacher assignments",
    relatedSlugs: ["score-to-audio", "score-editor", "pricing"],
    schemas: commonSchemas,
    screenshot: {
      src: "/product/feature-teaching-real.png",
      width: 1425,
      height: 891,
      alt: "Teacher score workspace with sharing, assignment and submission review tools",
      evidence: "Captured from the score project used as the source for teaching workflows.",
      capturedAt: "2026-07-15",
    },
    example: {
      input: "Score revision, assignment instructions, due date and practice settings",
      output: "Student submission, timed feedback, rubric result and progress record",
      notes: "Classroom management exists separately from project-level share and assignment controls.",
    },
    review: { status: "in_review", factsReviewedAt: null, approvedBy: null, generatedWithAi: true },
  },
  pricing: {
    searchIntent: "Understand product access, paid boundaries and supported purchase paths.",
    keywordCluster: "sheet music platform pricing",
    primaryKeyword: "score transposer pricing",
    relatedSlugs: ["staff-to-jianpu", "score-editor", "teaching"],
    schemas: commonSchemas,
    screenshot: {
      src: "/product/feature-pricing-real.png",
      width: 1425,
      height: 891,
      alt: "Authenticated score workspace unlocked by an active product entitlement",
      evidence: "Captured from the running product experience users receive after access is granted.",
      capturedAt: "2026-07-15",
    },
    example: {
      input: "Account, configured checkout region and required export capability",
      output: "Entitled score workspace with premium rendering and project history",
      notes: "Displayed price and currency remain deployment configuration values.",
    },
    review: { status: "in_review", factsReviewedAt: null, approvedBy: null, generatedWithAi: true },
  },
};

export function getFeatureSeoRecord(slug: string) {
  return featureSeoRecords[slug] ?? null;
}

export type SeoAuditSeverity = "error" | "warning" | "info";

export type SeoAuditIssue = {
  slug: string;
  field: string;
  severity: SeoAuditSeverity;
  message: string;
  suggestion: string;
};

export type FeatureSeoAudit = {
  generatedAt: string;
  score: number;
  publishReady: boolean;
  issues: SeoAuditIssue[];
  metrics: {
    pages: number;
    errors: number;
    warnings: number;
    approved: number;
    uniqueTitles: number;
    uniqueDescriptions: number;
    uniqueCanonicals: number;
  };
};

export type FeatureSeoManifest = {
  version: 1;
  generatedAt: string;
  pages: Array<{
    slug: string;
    contentHash: string;
    title: string;
    description: string;
    canonical: string;
    primaryKeyword: string;
    evidence: {
      screenshot: FeatureSeoRecord["screenshot"];
      example: FeatureSeoRecord["example"];
    };
  }>;
};

function duplicateValues(values: Array<{ slug: string; value: string }>) {
  const occurrences = new Map<string, string[]>();
  for (const item of values) {
    const key = item.value.trim().toLocaleLowerCase();
    occurrences.set(key, [...(occurrences.get(key) ?? []), item.slug]);
  }
  return occurrences;
}

export function auditFeatureSeo(
  pages: PlatformFeaturePage[],
  records: Record<string, FeatureSeoRecord> = featureSeoRecords,
  generatedAt = new Date().toISOString(),
): FeatureSeoAudit {
  const issues: SeoAuditIssue[] = [];
  const add = (issue: SeoAuditIssue) => issues.push(issue);
  const pageSlugs = new Set(pages.map((page) => page.slug));

  for (const page of pages) {
    const record = records[page.slug];
    const fullTitle = `${page.title} | ScoreTransposer`;

    if (fullTitle.length < 30 || fullTitle.length > 60) {
      add({
        slug: page.slug,
        field: "title",
        severity: "warning",
        message: `Title length is ${fullTitle.length}; the target range is 30-60 characters.`,
        suggestion: `Keep the primary query near the front and revise to roughly ${fullTitle.length > 60 ? "55" : "40"} characters.`,
      });
    }
    if (page.description.length < 120 || page.description.length > 165) {
      add({
        slug: page.slug,
        field: "description",
        severity: "warning",
        message: `Description length is ${page.description.length}; the target range is 120-165 characters.`,
        suggestion: "State the input, useful outcome and product boundary in one unique search snippet.",
      });
    }
    if (page.canonical !== `/${page.slug}`) {
      add({ slug: page.slug, field: "canonical", severity: "error", message: "Canonical does not match the feature route.", suggestion: `Use /${page.slug}.` });
    }
    if (!record) {
      add({ slug: page.slug, field: "governance", severity: "error", message: "SEO governance record is missing.", suggestion: "Add intent, evidence, schema, links and review state before publication." });
      continue;
    }
    if (!page.title.toLocaleLowerCase().includes(record.primaryKeyword.toLocaleLowerCase()) && !page.description.toLocaleLowerCase().includes(record.primaryKeyword.toLocaleLowerCase())) {
      add({ slug: page.slug, field: "primaryKeyword", severity: "warning", message: `Primary keyword \"${record.primaryKeyword}\" is absent from the title and description.`, suggestion: "Use the primary query naturally in the title or description." });
    }
    for (const schema of requiredFeatureSchemas) {
      if (!record.schemas.includes(schema)) {
        add({ slug: page.slug, field: "structuredData", severity: "error", message: `${schema} JSON-LD is not declared.`, suggestion: `Add and validate ${schema} structured data.` });
      }
    }
    if (record.relatedSlugs.length < 2) {
      add({ slug: page.slug, field: "internalLinks", severity: "error", message: "Fewer than two contextual internal links are configured.", suggestion: "Link to at least two adjacent user workflows." });
    }
    for (const relatedSlug of record.relatedSlugs) {
      if (!pageSlugs.has(relatedSlug)) {
        add({ slug: page.slug, field: "internalLinks", severity: "error", message: `Related route /${relatedSlug} does not exist.`, suggestion: "Remove the broken relation or add the intended feature route." });
      }
    }
    if (!record.screenshot.src || !record.screenshot.evidence || !record.screenshot.capturedAt) {
      add({ slug: page.slug, field: "screenshot", severity: "error", message: "Product screenshot evidence is incomplete.", suggestion: "Attach a real current-state screenshot with capture date and evidence note." });
    }
    if (!record.example.input || !record.example.output || !record.example.notes) {
      add({ slug: page.slug, field: "example", severity: "error", message: "Input/output case evidence is incomplete.", suggestion: "Add a reproducible input, output and boundary note." });
    }
    if (record.review.status !== "approved" || !record.review.factsReviewedAt || !record.review.approvedBy) {
      add({
        slug: page.slug,
        field: "review",
        severity: "warning",
        message: `Human review state is ${record.review.status}.`,
        suggestion: "Fact-check product claims and examples, then record reviewer and approval date before production publication.",
      });
    }
  }

  for (const [field, values] of [
    ["title", pages.map((page) => ({ slug: page.slug, value: page.title }))],
    ["description", pages.map((page) => ({ slug: page.slug, value: page.description }))],
    ["canonical", pages.map((page) => ({ slug: page.slug, value: page.canonical }))],
  ] as const) {
    for (const slugs of duplicateValues(values).values()) {
      if (slugs.length > 1) {
        for (const slug of slugs) {
          add({ slug, field, severity: "error", message: `Duplicate ${field} is shared by: ${slugs.join(", ")}.`, suggestion: `Write a unique ${field} for this search intent.` });
        }
      }
    }
  }

  for (const slugs of duplicateValues(pages.map((page) => ({ slug: page.slug, value: records[page.slug]?.screenshot.src ?? "" }))).values()) {
    if (slugs.length > 1) {
      for (const slug of slugs) {
        add({ slug, field: "screenshot", severity: "error", message: `Product screenshot is reused by: ${slugs.join(", ")}.`, suggestion: "Capture a current product state that directly demonstrates this feature." });
      }
    }
  }

  for (const slug of Object.keys(records)) {
    if (!pageSlugs.has(slug)) {
      add({ slug, field: "governance", severity: "error", message: "SEO record has no matching feature route.", suggestion: "Add the intended route or remove the orphan governance record." });
    }
  }

  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  const approved = pages.filter((page) => records[page.slug]?.review.status === "approved").length;
  const score = Math.max(0, Math.round(100 - errors * 8 - warnings * 2));

  return {
    generatedAt,
    score,
    publishReady: errors === 0 && warnings === 0,
    issues,
    metrics: {
      pages: pages.length,
      errors,
      warnings,
      approved,
      uniqueTitles: duplicateValues(pages.map((page) => ({ slug: page.slug, value: page.title }))).size,
      uniqueDescriptions: duplicateValues(pages.map((page) => ({ slug: page.slug, value: page.description }))).size,
      uniqueCanonicals: duplicateValues(pages.map((page) => ({ slug: page.slug, value: page.canonical }))).size,
    },
  };
}

export function buildSeoSuggestions(page: PlatformFeaturePage, record: FeatureSeoRecord) {
  return {
    title: `${record.primaryKeyword.replace(/\b\w/g, (letter) => letter.toUpperCase())} | ScoreTransposer`,
    description: `${page.description} Review the real input, output, workflow, and current product limits before starting.`,
    internalLinks: record.relatedSlugs.map((slug) => `/${slug}`),
  };
}

export function buildFeatureSeoManifest(
  pages: PlatformFeaturePage[],
  records: Record<string, FeatureSeoRecord> = featureSeoRecords,
  generatedAt = new Date().toISOString(),
): FeatureSeoManifest {
  return {
    version: 1,
    generatedAt,
    pages: pages.flatMap((page) => {
      const record = records[page.slug];
      if (!record) return [];
      const reviewableContent = {
        page,
        seo: {
          searchIntent: record.searchIntent,
          keywordCluster: record.keywordCluster,
          primaryKeyword: record.primaryKeyword,
          relatedSlugs: record.relatedSlugs,
          schemas: record.schemas,
          screenshot: record.screenshot,
          example: record.example,
        },
      };
      return [{
        slug: page.slug,
        contentHash: createHash("sha256").update(JSON.stringify(reviewableContent)).digest("hex"),
        title: page.title,
        description: page.description,
        canonical: page.canonical,
        primaryKeyword: record.primaryKeyword,
        evidence: { screenshot: record.screenshot, example: record.example },
      }];
    }),
  };
}
