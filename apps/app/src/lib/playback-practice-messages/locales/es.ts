import type { PlaybackPracticeMessages } from "../types";

export const esPlaybackPracticeMessages = {
  playback: {
    eyebrow: "Práctica de reproducción", title: "Reproductor de práctica por parte con Tone.js", body: "Genera eventos de reproducción para practicar desde el Score JSON actual, con tempo, bucles, metrónomo, cuenta previa y Solo/Mute por parte.",
    load: "Generar eventos", play: "Reproducir", stop: "Detener", tempo: "Tempo en BPM", playhead: "Posición de reproducción", loop: "Repetir sección", loopStart: "Pulso inicial", loopEnd: "Pulso final", metronome: "Metrónomo", countIn: "Cuenta previa de un compás",
    loading: "Generando eventos de reproducción…", ready: "Eventos de reproducción generados.", failed: "No se pudo generar la reproducción.", empty: "Genera los eventos antes de escuchar.", noEvents: "El filtro de partes actual no contiene notas reproducibles.",
    events: "Eventos", activeEvents: "Eventos activos", beats: "Pulsos totales", parts: "Partes", solo: "Solo", mute: "Silenciar", allParts: "Todas las partes", revision: "Revisión",
    speedLadder: "Escalera de tempo", targetTempo: "Tempo objetivo", tempoStep: "Aumento por pasada", ladderComplete: "Escalera de tempo completada.", practiceExports: "Exportaciones de práctica",
    startMeasure: "Compás inicial", endMeasure: "Compás final", byBeat: "Por pulso", partVolume: "Volumen de la parte", diagnostics: "Diagnóstico de reproducción", playbackPath: "Ruta de reproducción", terminated: "Finalización", unreachableMeasures: "Compases inaccesibles",
    markerTemplate: "Compás {measure}", repeatedMarkerTemplate: "Compás {measure}, repetición {occurrence}", jumpsTemplate: "{count} saltos", selectedSoloTemplate: "Solo: {count}", selectedMuteTemplate: "Silenciadas: {count}", soloPartTemplate: "Poner {part} en solo", mutePartTemplate: "Silenciar {part}",
    navigationMeasureTemplate: "Compás {measure}",
    terminationReasons: { end: "Final de la partitura", fine: "Indicación Fine", guard: "Límite de seguridad" },
    navigationActions: { play: "Reproducir el compás", "skip-ending": "Omitir el final de repetición", "repeat-jump": "Volver al inicio de la repetición", "dc-jump": "Ir a D.C.", "ds-jump": "Ir a D.S.", "coda-jump": "Ir a la coda", "fine-stop": "Detenerse en Fine", end: "Llegar al final", "guard-stop": "Detenerse en el límite de seguridad" },
  },
  recorder: {
    title: "Grabación en el navegador y comentarios de práctica Beta", regionAria: "Grabación en el navegador y comentarios de práctica", device: "Micrófono", defaultDevice: "Micrófono predeterminado del sistema", deviceTemplate: "Micrófono {index}", countIn: "Cuenta previa", beatsTemplate: "{count} pulsos",
    start: "Iniciar grabación", requesting: "Solicitando acceso al micrófono…", pause: "Pausar", resume: "Reanudar", stop: "Detener", cancel: "Cancelar", rerecord: "Grabar de nuevo", ready: "La grabación está adjunta a esta entrega. Revísala antes de enviarla.",
    unsupported: "Este navegador no admite MediaRecorder.", denied: "El micrófono no está disponible. Comprueba el permiso del navegador y el dispositivo de entrada.", recordingStatusTemplate: "Grabando {duration}", pausedStatusTemplate: "En pausa {duration}", countInStatusTemplate: "Prepárate: {count}",
    analysis: "Comentarios nota por nota", feedbackAria: "Resultados del análisis de práctica", analyzing: "Alineando la grabación con la partitura…", analysisFailed: "No se pudo analizar esta grabación, pero aún puede enviarse para revisión del docente.", completeness: "Integridad detectada", completenessTemplate: "{detected}/{expected} · {percent}",
    alignment: "Alineación temporal", startOffset: "Inicio de la grabación (segundos)", timeScale: "Escala temporal", applyAlignment: "Aplicar alineación manual", measureTemplate: "Compás {measure}", detectedTemplate: "Detectadas: {detected}/{total}", pitchAttentionTemplate: "Altura a revisar: {count}", rhythmAttentionTemplate: "Ritmo a revisar: {count}", polyphonicTemplate: "Polifonía sin evaluar: {count}", jump: "Escuchar esta nota",
    pitchUnavailable: "altura no disponible", onsetUnavailable: "ataque no disponible", centsTemplate: "{value} cents", onsetTemplate: "{value} ms", feedbackButtonTemplate: "{measure}, {note}: {status}. {action}",
    statuses: { idle: "Inactivo", requesting: "Solicitando acceso", count_in: "Cuenta previa", recording: "Grabando", paused: "En pausa", ready: "Listo", error: "Error" },
    alignmentSources: { automatic: "Automática", manual: "Manual" },
    eventStatuses: { matched: "Coincide", pitch_attention: "Altura a revisar", rhythm_attention: "Ritmo a revisar", missing: "No detectada", polyphonic_unscored: "Polifónica, sin evaluar" },
  },
  jianpu: { regionAria: "Jianpu interactivo", empty: "No hay notación Jianpu disponible para esta partitura.", note: "nota", rest: "silencio", voice: "voz", staff: "pentagrama", voiceShort: "V", staffShort: "P", eventLabelTemplate: "{kind} {degree}, voz {voice}, pentagrama {staff}", measureAriaTemplate: "Compás {measure}" },
  waveform: { waveformAria: "Forma de onda de la grabación", waveformValueTemplate: "{label}: {current} de {duration}. Haz clic o usa las flechas para desplazarte.", waveformLoading: "Cargando la forma de onda…", waveformUnavailable: "La vista previa de la forma de onda no está disponible; usa los controles de audio.", recordingPlayback: "Audio de práctica grabado", practiceSpeed: "Velocidad de práctica", rateTemplate: "{rate}×" },
} satisfies PlaybackPracticeMessages;
