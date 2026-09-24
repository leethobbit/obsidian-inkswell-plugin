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
| `longform.sceneTemplate` | string \| null | Vault path of a template note applied to new scenes (`.md` optional). Resolution: this path first, else the vault-wide `<baseFolder>/Templates/Scene.md`, else the default empty scaffold. The note's frontmatter+body are copied (`{{title}}` substituted); Inkswell-seeded fields (e.g. a beat's synopsis) win over the template, and `status: idea` applies only when neither sets a status. Set via frontmatter; no picker UI yet. |

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
| `status` | enum | `idea` · `outlined` · `draft` · `written` · `revised` · `final`. The STORED values are only ever these six. Display (label, visibility, order) may be overridden per vault via `settings.listOverrides["scene.status"]` (§E.1) — a hidden status is still read; the app never writes one. |
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
| `revScene` | map of `checkpointId → true` | Per-scene checkpoint state (only ticked checks stored). The id is a shipped `SceneCheckId` (below) or a custom `sc-…` id from `settings.listOverrides["audit.scene"].added` (§E.1). Unknown/stale ids are preserved and ignored, never deleted. |
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

**Story-level, not per-draft:** `overview`, `goals`, `publishing`, and `series` describe the *book*, so they're shared across all drafts of a story. They are read from and written to the story's **base draft** (the draft whose folder is an ancestor of its siblings — the copy origin), regardless of which draft is focused. A byte-copied new draft may carry an inherited stale copy in its own frontmatter; it's inert (never read) unless the base draft is deleted, in which case the next base's copy is used. **Known drift (per-draft on purpose, for now):** `beats`, `plotlines`, `styleSheet`, `arcTracked`, and `revisions` are byte-copied into a new draft and edited independently per draft — a restructure pass legitimately wants its own beat sheet/columns, but be aware edits in one draft don't appear in its siblings.

**The planning note** is an ordinary vault note (default `"<Title> — Plan.md"`, sibling of the index) holding the synopsis and outline prose under stable app-managed H2 sections: `## Synopsis` · `## Plot groundwork` · `## Act I` · `## Act II` · `## Act III`. It carries **no** `longform` key (so the store never mistakes it for a project) and is prose-only — outside this frontmatter contract, but listed here because `overview.planningNote` points at it. Source: `src/plan/planning-note.ts`, `src/plan/overview-panel.ts`. `planningNote` is a plain path (not a link), so Obsidian never rewrites it on a manual move — readers resolve it via `findPlanningNote` (stored path → default sibling → lone `* — Plan.md` sibling) and heal the pointer; **Rename project** (`src/projects/rename-plan.ts`) remaps it, `cover`, and `longform.sceneTemplate` explicitly.

### `inkswell.draftCreated` — draft creation timestamp
ISO 8601 string, stamped when a draft is created via **New draft** (a draft's own file ctime is unreliable). Absent on drafts that predate this field or were imported — treat absence as "unknown", not "day zero". Used for the draft-age column in the Track → Drafts comparison.

### `inkswell.series` — series membership
`name` (string; books sharing a name form one series) · `order` (number, 1-based). A series is implicit — there is no series note. **Rename series** (`src/series/series-ops.ts`) rewrites `name` on every draft carrying the old name (sibling drafts byte-copy the tag) and every codex note's `codex-series`; **Reorder books** rewrites `order` as 1..n across the series; a book joining a series defaults to `max(order) + 1`.

### `inkswell.beats` — beat sheet
`template` (a built-in id: `save-the-cat` · `three-act` · `heros-journey` · `seven-point` · `story-circle` · `romancing-the-beat` · `twenty-seven-chapter` · `ten-point` — **or** a user-defined custom-template slug, see below) · `assignments` (map of `beatId → {scenes?: string[], note?: string, done?: boolean}`).

The built-in `ten-point` beat ids (`point-1` … `point-10`) join the stable-ID contract (invariant 5). **Custom beat templates** (Settings → Beat sheet templates) are persisted in the plugin's local `data.json` as `settings.customBeatTemplates` (`{id, name, beats: [{id, name, blurb, position}]}`; normalized on load by `normalizeCustomBeatTemplates` in `src/outliner/custom-templates.ts`). A `template` value that matches **no** known template (deleted custom, or `data.json` didn't travel with the vault) is **never remapped or dropped** — the Beats panel renders a degraded sheet synthesized from the assignment keys, with every note editable, until the template is re-created or another is picked. Deleting a custom template touches no notes.

