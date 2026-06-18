# Inkswell — Agent Guide

## What this project is
Single Obsidian plugin (TypeScript + esbuild) that bundles a longform writer's suite — projects/scenes, a compile pipeline, word goals, writing sprints, and an invisible-revision decision log — replacing the fragile Longform + Word Goals + Word Sprint stack. Obsidian does all text editing; Inkswell is only the surrounding tools. Single-user, local, no backend. Desktop + mobile (pandoc export is desktop-only and feature-detected).

## Commands
| Task | Command |
|------|---------|
| Dev (watch build) | `npm run dev` (auto-deploys to the vault on each rebuild) |
| Production build | `npm run build` (`tsc -noEmit` then esbuild; auto-deploys to the vault) |
| Deploy target | `X:/DKB/.obsidian/plugins/inkswell` — override with `INKSWELL_VAULT` env var |
| Typecheck only | `npm run typecheck` |
| Lint | `npm run lint` |
| Tests | `npm test` (vitest) |
| Reload plugin in vault | use the `obsidian-cli` skill, not a manual restart |

## Architecture rules
- **Finding projects:** query `app.metadataCache` for the `longform` frontmatter key. Don't walk the filesystem — use [src/projects/](src/projects/).
- **Project persistence:** rewrite ONLY the index note's frontmatter. NEVER mutate scene-file bodies — Longform's core invariant. Use the index writer in [src/projects/](src/projects/), not raw `vault.modify` on scenes.
- **Longform compatibility is the premise.** Scene indentation serializes as nested YAML arrays (see `indentedScenesToArrays`/`arraysToIndentedScenes` ported from Longform). Don't invent a flatter encoding — it breaks drop-in compatibility. Inkswell-only data goes under a `inkswell:` sub-key, never inside `longform`.
- **Word counting:** import the single counter in [src/lib/wordcount.ts](src/lib/wordcount.ts). Don't write ad-hoc counters — goals/sprints/compile must reconcile.
- **Keep pure logic Obsidian-free.** Testable logic (compile assembly, goals math, revision-list ops) lives in modules with NO `obsidian` import (`assemble.ts`, `goals.ts`, `decisions.ts`); the `obsidian`-importing wrapper sits beside it. Tests can't import a module that pulls `obsidian` (no runtime in vitest).
- **Single host view.** Inkswell is ONE main-area tab (`VIEW_TYPE_INKSWELL`, `src/views/inkswell-view.ts`); Projects/Stats/Revision Log are panel classes swapped inside it via a tab-bar. Add new surfaces as panels, NOT as new `ItemView` types/tabs. All entry points call `openInkswell(mode)` so only one tab ever exists. Editing a scene opens the note in a separate editor tab (reuse a markdown leaf, never the host).
- **External binaries (pandoc):** feature-detect and disable gracefully. Never assume presence; never crash on mobile.

## Key files
| Path | Purpose |
|------|---------|
| [main.ts](main.ts) | Plugin entry: settings load, view/command/ribbon registration |
| [src/projects/](src/projects/) | ProjectStore (observable), Draft parse/serialize, index writer |
| [src/views/inkswell-view.ts](src/views/inkswell-view.ts) | Single host view: tab-bar + swaps the three panels |
| [src/views/explorer/](src/views/explorer/) | ExplorerPanel: project list + scene tree |
| [src/compile/](src/compile/) | CompileStep interface, built-in steps, run engine |
| [src/tracking/](src/tracking/) | WritingTracker: net word-delta → daily log; data.json telemetry |
| [src/goals/](src/goals/) | Pure streak/projection math + project-target modal |
| [src/sprints/](src/sprints/) | Sprint timer/controller + start dialog |
| [src/stats/](src/stats/) | Stats dashboard view (CSS bar chart, streaks, projections) |
| [src/revisions/](src/revisions/) | Invisible-revision decision log: pure ops (decisions.ts), I/O, capture modal, panel |
| [src/outliner/](src/outliner/) | Save the Cat beat sheet: template, pure ops (beats.ts), BeatPanel |
| [src/lib/wordcount.ts](src/lib/wordcount.ts) | Shared markdown-aware word counter |
| [src/settings/](src/settings/) | Settings tab + typed settings model |

