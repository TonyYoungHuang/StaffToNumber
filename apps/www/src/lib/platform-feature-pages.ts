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
    keywords: ["jianpu to staff", "jianpu to staff notation", "numbered notation to staff", "简谱转五线谱"],
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
    title: "Smart Sheet Music Transposer",
    eyebrow: "Target key, semitones, and instrument parts",
    description:
      "Transpose sheet music online by semitones, target key, or instrument profile. Keep the original score, create a new revision, and review range and spelling.",
    status: "Beta",
    releaseRequirement: "core",
    updatedAt: "2026-08-25",
    primaryAction: "scores",
    canonical: "/transpose-score",
    keywords: ["transpose sheet music", "transpose sheet music online", "change sheet music key", "online score transposition", "乐谱移调"],
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
        body: "Change the sheet music key without overwriting the source: every transposition creates a new version so teachers and arrangers can compare results.",
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
    title: "Online Sheet Music Editor",
    eyebrow: "Create, correct, and collaborate on notation",
    description:
      "Create, correct, co-edit, and extract parts from sheet music in an online notation editor. Import MusicXML, MIDI, Jianpu, or scans as editable revisions.",
    status: "Beta",
    releaseRequirement: "core",
    updatedAt: "2026-08-24",
    primaryAction: "scores",
    canonical: "/score-editor",
    keywords: ["sheet music maker", "sheet music editor", "music score maker", "online music notation editor", "online score editor", "extract parts from score", "split score into parts", "sheet music part splitter", "collaborative music notation software", "collaborative sheet music editor", "online collaborative music notation", "五线谱编辑器"],
    modules: ["OSMD preview", "Score JSON revisions", "Correction panel", "Part Copy Generator Beta", "Version restore", "Real-time collaboration Beta"],
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
        title: "Sheet music editor for OMR cleanup",
        body: "Scanning is rarely perfect; this online music notation editor repairs recognition mistakes before playback, conversion, or export.",
      },
      {
        title: "Structured music score maker",
        body: "Create or correct notes with rendered-note selection, pitch and duration dragging, insertion, deletion, and property editing. Desktop-grade free-form engraving and full layout control remain in progress.",
      },
      {
        title: "Collaborative sheet music editor Beta",
        body: "Invite role-aware collaborators to a shared score with presence, conflict handling, and an offline change queue. Real-time collaboration remains a Beta workflow and should be tested before a large ensemble session.",
      },
      {
        title: "Extract parts from a score Beta",
        body: "Select one or more parts and split the full score into an independent practice project. Part copies preserve their source reference but do not yet follow later edits to the full score.",
      },
    ],
    guardrail: "Editing is built on Score JSON/MusicXML, not on PDF text or image pixels.",
  },
  {
    slug: "score-to-audio",
    title: "Sheet Music to MP3 & WAV Converter",
    eyebrow: "Online playback, practice feedback, and MP3 export",
    description:
      "Convert sheet music to MP3 or WAV in an online score player. Control tempo, loops, metronome and parts, then export reusable practice audio.",
    status: "Beta",
    releaseRequirement: "core",
    updatedAt: "2026-08-25",
    primaryAction: "scores",
    canonical: "/score-to-audio",
    keywords: ["sheet music to mp3", "sheet music to mp3 converter", "sheet music to mp3 online", "musicxml to mp3", "musicxml to mp3 converter", "musicxml to wav", "sheet music to audio", "sheet music to audio converter", "convert sheet music to mp3", "sheet music player", "scan sheet music and play", "score to audio", "sheet music playback", "music practice recording app", "sheet music practice app", "practice sheet music online", "乐谱播放器", "乐谱生成音频"],
    modules: ["Tone.js playback", "Playback timeline", "Browser recording Beta", "Practice feedback Beta", "MIDI export", "WAV/MP3 renderer"],
    workflow: [
      {
        title: "Generate playback events",
        body: "The app converts Score JSON into timed note events with tempo, measure markers, dynamics, articulations, ties, and repeat handling.",
      },
      {
        title: "Practice in the browser",
        body: "Control tempo, loop ranges, metronome, count-in, solo/mute, and per-part volume. The Beta practice recorder adds reviewable pitch and timing observations for monophonic practice.",
      },
      {
        title: "Export practice materials",
        body: "Queue reproducible MIDI, WAV, or MP3 files from an immutable score revision and the current practice settings.",
      },
    ],
    details: [
      {
        title: "Scan sheet music and play it after review",
        body: "After a scanned candidate is corrected, students can focus on one part, slow down difficult measures, and export a practice clip for review.",
      },
      {
        title: "Convert sheet music to MP3 or WAV",
        body: "Queued WAV and MP3 export requires FluidSynth, a configured SoundFont, and ffmpeg. The server reports a configuration error instead of substituting lower-quality browser synthesis.",
      },
      {
        title: "Music practice app with recording feedback Beta",
        body: "Record a monophonic exercise in the browser and compare reviewable pitch and timing observations with the selected score passage. This is practice guidance, not a certified performance grade.",
      },
    ],
    guardrail: "This feature generates audio from structured scores; audio-to-score transcription is available as a separate experimental import path.",
  },
  {
    slug: "audio-to-score",
    title: "Audio to Sheet Music Converter",
    eyebrow: "MP3/WAV to MIDI candidate to editable score",
    description:
      "Convert permitted MP3 or WAV audio to a MIDI and sheet music candidate with AI-assisted transcription, then review and correct the editable score online.",
    status: "Preview",
    releaseRequirement: "audio-transcription",
    updatedAt: "2026-08-24",
    primaryAction: "upload",
    canonical: "/audio-to-score",
    keywords: ["audio to sheet music", "audio to sheet music AI", "mp3 to midi", "mp3 to sheet music", "wav to midi", "audio to score"],
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
        title: "AI-assisted audio to sheet music",
        body: "Audio transcription and MP3-to-MIDI output are treated as draft import paths, not guaranteed final scores. Polyphony, accompaniment, reverb, and noise usually require correction.",
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
    title: "MusicXML Editor & MIDI/PDF Converter",
    eyebrow: "Open-format editing, conversion, and print export",
    description:
      "Edit MusicXML or MIDI online, correct the score, convert MusicXML to MIDI, and export portable MusicXML, PDF, SVG, PNG, or Score JSON files.",
    status: "Available",
    releaseRequirement: "core",
    updatedAt: "2026-08-25",
    primaryAction: "scores",
    canonical: "/musicxml-midi",
    keywords: ["musicxml editor", "musicxml editor online", "edit musicxml", "sheet music to midi", "musicxml to midi", "midi to sheet music", "MusicXML converter", "musicxml to pdf", "export sheet music to pdf", "sheet music svg", "sheet music png"],
    modules: ["MusicXML import/export", "MIDI import/export", "PDF/SVG/PNG renderer", "Score JSON snapshot", "OSMD preview"],
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
        title: "MusicXML to MIDI and MIDI to sheet music",
        body: "Convert MusicXML to MIDI for playback or import MIDI to sheet music as a structural draft. Tracks, tempo, time signatures, program hints, chords, and ties remain editable.",
      },
      {
        title: "MusicXML to PDF, SVG, and PNG export",
        body: "Render page-aware PDF files and high-resolution SVG or PNG score images from an immutable revision when the MuseScore rendering service is configured.",
      },
    ],
    guardrail: "Complex engraving from MIDI still needs human review and correction.",
  },
  {
    slug: "pdf-score-scanner",
    title: "Sheet Music Scanner for PDF & Images",
    eyebrow: "OMR import with correction",
    description:
      "Use this sheet music scanner to scan sheet music from PDF or image files, create an editable MusicXML candidate, review diagnostics, and correct OMR mistakes online.",
    status: "Beta",
    releaseRequirement: "omr",
    updatedAt: "2026-08-24",
    primaryAction: "upload",
    canonical: "/pdf-score-scanner",
    keywords: ["sheet music scanner", "scan sheet music", "sheet music scanner online free", "pdf score scanner", "scan sheet music to MusicXML", "乐谱扫描识别"],
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
        title: "Create one complete score project for free",
        body: "A free account can scan one complete multi-page PDF or score image and keep using current correction, playback, transposition, Jianpu, sharing, version, and export tools on that project.",
      },
    ],
    guardrail: "Scanning is import plus correction. The site should not promise perfect automatic recognition for all PDFs or photos.",
  },
  {
    slug: "pdf-to-musicxml",
    title: "PDF to MusicXML Converter Online",
    eyebrow: "Editable MusicXML from PDF or score images",
    description:
      "Convert a PDF or sheet music image to an editable MusicXML candidate, review OMR diagnostics, correct recognition mistakes, and export the accepted score.",
    status: "Beta",
    releaseRequirement: "omr",
    updatedAt: "2026-08-24",
    primaryAction: "upload",
    canonical: "/pdf-to-musicxml",
    keywords: ["pdf to musicxml", "pdf to musicxml converter", "image to musicxml", "pdf to musicxml online", "scan sheet music to MusicXML"],
    modules: ["PDF and image upload", "Audiveris OMR", "MusicXML candidate", "Score correction"],
    workflow: [
      {
        title: "Upload a PDF or sheet music image",
        body: "Start with a PDF, PNG, JPG, WebP, or TIFF score that you have permission to process.",
      },
      {
        title: "Create a MusicXML candidate",
        body: "The OMR worker recognizes notation, stores diagnostics, and creates a structured MusicXML and Score JSON candidate instead of editing PDF pixels.",
      },
      {
        title: "Review, correct, and export",
        body: "Check notes, rhythm, key, measures, lyrics, and symbols in the score editor before exporting the accepted MusicXML revision.",
      },
    ],
    details: [
      {
        title: "PDF to MusicXML converter with correction",
        body: "The converter keeps the source, recognition diagnostics, and editable candidate together so uncertain notation can be corrected before export.",
      },
      {
        title: "Image to MusicXML uses the same workflow",
        body: "Score images enter the same OMR pipeline and produce a reviewable candidate; clear, straight, high-resolution sources usually need fewer corrections.",
      },
    ],
    guardrail: "PDF-to-MusicXML conversion produces an editable candidate. Complex engraving, weak scans, handwriting, and dense scores still require human review.",
  },
  {
    slug: "teaching",
    title: "Music Notation Software for Students",
    eyebrow: "Classes, assignments, practice, and feedback",
    description:
      "Use music education software to manage classes, assign notation practice, collect recordings, apply rubrics, give timed feedback, and pilot LTI links.",
    status: "Beta",
    releaseRequirement: "teaching",
    updatedAt: "2026-08-25",
    primaryAction: "scores",
    canonical: "/teaching",
    keywords: ["music notation software for students", "music education software", "music education platform", "music classroom apps", "music teacher software", "music notation software for schools", "music composition assignments", "music performance assessment", "online music assignments", "music teacher management software", "music practice app for teachers", "educational music software", "score sharing", "乐谱教学作业"],
    modules: ["Classes", "Share links", "Assignments", "Student submissions", "Recordings", "Rubrics", "LTI pilot"],
    workflow: [
      {
        title: "Create a score project",
        body: "Import or scan a score, correct it, and keep it as the teacher-owned source of truth.",
      },
      {
        title: "Create a class and assign practice",
        body: "Organize learners in a class, generate a read-only score link, add instructions and due dates, and attach reusable rubric criteria.",
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
        title: "Classroom / School Beta",
        body: "Class rosters, assignments, submissions, recordings, rubrics, feedback, and an LTI pilot are available as Beta workflows with role-aware access.",
      },
    ],
    guardrail: "Classroom and School workflows are Beta. Test roster permissions, notifications, recording consent, and the limited LTI pilot before a production-wide rollout.",
  },
  {
    slug: "pricing",
    title: "Score transposer pricing",
    eyebrow: "Access for conversion and project workflows",
    description:
      "Start with one complete lifetime free score project, then choose Starter or Converter Pro when you need more projects and monthly server-job capacity.",
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
        body: "Create score projects, import sources, correct results, transpose, practice, and export the accepted revision.",
      },
    ],
    details: [
      {
        title: "Clear capacity boundaries",
        body: "Free includes one complete project and 25 credits monthly; Starter includes 50 credits and Converter Pro includes 200. Current project-level tools remain available on the free score.",
      },
      {
        title: "Operational support",
        body: "Checkout, activation, upload, job, and export issues route into the support workflow.",
      },
    ],
    guardrail: "The public catalog is the source of displayed prices. Checkout stays disabled until the selected provider has a matching Price ID for every paid plan.",
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