### `inkswell.acts` / `inkswell.chapters` — the Act › Chapter › Scene outline
`inkswell.acts`: ordered `[{id, title}]`. `inkswell.chapters`: ordered `[{id, title, actId?, targetWords?}]`, where `actId` links a chapter to its act (the explicit chapter→act relationship; absent = act-less).

These arrays are the **authoritative structure** (edited in Plan → **Outline**). The scene `act`/`chapter` strings and the `longform.scenes` order are **derived output Inkswell writes** from the tree: a scene's `chapter` = its chapter's title, its `act` = that chapter's act title (blank when loose/unassigned), and the manuscript is reordered to flatten(act → chapter → scene). This keeps chapters contiguous and Longform/StoryLine compatible (the scene strings still exist; the flat indented scene list is still valid). `id` is a stable string minted at creation so config/`actId` survive a rename. **Backward-compatible:** if the arrays are absent/partial, the outline is reconstructed from the scene strings (chapters adopted, a chapter's act inferred from its scenes' `act`), so pre-existing projects open with their current structure intact. Managed per **draft**, unlike story-level `overview`/`goals`.

### `inkswell.plotlines` — the Plot Grid columns
Ordered `[{id, title, color?}]` (edited in Plan → **Grid**). Array order = column order. Like acts/chapters, membership is by **title**: a scene joins a plotline via its `plotlines` string array, and the grid's cells derive entirely from scene data. `id` is a stable string minted at creation so `color` survives a rename (renaming a plotline rewrites every member scene's tag). Scene tags with no matching entry render as orphan "ghost" columns — adoptable, never silently dropped.

### `inkswell.revisions` — invisible-revision decision log
Array of `{id, text, scene: string|null, status, created, type?, priority?}`.
- `status`: `pending` · `applied`
- `type`: `continuity` (default if absent) · `plot-hole` · `rewrite` · `character` · `research` · `new-scene` — `research` and `new-scene` are **legacy as of 1.8**: still read, displayed, filtered, and preserved on edit, but no longer offered when logging a new decision (that work is directed to `[RESEARCH: ]` / `[SCENE: ]` prose markers)
- `priority`: `low` · `med` · `high` — **legacy as of 1.8**: still read, displayed as a badge, and preserved on edit, but no longer offered when logging a decision (a rank never changes behavior in a prose-order revision pass)

### `inkswell.revisionChecklist` — project Story/Page checklists
`story` and `page`, each a map of `checkpointId → {done?: boolean, note?: string}`. Ids are the shipped ones below or custom ids from `settings.listOverrides` (`st-…` for story, `pr-…` for page items; custom page groups are `pg-…`, §E.1); unknown ids are preserved and ignored.
- **Story IDs (18):** `structure` `startsRight` `reveals` `heroGoals` `conflict` `stakes` `tension` `believable` `researched` `backstory` `heroComplex` `heroTransforms` `sideCharsPurpose` `sideCharsMemorable` `subplots` `worldFleshed` `worldImmersive` `consistent`
- **Page IDs (32),** grouped: *necessity* (`telling` `overDescribing` `preempting` `internalQuestions` `adverbs`) · *paragraphs* (`repetitiveStructure` `overChoreographed` `purpleProse` `overusedMetaphor` `passiveVoice`) · *dialogue* (`tagOverload` `repetitiveDialogue` `flashyTags` `dialogueAdverbs` `unrealisticDialogue` `unnecessaryDialogue` `disjointedDialogue`) · *words* (`overusedWords` `echoes` `redundantWords` `intensifiers` `mitigators` `filterWords` `weakWords` `nonSpecificWords` `cliches` `researchWords`) · *consistency* (`namesConsistent` `descriptionsConsistent` `actionsConsistent` `referencesConsistent` `formattingConsistent`)

