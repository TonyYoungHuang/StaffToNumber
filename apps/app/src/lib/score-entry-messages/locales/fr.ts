import type { ScoreEntryMessages } from "../types";

export const frScoreEntryMessages = {
  pages: {
    library: { eyebrow: "Espace de partitions", title: "Numérisez, gérez et poursuivez le travail sur vos partitions", body: "Importez ici un PDF ou une image de partition, ou ouvrez une partition enregistrée pour continuer à la modifier. Imports, versions candidates et bibliothèque restent réunis dans un même espace." },
    newScore: {
      eyebrow: "Créer une partition", title: "Avec quelle source commencez-vous ?", body: "Choisissez une source. La page suivante n’affichera que les étapes correspondantes.", recommended: "Recommandé", choose: "Choisir",
      choices: {
        scan: { title: "Numériser un PDF ou une image", body: "Pour les partitions imprimées, les scans et les PDF. Un nouveau compte peut créer un projet gratuit à vie à partir d’un PDF multipage complet ou d’une image de partition." },
        jianpu: { title: "Saisir une notation chiffrée", body: "Saisissez les notes chiffrées pour créer une partition sur portée." },
        musicxml: { title: "Importer depuis un logiciel de notation", body: "Pour les fichiers MusicXML exportés depuis MuseScore, Sibelius, Finale et des logiciels similaires." },
        midi: { title: "Importer un fichier MIDI", body: "Transformez les notes et le rythme MIDI en partition." },
        audio: { title: "Importer un enregistrement", body: "Essayez de créer une partition depuis un enregistrement mélodique (fonction expérimentale)." },
        backup: { title: "Restaurer une sauvegarde", body: "Ouvrez une sauvegarde précédemment téléchargée depuis ce site." },
      },
    },
    source: {
      chooseAnother: "Choisir une autre source",
      headings: {
        scan: { eyebrow: "Créer une partition", title: "Numériser un PDF ou une image", body: "Choisissez un fichier et lancez la reconnaissance. Cette page est réservée à la numérisation." },
        jianpu: { eyebrow: "Créer une partition", title: "Créer une portée depuis la notation chiffrée", body: "Saisissez votre notation et créez la partition. Cette page est réservée à la notation chiffrée." },
        musicxml: { eyebrow: "Créer une partition", title: "Importer depuis un logiciel de notation", body: "Choisissez un export MusicXML. Cette page est réservée à l’import de fichier." },
        midi: { eyebrow: "Créer une partition", title: "Créer une partition depuis un fichier MIDI", body: "Choisissez un fichier MIDI. Cette page est réservée à l’import MIDI." },
        audio: { eyebrow: "Créer une partition", title: "Essayer de créer une partition depuis un enregistrement", body: "Choisissez un enregistrement mélodique, puis vérifiez les hauteurs et le rythme générés." },
        backup: { eyebrow: "Créer une partition", title: "Restaurer une sauvegarde", body: "Choisissez une sauvegarde précédemment téléchargée. Cette page est réservée à la restauration." },
      },
    },
  },
  access: { checking: "Vérification de l’accès...", errorFallback: "Impossible de charger le compte actuel." },
  library: {
    signInFirst: "Veuillez d’abord vous connecter.", createNew: "Créer une partition", editable: "Modifiable",
    metrics: {
      projects: { label: "Mes partitions", body: "Toutes les partitions enregistrées apparaissent ici." },
      format: { label: "Prête à modifier", body: "Après la reconnaissance ou l’import, poursuivez la correction, la transposition, le travail et l’export." },
      revisions: { label: "Historique des modifications", body: "Les versions précédentes restent disponibles quand vous en avez besoin." },
    },
    common: { selected: "Sélectionné", importInProgress: "Import en cours...", uploadInProgress: "Envoi en cours...", chooseAnother: "Choisir un autre fichier", clearSelection: "Effacer la sélection" },
    musicxml: {
      chooseFile: "Choisissez un fichier .musicxml, .xml ou .mxl.", importFailed: "Échec de l’import MusicXML.", imported: "Votre partition a été ajoutée à Mes partitions.", eyebrow: "Importer depuis un logiciel de notation", title: "Choisir un fichier MusicXML", body: "Importez un fichier MusicXML exporté depuis MuseScore, Sibelius, Finale ou une autre application de notation, puis continuez à le modifier ici.", dropTitle: "Choisir un fichier", dropBody: "Formats .musicxml, .xml et .mxl acceptés.", empty: "Aucun fichier sélectionné.", button: "Importer le MusicXML",
    },
    scan: {
      chooseFile: "Choisissez un fichier PDF ou image.", importFailed: "Impossible de créer la tâche d’import OMR.", imported: "Votre fichier a été envoyé et la reconnaissance a commencé. Vérifiez-le ensuite dans Mes partitions.", eyebrow: "Reconnaissance de partition", title: "Importer un PDF ou une image de partition", body: "Transformez une partition imprimée ou un PDF en partition vérifiable et corrigible. Une notation complexe peut nécessiter quelques corrections manuelles.", dropTitle: "Choisir un PDF ou une image", dropBody: "Formats PDF, PNG, JPG, WEBP et TIFF acceptés.", empty: "Aucun scan sélectionné.", button: "Lancer la reconnaissance", accessLoading: "Vérification de la numérisation gratuite...", freeEyebrow: "Connecté · modification gratuite", freeBody: "Importez un PDF multipage complet ou une image de partition pour créer votre projet gratuit à vie. Continuez à corriger, lire, transposer, convertir, partager et exporter la partition.", exhaustedEyebrow: "Numérisation gratuite déjà utilisée", exhaustedTitle: "Ce compte a créé son projet de partition gratuit à vie.", exhaustedBody: "Continuez à corriger, lire, transposer, convertir, versionner, partager et exporter cette partition complète. La mise à niveau ne sert qu’à créer et traiter davantage de partitions.", exhaustedLibrary: "Continuer avec la partition gratuite", exhaustedUpgrade: "Activer l’accès complet",
    },
    backup: {
      chooseFile: "Choisissez un fichier de sauvegarde de partition.", importFailed: "Impossible de restaurer la sauvegarde.", imported: "La sauvegarde de votre partition a été restaurée.", eyebrow: "Restaurer une sauvegarde", title: "Choisir une sauvegarde de partition", body: "Restaurez une sauvegarde précédemment téléchargée depuis ce site et poursuivez vos modifications.", dropTitle: "Choisir un fichier de sauvegarde", dropBody: "Formats .score.json et .json acceptés.", empty: "Aucun instantané Score JSON sélectionné.", button: "Restaurer la partition",
    },
    midi: {
      chooseFile: "Choisissez un fichier MIDI.", importFailed: "Échec de l’import MIDI.", imported: "Le fichier MIDI a été converti en projet de partition.", eyebrow: "Importer un fichier MIDI", title: "Choisir un fichier MIDI", body: "Transformez les notes et le rythme MIDI en partition que vous pouvez afficher, lire et transposer. Une gravure complexe peut demander des ajustements manuels.", dropTitle: "Choisir un fichier .mid ou .midi", dropBody: "Fichiers MIDI standard acceptés.", empty: "Aucun fichier MIDI sélectionné.", button: "Importer le MIDI",
    },
    audio: {
      formatLabel: "Audio",
      chooseFile: "Choisissez un fichier audio.", importFailed: "Impossible de créer la tâche de transcription audio.", imported: "Projet de transcription créé. Basic Pitch va tenter de produire un MIDI et une première version modifiable de la partition.", eyebrow: "De l’enregistrement à la partition (expérimental)", title: "Choisir un enregistrement", body: "Importez un enregistrement mélodique et le site tentera de créer une partition modifiable. Les ensembles, le bruit et les harmonies complexes peuvent réduire la précision.", dropTitle: "Choisir un fichier audio", dropBody: "Formats WAV, MP3, M4A, AAC, FLAC, OGG et AIFF acceptés.", empty: "Aucun fichier audio sélectionné.", button: "Lancer la transcription",
    },
    jianpu: {
      empty: "Saisissez une notation Jianpu.", importFailed: "Échec de l’import Jianpu.", imported: "Le projet Jianpu a été créé. L’aperçu, la transposition, la lecture et l’export MusicXML sont disponibles.", eyebrow: "Du Jianpu à la portée", title: "Saisir une notation chiffrée", body: "Saisissez la tonalité, la mesure, les notes chiffrées, les silences et les barres de mesure pour créer une partition lisible, transposable et exportable.", titleLabel: "Titre de la partition", titlePlaceholder: "Exemple : Ah ! vous dirai-je, maman en Jianpu", textLabel: "Notation Jianpu", textPlaceholder: "1=C\n4/4\n1 1 5 5 | 6 6 5 - |", button: "Importer le Jianpu", clear: "Restaurer l’exemple",
    },
    list: { eyebrow: "Mes partitions", title: "Partitions enregistrées", body: "Ouvrez une partition pour poursuivre la correction, la conversion, la transposition, le travail ou l’export.", loading: "Chargement des partitions...", empty: "Aucune partition pour le moment. Créez votre première partition pour la voir apparaître ici.", open: "Ouvrir la partition", revision: "Historique" },
    statuses: { imported: "Importée", candidate: "À corriger", needs_review: "À vérifier", ready: "Prête", archived: "Archivée" },
  },
  trial: {
    previewDeferred: "Cette partition est volumineuse. Chargez l’aperçu MusicXML complet lorsque vous avez besoin de la vue de comparaison OSMD.",
    previewRender: "Charger l’aperçu complet",
    previewEventLabel: "{part} · mesure {measure} · {type} {number}",
    previewNote: "note",
    previewRest: "silence",
    loadingJob: "Chargement de la tâche", preparing: "Préparation de la modification gratuite", loadingScore: "Chargement de la partition...", intro: "Une fois la reconnaissance terminée, le projet gratuit complet permet la correction, la lecture, la transposition, le Jianpu, les versions, le partage et l’export. Mettez à niveau pour traiter davantage de partitions.", unlock: "Activer l’accès complet", back: "Retour à la bibliothèque",
    statuses: { queued: "En attente", processing: "Reconnaissance en cours", completed: "Reconnaissance terminée", failed: "Échec de la reconnaissance", cancelled: "Annulée" },
    failedTitle: "La reconnaissance n’a pas abouti. Vérifiez le fichier en suivant les conseils ci-dessous.", failedBody: "Vérifiez que la page est droite, nette, sans ombre importante ni bord coupé. Une tâche gratuite échouée nécessite une vérification manuelle du quota ; ne lancez pas un nouveau paiement.", technicalDetails: "Détails techniques", reportIssue: "Signaler un problème de reconnaissance", diagnosticsEyebrow: "Diagnostic de reconnaissance", diagnosticsTitle: "Vérifiez la confiance et les avertissements avant de mettre à niveau.", diagnosticsWarning: "Le moteur de reconnaissance a renvoyé un avertissement qui nécessite une vérification manuelle.", confidenceLabel: "Confiance globale", confidenceHelp: "Une confiance faible exige une vérification mesure par mesure.", pagesLabel: "Pages reconnues", pagesHelp: "Le projet gratuit prend en charge un PDF multipage complet.", warningsLabel: "Avertissements", engineFallback: "Diagnostic du moteur de reconnaissance", previewEyebrow: "Aperçu sur portée", previewTitle: "Candidat reconnu par Audiveris", previewEmpty: "L’aperçu de la partition candidate apparaîtra ici à la fin du traitement.", previewLoading: "Rendu de la partition...", previewError: "Le résultat est incomplet et ne peut pas être affiché. Essayez une page plus nette, droite et non rognée, ou contactez l’assistance.", previewRetry: "Relancer le rendu",
  },
  candidate: {
    notationRetry: "Réessayer le rendu",
    notationTechnicalDetails: "Détails techniques",
    notationEventLabel: "{part} · mesure {measure} · {type} {number}",
    notationNote: "note",
    notationRest: "silence",
    freeEyebrow: "Modification gratuite", reviewEyebrow: "Vérification de la partition candidate", freeDescription: "Vous utilisez le projet de partition gratuit à vie. Le résultat de reconnaissance v{revision} peut maintenant être corrigé, et les modifications sont enregistrées comme versions candidates.", reviewDescription: "Le résultat de reconnaissance v{revision} n’est pas encore une version officielle. Comparez-le à la source avant de l’accepter.", back: "Retour aux partitions", processMore: "Traiter plus de partitions", rejecting: "Rejet en cours...", reject: "Rejeter le candidat", accepting: "Acceptation en cours...", accept: "Accepter comme version officielle", safetyEyebrow: "État de sécurité", safetyTitle: "La version candidate ne peut pas remplacer une version officielle existante", freeSafetyBody: "Un compte gratuit peut corriger la partition complète et continuer avec la lecture, la transposition, le Jianpu, les versions, le partage et les exports disponibles. Mettez à niveau pour créer davantage de projets.", reviewSafetyBody: "Les corrections créent de nouvelles versions candidates sans modifier la partition officielle. L’acceptation copie le dernier candidat dans une version officielle, puis active la transposition, la lecture et l’export.", historyGroupLabel: "Annuler et rétablir les corrections candidates", undo: "Annuler la correction", redo: "Rétablir la correction", viewportLabel: "Zone de vérification", syncScroll: "Synchroniser le défilement", zoomGroupLabel: "Zoom de vérification", zoomOut: "Réduire", zoomIn: "Agrandir", fitWidth: "Ajuster à la largeur", notationEyebrow: "Notation candidate", notationTitle: "Aperçu MusicXML sur portée", notationBody: "Sélectionnez les notes dans la partition ou les diagnostics pour examiner les événements candidats.", notationEmpty: "Aucun MusicXML candidat affichable pour le moment.", notationLoading: "Rendu de la notation candidate...", notationError: "Impossible d’afficher le MusicXML candidat.", notationDeferred: "Cette partition est volumineuse. Chargez l’aperçu OSMD complet lorsque vous avez besoin de la vue comparative ; l’éditeur graphique reste disponible.", notationRender: "Charger l’aperçu OSMD complet",
  },
  omr: {
    sources: { "omr-engine": "Moteur de reconnaissance", structural: "Validation structurelle" },
    sourcePreviewFailed: "Impossible de charger la source numérisée.", pageTemplate: "Page {page}", measureTemplate: "mesure {measure}", scanAltTemplate: "Source numérisée de {name}", eyebrow: "Comparaison OMR", title: "Source numérisée et diagnostic de reconnaissance", body: "Les cadres rouges utilisent les coordonnées de symboles Audiveris. Les scores structural valident l’intégrité rythmique et ne sont pas des probabilités du modèle.", issueNavigation: "Navigation entre les problèmes", previous: "Précédent", next: "Suivant", sourceMode: "Mode d’affichage de la source", original: "Original", overlay: "Superposition de diagnostic", issuesOnly: "Problèmes uniquement", scanPages: "Pages numérisées", noSource: "Aucune source PDF ou image n’est jointe à ce projet.", loadingSource: "Chargement de la source numérisée...", geometryWarning: "Les dimensions en pixels de la page diffèrent du relevé de reconnaissance. Relancez la reconnaissance avant de l’approuver.", symbolLayer: "Positions des symboles à faible confiance", pageSymbols: "Symboles de la page", issueSymbols: "Symboles problématiques", problemMeasures: "Mesures problématiques", gradeLabel: "note", contextGradeLabel: "note contextuelle", noDiagnostics: "Aucun diagnostic ne correspond à cette page et à ce filtre.",
  },
} satisfies ScoreEntryMessages;
