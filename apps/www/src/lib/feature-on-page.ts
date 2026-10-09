import type { SupportedLocale } from "@score/i18n";
import { spanishFeatureOnPage } from "./feature-on-page-es";
import type { PlatformFeaturePage } from "./platform-feature-pages";
import { localizedFeatureOnPage } from "./feature-on-page-locales";

type InlineText = { text: string; href?: string };
export type FeatureOnPageContent = {
  page?: Partial<Pick<PlatformFeaturePage, "title" | "description" | "modules" | "workflow" | "details">>;
  faqTitle?: string;
  h1: string;
  intro?: string;
  moduleTitle: string;
  workflowTitle: string;
  moduleDescriptions: string[];
  faq?: Array<{ question: string; answer: string }>;
  nextSteps?: InlineText[];
};

// Search intents from the owner's supplied review, with language-specific copy.
export const englishFeatureOnPage: Record<string, FeatureOnPageContent> = {
  "sheet-music-scanner": {
    h1: "Sheet Music Scanner for PDF & Images",
    moduleTitle: "Sheet music scanner for printed scores",
    workflowTitle: "Scan sheet music from a PDF",
    moduleDescriptions: [
      "Upload a complete PDF or a PNG, JPG, WebP or TIFF photo of your score.",
      "Recognize printed staff notation so notes and rhythms can be edited.",
      "Keep an editable MusicXML file for use in other notation software.",
      "Compare the result with your original and fix misread notes before export.",
    ],
    faq: [
      { question: "Is the sheet music scanner free?", answer: "A free account includes one complete score project, including a multi-page PDF or score image, and 25 credits per month. Keep editing, transposing and playing that score. Eligible server jobs use credits; additional projects and capacity require a paid plan." },
      { question: "Can it scan handwritten sheet music?", answer: "The scanner is intended for printed staff notation. Handwritten notes are not reliably supported. For a handwritten score, enter structured Jianpu or use a notation editor to prepare MusicXML instead." },
      { question: "Does it work with phone photos?", answer: "Yes, you can upload supported image files from your phone. Photograph the full page in even light, hold the camera parallel to the paper and avoid blur. Check the recognized notes before relying on them." },
      { question: "How long does one page take to scan?", answer: "There is no fixed per-page time. Processing depends on image quality, notation complexity, page count and the current queue. The app shows the job status; wait for it to finish before starting another scan of the same file." },
      { question: "Can I fix mistakes after scanning?", answer: "Yes. Open the recognized score in the editor, compare it with the original, and change pitches, note lengths, rests and measure settings. Listen to the corrected score before downloading it." },
    ],
    nextSteps: [
      { text: "After scanning, use the " }, { text: "sheet music editor", href: "/score-editor" },
      { text: " to correct notes, " }, { text: "transpose sheet music", href: "/transpose-score" },
      { text: " for your instrument, or " }, { text: "convert sheet music to MIDI", href: "/musicxml-midi" },
      { text: ". For an editable notation file, follow the " }, { text: "PDF to MusicXML guide", href: "/pdf-to-musicxml" }, { text: "." },
    ],
  },
  "pdf-to-musicxml": {
    h1: "PDF to MusicXML Converter",
    intro: "Use this PDF to MusicXML converter to turn a sheet music PDF or photo into editable notation. Fix misread notes, transpose, play it back, and export a MusicXML file. Free to try, nothing to install.",
    moduleTitle: "PDF to MusicXML with editable notes",
    workflowTitle: "How to convert a PDF to MusicXML",
    moduleDescriptions: [
      "Start with a score PDF or a clear image, including scanned pages.",
      "Recognize pitches and rhythms from the printed staff notation.",
      "Check the original alongside the score and correct notes and measures.",
      "Export the corrected notation as MusicXML for another score editor.",
    ],
    faq: [
      { question: "Can it read handwritten sheet music?", answer: "The PDF to MusicXML converter does not reliably recognize handwriting. Use clearly printed staff notation. If your source is handwritten, first enter the notes in a notation editor or as structured Jianpu." },
      { question: "How accurate is the PDF import?", answer: "Accuracy depends on the source. Clear printed notes are easier to recognize than faint scans, dense chords or unusual symbols. There is no guaranteed accuracy percentage; compare pitches, rhythms and measures with your PDF and correct errors before export." },
      { question: "What if the file is a scanned image?", answer: "A PDF made from scanned pages can still be processed with optical music recognition. You can also upload PNG, JPG, WebP or TIFF directly. The scan does not need selectable text, but the staff lines and noteheads must be readable." },
      { question: "Can I open the MusicXML file in another notation editor?", answer: "MusicXML is the notation interchange format used for export. Import the downloaded file into your preferred MusicXML-compatible editor, then check layout and unusual symbols because applications can interpret those details differently." },
    ],
    nextSteps: [
      { text: "Once recognition finishes, correct individual notes in the " }, { text: "sheet music editor", href: "/score-editor" },
      { text: ", " }, { text: "transpose sheet music", href: "/transpose-score" },
      { text: " to the key you need, then " }, { text: "export sheet music to MIDI", href: "/musicxml-midi" },
      { text: " for playback. For photo preparation, see the " }, { text: "sheet music scanner", href: "/sheet-music-scanner" }, { text: "." },
    ],
  },
  "score-editor": {
    h1: "Sheet Music Maker & Online Notation Editor",
    intro: "Use this sheet music maker to write notes from structured Jianpu or edit MusicXML, MIDI and scanned sheet music. Fix notes and rhythms, extract instrument parts, transpose, and export to PDF or MIDI. Free to try in your browser.",
    moduleTitle: "Sheet music maker tools for writing and editing",
    workflowTitle: "How to make sheet music online",
    moduleDescriptions: [
      "See the rendered staff notation while checking pitches and rhythms.",
      "Keep each saved edit as a version you can revisit later.",
      "Select, insert or delete notes and adjust pitch, duration and measures.",
      "Copy selected instruments into a separate practice score; part extraction is in Beta.",
      "Return to an earlier saved score if a change does not work for you.",
      "Invite people with viewing or editing permissions; real-time collaboration is in Beta.",
    ],
    faq: [
      { question: "Do I need music theory to use it?", answer: "You can start with the sheet music maker by importing a score and checking it against the original. Understanding pitch, rhythm, key signatures and time signatures helps when writing or correcting notes. The editor lets you hear changes, but it does not decide whether your musical choices are correct." },
      { question: "Can I edit a MIDI file after importing?", answer: "Yes. Import the MIDI file, inspect the notation, then change notes, rests, durations and measures. Expressive timing and overlapping tracks can make the first notation draft messy, so review it before printing." },
      { question: "How do I extract just the violin part?", answer: "Open a score that contains a separate violin part, choose that part in the part-copy tool, and create an independent practice score. Part extraction is in Beta. It copies existing parts and does not automatically separate instruments combined in a single part." },
      { question: "Can I make sheet music without uploading a file?", answer: "You can type or paste structured Jianpu with a key, meter and note durations, then convert it to staff notation and edit the notes. The current workflow starts from typed notation or an imported score; full free-form engraving and page-layout control remain in development." },
    ],
    nextSteps: [
      { text: "Starting with paper? Use the " }, { text: "sheet music scanner", href: "/sheet-music-scanner" },
      { text: " or " }, { text: "PDF to MusicXML converter", href: "/pdf-to-musicxml" },
      { text: " first. After editing, " }, { text: "transpose sheet music", href: "/transpose-score" },
      { text: " or " }, { text: "convert sheet music to MIDI", href: "/musicxml-midi" }, { text: " for rehearsal." },
    ],
  },
  "musicxml-midi": {
    h1: "MIDI to Sheet Music & Sheet Music to MIDI Converter",
    intro: "Convert MIDI to sheet music in your browser: clean up the notation, transpose, play it back, and export MusicXML, PDF or a new MIDI. Convert sheet music to MIDI too. Free to try.",
    moduleTitle: "MIDI to sheet music and back again",
    workflowTitle: "How to convert MIDI to sheet music",
    moduleDescriptions: [
      "Import MusicXML or compressed MXL and export an editable notation file.",
      "Turn a .mid or .midi file into notation you can inspect and correct.",
      "Export the notes and timing from your edited score as a MIDI file.",
      "Create a printable PDF or an SVG/PNG image using the available print exports.",
      "Read and listen to the score before choosing an export format.",
    ],
    faq: [
      { question: "Does it keep tempo and dynamics?", answer: "The MIDI to sheet music importer reads supported timing, tempo and performance information, but MIDI does not encode every printed expression mark. Check the tempo, rhythm, parts and dynamics after import; not every marking will survive a conversion unchanged." },
      { question: "Will the MIDI sound like the original?", answer: "MIDI stores musical events rather than recorded sound. The instrument or sound library playing it determines the tone, so it will not reproduce the exact sound of an original recording. Check note lengths, tempo and instrument choices before use." },
      { question: "Why does my MIDI import have too many rests or ties?", answer: "Live playing often includes small timing differences and overlapping notes. Turning those events into readable notation can create awkward rests and ties. Review the rhythms, voices and measures in the editor before exporting sheet music." },
      { question: "Can I convert sheet music to MIDI from a PDF?", answer: "Yes, first scan the PDF or photo and check the recognized notes. Then export the corrected score as MIDI. A PDF itself contains a page image or layout, so recognition is needed before its notes can become MIDI events." },
      { question: "Can I download the sheet music as PDF?", answer: "After importing MIDI and correcting the notation, choose PDF from the available exports. Keep MusicXML as well if you want to continue editing in another notation application." },
    ],
    nextSteps: [
      { text: "For paper scores, start with " }, { text: "PDF to MusicXML", href: "/pdf-to-musicxml" },
      { text: ". Clean up the notation in the " }, { text: "sheet music editor", href: "/score-editor" },
      { text: ", " }, { text: "transpose sheet music", href: "/transpose-score" },
      { text: " if needed, or use " }, { text: "sheet music to audio", href: "/score-to-audio" }, { text: " for a practice recording." },
    ],
  },
  "transpose-score": {
    h1: "Transpose Sheet Music Online",
    moduleTitle: "Transpose sheet music by key, semitones or instrument",
    workflowTitle: "How to transpose sheet music online",
    moduleDescriptions: [
      "Move the notes up or down by a chosen number of semitones.",
      "Select the key that suits your singer or ensemble.",
      "Prepare written parts for supported Bb, A, Eb or F instruments.",
      "Review notes outside the chosen voice or instrument range.",
    ],
    faq: [
      { question: "Can I transpose sheet music from a PDF?", answer: "Yes, first scan the PDF and correct any recognition mistakes. Then choose a target key or a semitone change in the transposer. The notes must be editable before their pitches can be changed." },
      { question: "How do I change a song from C major to D major?", answer: "Open the editable score and choose D major as the target key, or move it up two semitones. Check accidentals and the resulting range, then listen before exporting." },
      { question: "Can I make a part for a transposing instrument?", answer: "The transposer provides profiles for supported Bb, A, Eb and F instruments. Check whether your source is in concert pitch or already transposed before selecting a profile, and review the written range afterward." },
      { question: "Will transposing overwrite my original score?", answer: "No. A transposition is saved as a new version, so you can compare the result with the original and return to an earlier version." },
    ],
    nextSteps: [
      { text: "Begin with the " }, { text: "sheet music scanner", href: "/sheet-music-scanner" },
      { text: " if your source is a PDF. Correct notation in the " }, { text: "sheet music editor", href: "/score-editor" },
      { text: ", then " }, { text: "export the transposed score as MIDI", href: "/musicxml-midi" }, { text: " to hear it in your music software." },
    ],
  },
  "staff-to-jianpu": {
    h1: "Convert Staff Notation to Jianpu Online",
    moduleTitle: "Staff notation to Jianpu conversion",
    workflowTitle: "How to convert staff notation to Jianpu",
    moduleDescriptions: [
      "Use editable notes from an imported or corrected score.",
      "Generate scale degrees with octave and duration marks.",
      "Compare the numbered notation with the staff score.",
      "Download Jianpu text or keep editing the score.",
    ],
  },
  "jianpu-to-staff": {
    h1: "Jianpu to Staff Notation",
    moduleTitle: "Jianpu to staff notation from typed notes",
    workflowTitle: "How to convert Jianpu to staff notation",
    moduleDescriptions: ["Read typed Jianpu with key, meter and durations.", "Keep the resulting notes editable.", "Download notation for a MusicXML-compatible editor.", "Check the staff notation before exporting."],
  },
  "score-to-audio": {
    h1: "Sheet Music to MP3 & WAV Converter",
    moduleTitle: "Sheet music to MP3 and browser playback",
    workflowTitle: "How to convert sheet music to MP3",
    moduleDescriptions: ["Listen to the editable notes in your browser.", "Follow measures and choose a practice loop.", "Record a practice take in supported browsers; recording is in Beta.", "Review pitch and timing observations for monophonic practice; feedback is in Beta.", "Download note events for another MIDI player.", "Create a reusable audio file with the available WAV or MP3 export."],
  },
  "audio-to-score": {
    h1: "Audio to Sheet Music Converter",
    moduleTitle: "Audio to sheet music: experimental import",
    workflowTitle: "How audio to sheet music works when available",
    moduleDescriptions: ["Choose a permitted source recording when import is enabled.", "Estimate musical notes from the recording.", "Inspect the generated MIDI before using it.", "Correct pitches and rhythms in the notation editor."],
  },
  teaching: {
    h1: "Music Notation Software for Students",
    moduleTitle: "Music notation software for students and teachers",
    workflowTitle: "How to assign sheet music practice",
    moduleDescriptions: ["Organize learners into a class.", "Share a score with appropriate access permissions.", "Set practice instructions and a due date.", "Review the work students submit.", "Listen to submitted practice recordings.", "Use criteria to structure your feedback.", "Try the limited LTI integration in a pilot course."],
  },
};

export function getFeatureOnPageContent(slug: string, locale: SupportedLocale) {
  const content = locale === "en" ? englishFeatureOnPage[slug] : locale === "es" ? spanishFeatureOnPage[slug] : localizedFeatureOnPage[locale]?.[slug];
  // Keep the European Jianpu pages unchanged, including their existing FAQ heading.
  const coreTool = ["sheet-music-scanner", "pdf-to-musicxml", "score-editor", "musicxml-midi", "transpose-score"].includes(slug);
  if (content && coreTool && (locale === "en" || locale === "es")) return { ...content, faqTitle: locale === "en" ? "FAQ" : "Preguntas frecuentes" };
  return content;
}
