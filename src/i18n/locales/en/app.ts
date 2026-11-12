/** English UI strings — Plugin shell (main.ts): command names, ribbon, top-level notices. See ./index.ts for the rules. */
export const app = {
  // --- Plugin load -----------------------------------------------------------
  "app.hoverSource": "Inkswell Write editor",
  "app.ribbon": "Inkswell projects",
  "app.recovered":
    "Inkswell couldn't read its data file, so it loaded your settings and writing history from the backup of {date}. Changes made after that day may be missing.",
  "app.recoveredKept":
    "Inkswell couldn't read its data file, so it loaded your settings and writing history from the backup of {date}. Changes made after that day may be missing. The unreadable file was kept as {file}.",
  "app.categoryNotice":
    "Inkswell goals now count only project words. Choose what counts (scenes, planning, codex) in Settings → Inkswell.",

  // --- Commands --------------------------------------------------------------
  "app.command.openProjects": "Open projects",
  "app.command.newProject": "New project",
  "app.command.renameProject": "Rename project",
  "app.command.archiveProject": "Archive current project",
  "app.command.unarchiveProject": "Unarchive current project",
  "app.command.setUpChallenge": "Set up writing challenge",
  "app.command.exportStoryBible": "Export story bible",
  "app.command.newScene": "New scene",
  "app.command.sortByChapter": "Sort scenes by chapter number",
  "app.command.openBeats": "Open beat sheet (Plan)",
  "app.command.openBoard": "Open board (Plan)",
  "app.command.openPlotGrid": "Open plot grid (Plan)",
  "app.command.openCodex": "Open codex",
  "app.command.openWrite": "Open Write",
  "app.command.openStats": "Open writing stats (Track)",
  "app.command.openCompile": "Open compile (Publish)",
  "app.command.compileActive": "Compile the active project",
  "app.command.searchScenes": "Search scenes",
  "app.command.insertTodo": "Insert a to-do marker…",
  "app.command.toggleBold": "Toggle bold (Write editor)",
  "app.command.toggleItalic": "Toggle italic (Write editor)",
  "app.command.toggleStrikethrough": "Toggle strikethrough (Write editor)",
  "app.command.splitScene": "Split scene at cursor (Write editor)",
  "app.command.toggleStream": "Toggle scene stream (Write)",
  "app.command.jumpToChapter": "Jump to chapter… (scene stream)",
  "app.command.nextChapter": "Next chapter (scene stream)",
  "app.command.previousChapter": "Previous chapter (scene stream)",
  "app.command.moveSelection": "Move selection to new scene (Write editor)",
  "app.command.quickCodex": "Create Codex entry from selection (Write editor)",
  "app.command.openLink": "Open link at cursor (Write editor)",
  "app.command.toggleTypewriter": "Toggle typewriter mode (Write editor)",
  "app.typewriterOn": "Typewriter mode on",
  "app.typewriterOff": "Typewriter mode off",
  "app.command.startSprint": "Start a writing sprint",
  "app.command.endSprint": "End the current sprint now",
  "app.command.cancelSprint": "Cancel the current sprint",
  "app.command.setWordTarget": "Set word target for the active project",
  "app.command.logRevision": "Log a revision decision",
  "app.notInProject": "The active file isn't part of an Inkswell project.",
  "app.command.openRevisions": "Open revision log",
  "app.command.openAnalysis": "Open analysis (Revise)",
  "app.command.openHelp": "Open help",
  "app.command.openCustomize": "Open customize",
  "app.command.restoreSettings": "Restore settings from a backup",
  "app.command.manageFeatures": "Manage features",
  "app.command.quickCapture": "Quick capture an idea",

  // --- Settings backups ------------------------------------------------------
  "app.noBackups": "Inkswell has no backups yet. One is made each day you open Obsidian.",
  "app.settingsRestored":
    "Settings restored from the backup of {date}. Your writing history and ideas weren't changed.",

  // --- Ideas inbox -----------------------------------------------------------
  "app.capture.title": "Quick capture",
  "app.capture.cta": "Capture",
  "app.capture.done": "Idea captured.",
  "app.idea.saveFailed": "Couldn't save the idea as a note.",
  "app.idea.saved": "Saved to {path}",

  // --- Compile, archive, project lookup --------------------------------------
  "app.compile.noProject": "No active project to compile. Open one in Inkswell first.",
  "app.archive.archived": "Archived \"{title}\". It's under Archived on Home.",
  "app.archive.restored": "\"{title}\" is back on Home.",
  "app.archive.seriesArchived": "Archived the \"{name}\" series. It's under Archived on Home.",
  "app.archive.seriesRestored": "The \"{name}\" series is back on Home.",
  "app.noProject": "No Inkswell project found. Create one with the New project command.",
} as const;
