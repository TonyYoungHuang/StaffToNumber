import type { PlaybackPracticeMessages } from "../types";

export const frPlaybackPracticeMessages = {
  playback: {
    eyebrow: "Entraînement à la lecture", title: "Lecteur d’entraînement par partie Tone.js", body: "Génère depuis le Score JSON actuel des événements prêts pour l’entraînement, avec tempo, boucles, métronome, décompte et Solo/Mute par partie.",
    load: "Générer les événements", play: "Lire", stop: "Arrêter", tempo: "Tempo en BPM", playhead: "Position de lecture", loop: "Boucler la section", loopStart: "Temps de début", loopEnd: "Temps de fin", metronome: "Métronome", countIn: "Décompte d’une mesure",
    loading: "Génération des événements…", ready: "Événements de lecture générés.", failed: "Impossible de générer la lecture.", empty: "Générez les événements avant l’écoute.", noEvents: "Le filtre de parties actuel ne contient aucune note lisible.",
    events: "Événements", activeEvents: "Événements actifs", beats: "Nombre total de temps", parts: "Parties", solo: "Solo", mute: "Muet", allParts: "Toutes les parties", revision: "Révision",
    speedLadder: "Progression de tempo", targetTempo: "Tempo cible", tempoStep: "Augmentation par passage", ladderComplete: "Progression de tempo terminée.", practiceExports: "Exports d’entraînement",
    startMeasure: "Mesure de début", endMeasure: "Mesure de fin", byBeat: "Par temps", partVolume: "Volume de la partie", diagnostics: "Diagnostic de lecture", playbackPath: "Parcours de lecture", terminated: "Fin", unreachableMeasures: "Mesures inaccessibles",
    markerTemplate: "Mesure {measure}", repeatedMarkerTemplate: "Mesure {measure}, reprise {occurrence}", jumpsTemplate: "{count} sauts", selectedSoloTemplate: "Solo : {count}", selectedMuteTemplate: "Muet : {count}", soloPartTemplate: "Mettre {part} en solo", mutePartTemplate: "Couper {part}",
    navigationMeasureTemplate: "Mesure {measure}",
    terminationReasons: { end: "Fin de la partition", fine: "Indication Fine", guard: "Limite de sécurité" },
    navigationActions: { play: "Lire la mesure", "skip-ending": "Ignorer la fin de reprise", "repeat-jump": "Revenir au début de la reprise", "dc-jump": "Aller à D.C.", "ds-jump": "Aller à D.S.", "coda-jump": "Aller à la coda", "fine-stop": "S’arrêter à Fine", end: "Atteindre la fin", "guard-stop": "S’arrêter à la limite de sécurité" },
  },
  recorder: {
    title: "Enregistrement navigateur et retour d’entraînement Beta", regionAria: "Enregistrement navigateur et retour d’entraînement", device: "Microphone", defaultDevice: "Microphone par défaut du système", deviceTemplate: "Microphone {index}", countIn: "Décompte", beatsTemplate: "{count} temps",
    start: "Démarrer l’enregistrement", requesting: "Demande d’accès au microphone…", pause: "Suspendre", resume: "Reprendre", stop: "Arrêter", cancel: "Annuler", rerecord: "Réenregistrer", ready: "L’enregistrement est joint à ce devoir. Vérifiez-le avant l’envoi.",
    unsupported: "Ce navigateur ne prend pas en charge MediaRecorder.", denied: "Le microphone est indisponible. Vérifiez l’autorisation du navigateur et le périphérique d’entrée.", recordingStatusTemplate: "Enregistrement {duration}", pausedStatusTemplate: "En pause {duration}", countInStatusTemplate: "Préparez-vous : {count}",
    analysis: "Retour note par note", feedbackAria: "Résultats de l’analyse d’entraînement", analyzing: "Alignement de l’enregistrement sur la partition…", analysisFailed: "Cet enregistrement n’a pas pu être analysé, mais il peut être envoyé pour une correction par l’enseignant.", completeness: "Complétude détectée", completenessTemplate: "{detected}/{expected} · {percent}",
    alignment: "Alignement temporel", startOffset: "Début de l’enregistrement (secondes)", timeScale: "Échelle temporelle", applyAlignment: "Appliquer l’alignement manuel", measureTemplate: "Mesure {measure}", detectedTemplate: "Détectées : {detected}/{total}", pitchAttentionTemplate: "Hauteur à vérifier : {count}", rhythmAttentionTemplate: "Rythme à vérifier : {count}", polyphonicTemplate: "Polyphonie non notée : {count}", jump: "Écouter cette note",
    pitchUnavailable: "hauteur indisponible", onsetUnavailable: "attaque indisponible", centsTemplate: "{value} cents", onsetTemplate: "{value} ms", feedbackButtonTemplate: "{measure}, {note} : {status}. {action}",
    statuses: { idle: "Inactif", requesting: "Demande d’accès", count_in: "Décompte", recording: "Enregistrement", paused: "En pause", ready: "Prêt", error: "Erreur" },
    alignmentSources: { automatic: "Automatique", manual: "Manuel" },
    eventStatuses: { matched: "Conforme", pitch_attention: "Hauteur à vérifier", rhythm_attention: "Rythme à vérifier", missing: "Manquante", polyphonic_unscored: "Polyphonique, non notée" },
  },
  jianpu: { regionAria: "Jianpu interactif", empty: "Aucune notation Jianpu n’est disponible pour cette partition.", note: "note", rest: "silence", voice: "voix", staff: "portée", voiceShort: "V", staffShort: "P", eventLabelTemplate: "{kind} {degree}, voix {voice}, portée {staff}", measureAriaTemplate: "Mesure {measure}" },
  waveform: { waveformAria: "Forme d’onde de l’enregistrement", waveformValueTemplate: "{label} : {current} sur {duration}. Cliquez ou utilisez les flèches pour vous déplacer.", waveformLoading: "Chargement de la forme d’onde…", waveformUnavailable: "L’aperçu de la forme d’onde est indisponible ; utilisez les commandes audio.", recordingPlayback: "Audio de l’entraînement enregistré", practiceSpeed: "Vitesse d’entraînement", rateTemplate: "{rate}×" },
} satisfies PlaybackPracticeMessages;
