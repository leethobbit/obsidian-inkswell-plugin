/** German UI strings — the `settings` area (mirrors ../en/settings.ts). */
import type { Catalog } from "../types";

export const settings: Catalog = {
  // --- Settings tab ------------------------------------------------------------
  "settings.customize.name": "Inkswell anpassen",
  "settings.customize.desc":
    "Codex-Typen und -Felder, Startvorlagen, Beat-Strukturen, Szenenstatus, Schreibimpulse, Checklisten und welche Funktionen angezeigt werden – alles direkt in Inkswell bearbeitet.",
  "settings.customize.button": "Anpassen öffnen",
  "settings.defaultCompileFormat.name": "Standardformat zum Kompilieren",
  "settings.defaultCompileFormat.desc": "Format, das beim Öffnen des Kompilieren-Dialogs vorausgewählt ist.",
  "settings.showWordCounts.name": "Wortzahlen anzeigen",
  "settings.showWordCounts.desc": "Wortzahlen pro Szene und pro Projekt im Explorer anzeigen.",
  "settings.hideArchived.name": "Archivierte Bücher in ihrer Reihe ausblenden",
  "settings.hideArchived.desc":
    "Ein archiviertes Buch verschwindet aus dem Regal seiner Reihe und von den Reihen-Covern auf Start und wartet unter dem Namen der Reihe im Bereich „Archiviert“ – praktisch für Kurzgeschichten, die du archivierst, sobald sie erschienen sind. Ist die Option aus, bleiben archivierte Bücher abgeblendet im Regal der Reihe.",
  "settings.syncHistory.name": "Schreibverlauf zwischen Geräten synchronisieren",
  "settings.syncHistory.desc":
    "Wörter werden auf dem Gerät gezählt, auf dem du sie tippst. Schalte dies ein, um pro Gerät eine kleine Protokollnotiz im Ordner „Writing log“ deines Basisordners zu führen und sie unter Fortschritt zusammenzuführen – so enthalten Serien und Summen alle Geräte. Die Synchronisierung deines Tresors (Obsidian Sync, iCloud, …) überträgt die Notizen.",
  "settings.sceneHeadingLevel.name": "Überschriftenebene für Szenen",
  "settings.sceneHeadingLevel.desc": "Überschriftenebene (1–6) für den optionalen Kompilierschritt „Titel voranstellen“.",

  // --- Settings → Manuscript -------------------------------------------------
  "settings.manuscript.heading": "Manuskript",
  "settings.authorName.name": "Dein Name",
  "settings.authorName.desc":
    "Dein bürgerlicher Name für das Titelblatt von Word-Manuskripten. Der Autorenname eines Buchs (Pseudonym) kann abweichen – lege ihn unter Publizieren → Kompilieren fest.",
  "settings.authorContact.name": "Kontaktdaten",
  "settings.authorContact.desc":
    "Adresse, E-Mail, Telefon – eine Angabe pro Zeile, unter deinem Namen auf dem Titelblatt.",
  "settings.compileFormat.md": "Markdown",
  "settings.compileFormat.html": "HTML",
  "settings.compileFormat.docx": "Word (.docx)",
  "settings.compileFormat.pandoc": "Pandoc (docx/pdf/epub)",
  "settings.interfaceLanguage.name": "Sprache der Oberfläche",
  "lib.rowMenu.openInTabHint": "Strg/Cmd-Klick öffnet in neuem Tab",
  "settings.interfaceLanguage.desc":
    "Inkswell folgt der Sprache von Obsidian, wenn es eine geprüfte Übersetzung gibt. Wähle hier eine Sprache, um das zu überschreiben – auch Übersetzungsentwürfe. Text, der in deine Notizen geschrieben wird, bleibt unverändert.",
  "settings.interfaceLanguage.auto": "Wie Obsidian",
  "settings.interfaceLanguage.draft": "{name} (Entwurf – hilf beim Prüfen)",
  "settings.interfaceLanguage.applied": "Sprache geändert. Befehlsnamen, dieser Einstellungs-Tab und die Tableiste auf dem Smartphone wechseln nach einem Neustart von Obsidian.",
  "settings.companionSceneTarget.name": "Szenen aus der Seitenleiste öffnen in",
  "settings.companionSceneTarget.desc":
    "Wo sich eine Szene öffnet, wenn du sie in einer Begleitansicht der Seitenleiste anklickst. Strg/Cmd-Klick öffnet immer einen neuen Tab.",
  "settings.companionSceneTarget.write": "Inkswell Schreiben",
  "settings.companionSceneTarget.tab": "Einem normalen Tab",

  // --- Settings → Write editor -----------------------------------------------
  "settings.writeEditor.heading": "Schreibeditor",
  "settings.typewriterMode.name": "Schreibmaschinenmodus",
  "settings.typewriterMode.desc":
    "Hält die Zeile, in der du tippst, im Schreibeditor vertikal mittig, damit deine Augen an einer Stelle bleiben. Mausklicks zentrieren nicht neu. Auch als Befehl „Schreibmaschinenmodus ein/aus (Schreibeditor)“ verfügbar.",
  "settings.manuscriptTypography.name": "Manuskript-Typografie",
  "settings.manuscriptTypography.desc":
    "Buchähnliches Layout im Schreibeditor: Absätze erhalten einen Erstzeileneinzug (außer dem ersten Absatz nach einer Überschrift oder einem Szenenwechsel), und Überschriften werden zentriert. Rein optisch – dein Text bleibt unverändert. Die Schrift folgt Obsidians Darstellung → Textschrift.",
  "settings.smartDashes.name": "Intelligente Striche",
  "settings.smartDashes.desc":
    "Im Schreibeditor wird -- zum Halbgeviertstrich (–) und ein drittes - zum Geviertstrich (—). Eine Zeile aus Strichen (---) bleibt unverändert. Gilt nur für den Schreibeditor von Inkswell, nicht für Obsidians Notizen.",
  "settings.smartQuotes.name": "Typografische Anführungszeichen",
  "settings.smartQuotes.desc":
    "Gerade Anführungszeichen, die du im Schreibeditor tippst, werden zu typografischen (“ ” und ‘ ’); Apostrophe werden zu ’. In Code und Links nicht angewendet.",
  "settings.smartEllipsis.name": "Intelligente Auslassungspunkte",
  "settings.smartEllipsis.desc": "Drei im Schreibeditor getippte Punkte werden zu Auslassungspunkten (…).",
  "settings.milestoneWords.name": "Meilenstein-Marken alle …",
  "settings.milestoneWords.desc":
    "Setzt im Rand des Schreibeditors eine kleine Marke an die Zeile, an der die laufende Wortzahl der Szene ein Vielfaches dieser Zahl überschreitet (z. B. 500 → Marken bei 500, 1k, 1,5k …). 0 = aus; mindestens 100.",

  // --- Settings → Goals & sprints --------------------------------------------
  "settings.goals.heading": "Ziele & Sprints",
  "settings.weekStart.name": "Woche beginnt am",
  "settings.weekStart.desc": "Erster Wochentag für Wochenziele, Gewohnheits-Tracking und die Heatmap.",
  "settings.weekStart.monday": "Montag",
  "settings.weekStart.sunday": "Sonntag",
  "settings.dailyWordGoal.name": "Tägliches Wortziel",
  "settings.dailyWordGoal.desc": "Angestrebte Wörter pro Tag, angezeigt in der Statusleiste und der Statistik.",
  "settings.weeklyWordGoal.name": "Wöchentliches Wortziel",
  "settings.weeklyWordGoal.desc": "Angestrebte Wörter pro Woche (Wochenbeginn → heute).",
  "settings.monthlyWordGoal.name": "Monatliches Wortziel",
  "settings.monthlyWordGoal.desc": "Angestrebte Wörter pro Monat (1. → heute).",
  "settings.habitDaysPerWeek.name": "Gewohnheit: Tage pro Woche",
  "settings.habitDaysPerWeek.desc": "An wie vielen Tagen pro Woche du schreiben möchtest.",
  "settings.habitMinWords.name": "Gewohnheit: Mindestwörter pro Tag",
  "settings.habitMinWords.desc": "Mindestanzahl an Wörtern, damit ein Tag für die Gewohnheit zählt.",
  "settings.defaultSprintMinutes.name": "Standardlänge eines Sprints",
  "settings.defaultSprintMinutes.desc": "Standarddauer eines Sprints in Minuten.",
  "settings.defaultSprintWordGoal.name": "Standard-Wortziel für Sprints",
  "settings.defaultSprintWordGoal.desc": "Wortziel, das im Sprint-Dialog vorausgefüllt ist. 0 = kein Ziel.",
  "settings.streakThreshold.name": "Schwelle für Schreibserien",
  "settings.streakThreshold.desc": "Mindestanzahl an Wörtern an einem Tag, damit er deine Schreibserie verlängert.",

  // --- Settings → What counts toward goals -----------------------------------
  "settings.counts.heading": "Was für Ziele zählt",
  "settings.counts.intro":
    "Ziele, Serien und Sprints zählen nur, was du in Projektnotizen schreibst – Notizen an anderen Stellen im Tresor zählen nie. Wähle, welche Arten zählen. Wenn du einen Schalter änderst, werden auch die Wörter neu gezählt, die seit Einführung dieser Option geschrieben wurden; älterer Verlauf zählt immer.",
  "settings.counts.scene.name": "Manuskriptszenen",
  "settings.counts.scene.desc": "Szenendateien und Ein-Notiz-Projekte – das Manuskript selbst.",
  "settings.counts.planning.name": "Planungsnotizen",
  "settings.counts.planning.desc": "Die Planungsnotiz jedes Projekts (Synopsis, Plot-Grundlagen, Akt-Skizze).",
  "settings.counts.codex.name": "Codex-Notizen",
  "settings.counts.codex.desc": "Notizen mit einem codex-Schlüssel (Figuren, Orte, Hintergrundwissen), egal wo sie liegen.",
  "settings.counts.other.name": "Andere Projektnotizen",
  "settings.counts.other.desc": "Die Indexnotiz des Projekts und alle anderen Notizen im Projektordner.",

  // --- Settings → Folders ----------------------------------------------------
  "settings.folders.heading": "Ordner",
  "settings.baseFolder.name": "Basisordner",
  "settings.baseFolder.desc":
    "Ordner, unter dem neue Projekte und das gemeinsame Codex-Gerüst angelegt werden. Leer = Stammverzeichnis des Tresors. Legt nur fest, wo neue Inhalte entstehen – bestehende Projekte und Codex-Einträge funktionieren überall im Tresor weiter.",
  "settings.baseFolder.placeholder": "(Stammverzeichnis des Tresors)",
  "settings.codexFolder.name": "Name des Codex-Ordners",
  "settings.codexFolder.desc": "Name des Unterordners für Codex-Notizen (gemeinsam und pro Projekt).",
  "settings.coLocateCodex.name": "Codex bei den Projekten ablegen",
  "settings.coLocateCodex.desc":
    "Einträge, die zu einem Buch gehören, werden im eigenen Codex-Ordner des Projekts angelegt; Einträge für Reihen und global gehen in den gemeinsamen Basis-Codex. Dient nur der Ordnung – die Sichtbarkeit legt das Feld „Geltungsbereich“ jedes Eintrags fest, nicht der Speicherort der Notiz.",

  // --- Settings → Layout -----------------------------------------------------
  "settings.layout.heading": "Layout",
  "settings.forceTablet.name": "Volles Layout auf diesem Gerät verwenden",
  "settings.forceTablet.desc":
    "Obsidian stuft diesen Bildschirm als Smartphone-Größe ein, daher zeigt Inkswell sein Smartphone-Layout und blendet Planen und Publizieren hinter einem Hinweis „Benötigt einen größeren Bildschirm“ aus. Schalte dies ein, wenn du ein Tablet nutzt.",

  // --- Settings → Help -------------------------------------------------------
  "settings.help.heading": "Hilfe",
  "settings.showHints.name": "Kontextbezogene Tipps anzeigen",
  "settings.showHints.desc":
    "Zeigt die schließbaren Hinweise „So funktioniert’s“ oben in den Bereichen. Geschlossene Tipps bleiben verborgen, bis du sie unten zurücksetzt.",
  "settings.resetTips.name": "Tipps zurücksetzen & Willkommen erneut zeigen",
  "settings.resetTips.desc": "Alle geschlossenen Tipps wieder aktivieren und den Willkommensbildschirm erneut anzeigen.",
  "settings.resetTips.done": "Tipps zurückgesetzt.",

  // --- Restore settings modal ------------------------------------------------
  "settings.restore.placeholder": "Einstellungen wiederherstellen aus der Sicherung vom …",

  // --- Optional features (src/features.ts) -------------------------------------
  "feature.group.planning": "Planung",
  "feature.group.revision": "Überarbeitung",
  "feature.group.publishing": "Veröffentlichung",
  "feature.group.writing": "Schreiben",
  "feature.beats.label": "Beats",
  "feature.beats.desc": "Der Beat-Sheet-Planer (Planen → Beats) und sein Szenengerüst.",
  "feature.board.label": "Board",
  "feature.board.desc": "Die Kanban-Board-Ansicht deiner Szenen (Planen → Struktur → Board).",
  "feature.plotGrid.label": "Plot-Raster",
  "feature.plotGrid.desc":
    "Die Matrix Handlungsstrang × Kapitel (Planen → Struktur → Raster) und das Szenenfeld „Handlungsstränge“.",
  "feature.audit.label": "Überarbeitungsprüfung",
  "feature.audit.desc": "Die Prüf-Checklisten für die Überarbeitung und der Tracker für Figurenbögen (Überarbeiten → Prüfung).",
  "feature.analysis.label": "Analyse",
  "feature.analysis.desc": "Lesbarkeit, Worthäufigkeit und Wortwiederholungen (Überarbeiten → Analyse).",
  "feature.checklist.label": "Veröffentlichungs-Checkliste",
  "feature.checklist.desc": "Die Aufgaben-Checkliste fürs Selfpublishing (Publizieren → Checkliste).",
  "feature.launch.label": "Launch-Planer",
  "feature.launch.desc": "Der Vorbestellungs-Zeitplan und die Launch-Tracker (Publizieren → Launch).",
  "feature.prompts.label": "Schreibimpulse",
  "feature.prompts.desc": "Die Schaltfläche für Schreibimpulse und Ideenfindung in der Werkzeugleiste von Schreiben.",
  "feature.stream.label": "Szenenfluss",
  "feature.stream.desc":
    "Die Fluss-Ansicht von Schreiben: Lies und bearbeite die Szenen eines Buchs als eine durchgehende Seite. Nicht auf Smartphones.",
  "feature.tracking.label": "Tracking",
  "feature.tracking.desc":
    "Wortziele, Schreibsprints, der Zähler in der Statusleiste und das Fortschritt-Dashboard. Wörter werden auch im ausgeblendeten Zustand erfasst, sodass beim Wiedereinschalten der vollständige Verlauf erscheint.",

  // --- Shared helpers (src/lib) ------------------------------------------------
  "lib.hideMenu.item": "{label} ausblenden",
  "lib.hideMenu.hidden": "{label} ausgeblendet.",
  "lib.hideMenu.notice": "{hidden} {undo} – oder unter Anpassen → Funktionen wieder einschalten.",
  "lib.hideMenu.undo": "Rückgängig",
  "lib.listEditor.moveUp": "Nach oben",
  "lib.listEditor.moveDown": "Nach unten",
  "lib.phoneRedirect.title": "{surface} benötigt einen größeren Bildschirm",
  "lib.phoneRedirect.body":
    "Öffne dieses Projekt auf einem Tablet oder Computer, um diese Ansicht zu nutzen. Schreiben und deine Szenenliste funktionieren hier auf dem Smartphone.",
  "lib.phoneRedirect.useFullLayout": "Kein Smartphone? Volles Layout verwenden",
  "lib.rowMenu.more": "Weitere Aktionen",
  "lib.images.pickPlaceholder": "Bild aus dem Tresor wählen …",
  "lib.relativeTime.justNow": "gerade eben",
  "lib.relativeTime.minutes.one": "vor {count} Min.",
  "lib.relativeTime.minutes.other": "vor {count} Min.",
  "lib.relativeTime.hours.one": "vor {count} Std.",
  "lib.relativeTime.hours.other": "vor {count} Std.",
  "lib.relativeTime.days.one": "vor {count} Tag",
  "lib.relativeTime.days.other": "vor {count} Tagen",
  "lib.relativeTime.weeks.one": "vor {count} Wo.",
  "lib.relativeTime.weeks.other": "vor {count} Wo.",
  "lib.relativeTime.months.one": "vor {count} Mon.",
  "lib.relativeTime.months.other": "vor {count} Mon.",
  "lib.relativeTime.years.one": "vor {count} J.",
  "lib.relativeTime.years.other": "vor {count} J.",
  "lib.settingsSummary.none": "keine Einstellungen",
  "lib.settingsSummary.customTypes.one": "{count} eigener Codex-Typ",
  "lib.settingsSummary.customTypes.other": "{count} eigene Codex-Typen",
  "lib.settingsSummary.renamedTypes.one": "{count} umbenannter Typ",
  "lib.settingsSummary.renamedTypes.other": "{count} umbenannte Typen",
  "lib.settingsSummary.beatTemplates.one": "{count} Beat-Vorlage",
  "lib.settingsSummary.beatTemplates.other": "{count} Beat-Vorlagen",
  "lib.settingsSummary.lists.one": "{count} angepasste Liste",
  "lib.settingsSummary.lists.other": "{count} angepasste Listen",
  "lib.settingsSummary.rail": "Leiste angeordnet",
  "lib.settingsSummary.challenge": "Schreib-Challenge",
  "lib.settingsSummary.defaults": "Standardeinstellungen",

  // --- Customize → catalog -----------------------------------------------------
  "customize.group.codex": "Codex",
  "customize.group.plan": "Planen",
  "customize.group.write": "Schreiben",
  "customize.group.revise": "Überarbeiten",
  "customize.group.publish": "Publizieren",
  "customize.group.inkswell": "Inkswell",
  "customize.entry.codexTypes": "Codex-Typen & Felder",
  "customize.entry.beatTemplates": "Beat-Vorlagen",
  "customize.entry.sceneTemplate": "Szenenvorlage",
  "customize.entry.sceneStatuses": "Szenenstatus",
  "customize.entry.sceneFields": "Felder im Szenen-Inspektor",
  "customize.entry.writingPrompts": "Schreibimpulse",
  "customize.entry.todoMarkers": "To-do-Markierungen",
  "customize.entry.revisionChecklists": "Überarbeitungs-Checklisten",
  "customize.entry.publishingChecklist": "Veröffentlichungs-Checkliste",
  "customize.entry.features": "Funktionen",

  // --- Customize → panel -------------------------------------------------------
  "customize.badge.hidden": "ausgeblendet",
  "customize.badge.yours": "eigene",
  "customize.hiddenFeature": "Diese Funktion ist derzeit ausgeblendet. {link}.",
  "customize.hiddenFeature.link": "Unter „Funktionen“ einschalten",

  // --- Customize → catalog-row summaries (joined with " · ") ------------------
  "customize.summary.builtIn.one": "{count} integriert",
  "customize.summary.builtIn.other": "{count} integriert",
  "customize.summary.yours.one": "{count} eigene",
  "customize.summary.yours.other": "{count} eigene",
  "customize.summary.hidden.one": "{count} ausgeblendet",
  "customize.summary.hidden.other": "{count} ausgeblendet",
  "customize.summary.renamed.one": "{count} umbenannt",
  "customize.summary.renamed.other": "{count} umbenannt",
  "customize.summary.custom.one": "{count} eigenes",
  "customize.summary.custom.other": "{count} eigene",
  "customize.summary.reordered": "neu angeordnet",
  "customize.summary.customized": "Angepasst",

  // --- Customize → list editor (override-editor.ts) ----------------------------
  "list.addGroup": "Gruppe hinzufügen …",
  "list.newGroup": "Neue Gruppe",
  "list.groupName": "Gruppenname",
  "list.showGroup": "Gruppe einblenden",
  "list.hideGroup": "Gruppe ausblenden",
  "list.removeGroup": "Gruppe entfernen",
  "list.wasLabel": "vorher „{label}“",
  "list.show": "Einblenden",
  "list.hide": "Ausblenden",
  "list.restoreName": "Ursprünglichen Namen wiederherstellen",
  "list.removed": "„{label}“ entfernt. Alles, was darunter schon abgehakt ist, bleibt in deinen Notizen.",
  "list.resetDefaults": "Auf Inkswell-Standard zurücksetzen",
  "list.meta.auditScene": "Prüfpunkte für Szenen",
  "list.meta.auditStory": "Prüfpunkte für die Geschichte",
  "list.meta.auditChapter": "Prüfpunkte für Kapitel",
  "list.meta.auditPage": "Prüfpunkte für den Text",
  "list.task.empty": "Hier gibt es noch keine Aufgaben.",
  "list.task.add": "Aufgabe hinzufügen …",
  "list.task.new": "Neue Aufgabe",
  "list.task.aria": "Aufgabenbezeichnung",
  "list.checkpoint.empty": "Hier gibt es noch keine Prüfpunkte.",
  "list.checkpoint.add": "Prüfpunkt hinzufügen …",
  "list.checkpoint.new": "Neuer Prüfpunkt",
  "list.checkpoint.aria": "Prüfpunktbezeichnung",
  "list.field.empty": "Hier gibt es noch keine Felder.",
  "list.field.add": "Feld hinzufügen …",
  "list.field.new": "Neues Feld",
  "list.field.aria": "Feldbezeichnung",
  "list.status.empty": "Hier gibt es noch keine Status.",
  "list.status.add": "Status hinzufügen …",
  "list.status.new": "Neuer Status",
  "list.status.aria": "Statusbezeichnung",
  "list.marker.empty": "Hier gibt es noch keine Markierungen.",
  "list.marker.add": "Markierung hinzufügen …",
  "list.marker.new": "Neue Markierung",
  "list.marker.aria": "Markierungsbezeichnung",
  "list.prompt.empty": "Hier gibt es noch keine Impulse.",
  "list.prompt.add": "Impuls hinzufügen …",
  "list.prompt.new": "Neuer Impuls",
  "list.prompt.aria": "Impulstext",

  // --- Customize → fields editor (field-spec*.ts) ------------------------------
  "customize.fieldKind.text": "Text",
  "customize.fieldKind.textarea": "Langer Text",
  "customize.fieldKind.number": "Zahl",
  "customize.fieldKind.date": "Datum",
  "customize.fieldKind.list": "Liste",
  "customize.fieldKind.image": "Bild",
  "customize.fieldKind.links": "Links",
  "customize.fieldKind.link": "Einzelner Link",
  "customize.fields.startWithLetter": "Die Bezeichnung muss mit einem Buchstaben beginnen.",
  "customize.fields.enterLabel": "Gib eine Bezeichnung ein.",
  "customize.fields.reserved": "„{key}“ wird von Inkswell verwaltet.",
  "customize.fields.duplicate": "„{key}“ ist bereits ein Feld.",
  "customize.fields.badKey": "Verwende Buchstaben und Ziffern (keine Leer- oder Sonderzeichen).",
  "customize.fields.createTemplateFailed": "Die Vorlagennotiz konnte nicht erstellt werden.",
  "customize.fields.saveFailed": "Die Felder konnten nicht gespeichert werden.",
  "customize.fields.resetFailed": "Die Felder konnten nicht zurückgesetzt werden.",
  "customize.fields.labelPlaceholder": "Bezeichnung",
  "customize.fields.labelAria": "Bezeichnung für {key}",
  "customize.fields.kindAria": "Art von {key}",
  "customize.fields.anyType": "Beliebiger Typ",
  "customize.fields.typeEither": "{first} oder {second}",
  "customize.fields.restrictAria": "{key} auf einen Typ beschränken",
  "customize.fields.perLinkLabels": "Bezeichnung pro Link",
  "customize.fields.add": "Feld hinzufügen …",
  "customize.addField.title": "Feld hinzufügen",
  "customize.addField.label": "Bezeichnung",
  "customize.addField.labelPlaceholder": "z. B. Geburtsdatum",
  "customize.addField.kind": "Art",
  "customize.addField.builtin.name": "Oder eines der integrierten Felder von Inkswell hinzufügen",
  "customize.addField.builtin.desc":
    "Behält seine Bezeichnung und Auswahl – ein Bestiarium kann sich zum Beispiel „Beziehungen“ ausleihen.",
  "customize.addField.storedAs": "Gespeichert als {key}",

  // --- Customize → template body editor ----------------------------------------
  "customize.templateBody.create": "Vorlagennotiz erstellen",
  "customize.templateBody.loading": "Wird geladen …",
  "customize.templateBody.saveFailed": "Die Vorlage konnte nicht gespeichert werden.",
  "customize.templateBody.open": "Vorlagennotiz öffnen",
  "customize.templateBody.openAria": "{path} in einem Tab öffnen (zum Bearbeiten des Frontmatters)",

  // --- Customize → Codex types -------------------------------------------------
  "customize.codex.intro":
    "Jeder Codex-Typ hat eine Darstellung (Name, Plural, Symbol), die Felder, die seine Einträge im Codex-Bereich zeigen, und den Startinhalt, mit dem ein neuer Eintrag beginnt. Felder und Startinhalt stehen in einer gewöhnlichen Vorlagennotiz – wenn du hier etwas bearbeitest, bearbeitest du diese Notiz.",
  "customize.codex.rowDescRenamed": "{plural} · codex: {id} · umbenannt von {shipped}",
  "customize.codex.rowDesc": "{plural} · codex: {id}",
  "customize.codex.rowDescCustom": "{plural} · codex: {id} · eigener",
  "customize.codex.entries.one": "{count} Eintrag",
  "customize.codex.entries.other": "{count} Einträge",
  "customize.codex.fieldsFrom": "Felder: {name}",
  "customize.codex.fieldsShipped": "Felder: Standard",
  "customize.codex.editDisplay": "Darstellung bearbeiten …",
  "customize.codex.deleteType": "Typ löschen …",
  "customize.codex.newType": "Neuer Typ …",
  "customize.codex.generate": "Alle Startvorlagen erzeugen",
  "customize.codex.generateAria":
    "Eine Vorlagennotiz für jeden Typ ohne Vorlage erstellen (plus Scene.md und eine README)",
  "customize.codex.vaultRoot": "(Stammverzeichnis des Tresors)",
  "customize.codex.generateFailed": "Die Startvorlagen konnten nicht erzeugt werden.",
  "customize.codex.generated.one": "{count} Vorlage in „{folder}“ erstellt.",
  "customize.codex.generated.other": "{count} Vorlagen in „{folder}“ erstellt.",
  "customize.codex.generatedNone": "Die Vorlagen existieren bereits – nichts zu erstellen.",
  "customize.codex.back": "‹ Codex-Typen",
  "customize.codex.gone": "Diesen Typ gibt es nicht mehr.",
  "customize.codex.idLine": "codex: {id}",
  "customize.codex.card.display": "Darstellung",
  "customize.codex.card.fields": "Felder",
  "customize.codex.card.starter": "Startinhalt",
  "customize.codex.starterHint":
    "Damit beginnt ein neuer Eintrag. {{title}} wird zum Namen des Eintrags. Inkswell fügt codex: und den Projekt- bzw. Reihen-Geltungsbereich selbst hinzu – füge keinen codex:-Schlüssel hinzu.",
  "customize.codex.starterNone": "Noch keine Vorlagennotiz – neue {plural} beginnen nur mit einer Überschrift.",
  "customize.codex.display.name": "Name",
  "customize.codex.display.plural": "Plural",
  "customize.codex.display.icon": "Symbol",
  "customize.codex.display.shipped": "Ausgeliefert als {label} / {plural} / {icon}. Einträge behalten codex: {id}.",
  "customize.codex.display.edit": "Bearbeiten …",
  "customize.codex.display.reset": "Auf Standard zurücksetzen",
  "customize.codex.fieldsSource": "Felder aus {link}. „Aliasse“ steht immer an erster Stelle.",
  "customize.codex.fieldsSourceShipped":
    "Verwendet die Standardfelder von Inkswell. Deine erste Änderung erstellt eine Vorlagennotiz für diesen Typ und hält die Felder dort fest. „Aliasse“ steht immer an erster Stelle.",
  "customize.codex.fieldsEmpty": "Noch keine Felder – füge unten eines hinzu.",
  "customize.codex.fieldsReset": "Auf Standardfelder zurücksetzen",
  "customize.codex.fieldsResetConfirm":
    "Die Standardfelder von Inkswell für {type} verwenden? Dadurch wird die Eigenschaft codex-fields aus {template} entfernt – bestehende Einträge behalten ihr Frontmatter.",
  "customize.codex.fieldsResetConfirmNoTemplate":
    "Die Standardfelder von Inkswell für {type} verwenden? Dadurch wird die Eigenschaft codex-fields aus der Vorlage entfernt – bestehende Einträge behalten ihr Frontmatter.",
  "customize.codex.fieldsLabelDesc": "Was der Codex-Bereich anzeigt. Der gespeicherte Schlüssel wird daraus abgeleitet.",
  "customize.codex.builtinField.generic": "{label} (eigene Typen)",
  "customize.codex.builtinField.type": "{label} ({type})",

  // --- Customize → Beat templates ----------------------------------------------
  "customize.beats.intro":
    "Beat-Strukturen für Planen → Beats. Integrierte Vorlagen lassen sich nicht ändern, aber wenn du eine duplizierst, erhältst du eine bearbeitbare Kopie. Deine Vorlagen erscheinen in der Auswahl in der unten gezeigten Reihenfolge.",
  "customize.beats.builtIn": "Integriert",
  "customize.beats.rowDesc.one": "{count} Beat · Vorlage: {id}",
  "customize.beats.rowDesc.other": "{count} Beats · Vorlage: {id}",
  "customize.beats.duplicateAsCustom": "Als eigene duplizieren",
  "customize.beats.yours": "Eigene",
  "customize.beats.empty": "Noch keine eigenen Vorlagen – dupliziere eine integrierte oder beginne eine neue.",
  "customize.beats.editBeats": "Beats bearbeiten",
  "customize.beats.duplicate": "Duplizieren",
  "customize.beats.newTemplate": "Neue Vorlage …",
  "customize.beats.created": "„{name}“ erstellt.",
  "customize.beats.back": "‹ Beat-Vorlagen",
  "customize.beats.gone": "Diese Vorlage gibt es nicht mehr.",
  "customize.beats.idLine": "Vorlage: {id}",
  "customize.beats.rename": "Umbenennen …",
  "customize.beats.pageIntro":
    "Beats in der Reihenfolge des Buchs. „Bei %“ gibt an, wo der Beat im Manuskript liegt. Der Name eines Beats ist sein Schlüssel: Benennst du einen um, beginnen seine gespeicherten Notizen von vorn (benenne ihn zurück, um sie wiederherzustellen); Umsortieren und Umformulieren des Zwecks sind immer unbedenklich.",
  "customize.beats.noBeats": "Noch keine Beats.",
  "customize.beats.namePlaceholder": "Name des Beats",
  "customize.beats.nameAria": "Name des Beats",
  "customize.beats.atAria": "Position im Buch in Prozent",
  "customize.beats.purposePlaceholder": "Zweck (optional)",
  "customize.beats.purposeAria": "Zweck des Beats",
  "customize.beats.needOne": "Eine Vorlage braucht mindestens einen Beat.",
  "customize.beats.addBeat": "Beat hinzufügen …",
  "customize.beats.editAsText": "Als Text bearbeiten …",
  "customize.beats.textHelp":
    "Ein Beat pro Zeile: „Name“, „Name | Zweck“ oder „25% | Name | Zweck“. „Übernehmen“ ersetzt die Liste oben.",
  "customize.beats.apply": "Übernehmen",
  "customize.beats.addModal.title": "Beat hinzufügen",
  "customize.beats.addModal.name": "Name",
  "customize.beats.addModal.nameDesc": "Zugleich der Schlüssel des Beats (in Slug-Form).",
  "customize.beats.addModal.namePlaceholder": "z. B. Mittelpunkt",
  "customize.beats.addModal.purpose": "Zweck",
  "customize.beats.addModal.purposePlaceholder": "Optionaler Einzeiler",
  "customize.beats.nameRequired": "Ein Name ist erforderlich.",
  "customize.beats.nameNeedsChars": "Der Name muss Buchstaben oder Ziffern enthalten.",
  "customize.beats.renameModal.title": "Vorlage umbenennen",
  "customize.beats.renameModal.name": "Name",
  "customize.beats.renameModal.nameDesc":
    "Nur der Anzeigename – die Vorlagen-ID (und jedes Projekt, das sie nutzt) bleibt unverändert.",

  // --- Customize → Scene template ----------------------------------------------
  "customize.sceneTemplate.using": "Verwendet Templates/Scene.md",
  "customize.sceneTemplate.default": "Standard (leere Szene)",
  "customize.sceneTemplate.intro":
    "Jede Szene, die Inkswell erstellt, beginnt mit dieser Notiz: Frontmatter und Inhalt werden übernommen, und {{title}} wird zum Namen der Szene. Ohne Vorlage beginnen neue Szenen leer.",
  "customize.sceneTemplate.projectOwn":
    "Das aktive Projekt verwendet stattdessen eine eigene Vorlage: {template} (der Schlüssel sceneTemplate in seiner Indexnotiz).",
  "customize.sceneTemplate.card": "Startinhalt",
  "customize.sceneTemplate.hint":
    "{{title}} wird zum Namen der Szene. Ein status:-Schlüssel hier legt den Standardstatus fest (sonst erhalten neue Szenen status: idea); eine Synopsis, die Inkswell selbst einsetzt, hat immer Vorrang.",
  "customize.sceneTemplate.none": "Noch keine Vorlagennotiz ({path}) – neue Szenen beginnen leer.",

  // --- Customize → Scene statuses ----------------------------------------------
  "customize.statuses.defaults": "Idee → Fertig (Standard)",
  "customize.statuses.intro":
    "Benenne einen Status passend zu deinem Arbeitsablauf um („Fassung 1“, „Feinschliff“, „Fertig“), blende die aus, die du nicht nutzt, und lege die Reihenfolge fest, in der Board und Auswahllisten sie zeigen. Szenen behalten in jedem Fall ihren gespeicherten Wert, daher kannst du das auch mitten im Buch gefahrlos ändern; eine Szene mit ausgeblendetem Status zeigt ihn weiterhin an, als ausgeblendet markiert. Neue Status lassen sich in dieser Version nicht hinzufügen.",

  // --- Customize → Scene inspector fields --------------------------------------
  "customize.sceneFields.own.one": "{count} eigenes",
  "customize.sceneFields.own.other": "{count} eigene",
  "customize.sceneFields.defaults": "Alle Felder (Standard)",
  "customize.sceneFields.card.layout": "Layout",
  "customize.sceneFields.layoutIntro":
    "Wähle, welche Felder der Szenen-Inspektor in welcher Reihenfolge zeigt. Blende die aus, die du nicht nutzt, oder schiebe „Notizen“ nach oben, wenn du nach einer Gliederung schreibst. „Deine Felder“ ist der Block mit den Feldern, die du unten hinzufügst. Ein ausgeblendetes Feld ist nur hier verborgen – Szenen behalten, was sie bereits gespeichert haben, und beim Einblenden ist es sofort wieder da.",
  "customize.sceneFields.card.own": "Deine Felder",
  "customize.sceneFields.ownIntro":
    "Füge Felder für deinen eigenen Arbeitsablauf hinzu – die „Five Commandments“ aus Story Grid, Ziel und Desaster einer Szene – und sie erscheinen im Inspektor jeder Szene. Jedes wird als gewöhnliche Eigenschaft der Szene gespeichert; wenn du hier ein Feld entfernst, wird nie gelöscht, was du geschrieben hast.",
  "customize.sceneFields.storedIn": "Gespeichert in {link} (gilt für alle Projekte).",
  "customize.sceneFields.firstCreates":
    "Dein erstes Feld erstellt die Notiz für die Szenenvorlage und hält die Felder dort fest.",
  "customize.sceneFields.empty": "Noch keine eigenen Felder.",
  "customize.sceneFields.reset": "Alle eigenen Felder entfernen",
  "customize.sceneFields.resetConfirm":
    "Alle eigenen Felder entfernen? Dadurch wird die Eigenschaft {key} aus {template} gelöscht – Szenen behalten die Werte, die sie bereits gespeichert haben.",
  "customize.sceneFields.resetConfirmNoTemplate":
    "Alle eigenen Felder entfernen? Dadurch wird die Eigenschaft {key} aus der Szenenvorlage gelöscht – Szenen behalten die Werte, die sie bereits gespeichert haben.",
  "customize.sceneFields.labelDesc":
    "Was der Szenen-Inspektor anzeigt. Der Name der gespeicherten Eigenschaft wird daraus abgeleitet.",

  // --- Customize → Writing prompts ---------------------------------------------
  "customize.prompts.intro":
    "Die Impulse hinter der Schaltfläche „Impuls“ in der Werkzeugleiste von Schreiben. Blende die aus, die du nie wieder sehen willst, formuliere beliebige um oder füge eigene hinzu – schreibe {pov} dort, wo der Name der POV-Figur der Szene stehen soll. Jeder Impuls hat eine Phase (Schreiben oder Überarbeiten) und eine Kategorie, nach der die Schaltfläche filtert – beides kannst du bei jedem Impuls ändern, auch bei den integrierten.",
  "customize.prompts.phase.draft": "Schreiben",
  "customize.prompts.phase.revise": "Überarbeiten",
  "customize.prompts.phaseAria": "Phase",
  "customize.prompts.categoryAria": "Kategorie",

  // --- Customize → To-do markers -----------------------------------------------
  "customize.markers.intro":
    "Markierungen, die du in deinen Text setzt, um später darauf zurückzukommen – [TODO: …], [RESEARCH: …] und die übrigen –, und die du dann unter Überarbeiten → Protokoll wiederfindest. Beim Kompilieren werden alle entfernt. Möchtest du ein anderes Wort verwenden, füge eine eigene Markierung hinzu (und blende die integrierte aus, wenn du willst). Eine ausgeblendete Markierung verschwindet nur aus dem Einfügen-Menü: Markierungen, die schon in deinen Szenen stehen, werden weiterhin gefunden und beim Kompilieren entfernt.",
  "customize.markers.wordPrompt": "Wort, das du in deinen Szenen tippst (z. B. CHECK)",
  "customize.markers.invalidWord":
    "Ein Markierungswort beginnt mit einem Buchstaben und besteht aus 2–20 Buchstaben, Ziffern oder Bindestrichen.",
  "customize.markers.taken": "[{keyword}] ist bereits eine Markierung.",
  "customize.markers.inactive": "Wort schon vergeben – inaktiv",
  "customize.markers.removeConfirm":
    "„{label}“ entfernen? Markierungen in deinen Szenen, die als [{keyword}: …] getippt sind, werden dann weder im Überarbeitungsprotokoll gefunden noch beim Kompilieren entfernt. Damit sie weiter funktionieren, blende die Markierung stattdessen aus.",
  "customize.markers.removed":
    "„{label}“ entfernt. Vorhandene [{keyword}: …]-Markierungen bleiben als normaler Text in deinen Szenen.",

  // --- Customize → Publishing checklist ----------------------------------------
  "customize.publishing.defaults": "{phases} · {tasks} (Standard)",
  "customize.publishing.phases.one": "{count} Phase",
  "customize.publishing.phases.other": "{count} Phasen",
  "customize.publishing.tasks.one": "{count} Aufgabe",
  "customize.publishing.tasks.other": "{count} Aufgaben",
  "customize.publishing.intro":
    "Publizieren → Checkliste, Phase für Phase. Blende Phasen oder Aufgaben aus, die für deinen Weg nicht gelten, benenne beliebige um, sortiere sie und füge eigene hinzu. Häkchen werden pro Projekt unter der ID der Aufgabe gespeichert, sodass nichts verloren geht, was du schon abgehakt hast, wenn du etwas ausblendest oder umbenennst.",
  "customize.publishing.optional": "Optional",

  // --- Customize → Features ----------------------------------------------------
  "customize.features.allShown": "Alles eingeblendet",
  "customize.features.hidden": "{count} von {total} ausgeblendet",
  "customize.features.intro":
    "Blende Bereiche aus, die du nicht nutzt, damit Inkswell schlank bleibt. Ausblenden blendet nur aus – deine Notizen und Daten bleiben erhalten, und wenn du eine Funktion wieder einschaltest, ist alles wieder da. Du kannst auch überall in der App mit der rechten Maustaste auf einen optionalen Tab klicken, um ihn auszublenden.",
};
