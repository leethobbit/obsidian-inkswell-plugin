# Inkswell Roadmap

Phase-centric information architecture (one tab, left icon rail): **Home · Plan · Write · Track · Revise · Publish**. Each destination does one job; depth lives behind sub-tabs or the Scene Inspector. See `FEATURES.md` for the full pick list and the plan file for IA rationale.

**Current status: v0.16.0** — phases 5–13 shipped + a QA-fix batch (v0.14.0) + writing-aids & export-readiness (v0.15.0) + the writing-method feature set (v0.16.0). Next: the deep end-to-end live QA pass (the 1.0 gate) — v0.15.0 and v0.16.0 surfaces are unit/build-verified only.

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
| v0.16.0 | **Writing-method feature set** (three workstreams). **Revise → Audit** toolkit: per-scene 14-point checklist + project-level Story(18)/Page(32) checklists, scene-purpose lift-out verdict, heuristic scene-openings variety, character-arc grid (per-scene internal/external + flat-stretch/transform), side-character roster (codex `function`/`memorableTrait` + appearance counts), style-sheet consistency scan; composition mix (dialogue/interiority/narration) folded into Analysis; **Gaps** sweep. **Write/Track** fast-drafting aids: placeholder tokens (`[TK]`/`[SCENE:]`/`[DIALOGUE:]`/`[NOTE:]`/`[???]`) with editor highlighting + insert keymap/toolbar; decision log extended to a **typed/prioritized** issue tracker + "Log issue" from the editor; **deadline pace calculator** + draft-milestone zones + optional daily mood + "next up" breadcrumb. **Publish** self-publishing manager: Compile · **Checklist** (9-phase master checklist + book-metadata worksheet) · **Launch** (pre-order timeline planner + budget/cover/marketing/ARC trackers) |

## Planned

### 1.0.0
Cut once the scene + codex frontmatter schema is stable enough to promise compatibility. **Gate: the deep end-to-end live QA pass must happen first** — phases 5–13 are unit-tested but have not been driven in Obsidian.

## Known gaps / deferred (not on the critical path)
- **Write editor is a custom CM6 Live-Preview surface** (v0.11 → v0.15) — *not* Obsidian's native `MarkdownView`. Embedding Obsidian's own editor per scene remains deferred (undocumented APIs); the custom surface covers the user-facing need.
- **Acts/chapters are frontmatter fields**, not container objects (Board/compile group by them); **per-chapter word targets** wait on a chapter object (per-scene shipped).
- **Scene-templates UI** (Longform `sceneTemplate` is parsed, no apply-UI) and **"convert note → scene"** onboarding are unbuilt — the two feature gaps with a real pre-1.0 argument; both are additive post-1.0.
- **Compile-active-project command** still uses the quick modal, not the saved per-project step config (Publish panel uses the saved config).
- **Schema not yet frozen/documented.** v0.15/v0.16 added ~15 frontmatter keys; the 1.0 compat promise needs a written `docs/schema.md` and the live QA pass first.

## Out of scope (philosophy)
AI; cloud sync / real-time collaboration; replacing Obsidian's editor wholesale; separate database/account.
