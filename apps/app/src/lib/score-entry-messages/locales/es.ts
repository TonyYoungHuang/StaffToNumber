import type { ScoreEntryMessages } from "../types";

export const esScoreEntryMessages = {
  reviewEntry: {
    "label": "Revisión de escaneos",
    "titles": {
      "one": "Una partitura escaneada espera tu revisión",
      "few": "{count} partituras escaneadas esperan tu revisión",
      "many": "{count} partituras escaneadas esperan tu revisión",
      "other": "{count} partituras escaneadas esperan tu revisión"
    },
    "body": "Compara el resultado con el original y confírmalo cuando estés conforme.",
    "continue": "Continuar la revisión",
    "all": "Ver todos los escaneos pendientes",
    "emptyTitle": "No hay escaneos pendientes de revisión",
    "emptyBody": "Tu próximo escaneo aparecerá aquí cuando esté listo. También puedes seguir trabajando en una partitura guardada.",
    "upload": "Subir una partitura",
    "loading": "Buscando escaneos para revisar…",
    "failed": "No pudimos consultar tus escaneos. Inténtalo de nuevo.",
    "retry": "Reintentar"
  },
  pages: {
    library: { eyebrow: "Espacio de partituras", title: "Reconoce, gestiona y sigue trabajando en tus partituras", body: "Sube aquí un PDF o una imagen de partitura, o abre una partitura guardada para seguir editando. Las cargas, los candidatos y la biblioteca permanecen en un mismo espacio." },
    newScore: {
      eyebrow: "Crear una partitura", title: "¿Con qué material vas a empezar?", body: "Elige una fuente. La página siguiente mostrará solo los pasos correspondientes.", recommended: "Recomendado", choose: "Elegir",
      choices: {
        scan: { title: "Escanear un PDF o una imagen", body: "Para música impresa, escaneos y PDF. Las cuentas nuevas pueden crear un proyecto gratuito para siempre a partir de un PDF multipágina completo o una imagen de partitura." },
        jianpu: { title: "Introducir notación numérica", body: "Introduce notas numéricas para crear una partitura en pentagrama." },
        musicxml: { title: "Importar desde un programa de notación", body: "Para archivos MusicXML exportados desde MuseScore, Sibelius, Finale y aplicaciones similares." },
        midi: { title: "Importar MIDI", body: "Convierte las notas y el ritmo MIDI en una partitura." },
        audio: { title: "Subir una grabación", body: "Intenta crear una partitura desde una grabación melódica (función experimental)." },
        backup: { title: "Restaurar una copia de seguridad", body: "Abre una copia descargada anteriormente desde este sitio." },
      },
    },
    source: {
      chooseAnother: "Elegir otra fuente",
      headings: {
        scan: { eyebrow: "Crear una partitura", title: "Escanear un PDF o una imagen", body: "Elige un archivo e inicia el reconocimiento. Esta página es solo para escanear." },
        jianpu: { eyebrow: "Crear una partitura", title: "Crear un pentagrama desde notación numérica", body: "Introduce la notación y crea la partitura. Esta página es solo para notación numérica." },
        musicxml: { eyebrow: "Crear una partitura", title: "Importar desde un programa de notación", body: "Elige una exportación MusicXML. Esta página es solo para importar archivos." },
        midi: { eyebrow: "Crear una partitura", title: "Crear una partitura desde MIDI", body: "Elige un archivo MIDI. Esta página es solo para importar MIDI." },
        audio: { eyebrow: "Crear una partitura", title: "Intentar crear una partitura desde una grabación", body: "Elige una grabación melódica y revisa las alturas y el ritmo generados." },
        backup: { eyebrow: "Crear una partitura", title: "Restaurar una copia de seguridad", body: "Elige una copia descargada anteriormente. Esta página es solo para restaurar." },
      },
    },
  },
  access: { checking: "Comprobando el acceso...", errorFallback: "No se pudo cargar la cuenta actual." },
  library: {
    signInFirst: "Primero debes iniciar sesión.", createNew: "Crear una partitura", editable: "Editable",
    metrics: {
      projects: { label: "Mis partituras", body: "Todas las partituras que guardes aparecerán aquí." },
      format: { label: "Lista para editar", body: "Después del reconocimiento o la importación, sigue corrigiendo, transportando, practicando y exportando." },
      revisions: { label: "Historial de edición", body: "Las versiones anteriores siguen disponibles cuando las necesites." },
    },
    common: { selected: "Seleccionado", importInProgress: "Importando...", uploadInProgress: "Subiendo...", chooseAnother: "Elegir otro archivo", clearSelection: "Borrar selección" },
    musicxml: {
      chooseFile: "Elige un archivo .musicxml, .xml o .mxl.", importFailed: "No se pudo importar el MusicXML.", imported: "La partitura se añadió a Mis partituras.", eyebrow: "Importar desde un programa de notación", title: "Elegir un archivo MusicXML", body: "Importa un MusicXML exportado desde MuseScore, Sibelius, Finale u otra aplicación de notación y sigue editándolo aquí.", dropTitle: "Elegir un archivo", dropBody: "Admite archivos .musicxml, .xml y .mxl.", empty: "Todavía no has elegido ningún archivo.", button: "Importar MusicXML",
    },
    scan: {
      chooseFile: "Elige un archivo PDF o de imagen.", importFailed: "No se pudo crear la tarea de importación OMR.", imported: "El archivo se ha subido y el reconocimiento ha comenzado. Revísalo después en Mis partituras.", eyebrow: "Reconocimiento de partituras", title: "Subir un PDF o una imagen de partitura", body: "Convierte una partitura impresa o PDF en una partitura que puedas revisar y corregir. La notación compleja puede requerir algunas correcciones manuales.", dropTitle: "Elegir un PDF o una imagen", dropBody: "Admite PDF, PNG, JPG, WEBP y TIFF.", empty: "Todavía no has elegido ningún escaneo.", button: "Iniciar reconocimiento", accessLoading: "Comprobando la disponibilidad del escaneo gratuito...", freeEyebrow: "Sesión iniciada · edición gratuita", freeBody: "Sube un PDF multipágina completo o una imagen de partitura para crear tu proyecto gratuito para siempre. Sigue corrigiendo, reproduciendo, transportando, convirtiendo, compartiendo y exportando.", exhaustedEyebrow: "Escaneo gratuito ya utilizado", exhaustedTitle: "Esta cuenta ya ha creado su proyecto de partitura gratuito para siempre.", exhaustedBody: "Sigue corrigiendo, reproduciendo, transportando, convirtiendo, versionando, compartiendo y exportando esa partitura completa. Mejora el plan solo para crear y procesar más partituras.", exhaustedLibrary: "Continuar con la partitura gratuita", exhaustedUpgrade: "Activar acceso completo",
    },
    backup: {
      chooseFile: "Elige un archivo de copia de seguridad.", importFailed: "No se pudo restaurar la copia.", imported: "Se ha restaurado la copia de seguridad de tu partitura.", eyebrow: "Restaurar una copia", title: "Elegir una copia de seguridad", body: "Restaura una copia descargada anteriormente desde este sitio y sigue editando la partitura.", dropTitle: "Elegir un archivo de copia", dropBody: "Admite archivos .score.json y .json.", empty: "Todavía no has elegido ninguna instantánea de Score JSON.", button: "Restaurar partitura",
    },
    midi: {
      chooseFile: "Elige un archivo MIDI.", importFailed: "No se pudo importar el MIDI.", imported: "El MIDI se convirtió en un proyecto de partitura.", eyebrow: "Importar MIDI", title: "Elegir un archivo MIDI", body: "Convierte las notas y el ritmo MIDI en una partitura que puedas ver, reproducir y transportar. La maquetación compleja puede necesitar ajustes manuales.", dropTitle: "Elegir un archivo .mid o .midi", dropBody: "Admite archivos MIDI estándar.", empty: "Todavía no has elegido ningún archivo MIDI.", button: "Importar MIDI",
    },
    audio: {
      formatLabel: "Audio",
      chooseFile: "Elige un archivo de audio.", importFailed: "No se pudo crear la tarea de transcripción de audio.", imported: "Se creó el proyecto de transcripción. Basic Pitch intentará crear un MIDI y una primera versión editable de la partitura.", eyebrow: "De grabación a partitura (experimental)", title: "Elegir una grabación", body: "Sube una grabación melódica y el sitio intentará crear una partitura editable. Los conjuntos, el ruido y la armonía compleja pueden reducir la precisión.", dropTitle: "Elegir un archivo de audio", dropBody: "Admite WAV, MP3, M4A, AAC, FLAC, OGG y AIFF.", empty: "Todavía no has elegido ningún audio.", button: "Iniciar transcripción",
    },
    jianpu: {
      empty: "Introduce texto Jianpu.", importFailed: "No se pudo importar el Jianpu.", imported: "Se creó el proyecto Jianpu. Ya puedes previsualizar, transportar, reproducir y exportar MusicXML.", eyebrow: "De Jianpu a pentagrama", title: "Introducir notación numérica", body: "Introduce la tonalidad, el compás, las notas numéricas, los silencios y las barras para crear una partitura que puedas reproducir, transportar y exportar.", titleLabel: "Título de la partitura", titlePlaceholder: "Ejemplo: Estrellita en Jianpu", textLabel: "Texto Jianpu", textPlaceholder: "1=C\n4/4\n1 1 5 5 | 6 6 5 - |", button: "Importar Jianpu", clear: "Restaurar ejemplo",
    },
    list: { eyebrow: "Mis partituras", title: "Partituras guardadas", body: "Abre una partitura para seguir corrigiendo, convirtiendo, transportando, practicando o exportando.", loading: "Cargando partituras...", empty: "Todavía no hay partituras. Crea la primera y aparecerá aquí.", open: "Abrir partitura", revision: "Historial" },
    statuses: { imported: "Importada", candidate: "Necesita corrección", needs_review: "Necesita revisión", ready: "Lista", archived: "Archivada" },
  },
  trial: {
    previewDeferred: "Esta partitura es grande. Carga la vista previa MusicXML completa cuando necesites la vista comparativa de OSMD.",
    previewRender: "Cargar vista previa completa",
    previewEventLabel: "{part} · compás {measure} · {type} {number}",
    previewNote: "nota",
    previewRest: "silencio",
    loadingJob: "Cargando tarea", preparing: "Preparando la edición gratuita", loadingScore: "Cargando partitura...", intro: "Cuando termine el reconocimiento, el proyecto gratuito completo permitirá corregir, reproducir, transportar, usar Jianpu, conservar versiones, compartir y exportar. Mejora el plan para procesar más partituras.", unlock: "Activar acceso completo", back: "Volver a la biblioteca",
    statuses: { queued: "En cola", processing: "Reconociendo", completed: "Reconocimiento completado", failed: "Error de reconocimiento", cancelled: "Cancelada" },
    failedTitle: "El reconocimiento no terminó. Revisa el archivo con las indicaciones siguientes.", failedBody: "Comprueba que la página esté derecha, enfocada y sin sombras grandes ni bordes recortados. Una tarea gratuita fallida necesita una revisión manual de la cuota; no inicies otro pago.", technicalDetails: "Detalles técnicos", reportIssue: "Informar de un problema de reconocimiento", diagnosticsEyebrow: "Diagnóstico de reconocimiento", diagnosticsTitle: "Revisa la confianza y las advertencias antes de mejorar el plan.", diagnosticsWarning: "El motor de reconocimiento devolvió una advertencia que necesita revisión manual.", confidenceLabel: "Confianza general", confidenceHelp: "Una confianza baja requiere revisar compás por compás.", pagesLabel: "Páginas reconocidas", pagesHelp: "El proyecto gratuito admite un PDF multipágina completo.", warningsLabel: "Advertencias", engineFallback: "Diagnóstico del motor de reconocimiento", previewEyebrow: "Vista previa en pentagrama", previewTitle: "Candidato reconocido por Audiveris", previewEmpty: "La vista previa del candidato aparecerá aquí cuando termine el procesamiento.", previewLoading: "Renderizando el pentagrama...", previewError: "El resultado está incompleto y no puede mostrarse. Prueba una página más clara, derecha y sin recortes, o contacta con soporte.", previewRetry: "Volver a renderizar",
  },
  candidate: {
    compareSource: "Comparar con el original",
    confirmationHelp: "Compara con el original y haz las correcciones necesarias; después confirma toda la partitura para usar la versión revisada.",
    notationRetry: "Volver a renderizar",
    notationTechnicalDetails: "Detalles técnicos",
    notationEventLabel: "{part} · compás {measure} · {type} {number}",
    notationNote: "nota",
    notationRest: "silencio",
    freeEyebrow: "Edición gratuita", reviewEyebrow: "Revisión de la partitura candidata", freeDescription: "Estás en el proyecto de partitura gratuito para siempre. Ya puedes corregir el resultado v{revision}, y los cambios se guardan como versiones candidatas.", reviewDescription: "El resultado v{revision} todavía no es una versión oficial. Compáralo con la fuente antes de aceptarlo.", back: "Volver a las partituras", processMore: "Procesar más partituras", rejecting: "Rechazando...", reject: "Rechazar candidato", accepting: "Aceptando...", accept: "Confirmar esta partitura", safetyEyebrow: "Estado seguro", safetyTitle: "La versión candidata no puede sobrescribir una versión oficial existente", freeSafetyBody: "Una cuenta gratuita puede corregir la partitura completa y seguir usando la reproducción, el transporte, Jianpu, las versiones, el uso compartido y las exportaciones disponibles. Mejora el plan para crear más proyectos.", reviewSafetyBody: "Las correcciones crean nuevas versiones candidatas sin cambiar la partitura oficial. Al aceptar se copia el candidato más reciente en una versión oficial y se habilitan el transporte, la reproducción y la exportación.", historyGroupLabel: "Deshacer y rehacer correcciones del candidato", undo: "Deshacer corrección", redo: "Rehacer corrección", viewportLabel: "Vista de revisión", syncScroll: "Sincronizar desplazamiento", zoomGroupLabel: "Zoom de revisión", zoomOut: "Alejar", zoomIn: "Acercar", fitWidth: "Ajustar al ancho", notationEyebrow: "Notación candidata", notationTitle: "Vista previa MusicXML en pentagrama", notationBody: "Selecciona notas en la partitura o en los diagnósticos para inspeccionar los eventos candidatos.", notationEmpty: "Todavía no hay un MusicXML candidato que se pueda renderizar.", notationLoading: "Renderizando la notación candidata...", notationError: "No se pudo renderizar el MusicXML candidato.", notationDeferred: "Esta partitura es grande. Carga la vista previa completa de OSMD cuando necesites compararla; el editor gráfico sigue disponible.", notationRender: "Cargar vista previa completa de OSMD",
  },
  omr: {
    symbolLabel: "Símbolo",
    summary: "{count} lugares necesitan una revisión. Compáralos con el original antes de confirmar.",
    noIssues: "No se marcaron dudas. Aun así, compara algunos pasajes con el original.",
    checkLabel: "Revisar",
    noFlagLabel: "Sin dudas marcadas",
    noLocation: "No podemos señalar con precisión la nota o el recuadro correspondiente. Revisa la página o el compás indicado.",
    technicalDetails: "Detalles técnicos",
    technicalHelp: "Las puntuaciones de reconocimiento son pistas, no porcentajes de exactitud. Aquí conservamos los diagnósticos originales para investigar problemas.",
    reasons: {"uncertainSymbol":"Este símbolo puede haberse leído mal. Compáralo con el original.","rhythm":"Los tiempos de este compás podrían no cuadrar. Revisa las notas y los silencios.","duration":"La duración de esta nota o silencio no está clara. Comprueba cuántos tiempos debe durar.","durationType":"No se pudo leer la duración de la nota o el silencio. Comprueba su forma en el original.","timeSignature":"La indicación de compás no está clara. Comprueba los tiempos indicados al principio de la partitura.","unknown":"Este pasaje necesita otra mirada. Compáralo con el original."},
    sources: { "omr-engine": "Motor de reconocimiento", structural: "Validación estructural" },
    sourcePreviewFailed: "No se pudo cargar la fuente escaneada.", pageTemplate: "Página {page}", measureTemplate: "compás {measure}", scanAltTemplate: "Fuente escaneada de {name}", eyebrow: "Comparación OMR", title: "Comparar con el original", body: "Comprueba los pasajes dudosos en el original. Una marca pide que revises, no confirma que haya un error.", issueNavigation: "Navegación por problemas", previous: "Anterior", next: "Siguiente", sourceMode: "Modo de visualización de la fuente", original: "Ver original", overlay: "Mostrar lugares dudosos", issuesOnly: "Solo problemas", scanPages: "Páginas escaneadas", noSource: "Este proyecto no tiene una fuente PDF o de imagen para previsualizar.", loadingSource: "Cargando la fuente escaneada...", geometryWarning: "Las dimensiones en píxeles de la página no coinciden con el registro de reconocimiento. Vuelve a reconocer el archivo antes de aprobarlo.", symbolLayer: "Posiciones de símbolos con baja confianza", pageSymbols: "Símbolos de la página", issueSymbols: "Símbolos con problemas", problemMeasures: "Compases con problemas", gradeLabel: "valoración", contextGradeLabel: "valoración contextual", noDiagnostics: "No hay dudas marcadas en esta página con este filtro. Puedes seguir comparando con el original.",
  },
} satisfies ScoreEntryMessages;
