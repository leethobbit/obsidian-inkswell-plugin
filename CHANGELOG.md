# Changelog

All notable changes to Inkswell are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
follows [semantic versioning](https://semver.org/) (see the Versioning section
of [AGENTS.md](AGENTS.md)).

Record every user-facing change under `[Unreleased]` as it lands. At release
time the version bump renames that section to the new version and date.

## [Unreleased]

### Added
- **Hide features you don't use — a new Settings → Features section.** Most writers won't reach for every surface, so the optional ones can now be turned off: **Beats**, the **Board** and **Plot grid** views, **Revise → Audit**, **Revise → Analysis**, the **Publishing checklist**, the **Launch planner**, and the Write toolbar's **writing prompts**. Turning one off hides its tab/view, its command, and its inspector fields; the core loop (Home, Write, Track, Codex, Search, the outline, compile) always stays. You can toggle them in **Settings → Features**, **right-click an optional tab or view** in the app to hide it on the spot, or run the **"Manage features"** command. Hiding is completely lossless — your notes and stored data (plotlines, arc notes, checklist progress) are untouched, so turning a feature back on restores everything exactly as it was.
- **Search your whole manuscript — a new Search tab.** Full-text search across your scenes' prose and their synopses, from one box. Pick how wide to look — **this draft**, the **whole story** (all its drafts), the **series**, or the **whole vault** — and narrow with metadata filters (status, POV, chapter, plotline, character). Results group by scene; click a hit to jump straight to it in **Write**, where it flashes so you can find it instantly. A synopsis match opens the scene without a flash (the synopsis isn't part of the editable text). Set only a filter, with no query, to list every scene that matches — a quick way to answer "show me every unfinished chapter-3 scene". Matching is literal (not wildcards) with optional **Match case** and **Whole word**; archived scenes are searched only when you ask. Reachable from the rail, the phone **More** sheet, and the "Search scenes" command.
- **Cross-scene find & replace.** From Search, replace a word or phrase across every matched scene at once — rename a character, fix a repeated typo, change a place name — without opening each file. It's deliberately careful: replacement is literal and touches **scene prose only** (never your frontmatter, so a synopsis or POV field with the same word is left alone); a confirmation dialog shows exactly how many occurrences in how many scenes will change; each scene is rewritten atomically and re-checked at write time, so a scene edited since your search is skipped and reported rather than clobbered; and a whole-series or whole-vault replace asks for an extra confirmation (there's no cross-file undo). If anything is skipped or fails, the summary says so.

### Changed
- **The sidebar is grouped into clearer sections.** The navigation rail now reads as four visually separated groups — **Home**, then the writing pipeline (**Plan · Write · Revise · Publish**), then **Codex · Track**, and finally **Search · Help** pinned at the bottom — so it's easier to scan as the app has grown. **Sprint has moved out of the rail** (it was an action, not a place); start one from the **Write** toolbar, the status bar, or the "Start a writing sprint" command exactly as before.
- **Plan is simpler: three tabs instead of five.** Plan used to open onto five side-by-side tabs (Overview, Beats, Board, Grid, Outline) with no obvious order — overwhelming for a newcomer. It's now **Overview → Beats → Structure**, a natural flow: shape the story, plan the beats, then arrange the scenes. Board, Grid, and the outline tree were really three views of the same scenes, so they now live together under **Structure** behind a **Tree | Board | Grid** switcher — the outline tree is the default. Your board grouping, plot-grid focus, and per-view tips are unchanged, and the "Open board" / "Open plot grid" commands still jump straight to those views. Empty Plan surfaces now point you at the natural next step (e.g. a bare Structure suggests starting from Beats).
- **A codex entry's "Appears in" list now finds its scenes automatically — for every category.** Previously it showed only scenes you'd explicitly linked via the Characters/Location fields (populated by a manual "Detect mentions" button), so an entry created *after* you wrote the scene — or any item, faction, event, concept, or world — often showed "not referenced yet" even when the prose clearly named it. Now each entry automatically lists every scene whose text mentions it by name or alias (still counting explicit links too), scoped to the books the entry belongs to. The manual "Detect mentions" button is gone; the Characters/Location fields remain for the Search character filter and the Revise → Audit character-arc roster.

## [1.6.0] - 2026-07-06

