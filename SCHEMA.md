# Inkswell frontmatter schema (the 1.0 compatibility contract)

**Schema version: 1.0** — frozen at plugin `1.0.0`. This document is the authoritative list of every YAML frontmatter key Inkswell reads or writes. The keys below are a **stability promise**: a `1.x` release will not rename or repurpose them, so vaults built on Inkswell 1.0 stay readable. Additive changes (new optional keys) are allowed in `1.x`; renames or removals wait for a `2.0`.

## Core invariants

1. **Inkswell writes only frontmatter**, always via `fileManager.processFrontMatter` — it never edits a scene's prose body. The *one* exception is the Write panel's editor, which edits the body but preserves frontmatter.
2. **Two namespaces, never mixed.** Longform-compatible data lives under the top-level `longform` key (so existing Longform projects load drop-in). All Inkswell-only project data lives under a separate top-level `inkswell` key. **Inkswell never writes inside `longform`.**
3. **Cleared = deleted.** When a field is emptied, Inkswell deletes the key rather than leaving an empty value, and prunes empty sub-objects (e.g. removing the last series field drops `inkswell.series` entirely).
4. **Three note types** carry frontmatter: the **project index note**, each **scene note**, and each **codex entity note**. Every key below is scoped to exactly one.
5. **Stable IDs.** Checkpoint, beat, checklist-task, and tracker-row identifiers are stable string constants. Stored data keys off them, so human-facing *labels* can be reworded freely without migrating anyone's frontmatter — but the **IDs themselves are part of this contract**.

---

## A. Project index note — `longform` (Longform-compatible)

Mirrors Longform's `Draft` shape. Inkswell reads and writes these so projects round-trip with Longform. Source: `src/projects/draft-serialization.ts`, `src/projects/types.ts`.

| Key | Type | Notes |
|-----|------|-------|
| `longform.format` | `"scenes" \| "single"` | Multi-scene or single-document project |
| `longform.title` | string | Only written when the title is authored in frontmatter |
| `longform.draftTitle` | string \| null | Distinguishes drafts of the same project |
| `longform.workflow` | string \| null | Named compile workflow; null = default |
| `longform.sceneFolder` | string | Folder (relative to index) holding scene files (`scenes` format) |
| `longform.scenes` | nested string array | Ordered scene list; nested arrays encode indent/nesting |
| `longform.ignoredFiles` | string[] | Files in the scene folder to ignore |
| `longform.sceneTemplate` | string \| null | Template note applied to new scenes (parsed; apply-UI deferred) |

