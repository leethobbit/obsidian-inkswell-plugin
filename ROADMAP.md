# Inkswell Roadmap

Phase-centric information architecture (one tab, left icon rail): **Home · Plan · Write · Track · Revise · Publish**. Each destination does one job; depth lives behind sub-tabs or the Scene Inspector. See `FEATURES.md` for the full pick list and the plan file for IA rationale.

**Current status: v0.17.0** — phases 5–13 shipped + a QA-fix batch (v0.14.0) + writing-aids & export-readiness (v0.15.0) + the writing-method feature set (v0.16.0) + the Plan-reorg / Todos / navigation pass (v0.17.0). Next: the deep end-to-end live QA pass (the 1.0 gate) — v0.15.0–v0.17.0 surfaces are unit/build-verified only. Drive it from [QA.md](examples/sample-vault/QA.md) (full, ~280 checks) or the curated [QA-lite.md](examples/sample-vault/QA-lite.md) (top-50 smoke pass).

## Shipped
| Version | What |
|---|---|
| v0.1.0 | Longform-compatible projects + explorer + compile (md/HTML/pandoc) |
| v0.2.x | Goals/sprints/stats; scenes-vanishing fix (self-parse frontmatter); explorer toolbar |
| v0.3.0 | Single-tab host view (internal tabs swap panels) |
| v0.4.0 | Save the Cat beat sheet |
| v0.5.0 | IA shell (left rail, 6 destinations) + scene-metadata foundation + Scene Inspector |
| v0.6.x | Plan: Kanban board + 7 beat templates + scaffold; multi-scene beats; rail/badge UX; sticky project selection |
| v0.6.2–3 | Right-click scene actions (rename/synopsis/delete); keep-selected-project fix |
| v0.7.0 | Codex: entities (`codex` frontmatter), hub, scene↔codex linking, auto-detect mentions |
| v0.8.0 | Track: weekly/monthly/habit goals + rings, heatmap + milestones, lifetime, per-scene target |
| v0.9.0 | Insight: status/act breakdowns (Track) + readability/word-frequency/echo (Revise → Analysis) |
| v0.10.0 | Revise → Comments (`%%`/`@@` extraction); Publish compile step editor; ideas inbox + quick capture; writing prompts |
| v0.11.0 | In-plugin manuscript editor (Write): navigator + editable body + Inspector, save-on-blur |
| v0.12.0 | Codex profiles: master-detail editor, per-category structured frontmatter fields (incl. new `world` category), entity-link pickers, "Appears in" backlinks |
| v0.13.0 | Series mode: group books into named series (`inkswell.series`), order them, aggregate words/target on the Home series header; codex already vault-wide (shared across books) |
| v0.14.0 | QA-fix batch: **New project** flow (modal + command + Home button); global active-project selector (persistent header) replacing per-panel pickers; focus-loss fix (render focus-guard that defers panel rebuilds while an input is focused); "Edit scene" modal (shared scene-meta form); pinned-tab-safe scene opening; Board POV/Act labels strip wikilinks; scaffold scenes default to `idea`; lone-series book defaults to #1; codex parent shown as annotation (no false indent); subtle theme-accent color pass |
| v0.15.0 | Writing aids + export readiness: tagged writing-prompt system (phase/category filters, `{pov}` context, ~50/phase) with an always-visible navigator card; POV field is a codex-character datalist; **chapter-grouping compile step** (heading per chapter + scene breaks); **pre-export check** (lint for tabs/double-spaces/raw HTML/page-breaks/mixed scene-breaks/empty scenes); **Generate reference doc** button (pandoc default → styled in Word) + scene-separator picker in the Publish UI; Write editor refinements (widened centered measure, segmented topbar); **Track overhaul** — overview cards, collapsible sections, writing-history bar chart (7/30/90/All), and a **sprint history** section (totals, avg/peak WPM, goal hit-rate) with actual-elapsed-time recording |
| v0.17.0 | **Plan reorganization, navigation & to-do markers.** New **Plan → Overview** (logline/theme/genre/audience in `inkswell.overview` + a dedicated planning note for synopsis/groundwork/3-act outline); **single-scene creation** from Home, Board, and Beats (a beat's "+ new scene" attaches it to the beat); **Codex promoted** from a Plan sub-tab to a top-level rail destination (meta cluster). **Revise → Flags renamed to Todos**, standardized on one bracketed marker family — `[TODO:]`/`[RESEARCH:]`/`[NOTE:]`/`[DIALOGUE:]`/`[SCENE:]` (dropped `%%`/`@@` comments and `[TK]`/`[???]`) — with **click-a-todo → jump to Write + flash** the exact marker, an "Insert a to-do marker…" picker, wrap-selection, and editor shortcuts. **Log decisions are editable in place.** Sample vault, SCHEMA, QA, and docs reconciled. |
| v0.16.0 | **Writing-method feature set** (three workstreams). **Revise → Audit** toolkit: per-scene 14-point checklist + project-level Story(18)/Page(32) checklists, scene-purpose lift-out verdict, heuristic scene-openings variety, character-arc grid (per-scene internal/external + flat-stretch/transform), side-character roster (codex `function`/`memorableTrait` + appearance counts), style-sheet consistency scan; composition mix (dialogue/interiority/narration) folded into Analysis; **Gaps** sweep. **Write/Track** fast-drafting aids: placeholder tokens (`[TK]`/`[SCENE:]`/`[DIALOGUE:]`/`[NOTE:]`/`[???]`) with editor highlighting + insert keymap/toolbar; decision log extended to a **typed/prioritized** issue tracker + "Log issue" from the editor; **deadline pace calculator** + draft-milestone zones + optional daily mood + "next up" breadcrumb. **Publish** self-publishing manager: Compile · **Checklist** (9-phase master checklist + book-metadata worksheet) · **Launch** (pre-order timeline planner + budget/cover/marketing/ARC trackers) |

## Planned

### 1.0.0
Cut once the scene + codex frontmatter schema is stable enough to promise compatibility. The schema is now frozen and documented in [SCHEMA.md](SCHEMA.md) (the 1.0 compatibility contract). **Remaining gate: the deep end-to-end live QA pass** — phases 5–13 are unit-tested but have not been driven in Obsidian.

## Known gaps / deferred (not on the critical path)
- **Write editor is a custom CM6 Live-Preview surface** (v0.11 → v0.15) — *not* Obsidian's native `MarkdownView`. Embedding Obsidian's own editor per scene remains deferred (undocumented APIs); the custom surface covers the user-facing need.
- **Acts/chapters are frontmatter fields**, not container objects (Board/compile group by them); **per-chapter word targets** wait on a chapter object (per-scene shipped).
- **Scene-templates UI** (Longform `sceneTemplate` is parsed, no apply-UI) and **"convert note → scene"** onboarding are unbuilt — the two feature gaps with a real pre-1.0 argument; both are additive post-1.0.
- **Compile-active-project command** still uses the quick modal, not the saved per-project step config (Publish panel uses the saved config).
- ~~**Schema not yet frozen/documented.**~~ Done — frozen + documented in [SCHEMA.md](SCHEMA.md). The live QA pass is the remaining 1.0 gate.

## Out of scope (philosophy)
AI; cloud sync / real-time collaboration; replacing Obsidian's editor wholesale; separate database/account.
