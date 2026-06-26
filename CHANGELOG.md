# Changelog

All notable changes to Inkswell are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
follows [semantic versioning](https://semver.org/) (see the Versioning section
of [AGENTS.md](AGENTS.md)).

Record every user-facing change under `[Unreleased]` as it lands. At release
time the version bump renames that section to the new version and date.

## [Unreleased]

### Changed
- Replaced the README hero gif with a larger, clearer capture, and re-shot the surface screenshots at the matching zoom.
- Corrected the documented Obsidian requirement to 1.7.2 (matching the manifest) and tightened README copy.
- Fixed stale README references: placeholder tokens are now `[TODO]` / `[RESEARCH]` (not `[TK]`), the sweep is **Revise → Todos** (renamed from Gaps), and the removed `%%` / `@@` "Comments" extraction feature is no longer listed.
- The delete-scene confirmation button now uses Obsidian's `setDestructive()` styling, replacing the deprecated `setWarning()`.
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

[Unreleased]: https://github.com/leethobbit/obsidian-inkswell-plugin/compare/1.0.1...HEAD
[1.0.1]: https://github.com/leethobbit/obsidian-inkswell-plugin/compare/1.0.0...1.0.1
[1.0.0]: https://github.com/leethobbit/obsidian-inkswell-plugin/releases/tag/1.0.0
