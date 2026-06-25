---
title: Inkswell — Manual QA Checklist
version: 0.17.0
purpose: End-to-end live QA pass gating the 1.0 cut
---

# Inkswell — Manual QA Checklist (v0.17.0)

The plugin's **pure logic is unit-tested** (`npm test`); this doc is its **complement** —
the *wiring, real-Obsidian behavior, visual, and external-tool* checks that tests can't reach.
Tasks are formatted for the [Tasks](https://publish.obsidian.md/tasks/) plugin: `- [ ]`
checkboxes, `#qa/<area>` tags for filtering, and ⏫ = data-integrity / corruption risk.

> [!info] Already covered by `npm test` — don't re-verify the math by hand
> Grouping/tally logic (board columns by status/act/POV, POV wikilink stripping), compile
> assembly + chapter grouping, the pre-export lint rules, sprint stats & WPM, writing-history
> series, goals/streaks/heatmap-levels/read-time, prompt selection, series grouping, scene-tree
> ops, codex profile schema, draft serialization, word count, comment extraction, leaf-reuse
> rule. The checks below assume that logic works and focus on **whether the UI is wired to it**.

> [!warning] The core invariant
> Inkswell writes **only frontmatter** via `processFrontMatter` and **never touches a
> scene's prose body** — the *one* exception is the Write panel's editor, which edits the
> body but must preserve frontmatter. Every ⏫ task below is a check against violating this.

How to use: open a real test vault with at least one multi-scene Longform project (and
ideally a second project + a few codex entries). Work top to bottom. File a note next to
any task that fails.

---
## Issues found
- No visible/blinking cursor in Write. Can't see where I'm going to be typing. **(open)**
- ~~The Board view still opens a random tab when clicking on a scene.~~ **(v0.17: Board clicks now open the Edit-scene modal, not a random tab.)** Possible enhancement now that Todos has the jump-to-Write + flash infra: make a Board card optionally open the scene in Write.
- ~~In the Beats and Board views of Plan mode, I should be able to click a button to create a new Scene~~ **(done v0.17: "New scene" in the Board toolbar and "+ new scene" per beat — plus "+ scene" per project on Home.)**
- "Scaffold scenes" is a little inaccurate, as these are beats, not scenes. Many beats will contain numerous scenes. We need to revisit this and think of improvements. **(open)**
- 
## 0. Install & load #qa/setup

- [x] Plugin loads with no errors in the developer console (Ctrl+Shift+I) #qa/setup
- [x] The Inkswell ribbon icon / command opens a single tab in the main content area #qa/setup
- [ ] Left icon rail shows the pipeline destinations **Home · Plan · Write · Revise · Publish**, then a separated meta cluster **Codex · Track · Sprint** (v0.17 moved Codex out of Plan to a top-level destination) #qa/setup
- [x] ⏫ Opening Inkswell from multiple entry points never creates a second host tab (one-tab invariant) #qa/setup
- [x] ⏫ An existing Longform project (with a `longform` frontmatter key) loads drop-in with its scenes intact #qa/setup
- [x] Switching destinations preserves each panel's own state (sub-tab, selected project) #qa/setup
- [x] Remembered sub-tab per destination survives leaving and returning #qa/setup

---

## 1. Home — projects, scenes, ideas, series #qa/home

### Project list & scene tree
- [ ] Home lists every discovered project; empty vault shows the "add a `longform` key" hint #qa/home
- [ ] Each multi-scene project shows its scene tree; nesting (indent) renders with correct left padding #qa/home
- [ ] ⏫ The per-project **"+ scene"** button (v0.17) prompts for a title, creates the scene file (`status: idea`) + appends it to the index, and selects it in the Inspector; a duplicate name is refused with a notice #qa/v017
- [ ] Word count appears per project and per scene when "Show word counts" is on #qa/home
- [ ] Clicking a scene opens it in a separate editor tab (not replacing the host tab) #qa/home
- [x] ⏫ Clicking a scene updates the Scene Details (Inspector) pane **immediately** — no tab-switch needed (v0.15.0 regression fix; `file-open` event) #qa/home
- [x] Repeated scene clicks reuse one (non-pinned) editor leaf rather than piling up tabs #qa/home
- [x] ⏫ Clicking a scene never hijacks a **pinned** tab; opens in a non-pinned tab or a new one (v0.14.0) #qa/home
- [ ] A scene listed in the index but missing on disk renders as "missing" (greyed/flagged) #qa/home
- [ ] ⏫ Drag-reordering a scene rewrites only the index note's `scenes` order; scene bodies untouched #qa/home
- [ ] ⏫ Drag only reorders within the same project (cross-project drops are rejected) #qa/home
- [ ] Right-click scene → Indent (nest) updates nesting in the index #qa/home
- [ ] Right-click scene → Unindent updates nesting in the index #qa/home
- [x] ⏫ Right-click scene → Edit synopsis… writes `synopsis` to the scene's frontmatter only #qa/home
- [x] ⏫ Right-click scene → Rename… renames the file and updates the index entry (wikilinks update) #qa/home
- [ ] Right-click scene → Remove from project (keep file) drops it from the index but leaves the file #qa/home
- [ ] ⏫ Right-click scene → Delete scene trashes the file and removes it from the index #qa/home

### Ideas inbox
- [ ] Typing an idea + Enter in the Home capture field adds it to the list #qa/home
- [ ] "Quick capture an idea" command opens the capture dialog and stores the idea #qa/home
- [ ] Star toggles pin; pinned ideas sort to the top #qa/home
- [ ] × deletes an idea #qa/home
- [ ] ⏫ Ideas persist across Obsidian restart (stored in plugin `data.json`, not the vault) #qa/home
- [ ] Empty / whitespace-only input is silently rejected #qa/home

### Series mode (v0.13.0) #qa/series
- [ ] Right-click a project header → "Add to series…" prompts for a name and groups the book #qa/series
- [ ] Two projects given the same series name render under one series header #qa/series
- [ ] "Set book number…" sets order; books sort by number, unnumbered ones after, then by title #qa/series
- [ ] Book number prefix (`1.`, `2.`) shows on the project title within a series #qa/series
- [ ] Series header shows book count + aggregate word total #qa/series
- [ ] When ≥1 book has a word target, the series header shows combined `words / target (%)` #qa/series
- [ ] "Change series…" moves a book to a different series #qa/series
- [ ] "Remove from series" returns the book to the standalone list #qa/series
- [x] ⏫ Series membership persists in `inkswell.series` frontmatter and survives reload #qa/series
- [x] ⏫ Removing the last series field drops the `inkswell` key cleanly (no empty `inkswell:` left behind) #qa/series
- [ ] A blank series name is treated as standalone (not an empty-named group) #qa/series
- [ ] Standalone projects still render below series groups #qa/series

---

## 2. Plan — Overview, Beats, Board #qa/plan

- [ ] Plan sub-tab bar shows **Overview · Beats · Board** (v0.17 moved Codex out to its own rail destination); opening Plan lands on **Overview** by default #qa/v017

### Overview (Plan → Overview)
- [ ] ⏫ Logline / Theme / Genre / Audience inputs persist to `inkswell.overview` on the index note and reload #qa/v017
- [ ] ⏫ Typing in Synopsis / Plot groundwork / Act I–III creates the planning note `"<Title> — Plan.md"` (sibling of the index) with those `##` sections, and `overview.planningNote` records its path #qa/v017
- [ ] ⏫ The planning note carries **no** `longform` key — it is **not** detected as a project #qa/v017
- [ ] Editing the planning note's sections in Obsidian round-trips back into the Overview textareas #qa/v017
- [ ] "Open planning note" opens it in a real editor tab #qa/v017

### Beats (Plan → Beats)
- [ ] Template dropdown lists all 7: Save the Cat, Three-Act, Hero's Journey, Seven-Point, Story Circle, Romancing the Beat, 27-Chapter #qa/plan
- [ ] Switching template re-renders the beat list #qa/plan
- [x] ⏫ Switching template preserves notes/scene-links for beats that exist in both; drops the rest #qa/plan
- [ ] Re-selecting the same template is a no-op (no flicker, no frontmatter write) #qa/plan
- [ ] Progress bar shows `{done}/{total} beats done · {started} started` and fills proportionally #qa/plan
- [ ] ⏫ Checking "Mark beat done" writes `inkswell.beats.assignments[id].done`; unchecking deletes it #qa/plan
- [ ] ⏫ Typing in a beat note textarea persists to `inkswell.beats.assignments[id].note`; clearing deletes it #qa/plan
- [ ] Adding a scene via ".. add scene" links it; the chip appears; × removes it #qa/plan
- [ ] A single beat can hold multiple scene chips (multi-scene beats) #qa/plan
- [ ] "Scaffold scenes" creates one file per beat with `status: idea` + `synopsis` from the blurb (v0.14.0) #qa/plan
- [ ] ⏫ Scaffold is safe to re-run: existing scene files are skipped, only missing ones created #qa/plan
- [ ] Scaffold reports the count ("Created N placeholder scene(s)." / "No new scenes to create.") #qa/plan
- [ ] Beat note textarea keeps focus across the store refresh (no focus loss while typing) #qa/plan
- [ ] ⏫ "+ new scene" on a beat (v0.17) creates a scene (synopsis seeded from the beat blurb) **and** attaches it to that beat as a chip — the chip resolves to a real file immediately #qa/v017
- [ ] Beat scene chips show a status badge and a right-click menu (Open / Edit / Rename / Delete), matching the Board (v0.17) #qa/v017
- [ ] Project picker switches beats per project and restores state on switch-back #qa/plan

### Board (Plan → Board)
- [ ] "Group by" offers Status / Act / POV; each renders the expected columns incl. the trailing "None" column, with POV/Act labels showing clean names (not `[[wikilinks]]`) — *(column-building logic is unit-tested; just confirm the board is wired to it)* #qa/plan
- [ ] ⏫ Dragging a card to a column sets that field (`status`/`act`/`pov`) in the scene's frontmatter only #qa/plan
- [ ] ⏫ Dropping on a "No …" column clears the field #qa/plan
- [ ] ⏫ "New scene" in the Board toolbar (v0.17) prompts for a title and creates a scene (`status: idea`) in the project #qa/v017
- [ ] Card shows title, synopsis, and a left-border tint from the scene's `color` #qa/plan
- [ ] Clicking a card opens the Edit-scene modal (v0.17: no longer a random tab) #qa/plan
- [ ] Right-click card shows the scene context menu #qa/plan
- [ ] Scenes with missing files don't appear on the board (no crash) #qa/plan
- [ ] Editing a scene's status outside the board refreshes the board on next store update #qa/plan
- [ ] Single-scene-only vault shows the appropriate "no board" empty state #qa/plan

---

## 2b. Codex — story bible (top-level rail destination) #qa/codex

- [ ] Codex opens from the **rail meta cluster** (just above Track), not from Plan (v0.17 relocation); its content/behavior is unchanged #qa/v017

### Browser & entities
- [ ] "New" + category creates an entity note with `codex: <category>` frontmatter #qa/codex
- [ ] All 7 categories selectable: Character, Location, World, Faction, Item, Event, Concept #qa/codex
- [ ] Search filters by name and alias #qa/codex
- [ ] Entities group under category headers with counts #qa/codex
- [ ] Selecting an entity opens the profile editor (master-detail) on the right #qa/codex
- [ ] "Open note" jumps to the entity note in Obsidian's editor #qa/codex
- [ ] ⏫ Right-click → Rename… renames the file and updates wikilinks #qa/codex
- [ ] ⏫ Right-click → Delete trashes the entity note #qa/codex
- [ ] Parent-linked entities (location → world) render indented in the list #qa/codex

### Codex profiles (v0.12.0 acceptance) #qa/codex
- [ ] Each category shows its own field set (Character: role/age/traits/motivation/flaw/arc/relationships…) #qa/codex
- [ ] Text and textarea fields accept input #qa/codex
- [ ] Aliases list field: type + Enter adds a chip; × removes it #qa/codex
- [ ] ⏫ Single-link picker (e.g. Item → owner, Location → World) writes one wikilink to frontmatter #qa/codex
- [ ] ⏫ Multi-link picker (e.g. relationships, allies, participants) adds/removes wikilink chips #qa/codex
- [ ] Link pickers are scoped to the right category (relationships → characters, allies → factions, etc.) #qa/codex
- [ ] Link picker excludes the entity itself and already-linked entries #qa/codex
- [ ] Picker shows the "No <category\> entries in codex" hint when there are no candidates #qa/codex
- [ ] "Appears in" lists scenes whose `characters`/`location` frontmatter references this entity #qa/codex
- [ ] Clicking an "Appears in" chip opens that scene #qa/codex
- [ ] ⏫ Fill a Character's role/traits/arc → reload Obsidian → fields persist in the note's frontmatter #qa/codex
- [ ] ⏫ Editing a profile preserves the freeform note body and any frontmatter keys not in the schema #qa/codex
- [ ] ⏫ Clearing a field removes its frontmatter key (no lingering empty keys) #qa/codex
- [ ] ⏫ A Dataview query over `codex: character` can read the structured fields (e.g. `role`, `arc`) #qa/codex
- [ ] World category: create a World, fill geography/culture/magicTech; a Location can link to it via World/parent #qa/codex
- [ ] Renaming an entity referenced by a profile link updates the wikilink (no broken link) #qa/codex

---

## 3. Write — in-plugin manuscript editor #qa/write

- [ ] Project dropdown shown only when 2+ multi-scene projects exist #qa/write
- [ ] No-project state shows "No multi-scene project yet. Create one from Home." #qa/write
- [ ] Navigator lists scenes; clicking one selects it and highlights the row #qa/write
- [ ] Selected scene's body loads into the editable textarea #qa/write
- [ ] Status badge (first letter) shows on scenes that have a `status` #qa/write
- [ ] Live word count in the topbar updates on each keystroke #qa/write
- [ ] ⏫ Editing the body and blurring (Tab away) writes the body to disk, preserving frontmatter #qa/write
- [ ] ⏫ Switching scenes/projects saves the current scene first (no lost edits) #qa/write
- [ ] ⏫ Closing/unmounting the panel saves pending edits #qa/write
- [ ] ⏫ A scene with Windows (`\r\n`) line endings round-trips without corrupting frontmatter #qa/write
- [ ] ⏫ A scene with no frontmatter saves correctly (body preserved, no garbage prepended) #qa/write
- [ ] Saving identical content twice does not rewrite the file (no spurious mtime churn) #qa/write
- [ ] "Open in tab" opens the scene in a real Obsidian editor #qa/write
- [ ] Empty state (no scene selected) shows a writing prompt card #qa/write
- [ ] "New prompt" shows a different prompt (never the same one twice in a row) #qa/write
- [ ] Inspector edits to frontmatter aren't clobbered by a subsequent body save #qa/write

---

## 4. Track — goals, habit, streak, heatmap, structure, targets #qa/track

### Rings & habit
- [ ] Track shows Today / Week / Month rings with percentage and word counts #qa/track
- [ ] Rings reflect the current `dailyWordGoal` / `weeklyWordGoal` / `monthlyWordGoal` settings #qa/track
- [ ] Habit row shows `X / Y days this week (≥ Z words/day)` matching the habit settings #qa/track
- [ ] Writing new words in a scene increases today's count after the ~2s debounce #qa/track
- [ ] ⏫ Deleting words registers a negative delta (counts down), not a spurious gain #qa/track
- [ ] ⏫ Opening a pre-existing file does not retroactively count its words as "written today" (baseline) #qa/track
- [ ] ⏫ Daily counts persist across restart (baselines restored from `data.json`) #qa/track

### Streak, lifetime, heatmap
- [ ] Streak row shows current + longest streak #qa/track
- [ ] Lifetime row shows total words, days written, and best day (best day omitted if none) #qa/track
- [ ] Activity heatmap renders 26 weeks; cell hover shows `{date}: {words} words` #qa/track
- [ ] Milestone banner shows the next unmet milestone, or "All milestones reached 🎉" #qa/track

### Structure & targets
- [ ] "By status" breakdown tallies scenes across idea/outlined/draft/written/revised/final #qa/track
- [ ] "By act" breakdown tallies scenes by their `act` value #qa/track
- [ ] Project dropdown switches the structure breakdown when 2+ multi-scene projects exist #qa/track
- [ ] Scenes with missing files are tolerated in the tally (no crash) #qa/track
- [ ] "Set word target for the active project" command saves `inkswell.goals.target` #qa/track
- [ ] ⏫ Setting target to 0 clears it; non-zero persists across reload #qa/track
- [ ] Project targets section shows progress bar + ETA (`~N days at M/day`) or "no recent writing" #qa/track
- [ ] "Target met 🎉" shows once words ≥ target #qa/track
- [ ] No-targets state shows the "Use the 'Set word target' command" hint #qa/track

---

## 5. Revise — Log, Todos, Analysis #qa/revise

*(Sub-tab set is **Audit · Log · Todos · Analysis**; Audit + Todos detailed checks live in §7d.)*

### Revision log (Revise → Log)
- [ ] "Log a revision decision" command opens the dialog; selected editor text pre-fills the field #qa/revise
- [ ] Anchor dropdown offers "This scene: {title}" and "Whole project" when in a scene #qa/revise
- [ ] ⏫ Logging a decision appends to `inkswell.revisions` on the index note (never the scene body) #qa/revise
- [ ] Empty decision text shows "Enter a decision first." and does not save #qa/revise
- [ ] Active file outside any project shows the "isn't part of an Inkswell project" notice #qa/revise
- [ ] Log viewer groups Pending and (when "Show applied" is on) Applied with counts #qa/revise
- [ ] Scene filter narrows the list to a scene / project-wide / all #qa/revise
- [ ] ⏫ Toggling a decision's checkbox flips pending↔applied and persists #qa/revise
- [ ] Right-click → Delete removes a decision and persists #qa/revise
- [ ] ⏫ Editing a decision (v0.17: click its text, or right-click → Edit…) reopens the modal pre-filled and updates **in place** — same `id`, `status`/`created` preserved, no duplicate #qa/v017
- [ ] "+ Log a decision" opens the dialog anchored to the current scene filter #qa/revise
- [ ] Empty state shows "No decisions yet…" #qa/revise

### Analysis (Revise → Analysis)
- [ ] Readability shows FK grade + reading ease + words/sentences/avg #qa/revise
- [ ] "Most-used words" shows top ~20 non-stopwords with counts #qa/revise
- [ ] "Echoes" shows repeated 3-word phrases (≥2 occurrences) or the "none found" message #qa/revise
- [ ] Project dropdown re-runs analysis on switch #qa/revise
- [ ] All-empty scenes show "No scene text to analyze." #qa/revise
- [ ] Markdown (links/bold/code) is stripped before analysis #qa/revise

---

## 6. Publish — compile pipeline & step editor #qa/publish

- [ ] Format dropdown offers Markdown / HTML / Word / PDF / EPUB #qa/publish
- [ ] ⏫ Selecting md/HTML saves `inkswell.compile.format`; selecting Word/PDF/EPUB saves `format: pandoc` + `pandoc:{…}` #qa/publish
- [ ] Scene steps toggle: strip frontmatter / remove \%\% comments / prepend title heading #qa/publish
- [ ] Manuscript step toggle: collapse excess blank lines #qa/publish
- [ ] ⏫ Toggled steps persist to `inkswell.compile.sceneSteps` / `manuscriptSteps` and reload correctly #qa/publish
- [ ] Output file name field saves `targetBasename`; empty defaults to "manuscript" #qa/publish
- [ ] ⏫ "Compile" (Markdown) writes the assembled manuscript to `{folder}/{basename}.md` #qa/publish
- [ ] ⏫ Compiled output reflects the enabled steps (frontmatter stripped, comments removed, titles prepended) #qa/publish
- [ ] ⏫ Compile never modifies the source scene files #qa/publish
- [ ] HTML compile renders via Obsidian and wraps in an HTML skeleton #qa/publish
- [ ] No-content project shows "Compile failed: No scenes with content to compile." #qa/publish
- [ ] Pandoc format without pandoc installed shows a clear error (not a silent failure) #qa/publish
- [ ] Pandoc format on mobile shows the "requires a local (desktop) vault" error #qa/publish
- [ ] Project picker switches the compile config per project #qa/publish
- [ ] "Compile the active project" command compiles the active file's project #qa/publish

---

## 7. Settings & commands #qa/settings

- [ ] Settings → Inkswell exposes: default compile format, show word counts, scene heading level #qa/settings
- [ ] Goal settings (daily/weekly/monthly) clamp to range and fall back to defaults on bad input #qa/settings
- [ ] Habit settings (days/week 1–7, min words) clamp correctly #qa/settings
- [ ] Streak threshold and codex folder settings save #qa/settings
- [ ] ⏫ Changing "Codex folder" routes new entities to the right folder #qa/settings
- [ ] "Show word counts" toggle immediately refreshes the explorer #qa/settings
- [ ] ⏫ All settings persist across restart #qa/settings
- [ ] Each command opens/reveals the single Inkswell tab in the correct mode (Home/Plan/Write/Track/Revise/Publish) #qa/settings
- [ ] Conditional commands (end sprint / cancel sprint / set target) appear only when applicable #qa/settings

### Sprints
- [ ] "Start a writing sprint" opens the modal (duration + optional word goal) #qa/settings
- [ ] Topbar shows live `Sprint: {words}w · {sec}s` countdown #qa/settings
- [ ] Sprint auto-finishes at timeout and is logged #qa/settings
- [ ] "End the current sprint now" finishes + logs; "Cancel the current sprint" discards #qa/settings
- [ ] Starting a sprint while one runs shows "A sprint is already running." #qa/settings

---

## 7b. v0.14.0 QA-fix batch verification #qa/v014

### New project (#1)
- [ ] ⏫ Home "New project" button opens the modal; Create writes a valid `longform` index note #qa/v014
- [ ] "New project" command does the same from the palette #qa/v014
- [ ] New project appears on Home, becomes the active project, and its index note opens #qa/v014
- [ ] Scene folder default `/` puts scenes beside the index; a named subfolder is created #qa/v014
- [ ] Duplicate title in the same folder is refused with a notice (no overwrite) #qa/v014
- [ ] Write empty-state hint now points to the real "New project" action #qa/v014

### Global project selector + persistent header (#3)
- [ ] Header project dropdown is visible on every destination #qa/v014
- [ ] Switching the header updates Plan/Board/Write/Track/Revise/Publish to the same project #qa/v014
- [ ] Per-panel project dropdowns are gone (header is the single selector) #qa/v014
- [ ] ⏫ Active project persists across an Obsidian restart (data.json `activeProject`) #qa/v014
- [ ] Renaming/deleting the active project falls back to the first project (no crash) #qa/v014
- [ ] "Open revision log" from a scene switches the active project to that scene's project #qa/v014
- [ ] Switching project in Write saves the current scene and resets the editor (no stale file) #qa/v014

### Focus-loss fix (#13)
- [ ] ⏫ Typing in a Codex profile field no longer loses focus after the first keystroke #qa/v014
- [ ] ⏫ Tabbing between Codex fields keeps focus (no "click twice") #qa/v014
- [ ] ⏫ Creating a codex entry / adding a relationship refreshes the view immediately (no tab-switch needed) #qa/v014
- [ ] ⏫ Dragging a Board card / editing scene status refreshes panels immediately #qa/v014
- [ ] Adding a scene to the active project still refreshes the explorer/board (after blur if mid-type) #qa/v014
- [ ] Beat/compile/goal/series edits still re-render their panel after the write #qa/v014

### Edit scene modal (#8)
- [ ] "Edit scene…" appears in the explorer AND Board right-click menus #qa/v014
- [ ] ⏫ Editing status/POV/act/etc. in the modal writes the scene's frontmatter only (body untouched) #qa/v014
- [ ] The modal's fields match the Scene Inspector (shared form) #qa/v014

---

## 7c. v0.15.0 — writing aids, export tooling, Track overhaul #qa/v015

### Writing prompts (tagged system)
- [ ] Write topbar "Prompt" button opens the prompt modal; "Use this prompt" shows the chosen text next to the button (truncated, click reopens) #qa/v015
- [ ] Prompt modal filters by **phase** (Drafting / Revising) and **category**; both persist between opens #qa/v015
- [ ] A `{pov}`-token prompt fills in the active scene's POV; with no POV scene open, no raw `{pov}` token is ever shown #qa/v015
- [ ] Sprint controls and the prompt are clearly separated in the topbar (divider); a long prompt truncates instead of colliding #qa/v015

### POV field (datalist)
- [ ] POV field (Inspector + Edit-scene modal) suggests codex **character** names as you type #qa/v015
- [ ] It still accepts free text (e.g. "Omniscient", "First person") — suggestions don't constrain it #qa/v015

### Write editor UX
- [ ] Editor is a wider centered column (~90ch), no Preview toggle, no awkward side gutters #qa/v015
- [ ] ⏫ Type + blur saves the body, frontmatter preserved; scene-switch saves first; "Open in tab" works #qa/v015

### Publish — export tooling
- [ ] "Group scenes into chapters" step: scenes with the same `chapter` get ONE chapter heading + scene-break glyph between scenes; chapterless scenes pass through unheaded #qa/v015
- [ ] ⏫ Enabling both `prepend-title` and `group-by-chapter` is avoided (they double-up) — pick one #qa/v015
- [ ] Scene-separator preset dropdown changes the glyph between scenes in compiled output #qa/v015
- [ ] "Check manuscript before export" flags tabs / double-spaces / raw HTML / manual page breaks / mixed scene-break markers / empty scenes; clean manuscript reports "Ready to export" #qa/v015
- [ ] Pre-export findings list affected scenes as clickable chips that open the scene #qa/v015
- [ ] "Generate reference doc" (desktop/pandoc) writes `reference.docx` beside the project and adds `--reference-doc=` to the config; a subsequent DOCX compile applies its styles #qa/v015
- [ ] ⏫ The generated `reference.docx` opens in Word/LibreOffice (valid file from the binary capture) #qa/v015
- [ ] Switching pandoc subtype (docx→pdf) preserves the reference-doc arg #qa/v015

### Track overhaul
- [ ] Overview cards show the active project's Words / Scenes / Read time + vault-wide Today; switching the header project updates Words/Scenes/Read time #qa/v015
- [ ] ⏫ Sections (Goals / Activity / Sprints / Structure / Targets) collapse on header click and **stay collapsed across re-renders** (write words elsewhere to trigger one) #qa/v015
- [ ] Writing-history chart: 7d / 30d / 90d / All toggle updates the bars + start/end date caption; matches the heatmap for recent days #qa/v015
- [ ] Sprints section shows totals, avg + peak WPM, goal hit-rate, and a recent-sprints list; empty state before any sprint #qa/v015
- [ ] ⏫ End a sprint **early** → its WPM reflects actual elapsed time, not the configured duration #qa/v015

---

## 7d. v0.16.0 — writing-method feature set (Audit toolkit, fast-drafting aids, self-publishing manager) #qa/v016

### Sub-tab wiring
- [ ] Revise sub-tab bar shows **Audit · Log · Todos · Analysis**, and opening Revise lands on **Audit** by default #qa/v016
- [ ] Publish sub-tab bar shows **Compile · Checklist · Launch**, defaulting to Compile #qa/v016
- [ ] Remembered sub-tab per phase survives leaving and returning (e.g. leave Revise on Todos, come back to Todos) #qa/v016

### Write — to-do markers & capture
- [ ] Typing `[TODO: …]`, `[RESEARCH: …]`, `[NOTE: …]`, `[DIALOGUE: …]`, `[SCENE: …]` highlights each as a distinct tinted chip; a bare `[TODO]` (no colon) also highlights #qa/v016
- [ ] ⏫ Retired markers — `%% … %%`, `@@ … @@`, `[TK]`, `[???]` — are **not** highlighted as to-dos #qa/v016
- [ ] ⏫ The cursor edits **inside** a token normally (tokens are not atomic) and emphasis inside `[DIALOGUE: *x*]` is **not** italicised #qa/v016
- [ ] Insert toolbar (TODO / Research / Note / Dialogue / Scene) inserts at the cursor; the keymap `Mod-Shift-T/R/N/D/S` does the same; cursor lands inside the colon form #qa/v016
- [ ] With text selected, inserting a marker **wraps** the selection as `[KIND: <selection>]` #qa/v016
- [ ] The command **"Insert a to-do marker…"** opens a type picker and inserts the chosen marker (only available when a scene editor is active) #qa/v016
- [ ] "Find to-dos" and "Log issue" buttons appear in the Write topbar only when a scene is selected #qa/v016
- [ ] ⏫ "Log issue" (and `Mod-Shift-L`) opens the decision modal anchored to the scene being written #qa/v016
- [ ] The "Next up" breadcrumb card saves on change and reappears next session #qa/v016

### Revise → Todos
- [ ] Lists every to-do marker across the project's scenes, grouped by scene, with kind-filter chips + counts #qa/v016
- [ ] Filtering by kind narrows the list; "All" restores it #qa/v016
- [ ] ⏫ Clicking a row jumps to **Write**, opens that scene, and scrolls to + briefly flashes the exact marker #qa/v016
- [ ] Clicking a scene header opens that scene in Write (no flash) #qa/v016
- [ ] ⏫ The sweep is read-only — it never modifies a scene #qa/v016
- [ ] Empty state shows the "drop a [TODO: …]…" hint when there are no to-dos #qa/v016

### Revise → Audit — per-scene checklist
- [ ] Summary line shows `Scenes audited X/N · Story a/18 · Page b/32` #qa/v016
- [ ] Each scene row shows a `done/14` badge; expanding it reveals the 14 checkpoints + a revision note #qa/v016
- [ ] ⏫ Ticking a checkpoint writes `revScene.<id>` to that **scene's** frontmatter; unticking removes it; the prose body is untouched #qa/v016
- [ ] The Scene Inspector's "Revision audit" `<details>` shows the same fields and writes the same keys (Home + Write) #qa/v016
- [ ] ⏫ Lift-out: setting a verdict (keep/cut/merge) + "if removed…" note persists (`revVerdict`/`revPurpose`); the verdict tag shows on the scene row #qa/v016
- [ ] Opening-type override (`revOpening`) overrides the heuristic for that scene #qa/v016
- [ ] ⏫ Per-character arc inputs (shown for the scene's linked characters) persist to `revArc` as a list of `{character: "[[link]]", internal, external}` #qa/v016
- [ ] Toggling a checkbox in the dashboard updates that row's badge without losing your place (open sections stay open) #qa/v016

### Revise → Audit — project checklists & diagnostics
- [ ] Story-level (18) and Page-level (32, grouped into 5 categories) render as checkboxes; a per-item note field appears once an item is checked #qa/v016
- [ ] ⏫ Checking an item writes `inkswell.revisionChecklist.story|page.<id>`; clearing drops the item, and an empty tier drops cleanly #qa/v016
- [ ] **Scene openings**: one type-chip per scene in reading order; runs of ≥2 same-type scenes are flagged; the "heuristic — overridable" caption is shown #qa/v016
- [ ] **Character arcs**: pick tracked characters from the codex; the grid shows per-scene state, shades flat stretches, and badges transforms/flat; tracked list persists to `inkswell.arcTracked` as wikilinks #qa/v016
- [ ] ⏫ **Rename safety**: rename a tracked character (Codex → Rename, or rename the note) → the `revArc` `character` links and `arcTracked` entries follow the rename; the arc grid still shows that character's data (not orphaned) #qa/v016
- [ ] **Side-character roster**: lists codex characters with function/goal/flaw/trait + "appears in N scenes"; flags missing fields and appears-once walk-ons #qa/v016
- [ ] **Style sheet**: add/remove entries (canonical / variants / kind); "Scan manuscript" lists deviations by scene; clicking a hit opens the scene #qa/v016
- [ ] ⏫ The style-sheet scan and the roster are read-only over scene bodies #qa/v016

### Revise → Analysis — composition
- [ ] A "Scene composition" section shows dialogue / interiority / narration %, plus per-scene balance flags, with an honest "heuristic" caption #qa/v016

### Revise → Log — typed & prioritized
- [ ] The log modal offers a **Type** dropdown (default *continuity*) and a **Priority** dropdown #qa/v016
- [ ] Rows show a type tag + priority dot; the toolbar **type filter** narrows the list #qa/v016
- [ ] ⏫ Pre-v0.16 entries with no `type` read as *continuity*; round-tripping (status flip, reload) preserves `type`/`priority` #qa/v016

### Track — pace, milestone, mood
- [ ] "Set word target…" modal now also captures **Deadline** and **Writing days/week** #qa/v016
- [ ] With a target **and** deadline, Project targets shows required-daily words + an ahead/on-track/behind verdict + days left #qa/v016
- [ ] With a target but **no** deadline, it shows the "Set a deadline (≈N weeks suggested)" hint #qa/v016
- [ ] The current **draft-milestone zone** label + note shows for a targeted project (e.g. "50% · Halfway") #qa/v016
- [ ] ⏫ Deadline + days/week persist to `inkswell.goals` and survive reload #qa/v016
- [ ] The Goals card has a **Mood today** selector; ⏫ a chosen value persists in `data.json` and reloads; leaving it blank records nothing #qa/v016

### Publish → Checklist & Metadata
- [ ] The checklist renders 9 phases as collapsible sections with `done/total` per phase; optional tasks are marked #qa/v016
- [ ] ⏫ Ticking a task / setting its date / typing notes persists under `inkswell.publishing.checklist.<phase>.<task>` #qa/v016
- [ ] Deep-link tasks ("Open Compile →") switch to the Compile sub-tab #qa/v016
- [ ] Metadata section: title/subtitle/series/tagline/blurb/genre/subgenres/target-reader/keywords/categories/formats; keyword field shows a 7–10 count hint; series title prefills from the project's series #qa/v016
- [ ] ⏫ Metadata edits persist under `inkswell.publishing.metadata` and reload #qa/v016

### Publish → Launch
- [ ] Pick a **release date** + **strategy** (short/medium/long) → a computed milestone list appears with date(s) and status badges (overdue/upcoming/future/done) #qa/v016
- [ ] ⏫ Ticking a milestone persists under `inkswell.publishing.launch.milestones`; the verify/deliver milestones stay manual (no platform calls) #qa/v016
- [ ] Budget tracker: add need/want rows with estimate/actual; the totals line sums correctly #qa/v016
- [ ] Cover-comp, Marketing, and ARC trackers add/edit/remove rows #qa/v016
- [ ] ⏫ Removing the last row of a tracker drops its sub-object cleanly (no empty `budget: {}` left behind) #qa/v016

### Data integrity — v0.16 keys
- [ ] ⏫ `persistPublishing` edits `inkswell.publishing` **without** clobbering sibling `inkswell` keys (series / compile / goals / beats / revisions / revisionChecklist / arcTracked / styleSheet) #qa/v016
- [ ] ⏫ Every new scene key (`revScene`, `revSceneNote`, `revPurpose`, `revVerdict`, `revOpening`, `revArc`) is written via `processFrontMatter` — the scene body stays byte-identical #qa/v016
- [ ] ⏫ After a full v0.16 pass + reload, all new persisted data survives: `revisionChecklist`, `arcTracked`, `styleSheet`, `publishing`, `goals.deadline/daysPerWeek`, and `data.json` `mood`/`nextUp` #qa/v016

---

## 8. Cross-cutting data integrity (the 1.0 gate) #qa/integrity

- [ ] ⏫ After exercising every panel, diff a scene file: its **body** is byte-identical except where the Write editor changed it #qa/integrity
- [ ] ⏫ No feature ever writes Inkswell data inside the `longform` key (only under `inkswell`) #qa/integrity
- [ ] ⏫ Frontmatter written by Inkswell is valid YAML and re-opens cleanly in Obsidian #qa/integrity
- [ ] ⏫ Reload the vault after a full pass — every persisted value (beats, codex profiles, series, targets, compile config, revisions, revision checklists, scene audits/arcs, style sheet, publishing) survives #qa/integrity
- [ ] ⏫ Editing a scene/index in another app while Inkswell is open doesn't cause a stale-overwrite #qa/integrity
- [ ] ⏫ A project with a large scene count (50+) loads and refreshes without noticeable lag #qa/integrity
- [ ] No uncaught exceptions in the console after a full pass #qa/integrity
