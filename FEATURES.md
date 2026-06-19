# Inkswell — Feature Catalog & Selection Sheet

> Working doc: mark the **Pick** column (`P1` next · `P2` later · `P3` maybe · `X` no). When done, this becomes a dependency-ordered build plan.

Inkswell has shipped phases 1–4 (`v0.4.0`): Longform-compatible projects + compile, goals/sprints/stats, invisible-revision log, Save the Cat beat sheet — inside a single-tab host view. Features below are drawn from three sources:

- **[SL]** StoryLine (Obsidian plugin) — `r:\repos\active\obsidian-storyline`
- **[IW]** Inkswell web app — `r:\repos\active\inkswell` (Next.js/SQLite/Tiptap)
- **[MX]** "Writing Apps Feature Comparison 2026" matrix (pixero) — 25-dimension cross-app taxonomy

**Legend**
- **Have**: ✅ in `v0.4.0` · ◑ partial · (blank) not built
- **Fit** (lean, local-first, frontmatter, *Obsidian-is-the-editor*): ✅ natural · ⚠️ heavy / overlaps Obsidian · ❌ conflicts
- **Src**: source(s)

---

## 1. Project & scene structure

| Pick | Feature                                                         | Have | Fit | Src      | Notes                                             |
| ---- | --------------------------------------------------------------- | ---- | --- | -------- | ------------------------------------------------- |
|      | Multi-scene projects (Longform-compatible index + scene tree)   | ✅    | ✅   | SL/IW/MX | core                                              |
|      | Scene reorder / indent / nest                                   | ✅    | ✅   | SL       |                                                   |
|      | Single-scene projects                                           | ◑    | ✅   | SL       | parsed, light UI                                  |
| X    | Acts & chapters (grouping above scenes)                         |      | ✅   | SL/IW    | frontmatter `act`/`chapter`                       |
| X    | Scene status pipeline (idea→draft→…→final, custom)              |      | ✅   | SL/IW/MX | frontmatter `status` + badges                     |
| X    | POV tracking per scene                                          |      | ✅   | SL/MX    | frontmatter `pov`                                 |
| X    | Scene synopsis / subtitle fields                                |      | ✅   | SL/IW    |                                                   |
|      | Scene metadata (conflict, emotion, intensity, custom fields)    |      | ✅   | SL       | drives pacing/analysis                            |
|      | Custom scene fields (typed: text/dropdown/multiselect/checkbox) |      | ⚠️  | SL       | powerful but complex; Obsidian Properties overlap |
| X    | Scene templates (defaults on new scene)                         | ◑    | ✅   | SL/IW    | Longform `sceneTemplate` exists                   |
| X    | Scene archive / inactive (hide from compile/stats)              |      | ✅   | SL       |                                                   |
| X    | Per-scene color tint                                            |      | ✅   | SL       | frontmatter `color`                               |
|      | Scenes-within-chapters (sub-scene granularity)                  |      | ⚠️  | IW       | nesting model change                              |
|      | Convert any note → scene                                        |      | ✅   | SL       | add `longform`/scene frontmatter                  |

## 2. Prose editing (Obsidian is the editor — mostly out of scope)

| Pick | Feature                                                      | Have | Fit | Src   | Notes                              |
| ---- | ------------------------------------------------------------ | ---- | --- | ----- | ---------------------------------- |
| X    | In-plugin manuscript/scrivenings editor (TODO already noted) |      | ⚠️  | SL/IW | big; planned someday               |
|      | Focus / distraction-free mode                                |      | ⚠️  | IW    | Obsidian + community plugins cover |
|      | Typewriter scrolling                                         |      | ⚠️  | IW    | community plugin exists            |
|      | Ambient soundscapes (rain/cafe/etc., Web Audio)              |      | ⚠️  | IW    | distinctive but off-mission        |
|      | Find & replace (in-doc + cross-project)                      |      | ❌   | IW    | Obsidian native                    |
|      | Rich-text toolbar                                            |      | ❌   | IW    | Obsidian native                    |

## 3. Outlining & structure boards