### `inkswell.arcTracked` — tracked characters
`string[]` of character wikilinks (rename-safe) shown in the arc grid.

### `inkswell.styleSheet` — consistency style sheet
`entries`: array of `{id, canonical, variants: string[], kind, note?}`.
- `kind`: `spelling` · `name` · `term` · `number` · `format`

### `inkswell.publishing` — self-publishing manager
Persisted with a deep-merge so sibling `inkswell` keys are never clobbered. Sub-objects:
- **`checklist`** — `{phaseId: {taskId: {done?, date?, notes?}}}`. Shipped phases/tasks (source of truth: `src/publishing/checklist-def.ts`): `writing`(draft) · `editing`(selfEdit, critique, beta, preflight, hireEditor, incorporate) · `foundational`(genre, targetReader, authorName, business, budget) · `building`(metadata, formats, frontMatter, backMatter) · `cover`(…) · `formatting`(…) · `prepare`(…) · `publishing`(accounts, upload, proof, approve, submit) · `marketingFoundations`(…) · `marketing`(…). Custom phases (`pg-…`) and tasks (`pt-…`) from `settings.listOverrides.publishing` (§E.1) store state under the same shape; unknown ids are preserved and ignored.
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
| `codex` | string | Category / discovery marker: a built-in id (`character` · `location` · `world` · `faction` · `item` · `event` · `concept`) or a user-defined custom-type slug (`/^[a-z][a-z0-9-]*$/`) |
| `aliases` | string[] | Obsidian-native; used by mention auto-detect |
| `parent` | wikilink | Parent entity (nested locations → world, etc.) |
| `image` | string | Vault path to an image shown as the entry's portrait in the Codex panel (since 1.15). Written as a plain path; `[[img.png]]`, `![[img.png]]`, and `![alt](img.png)` are also accepted on read and resolve relative to the entry like any Obsidian link. Uploads land where Obsidian's "Default location for new attachments" points; removing only clears the key, never the file. |
| `codex-series` | string | Scope: visible only to books whose `inkswell.series.name` matches. Wins over `codex-project`. |
| `codex-project` | wikilink \| wikilink[] | Scope: visible to the whole STORY whose index note this links to — the link may name any draft of the story (new writes always name the base draft). A book is named by its index-note **basename** (`[[Novel]]`); since 1.18, when another story's index note shares that basename (Longform's `Index.md` habit), new writes use the index **path without `.md`** (`[[Books/B/Index]]`) so the books stay distinct. Readers accept both forms, case-insensitively; a legacy bare basename shared by several books keeps matching all of them (`bookMatches` / `projectKey`, `src/codex/codex-scope.ts`). Since 1.17 it may also be a **list** of such links: the entity is visible to every listed story (a character in books 2 and 3 of a series, but not the rest). One book is always written as the plain link (byte-identical to 1.16 output); two or more as a YAML list. Pre-1.17 readers treat a list as global. |

**Scope** (`codex-series` / `codex-project`): at most one is set. Neither = **global** (shared across every project — the default and back-compatible state). An entity is visible from a book when it is global, its `codex-project` names **any draft of that book's story** (for any of its listed books) (the codex describes the story, not one draft), or its `codex-series` is that book's series. New entries inherit the active project's scope (its series if any, else the story's **base draft**); a legacy value naming a non-base draft keeps working and is normalized the next time the user re-picks the scope in the dropdown. Note the story rule's blast radius: two unrelated projects sharing one `longform.title` are one story everywhere (cover, goals, publishing) — the codex now follows the same rule. Resolution + visibility logic: `src/codex/codex-scope.ts`.

