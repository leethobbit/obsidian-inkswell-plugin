# Inkswell Roadmap

Phase-centric information architecture (one tab, left icon rail): **Home · Plan · Write · Track · Revise · Publish**. Each destination does one job; depth lives behind sub-tabs or the Scene Inspector. See `FEATURES.md` for the full pick list and the plan file for IA rationale.

**Current status: v0.11.0** — phases 5–11 shipped. Remaining: codex profiles (new, below) and series mode. Not yet live-QA'd end to end (a deep dive is pending).

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

## Planned

### v0.12.0 — Codex profiles (structured per-category fields)  ← next
**Why:** the `FEATURES.md` pick "Character profiles (structured fields: role/arc/traits/backstory)" — and location/world profiles — was selected but only the entity system shipped (v0.7.0). Today every codex category shares one minimal schema (`codex`, `aliases`, `parent`) and all real attributes live as freeform body text. This phase adds **editable, structured profile fields per category**, stored in each entity note's frontmatter (Obsidian-native, Dataview/Bases-queryable), with the note body remaining freeform for prose.

**Scope**
- A **profile editor** in the Codex: selecting/opening an entity shows a focused form of its category's fields (reuse the Scene Inspector `field()` pattern), writing via `fileManager.processFrontMatter` (never the body). Aliases + parent fold into the form.
- **Per-category field schema** (fixed set v1; extra frontmatter is preserved, not clobbered):
  - **Character:** role, aliases, age, gender, occupation, traits, motivation, flaw, appearance, backstory, arc, relationships
  - **Location:** type, world/parent, region, climate, population, atmosphere, significance, history
  - **World:** *(decision point — see below)* geography, culture, politics, magic/tech, religion, economy, history
  - **Faction:** type, leadership, size, territory, goal, allies, enemies
  - **Item:** type, owner, significance
  - **Event:** date, participants, outcome
  - **Concept:** type (magic/tech/religion), rules, limitations, significance
- Field types: text, textarea, and entity-link (e.g. relationships/allies → wikilinks to other codex entries), reusing the chip pattern.
- "Referenced by" / "appears in" (which scenes link this entity) is a nice-to-have if cheap (we already link `characters`/`location` on scenes).

**Decision point for the session that builds this:** "World" — add a 7th `world` category, OR model worlds as `location` with `type: World` and nest locations via `parent`. Recommendation: a dedicated **`world`** category (clean top-level worldbuilding, matches the user's "Character/Location/World" framing), with locations optionally referencing a world via `parent`.

**Reuse:** `src/scenes/scene-meta.ts` (frontmatter read/write pattern), `SceneInspector.field()` (form rows), `src/codex/*` (entity model/store), `persistInkswellData`/`processFrontMatter`. Keep pure logic (schema definitions, field defaults) Obsidian-free + tested.

**Verification:** create a Character, fill role/traits/arc → reload → fields persist in frontmatter; a relationship field links to another entity (wikilink); a Dataview query over `codex: character` can read the fields.

### v0.13.0 — Series mode
Multi-book series with a shared codex across books.

### 1.0.0
Cut once the scene + codex frontmatter schema is stable enough to promise compatibility.

## Known gaps / deferred (not on the critical path)
- **In-plugin editor is plain-text** (v0.11.0) — Live Preview embedding (real Obsidian editor per scene) is a future upgrade; needs in-app iteration against undocumented APIs.
- **Per-chapter word targets** (per-scene shipped; per-chapter needs a chapter object).
- **Compile-active-project command** still uses the quick modal, not the saved per-project step config (Publish panel uses the saved config).

## Out of scope (philosophy)
AI; cloud sync / real-time collaboration; replacing Obsidian's editor wholesale; separate database/account.