| Pick | Feature                                                                                            | Have | Fit | Src      | Notes                                                    |
| ---- | -------------------------------------------------------------------------------------------------- | ---- | --- | -------- | -------------------------------------------------------- |
| X    | Save the Cat 15-beat sheet                                                                         | ✅    | ✅   | SL/IW    | shipped                                                  |
| X    | More beat templates (3-Act, Hero's Journey, 7-Point, Story Circle, Romancing the Beat, 27-Chapter) |      | ✅   | SL/IW    | easy extension of current template system                |
| X    | Auto-create acts/chapters/placeholder scenes from a template                                       |      | ✅   | SL/IW    |                                                          |
|      | Corkboard / index-card spatial canvas                                                              |      | ⚠️  | SL/IW/MX | heavy; Obsidian Canvas overlaps                          |
| X    | Kanban board (group by act/status/POV)                                                             |      | ⚠️  | SL/MX    | Obsidian Kanban plugin overlaps                          |
|      | **Plot grid** (plot threads × scenes matrix)                                                       |      | ⚠️  | SL/IW/MX | **both apps have it; distinctive, frontmatter-storable** |
|      | Timeline view (story date/time, chronological vs reading order)                                    |      | ⚠️  | SL/IW/MX |                                                          |
|      | Non-linear timeline modes (flashback/parallel/frame/dream)                                         |      | ⚠️  | SL       | advanced                                                 |
|      | Plotlines subway-map visualization                                                                 |      | ⚠️  | SL       | SVG; flashy                                              |

## 4. Characters, worldbuilding & codex

| Pick | Feature                                                           | Have | Fit | Src      | Notes                               |
| ---- | ----------------------------------------------------------------- | ---- | --- | -------- | ----------------------------------- |
| X    | Character profiles (structured fields: role/arc/traits/backstory) | ✅   | ✅   | SL/IW/MX | v0.12.0 profile editor → frontmatter |
| X    | Location / world profiles (nested hierarchy)                      | ✅   | ✅   | SL/IW/MX | v0.12.0; `world` category + parent  |
| X    | Worldbuilding note types (Faction/Item/Event/Concept/Magic)       |      | ✅   | IW/MX    | templated notes                     |
| X    | Character–scene & location–scene linking                          |      | ✅   | SL/MX    | frontmatter `characters`/`location` |
| X    | Codex hub (unified entity browser + custom categories)            |      | ⚠️  | SL       |                                     |
| X    | Auto-detect entity mentions in text (link scanner)                |      | ⚠️  | SL/MX    | wikilinks/backlinks partly cover    |
|      | Relationship map (force-directed graph)                           |      | ⚠️  | SL/IW/MX | Obsidian graph partly covers        |
|      | Character × chapter appearance heatmap                            |      | ⚠️  | SL       | needs scene-character links first   |
|      | Portrait images / galleries per entity                            |      | ⚠️  | SL/IW    |                                     |

## 5. Goals, sprints & habit tracking

| Pick | Feature                                                 | Have | Fit | Src      | Notes                                   |
| ---- | ------------------------------------------------------- | ---- | --- | -------- | --------------------------------------- |
|      | Daily word goal                                         | ✅    | ✅   | SL/IW/MX | shipped                                 |
|      | Project total word target + completion forecast         | ✅    | ✅   | SL/IW    | shipped (projection)                    |
|      | Writing sprints (timer, live count, log)                | ✅    | ✅   | SL/IW    | shipped                                 |
| X    | Weekly / monthly goals + progress rings                 |      | ✅   | SL/IW    | extends goals                           |
| X    | Per-chapter / per-scene word targets                    |      | ✅   | SL/IW    |                                         |
|      | Writing streaks                                         | ✅    | ✅   | IW       | shipped                                 |
| X    | Habit goals (cadence: target days/week, min units)      |      | ✅   | IW       | distinctive vs raw word count           |
| X    | Writing heatmap (GitHub-style calendar) + milestones    | ◑    | ✅   | IW       | have 30-day bars; calendar heatmap easy |
| X    | Lifetime records (best day, longest streak, total ever) |      | ✅   | IW       |                                         |

## 6. Stats & manuscript analysis

| Pick | Feature                                                             | Have | Fit | Src   | Notes                    |
| ---- | ------------------------------------------------------------------- | ---- | --- | ----- | ------------------------ |
|      | Stats dashboard (today, streak, 30-day chart, projection)           | ✅    | ✅   | SL/IW | shipped                  |
| X    | Status / act / chapter breakdown charts                             |      | ✅   | SL/IW |                          |
|      | Pacing & tension analysis (scene length, dialogue %, tension curve) |      | ⚠️  | SL    | needs scene metadata     |
| X    | Readability scores (Flesch-Kincaid)                                 |      | ⚠️  | SL/IW | English-centric          |
| X    | Word-frequency / overused-word / echo finder                        |      | ⚠️  | SL/IW | local text analysis      |
|      | Plot-hole detection (timeline/character/plotline/continuity)        |      | ⚠️  | SL    | depends on rich metadata |
|      | POV distribution / page-time                                        |      | ⚠️  | SL    | needs POV field          |

## 7. Revision & versioning

| Pick | Feature                                                          | Have | Fit | Src      | Notes                                     |
| ---- | ---------------------------------------------------------------- | ---- | --- | -------- | ----------------------------------------- |
|      | Invisible-revision decision log                                  | ✅    | ✅   | (ours)   | shipped — our differentiator              |
| X    | Inline revision comments (`@@…@@` / `%%…%%`) extracted to a list |      | ✅   | IW       | complements the decision log              |
|      | Scene snapshots / version history + diff + restore               |      | ⚠️  | SL/IW/MX | Obsidian core File Recovery + Git overlap |
|      | Setup/payoff tracking (foreshadow → resolution links + warnings) |      | ⚠️  | SL/MX    | distinctive; frontmatter links            |

## 8. Export, compile & import

| Pick | Feature                                                       | Have | Fit | Src      | Notes                    |
| ---- | ------------------------------------------------------------- | ---- | --- | -------- | ------------------------ |
|      | Compile to Markdown / HTML                                    | ✅    | ✅   | SL/IW/MX | shipped                  |
|      | Compile to DOCX / PDF (pandoc)                                | ✅    | ✅   | SL/IW    | shipped (pandoc-gated)   |
|      | EPUB export                                                   |      | ⚠️  | IW       | pandoc or JS lib         |
|      | Export templates (font, margins, line spacing, heading style) |      | ✅   | IW       | compile-step options     |
| X    | Compile step editor UI (reorder/configure steps)              | ◑    | ✅   | SL       | engine exists; needs UI  |
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
| X    | Story ideas inbox (global, pinnable, taggable)             |      | ✅   | IW  | light                    |
| X    | Quick capture (jot without leaving current note)           |      | ✅   | IW  | light                    |
|      | Name generator (fantasy/sci-fi)                            |      | ⚠️  | IW  | fun, scope-creepy        |
| X    | Writing prompts                                            |      | ⚠️  | IW  |                          |
|      | In-app cheatsheets (structure/POV/craft/genre word counts) |      | ⚠️  | IW  | static reference content |

## 11. Series, navigation & UX

| Pick | Feature                                                  | Have | Fit | Src   | Notes                        |
| ---- | -------------------------------------------------------- | ---- | --- | ----- | ---------------------------- |
| X    | Multiple drafts of a project                             | ◑    | ✅   | SL/IW | Longform `draftTitle` exists |
| X    | Series mode (multi-book, shared codex)                   |      | ⚠️  | SL/IW | heavy                        |
| X    | Project switcher / dashboard                             | ◑    | ✅   | SL/IW | explorer lists all           |
| X    | Navigator (search, sort, plotline filter, pinned scenes) | ◑    | ✅   | SL    | explorer partly covers       |
|      | Filter presets across views                              |      | ⚠️  | SL    |                              |
|      | Per-scene/tag color schemes & theming                    |      | ⚠️  | SL    | Obsidian theming overlaps    |
|      | Undo/redo for structural edits                           |      | ⚠️  | SL    |                              |
|      | Commands for everything (palette-driven)                 | ✅    | ✅   | SL    | ongoing                      |

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