**Template-introduced keys.** When a codex template note (`<baseFolder>/Templates/<Label>.md`) is present, new entries are scaffolded from it, so a note may carry additional **user-authored** frontmatter — most commonly Obsidian-native `tags` — that Inkswell preserves but does not manage or read. On creation Inkswell force-sets `codex` and scope over whatever the template declared, and strips `codex-fields` (below); everything else is the user's. Source: `src/codex/codex-template.ts`, `createEntity` in `src/codex/codex-store.ts`.

Per-category profile fields are flat top-level keys, written by the profile editor. Every shipped set (and the generic one) starts `aliases`, `image`, then: **Character:** `role` `function` `memorableTrait` `age` `gender` `occupation` `traits` `motivation` `flaw` `appearance` `backstory` `arc` `relationships[]`. **Location:** `type` `parent` `region` `climate` `population` `atmosphere` `significance` `history`. **World:** `geography` `culture` `politics` `magicTech` `religion` `economy` `history`. **Faction:** `type` `leadership[]` `size` `territory[]` `goal` `allies[]` `enemies[]`. **Item:** `type` `owner` `significance`. **Event:** `date` `participants[]` `outcome`. **Concept:** `type` `rules` `limitations` `significance`. (Fields ending `[]` are wikilink arrays; the rest are strings.) A **labeled** link array — the built-in `relationships[]`, or any `links:…:labeled` template field (D.1) — may carry a per-link label in the wikilink **alias** slot: `[[Anna|sister]]`. The target is still the entity name (`linkTarget` strips the alias), so scope, mention detection, and "Appears in" are unaffected; an unlabeled `[[Anna]]` in the same array is fine. No separate key is written (since 1.15).

### D.1 Codex template note — `codex-fields` (since 1.15)

A key read from the type's **template note only** (`<baseFolder>/Templates/<Label>.md`), never from entity notes (`createEntity` deletes it from the scaffold). When present and non-empty it **replaces** the shipped field list for that type in the Codex panel: `aliases` always first, then the listed keys in order. Absent/empty/unparseable → the shipped list above (so templates generated before 1.15 change nothing).

| Shape | Example | Meaning |
|-------|---------|---------|
| list of keys | `codex-fields: [species, birthday, motivation]` | each key a field; type inferred |
| key → type map | `codex-fields: {species: text, history: textarea, allies: "links:faction", home: "link:location"}` | explicit types |
| list of one-key maps | `- species: text` | same as the map form |
| scalar | `codex-fields: species, birthday` | comma-separated keys |
| map with object values | `species: {type: text, label: "Species name"}` | explicit type **and** display label (since Customize) |

**Written by Customize → Codex types** as the map form (object values only where a field has its own label; `null` for "no hint"). The first in-app edit rewrites a hand-authored list/scalar spec into that form (same meaning). *Reset to shipped fields* deletes the key; entries' frontmatter is never touched.

