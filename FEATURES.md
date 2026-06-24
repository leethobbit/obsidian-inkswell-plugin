# Inkswell — Feature Catalog & Selection Sheet

> Working doc: mark the **Pick** column (`P1` next · `P2` later · `P3` maybe · `X` no). When done, this becomes a dependency-ordered build plan.

Inkswell has shipped phases 1–16 (`v0.16.0`): Longform-compatible projects + compile pipeline, goals/sprints/stats, invisible-revision log, beat sheets, Kanban board, codex with structured profiles, the Track dashboard, Insight analysis, a custom Live-Preview manuscript editor, series mode, writing-aids + export tooling (`v0.15.0`), and a full **writing-method feature set** (`v0.16.0`: Revise audit toolkit, fast-drafting aids, self-publishing manager — see §12) — inside a single-tab host view. The pick-list below is drawn from three sources:

- **[SL]** StoryLine (Obsidian plugin) — `r:\repos\active\obsidian-storyline`
- **[IW]** Inkswell web app — `r:\repos\active\inkswell` (Next.js/SQLite/Tiptap)
- **[MX]** "Writing Apps Feature Comparison 2026" matrix (pixero) — 25-dimension cross-app taxonomy

**Legend**
- **Have** (as of `v0.14.0`): ✅ shipped · ◑ partial · (blank) not built
- **Fit** (lean, local-first, frontmatter, *Obsidian-is-the-editor*): ✅ natural · ⚠️ heavy / overlaps Obsidian · ❌ conflicts
- **Src**: source(s)

## Parity snapshot (v0.16.0)

**Every selected feature (`X` in Pick) is now at least partially shipped**, and v0.15/v0.16 added a large band of writing-method tooling beyond the original sheet (see §12). The original selection sheet has no untouched picks left.

- **Full parity on the core loop:** project/scene structure, status/POV/synopsis/color/archive, beat sheets (7 templates) + scaffold, Kanban board, codex (profiles, linking, auto-detect, hub), goals/sprints/streaks/habit/heatmap/lifetime, stats + readability/word-frequency/echo, compile (MD/HTML/DOCX/PDF/EPUB + step editor), revision log + inline comments, ideas/quick-capture/prompts, series mode, global project switcher, and a custom **Live-Preview** manuscript editor.
- **Beyond the sheet (v0.15–v0.16, §12):** fast-drafting aids (placeholder tokens, deadline pace calculator, milestone zones, mood/next-up), the Revise **Audit** toolkit (3-tier checklists, lift-out test, scene-openings, character-arc grid, side-character roster, style-sheet scan), composition analysis, the **Gaps** sweep, a typed/prioritized decision log, and a self-publishing manager (checklist, metadata, pre-order planner, launch trackers).
- **Partial (◑), candidates for post-1.0:** acts/chapters as real container objects (frontmatter fields + Board/compile grouping today), scene-templates UI, codex *custom* categories (7 fixed), per-chapter word targets, multiple-drafts UI, a richer Navigator. None blocks 1.0 (all additive).
- **Deliberately not built:** the ⚠️/❌ rows that overlap Obsidian or conflict with the local-first/no-AI philosophy (corkboard, plot grid, timeline, relationship graph, snapshots, imports, submissions, AI) — see the out-of-scope section.

> [!note] The 1.0 gate is stabilization, not features. Cut once the (now larger) frontmatter schema is frozen + documented and the deep live QA pass (see `QA.md`, incl. the v0.16 section) is done.

---

## 1. Project & scene structure

