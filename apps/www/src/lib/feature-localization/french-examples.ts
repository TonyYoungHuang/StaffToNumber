import type { FeatureTranslationSlug } from "./types";

/** Localize the explanation, preserving the musical data and downloadable files. */
export const frenchFeatureExamples = {
  "staff-to-jianpu": { input: "MusicXML en do majeur : C4 D4 E4 G4, une mesure à 4/4.", output: "Notation chiffrée : 1 2 3 5, avec la tonalité, les durées et les mesures conservées." },
  "jianpu-to-staff": { input: "Texte Jianpu structuré : 1=C, mesure à 4/4, mélodie 1 2 3 5.", output: "Partition modifiable avec les notes C4 D4 E4 G4, consultable sur portée et exportable en MusicXML." },
  "transpose-score": { input: "Do majeur : C4 D4 E4 G4. Transposition de +2 demi-tons.", output: "Ré majeur : D4 E4 F♯4 A4, dans une nouvelle version qui conserve la partition d’origine." },
  "score-editor": { input: "Une noire E4 dans la mesure 2 d’une partition importée.", output: "Une croche F♯4 dans une nouvelle version de la partition ; la version précédente reste disponible." },
  "score-to-audio": { input: "Partition réglée à 96 battements par minute, avec une boucle de quatre mesures.", output: "Lecture de la boucle et fichiers MIDI, WAV ou MP3 selon les formats disponibles." },
  "audio-to-score": { input: "Court enregistrement monophonique au format WAV ou MP3, utilisé avec autorisation.", output: "Première transcription MIDI et partition modifiable à vérifier et à corriger. Cette fonction est expérimentale." },
  "musicxml-midi": { input: "Fichier MusicXML ou MIDI contenant des notes, un tempo et des mesures.", output: "Partition modifiable, avec export MusicXML ou MIDI et rendu PDF ou image selon les formats disponibles." },
  "sheet-music-scanner": { input: "PDF ou image nette d’une partition sur portée.", output: "Proposition MusicXML modifiable, accompagnée d’indications pour repérer les passages à vérifier." },
  "pdf-to-musicxml": { input: "PDF ou image d’une partition que vous êtes autorisé à traiter.", output: "Proposition MusicXML à vérifier : corrigez les notes et les rythmes avant de télécharger la version retenue." },
  teaching: { input: "Partition de référence de l’enseignant, consignes et critères d’un devoir.", output: "Devoir partagé avec la classe, travaux des élèves et commentaires de l’enseignant. Les fonctions de classe sont en bêta." },
  pricing: { input: "Choix de Starter ou Converter Pro, pour un mois ou un an.", output: "Accès associé au compte après confirmation du paiement, avec ou sans renouvellement automatique selon le choix effectué." },
} satisfies Record<FeatureTranslationSlug, { input: string; output: string }>;
