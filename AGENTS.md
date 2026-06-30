# Inkswell — Agent Guide

## What this project is
Single Obsidian plugin (TypeScript + esbuild) that bundles a longform writer's suite — projects/scenes, a compile pipeline, word goals, writing sprints, and an invisible-revision decision log — replacing the fragile Longform + Word Goals + Word Sprint stack. Inkswell owns the drafting surface: scenes are written in its own embedded Live-Preview editor (the Write panel), backed by a custom CodeMirror 6 `EditorView` — not Obsidian's Markdown editor. Single-user, local, no backend. Desktop + mobile (pandoc export is desktop-only and feature-detected).

## Commands
| Task | Command |
|------|---------|
| Seed test vault | `npm run dev-vault:reset` (copy the pristine sample vault into the git-ignored `examples/dev-vault/`) |
| Dev (watch build) | `npm run dev` (auto-deploys to the dev scratch vault on each rebuild) |
| Production build | `npm run build` (`tsc -noEmit` then esbuild; auto-deploys to the dev scratch vault) |
| Refresh demo binaries | `npm run build:sample` (deploys into the committed `examples/sample-vault/` for packaging) |
| Deploy target | `examples/dev-vault/.obsidian/plugins/inkswell` (git-ignored) — override with `INKSWELL_VAULT`. Test here, NOT in the committed sample vault, and never in a real user vault (DKB runs the published store build). |
| Typecheck only | `npm run typecheck` |
| Lint | `npm run lint` (ESLint 9 flat config running **eslint-plugin-obsidianmd's `recommended` set** — the published encoding of the community-store automated review: all `obsidianmd/*` rules plus the type-aware checks the bot reports, e.g. `no-unsupported-api`, `no-deprecated`, `no-misused-promises`, `prefer-window-timers`. Run it before every release to mirror the review locally. The release CI gates on it. Errors block; a few non-blocking rules are tuned in `eslint.config.mjs` with rationale.) |
| Tests | `npm test` (vitest) |
| Reload plugin in vault | use the `obsidian-cli` skill, not a manual restart |

## Architecture rules
- **Finding projects:** query `app.metadataCache` for the `longform` frontmatter key. Don't walk the filesystem — use [src/projects/](src/projects/).
- **Project persistence:** rewrite ONLY the index note's frontmatter. NEVER mutate scene-file bodies — Longform's core invariant. Use the index writer in [src/projects/](src/projects/), not raw `vault.modify` on scenes.
- **Longform compatibility is the premise.** Scene indentation serializes as nested YAML arrays (see `indentedScenesToArrays`/`arraysToIndentedScenes` ported from Longform). Don't invent a flatter encoding — it breaks drop-in compatibility. Inkswell-only data goes under a `inkswell:` sub-key, never inside `longform`.
- **Frontmatter is a frozen 1.0 contract.** Every key Inkswell reads/writes is documented in [SCHEMA.md](SCHEMA.md). Don't rename or repurpose an existing key (including checkpoint/beat/task/category IDs) in a `1.x` release — new optional keys are fine; renames/removals wait for `2.0`. Update SCHEMA.md when adding a key.
- **Word counting:** import the single counter in [src/lib/wordcount.ts](src/lib/wordcount.ts). Don't write ad-hoc counters — goals/sprints/compile must reconcile.
- **Keep pure logic Obsidian-free.** Testable logic (compile assembly, goals math, revision-list ops) lives in modules with NO `obsidian` import (`assemble.ts`, `goals.ts`, `decisions.ts`); the `obsidian`-importing wrapper sits beside it. Tests can't import a module that pulls `obsidian` (no runtime in vitest).
- **Single host view.** Inkswell is ONE main-area tab (`VIEW_TYPE_INKSWELL`, `src/views/inkswell-view.ts`); Projects/Write/Stats/Revision Log are panel classes swapped inside it via a tab-bar. Add new surfaces as panels, NOT as new `ItemView` types/tabs. All entry points call `openInkswell(mode)` so only one tab ever exists. The Write panel hosts the manuscript editor in-place; `openScene` ([src/scenes/scene-actions.ts](src/scenes/scene-actions.ts)) opens a scene in a new, focused markdown tab (like Ctrl/Cmd-clicking a wikilink) for plain Obsidian editing.
- **Editing surface is a custom CM6 `EditorView`, not a `MarkdownView`.** The Write panel builds the editor via `createSceneEditor` ([src/views/scene-editor.ts](src/views/scene-editor.ts)); Live-Preview rendering comes from the pure scanner ([src/lib/markdown-syntax.ts](src/lib/markdown-syntax.ts)). Consequence: Obsidian `editorCallback` commands and the `Editor` API do NOT reach this surface — wire editor behavior (shortcuts, text ops) through a CM keymap in `scene-editor.ts`, keeping the transform pure/testable. Use `editorCallback` only for the plain-markdown-leaf path.
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
| [src/outliner/](src/outliner/) | Beat sheets (templates, beats.ts, BeatPanel) + Kanban (board.ts, BoardPanel) + scaffold |
| [src/scenes/](src/scenes/) | Per-scene frontmatter (scene-meta.ts), Scene Inspector, scene actions (rename/synopsis/delete) |
| [src/codex/](src/codex/) | Codex entities (notes w/ `codex` frontmatter), scanner, panel, pure detect/link helpers; `codex-scope.ts` = per-entity project/series scoping |
| [src/lib/wordcount.ts](src/lib/wordcount.ts) | Shared markdown-aware word counter |
| [src/lib/markdown-syntax.ts](src/lib/markdown-syntax.ts) | Pure Live-Preview syntax scanner (no CM/Obsidian import) → decoration intents |
| [src/views/scene-editor.ts](src/views/scene-editor.ts) | Custom CM6 `EditorView` manuscript surface (Write panel); thin adapter over the scanner |
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

**Release notes are mandatory.** Every change toward a release — feature, fix, or user-facing behavior change — adds a line under the `## [Unreleased]` section of [CHANGELOG.md](CHANGELOG.md) **in the same commit/PR that makes the change** (Keep a Changelog format: Added / Changed / Fixed / Removed). Don't defer it to release time; the changelog is how we always have a current description of what's shipping (store listing, GitHub release, Discord post).

**This is enforced**, not just expected: a pre-commit hook (`scripts/check-changelog.mjs`, wired as a `PreToolUse` hook in `.claude/settings.json`) **blocks any commit that stages source (`src/`, `main.ts`, `styles.css`) without a CHANGELOG.md change.** For a genuinely non-user-facing commit (pure refactor, internal tooling, chore), append `[skip changelog]` to the commit message to bypass it deliberately.

### Bumping a version (in order)
1. **Promote the changelog** — in [CHANGELOG.md](CHANGELOG.md), rename `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`, add a fresh empty `## [Unreleased]` above it, and update the link refs at the bottom. The release workflow injects this section as the GitHub release body, so it must be accurate before you tag.
2. `npm version <patch|minor|major> --no-git-tag-version` — bumps `package.json` and runs `version-bump.mjs`, which syncs `manifest.json` + `versions.json` and stages them.
3. Confirm the three files agree on the new number.
4. `npm run lint` — REQUIRED. Catches `obsidianmd/no-unsupported-api` (an Obsidian API newer than `minAppVersion`) before you tag. The release CI also gates on this, but a failure there means a wasted tag — catch it here.
5. `npm run build` — REQUIRED after the bump so the bundle + new `manifest.json` are current (auto-deploys to the dev vault). (Reload Obsidian to pick it up.)
6. `git add -A && git commit -m "X.Y.Z: <summary>"` (include the Co-authored-by trailer; `-A` so new files are caught).
7. `git tag X.Y.Z` — **no `v` prefix.** Obsidian resolves a release's assets by the exact `manifest.json` version, so the tag must equal it verbatim (`1.0.0`, not `v1.0.0`). Pushing the tag triggers `.github/workflows/release.yml`, which builds and drafts the GitHub release (with the matching CHANGELOG section as its body); publish that draft to distribute.

## Gotchas
1. **Scene indent encoding** — symptom: Longform stops recognizing a project after Inkswell edits it. Cause: serializing `scenes` as flat strings with indent ints instead of nested arrays. Fix: use the ported `indentedScenesToArrays`.
2. **`arraysToIndentedScenes` mutates its input** (`arr.shift()`) — symptom: scenes vanish on re-parse. Cause: passing a shared/cached array. Fix: deep-clone before parsing.
3. **Writing scene bodies** — symptom: user's prose diff churns / data loss. Cause: touching scene files during reorder. Fix: only the index frontmatter changes; assert byte-identical scene bodies in tests.
4. **pandoc on mobile** — symptom: crash on iOS/Android. Cause: shelling out where `child_process` doesn't exist. Fix: guard with platform + binary detection.
5. **Word-delta baselines** — the first edit to a file in a session with no persisted baseline is counted as delta 0 (baseline-set only), so pre-existing prose isn't logged as "written today". Don't change this to count from zero, or opening a vault would log thousands of phantom words. Baselines persist in data.json across sessions.
6. **data.json shape** — it is `{ settings, writingLog }`, NOT settings at the top level. Read/write via `loadPersisted`/`persist` in main.ts; don't call `saveData(this.settings)` directly or you'll wipe the writing log.
7. **Base folder is a scaffolding default, not a boundary** — symptom: assuming a project/codex outside `settings.baseFolder` won't be found, or that codex visibility comes from where the note lives. Cause: discovery is vault-wide frontmatter scans (`project-store`, `codex-store`); `baseFolder` only sets where *new* content scaffolds. Fix: never filter discovery by folder, never derive scope from path — codex visibility is the `codex-series`/`codex-project` tag (`src/codex/codex-scope.ts`); the folder (`src/settings/folders.ts`) is cosmetic co-location only.
8. **API types are ahead of the runtime floor** — symptom: a feature compiles (types come from `devDependencies.obsidian: latest`, e.g. 1.13.x) but is rejected by the community-store review, or fails at runtime, because the API is newer than `minAppVersion`. Example: `ButtonComponent.setDestructive()` needs Obsidian **1.13.0**; on a 1.7.x floor use the long-standing `setWarning()` instead. Fix: **run `npm run lint`** — `obsidianmd/no-unsupported-api` flags exactly this and names the required version. Don't try to feature-detect around it (a `typeof x.method === "function"` guard still references the symbol, so the linter — correctly — still flags it, and `minAppVersion` users still don't get the feature). Either use an API available at the floor, or raise `minAppVersion` deliberately.
