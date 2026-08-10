import { siteConfig } from "./site";

export type PlatformFeaturePage = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  status: "Available" | "Beta" | "Preview";
  releaseRequirement: "core" | "omr" | "audio-transcription" | "teaching" | "checkout";
  updatedAt: string;
  primaryAction: "scores" | "upload" | "checkout";
  canonical: string;
  keywords: string[];
  modules: string[];
  workflow: Array<{
    title: string;
    body: string;
  }>;
  details: Array<{
    title: string;
    body: string;
  }>;
  guardrail: string;
};

export const platformFeaturePages: PlatformFeaturePage[] = [
  {
    slug: "staff-to-jianpu",
    title: "Staff notation to Jianpu converter",
    eyebrow: "Five-line staff to numbered notation",
    description:
      "Use this staff to Jianpu converter to transform structured notation from the same Score JSON model used for editing, playback, transposition, and export.",
    status: "Beta",
    releaseRequirement: "core",
    updatedAt: "2026-08-10",
    primaryAction: "scores",
    canonical: "/staff-to-jianpu",
    keywords: ["staff to jianpu", "five-line staff to numbered notation", "五线谱转简谱"],
    modules: ["Score JSON", "Jianpu generator", "MusicXML preview", "Export center"],
    workflow: [
      {
        title: "Import or scan the score",
        body: "Start from MusicXML, MIDI, Jianpu text, Score JSON, or an OMR candidate created from a PDF/image upload.",
      },
      {
        title: "Generate Jianpu from Score JSON",
        body: "The Jianpu preview is derived from structured notes, keys, meters, lyrics, and chord symbols rather than PDF text.",
      },
      {
        title: "Export or continue editing",
        body: "Download Jianpu text, regenerate staff notation, transpose, or create MIDI/audio practice exports from the same project.",
      },
    ],
    details: [
      {
        title: "Chinese-market notation support",
        body: "The conversion keeps key center, scale degrees, octave marks, duration marks, lyrics, measure grouping, and chord-symbol context visible.",
      },
      {
        title: "Round-trip project model",
        body: "Generated Jianpu belongs to a score project and can be paired with MusicXML, MIDI, rendered images, and Score JSON backups.",
      },
    ],
    guardrail: "This page describes structured staff-to-Jianpu conversion. It does not promise arbitrary Jianpu recognition from scanned PDFs.",
  },
  {
    slug: "jianpu-to-staff",
    title: "Jianpu to staff notation",
    eyebrow: "Numbered notation to five-line staff",
    description:
      "Paste structured Jianpu text into a score project, convert it into internal Score JSON, preview it as staff notation, and export MusicXML or rendered files.",
    status: "Beta",
    releaseRequirement: "core",
    updatedAt: "2026-08-10",
    primaryAction: "scores",
    canonical: "/jianpu-to-staff",
    keywords: ["jianpu to staff", "numbered notation to staff", "简谱转五线谱"],
    modules: ["Structured Jianpu parser", "Score JSON", "MusicXML exporter", "OSMD preview"],
    workflow: [
      {
        title: "Enter structured Jianpu",
        body: "Use the app's Jianpu import form with optional part sections, key, meter, chord, and lyric lines.",
      },
      {
        title: "Create a score project",
        body: "The parser converts Jianpu into Score JSON so the result can be previewed, corrected, transposed, played, and exported.",
      },
      {
        title: "Export staff notation",
        body: "Generate MusicXML immediately and use rendered PDF/SVG/PNG export when MuseScore CLI is configured.",
      },
    ],
    details: [
      {
        title: "Useful for Chinese teaching workflows",
        body: "Teachers can start from numbered notation and gradually create staff notation, MIDI, and practice materials from one source.",
      },
      {
        title: "Structured input first",
        body: "The first version expects typed or pasted Jianpu text; free-form image recognition remains a later import path.",
      },
    ],
    guardrail: "Jianpu-to-staff works from structured text input, not from arbitrary scanned numbered-notation images.",
  },
  {
    slug: "transpose-score",
    title: "Transpose sheet music online",
    eyebrow: "Target key, semitones, and instrument parts",
    description:
      "Create new score revisions by semitone count, target key, or common transposing-instrument profile, with optional range diagnostics after transposition.",
    status: "Beta",
    releaseRequirement: "core",
    updatedAt: "2026-08-10",
    primaryAction: "scores",
    canonical: "/transpose-score",
    keywords: ["transpose sheet music", "online score transposition", "乐谱移调"],
    modules: ["Score JSON transposition", "Target-key mode", "Instrument profiles", "Range diagnostics"],
    workflow: [
      {
        title: "Open a score project",
        body: "Use any project with a current Score JSON revision created from MusicXML, OMR, Jianpu, MIDI, or Score JSON import.",
      },
      {
        title: "Choose the transposition mode",
        body: "Move by semitones, choose a target key, or create a written part for Bb, A, Eb, or F instruments.",
      },
      {
        title: "Check the resulting range",
        body: "Optional voice and instrument range profiles report low/high notes and write warnings into the new revision.",
      },
    ],
    details: [
      {
        title: "Revision-based workflow",
        body: "Every transposition creates a new version instead of mutating the previous score, so teachers and arrangers can compare results.",
      },
      {
        title: "Exports regenerate from the model",
        body: "Jianpu, MusicXML, MIDI, rendered PDF/images, and practice audio can be generated again from the transposed revision.",
      },
    ],
    guardrail: "Transposition uses music21 when configured and keeps a deterministic TypeScript fallback; complex enharmonic spelling and clef comfort still require review.",
  },
  {
    slug: "score-editor",
    title: "Online score editor and correction",
    eyebrow: "OSMD preview plus structured correction",
    description:
      "Correct imported scores through property panels for notes, rests, key/time signatures, lyrics, chord symbols, dynamics, wedges, articulations, and barlines.",
    status: "Beta",
    releaseRequirement: "core",
    updatedAt: "2026-08-10",
    primaryAction: "scores",
    canonical: "/score-editor",
    keywords: ["online score editor", "sheet music correction", "五线谱编辑"],
    modules: ["OSMD preview", "Score JSON revisions", "Correction panel", "Version restore"],
    workflow: [
      {
        title: "Import a structured score",
        body: "Start from MusicXML, MIDI, Jianpu, Score JSON, or an OMR candidate promoted into an editable revision.",
      },
      {
        title: "Select a correction target",
        body: "Edit note/rest properties, measure attributes, harmony, tempo, dynamics, wedges, articulations, ties, slurs, lyrics, and barlines.",
      },
      {
        title: "Save a new revision",
        body: "Corrections are stored as new Score JSON revisions so history can be restored without losing earlier versions.",
      },
    ],
    details: [
      {
        title: "Designed for OMR cleanup",
        body: "Scanning is rarely perfect; this editor exists to repair recognition mistakes before playback, conversion, or export.",
      },
      {
        title: "Interactive correction, with deeper engraving still in progress",
        body: "The app supports rendered-note selection, pitch and duration dragging, insertion, deletion, and structured property editing. Desktop-grade free-form engraving and full layout control remain in progress.",
      },
    ],
    guardrail: "Editing is built on Score JSON/MusicXML, not on PDF text or image pixels.",
  },
  {
    slug: "score-to-audio",
    title: "Score to audio practice generator",
    eyebrow: "Playback, loops, and studio-rendered exports",
    description:
      "Turn structured score projects into browser playback and queued MIDI, WAV, or MP3 practice exports with tempo, loops, count-in, metronome, and per-part controls.",
    status: "Beta",
    releaseRequirement: "core",
    updatedAt: "2026-08-10",
    primaryAction: "scores",
    canonical: "/score-to-audio",
    keywords: ["score to audio", "sheet music playback", "乐谱生成音频"],
    modules: ["Tone.js playback", "Playback timeline", "MIDI export", "WAV/MP3 renderer"],
    workflow: [
      {
        title: "Generate playback events",
        body: "The app converts Score JSON into timed note events with tempo, measure markers, dynamics, articulations, ties, and repeat handling.",
      },
      {
        title: "Practice in the browser",
        body: "Control tempo, loop ranges, metronome, count-in, solo/mute, and per-part volume before exporting.",
      },
      {
        title: "Export practice materials",
        body: "Queue reproducible MIDI, WAV, or MP3 files from an immutable score revision and the current practice settings.",
      },
    ],
    details: [
      {
        title: "Useful for choir and ensemble rehearsal",
        body: "Students can focus on one part, slow down difficult measures, and export a practice clip for review.",
      },
      {
        title: "High-quality audio when the renderer is configured",
        body: "Queued WAV and MP3 export requires FluidSynth, a configured SoundFont, and ffmpeg. The server reports a configuration error instead of substituting lower-quality browser synthesis.",
      },
    ],
    guardrail: "This feature generates audio from structured scores; audio-to-score transcription is available as a separate experimental import path.",
  },
  {
    slug: "audio-to-score",
    title: "Audio to score transcription",
    eyebrow: "MP3/WAV to MIDI candidate to editable score",
    description:
      "Upload permitted MP3 or WAV audio, create a Basic Pitch MIDI candidate, then review and promote it into an editable Score JSON project.",
    status: "Preview",
    releaseRequirement: "audio-transcription",
    updatedAt: "2026-08-10",
    primaryAction: "upload",
    canonical: "/audio-to-score",
    keywords: ["audio to score", "mp3 to sheet music", "wav to midi", "Basic Pitch transcription"],
    modules: ["Audio upload", "Basic Pitch worker", "MIDI candidate", "Score JSON correction"],
    workflow: [
      {
        title: "Upload an audio source",
        body: "The app stores the source audio asset and queues an audio transcription job tied to a score project.",
      },
      {
        title: "Generate a MIDI candidate",
        body: "When configured, the worker calls Basic Pitch, stores the generated MIDI file, and records diagnostics in the score jobs panel.",
      },
      {
        title: "Create an editable score draft",
        body: "The platform attempts a first-pass MIDI-to-Score JSON revision so the result can be previewed, corrected, converted to Jianpu, played, transposed, and exported.",
      },
    ],
    details: [
      {
        title: "Candidate-first transcription",
        body: "Audio transcription is treated as a draft import path, not a guaranteed final score. Polyphonic music, accompaniment, reverb, and noisy recordings usually need correction.",
      },
      {
        title: "Same project workflow after import",
        body: "Once a candidate revision exists, it uses the same Score JSON and MusicXML model as OMR, MIDI, Jianpu, and MusicXML imports.",
      },
    ],
    guardrail: "Use this for permitted audio sources and expect human review. The site should not promise perfect automatic transcription from commercial recordings.",
  },
  {
    slug: "musicxml-midi",
    title: "MusicXML converter and MIDI score tools",
    eyebrow: "Import, export, and project backups",
    description:
      "Use MusicXML as the interchange format and Score JSON as the editable project model, with MIDI import/export and portable Score JSON snapshots.",
    status: "Available",
    releaseRequirement: "core",
    updatedAt: "2026-08-10",
    primaryAction: "scores",
    canonical: "/musicxml-midi",
    keywords: ["MusicXML converter", "MIDI to sheet music", "score json"],
    modules: ["MusicXML import/export", "MIDI import/export", "Score JSON snapshot", "OSMD preview"],
    workflow: [
      {
        title: "Import MusicXML, MXL, MIDI, or Score JSON",
        body: "Each entry path creates a reusable score project with revisions, assets, and export history.",
      },
      {
        title: "Normalize into Score JSON",
        body: "Playback, Jianpu conversion, transposition, correction, and export all operate on the same structured model.",
      },
      {
        title: "Export without lock-in",
        body: "Download MusicXML, MIDI, Jianpu text, rendered files, audio, or a Score JSON snapshot for backup and migration.",
      },
    ],
    details: [
      {
        title: "Parser provenance",
        body: "Score JSON metadata records whether a project came from MusicXML, Jianpu, MIDI, or a snapshot import.",
      },
      {
        title: "MIDI import is structural",
        body: "The first MIDI importer extracts tracks, tempo, time signatures, program hints, chords, and cross-measure ties for correction.",
      },
    ],
    guardrail: "Complex engraving from MIDI still needs human review and correction.",
  },
  {
    slug: "pdf-score-scanner",
    title: "PDF score scanner and OMR",
    eyebrow: "OMR import with correction",
    description:
      "Upload PDFs or score images as OMR sources, queue Audiveris recognition, convert MusicXML into Score JSON, and review diagnostics before correction.",
    status: "Beta",
    releaseRequirement: "omr",
    updatedAt: "2026-08-10",
    primaryAction: "upload",
    canonical: "/pdf-score-scanner",
    keywords: ["pdf score scanner", "scan sheet music to MusicXML", "乐谱扫描识别"],
    modules: ["OMR upload", "Audiveris worker", "MusicXML output", "Diagnostics panel"],
    workflow: [
      {
        title: "Upload a PDF or image",
        body: "The app stores the source and creates an OMR import job tied to a score project.",
      },
      {
        title: "Run Audiveris recognition",
        body: "When configured, the worker calls Audiveris, stores the generated MusicXML, and creates an editable candidate revision.",
      },
      {
        title: "Correct the candidate",
        body: "Review diagnostics, preview the score, fix recognition mistakes, then export or generate practice materials.",
      },
    ],
    details: [
      {
        title: "Candidate-first recognition",
        body: "OMR results are treated as editable candidates with confidence and diagnostics, not as guaranteed final scores.",
      },
      {
        title: "Production wiring still matters",
        body: "Audiveris installation, command configuration, timeout tuning, and deployment packaging must be handled for production.",
      },
    ],
    guardrail: "Scanning is import plus correction. The site should not promise perfect automatic recognition for all PDFs or photos.",
  },
  {
    slug: "teaching",
    title: "Music teacher assignments",
    eyebrow: "Share, submit, review, and comment",
    description:
      "Create read-only score links, assign practice tasks, collect student submissions, review recordings, add timed comments, and use reusable rubric templates.",
    status: "Beta",
    releaseRequirement: "teaching",
    updatedAt: "2026-08-10",
    primaryAction: "scores",
    canonical: "/teaching",
    keywords: ["music teacher assignments", "score sharing", "乐谱教学作业"],
    modules: ["Share links", "Assignments", "Student submissions", "Rubrics"],
    workflow: [
      {
        title: "Create a score project",
        body: "Import or scan a score, correct it, and keep it as the teacher-owned source of truth.",
      },
      {
        title: "Share and assign",
        body: "Generate a read-only student link, add instructions and due dates, and attach rubric criteria.",
      },
      {
        title: "Review submissions",
        body: "Students can submit notes, links, practice minutes, and performance files; teachers can grade and add timed feedback.",
      },
    ],
    details: [
      {
        title: "No-login student path",
        body: "The first pass keeps submissions lightweight while storing private review tokens for students to retrieve feedback.",
      },
      {
        title: "Classroom expansion path",
        body: "Authenticated student accounts, class folders, notifications, and richer media annotation remain future work.",
      },
    ],
    guardrail: "Current teaching workflows are project-level and assignment-level; full classroom roles are planned later.",
  },
  {
    slug: "pricing",
    title: "Score transposer pricing",
    eyebrow: "Access for conversion and project workflows",
    description:
      "Open the app through checkout or activation-code access, then use score projects for import, conversion, correction, playback, export, and teaching workflows.",
    status: "Available",
    releaseRequirement: "checkout",
    updatedAt: "2026-08-10",
    primaryAction: "checkout",
    canonical: "/pricing",
    keywords: ["score transposer pricing", "music score converter price", "五线谱工具价格"],
    modules: ["Checkout", "Activation codes", "Entitlements", "Export gating"],
    workflow: [
      {
        title: "Choose access",
        body: "International users can use checkout, while mainland-China users can continue through activation-code access.",
      },
      {
        title: "Redeem and enter the app",
        body: "The app gates score projects, exports, and batch/high-quality operations through entitlement checks.",
      },
      {
        title: "Use project workflows",
        body: "Create score projects, import sources, correct results, transpose, practice, export, and share teaching assignments.",
      },
    ],
    details: [
      {
        title: "Clear paid boundaries",
        body: "Full exports, batch work, high-quality audio, saved history, and teaching workflows are natural paid-tier candidates.",
      },
      {
        title: "Operational support",
        body: "Checkout, activation, upload, job, and export issues route into the support workflow.",
      },
    ],
    guardrail: `Current price and currency are configured by deployment; this site currently reads ${siteConfig.priceAmount || "the configured"} ${
      siteConfig.priceCurrency
    } amount when available.`,
  },
];

export const platformFeaturePageSlugs = platformFeaturePages.map((page) => page.slug);

export function findPlatformFeaturePage(slug: string) {
  return platformFeaturePages.find((page) => page.slug === slug) ?? null;
}

export function isFeatureAvailable(page: PlatformFeaturePage) {
  if (!siteConfig.release.productAppAvailable && page.releaseRequirement !== "checkout") {
    return false;
  }

  switch (page.releaseRequirement) {
    case "omr":
      return siteConfig.release.omrAvailable;
    case "audio-transcription":
      return siteConfig.release.audioTranscriptionAvailable;
    case "teaching":
      return siteConfig.release.teachingAvailable;
    case "checkout":
      return siteConfig.release.checkoutAvailable;
    default:
      return true;
  }
}

export function isFeatureIndexable(page: PlatformFeaturePage) {
  if (!siteConfig.release.publicLaunchReady) return false;
  return page.releaseRequirement === "core" || isFeatureAvailable(page);
}