| Pick | Feature                                                         | Have | Fit | Src      | Notes                                             |
| ---- | --------------------------------------------------------------- | ---- | --- | -------- | ------------------------------------------------- |
|      | Multi-scene projects (Longform-compatible index + scene tree)   | ✅    | ✅   | SL/IW/MX | core                                              |
|      | Scene reorder / indent / nest                                   | ✅    | ✅   | SL       |                                                   |
|      | Single-scene projects                                           | ◑    | ✅   | SL       | parsed, light UI                                  |
| X    | Acts & chapters (grouping above scenes)                         | ◑   | ✅   | SL/IW    | `act`/`chapter` fields + Board grouping; not container objects |
| X    | Scene status pipeline (idea→draft→…→final, custom)              | ✅   | ✅   | SL/IW/MX | v0.5 `status` + badges (fixed set)                |
| X    | POV tracking per scene                                          | ✅   | ✅   | SL/MX    | `pov` + Board grouping                            |
| X    | Scene synopsis / subtitle fields                                | ✅   | ✅   | SL/IW    | Inspector                                         |
|      | Scene metadata (conflict, emotion, intensity, custom fields)    |      | ✅   | SL       | drives pacing/analysis                            |
|      | Custom scene fields (typed: text/dropdown/multiselect/checkbox) |      | ⚠️  | SL       | powerful but complex; Obsidian Properties overlap |
| X    | Scene templates (defaults on new scene)                         | ◑   | ✅   | SL/IW    | Longform `sceneTemplate` parsed; no UI            |
| X    | Scene archive / inactive (hide from compile/stats)              | ✅   | ✅   | SL       | `inactive` field                                  |
| X    | Per-scene color tint                                            | ✅   | ✅   | SL       | `color` + swatches                                |
|      | Scenes-within-chapters (sub-scene granularity)                  |      | ⚠️  | IW       | nesting model change                              |
|      | Convert any note → scene                                        |      | ✅   | SL       | add `longform`/scene frontmatter                  |

## 2. Prose editing (Obsidian is the editor — mostly out of scope)

| Pick | Feature                                                      | Have | Fit | Src   | Notes                              |
| ---- | ------------------------------------------------------------ | ---- | --- | ----- | ---------------------------------- |
| X    | In-plugin manuscript/scrivenings editor (TODO already noted) | ✅   | ⚠️  | SL/IW | v0.11 Write panel → v0.15 custom CM6 **Live-Preview** surface (+v0.16 placeholder-token highlighting). Embedding Obsidian's native editor remains deferred. |
|      | Focus / distraction-free mode                                |      | ⚠️  | IW    | Obsidian + community plugins cover |
|      | Typewriter scrolling                                         |      | ⚠️  | IW    | community plugin exists            |
|      | Ambient soundscapes (rain/cafe/etc., Web Audio)              |      | ⚠️  | IW    | distinctive but off-mission        |
|      | Find & replace (in-doc + cross-project)                      |      | ❌   | IW    | Obsidian native                    |
|      | Rich-text toolbar                                            |      | ❌   | IW    | Obsidian native                    |

## 3. Outlining & structure boards

