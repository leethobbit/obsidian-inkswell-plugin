# Translating Inkswell

Inkswell's interface text lives in `src/i18n/locales/`. English (`en/`) is the source; every other language is a folder that mirrors it, one file per area (`write.ts`, `codex.ts`, `help.ts`, …).

## Status of a language

Each language is listed in `locales/index.ts` → `LOCALE_INFO`, with `reviewed: true | false`.

- **Draft** (`reviewed: false`): machine-drafted. Writers can choose it in **Settings → Interface language**, where it's labelled "(draft — help review)". Inkswell never switches to it automatically.
- **Reviewed** (`reviewed: true`): a fluent speaker has read the whole catalog in the app. Inkswell then follows Obsidian's language automatically.

To promote a language, review it (below) and open a pull request that flips `reviewed` to `true`.

## Reviewing or fixing a translation

1. In Obsidian, choose the language under **Settings → Interface language**, then use Inkswell normally. Fix whatever reads badly, is too long for its button, or is just wrong.
2. Edit the file for that area, e.g. `locales/de/write.ts`. Each key matches the English key in `locales/en/write.ts`; read the English to understand the context.
3. Keep the terms in that folder's `GLOSSARY.md` consistent. If you change a glossary term, change it everywhere (search the folder).
4. Check: `node scripts/i18n-coverage.mjs <code>` (missing or stale keys) and `npx vitest run tests/i18n.test.ts` (placeholders and keys).

## Rules

- **Placeholders stay exactly as they are**: `{count}`, `{name}`, `{link}`… Move them wherever your grammar needs, but never translate, rename or drop them (the test fails if you do).
- **Plurals.** Keys ending in `.one` / `.other` are a plural pair, picked with `Intl.PluralRules` for your language. Japanese and Chinese only use `.other`, but keep both keys filled. A language with more forms may add `.few`, `.many`, or `.two` next to them (e.g. `common.words.few`).
- **Keep as-is:** product names (Inkswell, Obsidian, Longform, Scrivener, pandoc, Word, Markdown), keyboard keys (Ctrl/Cmd, Esc), and anything a writer types into a note. That includes the marker keywords (`[TODO: …]`, `[NOTE: …]`) and link syntax (`[[Note]]`). Obsidian's own menus (Settings → Hotkeys, the command palette) are named the way Obsidian names them in your language.
- **Only interface text is here.** Folder and file names, note headings, frontmatter and compiled manuscripts stay as they are in every language, so a vault reads the same on every device. Don't try to translate them.
- **Write the way the app talks**: short labels, plain sentences, sentence case where your language has it. Use your language's punctuation and quotation marks.
- A missing key shows the English text. A partial translation is fine and better than a wrong one.
