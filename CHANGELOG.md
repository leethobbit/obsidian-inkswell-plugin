# Changelog

All notable changes to Inkswell are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
follows [semantic versioning](https://semver.org/) (see the Versioning section
of [AGENTS.md](AGENTS.md)).

Record every user-facing change under `[Unreleased]` as it lands. At release
time the version bump renames that section to the new version and date.

## [Unreleased]

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

[Unreleased]: https://github.com/leethobbit/obsidian-inkswell-plugin/compare/1.0.4...HEAD
[1.0.4]: https://github.com/leethobbit/obsidian-inkswell-plugin/compare/1.0.3...1.0.4
[1.0.3]: https://github.com/leethobbit/obsidian-inkswell-plugin/compare/1.0.2...1.0.3
[1.0.2]: https://github.com/leethobbit/obsidian-inkswell-plugin/compare/1.0.1...1.0.2
[1.0.1]: https://github.com/leethobbit/obsidian-inkswell-plugin/compare/1.0.0...1.0.1
[1.0.0]: https://github.com/leethobbit/obsidian-inkswell-plugin/releases/tag/1.0.0
