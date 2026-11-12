/**
 * English UI strings — Help panel, help topics, welcome (src/help). See ./index.ts for the rules.
 *
 * Help topics are one key per paragraph, list item, or sub-heading, under
 * `help.<topic>.*` (topic = the tip it feeds, see HINTS in help-content.ts).
 * Bracketed to-do markers like [TODO: ] are syntax the editor parses: keep them
 * as-is in translations.
 */
export const help = {
  // --- Topic: write ---
  "help.write.title": "How drafting & to-do markers work",
  "help.write.columns": "Write is a focused editor: pick a scene on the left, draft in the centre, and keep what you need in the column on the right. That column has four tabs — Scene (details of the scene you're on), Codex (who and what is in it), Plan (this chapter's scenes, beats and your planning note) and Revision log (this project's outstanding to-do markers and logged revision decisions, current scene first — click a marker to jump to it). Edits save on blur and when you switch scenes — never mid-keystroke.",
  "help.write.room": "Make room for the page: the buttons at either end of the toolbar hide the scene list and the right column, and you can drag the line beside the column to resize it. Focus (the arrows button) hides everything but the editor and the toolbar; press it again to bring it all back. Fold the “Next up” note away with the arrow at its end. Right-click in the text for formatting, Codex look-up, splitting a scene and logging a revision decision.",
  "help.write.stream": "Switch Scene to Stream (top of Write, not on phones) to see the whole book as one page, in order. Click anywhere to edit that scene right there; the arrow keys carry on into the next scene. Jump between chapters from the menu at the top or the chapter names on the left, and narrow the page to one chapter, POV, plotline, character or status. Each scene still saves to its own note.",
  "help.write.markers": "Don't stop to research or perfect a hard bit. Drop a bracketed marker and keep moving — they're highlighted in the editor and swept up later in Revise → Revision log. The keyword is case-insensitive and the “: text” is optional.",
  "help.write.markerPicker": "Run “Insert a to-do marker…” for a picker that drops one at the cursor.",
  "help.write.peek": "Check a detail without leaving the page: hold Ctrl (Cmd on a Mac) and point at a character's or place's name in the text to see its Codex card. Hover or tap a name in the Scene column for the same card, or run “Look up in Codex” (also in the right-click menu). Esc closes it and your cursor stays where it was.",
  "help.write.companions": "Keep things beside you while you write: right-click Codex, Plan, Track or Home on the left rail and choose “Open in sidebar”, or run “Open a companion in the sidebar…”. Companions follow the scene you're writing: Codex lists who and what is in it, Plan shows this chapter's scenes, synopses and beats plus your planning note, Scenes is the whole outline, and Revision log lists what's left in this scene. Drag them anywhere; Obsidian remembers. Clicking a scene there opens it in Write, or in a regular tab if you choose that in Settings.",
  "help.write.customMarkers": "Want your own word, like [CHECK: ] or [TK: ]? Add it under Customize → To-do markers, where you can also hide the built-in ones.",

  // --- Topic: track/sync ---
  "help.sync.title": "Writing on more than one device?",
  "help.sync.body": "Words are counted on the device where you type them, so this dashboard only knows about this device. To make streaks and totals include every device, turn on Settings → Inkswell → “Sync writing history across devices”. Inkswell then keeps a small log note per device under your base folder's “Writing log” folder and merges them here — your vault's own sync (Obsidian Sync, iCloud, …) carries the notes.",

  // --- Topic: plan/beats ---
  "help.beats.title": "How the beat sheet works",
  "help.beats.intro": "A structural outline for the active project, built from a beat template you pick from the Template dropdown. Eight are included:",
  "help.beats.template.saveTheCat": "Save the Cat (15 beats)",
  "help.beats.template.threeAct": "Three-Act (7)",
  "help.beats.template.herosJourney": "Hero's Journey (12)",
  "help.beats.template.sevenPoint": "Seven-Point (7)",
  "help.beats.template.storyCircle": "Story Circle (8)",
  "help.beats.template.romancingTheBeat": "Romancing the Beat (14)",
  "help.beats.template.twentySevenChapter": "27-Chapter (27)",
  "help.beats.template.tenPoint": "Ten-Point Outline (10) — list the ten things that must happen in your story",
  "help.beats.custom": "You can also add your own structures under Customize → Beat templates — they appear in the dropdown next to the built-ins.",
  "help.beats.perBeat": "Each beat carries its purpose, a planning note, an optional linked scene, and a done toggle; the bar across the top tracks how many are complete. Switch templates anytime — each keeps its own notes and links, so nothing is lost if you switch back.",
  "help.beats.tip.inline": "Type directly into a beat's planning note — it's inline, not a separate file.",
  "help.beats.tip.link": "Link a beat to the scene that delivers it so Plan and Write stay in sync.",
  "help.beats.tip.scaffold": "Scaffold generates scene stubs for any unlinked beats in one step.",

  // --- Topic: plan/board ---
  "help.board.title": "How the board works",
  "help.board.groupBy": "A Kanban view of your scenes. Use the Group by selector to organise columns by Status, Act, Chapter, or POV.",
  "help.board.drag": "Drag a card to another column to change that scene's value (e.g. move it from Draft to Revised). Click a card to open the scene; right-click (or the ⋯ button) for rename, edit, and delete. Card colour comes from the scene's colour field.",

  // --- Topic: plan/grid ---
  "help.grid.title": "How the plot grid works",
  "help.grid.matrix": "A plotline × chapter matrix for tracking subplots and arcs. Columns are your plotlines; rows are your chapters; each cell shows the scenes that advance that plotline there. Cells are your real scenes — the grid derives from scene frontmatter, so it always matches the manuscript, and an empty stretch in a column is a pacing signal, not a bookkeeping gap.",
  "help.grid.cells": "Click a cell's + to tag an existing scene or create a stub scene (status Idea) right there — that's how you plan a beat you haven't written yet. Expand a chapter row to toggle every scene's membership without dragging. Drag a chip to another cell to move it between plotlines or chapters; a scene can belong to several plotlines at once.",
  "help.grid.tip.plotlines": "Manage plotlines from the column headers: rename (updates every tagged scene), recolor, reorder, focus, or delete.",
  "help.grid.tip.compact": "Big book? Compact mode shows cells as colored dots (automatic on large grids), and act rows collapse to per-column counts.",
  "help.grid.tip.untracked": "Tags that match no plotline appear as “untracked” columns — adopt them into your list or clear them from all scenes.",

  // --- Topic: plan/outline ---
  "help.outline.title": "How the outline works",
  "help.outline.tree": "The Tree view of Structure: organise your book as acts holding chapters holding scenes. Drag a scene into a chapter (or a chapter into an act), and drop above or below a row to reorder. This tree is the source of truth — arranging it also sets the manuscript's reading order, so each chapter's scenes stay together. Right-click a scene (or tap ⋯) to rename it, edit its details or synopsis, or move it to another chapter. The Board and Grid views (top of the tab) show the same scenes a different way.",
  "help.outline.order": "Structure comes last in Plan on purpose. The usual flow is to sketch your Beats first, spin scenes off those beats, and draft them in Write — structure can wait. Once you have real scenes, come back here to group them into acts and chapters.",
  "help.outline.tip.nesting": "Nesting is optional — a scene can sit outside any chapter and a chapter outside any act (the “Chapters with no act” / “Unassigned scenes” buckets).",
  "help.outline.tip.targets": "Give a chapter a word target to track its progress; the same targets show on Track.",
  "help.outline.tip.open": "Click a scene to open it in Write; use the ⋯ menu (or right-click) to rename, move, or delete.",

  // --- Topic: codex ---
  "help.codex.title": "How the codex works",
  "help.codex.intro": "Your story bible: characters, locations, factions, items, events, and concepts, each with a structured profile that auto-saves to the note's frontmatter.",
  "help.codex.scopeIntro": "Every entry has a scope that controls where it shows up:",
  "help.codex.scope.global": "Global (default) — available in every project.",
  "help.codex.scope.project": "Project — set codex-project on the note; only that book sees it. Under Scope, click Change…, choose Books and tick the books to share an entry between some books of a series without making it series-wide.",
  "help.codex.scope.series": "Series — set codex-series; shared across the books in a series.",
  "help.codex.pins": "Pin your main cast: right-click an entry (or tap ⋯) and choose Pin in this book. Pinned entries list first in their group, with a pin mark, and come first when you type [[ in Write. Pins belong to the open book, so a series character can be pinned in one book and not the next. The search box also matches a character's Role and a place's or item's Type: type “antag” to find your antagonists.",
  "help.codex.appearsIn": "Each entry's “Appears in” list updates itself: it shows every scene whose text mentions the entry by name or alias, plus any scene that links it in its metadata (Characters, Location, POV), for every category — so a new entry finds its scenes with no tagging step. Filled chips are linked scenes (the writer put the entry there); outlined chips are text-only mentions (someone talks about them). The per-book line counts both, plus POV scenes.",
  "help.codex.places": "Places nest: set a location's Inside to a world or to another location, and the Locations list shows them as a tree (World › Region › City). On a world or a location, “New place inside…” creates one already in place, sharing its scope.",
  "help.codex.links": "Links lead somewhere: click a name in a link field (Relationships, Allies…) to open that entry, or the arrow beside a single pick such as Owner. Ctrl/Cmd-click opens the note in a new tab instead. “Linked files” lists what the entry's note links to outside the Codex (a mood-board canvas, a PDF, a research note), plus any canvas that holds the entry's card. Add a link such as [[Moodboard.canvas]] to the note's text or to a property; a link to a canvas or PDF needs its extension.",
  "help.codex.portraits": "An image you upload as an entry's portrait is saved where Obsidian puts new attachments (Settings → Files and links → Default location for new attachments). Choose “In subfolder under current folder” to keep each entry's images in a folder beside it.",

  // --- Topic: revise/audit ---
  "help.audit.title": "How the revision audit works",
  "help.audit.intro": "Tiered checklists that take a draft from messy to finished, macro to micro:",
  "help.audit.tier.story": "Story — 18 manuscript-wide checkpoints (saved on the project).",
  "help.audit.tier.chapters": "Chapters — 10 checks per chapter: does it earn its place, hook, move the story, end with a pull? (Saved on the project; shown once your book has chapters.)",
  "help.audit.tier.scene": "Scene — a 14-point pass per scene (saved on each scene's frontmatter).",
  "help.audit.tier.prose": "Prose — 32 line-level checks, grouped.",
  "help.audit.customize": "Rename, reorder, hide, or add checks in Customize → Revision checklists.",
  "help.audit.opening": "The per-scene pass classifies each opening (Action / Dialogue / Thought / Reflection) automatically — override it if the guess is wrong. Click a scene to expand and edit its checklist inline, or jump to it in Write.",

  // --- Topic: revise/todos ---
  "help.todos.title": "How the revision log works",
  "help.todos.intro": "Everything left to revise, in one scene-grouped list: the bracketed markers you dropped while drafting, and the revision decisions you logged along the way. Use the chips to filter by marker kind or decision type.",
  "help.todos.jump": "Click a marker to jump straight to that spot in Write — it flashes so you can resolve it fast; edit the prose to remove it and the list updates on the next scan.",
  "help.todos.decisions": "Decisions are the story-level rulings (“from now on, the brother is dead”): log one with “Log a decision”, give it a type, and anchor it to a scene or the whole project. Tick it applied once you've made the change; click its text to edit it. Prefer a [RESEARCH: ] or [SCENE: ] marker for research questions and missing scenes — it marks the exact spot in the prose.",

  // --- Topic: search ---
  "help.search.title": "How search works",
  "help.search.scope": "Full-text search across your scenes' prose and their synopses. Pick a scope — this draft, the whole story, the series, or the whole vault — and narrow with the metadata filters (status, POV, chapter, plotline, character).",
  "help.search.results": "Results group by scene. Click a hit to jump straight to it in Write, where it flashes so you can find it fast. A synopsis hit opens the scene without a flash (the synopsis isn't part of the editable body). Set only a filter, with no query, to list every scene that matches — a quick structured finder.",
  "help.search.matching": "Matching is literal (not a wildcard or regex), with optional Match case and Whole word toggles; archived scenes are included only when you tick “Include archived”.",

  // --- Topic: publish/compile ---
  "help.compile.title": "How compile works",
  "help.compile.formats": "Assemble the active project's scenes into one manuscript file. Pick a format — Markdown, HTML, Word, or PDF/EPUB via Pandoc — set the output name, and compile.",
  "help.compile.docx": "Word (.docx) is built in and works on every device. It writes a standard manuscript: double-spaced, indented, chapters on a new page, a title page with your name and the word count, and a running header. Add your name and contact details under Settings → Inkswell → Manuscript; set a pen name and the header surname per book under the format.",
  "help.compile.steps": "The pipeline runs in steps you can toggle: per-scene steps (strip to-do markers, your own included, filter metadata) and manuscript-level steps (headings, page breaks, tidy blank lines). Your choices are remembered per project.",

  // --- Topic: customize ---
  "help.customize.title": "How Customize works",
  "help.customize.intro": "Customize changes the SHAPE of Inkswell — which codex types exist and what fields each shows, what a new entry or scene starts with, beat structures, scene statuses, writing prompts, the revision and publishing checklists, and which optional features are shown. Preferences (goals, editor behaviour, folders) stay in Settings.",
  "help.customize.tip.sections": "Pick a section on the left; edit on the right. Changes save as you go.",
  "help.customize.tip.templates": "Codex fields and starter content are stored in ordinary template notes under your base folder's Templates folder — editing here edits those notes, and you can still open them directly.",
  "help.customize.tip.lossless": "Built-in items are never deleted: hiding is lossless, renames keep the stored id, and every section has a reset back to Inkswell's defaults.",
  "help.customize.tip.ownItems": "Your own items (a custom type, a checklist item, a prompt) live in the plugin's data.json and travel with your vault's configuration folder.",

  // --- Help index section: home ---
  "help.section.home.phase": "Home",
  "help.section.home.summary": "Your books on shelves, one book's scene tree, and an inbox for story ideas.",
  "help.home.hub": "Your hub. All projects shows your books as cards on shelves — one shelf per series, in book order, plus one for standalone books — each with its cover (or a generated stand-in), book number, scenes and words, progress toward the target, and when you last edited it. Click a card to focus on that book; its ⋯ menu (hover on desktop, always on touch) renames it, sets its series, changes the cover, or archives it.",
  "help.home.archive": "Archiving a finished or shelved book only puts it out of sight: it leaves the shelves and the project list and waits in the Archived section at the bottom of Home. Its words still count toward your goals, and it compiles and keeps its codex as before. Unarchive it from its ⋯ menu. In a series, an archived book stays on the shelf, dimmed — or turn on “Hide archived books from their series” in Settings to take it off the series shelf entirely.",
  "help.home.focused": "A focused book shows the hero card (cover, logline, theme, target), a strip of the other covers in its series (click one to switch), and its scene tree; drag scene rows to reorder, or use the ⋯ menu to move, rename, or delete. The Inspector on the right edits the selected scene's metadata.",
  "help.home.ideas": "Capture story ideas in the inbox below the shelves without leaving the page — press Enter to save. Click an idea to edit it in place; its ⋯ / right-click menu copies it, saves it as a note under your base folder's Ideas folder (and clears it from the inbox), pins it to the top, or deletes it. Click the Ideas header to collapse the section.",
  "help.home.seriesHeading": "Series",
  "help.home.seriesAdd": "A series is a set of books sharing a name — no extra note, just a tag on each book. Add a book to one from its ⋯ / right-click menu (Series…) or the series line under the title on its hero card: pick an existing series or start a new one, and set the book number (it defaults to the next free slot). New project has the same fields, so a book can be created straight into a series.",
  "help.home.seriesManage": "The series header's ⋯ / right-click menu manages the whole set: New book in this series, Add existing project, Rename series (every book and every series-scoped codex entry follow), and Reorder books (drag, then Save renumbers 1, 2, 3…).",

  // --- Help index section: plan ---
  "help.section.plan.phase": "Plan",
  "help.section.plan.summary": "Overview fields, the beat sheet, and Structure (outline tree, board, and plot grid).",
  "help.plan.overview": "Overview holds novel-level fields (logline, theme, genre) and long-form prose (synopsis, three-act sketch). Beats is the beat sheet. Structure combines the outline tree, the Kanban board, and the plot grid behind one Tree | Board | Grid switcher — three views of the same scenes. All are detailed below.",
  "help.plan.sortByChapter": "Migrating a numbered manuscript whose scenes landed out of order? Structure → Tree has a “Sort by chapter” button (also on a book's ⋯ menu on Home and as the “Sort scenes by chapter number” command): it reorders the manuscript once by the number in each scene's chapter label — digits or spelled out — and leaves unnumbered scenes in their current order at the end. It's a one-time action, not a mode; drag order stays yours afterwards.",

  // --- Help index section: write ---
  "help.section.write.phase": "Write",
  "help.section.write.summary": "The focused manuscript editor and to-do markers.",

  // --- Help index section: codex ---
  "help.section.codex.phase": "Codex",
  "help.section.codex.summary": "Your story bible, scoped global / project / series.",

  // --- Help index section: search ---
  "help.section.search.phase": "Search",
  "help.section.search.summary": "Full-text search across scenes, scoped and filterable.",

  // --- Help index section: track ---
  "help.section.track.phase": "Track",
  "help.section.track.summary": "Word counts, streaks, pace, sprints, and structure.",
  "help.track.dashboard": "A dashboard of your writing: daily/weekly/monthly counts, streaks, a 26-week heatmap, sprint history, and a scene-structure breakdown. The status bar at the bottom mirrors today's progress and any running sprint — click it to open Track.",
  "help.track.goals": "Only project writing counts toward goals — manuscript scenes by default. Settings → What counts toward goals can also include planning notes, codex notes, or other project notes; the rest of your vault never counts.",
  "help.track.sprint": "Start a timed sprint from the rail (or the “Start a writing sprint” command) to write against a clock and a word goal.",
  "help.track.challenge": "A writing challenge (“Set up writing challenge”, or the link in the Goals card) is a date range and a word target — say 50,000 words in November. It counts every goal-counted word you write in that range, in any project, and shows where you should be by today, how far ahead or behind you are, and what you need to write today. Click the total to copy it for an event's website. Writing on more than one device? Turn on history sync so the count includes all of them.",

  // --- Help index section: revise ---
  "help.section.revise.phase": "Revise",
  "help.section.revise.summary": "Audit checklists, the revision log, and prose analysis.",
  "help.revise.analysisHeading": "Analysis",
  "help.revise.analysis": "Readability grades, your most-used words, and repeated-phrase (echo) detection across the whole manuscript — run on demand for a style pass.",

  // --- Help index section: publish ---
  "help.section.publish.phase": "Publish",
  "help.section.publish.summary": "Compile, the self-publishing checklist, and launch planning.",
  "help.publish.checklistHeading": "Checklist & launch",
  "help.publish.checklist": "Checklist tracks ~50 self-publishing tasks plus a per-format metadata worksheet (ISBN, blurb, keywords). Launch plans a pre-order timeline with auto-computed milestone dates and trackers for budget, cover, marketing, and ARC readers.",

  // --- Help index section: customize ---
  "help.section.customize.phase": "Customize",
  "help.section.customize.summary": "Shape Inkswell to your process — types, fields, templates, structures, checklists, prompts.",

  // --- Help index section: data ---
  "help.section.data.phase": "Your data & backups",
  "help.section.data.summary": "Where everything is stored, and how to recover it.",
  "help.data.storage": "Everything Inkswell stores is plain text. Scene prose is ordinary notes in your project's scene folder. Plan data — beats, outline structure, goals, the revision log, audit checklists, compile and publishing settings — lives in the frontmatter of your PROJECT INDEX NOTE: the note named after your project, next to your scenes. Codex entries are ordinary notes with a codex key. Plugin settings, writing history, sprints, and the ideas inbox live in the plugin's data.json.",
  "help.data.history": "Writing history counts the words you type in Obsidian — in its editors and in the Write panel. A file that changes outside Obsidian, or that arrives from another device via sync, only resets that file's starting point; those words are never logged as written on this device.",
  "help.data.sync": "To see every device's history together, turn on “Sync writing history across devices” in Settings. Each device then keeps one small, machine-written log note (an inkswell-log key in its frontmatter) under your base folder's “Writing log” folder, and Track merges them. Rename a device via that note's device property; if a device is gone, delete its note.",
  "help.data.recoveryHeading": "If something goes wrong",
  "help.data.fileRecovery": "Obsidian's File Recovery (Settings → File Recovery → View) keeps periodic snapshots of every note that changes, including ones Inkswell writes. Its search matches FILE NAMES: for plan data, search for your project's name and open the index note's snapshots; for prose, search the scene's name.",
  "help.data.conflicts": "Whenever Inkswell must displace a version of your text — resolving an editor-vs-disk conflict, leaving a scene before you've resolved one, or overwriting a file during compile at your request — the displaced version is saved to the “Inkswell conflicts” folder first. Nothing is silently discarded.",
  "help.data.backups": "Inkswell also keeps a daily backup of data.json (the last 7 days) in a backups folder next to it — inside the plugin's own folder under your vault's configuration directory. To bring back just your settings (custom codex types, renamed types, Customize changes, the rail), run the command “Restore settings from a backup” and pick a day; your writing history stays as it is. To restore everything: disable Inkswell, copy the backup over data.json, and re-enable. If data.json can't be read when Obsidian starts, Inkswell loads the newest backup by itself and tells you.",

  // --- Help panel ---
  "help.panel.title": "How Inkswell works",
  "help.panel.intro": "A reference for every part of the workbench. The pipeline runs Plan → Write → Revise → Publish, with Codex and Track alongside. Expand a section to dig in.",
  "help.panel.shape": "Shape Inkswell to your process under {link} — codex types and fields, templates, structures, checklists, prompts, and which features are shown (or right-click an optional tab to hide it). Hiding is lossless — your data is kept and turning it back on restores it.",
  "help.panel.shape.link": "Customize",
  "help.panel.reset": "Reset tips & replay welcome",
  "help.panel.reset.done": "Tips reset.",

  // --- Contextual tip ---
  "help.hint.dismiss": "Dismiss this tip",

  // --- Welcome ---
  "welcome.title": "Welcome to Inkswell",
  "welcome.intro": "A complete workbench for novelists — one tab, organised by the phase you're in. Switch phases from the icon rail on the left:",
  "welcome.phase.plan.name": "Plan",
  "welcome.phase.plan.blurb": "Overview, beat sheet, and story structure.",
  "welcome.phase.write.name": "Write",
  "welcome.phase.write.blurb": "Focused editor with to-do markers.",
  "welcome.phase.revise.name": "Revise",
  "welcome.phase.revise.blurb": "Audit, decision log, and sweeps.",
  "welcome.phase.publish.name": "Publish",
  "welcome.phase.publish.blurb": "Compile and launch your book.",
  "welcome.phase.codex.name": "Codex",
  "welcome.phase.codex.blurb": "Your story bible, used throughout.",
  "welcome.phase.track.name": "Track",
  "welcome.phase.track.blurb": "Word counts, streaks, and sprints.",
  "welcome.tips": "New to a panel? Look for the “How this works” tip at the top — dismiss it once you've got it. The Help tab in the rail keeps the full guide.",
  "welcome.start": "Get started",
} as const;
