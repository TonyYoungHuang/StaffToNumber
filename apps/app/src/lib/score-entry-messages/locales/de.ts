import type { ScoreEntryMessages } from "../types";

export const deScoreEntryMessages = {
  pages: {
    library: { eyebrow: "Notenarbeitsbereich", title: "Noten erkennen, verwalten und weiterbearbeiten", body: "Laden Sie hier ein PDF oder Notenbild hoch oder öffnen Sie gespeicherte Noten, um sie weiterzubearbeiten. Uploads, Kandidaten und Bibliothek bleiben in einem Arbeitsbereich." },
    newScore: {
      eyebrow: "Neue Noten erstellen", title: "Womit möchten Sie beginnen?", body: "Wählen Sie eine Quelle. Auf der nächsten Seite erscheinen nur die dafür nötigen Schritte.", recommended: "Empfohlen", choose: "Auswählen",
      choices: {
        scan: { title: "PDF oder Notenbild scannen", body: "Für gedruckte Noten, Scans und PDFs. Neue Konten können aus einem vollständigen mehrseitigen PDF oder Notenbild ein dauerhaft kostenloses Projekt erstellen." },
        jianpu: { title: "Ziffernnotation eingeben", body: "Geben Sie Ziffernnoten ein, um Noten auf dem Liniensystem zu erstellen." },
        musicxml: { title: "Aus Notationssoftware importieren", body: "Für MusicXML-Exporte aus MuseScore, Sibelius, Finale und ähnlichen Anwendungen." },
        midi: { title: "MIDI importieren", body: "Wandeln Sie MIDI-Noten und -Rhythmus in Noten um." },
        audio: { title: "Aufnahme hochladen", body: "Versuchen Sie, aus einer Melodieaufnahme Noten zu erstellen (experimentell)." },
        backup: { title: "Notensicherung wiederherstellen", body: "Öffnen Sie eine zuvor von dieser Website heruntergeladene Sicherung." },
      },
    },
    source: {
      chooseAnother: "Andere Quelle auswählen",
      headings: {
        scan: { eyebrow: "Neue Noten erstellen", title: "PDF oder Notenbild scannen", body: "Wählen Sie eine Datei und starten Sie die Erkennung. Diese Seite ist nur zum Scannen vorgesehen." },
        jianpu: { eyebrow: "Neue Noten erstellen", title: "Aus Ziffernnotation Noten erstellen", body: "Geben Sie die Ziffernnotation ein und erstellen Sie die Noten. Diese Seite ist nur für Ziffernnotation vorgesehen." },
        musicxml: { eyebrow: "Neue Noten erstellen", title: "Aus Notationssoftware importieren", body: "Wählen Sie einen MusicXML-Export. Diese Seite ist nur für den Dateiimport vorgesehen." },
        midi: { eyebrow: "Neue Noten erstellen", title: "Noten aus MIDI erstellen", body: "Wählen Sie eine MIDI-Datei. Diese Seite ist nur für den MIDI-Import vorgesehen." },
        audio: { eyebrow: "Neue Noten erstellen", title: "Noten aus einer Aufnahme erstellen", body: "Wählen Sie eine Melodieaufnahme und prüfen Sie anschließend die erzeugten Tonhöhen und Rhythmen." },
        backup: { eyebrow: "Neue Noten erstellen", title: "Notensicherung wiederherstellen", body: "Wählen Sie eine zuvor heruntergeladene Sicherung. Diese Seite ist nur für die Wiederherstellung vorgesehen." },
      },
    },
  },
  access: { checking: "Zugriff wird geprüft...", errorFallback: "Das aktuelle Konto konnte nicht geladen werden." },
  library: {
    signInFirst: "Bitte melden Sie sich zuerst an.", createNew: "Neue Noten erstellen", editable: "Bearbeitbar",
    metrics: {
      projects: { label: "Meine Noten", body: "Alle gespeicherten Noten erscheinen hier." },
      format: { label: "Bereit zur Bearbeitung", body: "Nach Erkennung oder Import können Sie weiter korrigieren, transponieren, üben und exportieren." },
      revisions: { label: "Bearbeitungsverlauf", body: "Frühere Versionen bleiben bei Bedarf verfügbar." },
    },
    common: { selected: "Ausgewählt", importInProgress: "Wird importiert...", uploadInProgress: "Wird hochgeladen...", chooseAnother: "Andere Datei auswählen", clearSelection: "Auswahl löschen" },
    musicxml: {
      chooseFile: "Wählen Sie eine .musicxml-, .xml- oder .mxl-Datei.", importFailed: "MusicXML-Import fehlgeschlagen.", imported: "Die Noten wurden zu Meine Noten hinzugefügt.", eyebrow: "Aus Notationssoftware importieren", title: "MusicXML-Datei auswählen", body: "Importieren Sie einen MusicXML-Export aus MuseScore, Sibelius, Finale oder einer anderen Notationsanwendung und bearbeiten Sie ihn hier weiter.", dropTitle: "Datei auswählen", dropBody: "Unterstützt .musicxml-, .xml- und .mxl-Dateien.", empty: "Noch keine Datei ausgewählt.", button: "MusicXML importieren",
    },
    scan: {
      chooseFile: "Wählen Sie eine PDF- oder Bilddatei.", importFailed: "Der OMR-Importauftrag konnte nicht erstellt werden.", imported: "Die Datei wurde hochgeladen und die Erkennung gestartet. Prüfen Sie sie später unter Meine Noten.", eyebrow: "Notenerkennung", title: "PDF oder Notenbild hochladen", body: "Wandeln Sie gedruckte Noten oder PDFs in überprüfbare und korrigierbare Noten um. Komplexe Notation kann einige manuelle Korrekturen erfordern.", dropTitle: "PDF oder Bild auswählen", dropBody: "Unterstützt PDF, PNG, JPG, WEBP und TIFF.", empty: "Noch kein Scan ausgewählt.", button: "Erkennung starten", accessLoading: "Kostenlosen Scan prüfen...", freeEyebrow: "Angemeldet · kostenlos bearbeiten", freeBody: "Laden Sie ein vollständiges mehrseitiges PDF oder Notenbild hoch und erstellen Sie Ihr dauerhaft kostenloses Notenprojekt. Korrigieren, spielen, transponieren, konvertieren, teilen und exportieren Sie es weiter.", exhaustedEyebrow: "Kostenloser Bearbeitungsscan verwendet", exhaustedTitle: "Dieses Konto hat sein dauerhaft kostenloses Notenprojekt erstellt.", exhaustedBody: "Sie können diese vollständigen Noten weiter korrigieren, spielen, transponieren, konvertieren, versionieren, teilen und exportieren. Führen Sie nur für weitere Noten ein Upgrade durch.", exhaustedLibrary: "Mit den kostenlosen Noten fortfahren", exhaustedUpgrade: "Vollzugriff aktivieren",
    },
    backup: {
      chooseFile: "Wählen Sie eine Notensicherungsdatei.", importFailed: "Die Sicherung konnte nicht wiederhergestellt werden.", imported: "Die Notensicherung wurde wiederhergestellt.", eyebrow: "Sicherung wiederherstellen", title: "Notensicherung auswählen", body: "Stellen Sie eine zuvor von dieser Website heruntergeladene Notensicherung wieder her und bearbeiten Sie sie weiter.", dropTitle: "Sicherungsdatei auswählen", dropBody: "Unterstützt .score.json- und .json-Dateien.", empty: "Noch kein Score-JSON-Schnappschuss ausgewählt.", button: "Noten wiederherstellen",
    },
    midi: {
      chooseFile: "Wählen Sie eine MIDI-Datei.", importFailed: "MIDI-Import fehlgeschlagen.", imported: "MIDI wurde in ein Notenprojekt umgewandelt.", eyebrow: "MIDI importieren", title: "MIDI-Datei auswählen", body: "Wandeln Sie MIDI-Noten und -Rhythmus in Noten um, die Sie anzeigen, abspielen und transponieren können. Komplexer Notensatz kann manuelle Anpassungen erfordern.", dropTitle: ".mid- oder .midi-Datei auswählen", dropBody: "Unterstützt Standard-MIDI-Dateien.", empty: "Noch keine MIDI-Datei ausgewählt.", button: "MIDI importieren",
    },
    audio: {
      formatLabel: "Audio",
      chooseFile: "Wählen Sie eine Audiodatei.", importFailed: "Der Audiotranskriptionsauftrag konnte nicht erstellt werden.", imported: "Audiotranskriptionsprojekt erstellt. Basic Pitch versucht, MIDI und eine erste bearbeitbare Notenversion zu erzeugen.", eyebrow: "Von der Aufnahme zu Noten (experimentell)", title: "Aufnahme auswählen", body: "Laden Sie eine Melodieaufnahme hoch; die Website versucht, bearbeitbare Noten zu erstellen. Ensembles, Rauschen und komplexe Harmonik können die Genauigkeit verringern.", dropTitle: "Audiodatei auswählen", dropBody: "Unterstützt WAV, MP3, M4A, AAC, FLAC, OGG und AIFF.", empty: "Noch keine Audiodatei ausgewählt.", button: "Transkription starten",
    },
    jianpu: {
      empty: "Geben Sie Jianpu-Text ein.", importFailed: "Jianpu-Import fehlgeschlagen.", imported: "Jianpu-Notenprojekt erstellt. Vorschau, Transposition, Wiedergabe und MusicXML-Export sind jetzt verfügbar.", eyebrow: "Jianpu in Notenschrift", title: "Ziffernnotation eingeben", body: "Geben Sie Tonart, Takt, Ziffernnoten, Pausen und Taktstriche ein, um abspielbare, transponierbare und exportierbare Noten zu erstellen.", titleLabel: "Notentitel", titlePlaceholder: "Beispiel: Funkel, funkel in Jianpu", textLabel: "Jianpu-Text", textPlaceholder: "1=C\n4/4\n1 1 5 5 | 6 6 5 - |", button: "Jianpu importieren", clear: "Beispiel wiederherstellen",
    },
    list: { eyebrow: "Meine Noten", title: "Gespeicherte Noten", body: "Öffnen Sie Noten, um sie weiter zu korrigieren, konvertieren, transponieren, üben oder exportieren.", loading: "Noten werden geladen...", empty: "Noch keine Noten vorhanden. Erstellen Sie Ihre ersten Noten; sie erscheinen dann hier.", open: "Noten öffnen", revision: "Bearbeitungsverlauf" },
    statuses: { imported: "Importiert", candidate: "Korrektur nötig", needs_review: "Prüfung nötig", ready: "Bereit", archived: "Archiviert" },
  },
  trial: {
    previewDeferred: "Diese Partitur ist umfangreich. Lade die vollständige MusicXML-Vorschau, wenn du die OSMD-Vergleichsansicht benötigst.",
    previewRender: "Vollständige Vorschau laden",
    previewEventLabel: "{part} · Takt {measure} · {type} {number}",
    previewNote: "Note",
    previewRest: "Pause",
    loadingJob: "Auftrag wird geladen", preparing: "Kostenlose Bearbeitung wird vorbereitet", loadingScore: "Noten werden geladen...", intro: "Nach Abschluss der Erkennung stehen im vollständigen kostenlosen Projekt Korrektur, Wiedergabe, Transposition, Jianpu, Versionen, Teilen und Export bereit. Führen Sie ein Upgrade durch, um weitere Noten zu verarbeiten.", unlock: "Vollzugriff aktivieren", back: "Zurück zur Bibliothek",
    statuses: { queued: "In Warteschlange", processing: "Wird erkannt", completed: "Erkennung abgeschlossen", failed: "Erkennung fehlgeschlagen", cancelled: "Abgebrochen" },
    failedTitle: "Die Erkennung wurde nicht abgeschlossen. Prüfen Sie die Datei anhand der folgenden Hinweise.", failedBody: "Achten Sie auf eine gerade, scharfe Seite ohne große Schatten oder abgeschnittene Ränder. Ein fehlgeschlagener kostenloser Auftrag erfordert eine manuelle Kontingentprüfung; starten Sie keine weitere Zahlung.", technicalDetails: "Technische Details", reportIssue: "Erkennungsproblem melden", diagnosticsEyebrow: "Erkennungsdiagnose", diagnosticsTitle: "Prüfen Sie Konfidenz und Warnungen vor dem Upgrade.", diagnosticsWarning: "Die Erkennungs-Engine hat eine Warnung zurückgegeben, die manuell geprüft werden muss.", confidenceLabel: "Gesamtkonfidenz", confidenceHelp: "Bei niedriger Konfidenz ist eine taktweise Prüfung erforderlich.", pagesLabel: "Erkannte Seiten", pagesHelp: "Das kostenlose Projekt unterstützt ein vollständiges mehrseitiges PDF.", warningsLabel: "Warnungen", engineFallback: "Diagnose der Erkennungs-Engine", previewEyebrow: "Notenvorschau", previewTitle: "Audiveris-Erkennungskandidat", previewEmpty: "Die Vorschau der Kandidatennoten erscheint nach Abschluss der Verarbeitung hier.", previewLoading: "Noten werden gerendert...", previewError: "Das Erkennungsergebnis ist unvollständig und kann nicht angezeigt werden. Verwenden Sie eine schärfere, gerade und unbeschnittene Seite oder kontaktieren Sie den Support.", previewRetry: "Erneut rendern",
  },
  candidate: {
    notationRetry: "Erneut rendern",
    notationTechnicalDetails: "Technische Details",
    notationEventLabel: "{part} · Takt {measure} · {type} {number}",
    notationNote: "Note",
    notationRest: "Pause",
    freeEyebrow: "Kostenlose Bearbeitung", reviewEyebrow: "Kandidatennoten prüfen", freeDescription: "Sie befinden sich im dauerhaft kostenlosen Notenprojekt. Das Erkennungsergebnis v{revision} kann jetzt korrigiert werden; Änderungen werden als Kandidatenversionen gespeichert.", reviewDescription: "Das Erkennungsergebnis v{revision} ist noch keine offizielle Version. Vergleichen Sie es vor der Annahme mit der Quelle.", back: "Zurück zu den Noten", processMore: "Weitere Noten verarbeiten", rejecting: "Wird abgelehnt...", reject: "Kandidat ablehnen", accepting: "Wird angenommen...", accept: "Als offizielle Version annehmen", safetyEyebrow: "Sicherer Zustand", safetyTitle: "Die Kandidatenversion kann eine bestehende offizielle Version nicht überschreiben", freeSafetyBody: "Ein kostenloses Konto kann die vollständigen Noten korrigieren und Wiedergabe, Transposition, Jianpu, Versionen, Teilen und verfügbare Exporte weiterverwenden. Führen Sie ein Upgrade durch, um weitere Projekte zu erstellen.", reviewSafetyBody: "Korrekturen erzeugen neue Kandidatenversionen, ohne die offiziellen Noten zu ändern. Bei Annahme wird der neueste Kandidat in eine offizielle Version kopiert; anschließend werden Transposition, Wiedergabe und Export freigeschaltet.", historyGroupLabel: "Kandidatenkorrekturen rückgängig machen und wiederholen", undo: "Korrektur rückgängig", redo: "Korrektur wiederholen", viewportLabel: "Prüfansicht", syncScroll: "Scrollen synchronisieren", zoomGroupLabel: "Prüfansicht zoomen", zoomOut: "Verkleinern", zoomIn: "Vergrößern", fitWidth: "An Breite anpassen", notationEyebrow: "Kandidatennotation", notationTitle: "MusicXML-Notenvorschau", notationBody: "Wählen Sie Noten im Notenbild oder in den Diagnosen, um Kandidatenereignisse zu prüfen.", notationEmpty: "Noch kein darstellbares Kandidaten-MusicXML vorhanden.", notationLoading: "Kandidatennotation wird gerendert...", notationError: "Kandidaten-MusicXML konnte nicht gerendert werden.", notationDeferred: "Dies sind umfangreiche Noten. Laden Sie die vollständige OSMD-Vorschau, wenn Sie die Vergleichsansicht benötigen; der grafische Editor bleibt verfügbar.", notationRender: "Vollständige OSMD-Vorschau laden",
  },
  omr: {
    sources: { "omr-engine": "Erkennungs-Engine", structural: "Strukturprüfung" },
    sourcePreviewFailed: "Die Scanquelle konnte nicht geladen werden.", pageTemplate: "Seite {page}", measureTemplate: "Takt {measure}", scanAltTemplate: "Scanquelle von {name}", eyebrow: "OMR-Vergleich", title: "Scanquelle und Erkennungsdiagnose", body: "Rote Rahmen verwenden Audiveris-Symbolkoordinaten. structural-Werte prüfen die rhythmische Vollständigkeit und sind keine Modellwahrscheinlichkeiten.", issueNavigation: "Zwischen Problemen navigieren", previous: "Zurück", next: "Weiter", sourceMode: "Quelldarstellung", original: "Original", overlay: "Diagnoseüberlagerung", issuesOnly: "Nur Probleme", scanPages: "Scanseiten", noSource: "Diesem Projekt ist keine PDF- oder Bildquelle zur Vorschau zugeordnet.", loadingSource: "Scanquelle wird geladen...", geometryWarning: "Die Pixelabmessungen der Seite weichen vom Erkennungsdatensatz ab. Erkennen Sie die Datei vor der Freigabe erneut.", symbolLayer: "Positionen von Symbolen mit niedriger Konfidenz", pageSymbols: "Seitensymbole", issueSymbols: "Problemsymbole", problemMeasures: "Problemtakte", gradeLabel: "Bewertung", contextGradeLabel: "Kontextbewertung", noDiagnostics: "Keine Diagnose entspricht dieser Seite und diesem Filter.",
  },
} satisfies ScoreEntryMessages;
