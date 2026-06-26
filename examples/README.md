# Inkswell sample vault

`sample-vault/` is a complete, openable Obsidian vault containing a mid-draft
novel — *The Lamplighter's Archive* — set up to exercise every Inkswell surface
(Home, Plan/Beats/Board/Codex, Write, Track, Revise, Publish). It's the fastest
way to see what a real project looks like, and a good fixture for manual QA.

## Open it

The committed vault carries its content and its **seeded writing history**
(`data.json`) but **not** the plugin binaries. Deploy them once:

```bash
npm run build:sample      # runs `npm run build`, then copies main.js/manifest/styles into the vault
```

Then in Obsidian: **Open folder as vault** → choose `examples/sample-vault` →
Settings → *Community plugins* → turn off Restricted Mode → enable **Inkswell**.
Open [`_Start Here`](sample-vault/_Start%20Here.md) inside the vault for the tour.

## What's inside

| Path | Role |
|------|------|
| `The Lamplighter's Archive.md` | Project **index** — the `longform:` + `inkswell:` frontmatter: scene order, target + **deadline**, beats, compile recipe, series, **typed/prioritized** revision log, **revision checklist**, tracked-arc character, **style sheet**, and the **publishing** block (checklist, metadata, pre-order launch). |
| `Manuscript/` | Seven scenes spanning every `status` (idea → revised), 5 chapters, 3 acts, 2 POVs. Scenes 1/2/5 carry **revision-audit** frontmatter (`revScene`, `revArc`, lift-out verdict); scene 2 has **placeholder tokens** in its body. |
| `Codex/` | Seven entities across 5 categories (character, location, world, concept, faction). |
| `.obsidian/plugins/inkswell/data.json` | Seeded `writingLog` (≈24 weeks of daily words + 14 sprints), settings, and captured ideas. **Committed.** |
| `_Start Here.md` | In-vault getting-started guide and tips. |

## Testing without dirtying the sample

`sample-vault/` is a **committed deliverable** — keep it pristine. Don't test in
it directly (Obsidian rewrites `workspace.json`, the writing log churns
`data.json`, and stray scenes pile up). Instead test in the throwaway scratch
vault:

```bash
npm run dev-vault:reset   # make examples/dev-vault/ — a git-ignored copy of the sample
npm run dev               # esbuild deploys here by default; redeploys on every save
```

`examples/dev-vault/` is fully git-ignored, so anything you do there never shows
up in `git status`. Re-run `dev-vault:reset` anytime for a clean slate. The
committed sample only receives binaries via `npm run build:sample` (below), used
when packaging the demo.

## Maintaining the sample

- **Telemetry is wall-clock-anchored.** `data.json` dates end **2026-06-22**, so
  Track's Today/Week/Month rings and streak read "live" around then; later they
  reset (history chart, heatmap, and sprint list still render). To re-anchor,
  edit `END` in `scripts/gen-sample-data.mjs` and regenerate (the generator is
  deterministic — fixed PRNG seed, no `Date.now`/`Math.random`).
- **Scene filenames must match** the titles in the index's `scenes:` array
  exactly (basename match), or a scene shows as "missing."
- **Binaries are git-ignored** in the vault on purpose — never commit a stale
  `main.js`/`styles.css` there; re-run `npm run build:sample`.

## Packaging a downloadable sample

To ship a self-contained zip for users who don't clone the repo:

```bash
npm run build:sample
# zip the whole folder, binaries included:
#   examples/sample-vault  ->  inkswell-sample-vault.zip
```

Recipients unzip, *Open folder as vault*, and disable Restricted Mode. No
separate plugin install needed.

## Licensing

All prose and Codex content is **original**, written for this sample and covered
by the plugin's MIT license. Nothing here is public-domain or third-party text,
so there are no edition/translation/jurisdiction concerns — ship or adapt freely.
