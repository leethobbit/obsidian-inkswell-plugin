/** French UI strings — the `app` area (mirrors ../en/app.ts). */
import type { Catalog } from "../types";

export const app: Catalog = {
  // --- Plugin load -----------------------------------------------------------
  "app.hoverSource": "Éditeur Écrire d’Inkswell",
  "app.ribbon": "Projets Inkswell",
  "app.recovered":
    "Inkswell n’a pas pu lire son fichier de données : vos paramètres et votre historique d’écriture ont été chargés depuis la sauvegarde du {date}. Les modifications faites après cette date peuvent manquer.",
  "app.recoveredKept":
    "Inkswell n’a pas pu lire son fichier de données : vos paramètres et votre historique d’écriture ont été chargés depuis la sauvegarde du {date}. Les modifications faites après cette date peuvent manquer. Le fichier illisible a été conservé sous le nom {file}.",
  "app.categoryNotice":
    "Les objectifs d’Inkswell ne comptent désormais que les mots des projets. Choisissez ce qui compte (scènes, planification, codex) dans Paramètres → Inkswell.",

  // --- Commands --------------------------------------------------------------
  "app.command.openProjects": "Ouvrir les projets",
  "app.command.newProject": "Nouveau projet",
  "app.command.renameProject": "Renommer le projet",
  "app.command.archiveProject": "Archiver le projet actuel",
  "app.command.unarchiveProject": "Désarchiver le projet actuel",
  "app.command.setUpChallenge": "Configurer un défi d’écriture",
  "app.command.exportStoryBible": "Exporter la bible de l’histoire",
  "app.command.newScene": "Nouvelle scène",
  "app.command.sortByChapter": "Trier les scènes par numéro de chapitre",
  "app.command.openBeats": "Ouvrir la grille des temps forts (Planifier)",
  "app.command.openBoard": "Ouvrir le tableau (Planifier)",
  "app.command.openPlotGrid": "Ouvrir la grille d’intrigue (Planifier)",
  "app.command.openCodex": "Ouvrir le codex",
  "app.command.openWrite": "Ouvrir Écrire",
  "app.command.openStats": "Ouvrir les statistiques d’écriture (Suivi)",
  "app.command.openCompile": "Ouvrir la compilation (Publier)",
  "app.command.compileActive": "Compiler le projet actif",
  "app.command.searchScenes": "Rechercher dans les scènes",
  "app.command.insertTodo": "Insérer un marqueur de tâche…",
  "app.command.toggleBold": "Activer/désactiver le gras (éditeur Écrire)",
  "app.command.toggleItalic": "Activer/désactiver l’italique (éditeur Écrire)",
  "app.command.toggleStrikethrough": "Activer/désactiver le barré (éditeur Écrire)",
  "app.command.splitScene": "Scinder la scène au curseur (éditeur Écrire)",
  "app.command.toggleStream": "Activer/désactiver le fil des scènes (Écrire)",
  "app.command.jumpToChapter": "Aller au chapitre… (fil des scènes)",
  "app.command.nextChapter": "Chapitre suivant (fil des scènes)",
  "app.command.previousChapter": "Chapitre précédent (fil des scènes)",
  "app.command.moveSelection": "Déplacer la sélection vers une nouvelle scène (éditeur Écrire)",
  "app.command.quickCodex": "Créer une fiche du codex depuis la sélection (éditeur Écrire)",
  "app.command.openLink": "Ouvrir le lien au curseur (éditeur Écrire)",
  "app.command.toggleTypewriter": "Activer/désactiver le mode machine à écrire (éditeur Écrire)",
  "app.typewriterOn": "Mode machine à écrire activé",
  "app.typewriterOff": "Mode machine à écrire désactivé",
  "app.command.startSprint": "Lancer un sprint d’écriture",
  "app.command.endSprint": "Terminer le sprint en cours maintenant",
  "app.command.cancelSprint": "Annuler le sprint en cours",
  "app.command.setWordTarget": "Définir l’objectif de mots du projet actif",
  "app.command.logRevision": "Consigner une décision de révision",
  "app.notInProject": "Le fichier actif ne fait partie d’aucun projet Inkswell.",
  "app.command.openRevisions": "Ouvrir le journal de révision",
  "app.command.openAnalysis": "Ouvrir l’analyse (Réviser)",
  "app.command.openHelp": "Ouvrir l’aide",
  "app.command.openCustomize": "Ouvrir Personnaliser",
  "app.command.restoreSettings": "Restaurer les paramètres depuis une sauvegarde",
  "app.command.manageFeatures": "Gérer les fonctionnalités",
  "app.command.quickCapture": "Noter une idée en vitesse",

  // --- Settings backups ------------------------------------------------------
  "app.noBackups": "Inkswell n’a encore aucune sauvegarde. Une sauvegarde est créée chaque jour où vous ouvrez Obsidian.",
  "app.settingsRestored":
    "Paramètres restaurés depuis la sauvegarde du {date}. Votre historique d’écriture et vos idées n’ont pas été modifiés.",

  // --- Ideas inbox -----------------------------------------------------------
  "app.capture.title": "Capture rapide",
  "app.capture.cta": "Capturer",
  "app.capture.done": "Idée capturée.",
  "app.idea.saveFailed": "Impossible d’enregistrer l’idée sous forme de note.",
  "app.idea.saved": "Enregistrée dans {path}",

  // --- Compile, archive, project lookup --------------------------------------
  "app.compile.noProject": "Aucun projet actif à compiler. Ouvrez d’abord un projet dans Inkswell.",
  "app.archive.archived": "« {title} » archivé. Vous le trouverez sous Archivés, dans Accueil.",
  "app.archive.restored": "« {title} » est de retour dans Accueil.",
  "app.archive.seriesArchived": "Série « {name} » archivée. Vous la trouverez sous Archivés, dans Accueil.",
  "app.archive.seriesRestored": "La série « {name} » est de retour dans Accueil.",
  "app.noProject": "Aucun projet Inkswell trouvé. Créez-en un avec la commande Nouveau projet.",
};
