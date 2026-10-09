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
    title: "Convert Staff Notation to Jianpu (Numbered Notation) Online",
    eyebrow: "Five-line staff to numbered notation",
    description:
      "Convert staff notation to Jianpu online. Turn an imported or reviewed score into numbered notation, check the key and rhythm, then download Jianpu text.",
    status: "Beta",
    releaseRequirement: "core",
    updatedAt: "2026-08-10",
    primaryAction: "scores",
    canonical: "/staff-to-jianpu",
    keywords: ["staff to jianpu", "five-line staff to numbered notation"],
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
    keywords: ["jianpu to staff", "jianpu to staff notation", "numbered notation to staff"],
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
        body: "Download MusicXML or export a printable PDF, SVG, or PNG after reviewing the score.",
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
    title: "Transpose Sheet Music Online — Change Key by Semitones",
    eyebrow: "Target key, semitones, and instrument parts",
    description:
      "Transpose sheet music online by semitones, target key, or instrument. Keep the original, check the new notes and range, then export your score for practice.",
    status: "Beta",
    releaseRequirement: "core",
    updatedAt: "2026-08-25",
    primaryAction: "scores",
    canonical: "/transpose-score",
    keywords: ["transpose sheet music", "transpose sheet music online", "change sheet music key", "online score transposition"],
    modules: ["Transpose by semitones", "Choose a target key", "Transposing instruments", "Check the range"],
    workflow: [
      {
        title: "Open your sheet music",
        body: "Import MusicXML, MIDI or Jianpu, or scan a PDF and correct its notes before changing key.",
      },
      {
        title: "Choose the transposition mode",
        body: "Move by semitones, choose a target key, or create a written part for Bb, A, Eb, or F instruments.",
      },
      {
        title: "Check the resulting range",
        body: "Check high and low notes against the selected voice or instrument range, then listen to the result before exporting.",
      },
    ],
    details: [
      {
        title: "Change key without losing the original",
        body: "Each transposition saves a new version. Compare it with the original and return to an earlier version if you need to try another key.",
      },
      {
        title: "Export your transposed sheet music",
        body: "Download MusicXML or MIDI after changing key. Use the available PDF, image and audio exports to prepare printed parts or practice files.",
      },
    ],
    guardrail: "Review accidentals, clefs and the player's comfortable range after changing key, especially in complex scores.",
  },
  {
    slug: "score-editor",
    title: "Sheet Music Maker & Online Editor — Create, Fix and Transpose Scores",
    eyebrow: "Create, correct, and collaborate on notation",
    description:
      "Make sheet music online: write a new score or import MusicXML, MIDI, Jianpu or a scan, fix the notes, extract parts, transpose and export to PDF or MIDI. Free to try in your browser.",
    status: "Beta",
    releaseRequirement: "core",
    updatedAt: "2026-08-24",
    primaryAction: "scores",
    canonical: "/score-editor",
    keywords: ["sheet music maker", "sheet music editor", "music score maker", "online music notation editor", "online score editor", "extract parts from score", "split score into parts", "sheet music part splitter", "collaborative music notation software", "collaborative sheet music editor", "online collaborative music notation"],
    modules: ["See your sheet music", "Save your changes", "Correct notes and rhythm", "Extract instrument parts Beta", "Restore earlier versions", "Collaborate on a score Beta"],
    workflow: [
      {
        title: "Start with notation or an imported score",
        body: "Use the sheet music maker with typed Jianpu, an imported MusicXML or MIDI file, or a reviewed scan. Typed Jianpu needs a key, meter and note durations.",
      },
      {
        title: "Write and correct the notes",
        body: "Select notes or rests to change pitch and duration. Insert or delete notes, adjust measures, and edit tempo, dynamics, lyrics and musical symbols.",
      },
      {
        title: "Listen, save and export",
        body: "Play the score to check your work, save a new version, then download MusicXML or MIDI. Use PDF export when you need a printable part.",
      },
    ],
    details: [
      {
        title: "Edit an imported MusicXML or MIDI file",
        body: "Change notes, rests, rhythms and measure settings after import. MusicXML carries notation details; a MIDI performance may need extra rhythm and voice cleanup.",
      },
      {
        title: "Fix the notes in a scanned score",
        body: "Create or correct notes with rendered-note selection, pitch and duration dragging, insertion, deletion, and property editing. Desktop-grade free-form engraving and full layout control remain in progress.",
      },
      {
        title: "Work on sheet music together",
        body: "Invite collaborators with the appropriate editing or viewing permissions. Real-time collaboration is in Beta; try it with a small group before a large ensemble session.",
      },
      {
        title: "Extract parts from a score",
        body: "Select the violin part, a vocal line or several instruments and create a separate practice score. This Beta feature copies the selected parts; later edits to the full score do not automatically update the copy.",
      },
    ],
    guardrail: "Start from typed Jianpu or an imported score. Scanned PDFs need recognition and review before editing; full desktop-style engraving and page-layout control remain in development.",
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
    keywords: ["sheet music to mp3", "sheet music to mp3 converter", "sheet music to mp3 online", "musicxml to mp3", "musicxml to mp3 converter", "musicxml to wav", "sheet music to audio", "sheet music to audio converter", "convert sheet music to mp3", "sheet music player", "scan sheet music and play", "score to audio", "sheet music playback", "music practice recording app", "sheet music practice app", "practice sheet music online"],
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
        body: "Export WAV or MP3 practice audio from your score. Check the export status and download the file when it is ready.",
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
    title: "MIDI to Sheet Music & Sheet Music to MIDI Converter",
    eyebrow: "Open-format editing, conversion, and print export",
    description:
      "Upload a MIDI file and get editable sheet music in your browser: clean up the notation, transpose it, play it back, and export MusicXML, PDF or a new MIDI. Free to try.",
    status: "Available",
    releaseRequirement: "core",
    updatedAt: "2026-08-25",
    primaryAction: "scores",
    canonical: "/musicxml-midi",
    keywords: ["musicxml editor", "musicxml editor online", "edit musicxml", "sheet music to midi", "musicxml to midi", "midi to sheet music", "MusicXML converter", "musicxml to pdf", "export sheet music to pdf", "sheet music svg", "sheet music png"],
    modules: ["MusicXML import and export", "MIDI to sheet music", "Sheet music to MIDI", "Printable PDF and images", "Preview and playback"],
    workflow: [
      {
        title: "Upload your MIDI or MusicXML file",
        body: "Choose a .mid or .midi file to convert MIDI to sheet music. You can also import MusicXML or MXL, or scan and review a PDF before exporting MIDI.",
      },
      {
        title: "Check the notation and listen",
        body: "Review note lengths, rests, parts and the time signature. Listen to the score and correct any awkward rhythms before printing or exporting.",
      },
      {
        title: "Download sheet music or MIDI",
        body: "Export MusicXML for another notation editor, PDF for printing, or MIDI for playback and a DAW. Keep a project backup if you want to return to your edits.",
      },
    ],
    details: [
      {
        title: "Clean up a messy MIDI import",
        body: "A MIDI performance records timing rather than page layout. Check short rests, overlapping notes, tied rhythms and part assignments in the editor before printing.",
      },
      {
        title: "MusicXML to MIDI",
        body: "Import MusicXML, check the notes and tempo, then export MIDI to use in a sequencer or digital audio workstation. MIDI stores performance events, so it cannot carry every printed notation detail.",
      },
      {
        title: "Convert sheet music to MIDI",
        body: "Open an existing score or recognize a PDF or photo first. Fix any misread notes, check playback, then export MIDI. You can also download a PDF or score image using the available print exports.",
      },
    ],
    guardrail: "Complex engraving from MIDI still needs human review and correction.",
  },
  {
    slug: "sheet-music-scanner",
    title: "Sheet Music Scanner for PDF & Images — Free Online OMR",
    eyebrow: "OMR import with correction",
    description:
      "Use this sheet music scanner to turn a PDF or photo into editable notes. Correct scanning mistakes, listen, transpose, and export MusicXML or MIDI. One full project free.",
    status: "Beta",
    releaseRequirement: "omr",
    updatedAt: "2026-08-24",
    primaryAction: "upload",
    canonical: "/sheet-music-scanner",
    keywords: ["sheet music scanner", "scan sheet music", "sheet music scanner online free", "pdf score scanner", "scan sheet music to MusicXML"],
    modules: ["PDF and photo upload", "Printed music recognition", "Editable MusicXML", "Correct scanning mistakes"],
    workflow: [
      {
        title: "Upload a PDF or image",
        body: "Sign in and select a complete score PDF or a clear PNG, JPG, WebP or TIFF image. Keep all staff lines and notes visible.",
      },
      {
        title: "Scan the sheet music",
        body: "Optical music recognition reads the printed notes and creates an editable score. Follow the progress in the app while the scan is processed.",
      },
      {
        title: "Review and correct the notes",
        body: "Compare the recognized score with your source, fix notes and rhythms, and play it back. Then transpose or export the corrected sheet music.",
      },
    ],
    details: [
      {
        title: "Sheet music scanner for phone photos",
        body: "Photograph the page straight on in even light. Avoid shadows, blur and curved paper; crop the background without cutting off staff lines or notes.",
      },
      {
        title: "How accurate is the music scanner?",
        body: "Clear printed notation is the best starting point. Faint scans, dense chords and unusual symbols can produce mistakes. Check notes, rhythms and key signatures before using the result in rehearsal.",
      },
    ],
    guardrail: "Best for clear printed staff notation. Handwriting and difficult photos are not reliably supported; review every recognized score before using it.",
  },
  {
    slug: "pdf-to-musicxml",
    title: "PDF to MusicXML Converter Online",
    eyebrow: "Editable MusicXML from PDF or score images",
    description:
      "Upload a sheet music PDF or a photo and get an editable MusicXML file: fix the notes it misread, transpose, play it back, and export. Free to try, nothing to install.",
    status: "Beta",
    releaseRequirement: "omr",
    updatedAt: "2026-08-24",
    primaryAction: "upload",
    canonical: "/pdf-to-musicxml",
    keywords: ["pdf to musicxml", "pdf to musicxml converter", "image to musicxml", "pdf to musicxml online", "scan sheet music to MusicXML"],
    modules: ["PDF and image upload", "Read printed notes", "Fix recognition mistakes", "Download MusicXML"],
    workflow: [
      {
        title: "Upload a PDF or sheet music image",
        body: "Start with a PDF, PNG, JPG, WebP, or TIFF score that you have permission to process.",
      },
      {
        title: "Convert PDF to MusicXML",
        body: "The converter recognizes printed notes and rhythms and turns them into an editable score. You can compare the result with the source before saving your corrections.",
      },
      {
        title: "Review, correct, and export",
        body: "Check notes, rhythm, key signatures, measures, lyrics and symbols in the sheet music editor, then download the corrected MusicXML file.",
      },
    ],
    details: [
      {
        title: "Fix the notes OMR got wrong",
        body: "Compare the recognized notes with the original PDF. Correct pitches, missing rests, note lengths and measure settings, then listen again before exporting.",
      },
      {
        title: "Image to MusicXML uses the same workflow",
        body: "A scanned PDF or a standalone photo can both be recognized. Choose a clear, straight image with readable staff lines and no cropped notes to reduce corrections.",
      },
    ],
    guardrail: "PDF to MusicXML works best with clear printed staff notation. Complex engraving and weak scans need correction; reliable handwriting recognition is not promised.",
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
    keywords: ["music notation software for students", "music education software", "music education platform", "music classroom apps", "music teacher software", "music notation software for schools", "music composition assignments", "music performance assessment", "online music assignments", "music teacher management software", "music practice app for teachers", "educational music software", "score sharing"],
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
    keywords: ["score transposer pricing", "music score converter price"],
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
    guardrail: "Choose your plan, access period, and payment type. Confirm the currency, total, and renewal terms at checkout.",
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
