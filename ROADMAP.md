# Inkswell Roadmap

Phase-centric information architecture (one tab, left icon rail): **Home · Plan · Write · Track · Revise · Publish**. Each destination does one job; depth lives behind sub-tabs or the Scene Inspector. See `FEATURES.md` for the full pick list and the plan file for IA rationale.

**Current status: v0.12.0** — phases 5–12 shipped. Remaining: series mode. Not yet live-QA'd end to end (a deep dive is pending).

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

## Planned

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