### Added
- **A plot grid — track every subplot across your chapters at a glance.** The new **Plan → Grid** tab is a plotline × chapter matrix: columns are your plotlines (main plot, romance arc, mystery thread…), rows are your chapters, and each cell shows the real scenes that advance that plotline there — so an empty stretch is a visible pacing signal, and the grid can never drift from the manuscript. Tag scenes from the grid (click a cell's **+**, or expand a chapter and toggle per scene), drag a scene chip between cells to move it to another plotline or chapter, and create a **stub scene** (status "idea") directly in any cell to plan a beat you haven't written yet. Plotlines are created, renamed, recolored, reordered, and deleted right in the grid — renaming updates every tagged scene. Built for big books: **Compact** mode collapses cells to colored presence dots (automatic on large grids), a column can be **focused** to isolate one plotline, and act rows collapse to per-column counts. Scenes also get a **Plotlines** field in the scene inspector/editor, and tags that match no plotline show as adoptable "untracked" columns rather than being lost.
- **A visual story outline — drag scenes into chapters, chapters into acts.** The new **Plan → Outline** tab is an Act › Chapter › Scene tree where you build your book's structure directly: drag a scene into a chapter (or a chapter into an act), reorder items **above or below** each other, add or rename acts/chapters, and set a **per-chapter word target** with a progress bar. Click a scene to open it straight in the **Write** editor. The outline is the source of truth — assigning a scene rearranges the manuscript so it reads in outline order and each chapter stays contiguous (which also makes compiled chapter headings correct). Nesting is optional: chapters can sit outside any act and scenes outside any chapter (shown in "Chapters with no act" / "Unassigned scenes"). Touch gets "Move to…" menus. **Track** gains a **"By chapter"** breakdown and mirrors chapter targets. Existing projects open with their current structure intact (chapters/acts are read from your scene tags the first time), and the scene-inspector Act/Chapter boxes suggest existing names. (Structure is per-draft.)

### Fixed
- **Codex relationship pickers now respect the entity's scope.** Adding a relationship (or any character/location link) to a codex entry listed *every* entity in the vault, ignoring scope — so a character in one series could be offered characters from another. The picker now shows only entities the entry can actually see: its own series/project plus globals (a global entry stays unconstrained).
- **Two save races that could drop a concurrent edit are closed.** Saving a scene in the Write editor, and saving an Overview section (synopsis / plot groundwork / act sketches), each used a read-then-write pattern — an edit landing in between (another panel, sync, or two Overview fields blurring in quick succession) could be silently overwritten. Both now write atomically.
- **The last few seconds of writing are no longer lost on quit.** Word-count updates are saved on a short delay; closing Obsidian (or disabling the plugin) inside that window could drop up to ~2 seconds of counted words. The pending save is now flushed on unload, and all writes to the plugin's data file are serialized so they can't interleave.
- **Compiled manuscripts now appear in Obsidian immediately.** Markdown/HTML compile output was written behind Obsidian's back, so the new file didn't show up in the file index (search, links, switcher) until a restart or rescan. It's now written through the vault API.
- **Exporting via pandoc no longer drops a temporary file into your project.** The temp input file was created inside the vault (briefly appearing as a stray note) with a fixed name that two simultaneous exports would fight over. It now uses a unique file in the system temp folder.
- **A scene rename from Obsidian's file explorer can't fail silently anymore.** The index self-heal that follows an external rename now reports an error notice if the index update fails, instead of half-completing invisibly.
- **Removing cover art moves the file to trash instead of deleting it permanently** — consistent with every other deletion in Inkswell (all recoverable).
- **Choosing a cover image from the vault now works.** "Choose from vault…" opened the picker but selecting an image silently did nothing — the picker resolved as if dismissed before the chosen file came through. Upload was unaffected. It now sets the cover correctly.
- **Scene drag-reorder drops where the line shows.** On Home, the drop indicator was a single bottom line that didn't match where the scene actually landed — dropping "below" a scene placed it a full item higher. The indicator is now a precise line at the top or bottom edge depending on where you hover, and the scene lands exactly there (matching the Plan → Outline behavior).
- **No title can produce an unsafe file name — including renames.** A name consisting of dots (`.` / `..`) or with leading/trailing dots could create a hidden, invalid-on-Windows, or folder-escaping file. This is now blocked everywhere a name becomes a file: creating a project/draft/scene/codex entry **and renaming a scene or codex entry** (the rename paths were still unguarded — renaming a scene to `..` made it vanish from Obsidian). Such names are cleaned, or rejected with a notice when nothing usable remains.
- **Scene status colors now follow your theme.** Status badges (Outlined/Draft/Written/Revised/Final) and the Track status-mix bar used a fixed color palette that clashed with light and custom themes; they now use Obsidian's theme accent colors.
- **"Set word target" now targets the project selected in Inkswell.** The command used to require a project file to be open and active; it now resolves the project the same way every panel does (the header selection, falling back to the open file's project), so it works from any screen.
- **Compile no longer stacks two headings.** "Prepend the scene title" and "Group scenes into chapters" both add a heading, so enabling both produced doubled headings (a chapter title immediately followed by a scene title). They're now mutually exclusive in the compile step list — turning one on turns the other off — with a note explaining why.
- **"Compile the active project" now matches the Publish panel.** The command used to ignore your saved compile settings — it rebuilt a default recipe and wrote a separate, differently-named file (`manuscript`), so you could end up with two divergent manuscripts. It now runs the exact config you set in Publish → Compile (same steps, separator, and output name), and it targets the project selected in Inkswell rather than whatever file happens to be open — so it works from any screen instead of reporting "No active file".
- **Pressing Enter in a rename/prompt dialog now closes it.** Confirming a rename, synopsis, or codex-entry prompt with the Enter key performed the action but could leave the dialog open (only the button closed it); Enter now behaves exactly like clicking the confirm button.
- **Every dialog now handles the keyboard the same way.** The sprint and word-target dialogs gained Enter-to-confirm and autofocus on their first field (previously mouse-only); the writing-prompt dialog commits the shown prompt on Enter; and delete confirmations focus the Delete button so Enter confirms and Escape cancels.

### Changed
- **The workspace no longer rebuilds itself for edits it doesn't care about.** Editing any unrelated note used to re-render the active Inkswell panel (a flicker and focus risk on every keystroke's autosave elsewhere in the vault). Inkswell now tracks exactly what its panels render — project indexes, scenes, and codex notes — and skips the refresh when nothing relevant changed. Faster in big vaults, and background changes can no longer disturb what you're doing.
- **The manuscript editor survives background refreshes.** A metadata change while Write is open used to rebuild the editor, silently dropping your undo history, scroll position, and cursor. The scene list, toolbar, and inspector now refresh in place around the live editor instead.
- **Publishing details are shared across a story's drafts.** The book metadata worksheet, the self-publishing checklist, and the launch plan describe the *book*, not one draft — so they're now stored once per story and shared by every draft (like cover art, overview, and goals), instead of being copied into each new draft and drifting apart. Edit them from any draft and every draft reflects the change.
- **Word / PDF / EPUB export is greyed out until pandoc is found.** The compile format picker used to offer Word/PDF/EPUB even when pandoc wasn't installed, then fail at export time with a cryptic `spawn pandoc ENOENT`. Those formats are now disabled with an inline "needs pandoc" hint (and a pointer to pandoc.org) until a pandoc binary is detected; PDF additionally warns when no LaTeX engine is present, and the "Generate reference doc" button is gated the same way. If export does fail, the message now explains what's missing instead of leaking the raw error. Compile notices also report the word count written.
- **File operations that fail now tell you.** Every action that writes to your vault — saving a scene in the Write editor, renaming/deleting scenes and codex entries, creating a project or draft, setting a cover image, and every inspector/board/beat/audit/publish/planning field — now surfaces a notice when the write fails (disk full, permission denied, a sync lock) instead of silently doing nothing. The manuscript editor is the most protected: if a save fails it says so and keeps your text in the editor rather than marking it saved. No change when things work normally.

## [1.5.0] - 2026-07-01

### Added
- **Cover art and overview on Home.** Selecting a project on Home now opens a hero card above the scene list. Attach **cover art** — upload an image (copied into the project's folder) or pick one already in your vault — and see the **logline**, **theme**, and **word-count target** at a glance, with a progress bar tracking words toward the target. Logline, theme, and target are editable inline and share the same data as Plan → Overview, so there's no second copy to keep in sync.

### Changed
- **The idea inbox now appears only on the all-projects view.** The quick-capture idea inbox used to sit at the top of Home even after you'd drilled into a single project, mixing a global list with project-scoped content. It now shows only on the all-projects Home (and when you have no projects yet); the focused-project view shows just that project. Story ideas are cross-project seeds, so they're captured from the top-level view.
- **Overview and goals are shared across a story's drafts.** Cover art, logline, theme, genre, audience, and the word target describe the *book*, not one draft — so they're now stored once per story and shared by every draft instead of drifting per-draft. Edit them from any draft (the Home hero or Plan → Overview) and every draft reflects the change. Track → Targets now lists each story once instead of once per draft.

## [1.4.0] - 2026-07-01

### Added
- **Multiple drafts of a story.** A story can now hold more than one draft — e.g. a "First Draft" and an "Editor Pass" — switchable from a new **Draft** dropdown in the header (it appears only once a story has a second draft, so single-draft projects look exactly as before). The header's `⋯` menu offers **New draft**, **Rename draft**, and **Delete draft**. *New draft* makes a full, independent copy: every scene's prose and all planning (goals, beats, overview, compile config, revision log, checklists) are duplicated into a `Drafts/<name>/` folder, so you can revise the copy freely while the original manuscript stays untouched. Deleting a draft moves its index note and scene files to trash (recoverable) and is blocked for a story's last remaining draft. Home lists each story once with a "N drafts" badge. Drafts are Longform-compatible (grouped by a shared `longform.title`, distinguished by `draftTitle`).
- **Draft comparison on Track.** When the active story has more than one draft, Track shows a new **Drafts** section comparing them side by side: word count and delta vs the first draft, scene count, a status-mix bar (revision progress at a glance), and each draft's age. Single-draft projects don't see the section. New drafts are stamped with a creation date so age can be shown.

## [1.3.1] - 2026-06-30

### Fixed
- **Delete-scene button no longer uses a deprecated API.** The delete-scene confirmation's red "Delete" button now takes its destructive styling from the `mod-warning` CSS class directly, instead of the deprecated `ButtonComponent.setWarning()` call. `setWarning()` is deprecated in favor of `setDestructive()`, but `setDestructive()` requires Obsidian 1.13 — which is still early-access-only, so it can't be the floor yet. The button looks and behaves exactly as before; this only unblocks the community-store review (which rejects the deprecated call).

## [1.3.0] - 2026-06-30

### Added
- **Phone layout.** On phones Inkswell now has a dedicated frontend instead of the cramped desktop layout: a bottom tab bar (Write · Scenes · Codex · More) replaces the icon rail, surfaces are single-column with tap-to-drill-down for the scene inspector and Codex entries, and **More** holds Capture, Track, To-dos, and Help (plus the larger-screen-only Plan and Publish). Codex lookup and Revise → To-dos are reachable on a phone; planning and publishing still open on a larger screen. The bar sits flush above Obsidian's own mobile toolbar. (Tablet and desktop layouts are unchanged.)

### Fixed
- **Write toolbar no longer overlaps on narrow widths.** As the Write pane shrank (tablet, phone, or a narrow split), the "Prompt" control collided with the Insert buttons. The insert row now collapses into a single **Insert** dropdown — holding the same five marker types plus Find to-dos and Log issue — once the bar gets too narrow for the full row, keeping the toolbar on one clean line down to phone widths. The full inline row still shows on a wide bar. On phones the writing-prompt control is hidden entirely (prompts remain on tablet/desktop).

## [1.2.0] - 2026-06-29

### Added
- **Customizable codex templates.** Settings → Codex templates → **Generate starter templates** creates an editable note for each codex type (Character, Location, …) in `<base folder>/Templates`. New entries are scaffolded from the matching note's frontmatter and body, so you can add your own tags, fields, or sections — the generated Character template already includes `tags: [character]`. Use `{{title}}` for the entry name; Inkswell still sets `codex:` and scope automatically. Delete a template to return to the default. (No template = unchanged behavior.)
- **Scenes survive a manual file rename.** If you rename a scene file in Obsidian's file explorer (or anywhere) while Inkswell is open, the project index now updates automatically so the scene no longer disappears. For renames made while Inkswell was closed, Home shows a "Scene files out of sync" banner on the affected project with one-click **Relink** (plus Remove / Add as scene / Ignore) so nothing is silently lost.
- **Rename scenes from the Write module.** Right-click a scene in the Write navigator (or tap "⋯" on touch) for the same actions already available on Home, Board, and Beats — Open, Edit scene, Edit synopsis, Rename, Delete. Renaming the scene you're currently editing keeps the editor pinned to it.
- **Plot groundwork starter prompt.** The Plan → Overview "Plot groundwork" box now shows an example question ("e.g. What are 5 key moments, scenes, or events you know will happen?") to get you started, instead of echoing the field name. It's only a placeholder — it disappears as soon as you type and is never written to your planning note.

### Fixed
- **Renaming a scene no longer orphans its beat link.** Plan → Beats links scenes by title, so a rename used to leave the beat pointing at the old name — the scene chip went dead and the renamed scene reappeared in the "add scene" dropdown. Beat links now follow the rename automatically, whether it comes from the in-app menu, a self-healed manual file rename, or a Relink.

## [1.1.0] - 2026-06-27

### Added
- **In-app guidance.** A one-time welcome orients you to the phases on first launch; each non-obvious panel (beat sheet, board, codex, revision log, to-do sweep, audit, compile, drafting markers) carries a dismissible "How this works" tip; and a new **Help** tab in the rail holds the full guide. Tips and the welcome can be reset from Settings → Help.
- **Mobile support (iPad / tablet first).** Inkswell now installs on Obsidian mobile (`isDesktopOnly` is off). On tablets and iPad the full suite is available with a responsive layout; the multi-pane columns (Write, Codex, Home inspector) flex to fit portrait. Pandoc export remains desktop-only and disables itself gracefully.
- **Touch row actions.** Every right-click menu (Home scenes & projects, Board cards, Codex entries, Revision log, Plan → Beats scene chips) now also shows a "⋯" button on touch that opens the same menu — long-press isn't required.
- **Touch reorder fallbacks.** Where desktop uses drag-drop, touch gets menu actions instead: **Move up / Move down** for the Home scene list and **Move to <column>** for the Plan → Board.
- **Phone layout.** On phones, Inkswell focuses on drafting: the Write editor is a single column with the scene list as a slide-in drawer, and the planning/reference/publish surfaces show a "use a larger screen" notice (they remain available on iPad/desktop).

### Changed
- Renamed the revision audit's "Page-level" tier to **"Prose-level"** — it's a line/word-level craft pass (show-vs-tell, passive voice, filter words, echoes), and Inkswell has no page concept. Existing checklist data is unaffected.

### Fixed
- Two lookbehind regular expressions (codex mention detection, scene-opening classification) were rewritten without lookbehind, which crashes plugin load on iOS before 16.4.
- Plan → Board columns (Chapter / Act / POV) now follow **manuscript order** (the order scenes appear in the book) instead of sorting alphabetically — so spelled-out chapters read "One, Two, Three…" rather than "Five, Four, One…". The Track → Structure "By act" breakdown uses the same order. Matches how the compile/export already groups chapters.

## [1.0.4] - 2026-06-26

### Fixed
- The delete-scene confirmation button uses `setWarning()` (red destructive styling, available on all supported Obsidian versions) instead of `setDestructive()`, which requires Obsidian 1.13.0 — newer than the plugin's `minAppVersion` and therefore rejected by Obsidian's plugin-API validation.

## [1.0.3] - 2026-06-26

### Fixed
- Set `minAppVersion` to **1.7.4**, the first *public* 1.7 release. The previous value (1.7.2) was an early-access-only build that Obsidian's plugin validation doesn't recognize as a released version.

### Changed
- The release workflow now publishes **GitHub artifact attestations** for `main.js`, `manifest.json`, and `styles.css`, so the release assets' provenance can be cryptographically verified.

## [1.0.2] - 2026-06-26

### Added
- Plan → Board: a **Chapter** grouping view, alongside Status / Act / POV.
- Plan → Board: scene **status badges** now show on each card when grouping by Act, Chapter, or POV (so you can read a scene's status without switching to the Status view).

### Fixed
- Write → Insert marker buttons (TODO / Research / Note / Dialogue / Scene) now insert reliably at the caret on every click. Previously the second click did nothing and the third inserted at the start of the document, because clicking a button blurred the editor → triggered a save → store refresh → the host rebuilt and destroyed the live editor. The buttons no longer steal focus from the editor.

### Changed
- The **New scene** dialog now closes after creating a scene. A new **Create another** button creates the scene and keeps the dialog open (cleared and refocused) for back-to-back entry.
- "Open in tab" / "Open" actions now **focus the note's existing tab if it's already open**, otherwise open it in a new, focused tab (like Ctrl/Cmd-clicking a wikilink) — instead of reusing and overwriting an unrelated background tab.
- Home now **focuses on a single project** (and its series, if it belongs to one) once one is selected — via the header dropdown or by clicking a project title. Pick **All projects** (or the "← All projects" link) to return to the full list.
- Replaced the README hero gif with a larger, clearer capture, and re-shot the surface screenshots at the matching zoom.
- Corrected the documented Obsidian requirement to 1.7.2 (matching the manifest) and tightened README copy.
- Fixed stale README references: placeholder tokens are now `[TODO]` / `[RESEARCH]` (not `[TK]`), the sweep is **Revise → Todos** (renamed from Gaps), and the removed `%%` / `@@` "Comments" extraction feature is no longer listed.
- The delete-scene confirmation button uses Obsidian's `setDestructive()` styling where available, falling back to `setWarning()` on the 1.7.2 floor (where `setDestructive` doesn't exist yet).
- Build: dropped the `builtin-modules` dev dependency in favor of Node's native `module.builtinModules` (build tooling only, no runtime change).

## [1.0.1] - 2026-06-25

### Changed
- Raised `minAppVersion` to Obsidian 1.7.2 and typed the frontmatter read/write
  boundaries, addressing the Obsidian community-store review.

## [1.0.0] - 2026-06

First community-store release — the full local-first writer's suite.

### Added
- **Home** — projects, a nestable scene tree, an ideas inbox with quick
  capture, and series grouping for multi-book worlds.
- **Plan** — beat sheets (7 outline templates incl. Save the Cat!) and a Kanban
  board grouped by status / act / POV.
- **Write** — a distraction-light Live-Preview manuscript editor, writing
  prompts, timed sprints, and fast-drafting placeholder tokens (`[TK]`,
  `[SCENE: …]`, `[DIALOGUE: …]`, `[NOTE: …]`) that highlight as you type.
- **Revise** — an audit toolkit, the invisible-revision Log, a placeholder Gaps
  sweep, inline-comment extraction, and manuscript analysis.
- **Publish** — a configurable compile/export pipeline (Markdown & HTML built
  in; `.docx` / `.pdf` / `.epub` via optional pandoc), a self-publishing
  checklist, and a launch planner.
- **Codex** — a story bible for characters, locations, worlds, factions, items,
  events, and concepts, with scene linking and mention auto-detect.
- **Track** — word goals, habit streaks, a GitHub-style heatmap, lifetime
  records, a writing-history chart, and a deadline pace calculator.
- Drop-in compatibility with Longform's `longform` frontmatter (zero migration);
  Inkswell-only data lives under a separate `inkswell` key.

[Unreleased]: https://github.com/leethobbit/obsidian-inkswell-plugin/compare/1.6.0...HEAD
[1.6.0]: https://github.com/leethobbit/obsidian-inkswell-plugin/compare/1.5.0...1.6.0
[1.5.0]: https://github.com/leethobbit/obsidian-inkswell-plugin/compare/1.4.0...1.5.0
[1.4.0]: https://github.com/leethobbit/obsidian-inkswell-plugin/compare/1.3.1...1.4.0
[1.3.1]: https://github.com/leethobbit/obsidian-inkswell-plugin/compare/1.3.0...1.3.1
[1.3.0]: https://github.com/leethobbit/obsidian-inkswell-plugin/compare/1.2.0...1.3.0
[1.2.0]: https://github.com/leethobbit/obsidian-inkswell-plugin/compare/1.1.0...1.2.0
[1.1.0]: https://github.com/leethobbit/obsidian-inkswell-plugin/compare/1.0.4...1.1.0
[1.0.4]: https://github.com/leethobbit/obsidian-inkswell-plugin/compare/1.0.3...1.0.4
[1.0.3]: https://github.com/leethobbit/obsidian-inkswell-plugin/compare/1.0.2...1.0.3
[1.0.2]: https://github.com/leethobbit/obsidian-inkswell-plugin/compare/1.0.1...1.0.2
[1.0.1]: https://github.com/leethobbit/obsidian-inkswell-plugin/compare/1.0.0...1.0.1
[1.0.0]: https://github.com/leethobbit/obsidian-inkswell-plugin/releases/tag/1.0.0
