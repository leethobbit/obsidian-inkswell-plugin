/** French UI strings — the `settings` area (mirrors ../en/settings.ts). */
import type { Catalog } from "../types";

export const settings: Catalog = {
  // --- Settings tab ------------------------------------------------------------
  "settings.customize.name": "Personnaliser Inkswell",
  "settings.customize.desc":
    "Types et champs du codex, modèles de départ, structures de temps forts, statuts des scènes, amorces d’écriture, listes de contrôle et fonctionnalités affichées — tout se modifie dans Inkswell.",
  "settings.customize.button": "Ouvrir Personnaliser",
  "settings.defaultCompileFormat.name": "Format de compilation par défaut",
  "settings.defaultCompileFormat.desc": "Format présélectionné à l’ouverture de la fenêtre de compilation.",
  "settings.showWordCounts.name": "Afficher le nombre de mots",
  "settings.showWordCounts.desc": "Affiche le nombre de mots par scène et par projet dans l’explorateur.",
  "settings.hideArchived.name": "Retirer les livres archivés de leur série",
  "settings.hideArchived.desc":
    "Un livre archivé quitte l’étagère de sa série et les couvertures de la série dans Accueil, et attend sous le nom de sa série dans la section Archivés — pratique pour les nouvelles que vous archivez une fois publiées. Désactivé, les livres archivés restent sur l’étagère de la série, estompés.",
  "settings.syncHistory.name": "Synchroniser l’historique d’écriture entre appareils",
  "settings.syncHistory.desc":
    "Les mots sont comptés sur l’appareil où vous les tapez. Activez cette option pour tenir une petite note de journal par appareil dans le dossier « Writing log » de votre dossier de base, et les fusionner dans Suivi : vos séries et vos totaux incluent alors tous vos appareils. La synchronisation de votre coffre (Obsidian Sync, iCloud…) transporte les notes.",
  "settings.sceneHeadingLevel.name": "Niveau de titre des scènes",
  "settings.sceneHeadingLevel.desc": "Niveau de titre (1–6) pour l’étape de compilation facultative « Ajouter le titre ».",

  // --- Settings → Manuscript -------------------------------------------------
  "settings.manuscript.heading": "Manuscrit",
  "settings.authorName.name": "Votre nom",
  "settings.authorName.desc":
    "Votre nom légal, pour la page de titre des manuscrits Word. La signature d’un livre (nom de plume) peut être différente — définissez-la dans Publier → Compiler.",
  "settings.authorContact.name": "Coordonnées",
  "settings.authorContact.desc":
    "Adresse, e-mail, téléphone — un par ligne, sous votre nom sur la page de titre.",
  "settings.compileFormat.md": "Markdown",
  "settings.compileFormat.html": "HTML",
  "settings.compileFormat.docx": "Word (.docx)",
  "settings.compileFormat.pandoc": "Pandoc (docx/pdf/epub)",
  "settings.interfaceLanguage.name": "Langue de l’interface",
  "lib.rowMenu.openInTabHint": "Ctrl/Cmd-clic pour ouvrir dans un nouvel onglet",
  "settings.interfaceLanguage.desc":
    "Inkswell suit la langue d’Obsidian lorsqu’une traduction relue existe. Choisissez une langue ici pour passer outre, y compris parmi les traductions en brouillon. Le texte écrit dans vos notes reste tel quel.",
  "settings.interfaceLanguage.auto": "Comme Obsidian",
  "settings.interfaceLanguage.draft": "{name} (brouillon — aidez à relire)",
  "settings.interfaceLanguage.applied": "Langue modifiée. Les noms des commandes, cet onglet de paramètres et la barre d’onglets du téléphone changeront après le redémarrage d’Obsidian.",
  "settings.companionSceneTarget.name": "Ouvrir les scènes de la barre latérale dans",
  "settings.companionSceneTarget.desc":
    "Où s’ouvre une scène quand vous cliquez dessus dans un compagnon de la barre latérale. Ctrl/Cmd-clic ouvre toujours un nouvel onglet.",
  "settings.companionSceneTarget.write": "Écrire (Inkswell)",
  "settings.companionSceneTarget.tab": "Un onglet ordinaire",

  // --- Settings → Write editor -----------------------------------------------
  "settings.writeEditor.heading": "Éditeur Écrire",
  "settings.typewriterMode.name": "Mode machine à écrire",
  "settings.typewriterMode.desc":
    "Garde la ligne en cours de frappe centrée verticalement dans l’éditeur Écrire, pour que vos yeux restent au même endroit. Les clics de souris ne recentrent pas. Aussi disponible avec la commande « Activer/désactiver le mode machine à écrire (éditeur Écrire) ».",
  "settings.manuscriptTypography.name": "Typographie de manuscrit",
  "settings.manuscriptTypography.desc":
    "Mise en page façon livre dans l’éditeur Écrire : alinéa en début de paragraphe (sauf pour le premier paragraphe après un titre ou un changement de scène) et titres centrés. Purement visuel — votre texte n’est pas modifié. La police suit le réglage Apparence → Police du texte d’Obsidian.",
  "settings.smartDashes.name": "Tirets intelligents",
  "settings.smartDashes.desc":
    "Dans l’éditeur Écrire, -- devient un tiret demi-cadratin (–) et un troisième - donne un tiret cadratin (—). Une ligne de tirets (---) reste intacte. Ne s’applique qu’à l’éditeur Écrire d’Inkswell, pas aux notes d’Obsidian.",
  "settings.smartQuotes.name": "Guillemets intelligents",
  "settings.smartQuotes.desc":
    "Les guillemets droits tapés dans l’éditeur Écrire deviennent des guillemets courbes (“ ” et ‘ ’) ; les apostrophes deviennent ’. Ignoré dans le code et les liens.",
  "settings.smartEllipsis.name": "Points de suspension intelligents",
  "settings.smartEllipsis.desc": "Trois points tapés dans l’éditeur Écrire deviennent des points de suspension (…).",
  "settings.milestoneWords.name": "Repères tous les…",
  "settings.milestoneWords.desc":
    "Place un petit repère dans la marge de l’éditeur Écrire, sur la ligne où le nombre de mots cumulé de la scène franchit chaque multiple de ce nombre (p. ex. 500 → repères à 500, 1k, 1.5k…). 0 = désactivé ; minimum 100.",

  // --- Settings → Goals & sprints --------------------------------------------
  "settings.goals.heading": "Objectifs et sprints",
  "settings.weekStart.name": "La semaine commence le",
  "settings.weekStart.desc": "Premier jour de la semaine pour les objectifs hebdomadaires, le suivi d’habitude et la carte de chaleur.",
  "settings.weekStart.monday": "Lundi",
  "settings.weekStart.sunday": "Dimanche",
  "settings.dailyWordGoal.name": "Objectif quotidien de mots",
  "settings.dailyWordGoal.desc": "Nombre de mots visé par jour, affiché dans la barre d’état et les statistiques.",
  "settings.weeklyWordGoal.name": "Objectif hebdomadaire de mots",
  "settings.weeklyWordGoal.desc": "Nombre de mots visé par semaine (début de semaine → aujourd’hui).",
  "settings.monthlyWordGoal.name": "Objectif mensuel de mots",
  "settings.monthlyWordGoal.desc": "Nombre de mots visé par mois (du 1er → aujourd’hui).",
  "settings.habitDaysPerWeek.name": "Habitude : jours par semaine",
  "settings.habitDaysPerWeek.desc": "Combien de jours par semaine vous visez d’écrire.",
  "settings.habitMinWords.name": "Habitude : minimum de mots par jour",
  "settings.habitMinWords.desc": "Nombre minimum de mots pour qu’une journée compte dans l’habitude.",
  "settings.defaultSprintMinutes.name": "Durée de sprint par défaut",
  "settings.defaultSprintMinutes.desc": "Durée par défaut d’un sprint, en minutes.",
  "settings.defaultSprintWordGoal.name": "Objectif de mots par défaut d’un sprint",
  "settings.defaultSprintWordGoal.desc": "Objectif de mots prérempli dans la fenêtre de sprint. 0 = pas d’objectif.",
  "settings.streakThreshold.name": "Seuil de série",
  "settings.streakThreshold.desc": "Nombre minimum de mots dans une journée pour prolonger votre série d’écriture.",

  // --- Settings → What counts toward goals -----------------------------------
  "settings.counts.heading": "Ce qui compte pour les objectifs",
  "settings.counts.intro":
    "Les objectifs, séries et sprints ne comptent que l’écriture dans les notes de projet — les notes situées ailleurs dans le coffre ne comptent jamais. Choisissez les types de notes qui comptent. Changer une option recompte aussi les mots écrits depuis l’apparition de ce réglage ; l’historique plus ancien compte toujours.",
  "settings.counts.scene.name": "Scènes du manuscrit",
  "settings.counts.scene.desc": "Fichiers de scène et projets en une seule note — le manuscrit lui-même.",
  "settings.counts.planning.name": "Notes de planification",
  "settings.counts.planning.desc": "La note de planification de chaque projet (synopsis, fondations de l’intrigue, esquisse des actes).",
  "settings.counts.codex.name": "Notes du codex",
  "settings.counts.codex.desc": "Les notes qui ont une clé codex (personnages, lieux, univers), où qu’elles se trouvent.",
  "settings.counts.other.name": "Autres notes de projet",
  "settings.counts.other.desc": "La note d’index du projet et toute autre note dans le dossier d’un projet.",

  // --- Settings → Folders ----------------------------------------------------
  "settings.folders.heading": "Dossiers",
  "settings.baseFolder.name": "Dossier de base",
  "settings.baseFolder.desc":
    "Dossier où sont créés les nouveaux projets et la structure partagée du codex. Vide = racine du coffre. Ce réglage ne définit que l’emplacement du nouveau contenu — les projets et codex existants fonctionnent où qu’ils soient dans le coffre.",
  "settings.baseFolder.placeholder": "(racine du coffre)",
  "settings.codexFolder.name": "Nom du dossier du codex",
  "settings.codexFolder.desc": "Nom du sous-dossier utilisé pour les notes du codex (partagé et par projet).",
  "settings.coLocateCodex.name": "Ranger le codex avec les projets",
  "settings.coLocateCodex.desc":
    "Les fiches propres à un livre sont créées dans le dossier codex de leur projet ; les fiches de série et globales vont dans le codex de base partagé. Simple rangement — la visibilité se règle fiche par fiche via le champ Portée, pas selon l’emplacement de la note.",

  // --- Settings → Layout -----------------------------------------------------
  "settings.layout.heading": "Disposition",
  "settings.forceTablet.name": "Utiliser la disposition complète sur cet appareil",
  "settings.forceTablet.desc":
    "Obsidian considère cet écran comme celui d’un téléphone : Inkswell affiche donc sa disposition pour téléphone et garde Planifier et Publier derrière un avis « nécessite un écran plus grand ». Activez cette option si vous êtes sur une tablette.",

  // --- Settings → Help -------------------------------------------------------
  "settings.help.heading": "Aide",
  "settings.showHints.name": "Afficher les conseils contextuels",
  "settings.showHints.desc":
    "Affiche en haut des panneaux les encadrés « Comment ça marche », que l’on peut fermer. Les conseils fermés restent masqués jusqu’à ce que vous les réinitialisiez ci-dessous.",
  "settings.resetTips.name": "Réinitialiser les conseils et revoir l’accueil",
  "settings.resetTips.desc": "Réactive tous les conseils fermés et affiche de nouveau l’écran de bienvenue.",
  "settings.resetTips.done": "Conseils réinitialisés.",

  // --- Restore settings modal ------------------------------------------------
  "settings.restore.placeholder": "Restaurer les paramètres depuis la sauvegarde du…",

  // --- Optional features (src/features.ts) -------------------------------------
  "feature.group.planning": "Planification",
  "feature.group.revision": "Révision",
  "feature.group.publishing": "Publication",
  "feature.group.writing": "Écriture",
  "feature.beats.label": "Temps forts",
  "feature.beats.desc": "Le planificateur de temps forts (Planifier → Temps forts) et la création de scènes qui l’accompagne.",
  "feature.board.label": "Tableau",
  "feature.board.desc": "La vue en tableau Kanban de vos scènes (Planifier → Structure → Tableau).",
  "feature.plotGrid.label": "Grille d’intrigue",
  "feature.plotGrid.desc":
    "La matrice intrigues × chapitres (Planifier → Structure → Grille) et le champ Intrigues des scènes.",
  "feature.audit.label": "Audit de révision",
  "feature.audit.desc": "Les listes de contrôle de l’audit de révision et le suivi des arcs de personnages (Réviser → Audit).",
  "feature.analysis.label": "Analyse",
  "feature.analysis.desc": "Analyse de la lisibilité, de la fréquence des mots et des répétitions (Réviser → Analyse).",
  "feature.checklist.label": "Liste de publication",
  "feature.checklist.desc": "La liste des tâches d’autoédition (Publier → Liste de contrôle).",
  "feature.launch.label": "Planificateur de lancement",
  "feature.launch.desc": "Le calendrier de précommande et les suivis de lancement (Publier → Lancement).",
  "feature.prompts.label": "Amorces d’écriture",
  "feature.prompts.desc": "Le bouton d’amorces d’écriture et d’idées dans la barre d’outils d’Écrire.",
  "feature.stream.label": "Fil des scènes",
  "feature.stream.desc":
    "La vue Fil d’Écrire : lisez et modifiez les scènes d’un livre comme une seule page continue. Non affichée sur téléphone.",
  "feature.tracking.label": "Suivi",
  "feature.tracking.desc":
    "Objectifs de mots, sprints d’écriture, compteur de la barre d’état et tableau de bord Suivi. Les mots restent enregistrés pendant que c’est masqué : en réactivant, vous retrouvez tout l’historique.",

  // --- Shared helpers (src/lib) ------------------------------------------------
  "lib.hideMenu.item": "Masquer {label}",
  "lib.hideMenu.hidden": "Masqué : {label}.",
  "lib.hideMenu.notice": "{hidden} {undo} — ou réactivez-le plus tard dans Personnaliser → Fonctionnalités.",
  "lib.hideMenu.undo": "Annuler",
  "lib.listEditor.moveUp": "Monter",
  "lib.listEditor.moveDown": "Descendre",
  "lib.phoneRedirect.title": "{surface} nécessite un écran plus grand",
  "lib.phoneRedirect.body":
    "Ouvrez ce projet sur une tablette ou un ordinateur pour cette vue. La rédaction et votre liste de scènes fonctionnent ici, sur téléphone.",
  "lib.phoneRedirect.useFullLayout": "Pas un téléphone ? Utiliser la disposition complète",
  "lib.rowMenu.more": "Plus d’actions",
  "lib.images.pickPlaceholder": "Choisir une image du coffre…",
  "lib.relativeTime.justNow": "à l’instant",
  "lib.relativeTime.minutes.one": "il y a {count} min",
  "lib.relativeTime.minutes.other": "il y a {count} min",
  "lib.relativeTime.hours.one": "il y a {count} h",
  "lib.relativeTime.hours.other": "il y a {count} h",
  "lib.relativeTime.days.one": "il y a {count} j",
  "lib.relativeTime.days.other": "il y a {count} j",
  "lib.relativeTime.weeks.one": "il y a {count} sem.",
  "lib.relativeTime.weeks.other": "il y a {count} sem.",
  "lib.relativeTime.months.one": "il y a {count} mois",
  "lib.relativeTime.months.other": "il y a {count} mois",
  "lib.relativeTime.years.one": "il y a {count} an",
  "lib.relativeTime.years.other": "il y a {count} ans",
  "lib.settingsSummary.none": "aucun réglage",
  "lib.settingsSummary.customTypes.one": "{count} type de codex personnalisé",
  "lib.settingsSummary.customTypes.other": "{count} types de codex personnalisés",
  "lib.settingsSummary.renamedTypes.one": "{count} type renommé",
  "lib.settingsSummary.renamedTypes.other": "{count} types renommés",
  "lib.settingsSummary.beatTemplates.one": "{count} modèle de temps forts",
  "lib.settingsSummary.beatTemplates.other": "{count} modèles de temps forts",
  "lib.settingsSummary.lists.one": "{count} liste personnalisée",
  "lib.settingsSummary.lists.other": "{count} listes personnalisées",
  "lib.settingsSummary.rail": "barre de navigation réorganisée",
  "lib.settingsSummary.challenge": "défi d’écriture",
  "lib.settingsSummary.defaults": "réglages par défaut",

  // --- Customize → catalog -----------------------------------------------------
  "customize.group.codex": "Codex",
  "customize.group.plan": "Planifier",
  "customize.group.write": "Écrire",
  "customize.group.revise": "Réviser",
  "customize.group.publish": "Publier",
  "customize.group.inkswell": "Inkswell",
  "customize.entry.codexTypes": "Types et champs du codex",
  "customize.entry.beatTemplates": "Modèles de temps forts",
  "customize.entry.sceneTemplate": "Modèle de scène",
  "customize.entry.sceneStatuses": "Statuts des scènes",
  "customize.entry.sceneFields": "Champs de l’inspecteur de scène",
  "customize.entry.writingPrompts": "Amorces d’écriture",
  "customize.entry.todoMarkers": "Marqueurs de tâche",
  "customize.entry.revisionChecklists": "Listes de révision",
  "customize.entry.publishingChecklist": "Liste de publication",
  "customize.entry.features": "Fonctionnalités",

  // --- Customize → panel -------------------------------------------------------
  "customize.badge.hidden": "masqué",
  "customize.badge.yours": "à vous",
  "customize.hiddenFeature": "Cette fonctionnalité est actuellement masquée. {link}.",
  "customize.hiddenFeature.link": "Activez-la dans Fonctionnalités",

  // --- Customize → catalog-row summaries (joined with " · ") ------------------
  "customize.summary.builtIn.one": "{count} intégré",
  "customize.summary.builtIn.other": "{count} intégrés",
  "customize.summary.yours.one": "{count} à vous",
  "customize.summary.yours.other": "{count} à vous",
  "customize.summary.hidden.one": "{count} masqué",
  "customize.summary.hidden.other": "{count} masqués",
  "customize.summary.renamed.one": "{count} renommé",
  "customize.summary.renamed.other": "{count} renommés",
  "customize.summary.custom.one": "{count} personnalisé",
  "customize.summary.custom.other": "{count} personnalisés",
  "customize.summary.reordered": "réordonné",
  "customize.summary.customized": "Personnalisé",

  // --- Customize → list editor (override-editor.ts) ----------------------------
  "list.addGroup": "Ajouter un groupe…",
  "list.newGroup": "Nouveau groupe",
  "list.groupName": "Nom du groupe",
  "list.showGroup": "Afficher le groupe",
  "list.hideGroup": "Masquer le groupe",
  "list.removeGroup": "Retirer le groupe",
  "list.wasLabel": "anciennement « {label} »",
  "list.show": "Afficher",
  "list.hide": "Masquer",
  "list.restoreName": "Rétablir le nom d’origine",
  "list.removed": "Retiré : « {label} ». Tout ce qui est déjà coché dessous reste dans vos notes.",
  "list.resetDefaults": "Rétablir les valeurs par défaut d’Inkswell",
  "list.meta.auditScene": "Points de contrôle de scène",
  "list.meta.auditStory": "Points de contrôle de l’histoire",
  "list.meta.auditChapter": "Points de contrôle de chapitre",
  "list.meta.auditPage": "Points de contrôle du style",
  "list.task.empty": "Aucune tâche ici pour l’instant.",
  "list.task.add": "Ajouter une tâche…",
  "list.task.new": "Nouvelle tâche",
  "list.task.aria": "libellé de la tâche",
  "list.checkpoint.empty": "Aucun point de contrôle ici pour l’instant.",
  "list.checkpoint.add": "Ajouter un point de contrôle…",
  "list.checkpoint.new": "Nouveau point de contrôle",
  "list.checkpoint.aria": "libellé du point de contrôle",
  "list.field.empty": "Aucun champ ici pour l’instant.",
  "list.field.add": "Ajouter un champ…",
  "list.field.new": "Nouveau champ",
  "list.field.aria": "libellé du champ",
  "list.status.empty": "Aucun statut ici pour l’instant.",
  "list.status.add": "Ajouter un statut…",
  "list.status.new": "Nouveau statut",
  "list.status.aria": "libellé du statut",
  "list.marker.empty": "Aucun marqueur ici pour l’instant.",
  "list.marker.add": "Ajouter un marqueur…",
  "list.marker.new": "Nouveau marqueur",
  "list.marker.aria": "libellé du marqueur",
  "list.prompt.empty": "Aucune amorce ici pour l’instant.",
  "list.prompt.add": "Ajouter une amorce…",
  "list.prompt.new": "Nouvelle amorce",
  "list.prompt.aria": "libellé de l’amorce",

  // --- Customize → fields editor (field-spec*.ts) ------------------------------
  "customize.fieldKind.text": "Texte",
  "customize.fieldKind.textarea": "Texte long",
  "customize.fieldKind.number": "Nombre",
  "customize.fieldKind.date": "Date",
  "customize.fieldKind.list": "Liste",
  "customize.fieldKind.image": "Image",
  "customize.fieldKind.links": "Liens",
  "customize.fieldKind.link": "Lien unique",
  "customize.fields.startWithLetter": "Commencez le libellé par une lettre.",
  "customize.fields.enterLabel": "Saisissez un libellé.",
  "customize.fields.reserved": "« {key} » est géré par Inkswell.",
  "customize.fields.duplicate": "« {key} » est déjà un champ.",
  "customize.fields.badKey": "Utilisez des lettres et des chiffres (sans espaces ni symboles).",
  "customize.fields.createTemplateFailed": "Impossible de créer la note modèle.",
  "customize.fields.saveFailed": "Impossible d’enregistrer les champs.",
  "customize.fields.resetFailed": "Impossible de réinitialiser les champs.",
  "customize.fields.labelPlaceholder": "Libellé",
  "customize.fields.labelAria": "Libellé de {key}",
  "customize.fields.kindAria": "Type de {key}",
  "customize.fields.anyType": "Tout type",
  "customize.fields.typeEither": "{first} ou {second}",
  "customize.fields.restrictAria": "Limiter {key} à un type",
  "customize.fields.perLinkLabels": "Libellés par lien",
  "customize.fields.add": "Ajouter un champ…",
  "customize.addField.title": "Ajouter un champ",
  "customize.addField.label": "Libellé",
  "customize.addField.labelPlaceholder": "p. ex. Date de naissance",
  "customize.addField.kind": "Type",
  "customize.addField.builtin.name": "Ou ajouter l’un des champs intégrés d’Inkswell",
  "customize.addField.builtin.desc":
    "Il garde son libellé et son sélecteur — un bestiaire peut emprunter Relations, par exemple.",
  "customize.addField.storedAs": "Enregistré sous {key}",

  // --- Customize → template body editor ----------------------------------------
  "customize.templateBody.create": "Créer la note modèle",
  "customize.templateBody.loading": "Chargement…",
  "customize.templateBody.saveFailed": "Impossible d’enregistrer le modèle.",
  "customize.templateBody.open": "Ouvrir la note modèle",
  "customize.templateBody.openAria": "Ouvrir {path} dans un onglet (pour modifier le frontmatter)",

  // --- Customize → Codex types -------------------------------------------------
  "customize.codex.intro":
    "Chaque type du codex a un affichage (nom, pluriel, icône), les champs que ses fiches montrent dans le panneau Codex, et le contenu de départ d’une nouvelle fiche. Les champs et le contenu de départ vivent dans une note modèle ordinaire — les modifier ici modifie cette note.",
  "customize.codex.rowDescRenamed": "{plural} · codex: {id} · renommé (à l’origine {shipped})",
  "customize.codex.rowDesc": "{plural} · codex: {id}",
  "customize.codex.rowDescCustom": "{plural} · codex: {id} · personnalisé",
  "customize.codex.entries.one": "{count} fiche",
  "customize.codex.entries.other": "{count} fiches",
  "customize.codex.fieldsFrom": "Champs : {name}",
  "customize.codex.fieldsShipped": "Champs : d’origine",
  "customize.codex.editDisplay": "Modifier l’affichage…",
  "customize.codex.deleteType": "Supprimer le type…",
  "customize.codex.newType": "Nouveau type…",
  "customize.codex.generate": "Générer tous les modèles de départ",
  "customize.codex.generateAria":
    "Crée une note modèle pour chaque type qui n’en a pas (plus Scene.md et un README)",
  "customize.codex.vaultRoot": "(racine du coffre)",
  "customize.codex.generateFailed": "Impossible de générer les modèles de départ.",
  "customize.codex.generated.one": "{count} modèle créé dans « {folder} ».",
  "customize.codex.generated.other": "{count} modèles créés dans « {folder} ».",
  "customize.codex.generatedNone": "Les modèles existent déjà — rien à créer.",
  "customize.codex.back": "‹ Types du codex",
  "customize.codex.gone": "Ce type n’existe plus.",
  "customize.codex.idLine": "codex: {id}",
  "customize.codex.card.display": "Affichage",
  "customize.codex.card.fields": "Champs",
  "customize.codex.card.starter": "Contenu de départ",
  "customize.codex.starterHint":
    "C’est le point de départ de toute nouvelle fiche. {{title}} devient le nom de la fiche. Inkswell ajoute lui-même codex: et la portée projet ou série — n’ajoutez pas de clé codex:.",
  "customize.codex.starterNone": "Pas encore de note modèle — les nouvelles fiches ({plural}) commencent par un simple titre.",
  "customize.codex.display.name": "Nom",
  "customize.codex.display.plural": "Pluriel",
  "customize.codex.display.icon": "Icône",
  "customize.codex.display.shipped": "À l’origine : {label} / {plural} / {icon}. Les fiches gardent codex: {id}.",
  "customize.codex.display.edit": "Modifier…",
  "customize.codex.display.reset": "Rétablir par défaut",
  "customize.codex.fieldsSource": "Champs issus de {link}. Les alias viennent toujours en premier.",
  "customize.codex.fieldsSourceShipped":
    "Champs d’origine d’Inkswell. Votre première modification crée une note modèle pour ce type et y enregistre les champs. Les alias viennent toujours en premier.",
  "customize.codex.fieldsEmpty": "Aucun champ pour l’instant — ajoutez-en un ci-dessous.",
  "customize.codex.fieldsReset": "Rétablir les champs d’origine",
  "customize.codex.fieldsResetConfirm":
    "Utiliser les champs d’origine d’Inkswell pour {type} ? Cela retire la propriété codex-fields de {template} — les fiches existantes gardent leur frontmatter.",
  "customize.codex.fieldsResetConfirmNoTemplate":
    "Utiliser les champs d’origine d’Inkswell pour {type} ? Cela retire la propriété codex-fields du modèle — les fiches existantes gardent leur frontmatter.",
  "customize.codex.fieldsLabelDesc": "Ce que montre le panneau Codex. La clé enregistrée en est dérivée.",
  "customize.codex.builtinField.generic": "{label} (types personnalisés)",
  "customize.codex.builtinField.type": "{label} ({type})",

  // --- Customize → Beat templates ----------------------------------------------
  "customize.beats.intro":
    "Structures de temps forts pour Planifier → Temps forts. Les modèles intégrés ne se modifient pas, mais en dupliquer un vous en donne une copie modifiable. Vos modèles apparaissent dans le sélecteur dans l’ordre ci-dessous.",
  "customize.beats.builtIn": "Intégrés",
  "customize.beats.rowDesc.one": "{count} temps fort · id : {id}",
  "customize.beats.rowDesc.other": "{count} temps forts · id : {id}",
  "customize.beats.duplicateAsCustom": "Dupliquer en modèle personnalisé",
  "customize.beats.yours": "Les vôtres",
  "customize.beats.empty": "Aucun modèle à vous pour l’instant — dupliquez un modèle intégré ou partez de zéro.",
  "customize.beats.editBeats": "Modifier les temps forts",
  "customize.beats.duplicate": "Dupliquer",
  "customize.beats.newTemplate": "Nouveau modèle…",
  "customize.beats.created": "« {name} » créé.",
  "customize.beats.back": "‹ Modèles de temps forts",
  "customize.beats.gone": "Ce modèle n’existe plus.",
  "customize.beats.idLine": "id : {id}",
  "customize.beats.rename": "Renommer…",
  "customize.beats.pageIntro":
    "Les temps forts dans l’ordre du livre. « À % » indique où se situe le temps fort dans le manuscrit. Le nom d’un temps fort est sa clé : le renommer repart de notes vierges (redonnez-lui son ancien nom pour les retrouver) ; réordonner et reformuler l’objectif sont toujours sans risque.",
  "customize.beats.noBeats": "Aucun temps fort pour l’instant.",
  "customize.beats.namePlaceholder": "Nom du temps fort",
  "customize.beats.nameAria": "Nom du temps fort",
  "customize.beats.atAria": "Position dans le livre, en pourcentage",
  "customize.beats.purposePlaceholder": "Objectif (facultatif)",
  "customize.beats.purposeAria": "Objectif du temps fort",
  "customize.beats.needOne": "Un modèle doit compter au moins un temps fort.",
  "customize.beats.addBeat": "Ajouter un temps fort…",
  "customize.beats.editAsText": "Modifier en texte…",
  "customize.beats.textHelp":
    "Un temps fort par ligne : « Nom », « Nom | objectif » ou « 25% | Nom | objectif ». Appliquer remplace la liste ci-dessus.",
  "customize.beats.apply": "Appliquer",
  "customize.beats.addModal.title": "Ajouter un temps fort",
  "customize.beats.addModal.name": "Nom",
  "customize.beats.addModal.nameDesc": "C’est aussi la clé du temps fort (convertie en slug).",
  "customize.beats.addModal.namePlaceholder": "p. ex. Point médian",
  "customize.beats.addModal.purpose": "Objectif",
  "customize.beats.addModal.purposePlaceholder": "Une phrase, facultative",
  "customize.beats.nameRequired": "Le nom est obligatoire.",
  "customize.beats.nameNeedsChars": "Le nom doit contenir des lettres ou des chiffres.",
  "customize.beats.renameModal.title": "Renommer le modèle",
  "customize.beats.renameModal.name": "Nom",
  "customize.beats.renameModal.nameDesc":
    "Nom affiché uniquement — l’identifiant du modèle (et chaque projet qui l’utilise) reste inchangé.",

  // --- Customize → Scene template ----------------------------------------------
  "customize.sceneTemplate.using": "Utilise Templates/Scene.md",
  "customize.sceneTemplate.default": "Par défaut (scène vide)",
  "customize.sceneTemplate.intro":
    "Chaque scène créée par Inkswell part de cette note : son frontmatter et son contenu sont copiés, et {{title}} devient le nom de la scène. Sans elle, les nouvelles scènes commencent vides.",
  "customize.sceneTemplate.projectOwn":
    "Le projet actif utilise plutôt son propre modèle : {template} (la clé sceneTemplate de sa note d’index).",
  "customize.sceneTemplate.card": "Contenu de départ",
  "customize.sceneTemplate.hint":
    "{{title}} devient le nom de la scène. Une clé status: ici définit le statut par défaut (sinon les nouvelles scènes reçoivent status: idea) ; un synopsis prérempli par Inkswell l’emporte toujours.",
  "customize.sceneTemplate.none": "Pas encore de note modèle ({path}) — les nouvelles scènes commencent vides.",

  // --- Customize → Scene statuses ----------------------------------------------
  "customize.statuses.defaults": "Idée → Final (par défaut)",
  "customize.statuses.intro":
    "Renommez un statut pour coller à votre méthode (« Premier jet », « Peaufinage », « Verrouillé »), masquez ceux dont vous ne vous servez pas, et choisissez l’ordre dans lequel le tableau et les sélecteurs les affichent. Les scènes gardent leur valeur enregistrée dans tous les cas : vous pouvez donc changer cela en plein livre ; une scène dont le statut est masqué l’affiche toujours, signalé comme masqué. Cette version ne permet pas d’ajouter de nouveaux statuts.",

  // --- Customize → Scene inspector fields --------------------------------------
  "customize.sceneFields.own.one": "{count} à vous",
  "customize.sceneFields.own.other": "{count} à vous",
  "customize.sceneFields.defaults": "Tous les champs (par défaut)",
  "customize.sceneFields.card.layout": "Disposition",
  "customize.sceneFields.layoutIntro":
    "Choisissez les champs qu’affiche l’inspecteur de scène, et dans quel ordre. Masquez ceux dont vous ne vous servez pas, ou remontez Notes si vous rédigez à partir d’un plan. « Vos champs » désigne le bloc de champs que vous ajoutez ci-dessous. Masquer un champ ne le masque qu’ici — les scènes gardent ce qu’elles contiennent déjà, et le réafficher le fait revenir aussitôt.",
  "customize.sceneFields.card.own": "Vos champs",
  "customize.sceneFields.ownIntro":
    "Ajoutez des champs adaptés à votre méthode — les cinq commandements de Story Grid, l’objectif et le désastre d’une scène — et ils apparaîtront dans l’inspecteur de chaque scène. Chacun est enregistré comme une propriété ordinaire de la scène ; retirer un champ ici n’efface jamais ce que vous avez écrit.",
  "customize.sceneFields.storedIn": "Enregistrés dans {link} (partagé par tous les projets).",
  "customize.sceneFields.firstCreates":
    "Votre premier champ crée la note modèle de scène et y enregistre vos champs.",
  "customize.sceneFields.empty": "Aucun champ à vous pour l’instant.",
  "customize.sceneFields.reset": "Retirer tous vos champs",
  "customize.sceneFields.resetConfirm":
    "Retirer tous vos champs ? Cela supprime la propriété {key} de {template} — les scènes gardent les valeurs qu’elles contiennent déjà.",
  "customize.sceneFields.resetConfirmNoTemplate":
    "Retirer tous vos champs ? Cela supprime la propriété {key} du modèle de scène — les scènes gardent les valeurs qu’elles contiennent déjà.",
  "customize.sceneFields.labelDesc":
    "Ce que montre l’inspecteur de scène. Le nom de la propriété enregistrée en est dérivé.",

  // --- Customize → Writing prompts ---------------------------------------------
  "customize.prompts.intro":
    "Les amorces derrière le bouton Amorce de la barre d’outils d’Écrire. Masquez celles que vous ne voulez plus voir, reformulez-en, ou ajoutez les vôtres — écrivez {pov} là où doit figurer le nom du personnage PDV de la scène. Chaque amorce a une phase (rédaction ou révision) et une catégorie, qui servent de filtre au bouton — vous pouvez changer l’une et l’autre sur n’importe quelle amorce, y compris les amorces intégrées.",
  "customize.prompts.phase.draft": "Rédaction",
  "customize.prompts.phase.revise": "Révision",
  "customize.prompts.phaseAria": "Phase",
  "customize.prompts.categoryAria": "Catégorie",

  // --- Customize → To-do markers -----------------------------------------------
  "customize.markers.intro":
    "Des marqueurs que vous glissez dans votre texte pour y revenir plus tard — [TODO: …], [RESEARCH: …] et les autres — et que vous retrouvez dans Réviser → Journal de révision. La compilation les retire tous. Pour utiliser un autre mot, ajoutez votre propre marqueur (et masquez le marqueur intégré si vous le souhaitez). Masquer un marqueur ne fait que le retirer du menu Insérer : les marqueurs déjà présents dans vos scènes sont toujours trouvés, et toujours retirés à la compilation.",
  "customize.markers.wordPrompt": "Mot à taper dans vos scènes (p. ex. CHECK)",
  "customize.markers.invalidWord":
    "Le mot d’un marqueur commence par une lettre et compte de 2 à 20 lettres, chiffres ou traits d’union.",
  "customize.markers.taken": "[{keyword}] est déjà un marqueur.",
  "customize.markers.inactive": "mot déjà utilisé — inactif",
  "customize.markers.removeConfirm":
    "Retirer « {label} » ? Les marqueurs déjà tapés dans vos scènes sous la forme [{keyword}: …] ne seront plus trouvés dans le journal de révision ni retirés à la compilation. Pour qu’ils continuent de fonctionner, masquez plutôt le marqueur.",
  "customize.markers.removed":
    "« {label} » retiré. Les marqueurs [{keyword}: …] restent dans vos scènes, en texte brut.",

  // --- Customize → Publishing checklist ----------------------------------------
  "customize.publishing.defaults": "{phases} · {tasks} (par défaut)",
  "customize.publishing.phases.one": "{count} phase",
  "customize.publishing.phases.other": "{count} phases",
  "customize.publishing.tasks.one": "{count} tâche",
  "customize.publishing.tasks.other": "{count} tâches",
  "customize.publishing.intro":
    "Publier → Liste de contrôle, phase par phase. Masquez les phases ou les tâches qui ne concernent pas votre parcours, renommez, réordonnez et ajoutez les vôtres. Les coches sont enregistrées par projet sous l’identifiant de la tâche : rien de ce que vous avez déjà coché n’est perdu quand vous masquez ou renommez.",
  "customize.publishing.optional": "Facultatif",

  // --- Customize → Features ----------------------------------------------------
  "customize.features.allShown": "Tout est affiché",
  "customize.features.hidden": "{count} sur {total} masqués",
  "customize.features.intro":
    "Masquez les écrans dont vous ne vous servez pas pour garder Inkswell léger. Masquer ne fait que masquer — vos notes et données sont conservées, et réactiver une fonctionnalité restaure tout. Vous pouvez aussi faire un clic droit sur un onglet facultatif, n’importe où dans l’application, pour le masquer.",
};
