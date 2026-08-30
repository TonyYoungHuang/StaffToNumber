import type { PlaybackPracticeMessages } from "../types";

export const dePlaybackPracticeMessages = {
  playback: {
    eyebrow: "Wiedergabeübung", title: "Tone.js-Übungsplayer nach Stimme", body: "Erzeugt aus dem aktuellen Score JSON übungsbereite Wiedergabeereignisse mit Tempo, Schleifen, Metronom, Einzähler und Solo/Stumm pro Stimme.",
    load: "Wiedergabeereignisse erzeugen", play: "Abspielen", stop: "Stoppen", tempo: "Tempo in BPM", playhead: "Wiedergabeposition", loop: "Abschnitt wiederholen", loopStart: "Startschlag", loopEnd: "Endschlag", metronome: "Metronom", countIn: "Ein Takt Einzähler",
    loading: "Wiedergabeereignisse werden erzeugt…", ready: "Wiedergabeereignisse wurden erzeugt.", failed: "Wiedergabe konnte nicht erzeugt werden.", empty: "Erzeuge vor dem Anhören Wiedergabeereignisse.", noEvents: "Der aktuelle Stimmenfilter enthält keine abspielbaren Noten.",
    events: "Ereignisse", activeEvents: "Aktive Ereignisse", beats: "Schläge insgesamt", parts: "Stimmen", solo: "Solo", mute: "Stumm", allParts: "Alle Stimmen", revision: "Revision",
    speedLadder: "Tempo-Leiter", targetTempo: "Zieltempo", tempoStep: "Erhöhung je Durchlauf", ladderComplete: "Tempo-Leiter abgeschlossen.", practiceExports: "Übungsexporte",
    startMeasure: "Starttakt", endMeasure: "Endtakt", byBeat: "Nach Schlag", partVolume: "Stimmenlautstärke", diagnostics: "Wiedergabediagnose", playbackPath: "Wiedergabepfad", terminated: "Beendet", unreachableMeasures: "Unerreichbare Takte",
    markerTemplate: "Takt {measure}", repeatedMarkerTemplate: "Takt {measure}, Wiederholung {occurrence}", jumpsTemplate: "{count} Sprünge", selectedSoloTemplate: "Solo: {count}", selectedMuteTemplate: "Stumm: {count}", soloPartTemplate: "{part} solo", mutePartTemplate: "{part} stummschalten",
    navigationMeasureTemplate: "Takt {measure}",
    terminationReasons: { end: "Ende der Partitur", fine: "Fine-Zeichen", guard: "Sicherheitsgrenze" },
    navigationActions: { play: "Takt abspielen", "skip-ending": "Voltaklammer überspringen", "repeat-jump": "Zum Wiederholungsanfang zurückkehren", "dc-jump": "Zu D.C. springen", "ds-jump": "Zu D.S. springen", "coda-jump": "Zur Coda springen", "fine-stop": "Bei Fine anhalten", end: "Ende erreichen", "guard-stop": "An der Sicherheitsgrenze anhalten" },
  },
  recorder: {
    title: "Browseraufnahme und Übungsfeedback Beta", regionAria: "Browseraufnahme und Übungsfeedback", device: "Mikrofon", defaultDevice: "Systemstandardmikrofon", deviceTemplate: "Mikrofon {index}", countIn: "Einzähler", beatsTemplate: "{count} Schläge",
    start: "Aufnahme starten", requesting: "Mikrofonzugriff wird angefordert…", pause: "Pausieren", resume: "Fortsetzen", stop: "Stoppen", cancel: "Abbrechen", rerecord: "Neu aufnehmen", ready: "Die Aufnahme ist dieser Abgabe beigefügt. Prüfe sie vor dem Absenden.",
    unsupported: "Dieser Browser unterstützt MediaRecorder nicht.", denied: "Das Mikrofon ist nicht verfügbar. Prüfe Browserberechtigung und Eingabegerät.", recordingStatusTemplate: "Aufnahme {duration}", pausedStatusTemplate: "Pausiert {duration}", countInStatusTemplate: "Bereit: {count}",
    analysis: "Übungsfeedback pro Note", feedbackAria: "Ergebnisse der Übungsanalyse", analyzing: "Aufnahme und Partitur werden ausgerichtet…", analysisFailed: "Diese Aufnahme konnte nicht analysiert werden, kann aber zur Prüfung durch die Lehrkraft eingereicht werden.", completeness: "Erkannte Vollständigkeit", completenessTemplate: "{detected}/{expected} · {percent}",
    alignment: "Zeitliche Ausrichtung", startOffset: "Aufnahmestart (Sekunden)", timeScale: "Zeitskalierung", applyAlignment: "Manuelle Ausrichtung anwenden", measureTemplate: "Takt {measure}", detectedTemplate: "Erkannt: {detected}/{total}", pitchAttentionTemplate: "Tonhöhe prüfen: {count}", rhythmAttentionTemplate: "Rhythmus prüfen: {count}", polyphonicTemplate: "Polyphon, unbewertet: {count}", jump: "Diese Note anhören",
    pitchUnavailable: "Tonhöhe nicht verfügbar", onsetUnavailable: "Einsatz nicht verfügbar", centsTemplate: "{value} Cent", onsetTemplate: "{value} ms", feedbackButtonTemplate: "{measure}, {note}: {status}. {action}",
    statuses: { idle: "Inaktiv", requesting: "Zugriff wird angefordert", count_in: "Einzähler", recording: "Aufnahme", paused: "Pausiert", ready: "Bereit", error: "Fehler" },
    alignmentSources: { automatic: "Automatisch", manual: "Manuell" },
    eventStatuses: { matched: "Passend", pitch_attention: "Tonhöhe prüfen", rhythm_attention: "Rhythmus prüfen", missing: "Nicht erkannt", polyphonic_unscored: "Polyphon, unbewertet" },
  },
  jianpu: { regionAria: "Interaktives Jianpu", empty: "Für diese Partitur ist keine Jianpu-Notation verfügbar.", note: "Note", rest: "Pause", voice: "Stimme", staff: "System", voiceShort: "St", staffShort: "Sys", eventLabelTemplate: "{kind} {degree}, Stimme {voice}, System {staff}", measureAriaTemplate: "Takt {measure}" },
  waveform: { waveformAria: "Wellenform der Aufnahme", waveformValueTemplate: "{label}: {current} von {duration}. Klicken oder mit den Pfeiltasten springen.", waveformLoading: "Wellenform wird geladen…", waveformUnavailable: "Die Wellenformvorschau ist nicht verfügbar; verwende die Audiosteuerung.", recordingPlayback: "Aufgenommene Übung", practiceSpeed: "Übungsgeschwindigkeit", rateTemplate: "{rate}×" },
} satisfies PlaybackPracticeMessages;