**Multiple drafts (non-normative).** Drafts of one story are separate index notes
that share the same `longform.title` and are distinguished by `draftTitle`; the
store groups them by `title` at runtime (`src/projects/stories.ts`). No new key is
involved — `title` + `draftTitle` already encode it (this is Longform's model).
"New draft" scaffolds the copy under `<storyFolder>/Drafts/<name>/` with its own
index note and `Scenes/` folder, but grouping is by frontmatter `title`, never by
folder, so any layout (including imported Longform drafts) groups correctly.

---

## B. Scene note — top-level scene metadata

Flat top-level keys on each scene file. Field names match StoryLine where they overlap for cross-tool compatibility. Source: `src/scenes/scene-meta.ts`.

| Key | Type | Allowed values / notes |
|-----|------|------------------------|
| `status` | enum | `idea` · `outlined` · `draft` · `written` · `revised` · `final` |
| `pov` | string | POV character (free text; datalist suggests codex characters) |
| `synopsis` | string | One-line scene summary |
| `subtitle` | string | Secondary scene title |
| `act` | string | Act label (free-form; drives Board/compile grouping) |
| `chapter` | string | Chapter label (free-form; drives compile group-by-chapter) |
| `color` | string | Hex tint, e.g. `#FF6B6B` |
| `inactive` | boolean | `true` = archived; excluded from compile + stats |
| `characters` | string[] | Linked codex characters as wikilinks, e.g. `["[[Anna]]"]` |
| `location` | string | Linked codex location as a wikilink |
| `plotlines` | string[] | Plotlines this scene advances — plain titles matching `inkswell.plotlines` entries (like `act`/`chapter` strings, NOT wikilinks) |
| `targetWords` | number | Per-scene word-count target |

### Scene note — `rev*` revision-audit keys

Top-level keys written by the Revise → Audit toolkit. Source: `src/revisions/audit-meta.ts`.

| Key | Type | Notes |
|-----|------|-------|
| `revScene` | map of `SceneCheckId → true` | Per-scene checkpoint state (only ticked checks stored) |
| `revSceneNote` | string | Freeform revision note for the scene |
| `revPurpose` | string | Lift-out test: "if removed, what breaks?" |
| `revVerdict` | enum | `keep` · `cut` · `merge` |
| `revOpening` | enum | `action` · `dialogue` · `thought` · `reflection` · `unknown` (manual override of the heuristic) |
| `revArc` | list of `{character, internal?, external?}` | Per-character arc snapshots; `character` is a wikilink (rename-safe) |

**Scene checkpoint IDs (14):** `startsRight` `described` `goalConflict` `shift` `purpose` `structure` `tension` `paced` `researched` `endsUncertain` `transitions` `narratorSwitch` `perspective` `consistent`

---

## C. Project index note — `inkswell` (Inkswell-only)

A single nested object under `inkswell`. All sub-keys optional. Source: `src/projects/types.ts`, `src/projects/index-writer.ts`.

### `inkswell.compile` — compile/export config
`sceneSteps` / `manuscriptSteps` (ordered `{id, options}` step lists) · `separator` (string) · `targetBasename` (string, default `manuscript`) · `format` (`md` · `html` · `pandoc`) · `pandoc` (`{to, extension, extraArgs}`, when `format: pandoc`).

### `inkswell.goals` — targets & pace
`target` (number) · `deadline` (string `YYYY-MM-DD`) · `daysPerWeek` (number 1–7, default 7). **Story-level** — see the note under `overview`.

### `inkswell.overview` — novel-level planning (Plan → Overview)
Short, single-line planning fields: `logline` · `theme` · `genre` · `audience` (all strings) · `planningNote` (string, vault path) · `cover` (string, vault path to the cover image). Long-form planning prose does **not** live in frontmatter — it lives in the **planning note** (see below), and `planningNote` records that note's path once created. `cover` is shown on the Home focused-project hero card; an uploaded cover is copied into the project folder as `cover.<ext>`, a picked image is referenced in place.

**Story-level, not per-draft:** `overview` and `goals` describe the *book*, so they're shared across all drafts of a story. They are read from and written to the story's **base draft** (the draft whose folder is an ancestor of its siblings — the copy origin), regardless of which draft is focused. A byte-copied new draft may carry an inherited stale copy in its own frontmatter; it's inert (never read) unless the base draft is deleted, in which case the next base's copy is used.

**The planning note** is an ordinary vault note (default `"<Title> — Plan.md"`, sibling of the index) holding the synopsis and outline prose under stable app-managed H2 sections: `## Synopsis` · `## Plot groundwork` · `## Act I` · `## Act II` · `## Act III`. It carries **no** `longform` key (so the store never mistakes it for a project) and is prose-only — outside this frontmatter contract, but listed here because `overview.planningNote` points at it. Source: `src/plan/planning-note.ts`, `src/plan/overview-panel.ts`.

### `inkswell.draftCreated` — draft creation timestamp
ISO 8601 string, stamped when a draft is created via **New draft** (a draft's own file ctime is unreliable). Absent on drafts that predate this field or were imported — treat absence as "unknown", not "day zero". Used for the draft-age column in the Track → Drafts comparison.

### `inkswell.series` — series membership
`name` (string; books sharing a name form one series) · `order` (number, 1-based).

### `inkswell.beats` — beat sheet
`template` (enum: `save-the-cat` · `three-act` · `heros-journey` · `seven-point` · `story-circle` · `romancing-the-beat` · `twenty-seven-chapter`) · `assignments` (map of `beatId → {scenes?: string[], note?: string, done?: boolean}`).

### `inkswell.acts` / `inkswell.chapters` — the Act › Chapter › Scene outline
`inkswell.acts`: ordered `[{id, title}]`. `inkswell.chapters`: ordered `[{id, title, actId?, targetWords?}]`, where `actId` links a chapter to its act (the explicit chapter→act relationship; absent = act-less).

These arrays are the **authoritative structure** (edited in Plan → **Outline**). The scene `act`/`chapter` strings and the `longform.scenes` order are **derived output Inkswell writes** from the tree: a scene's `chapter` = its chapter's title, its `act` = that chapter's act title (blank when loose/unassigned), and the manuscript is reordered to flatten(act → chapter → scene). This keeps chapters contiguous and Longform/StoryLine compatible (the scene strings still exist; the flat indented scene list is still valid). `id` is a stable string minted at creation so config/`actId` survive a rename. **Backward-compatible:** if the arrays are absent/partial, the outline is reconstructed from the scene strings (chapters adopted, a chapter's act inferred from its scenes' `act`), so pre-existing projects open with their current structure intact. Managed per **draft**, unlike story-level `overview`/`goals`.

### `inkswell.plotlines` — the Plot Grid columns
Ordered `[{id, title, color?}]` (edited in Plan → **Grid**). Array order = column order. Like acts/chapters, membership is by **title**: a scene joins a plotline via its `plotlines` string array, and the grid's cells derive entirely from scene data. `id` is a stable string minted at creation so `color` survives a rename (renaming a plotline rewrites every member scene's tag). Scene tags with no matching entry render as orphan "ghost" columns — adoptable, never silently dropped.

### `inkswell.revisions` — invisible-revision decision log
Array of `{id, text, scene: string|null, status, created, type?, priority?}`.
- `status`: `pending` · `applied`
- `type`: `continuity` (default if absent) · `plot-hole` · `rewrite` · `character` · `research` · `new-scene`
- `priority`: `low` · `med` · `high`

### `inkswell.revisionChecklist` — project Story/Page checklists
`story` and `page`, each a map of `checkpointId → {done?: boolean, note?: string}`.
- **Story IDs (18):** `structure` `startsRight` `reveals` `heroGoals` `conflict` `stakes` `tension` `believable` `researched` `backstory` `heroComplex` `heroTransforms` `sideCharsPurpose` `sideCharsMemorable` `subplots` `worldFleshed` `worldImmersive` `consistent`
- **Page IDs (32),** grouped: *necessity* (`telling` `overDescribing` `preempting` `internalQuestions` `adverbs`) · *paragraphs* (`repetitiveStructure` `overChoreographed` `purpleProse` `overusedMetaphor` `passiveVoice`) · *dialogue* (`tagOverload` `repetitiveDialogue` `flashyTags` `dialogueAdverbs` `unrealisticDialogue` `unnecessaryDialogue` `disjointedDialogue`) · *words* (`overusedWords` `echoes` `redundantWords` `intensifiers` `mitigators` `filterWords` `weakWords` `nonSpecificWords` `cliches` `researchWords`) · *consistency* (`namesConsistent` `descriptionsConsistent` `actionsConsistent` `referencesConsistent` `formattingConsistent`)

### `inkswell.arcTracked` — tracked characters
`string[]` of character wikilinks (rename-safe) shown in the arc grid.

### `inkswell.styleSheet` — consistency style sheet
`entries`: array of `{id, canonical, variants: string[], kind, note?}`.
- `kind`: `spelling` · `name` · `term` · `number` · `format`

### `inkswell.publishing` — self-publishing manager
Persisted with a deep-merge so sibling `inkswell` keys are never clobbered. Sub-objects:
- **`checklist`** — `{phaseId: {taskId: {done?, date?, notes?}}}`. Phases/tasks: `writing`(draft) · `editing`(selfEdit, critique, beta, preflight, hireEditor, incorporate) · `foundational`(genre, targetReader, authorName, business, budget) · `building`(metadata, formats, frontMatter, backMatter) · `cover`(comps, designer, finalize) · `formatting`(method, interior, referenceDoc, finalFiles) · `prepare`(platforms, releaseDate, preorder, pricing, isbns, keywords, categories) · `publishing`(accounts, upload, proof, marketing, review) · `launch`(announce, pressRelease, adCampaign).
- **`metadata`** — `title` `subtitle` `seriesTitle` `tagline` `blurb` `genre` `subgenres[]` `targetReader` `keywords[]` `categories{main?, sub?[]}` `kuExclusive` `formats{ebook?, paperback?, hardcover?}` where each format is `{enabled?, price?, isbn?}`.
- **`launch`** — `releaseDate` · `preorder` (bool) · `strategy` (`short` · `medium` · `long`) · `milestones` (`{label: {done?, date?}}`).
- **`budget`** — `items[]` of `{id, label, category: need|want, estimate?, actual?}`.
- **`cover`** — `plan?` · `comps[]` of `{id, title, note?, done?}`.
- **`marketing`** — `items[]` of `{id, strategy, date?, budget?, result?, done?}`.
- **`arcs`** — `readers[]` of `{id, name, contact?, sent?, reviewed?, note?}`.

---

## D. Codex entity note

Source: `src/codex/codex-store.ts`, `src/codex/profile-schema.ts`, `src/codex/codex-profile.ts`.

| Key | Type | Notes |
|-----|------|-------|
| `codex` | enum | Category / discovery marker: `character` · `location` · `world` · `faction` · `item` · `event` · `concept` |
| `aliases` | string[] | Obsidian-native; used by mention auto-detect |
| `parent` | wikilink | Parent entity (nested locations → world, etc.) |
| `codex-series` | string | Scope: visible only to books whose `inkswell.series.name` matches. Wins over `codex-project`. |
| `codex-project` | wikilink | Scope: visible only to the single project whose index note this links to (by basename). |

**Scope** (`codex-series` / `codex-project`): at most one is set. Neither = **global** (shared across every project — the default and back-compatible state). An entity is visible from a book when it is global, its `codex-project` is that book, or its `codex-series` is that book's series. New entries inherit the active project's scope (its series if any, else the book itself). Resolution + visibility logic: `src/codex/codex-scope.ts`.

**Template-introduced keys.** When a codex template note (`<baseFolder>/Templates/<Label>.md`) is present, new entries are scaffolded from it, so a note may carry additional **user-authored** frontmatter — most commonly Obsidian-native `tags` — that Inkswell preserves but does not manage or read. On creation Inkswell force-sets `codex` and scope over whatever the template declared; everything else is the user's. Source: `src/codex/codex-template.ts`, `createEntity` in `src/codex/codex-store.ts`.

Per-category profile fields are flat top-level keys, written by the profile editor. **Character:** `role` `function` `memorableTrait` `age` `gender` `occupation` `traits` `motivation` `flaw` `appearance` `backstory` `arc` `relationships[]`. **Location:** `type` `parent` `region` `climate` `population` `atmosphere` `significance` `history`. **World:** `geography` `culture` `politics` `magicTech` `religion` `economy` `history`. **Faction:** `type` `leadership[]` `size` `territory[]` `goal` `allies[]` `enemies[]`. **Item:** `type` `owner` `significance`. **Event:** `date` `participants[]` `outcome`. **Concept:** `type` `rules` `limitations` `significance`. (Fields ending `[]` are wikilink arrays; the rest are strings.)

---

## E. Plugin-local data (not in any vault note)

For completeness: writing history & baselines, daily word counts, streaks, sprint records, ideas inbox, active project, daily mood, and the "next up" breadcrumb live in the plugin's local `data.json`, **not** in vault frontmatter. They are intentionally outside this compatibility contract (machine-local, not synced as note content).

---

## Backward-compatibility allowances

- **`revArc`** accepts both the current wikilinked-list form and a legacy plain-name-keyed object; always re-emitted as the wikilinked list.
- **`arcTracked`** accepts plain names or wikilinks; always re-emitted as wikilinks.
- **`revisions[].type`** absent in pre-1.0 entries reads as `continuity`.
- **Sprint records** treat `elapsedSec` as optional (older records stored only `durationSec`).
