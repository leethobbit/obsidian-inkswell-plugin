---
title: Inkswell — QA-lite (top-50 smoke pass)
version: 0.17.0
purpose: The 50 highest-leverage checks to clear before the 1.0 cut
---

# Inkswell — QA-lite (v0.17.0)

The **full** checklist is [[QA]] (~280 items). This is the **curated smoke pass**: the 50
checks most likely to catch a release-blocking regression — weighted toward **data integrity**
(⏫ = corruption risk) and the **newest, least-tested surfaces** (v0.17: Overview, single-scene
creation, Codex relocation, Todos, editable Log). If all 50 pass, the build is *probably* sound;
run the full [[QA]] for sign-off.

Use a real vault with ≥1 multi-scene Longform project (ideally a 2nd project + a few codex entries).

---

## A. Load & the core invariant #qa/lite
- [ ] Plugin loads with no console errors; the ribbon/command opens **one** tab #qa/lite
- [ ] ⏫ Opening Inkswell from several entry points never creates a 2nd host tab #qa/lite
- [ ] Rail shows **Home · Plan · Write · Revise · Publish**, then meta **Codex · Track · Sprint** #qa/lite
- [ ] ⏫ An existing Longform project loads drop-in with scenes intact #qa/lite
- [ ] ⏫ After exercising every panel, a scene file's **body is byte-identical** except where the Write editor changed it #qa/lite
- [ ] ⏫ No feature writes Inkswell data inside `longform` (only under `inkswell`); all written frontmatter is valid YAML and reopens cleanly #qa/lite
- [ ] ⏫ Clearing a field deletes its key and prunes empty sub-objects (e.g. last series field drops `inkswell.series`) #qa/lite
- [ ] ⏫ Reload after a full pass — **every** persisted value survives (beats, codex, series, targets, compile, revisions, checklists, scene audits/arcs, style sheet, publishing, overview) #qa/lite

## B. Home — scenes #qa/lite
- [ ] Project list + scene tree render; nesting indents correctly #qa/lite
- [ ] ⏫ **"+ scene"** (v0.17) creates a file (`status: idea`) + appends to the index + selects it; a duplicate name is refused #qa/lite
- [ ] ⏫ Drag-reorder rewrites only the index `scenes` order (bodies untouched); cross-project drops are rejected #qa/lite
- [ ] ⏫ Rename updates file + index entry; Delete trashes the file + unlinks it #qa/lite
- [ ] Clicking a scene drives the Inspector immediately, reuses one non-pinned leaf, and never hijacks a pinned tab #qa/lite

## C. Plan → Overview (v0.17) #qa/lite
- [ ] ⏫ Logline / Theme / Genre / Audience persist to `inkswell.overview` and reload #qa/lite
- [ ] ⏫ Synopsis / groundwork / Act prose creates `"<Title> — Plan.md"` with `##` sections, sets `overview.planningNote`, and the note has **no** `longform` key (not detected as a project) #qa/lite
- [ ] Planning-note edits round-trip into the Overview textareas; "Open planning note" opens it in an editor #qa/lite

## D. Plan → Beats & Board #qa/lite
- [ ] Template switch re-renders; ⏫ preserves notes/scene-links for beats common to both templates #qa/lite
- [ ] ⏫ Mark-done + beat-note persist to `inkswell.beats.assignments`; clearing deletes them #qa/lite
- [ ] ⏫ **"+ new scene"** on a beat (v0.17) creates the scene **and** attaches it; the chip resolves to a real file #qa/lite
- [ ] ⏫ Board drag sets `status`/`act`/`pov` in the scene's frontmatter only; a "No …" column clears it #qa/lite
- [ ] **"New scene"** in the Board toolbar (v0.17) creates a scene; clicking a card opens the Edit-scene modal (not a random tab) #qa/lite