## Common Operations
| Task | Pattern |
|------|---------|
| Persist project structure | Rewrite index `longform` frontmatter only — never scene bodies |
| Persist Inkswell-only project data | `inkswell:` sub-key in the same index frontmatter |
| Persist sprint/daily telemetry | `.obsidian/plugins/inkswell/data.json`, date-keyed (plugin `saveData`) |
| Count words | `import { countWords } from "src/lib/wordcount"` |
| Export docx/pdf | Optional pandoc manuscript step; detect binary, disable if missing |

## Adding a compile step (in order)
1. Implement the `CompileStep` interface in [src/compile/steps/](src/compile/steps/), setting `kind: "scene" | "manuscript"`.
2. Register it in the step registry so it appears in the compile UI.
3. Add/extend a vitest case asserting pipeline ordering and output.
4. `npm run typecheck && npm test`, then reload via the `obsidian-cli` skill and run a compile end-to-end.

## Versioning (semver)
Pre-1.0 the leading `0` means "unstable": data-format/compat breaks are allowed and bump MINOR. Keep `package.json`, `manifest.json`, and `versions.json` in lockstep — never edit one by hand.

| Change | Bump | Example |
|--------|------|---------|
| Bug fix, docs, refactor (no behavior change) | PATCH | 0.2.0 → 0.2.1 |
| New feature / completed phase; pre-1.0 breaking change | MINOR | 0.2.1 → 0.3.0 |
| Post-1.0 breaking change (frontmatter / Longform compat) | MAJOR | 1.4.2 → 2.0.0 |

Cut `1.0.0` only once the Longform-compatible frontmatter format is stable enough to promise compatibility. `minAppVersion` rises only when adopting a newer Obsidian API — record the mapping in `versions.json`.

### Bumping a version (in order)
1. `npm version <patch|minor|major> --no-git-tag-version` — bumps `package.json` and runs `version-bump.mjs`, which syncs `manifest.json` + `versions.json` and stages them.
2. Confirm the three files agree on the new number.
3. `npm run build` — REQUIRED after the bump so auto-deploy copies the new `manifest.json` to the vault. Skipping this leaves the installed plugin on the old version. (Reload Obsidian to pick it up.)
4. `git add -A && git commit -m "vX.Y.Z: <summary>"` (include the Co-authored-by trailer; `-A` so new files are caught).
5. `git tag vX.Y.Z`.

## Gotchas
1. **Scene indent encoding** — symptom: Longform stops recognizing a project after Inkswell edits it. Cause: serializing `scenes` as flat strings with indent ints instead of nested arrays. Fix: use the ported `indentedScenesToArrays`.
2. **`arraysToIndentedScenes` mutates its input** (`arr.shift()`) — symptom: scenes vanish on re-parse. Cause: passing a shared/cached array. Fix: deep-clone before parsing.
3. **Writing scene bodies** — symptom: user's prose diff churns / data loss. Cause: touching scene files during reorder. Fix: only the index frontmatter changes; assert byte-identical scene bodies in tests.
4. **pandoc on mobile** — symptom: crash on iOS/Android. Cause: shelling out where `child_process` doesn't exist. Fix: guard with platform + binary detection.
5. **Word-delta baselines** — the first edit to a file in a session with no persisted baseline is counted as delta 0 (baseline-set only), so pre-existing prose isn't logged as "written today". Don't change this to count from zero, or opening a vault would log thousands of phantom words. Baselines persist in data.json across sessions.
6. **data.json shape** — it is `{ settings, writingLog }`, NOT settings at the top level. Read/write via `loadPersisted`/`persist` in main.ts; don't call `saveData(this.settings)` directly or you'll wipe the writing log.
