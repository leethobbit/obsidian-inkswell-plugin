/** French UI strings — the `help` area (mirrors ../en/help.ts). */
import type { Catalog } from "../types";

export const help: Catalog = {
  // --- Topic: write ---
  "help.write.title": "Comment fonctionnent la rédaction et les marqueurs de tâche",
  "help.write.columns": "Écrire est un éditeur sans distraction : choisissez une scène à gauche, rédigez au centre, et gardez ce dont vous avez besoin dans la colonne de droite. Cette colonne a quatre onglets — Scène (les détails de la scène en cours), Codex (qui et quoi y figure), Planifier (les scènes de ce chapitre, ses temps forts et votre note de planification) et Journal de révision (les marqueurs de tâche en suspens et les décisions de révision consignées pour ce projet, la scène en cours d’abord — cliquez sur un marqueur pour y aller). Les modifications sont enregistrées quand le champ perd le focus et quand vous changez de scène — jamais au milieu d’une frappe.",
  "help.write.room": "Faites de la place à la page : les boutons aux deux extrémités de la barre d’outils masquent la liste des scènes et la colonne de droite, et vous pouvez faire glisser le trait à côté de la colonne pour la redimensionner. Le mode concentration (le bouton aux flèches) masque tout sauf l’éditeur et la barre d’outils ; appuyez de nouveau pour tout faire revenir. Repliez la note « À suivre » avec la flèche à son extrémité. Faites un clic droit dans le texte pour la mise en forme, la recherche dans le codex, la scission d’une scène et la consignation d’une décision de révision.",
  "help.write.stream": "Passez de Scène à Fil (en haut d’Écrire, pas sur téléphone) pour voir tout le livre sur une seule page, dans l’ordre. Cliquez n’importe où pour modifier cette scène sur place ; les touches fléchées continuent dans la scène suivante. Passez d’un chapitre à l’autre avec le menu du haut ou les noms de chapitres à gauche, et restreignez la page à un chapitre, un PDV, une intrigue, un personnage ou un statut. Chaque scène reste enregistrée dans sa propre note.",
  "help.write.markers": "Ne vous arrêtez pas pour faire une recherche ou peaufiner un passage difficile. Glissez un marqueur entre crochets et continuez — les marqueurs sont surlignés dans l’éditeur et rassemblés plus tard dans Réviser → Journal de révision. Le mot-clé n’est pas sensible à la casse et le « : texte » est facultatif.",
  "help.write.markerPicker": "Lancez « Insérer un marqueur de tâche… » pour ouvrir un sélecteur qui en place un au curseur.",
  "help.write.peek": "Vérifiez un détail sans quitter la page : maintenez Ctrl (Cmd sur Mac) et pointez le nom d’un personnage ou d’un lieu dans le texte pour voir sa fiche du codex. Survolez ou touchez un nom dans la colonne Scène pour obtenir la même fiche, ou lancez « Chercher dans le codex » (aussi dans le menu du clic droit). Échap la ferme et votre curseur reste où il était.",
  "help.write.companions": "Gardez des outils à portée de main pendant que vous écrivez : faites un clic droit sur Codex, Planifier, Suivi ou Accueil dans la barre de gauche et choisissez « Ouvrir dans la barre latérale », ou lancez « Ouvrir un compagnon dans la barre latérale… ». Les compagnons suivent la scène que vous écrivez : Codex liste qui et quoi y figure, Planifier montre les scènes, synopsis et temps forts du chapitre ainsi que votre note de planification, Scènes affiche tout le plan, et Journal de révision liste ce qui reste à faire dans cette scène. Placez-les où vous voulez ; Obsidian s’en souvient. Cliquer sur une scène dans un compagnon l’ouvre dans Écrire, ou dans un onglet ordinaire si vous l’avez choisi dans les paramètres.",
  "help.write.customMarkers": "Vous voulez votre propre mot, comme [CHECK: ] ou [TK: ] ? Ajoutez-le dans Personnaliser → Marqueurs de tâche, où vous pouvez aussi masquer les marqueurs intégrés.",

  // --- Topic: track/sync ---
  "help.sync.title": "Vous écrivez sur plusieurs appareils ?",
  "help.sync.body": "Les mots sont comptés sur l’appareil où vous les tapez : ce tableau de bord ne connaît donc que cet appareil. Pour que vos séries et vos totaux incluent tous vos appareils, activez Paramètres → Inkswell → « Synchroniser l’historique d’écriture entre appareils ». Inkswell tient alors une petite note de journal par appareil dans le dossier « Writing log » de votre dossier de base et les fusionne ici — la synchronisation de votre coffre (Obsidian Sync, iCloud…) transporte les notes.",

  // --- Topic: plan/beats ---
  "help.beats.title": "Comment fonctionne la grille des temps forts",
  "help.beats.intro": "Un plan structurel du projet actif, construit à partir d’un modèle de temps forts choisi dans la liste Modèle. Huit modèles sont inclus :",
  "help.beats.template.saveTheCat": "Save the Cat (15 temps forts)",
  "help.beats.template.threeAct": "Trois actes (7)",
  "help.beats.template.herosJourney": "Voyage du héros (12)",
  "help.beats.template.sevenPoint": "Structure en sept points (7)",
  "help.beats.template.storyCircle": "Story Circle (8)",
  "help.beats.template.romancingTheBeat": "Romancing the Beat (14)",
  "help.beats.template.twentySevenChapter": "27 chapitres (27)",
  "help.beats.template.tenPoint": "Plan en dix points (10) — listez les dix choses qui doivent arriver dans votre histoire",
  "help.beats.custom": "Vous pouvez aussi ajouter vos propres structures dans Personnaliser → Modèles de temps forts — elles apparaissent dans la liste à côté des modèles intégrés.",
  "help.beats.perBeat": "Chaque temps fort comporte son objectif, une note de planification, une scène liée facultative et une case « terminé » ; la barre du haut indique combien sont terminés. Changez de modèle quand vous voulez — chacun garde ses propres notes et liens, rien n’est donc perdu si vous revenez en arrière.",
  "help.beats.tip.inline": "Tapez directement dans la note de planification d’un temps fort — elle est intégrée, pas dans un fichier à part.",
  "help.beats.tip.link": "Liez un temps fort à la scène qui le réalise pour que Planifier et Écrire restent synchronisés.",
  "help.beats.tip.scaffold": "Créer la structure génère en une fois des ébauches de scènes pour tous les temps forts non liés.",

  // --- Topic: plan/board ---
  "help.board.title": "Comment fonctionne le tableau",
  "help.board.groupBy": "Une vue Kanban de vos scènes. Utilisez le sélecteur Grouper par pour organiser les colonnes par statut, acte, chapitre ou PDV.",
  "help.board.drag": "Faites glisser une carte vers une autre colonne pour changer la valeur de la scène (p. ex. la faire passer de Brouillon à Révisée). Cliquez sur une carte pour ouvrir la scène ; clic droit (ou bouton ⋯) pour renommer, modifier et supprimer. La couleur de la carte vient du champ couleur de la scène.",

  // --- Topic: plan/grid ---
  "help.grid.title": "Comment fonctionne la grille d’intrigue",
  "help.grid.matrix": "Une matrice intrigues × chapitres pour suivre les intrigues secondaires et les arcs. Les colonnes sont vos intrigues ; les lignes, vos chapitres ; chaque cellule montre les scènes qui font avancer cette intrigue à cet endroit. Les cellules sont vos vraies scènes — la grille découle du frontmatter des scènes : elle correspond donc toujours au manuscrit, et un passage vide dans une colonne est un signal de rythme, pas un oubli de saisie.",
  "help.grid.cells": "Cliquez sur le + d’une cellule pour étiqueter une scène existante ou créer une ébauche de scène (statut Idée) sur place — c’est ainsi que vous planifiez un temps fort pas encore écrit. Dépliez une ligne de chapitre pour activer ou désactiver l’appartenance de chaque scène sans glisser-déposer. Faites glisser une pastille vers une autre cellule pour la déplacer entre intrigues ou chapitres ; une scène peut appartenir à plusieurs intrigues à la fois.",
  "help.grid.tip.plotlines": "Gérez les intrigues depuis les en-têtes de colonne : renommer (met à jour chaque scène étiquetée), changer la couleur, réordonner, focaliser ou supprimer.",
  "help.grid.tip.compact": "Un gros livre ? Le mode compact affiche les cellules sous forme de points colorés (automatique sur les grandes grilles), et les lignes d’acte se replient en totaux par colonne.",
  "help.grid.tip.untracked": "Les étiquettes qui ne correspondent à aucune intrigue apparaissent comme colonnes « non suivies » — adoptez-les dans votre liste ou retirez-les de toutes les scènes.",

  // --- Topic: plan/outline ---
  "help.outline.title": "Comment fonctionne le plan",
  "help.outline.tree": "La vue Arbre de Structure : organisez votre livre en actes contenant des chapitres contenant des scènes. Faites glisser une scène dans un chapitre (ou un chapitre dans un acte), et déposez au-dessus ou au-dessous d’une ligne pour réordonner. Cet arbre fait foi — l’organiser fixe aussi l’ordre de lecture du manuscrit, pour que les scènes de chaque chapitre restent ensemble. Faites un clic droit sur une scène (ou touchez ⋯) pour la renommer, modifier ses détails ou son synopsis, ou la déplacer vers un autre chapitre. Les vues Tableau et Grille (en haut de l’onglet) montrent les mêmes scènes autrement.",
  "help.outline.order": "Structure vient en dernier dans Planifier, et c’est voulu. La démarche habituelle consiste à esquisser d’abord vos temps forts, à en tirer des scènes, puis à les rédiger dans Écrire — la structure peut attendre. Une fois que vous avez de vraies scènes, revenez ici pour les regrouper en actes et en chapitres.",
  "help.outline.tip.nesting": "L’imbrication est facultative — une scène peut rester hors de tout chapitre et un chapitre hors de tout acte (les groupes « Chapitres sans acte » / « Scènes non attribuées »).",
  "help.outline.tip.targets": "Donnez un objectif de mots à un chapitre pour suivre sa progression ; les mêmes objectifs apparaissent dans Suivi.",
  "help.outline.tip.open": "Cliquez sur une scène pour l’ouvrir dans Écrire ; utilisez le menu ⋯ (ou un clic droit) pour renommer, déplacer ou supprimer.",

  // --- Topic: codex ---
  "help.codex.title": "Comment fonctionne le codex",
  "help.codex.intro": "La bible de votre histoire : personnages, lieux, factions, objets, événements et concepts, chacun avec un profil structuré enregistré automatiquement dans le frontmatter de la note.",
  "help.codex.scopeIntro": "Chaque fiche a une portée qui détermine où elle apparaît :",
  "help.codex.scope.global": "Globale (par défaut) — disponible dans tous les projets.",
  "help.codex.scope.project": "Projet — définissez codex-project sur la note ; seul ce livre la voit. Sous Portée, cliquez sur Changer…, choisissez Livres et cochez les livres pour partager une fiche entre certains livres d’une série sans l’étendre à toute la série.",
  "help.codex.scope.series": "Série — définissez codex-series ; partagée entre les livres d’une série.",
  "help.codex.pins": "Épinglez vos personnages principaux : faites un clic droit sur une fiche (ou touchez ⋯) et choisissez Épingler dans ce livre. Les fiches épinglées apparaissent en tête de leur groupe, avec une punaise, et viennent en premier quand vous tapez [[ dans Écrire. Les épingles appartiennent au livre ouvert : un personnage de série peut donc être épinglé dans un livre et pas dans le suivant. Le champ de recherche trouve aussi le Rôle d’un personnage et le Type d’un lieu ou d’un objet : tapez « antag » pour trouver vos antagonistes.",
  "help.codex.appearsIn": "La liste « Apparaît dans » de chaque fiche se met à jour toute seule : elle montre chaque scène dont le texte mentionne la fiche par son nom ou un alias, ainsi que toute scène qui la lie dans ses métadonnées (Personnages, Lieu, PDV), pour toutes les catégories — une nouvelle fiche trouve donc ses scènes sans étape d’étiquetage. Les pastilles pleines sont des scènes liées (l’auteur y a placé la fiche) ; les pastilles en contour sont de simples mentions dans le texte (quelqu’un en parle). La ligne de chaque livre compte les deux, plus les scènes en PDV.",
  "help.codex.places": "Les lieux s’imbriquent : renseignez le champ Situé dans d’un lieu avec un monde ou un autre lieu, et la liste des lieux les affiche en arbre (Monde › Région › Ville). Sur un monde ou un lieu, « Nouveau lieu à l’intérieur… » en crée un déjà placé, qui partage sa portée.",
  "help.codex.links": "Les liens mènent quelque part : cliquez sur un nom dans un champ de liens (Relations, Alliés…) pour ouvrir cette fiche, ou sur la flèche à côté d’un choix unique comme Propriétaire. Ctrl/Cmd-clic ouvre plutôt la note dans un nouvel onglet. « Fichiers liés » liste ce vers quoi la note de la fiche pointe hors du codex (un canevas de planche d’ambiance, un PDF, une note de recherche), ainsi que tout canevas qui contient la carte de la fiche. Ajoutez un lien comme [[Moodboard.canvas]] dans le texte de la note ou dans une propriété ; un lien vers un canevas ou un PDF doit inclure l’extension.",
  "help.codex.portraits": "Une image importée comme portrait d’une fiche est enregistrée là où Obsidian place les nouvelles pièces jointes (Paramètres → Fichiers et liens → Emplacement par défaut des nouvelles pièces jointes). Choisissez « Dans un sous-dossier du dossier actuel » pour garder les images de chaque fiche dans un dossier à côté d’elle.",

  // --- Topic: revise/audit ---
  "help.audit.title": "Comment fonctionne l’audit de révision",
  "help.audit.intro": "Des listes de contrôle par niveaux qui mènent une version du brouillon brut au texte fini, du général au détail :",
  "help.audit.tier.story": "Histoire — 18 points de contrôle sur l’ensemble du manuscrit (enregistrés sur le projet).",
  "help.audit.tier.chapters": "Chapitres — 10 vérifications par chapitre : mérite-t-il sa place, accroche-t-il, fait-il avancer l’histoire, donne-t-il envie de continuer ? (Enregistrées sur le projet ; affichées dès que votre livre a des chapitres.)",
  "help.audit.tier.scene": "Scène — une passe en 14 points par scène (enregistrée dans le frontmatter de chaque scène).",
  "help.audit.tier.prose": "Style — 32 vérifications au niveau de la phrase, regroupées.",
  "help.audit.customize": "Renommez, réordonnez, masquez ou ajoutez des vérifications dans Personnaliser → Listes de révision.",
  "help.audit.opening": "La passe par scène classe automatiquement chaque ouverture (Action / Dialogue / Pensée / Réflexion) — corrigez-la si l’estimation est fausse. Cliquez sur une scène pour la déplier et modifier sa liste sur place, ou pour y aller dans Écrire.",

  // --- Topic: revise/todos ---
  "help.todos.title": "Comment fonctionne le journal de révision",
  "help.todos.intro": "Tout ce qui reste à réviser, dans une seule liste groupée par scène : les marqueurs entre crochets glissés pendant la rédaction, et les décisions de révision consignées en chemin. Utilisez les pastilles pour filtrer par type de marqueur ou de décision.",
  "help.todos.jump": "Cliquez sur un marqueur pour aller directement à cet endroit dans Écrire — il clignote pour que vous le traitiez vite ; modifiez le texte pour le retirer et la liste se met à jour à l’analyse suivante.",
  "help.todos.decisions": "Les décisions sont les choix au niveau de l’histoire (« à partir de maintenant, le frère est mort ») : consignez-en une avec « Consigner une décision », donnez-lui un type et rattachez-la à une scène ou à tout le projet. Cochez-la comme appliquée une fois le changement fait ; cliquez sur son texte pour la modifier. Préférez un marqueur [RESEARCH: ] ou [SCENE: ] pour les questions de recherche et les scènes manquantes — il signale l’endroit exact dans le texte.",

  // --- Topic: search ---
  "help.search.title": "Comment fonctionne la recherche",
  "help.search.scope": "Recherche plein texte dans le texte de vos scènes et dans leurs synopsis. Choisissez une portée — cette version, toute l’histoire, la série ou tout le coffre — et affinez avec les filtres de métadonnées (statut, PDV, chapitre, intrigue, personnage).",
  "help.search.results": "Les résultats sont groupés par scène. Cliquez sur un résultat pour y aller directement dans Écrire, où il clignote pour que vous le repériez vite. Un résultat dans un synopsis ouvre la scène sans clignotement (le synopsis ne fait pas partie du corps modifiable). Définissez seulement un filtre, sans requête, pour lister toutes les scènes correspondantes — un moyen rapide de trier vos scènes.",
  "help.search.matching": "La correspondance est littérale (pas de joker ni d’expression régulière), avec les options Respecter la casse et Mot entier ; les scènes archivées ne sont incluses que si vous cochez « Inclure les archivés ».",

  // --- Topic: publish/compile ---
  "help.compile.title": "Comment fonctionne la compilation",
  "help.compile.formats": "Assemblez les scènes du projet actif en un seul fichier manuscrit. Choisissez un format — Markdown, HTML, Word, ou PDF/EPUB via Pandoc —, indiquez le nom du fichier de sortie, et compilez.",
  "help.compile.docx": "Word (.docx) est intégré et fonctionne sur tous les appareils. Il produit un manuscrit standard : double interligne, paragraphes en retrait, chapitres sur une nouvelle page, une page de titre avec votre nom et le nombre de mots, et un en-tête courant. Ajoutez votre nom et vos coordonnées dans Paramètres → Inkswell → Manuscrit ; définissez un nom de plume et le nom de famille de l’en-tête livre par livre, sous le format.",
  "help.compile.steps": "La compilation se déroule en étapes que vous pouvez activer ou non : étapes par scène (retirer les marqueurs de tâche, y compris les vôtres, filtrer les métadonnées) et étapes du manuscrit (titres, sauts de page, nettoyage des lignes vides). Vos choix sont mémorisés pour chaque projet.",

  // --- Topic: customize ---
  "help.customize.title": "Comment fonctionne Personnaliser",
  "help.customize.intro": "Personnaliser change la forme même d’Inkswell — les types du codex et les champs de chacun, le contenu de départ d’une nouvelle fiche ou scène, les structures de temps forts, les statuts des scènes, les amorces d’écriture, les listes de révision et de publication, et les fonctionnalités facultatives affichées. Les préférences (objectifs, comportement de l’éditeur, dossiers) restent dans les paramètres.",
  "help.customize.tip.sections": "Choisissez une section à gauche ; modifiez à droite. Les changements sont enregistrés au fur et à mesure.",
  "help.customize.tip.templates": "Les champs du codex et le contenu de départ sont enregistrés dans des notes modèles ordinaires, dans le dossier Templates de votre dossier de base — les modifier ici modifie ces notes, et vous pouvez toujours les ouvrir directement.",
  "help.customize.tip.lossless": "Les éléments intégrés ne sont jamais supprimés : masquer ne fait rien perdre, renommer garde l’identifiant enregistré, et chaque section permet de revenir aux valeurs par défaut d’Inkswell.",
  "help.customize.tip.ownItems": "Vos propres éléments (un type personnalisé, un point de liste, une amorce) sont stockés dans le data.json de l’extension et voyagent avec le dossier de configuration de votre coffre.",

  // --- Help index section: home ---
  "help.section.home.phase": "Accueil",
  "help.section.home.summary": "Vos livres sur des étagères, l’arbre des scènes d’un livre et une boîte à idées pour vos histoires.",
  "help.home.hub": "Votre point de départ. Tous les projets affiche vos livres sous forme de cartes sur des étagères — une étagère par série, dans l’ordre des tomes, plus une pour les livres indépendants —, chacun avec sa couverture (ou une couverture générée), son numéro de tome, ses scènes et ses mots, sa progression vers l’objectif et la date de votre dernière modification. Cliquez sur une carte pour vous concentrer sur ce livre ; son menu ⋯ (au survol sur ordinateur, toujours visible sur écran tactile) permet de le renommer, de définir sa série, de changer la couverture ou de l’archiver.",
  "help.home.archive": "Archiver un livre terminé ou mis de côté ne fait que le ranger hors de vue : il quitte les étagères et la liste des projets, et attend dans la section Archivés en bas d’Accueil. Ses mots comptent toujours pour vos objectifs, et il se compile et garde son codex comme avant. Désarchivez-le depuis son menu ⋯. Dans une série, un livre archivé reste sur l’étagère, estompé — ou activez « Retirer les livres archivés de leur série » dans les paramètres pour l’enlever complètement de l’étagère de la série.",
  "help.home.focused": "Un livre sélectionné affiche la carte principale (couverture, logline, thème, objectif), une bande avec les autres couvertures de sa série (cliquez-en une pour changer de livre) et son arbre de scènes ; faites glisser les lignes de scène pour les réordonner, ou utilisez le menu ⋯ pour déplacer, renommer ou supprimer. L’inspecteur, à droite, modifie les métadonnées de la scène sélectionnée.",
  "help.home.ideas": "Notez vos idées d’histoire dans la boîte à idées sous les étagères sans quitter la page — appuyez sur Entrée pour enregistrer. Cliquez sur une idée pour la modifier sur place ; son menu ⋯ / clic droit permet de la copier, de l’enregistrer comme note dans le dossier Ideas de votre dossier de base (en la retirant de la boîte), de l’épingler en haut ou de la supprimer. Cliquez sur l’en-tête Idées pour replier la section.",
  "help.home.seriesHeading": "Séries",
  "help.home.seriesAdd": "Une série est un ensemble de livres qui partagent un nom — pas de note supplémentaire, juste une étiquette sur chaque livre. Ajoutez un livre à une série depuis son menu ⋯ / clic droit (Série…) ou depuis la ligne de série sous le titre de sa carte principale : choisissez une série existante ou créez-en une, et indiquez le numéro de tome (par défaut, le prochain disponible). Nouveau projet propose les mêmes champs : un livre peut donc être créé directement dans une série.",
  "help.home.seriesManage": "Le menu ⋯ / clic droit de l’en-tête de série gère l’ensemble : Nouveau livre dans cette série, Ajouter un projet existant, Renommer la série (tous les livres et toutes les fiches du codex à portée de série suivent) et Réordonner les livres (faites glisser, puis Enregistrer renumérote 1, 2, 3…).",

  // --- Help index section: plan ---
  "help.section.plan.phase": "Planifier",
  "help.section.plan.summary": "Les champs de la vue d’ensemble, la grille des temps forts et Structure (arbre du plan, tableau et grille d’intrigue).",
  "help.plan.overview": "La vue d’ensemble contient les champs propres au roman (logline, thème, genre) et des textes longs (synopsis, esquisse en trois actes). Temps forts est la grille des temps forts. Structure réunit l’arbre du plan, le tableau Kanban et la grille d’intrigue derrière un même sélecteur Arbre | Tableau | Grille — trois vues des mêmes scènes. Tout est détaillé ci-dessous.",
  "help.plan.sortByChapter": "Vous importez un manuscrit numéroté dont les scènes sont arrivées dans le désordre ? Structure → Arbre propose un bouton « Trier par chapitre » (aussi dans le menu ⋯ d’un livre dans Accueil, et sous forme de commande « Trier les scènes par numéro de chapitre ») : il réordonne une fois le manuscrit selon le numéro figurant dans le libellé de chapitre de chaque scène — en chiffres ou en toutes lettres — et laisse les scènes non numérotées dans leur ordre actuel, à la fin. C’est une action ponctuelle, pas un mode ; l’ordre par glisser-déposer vous appartient ensuite.",

  // --- Help index section: write ---
  "help.section.write.phase": "Écrire",
  "help.section.write.summary": "L’éditeur de manuscrit sans distraction et les marqueurs de tâche.",

  // --- Help index section: codex ---
  "help.section.codex.phase": "Codex",
  "help.section.codex.summary": "La bible de votre histoire, avec une portée globale, projet ou série.",

  // --- Help index section: search ---
  "help.section.search.phase": "Rechercher",
  "help.section.search.summary": "Recherche plein texte dans les scènes, avec portée et filtres.",

  // --- Help index section: track ---
  "help.section.track.phase": "Suivi",
  "help.section.track.summary": "Nombre de mots, séries, rythme, sprints et structure.",
  "help.track.dashboard": "Un tableau de bord de votre écriture : totaux quotidiens, hebdomadaires et mensuels, séries, carte de chaleur sur 26 semaines, historique des sprints et répartition de la structure des scènes. La barre d’état, en bas, reflète la progression du jour et tout sprint en cours — cliquez dessus pour ouvrir Suivi.",
  "help.track.goals": "Seule l’écriture dans les projets compte pour les objectifs — par défaut, les scènes du manuscrit. Paramètres → Ce qui compte pour les objectifs permet d’inclure aussi les notes de planification, les notes du codex ou les autres notes de projet ; le reste de votre coffre ne compte jamais.",
  "help.track.sprint": "Lancez un sprint chronométré depuis la barre de navigation (ou avec la commande « Lancer un sprint d’écriture ») pour écrire contre la montre, avec un objectif de mots.",
  "help.track.challenge": "Un défi d’écriture (« Configurer un défi d’écriture », ou le lien de la carte Objectifs) est une période et un objectif de mots — disons 50 000 mots en novembre. Il compte chaque mot pris en compte pour les objectifs écrit pendant cette période, dans n’importe quel projet, et indique où vous devriez en être aujourd’hui, votre avance ou votre retard, et ce qu’il vous reste à écrire aujourd’hui. Cliquez sur le total pour le copier vers le site d’un événement. Vous écrivez sur plusieurs appareils ? Activez la synchronisation de l’historique pour que le total les inclue tous.",

  // --- Help index section: revise ---
  "help.section.revise.phase": "Réviser",
  "help.section.revise.summary": "Listes de l’audit, journal de révision et analyse du style.",
  "help.revise.analysisHeading": "Analyse",
  "help.revise.analysis": "Indices de lisibilité, vos mots les plus fréquents et détection des expressions répétées (échos) sur l’ensemble du manuscrit — à lancer à la demande pour une passe de style.",

  // --- Help index section: publish ---
  "help.section.publish.phase": "Publier",
  "help.section.publish.summary": "Compilation, liste d’autoédition et planification du lancement.",
  "help.publish.checklistHeading": "Liste de contrôle et lancement",
  "help.publish.checklist": "Liste de contrôle suit une cinquantaine de tâches d’autoédition, plus une fiche de métadonnées par format (ISBN, quatrième de couverture, mots-clés). Lancement planifie un calendrier de précommande aux dates d’étapes calculées automatiquement, avec des suivis pour le budget, la couverture, le marketing et les lecteurs SP.",

  // --- Help index section: customize ---
  "help.section.customize.phase": "Personnaliser",
  "help.section.customize.summary": "Adaptez Inkswell à votre méthode — types, champs, modèles, structures, listes de contrôle, amorces.",

  // --- Help index section: data ---
  "help.section.data.phase": "Vos données et sauvegardes",
  "help.section.data.summary": "Où tout est stocké, et comment le récupérer.",
  "help.data.storage": "Tout ce qu’Inkswell enregistre est du texte brut. Le texte des scènes est fait de notes ordinaires dans le dossier des scènes de votre projet. Les données de planification — temps forts, structure du plan, objectifs, journal de révision, listes de l’audit, réglages de compilation et de publication — se trouvent dans le frontmatter de la NOTE D’INDEX DU PROJET : la note qui porte le nom de votre projet, à côté de vos scènes. Les fiches du codex sont des notes ordinaires avec une clé codex. Les paramètres de l’extension, l’historique d’écriture, les sprints et la boîte à idées se trouvent dans le data.json de l’extension.",
  "help.data.history": "L’historique d’écriture compte les mots que vous tapez dans Obsidian — dans ses éditeurs et dans le panneau Écrire. Un fichier modifié hors d’Obsidian, ou arrivé d’un autre appareil par synchronisation, ne fait que réinitialiser le point de départ de ce fichier ; ces mots ne sont jamais comptés comme écrits sur cet appareil.",
  "help.data.sync": "Pour voir ensemble l’historique de tous vos appareils, activez « Synchroniser l’historique d’écriture entre appareils » dans les paramètres. Chaque appareil tient alors une petite note de journal écrite automatiquement (avec une clé inkswell-log dans son frontmatter) dans le dossier « Writing log » de votre dossier de base, et Suivi les fusionne. Renommez un appareil via la propriété device de cette note ; si un appareil n’existe plus, supprimez sa note.",
  "help.data.recoveryHeading": "En cas de problème",
  "help.data.fileRecovery": "La Récupération de fichiers d’Obsidian (Paramètres → Récupération de fichiers → Afficher) conserve des instantanés réguliers de chaque note modifiée, y compris celles qu’écrit Inkswell. Sa recherche porte sur les NOMS DE FICHIERS : pour les données de planification, cherchez le nom de votre projet et ouvrez les instantanés de la note d’index ; pour le texte, cherchez le nom de la scène.",
  "help.data.conflicts": "Chaque fois qu’Inkswell doit remplacer une version de votre texte — pour résoudre un conflit entre l’éditeur et le disque, quand vous quittez une scène avant d’en avoir résolu un, ou quand vous lui demandez d’écraser un fichier pendant la compilation —, la version remplacée est d’abord enregistrée dans le dossier « Inkswell conflicts ». Rien n’est jeté en silence.",
  "help.data.backups": "Inkswell garde aussi une sauvegarde quotidienne de data.json (les 7 derniers jours) dans un dossier backups à côté de lui — dans le dossier de l’extension, sous le dossier de configuration de votre coffre. Pour ne récupérer que vos paramètres (types de codex personnalisés, types renommés, changements de Personnaliser, barre de navigation), lancez la commande « Restaurer les paramètres depuis une sauvegarde » et choisissez un jour ; votre historique d’écriture reste tel quel. Pour tout restaurer : désactivez Inkswell, copiez la sauvegarde par-dessus data.json, puis réactivez-le. Si data.json est illisible au démarrage d’Obsidian, Inkswell charge de lui-même la sauvegarde la plus récente et vous prévient.",

  // --- Help panel ---
  "help.panel.title": "Comment fonctionne Inkswell",
  "help.panel.intro": "Un guide de référence pour chaque partie de l’atelier. Le parcours va de Planifier → Écrire → Réviser → Publier, avec Codex et Suivi à vos côtés. Dépliez une section pour entrer dans le détail.",
  "help.panel.shape": "Adaptez Inkswell à votre méthode dans {link} — types et champs du codex, modèles, structures, listes de contrôle, amorces et fonctionnalités affichées (ou faites un clic droit sur un onglet facultatif pour le masquer). Masquer ne fait rien perdre — vos données sont conservées, et réactiver les restaure.",
  "help.panel.shape.link": "Personnaliser",
  "help.panel.reset": "Réinitialiser les conseils et revoir l’accueil",
  "help.panel.reset.done": "Conseils réinitialisés.",

  // --- Contextual tip ---
  "help.hint.dismiss": "Fermer ce conseil",

  // --- Welcome ---
  "welcome.title": "Bienvenue dans Inkswell",
  "welcome.intro": "Un atelier complet pour romanciers — un seul onglet, organisé selon la phase où vous en êtes. Changez de phase avec la barre d’icônes à gauche :",
  "welcome.phase.plan.name": "Planifier",
  "welcome.phase.plan.blurb": "Vue d’ensemble, grille des temps forts et structure de l’histoire.",
  "welcome.phase.write.name": "Écrire",
  "welcome.phase.write.blurb": "Éditeur sans distraction, avec marqueurs de tâche.",
  "welcome.phase.revise.name": "Réviser",
  "welcome.phase.revise.blurb": "Audit, journal des décisions et passes de relecture.",
  "welcome.phase.publish.name": "Publier",
  "welcome.phase.publish.blurb": "Compilez et lancez votre livre.",
  "welcome.phase.codex.name": "Codex",
  "welcome.phase.codex.blurb": "La bible de votre histoire, utilisée partout.",
  "welcome.phase.track.name": "Suivi",
  "welcome.phase.track.blurb": "Nombre de mots, séries et sprints.",
  "welcome.tips": "Nouveau sur un panneau ? Cherchez le conseil « Comment ça marche » en haut — fermez-le une fois compris. L’onglet Aide de la barre de navigation garde le guide complet.",
  "welcome.start": "Commencer",
};
