# Inkswell

A full writer's suite for [Obsidian](https://obsidian.md) — one plugin instead of a fragile stack of three.

Inkswell leaves the writing to Obsidian and gives you everything *around* the writing:

- **Projects & scenes** — organise a novel into ordered, nestable scenes with a dedicated sidebar. Compatible with existing [Longform](https://github.com/kevboh/longform) projects (reads and writes the same `longform` frontmatter).
- **Compile** — a configurable pipeline that turns your scenes into a finished manuscript (Markdown / HTML built in; `.docx`/`.pdf` via pandoc when installed).
- **Goals & sprints** — daily and project word goals, timed writing sprints with live word counts, status-bar progress, and a stats dashboard (30-day chart, streaks, target projections).
- **Invisible-revision log** — capture "from now on, assume X" decisions while fast-drafting and keep writing forward, then work the list during your revision pass. Based on the Writing Mastery Academy method.
- **Beat sheet** — outline with the Save the Cat! 15-beat structure: a planning note, optional scene link, and completion tracking per beat.

## Status

Active development. Phases 1 (projects + compile), 2 (goals + sprints + stats), 3 (revision log), and 4 (Save the Cat beat sheet) are implemented. Inkswell runs as a single main-window tab with internal tabs (Projects · Beats · Stats · Revision Log). See [AGENTS.md](AGENTS.md) for architecture and contribution conventions.

## Try it: the sample vault

[`examples/sample-vault/`](examples/) is a complete, openable vault containing a
mid-draft novel wired up to exercise every Inkswell surface — beats, scenes,
Codex, a populated Track dashboard, a revision log, and a compile recipe. Run
`npm run build:sample`, then *Open folder as vault* on `examples/sample-vault`.
See [examples/README.md](examples/README.md) for details.

## Development

```bash
npm install
npm run dev      # watch build into main.js
npm run build    # typecheck + production bundle
npm test         # unit tests (vitest)
```

Symlink or copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/inkswell/` to test in a real vault.

## License

MIT © Daniel King
