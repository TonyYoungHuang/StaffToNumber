import type { FeatureTranslationSlug } from "./types";

/** Descriptions only; musical data and example downloads are unchanged. */
export const spanishFeatureExamples = {
  "staff-to-jianpu": { input: "MusicXML en do mayor: C4 D4 E4 G4 en un compás de 4/4.", output: "Notación numerada: 1 2 3 5, conservando la tonalidad, las duraciones y los compases." },
  "jianpu-to-staff": { input: "Texto Jianpu estructurado: 1=C, compás de 4/4, melodía 1 2 3 5.", output: "Partitura editable con C4 D4 E4 G4, visible en pentagrama y exportable como MusicXML." },
  "transpose-score": { input: "Do mayor: C4 D4 E4 G4. Transposición de +2 semitonos.", output: "Re mayor: D4 E4 F♯4 A4 en una nueva revisión que conserva la partitura original." },
  "score-editor": { input: "Una negra E4 en el segundo compás de una partitura importada.", output: "Una corchea F♯4 en una nueva revisión; la versión anterior sigue disponible." },
  "score-to-audio": { input: "Partitura a 96 pulsaciones por minuto con un bucle de cuatro compases.", output: "Reproducción del bucle y archivos MIDI, WAV o MP3 según los formatos disponibles." },
  "audio-to-score": { input: "Grabación corta de una melodía monofónica en WAV o MP3, utilizada con autorización.", output: "Ejemplo experimental de transcripción MIDI y partitura editable que requiere revisión. Consulta la disponibilidad antes de intentar importar audio." },
  "musicxml-midi": { input: "Archivo MusicXML o MIDI con notas, tempo y compases.", output: "Partitura editable, exportable como MusicXML o MIDI y como PDF o imagen según los formatos disponibles." },
  "sheet-music-scanner": { input: "PDF o imagen nítida de una partitura en pentagrama.", output: "Propuesta MusicXML editable con indicaciones de los pasajes que necesitan revisión." },
  "pdf-to-musicxml": { input: "PDF o imagen de una partitura que tienes permiso para procesar.", output: "Propuesta MusicXML que debes revisar: corrige notas y ritmos antes de descargar la versión aceptada." },
  teaching: { input: "Partitura de referencia del docente, instrucciones y criterios de una tarea.", output: "Tarea compartida, entregas de estudiantes y comentarios del docente. Las funciones de clase están en beta." },
  pricing: { input: "Starter o Converter Pro, con acceso de un mes o un año.", output: "Acceso vinculado a la cuenta tras confirmarse el pago, con o sin renovación automática según la modalidad elegida." },
} satisfies Record<FeatureTranslationSlug, { input: string; output: string }>;
