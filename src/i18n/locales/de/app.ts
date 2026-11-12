/** German UI strings — the `app` area (mirrors ../en/app.ts). */
import type { Catalog } from "../types";

export const app: Catalog = {
  // --- Plugin load -----------------------------------------------------------
  "app.hoverSource": "Inkswell-Schreibeditor",
  "app.ribbon": "Inkswell-Projekte",
  "app.recovered":
    "Inkswell konnte seine Datendatei nicht lesen und hat deine Einstellungen und deinen Schreibverlauf aus der Sicherung vom {date} geladen. Änderungen nach diesem Tag fehlen möglicherweise.",
  "app.recoveredKept":
    "Inkswell konnte seine Datendatei nicht lesen und hat deine Einstellungen und deinen Schreibverlauf aus der Sicherung vom {date} geladen. Änderungen nach diesem Tag fehlen möglicherweise. Die unlesbare Datei wurde als {file} aufbewahrt.",
  "app.categoryNotice":
    "Inkswell-Ziele zählen jetzt nur noch Projektwörter. Was zählt (Szenen, Planung, Codex), legst du unter Einstellungen → Inkswell fest.",

  // --- Commands --------------------------------------------------------------
  "app.command.openProjects": "Projekte öffnen",
  "app.command.newProject": "Neues Projekt",
  "app.command.renameProject": "Projekt umbenennen",
  "app.command.archiveProject": "Aktuelles Projekt archivieren",
  "app.command.unarchiveProject": "Aktuelles Projekt aus dem Archiv holen",
  "app.command.setUpChallenge": "Schreib-Challenge einrichten",
  "app.command.exportStoryBible": "Story-Bibel exportieren",
  "app.command.newScene": "Neue Szene",
  "app.command.sortByChapter": "Szenen nach Kapitelnummer sortieren",
  "app.command.openBeats": "Beat Sheet öffnen (Planen)",
  "app.command.openBoard": "Board öffnen (Planen)",
  "app.command.openPlotGrid": "Plot-Raster öffnen (Planen)",
  "app.command.openCodex": "Codex öffnen",
  "app.command.openWrite": "Schreiben öffnen",
  "app.command.openStats": "Schreibstatistik öffnen (Fortschritt)",
  "app.command.openCompile": "Kompilieren öffnen (Publizieren)",
  "app.command.compileActive": "Aktives Projekt kompilieren",
  "app.command.searchScenes": "Szenen durchsuchen",
  "app.command.insertTodo": "To-do-Markierung einfügen …",
  "app.command.toggleBold": "Fett ein/aus (Schreibeditor)",
  "app.command.toggleItalic": "Kursiv ein/aus (Schreibeditor)",
  "app.command.toggleStrikethrough": "Durchgestrichen ein/aus (Schreibeditor)",
  "app.command.splitScene": "Szene am Cursor teilen (Schreibeditor)",
  "app.command.toggleStream": "Szenenfluss ein/aus (Schreiben)",
  "app.command.jumpToChapter": "Zu Kapitel springen … (Szenenfluss)",
  "app.command.nextChapter": "Nächstes Kapitel (Szenenfluss)",
  "app.command.previousChapter": "Vorheriges Kapitel (Szenenfluss)",
  "app.command.moveSelection": "Auswahl in neue Szene verschieben (Schreibeditor)",
  "app.command.quickCodex": "Codex-Eintrag aus Auswahl erstellen (Schreibeditor)",
  "app.command.openLink": "Link am Cursor öffnen (Schreibeditor)",
  "app.command.toggleTypewriter": "Schreibmaschinenmodus ein/aus (Schreibeditor)",
  "app.typewriterOn": "Schreibmaschinenmodus an",
  "app.typewriterOff": "Schreibmaschinenmodus aus",
  "app.command.startSprint": "Schreibsprint starten",
  "app.command.endSprint": "Aktuellen Sprint jetzt beenden",
  "app.command.cancelSprint": "Aktuellen Sprint abbrechen",
  "app.command.setWordTarget": "Wortziel für das aktive Projekt festlegen",
  "app.command.logRevision": "Überarbeitungsentscheidung festhalten",
  "app.notInProject": "Die aktive Datei gehört zu keinem Inkswell-Projekt.",
  "app.command.openRevisions": "Überarbeitungsprotokoll öffnen",
  "app.command.openAnalysis": "Analyse öffnen (Überarbeiten)",
  "app.command.openHelp": "Hilfe öffnen",
  "app.command.openCustomize": "Anpassen öffnen",
  "app.command.restoreSettings": "Einstellungen aus einer Sicherung wiederherstellen",
  "app.command.manageFeatures": "Funktionen verwalten",
  "app.command.quickCapture": "Idee schnell notieren",

  // --- Settings backups ------------------------------------------------------
  "app.noBackups": "Inkswell hat noch keine Sicherungen. An jedem Tag, an dem du Obsidian öffnest, wird eine angelegt.",
  "app.settingsRestored":
    "Einstellungen aus der Sicherung vom {date} wiederhergestellt. Dein Schreibverlauf und deine Ideen bleiben unverändert.",

  // --- Ideas inbox -----------------------------------------------------------
  "app.capture.title": "Schnellnotiz",
  "app.capture.cta": "Notieren",
  "app.capture.done": "Idee notiert.",
  "app.idea.saveFailed": "Die Idee konnte nicht als Notiz gespeichert werden.",
  "app.idea.saved": "Gespeichert unter {path}",

  // --- Compile, archive, project lookup --------------------------------------
  "app.compile.noProject": "Kein aktives Projekt zum Kompilieren. Öffne zuerst eines in Inkswell.",
  "app.archive.archived": "„{title}“ archiviert. Du findest es auf Start unter „Archiviert“.",
  "app.archive.restored": "„{title}“ ist wieder auf Start.",
  "app.archive.seriesArchived": "Reihe „{name}“ archiviert. Du findest sie auf Start unter „Archiviert“.",
  "app.archive.seriesRestored": "Die Reihe „{name}“ ist wieder auf Start.",
  "app.noProject": "Kein Inkswell-Projekt gefunden. Lege eines mit dem Befehl „Neues Projekt“ an.",
};
