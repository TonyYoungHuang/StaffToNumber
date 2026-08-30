import type { ScoreSharingMessages } from "../types";

export const deScoreSharingMessages = {
  viewer: {
    loading: "Freigegebene Partitur wird geladen ...", missing: "Dieser Freigabelink ist nicht verfügbar oder wurde widerrufen.", back: "Studio öffnen", shared: "Freigegebene Partitur",
    revision: "Aktuelle Revision", preview: "Notenvorschau", previewEmpty: "Diese Freigabe enthält noch kein darstellbares MusicXML.", previewLoading: "Notensatz wird gerendert ...",
    previewError: "Die Notenvorschau konnte nicht gerendert werden.", previewRetry: "Erneut rendern", previewTechnicalDetails: "Technische Details", previewDeferred: "Diese Partitur ist groß. Lade die vollständige MusicXML-Vorschau, wenn du die OSMD-Vergleichsansicht benötigst.", previewRender: "Vollständige Vorschau laden", previewEventLabel: "{part} · Takt {measure} · {type} {number}", previewNote: "Note", previewRest: "Pause",
    jianpu: "Jianpu-Vorschau", summary: "Strukturierte Zusammenfassung", parts: "Stimmen", measures: "Takte", notes: "Noten", rests: "Pausen",
    musicXmlEyebrow: "MusicXML", jianpuEyebrow: "Jianpu", scoreJsonEyebrow: "Score JSON", assignmentScoreFailed: "Die Partiturversion der Aufgabe konnte nicht geladen werden.",
    assignmentScoreShown: "Partiturversion {version} der Aufgabe wird angezeigt.", loadingAria: "Ladestatus der freigegebenen Partitur",
  },
  assignments: {
    title: "Übungsaufgaben", statuses: { open: "Offen", archived: "Archiviert" }, dueAt: "Fällig", noDue: "Kein Fälligkeitsdatum", submitterName: "Name", submitterContact: "Kontakt",
    practiceMinutes: "Übungsminuten", recordingUrl: "Link zur Audio-/Videoaufnahme", performanceFile: "Aufnahmedatei hochladen", performanceFileHint: "Audio oder gängige Videoformate, bis zu 100 MB",
    performanceFileAria: "Audio- oder Videoaufnahme auswählen", note: "Übungsnotiz", namePlaceholder: "Namen eingeben", nameRequired: "Gib vor dem Einreichen deinen Namen ein.",
    contactPlaceholder: "E-Mail, Telefon oder vom Unterricht vorgegebener Kontakt", recordingPlaceholder: "https://...", rubric: "Bewertungsraster", rubricEmpty: "Kein Bewertungsraster festgelegt.",
    notePlaceholder: "Notiere Tempo, schwierige Stellen, geübten Umfang oder eine Frage an die Lehrkraft ...", submit: "Aufgabe einreichen", submitting: "Wird eingereicht ...",
    submitSuccess: "Aufgabe eingereicht. Die Lehrkraft kann sie im Partiturprojekt prüfen.", submitFailed: "Die Aufgabe konnte nicht eingereicht werden.", practicePreset: "Übungsvorgabe", submittedPractice: "Eingereichte Übungseinstellungen",
    loadScore: "Übungsvorgabe anwenden", loadingScore: "Partiturversion wird geladen ...", statusAria: "Status der Aufgabeneinreichung",
  },
  practice: { tempo: "{tempo} BPM", loop: "Schleife {start}–{end}", fullScore: "gesamte Partitur", solo: "Solo {parts}", mute: "stumm {parts}", allParts: "alle Stimmen", metronome: "Metronom", countIn: "Einzähler" },
  reviews: {
    title: "Feedback zu meinen Einreichungen", statuses: { submitted: "Eingereicht", reviewed: "Bewertet" }, feedback: "Feedback der Lehrkraft", timedFeedback: "Zeitbezogenes Aufnahmefeedback", performanceFile: "Meine Aufnahmedatei",
    loadPerformancePreview: "Aufnahme wiedergeben", loadingPerformancePreview: "Wiedergabe wird geladen ...", performancePreviewFailed: "Die Aufnahme konnte nicht wiedergegeben werden.", seekTimedFeedback: "Zu dieser Zeit springen",
    grade: "Bewertung", waiting: "Warten auf die Bewertung durch die Lehrkraft.", empty: "Nach dem Einreichen einer Aufgabe erscheint hier das Feedback der Lehrkraft.", playbackAria: "Wiedergabe der eingereichten Aufnahme",
  },
  annotations: {
    eyebrow: "Partituranmerkungen", titles: { comment: "Kommentar-Arbeitsbereich", edit: "Gemeinsame Anmerkungen" },
    body: "Wähle unten eine Note aus, um eine präzise Anmerkung anzuhängen. Eine Link-Identität wird vom Partitureigentümer benannt und belegt nur den Besitz des Links, nicht eine verifizierte persönliche Identität.",
    score: "Gesamte Partitur", selection: "Ausgewählte Note", noSelection: "Wähle zuerst eine Note in der Partitur aus", placeholder: "Beschreibe eine Korrektur, einen Übungspunkt oder eine Frage", post: "Anmerkung veröffentlichen", posting: "Wird veröffentlicht ...",
    posted: "Anmerkung veröffentlicht.", failed: "Die Anmerkung konnte nicht veröffentlicht werden.", empty: "Noch keine Anmerkungen.", identities: { account: "Kontoidentität", share_link: "Link-Identität" }, resolved: "Erledigt", locate: "In Partitur anzeigen",
    measure: "Takt", targetModeAria: "Ziel der Anmerkung", statusAria: "Veröffentlichungsstatus der Anmerkung", listAria: "Partituranmerkungen",
  },
  collaboration: {
    title: "Echtzeit-Zusammenarbeit Beta", note: "Gemeinsame Probennotiz", noteAria: "Gemeinsame Probennotiz", online: "Online anwesend (Anzeigenamen nicht verifiziert)", operations: "Letzte Partituraktionen", conflicts: "Gleichzeitige Konflikte",
    noOperations: "Warten auf die erste Bearbeitung der Partitur.", revision: "Revision", targets: "{count} Ziele", identities: { account: "Kontoidentität", share_link: "Link-Identität", unverified: "Nicht verifizierte Übertragung" },
    statuses: { disconnected: "Getrennt", connecting: "Verbindung wird hergestellt", connected: "Verbunden" }, roles: { owner: "Eigentümer", editor: "Bearbeiter", commenter: "Kommentator", viewer: "Betrachter" },
    collaborator: "Mitwirkende Person", currentUser: "Aktueller Benutzer", operationTypes: { note_edit: "Note bearbeiten", measure_edit: "Takt bearbeiten", part_edit: "Stimme bearbeiten", transpose: "Transponieren", restore: "Revision wiederherstellen", candidate_accept: "Kandidat annehmen", candidate_reject: "Kandidat ablehnen", unknown: "Partituraktion" },
    presenceAria: "Online-Mitwirkende und Konflikte", operationsAria: "Letzte gemeinsame Aktionen",
  },
  modes: { major: "Dur", minor: "Moll", dorian: "Dorisch", phrygian: "Phrygisch", lydian: "Lydisch", mixolydian: "Mixolydisch", locrian: "Lokrisch" },
} satisfies ScoreSharingMessages;
