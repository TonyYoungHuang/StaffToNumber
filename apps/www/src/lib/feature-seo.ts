import { createHash } from "node:crypto";
import type { PlatformFeaturePage } from "./platform-feature-pages";

export const requiredFeatureSchemas = ["WebPage", "BreadcrumbList", "HowTo", "FAQPage", "SoftwareApplication"] as const;

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
    reviewerRole: "product_owner" | "product_operations" | null;
    approvalBasis: string | null;
    generatedWithAi: boolean;
  };
};

const commonSchemas: FeatureSchemaType[] = [...requiredFeatureSchemas];

function featureProductOwnerApproval(approvalBasis: string): FeatureSeoRecord["review"] {
  return {
    status: "approved",
    factsReviewedAt: "2026-08-28",
    approvedBy: "ScoreTransposer product owner",
    reviewerRole: "product_owner",
    approvalBasis: `Product-owner approval recorded on 2026-08-28 after review of the 2026-08-25 AI evidence precheck: ${approvalBasis}`,
    generatedWithAi: true,
  };
}

function hasCompleteHumanApproval(record: FeatureSeoRecord | null | undefined) {
  return Boolean(
    record
    && record.review.status === "approved"
    && record.review.factsReviewedAt
    && record.review.approvedBy
    && record.review.reviewerRole
    && record.review.approvalBasis,
  );
}

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
      alt: "Structured Jianpu preview generated from the current score revision",
      evidence: "Captured from the running product's staff-to-Jianpu panel; it demonstrates the generated Jianpu preview, not recognition accuracy.",
      capturedAt: "2026-08-19",
    },
    example: {
      input: "MusicXML: C4 D4 E4 G4 in C major and 4/4",
      output: "1=C 4/4 | 1 2 3 5 |",
      notes: "Pitch, duration, key and measure data are read from Score JSON rather than PDF text.",
    },
    review: featureProductOwnerApproval("Checked the existing Jianpu preview capture, Score JSON conversion path, native example, and the boundary that conversion starts from a reviewed structured score."),
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
      capturedAt: "2026-08-19",
    },
    example: {
      input: "1=C 4/4 | 1 2 3 5 |",
      output: "MusicXML and Score JSON containing C4 D4 E4 G4",
      notes: "The structured Jianpu parser creates the same revision model used by the editor and exports.",
    },
    review: featureProductOwnerApproval("Checked the existing structured Jianpu import capture, parser-backed example, and the boundary that free-form or ambiguous numbered notation may require correction."),
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
      capturedAt: "2026-08-19",
    },
    example: {
      input: "C major, C4 D4 E4 G4, transpose by two semitones",
      output: "D major, D4 E4 F-sharp4 A4, stored as a new revision",
      notes: "The current implementation supports semitone, target-key and transposing-instrument modes.",
    },
    review: featureProductOwnerApproval("Checked the existing transpose controls, deterministic two-semitone example, revision creation path, and range or accidental-spelling limits shown in the product."),
  },
  "score-editor": {
    searchIntent: "Create, correct, and collaboratively edit structured sheet music in a browser.",
    keywordCluster: "online sheet music maker, notation editor, and collaborative score editor",
    primaryKeyword: "sheet music editor",
    relatedSlugs: ["pdf-score-scanner", "pdf-to-musicxml", "transpose-score", "musicxml-midi"],
    schemas: commonSchemas,
    screenshot: {
      src: "/product/feature-score-editor-real.png",
      width: 1425,
      height: 891,
      alt: "Online sheet music maker and collaborative notation editor with revision and correction tools",
      evidence: "Captured from the running score workspace after importing test MusicXML.",
      capturedAt: "2026-08-19",
    },
    example: {
      input: "Selected event: E4 quarter note in the single reference measure",
      output: "Corrected event: F-sharp4 quarter note with an accent in a separate revision",
      notes: "This deterministic download demonstrates one structured edit; selection, insertion, deletion, drag editing and properties operate on Score JSON.",
    },
    review: featureProductOwnerApproval("Checked the existing measure editor capture and structured edit tests; approval is limited to correction, event editing, revisions, and collaboration rather than a MuseScore-scale engraving promise."),
  },
  "score-to-audio": {
    searchIntent: "Convert a sheet music project into configurable playback, MP3, WAV, and practice feedback.",
    keywordCluster: "sheet music to audio, MP3 export, player, and music practice app",
    primaryKeyword: "sheet music to mp3",
    relatedSlugs: ["musicxml-midi", "transpose-score", "teaching"],
    schemas: commonSchemas,
    screenshot: {
      src: "/product/feature-score-to-audio-real.png",
      width: 1425,
      height: 891,
      alt: "Sheet music to audio converter with online player, tempo, loop, part controls, and MP3 export",
      evidence: "Captured from the product workspace that owns playback and export controls.",
      capturedAt: "2026-08-19",
    },
    example: {
      input: "One-measure MusicXML reference containing four quarter notes",
      output: "Browser practice playback plus a deterministic 3.2-second WAV reference; a separate MIDI reference is also available",
      notes: "The public WAV is a synthetic format reference. Production WAV or MP3 quality depends on FluidSynth, a SoundFont and ffmpeg.",
    },
    review: featureProductOwnerApproval("Checked the existing playback and export controls plus deterministic audio examples; server WAV or MP3 quality remains bounded by FluidSynth, SoundFont, and ffmpeg availability."),
  },
  "audio-to-score": {
    searchIntent: "Create an editable draft score from an owned or permitted audio recording.",
    keywordCluster: "audio to MIDI and sheet music transcription",
    primaryKeyword: "audio to sheet music",
    relatedSlugs: ["score-editor", "musicxml-midi", "score-to-audio"],
    schemas: commonSchemas,
    screenshot: {
      src: "/product/feature-audio-to-score-real.png",
      width: 885,
      height: 885,
      alt: "Shared score-job queue used for OMR, audio transcription, and export processing",
      evidence: "Captured from the running product's unified job queue. The image proves the reviewable job workflow, while Basic Pitch output quality remains experimental and is not evidenced by this screenshot.",
      capturedAt: "2026-08-19",
    },
    example: {
      input: "Permitted mono WAV or MP3 melody recording",
      output: "Basic Pitch MIDI candidate and first-pass editable Score JSON",
      notes: "Polyphony, reverb and noisy accompaniment can reduce accuracy and require correction.",
    },
    review: featureProductOwnerApproval("Checked the existing unified job-queue capture and Basic Pitch worker path; the page remains bounded to an experimental candidate flow using permitted sources and human correction."),
  },
  "musicxml-midi": {
    searchIntent: "Edit MusicXML and convert portable score formats into MIDI, PDF, SVG, PNG, or project backups.",
    keywordCluster: "online MusicXML editor, MIDI conversion, and notation export",
    primaryKeyword: "MusicXML editor",
    relatedSlugs: ["score-editor", "pdf-to-musicxml", "staff-to-jianpu", "score-to-audio"],
    schemas: commonSchemas,
    screenshot: {
      src: "/product/feature-musicxml-midi-real.png",
      width: 1425,
      height: 891,
      alt: "Score project export center with MusicXML files and the structured visual editor",
      evidence: "Captured from a real project export center and editor. Format availability is verified separately by native example and export-path tests rather than inferred from the screenshot alone.",
      capturedAt: "2026-08-19",
    },
    example: {
      input: "MusicXML, MXL, MIDI or Score JSON snapshot",
      output: "Normalized revision with MusicXML, MIDI and Score JSON downloads",
      notes: "MIDI engraving is a structural draft and remains reviewable in the editor.",
    },
    review: featureProductOwnerApproval("Checked the existing export-center capture, native MusicXML and MIDI examples, and export implementation boundaries; MIDI engraving remains a reviewable structural draft."),
  },
  "pdf-score-scanner": {
    searchIntent: "Scan a PDF or score image into editable structured notation.",
    keywordCluster: "online sheet music scanner and optical music recognition",
    primaryKeyword: "sheet music scanner",
    relatedSlugs: ["pdf-to-musicxml", "score-editor", "musicxml-midi", "staff-to-jianpu"],
    schemas: commonSchemas,
    screenshot: {
      src: "/product/feature-pdf-score-scanner-real.png",
      width: 1425,
      height: 891,
      alt: "Sheet music scanner workspace comparing a PDF or image with recognized notation",
      evidence: "Captured from the product workspace that hosts OMR candidates and correction. The captured candidate is a deterministic fixture, so the image proves the review surface rather than aggregate Audiveris accuracy.",
      capturedAt: "2026-08-19",
    },
    example: {
      input: "Scanned score PDF, PNG, JPEG, WebP or TIFF",
      output: "Audiveris MusicXML candidate with diagnostics, confidence and editable Score JSON",
      notes: "Those are production capabilities. The public input and output downloads are deterministic format references, not a claimed input-output recognition benchmark.",
    },
    review: featureProductOwnerApproval("Checked the existing source-versus-candidate OMR capture, diagnostics, accepted input types, and the explicit import-plus-correction boundary."),
  },
  "pdf-to-musicxml": {
    searchIntent: "Convert a PDF or sheet music image into reviewable, editable MusicXML.",
    keywordCluster: "PDF and image to MusicXML conversion",
    primaryKeyword: "pdf to musicxml",
    relatedSlugs: ["pdf-score-scanner", "score-editor", "musicxml-midi"],
    schemas: commonSchemas,
    screenshot: {
      src: "/product/score-workspace-real.png",
      width: 1265,
      height: 2437,
      alt: "Structured score workspace showing a rendered MusicXML revision and practice controls",
      evidence: "Captured from an existing product score workspace. The separate OMR capture uses a deterministic fixture and demonstrates the correction workflow, not a recognition-accuracy percentage.",
      capturedAt: "2026-08-19",
    },
    example: {
      input: "Sheet music PDF, PNG, JPEG, WebP or TIFF",
      output: "Reviewable MusicXML candidate and editable Score JSON revision",
      notes: "The public downloads are deterministic format references. In production, the source and OMR diagnostics remain attached so each real candidate can be corrected before export.",
    },
    review: featureProductOwnerApproval("Checked the existing structured workspace capture, MusicXML example, OMR diagnostics workflow, and the boundary that conversion yields a candidate rather than guaranteed publication-ready notation."),
  },
  teaching: {
    searchIntent: "Manage a music class, assign score-based practice, collect performances, and return structured feedback.",
    keywordCluster: "music notation software for students and music education platform",
    primaryKeyword: "music notation software for students",
    relatedSlugs: ["score-to-audio", "score-editor", "pricing"],
    schemas: commonSchemas,
    screenshot: {
      src: "/product/feature-teaching-real.png",
      width: 1425,
      height: 891,
      alt: "Teacher score-assignment form with due date, practice settings, and rubric controls",
      evidence: "Captured from the running assignment workflow. Classroom and School remain Beta and are not presented as a completed institution-wide LMS replacement.",
      capturedAt: "2026-08-19",
    },
    example: {
      input: "Score revision, assignment instructions, due date and practice settings",
      output: "Student submission, timed feedback, rubric result and progress record",
      notes: "Classroom management exists separately from project-level share and assignment controls.",
    },
    review: featureProductOwnerApproval("Checked the existing assignment capture and teaching repository tests; the published scope remains Beta for classes, assignments, submissions, feedback, and progress records."),
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
      alt: "Account billing page showing plan quotas, subscription state, and billing management controls",
      evidence: "Captured from the running billing surface. It demonstrates quota and subscription-state UI; production checkout is configuration-gated and is enabled only after the live payment loop is verified.",
      capturedAt: "2026-08-19",
    },
    example: {
      input: "Account, configured checkout region and required export capability",
      output: "Entitled score workspace with premium rendering and project history",
      notes: "Displayed price and currency remain deployment configuration values.",
    },
    review: featureProductOwnerApproval("Checked the existing billing capture, configured plan catalog, quota tests, and the explicit boundary that production checkout is enabled only after Live verification."),
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
    if (!hasCompleteHumanApproval(record)) {
      add({
        slug: page.slug,
        field: "review",
        severity: "warning",
        message: `Human review state is ${record.review.status}.`,
        suggestion: "Fact-check product claims and examples, then record the date, reviewer role, evidence basis, and approver before production publication.",
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
  const approved = pages.filter((page) => hasCompleteHumanApproval(records[page.slug])).length;
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