| Pick | Feature                                                                                            | Have | Fit | Src      | Notes                                                    |
| ---- | -------------------------------------------------------------------------------------------------- | ---- | --- | -------- | -------------------------------------------------------- |
| X    | Save the Cat 15-beat sheet                                                                         | ✅    | ✅   | SL/IW    | shipped                                                  |
| X    | More beat templates (3-Act, Hero's Journey, 7-Point, Story Circle, Romancing the Beat, 27-Chapter) | ✅   | ✅   | SL/IW    | v0.6 — all 7 templates shipped                           |
| X    | Auto-create acts/chapters/placeholder scenes from a template                                       | ✅   | ✅   | SL/IW    | v0.6 scaffold (placeholder scenes; acts/chapters n/a)    |
|      | Corkboard / index-card spatial canvas                                                              |      | ⚠️  | SL/IW/MX | heavy; Obsidian Canvas overlaps                          |
| X    | Kanban board (group by act/status/POV)                                                             | ✅   | ⚠️  | SL/MX    | v0.6 Board (status/act/POV, drag-to-set)                 |
|      | **Plot grid** (plot threads × scenes matrix)                                                       |      | ⚠️  | SL/IW/MX | **both apps have it; distinctive, frontmatter-storable** |
|      | Timeline view (story date/time, chronological vs reading order)                                    |      | ⚠️  | SL/IW/MX |                                                          |
|      | Non-linear timeline modes (flashback/parallel/frame/dream)                                         |      | ⚠️  | SL       | advanced                                                 |
|      | Plotlines subway-map visualization                                                                 |      | ⚠️  | SL       | SVG; flashy                                              |

## 4. Characters, worldbuilding & codex

| Pick | Feature                                                           | Have | Fit | Src      | Notes                               |
| ---- | ----------------------------------------------------------------- | ---- | --- | -------- | ----------------------------------- |
| X    | Character profiles (structured fields: role/arc/traits/backstory) | ✅   | ✅   | SL/IW/MX | v0.12.0 profile editor → frontmatter |
| X    | Location / world profiles (nested hierarchy)                      | ✅   | ✅   | SL/IW/MX | v0.12.0; `world` category + parent  |
| X    | Worldbuilding note types (Faction/Item/Event/Concept/Magic)       | ✅   | ✅   | IW/MX    | v0.7/v0.12 categories (magic → Concept) |
| X    | Character–scene & location–scene linking                          | ✅   | ✅   | SL/MX    | `characters`/`location` + Inspector pickers |
| X    | Codex hub (unified entity browser + custom categories)            | ◑   | ⚠️  | SL       | v0.7 hub; 7 fixed categories, not custom |
| X    | Auto-detect entity mentions in text (link scanner)                | ✅   | ⚠️  | SL/MX    | v0.7 "Detect mentions"              |
|      | Relationship map (force-directed graph)                           | ◑   | ⚠️  | SL/IW/MX | relationships stored as wikilinks (v0.12); Obsidian graph renders them |
|      | Character × chapter appearance heatmap                            | ◑   | ⚠️  | SL       | v0.12 "Appears in" backlinks (list, not heatmap) |
|      | Portrait images / galleries per entity                            |      | ⚠️  | SL/IW    |                                     |

## 5. Goals, sprints & habit tracking

| Pick | Feature                                                 | Have | Fit | Src      | Notes                                   |
| ---- | ------------------------------------------------------- | ---- | --- | -------- | --------------------------------------- |
|      | Daily word goal                                         | ✅    | ✅   | SL/IW/MX | shipped                                 |
|      | Project total word target + completion forecast         | ✅    | ✅   | SL/IW    | shipped (projection)                    |
|      | Writing sprints (timer, live count, log)                | ✅    | ✅   | SL/IW    | shipped                                 |
| X    | Weekly / monthly goals + progress rings                 | ✅   | ✅   | SL/IW    | v0.8 rings                              |
| X    | Per-chapter / per-scene word targets                    | ◑   | ✅   | SL/IW    | per-scene `targetWords` (v0.8); per-chapter needs chapter object |
|      | Writing streaks                                         | ✅    | ✅   | IW       | shipped                                 |
| X    | Habit goals (cadence: target days/week, min units)      | ✅   | ✅   | IW       | v0.8                                    |
| X    | Writing heatmap (GitHub-style calendar) + milestones    | ✅   | ✅   | IW       | v0.8 calendar heatmap + milestones      |
| X    | Lifetime records (best day, longest streak, total ever) | ✅   | ✅   | IW       | v0.8                                    |

## 6. Stats & manuscript analysis

| Pick | Feature                                                             | Have | Fit | Src   | Notes                    |
| ---- | ------------------------------------------------------------------- | ---- | --- | ----- | ------------------------ |
|      | Stats dashboard (today, streak, 30-day chart, projection)           | ✅    | ✅   | SL/IW | shipped                  |
| X    | Status / act / chapter breakdown charts                             | ✅   | ✅   | SL/IW | v0.9 by-status + by-act (no chapter) |
| X    | Pacing & tension analysis (scene length, dialogue %, tension curve) | ◑   | ⚠️  | SL    | v0.16 composition mix (dialogue/interiority/narration %, front/back-load flags) + scene-openings variety; tension curve n/a |
| X    | Readability scores (Flesch-Kincaid)                                 | ✅   | ⚠️  | SL/IW | v0.9 Analysis            |
| X    | Word-frequency / overused-word / echo finder                        | ✅   | ⚠️  | SL/IW | v0.9 Analysis            |
|      | Plot-hole detection (timeline/character/plotline/continuity)        |      | ⚠️  | SL    | depends on rich metadata |
|      | POV distribution / page-time                                        |      | ⚠️  | SL    | needs POV field          |

## 7. Revision & versioning

| Pick | Feature                                                          | Have | Fit | Src      | Notes                                     |
| ---- | ---------------------------------------------------------------- | ---- | --- | -------- | ----------------------------------------- |
|      | Invisible-revision decision log                                  | ✅    | ✅   | (ours)   | shipped — our differentiator              |
| X    | Inline revision comments (`@@…@@` / `%%…%%`) extracted to a list | ✅   | ✅   | IW       | v0.10 Comments panel                      |
|      | Scene snapshots / version history + diff + restore               |      | ⚠️  | SL/IW/MX | Obsidian core File Recovery + Git overlap |
|      | Setup/payoff tracking (foreshadow → resolution links + warnings) |      | ⚠️  | SL/MX    | distinctive; frontmatter links            |

## 8. Export, compile & import

| Pick | Feature                                                       | Have | Fit | Src      | Notes                    |
| ---- | ------------------------------------------------------------- | ---- | --- | -------- | ------------------------ |
|      | Compile to Markdown / HTML                                    | ✅    | ✅   | SL/IW/MX | shipped                  |
|      | Compile to DOCX / PDF (pandoc)                                | ✅    | ✅   | SL/IW    | shipped (pandoc-gated)   |
|      | EPUB export                                                   | ✅   | ⚠️  | IW       | v0.10 via pandoc (.epub format) |
|      | Export templates (font, margins, line spacing, heading style) |      | ✅   | IW       | compile-step options     |
| X    | Compile step editor UI (reorder/configure steps)              | ✅   | ✅   | SL       | v0.10 Publish step editor |
|      | Import DOCX / Markdown (heading-split into scenes)            |      | ⚠️  | IW       |                          |
|      | Scrivener import                                              |      | ⚠️  | SL/MX    | one-time desktop utility |
|      | Outline export (metadata + stats, not prose)                  |      | ✅   | SL       |                          |

## 9. Submissions & publishing

| Pick | Feature                                              | Have | Fit | Src | Notes                                      |
| ---- | ---------------------------------------------------- | ---- | --- | --- | ------------------------------------------ |
|      | Submissions tracker (agents/publishers, status, CSV) |      | ⚠️  | IW  | could be an Obsidian Base/dataview instead |

## 10. Reference & ideation tools

| Pick | Feature                                                    | Have | Fit | Src | Notes                    |
| ---- | ---------------------------------------------------------- | ---- | --- | --- | ------------------------ |
| X    | Story ideas inbox (global, pinnable, taggable)             | ✅   | ✅   | IW  | v0.10 (pinnable; tagging n/a) |
| X    | Quick capture (jot without leaving current note)           | ✅   | ✅   | IW  | v0.10 command            |
|      | Name generator (fantasy/sci-fi)                            |      | ⚠️  | IW  | fun, scope-creepy        |
| X    | Writing prompts                                            | ✅   | ⚠️  | IW  | v0.10/v0.11 prompt card  |
|      | In-app cheatsheets (structure/POV/craft/genre word counts) |      | ⚠️  | IW  | static reference content |

## 11. Series, navigation & UX

| Pick | Feature                                                  | Have | Fit | Src   | Notes                        |
| ---- | -------------------------------------------------------- | ---- | --- | ----- | ---------------------------- |
| X    | Multiple drafts of a project                             | ◑    | ✅   | SL/IW | Longform `draftTitle` exists |
| X    | Series mode (multi-book, shared codex)                   | ✅   | ✅   | SL/IW | v0.13.0; `inkswell.series` + Home grouping |
| X    | Project switcher / dashboard                             | ✅   | ✅   | SL/IW | Home list + v0.14 persistent header selector |
| X    | Navigator (search, sort, plotline filter, pinned scenes) | ◑    | ✅   | SL    | explorer partly covers       |
|      | Filter presets across views                              |      | ⚠️  | SL    |                              |
|      | Per-scene/tag color schemes & theming                    |      | ⚠️  | SL    | Obsidian theming overlaps    |
|      | Undo/redo for structural edits                           |      | ⚠️  | SL    |                              |
|      | Commands for everything (palette-driven)                 | ✅    | ✅   | SL    | ongoing                      |

---

## 12. Writing-method tooling (v0.15–v0.16)

Features distilled from established fast-drafting, revision, and self-publishing craft methods. All shipped. These sit on top of the scene/codex frontmatter foundation and stay local-first (no AI, no platform calls).

| Have | Feature                                                                 | Phase | Notes |
| ---- | ----------------------------------------------------------------------- | ----- | ----- |
| ✅    | Placeholder tokens (`[TK]`/`[SCENE:]`/`[DIALOGUE:]`/`[NOTE:]`/`[???]`)   | Write | editor highlighting + insert keymap/toolbar |
| ✅    | "Find all gaps" sweep                                                   | Revise → Gaps | every placeholder across the manuscript, click-through |
| ✅    | Deadline pace calculator (required daily words + ahead/on-track/behind) | Track | `goals.deadline`/`daysPerWeek`; ~1wk/10k suggestion |
| ✅    | Draft-milestone zones (the Muddle, halfway, home stretch)               | Track | tied to the word-count forecast |
| ✅    | Optional daily mood + "next up" breadcrumb                              | Track/Write | light-touch; `data.json` |
| ✅    | Typed + prioritized decision log; log-from-editor                       | Revise → Log | extends the invisible-revision log (type/priority optional) |
| ✅    | Per-scene 14-point revision checklist + manuscript dashboard            | Revise → Audit | `revScene` scene frontmatter |
| ✅    | Story (18) + Page (32) project revision checklists                      | Revise → Audit | `inkswell.revisionChecklist` |
| ✅    | Scene-purpose lift-out verdict (keep/cut/merge)                         | Revise → Audit | `revVerdict`/`revPurpose` |
| ✅    | Scene-openings variety (heuristic) + composition mix                    | Revise → Audit/Analysis | dialogue/interiority/narration %, front/back-load flags |
| ✅    | Character-arc grid (internal/external, flat-stretch, transform)         | Revise → Audit | `revArc` + `inkswell.arcTracked` |
| ✅    | Side-character roster (9 functions, appearance counts)                  | Revise → Audit | codex `function`/`memorableTrait` |
| ✅    | Style-sheet consistency scan                                            | Revise → Audit | `inkswell.styleSheet` |
| ✅    | Self-publishing master checklist (9 phases) + book-metadata worksheet   | Publish → Checklist | `inkswell.publishing` |
| ✅    | Pre-order timeline planner (computed milestone dates)                   | Publish → Launch | short/medium/long strategies |
| ✅    | Budget / cover-comp / marketing / ARC trackers                          | Publish → Launch | row-list trackers |

---

## Deliberately out of scope (philosophy conflicts ❌)

Listed so the decision is explicit — flag any you actually want and we'll reconsider.

- **AI features** (generation, rewriting, assistants)
- **Cloud sync / real-time collaboration / co-editing** — local-first only; vault sync is the user's job
- **Replacing Obsidian's editor** (full rich-text editor, find & replace, formatting toolbar)
- **Separate database/account** (SQLite/Prisma/auth like the Inkswell web app) — we store in vault frontmatter + plugin data only

---

## Dependency note

A small **scene-metadata foundation** — `status`, `pov`, `synopsis`, `characters`, `location` in frontmatter + a Scene Details editor — is the prerequisite that unlocks the largest cluster of features at once: status tracking, POV stats, plot grid, timeline, character/location linking, pacing analysis. Pick it early if you want any of that cluster.