Types: `text` (default) · `textarea` · `number` (a bare YAML number — the panel writes a JS number, and reads a quoted numeric string as a number too; a non-numeric value shows empty and is left untouched until the field is edited; since 1.17) · `list` (string array — bare numbers in the list are read as their string form) · `image` (vault path, rendered as the portrait) · `links[:<type id>][:labeled]` (wikilink array, optionally restricted to one codex type; `:labeled` lets each link carry an alias-stored label, see above) · `link[:<type id>]` (single wikilink). A key naming a shipped field (any category's) reuses that field's label/type/picker unless a type is given; unknown keys are `text` with a label derived from the key (`birthDate` → "Birth date"). Reserved and skipped: `codex`, `codex-series`, `codex-project`, `codex-fields`, `aliases`. Values the panel writes follow the type: strings for `text`/`textarea`/`link`, numbers for `number`, string arrays for `list`/`links`. Frontmatter keys not in the resolved list are never touched. Source: `parseFieldSpec`/`profileFields` in `src/codex/profile-schema.ts`, `resolveProfileFields` in `src/codex/codex-profile.ts`.

**Custom codex types** (Customize → Codex types) are persisted in the plugin's local `data.json` as `settings.customCategories` (`{id, label, plural, icon}`; normalized on load by `normalizeCustomCategories` in `src/codex/types.ts`). Their entries — and any entity whose `codex:` value matches **no** known type — use the generic profile keys: `type` `description` `significance` `related[]` (plus the shared `aliases`), unless their template declares `codex-fields`. Discovery is category-agnostic: an unrecognized `codex:` value is **never dropped**; the Codex panel shows it under "Uncategorized". Deleting a custom type touches no notes.

**Renamed built-in types** (Customize → Codex types, since 1.15) are persisted in `data.json` as `settings.categoryOverrides` — `{ [builtinId]: {label?, plural?, icon?} }`, normalized on load by `normalizeCategoryOverrides`. Only the display changes: the `codex:` id in notes is untouched, and template resolution tries `<new label>.md` first, then the shipped `<Label>.md` (unless another type now carries that label). An override label may not equal another built-in's shipped label, so shipped names are always a safe fallback.

---

## E. Plugin-local data (not in any vault note)

For completeness: writing history & baselines, daily word counts, streaks, sprint records, ideas inbox, active project, daily mood, and the "next up" breadcrumb live in the plugin's local `data.json`, **not** in vault frontmatter. They are intentionally outside this compatibility contract (machine-local, not synced as note content).

### E.1 List overrides — `settings.listOverrides` (Customize)

One optional entry per overridable list id, each a `ListOverride`: `{ hidden?: id[], hiddenGroups?: id[], labels?: {id: label}, order?: id[], added?: [{id, label, group?, …extras}], groups?: [{id, label}], extras?: {shippedId: {…changed extras}} }` (`extras` re-files a shipped prompt's phase/category or flips a shipped task's `optional`; only values differing from shipped are stored). Source: `src/lib/list-override.ts` (shape + `applyOverride`), `src/settings/overridable-lists.ts` (list ids, specs, `normalizeListOverrides` on load).

| List id | Shipped list | Custom item prefix | Adds? | Groups? |
|---------|--------------|--------------------|-------|---------|
| `audit.scene` | 14 scene checkpoints (`revScene`) | `sc` | yes | — |
| `audit.story` | 18 story checkpoints (`revisionChecklist.story`) | `st` | yes | — |
| `audit.page` | 32 prose checkpoints in 5 groups (`revisionChecklist.page`) | `pr` (groups `pg`) | yes | yes |
| `publishing` | the publishing checklist (`inkswell.publishing.checklist`) | `pt` (phases `pg`) | yes (`optional?` extra) | yes |
| `prompts` | writing prompts (ids = `p` + FNV-1a of `phase\|category\|text`) | `wp` | yes (`phase`, `category`) | — |
| `scene.status` | the six statuses | — | **no** | — |

Invariants: hiding never touches stored state and hidden items count toward nothing; renames keep the id; custom ids are minted (`newListItemId`), never derived from labels; stale ids in frontmatter are preserved and ignored; reset = delete the list's key. Frontmatter keys above accept custom ids additively — no existing key changes meaning.

---

## Backward-compatibility allowances

- **`revArc`** accepts both the current wikilinked-list form and a legacy plain-name-keyed object; always re-emitted as the wikilinked list.
- **`arcTracked`** accepts plain names or wikilinks; always re-emitted as wikilinks.
- **`revisions[].type`** absent in pre-1.0 entries reads as `continuity`.
- **Sprint records** treat `elapsedSec` as optional (older records stored only `durationSec`).