## E. Codex (top-level destination, v0.17) #qa/lite
- [ ] Opens from the rail meta cluster (not Plan); New + category writes `codex:` frontmatter #qa/lite
- [ ] ⏫ Rename updates the file + wikilinks; Delete trashes the note #qa/lite
- [ ] ⏫ Profile fields persist on reload; clearing removes the key; the freeform body + non-schema keys are preserved #qa/lite
- [ ] "Appears in" lists referencing scenes; series/project/global scoping shows the right entries #qa/lite

## F. Write — editor #qa/lite
- [ ] Navigator selects a scene; its body loads; live word count updates #qa/lite
- [ ] ⏫ Edit + blur saves the body with frontmatter preserved; switching scene/project saves first; unmount saves #qa/lite
- [ ] ⏫ A `\r\n` scene and a no-frontmatter scene both round-trip without corrupting frontmatter #qa/lite
- [ ] Saving identical content does not rewrite the file (no mtime churn) #qa/lite
- [ ] ⏫ Inspector frontmatter edits are not clobbered by a later body save #qa/lite

## G. Write — to-do markers (v0.17) #qa/lite
- [ ] The five markers (and a bare `[TODO]`) highlight as tinted chips; ⏫ retired `%%`/`@@`/`[TK]`/`[???]` do **not** #qa/lite
- [ ] Insert toolbar + `Mod-Shift-T/R/N/D/S` + the **"Insert a to-do marker…"** picker all insert; cursor lands inside the colon form #qa/lite
- [ ] With text selected, inserting **wraps** it as `[KIND: <selection>]` #qa/lite
- [ ] ⏫ Cursor edits inside a token; emphasis inside `[DIALOGUE: *x*]` is **not** italicised #qa/lite

## H. Revise — Todos / Log / Audit #qa/lite
- [ ] Todos lists every marker grouped by scene with kind chips + counts; filtering narrows it #qa/lite
- [ ] ⏫ Clicking a Todos row jumps to **Write**, opens the scene, and scrolls to + flashes the exact marker; the sweep never modifies a scene #qa/lite
- [ ] ⏫ Logging a decision appends to `inkswell.revisions` (never the scene body); toggling pending↔applied persists #qa/lite
- [ ] ⏫ **Editing** a decision (v0.17: click text / right-click → Edit…) updates **in place** — same `id`, `status`/`created` preserved, no duplicate #qa/lite
- [ ] ⏫ Audit: ticking a scene checkpoint writes `revScene.<id>` to that scene's frontmatter; the body is untouched #qa/lite
- [ ] ⏫ Audit: Story/Page checks write `inkswell.revisionChecklist`; the arc grid writes `revArc`/`arcTracked`; renaming a tracked character follows the rename (no orphaned arc) #qa/lite
- [ ] Analysis renders readability / most-used words / echoes / composition and re-runs on project switch #qa/lite

## I. Track / Publish / scale #qa/lite
- [ ] Rings + habit reflect settings; ⏫ writing increases today's count, deleting counts **down**, and opening a pre-existing file does **not** retro-count (baseline); persists across restart #qa/lite
- [ ] ⏫ "Set word target" + deadline + days/week persist to `inkswell.goals`; the pace verdict + milestone zone show #qa/lite
- [ ] ⏫ Compile (Markdown) writes the assembled manuscript, reflects the enabled steps, and **never modifies source scenes** #qa/lite
- [ ] Pandoc missing / on mobile shows a clear error (no crash, no silent failure) #qa/lite
- [ ] ⏫ Publishing checklist/metadata/launch persist under `inkswell.publishing`; saving one never clobbers sibling `inkswell` keys #qa/lite
- [ ] ⏫ A 50+ scene project loads and refreshes without noticeable lag #qa/lite
- [ ] ⏫ Settings (goals/habit/codex folder/word-count toggle) persist across an Obsidian restart #qa/lite
- [ ] Sprint: start → live `Sprint: {words}w · {sec}s` countdown → end/auto-finish logs it; stats update #qa/lite
- [ ] No uncaught exceptions in the console after the full smoke pass #qa/lite

---

**Total: 50 checks.** Fail any ⏫ → stop and fix before cutting 1.0 (data-corruption risk). Non-⏫ fails → file against the full [[QA]] and triage.
