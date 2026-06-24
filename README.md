# Inkswell

A local-first writer's suite for longform fiction in [Obsidian](https://obsidian.md). Inkswell leaves the *writing* to Obsidian and gives you everything **around** the writing, organised into one tab with six phases: **Home · Plan · Write · Track · Revise · Publish**.

It's Longform-compatible (reads and writes the same `longform` frontmatter), so existing projects load drop-in; Inkswell-only data lives under a separate `inkswell` key and never touches your prose body.

## Features

- **Home** — projects and a nestable scene tree, an ideas inbox + quick capture, and series grouping for multi-book worlds, with a global project switcher.
- **Plan** — *Beats* (7 outline templates incl. Save the Cat! + scene scaffolding), a *Board* (Kanban by status / act / POV), and a *Codex* story bible (characters, locations, worlds, factions, items, events, concepts) with scene linking and mention auto-detect.
- **Write** — a distraction-light, Live-Preview manuscript editor; writing prompts; fast-drafting **placeholder tokens** (`[TK]`, `[SCENE: …]`, `[DIALOGUE: …]`, `[NOTE: …]`) that highlight as you type; and timed writing **sprints**.
- **Track** — daily / weekly / monthly word goals, habit + streaks, a GitHub-style heatmap, lifetime records, a writing-history chart, sprint stats, a **deadline pace calculator**, draft-milestone zones, and an optional daily mood.
- **Revise** — an **Audit** toolkit (per-scene + project revision checklists, a scene-purpose lift-out test, scene-opening variety, a character-arc grid, a side-character roster, and a style-sheet consistency scan); the **invisible-revision Log** (capture "from now on, assume X" decisions, typed and prioritized, and keep drafting forward); a **Gaps** sweep of every placeholder; **Comments** extraction (`%%`/`@@`); and **Analysis** (readability, overused words, echoes, composition mix).
- **Publish** — a configurable **compile/export** pipeline (Markdown & HTML built in; `.docx` / `.pdf` / `.epub` via pandoc when installed) with a step editor, chapter grouping, and a pre-export check; plus a self-publishing **Checklist** (master checklist + book-metadata worksheet) and **Launch** planner (pre-order timeline + budget / cover / marketing / ARC trackers).

The invisible-revision method, the fast-drafting aids, the revision audit, and the self-publishing workflow draw on established, widely-taught craft methods for drafting, revising, and self-publishing fiction.

## Privacy & dependencies

- **Local-first.** Inkswell makes **no network calls**, collects **no telemetry**, and requires **no account**. Everything is stored in your vault's frontmatter and the plugin's local `data.json`.
- **No AI.** By design — Inkswell is tooling around your writing, not a generator.
- **Optional pandoc.** Exporting to `.docx` / `.pdf` / `.epub` shells out to a [pandoc](https://pandoc.org/) binary installed on your machine. It's feature-detected and disabled gracefully when pandoc isn't present; Markdown and HTML export need nothing extra.
- **Desktop-only** for now (`isDesktopOnly`). A focused mobile view (idea capture + read-only review) is planned for a future release.

## Install

**Requirements:** Obsidian 1.5.0+ (pandoc optional, for `.docx`/`.pdf`/`.epub`).

- **Community plugins** (once accepted into the directory): Settings → *Community plugins* → *Browse* → search **Inkswell** → Install → Enable. *(Directory submission pending.)*
- **Manual:** download `main.js`, `manifest.json`, and `styles.css` from the latest [release](https://github.com/leethobbit/obsidian-inkswell-plugin/releases) into `<vault>/.obsidian/plugins/inkswell/`, then enable Inkswell in *Community plugins*.

Open Inkswell from the pen-tip ribbon icon or the *"Open Inkswell"* command.

## Try it: the sample vault

[`examples/sample-vault/`](examples/) is a complete, openable vault containing a mid-draft novel wired up to exercise every Inkswell surface — beats, scenes, Codex, a populated Track dashboard, the revision audit, a compile recipe, and the self-publishing planner. Run `npm run build:sample`, then *Open folder as vault* on `examples/sample-vault`. See [examples/README.md](examples/README.md) for details.

## Development

```bash
npm install
npm run dev      # watch build into main.js
npm run build    # typecheck + production bundle
npm test         # unit tests (vitest)
```

Copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/inkswell/` to test in a real vault. Architecture, conventions, and the compile/version workflows are documented in [AGENTS.md](AGENTS.md).

## AI disclosure

This plugin was developed with the assistance of **agentic AI coding tools and practices**. I have a mandate at work to learn AI tooling, and I wanted to channel that practice into something of lasting value for a community I love rather than throwaway exercises. Direction, architecture, scope, and review are all handled by me; much of the implementation was AI-assisted under that direction. Everything is open source (MIT) and the full commit history is here for inspection — feedback and scrutiny are welcome.

## License

MIT © Daniel King
