/**
 * English UI strings: the source catalog every other locale is checked against.
 *
 * Rules (see AGENTS.md "Localizing UI text"):
 * - UI chrome ONLY. Never put text here that is written into the vault (file or
 *   folder names, template-note names, app-managed headings, frontmatter, compile
 *   output): those must stay identical across languages and devices.
 * - Keys are `area.thing[.detail]`; a plural pair is `<base>.one` + `<base>.other`
 *   (read with `tp`). Placeholders are `{name}` and must match across locales
 *   (tests/i18n.test.ts).
 * - Sentence case is enforced on this file by `obsidianmd/ui/sentence-case-locale-module`.
 */
export const en = {
  // --- Publish → Compile panel -------------------------------------------
  "compile.heading": "Compile",
  "compile.noProjects": "No projects found.",
  "compile.bible.prompt": "Sharing your planning rather than the manuscript?",
  "compile.bible.link": "Export a story bible…",
  "compile.format.label": "Format",
  "compile.format.md": "Markdown (.md)",
  "compile.format.html": "HTML (.html)",
  "compile.format.docx": "Word (.docx)",
  "compile.format.pandocDocx": "Word via pandoc, with a reference doc (.docx)",
  "compile.format.pandocPdf": "PDF via pandoc (.pdf)",
  "compile.format.pandocEpub": "EPUB via pandoc (.epub)",
  "compile.format.needsPandoc": "{label} — needs pandoc",
  "compile.note.desktopOnly": "PDF, EPUB, and Word with a reference doc are desktop-only (they need pandoc).",
  "compile.note.checking": "Checking for pandoc…",
  "compile.note.noPandoc":
    "PDF and EPUB export need pandoc — install it from pandoc.org, then restart Obsidian. Word export is built in.",
  "compile.note.noPdfEngine": "PDF export also needs a LaTeX engine (e.g. MiKTeX or TeX Live) on your PATH.",
  "compile.steps.scene": "Scene steps",
  "compile.steps.manuscript": "Manuscript steps",
  "compile.steps.headingExclusive":
    "“Prepend the scene title” and “Group scenes into chapters” both add headings — pick one.",
  "compile.step.strip-frontmatter": "Strip YAML frontmatter from each scene",
  "compile.step.remove-comments": "Remove %% Obsidian comments %% from each scene",
  "compile.step.remove-todos": "Remove to-do markers ([TODO], [NOTE], your own…) — unfinished spots",
  "compile.step.flatten-links": "Flatten links to plain text ([[wikilinks]] and [markdown](links))",
  "compile.step.html-align":
    "Convert HTML alignment (<p align>, <center>) to Word paragraph styles — pandoc Word/PDF only",
  "compile.step.prepend-title": "Prepend the scene title as a heading",
  "compile.step.group-by-chapter": "Group scenes into chapters (heading per chapter, scene breaks between)",
  "compile.step.trim-blank-lines": "Collapse excess blank lines and trailing whitespace",
  "compile.separator.label": "Scene separator",
  "compile.separator.custom": "Custom (frontmatter)",
  "compile.separator.blank": "Blank line",
  "compile.separator.asterisks": "* * * (scene break)",
  "compile.separator.rule": "--- (horizontal rule)",
  "compile.separator.hash": "# (centered break)",
  "compile.refdoc.label": "Word reference doc (styles)",
  "compile.refdoc.clear": "Clear",
  "compile.refdoc.alignNote":
    "Aligned blocks (<p align>, <center>) come out in the Word styles “Right Aligned” / “Centered” — set their alignment once in your reference doc; pandoc creates them unaligned.",
  "compile.refdoc.desktopOnly": "Desktop only (needs pandoc).",
  "compile.refdoc.installPandoc": "Install pandoc to generate a reference doc.",
  "compile.refdoc.generate": "Generate reference doc",
  "compile.refdoc.regenerate": "Regenerate reference doc",
  "compile.refdoc.created": "Reference doc created: {path}. Edit its styles in Word.",
  "compile.refdoc.failed": "Couldn't generate reference doc: {error}",
  "compile.output.label": "Output file name",
  "compile.run": "Compile",
  "compile.preflight.button": "Check manuscript before export",
  "compile.preflight.checking": "Checking…",
  "compile.preflight.clean": "No issues found. Ready to export.",
  "compile.preflight.missing": "Missing scene files ({count}): {titles}",
  "compile.preflight.finding": "{label} — {count}",
  "compile.done.one": "Compiled {count} word to {path}",
  "compile.done.other": "Compiled {count} words to {path}",
  "compile.failed": "Compile failed: {error}",
  "compile.overwrite.confirm":
    "“{path}” already exists and doesn't look like a previous Inkswell compile. Overwrite it? A backup of the current file will be saved to “Inkswell conflicts” first.",
  "compile.overwrite.button": "Overwrite",
  "compile.saveFailed": "Couldn't save the compile settings.",

  // --- Publish → Compile: built-in Word manuscript --------------------------
  "compile.docx.heading": "Manuscript format",
  "compile.docx.intro":
    "Standard manuscript format: 12 pt, double-spaced, 1-inch margins, indented paragraphs, chapters on a new page, and a running header with your surname, the title, and the page number.",
  "compile.docx.font": "Font",
  "compile.docx.font.times": "Times New Roman",
  "compile.docx.font.courier": "Courier New",
  "compile.docx.paper": "Paper size",
  "compile.docx.paper.letter": "US Letter (8.5 × 11 in)",
  "compile.docx.paper.a4": "A4",
  "compile.docx.titlePage": "Start with a title page: your name, contact details, and word count",
  "compile.docx.endMarker": "“END” after the last line",
  "compile.docx.byline": "Byline",
  "compile.docx.bylineHint": "The name readers see. Leave blank to use your name from settings.",
  "compile.docx.surname": "Header surname",
  "compile.docx.surnameHint": "Shown in the running header. Leave blank to use the last word of the byline.",
  "compile.docx.noAuthor":
    "Add your name and contact details under Settings → Inkswell → Manuscript so the title page and header aren't blank.",
  "compile.docx.skippedImages": "Images left out (not found, or not PNG/JPEG/GIF): {list}",
  "compile.docx.unsupported.one":
    "{count} table, footnote, or code block will be exported as plain paragraphs in Word.",
  "compile.docx.unsupported.other":
    "{count} tables, footnotes, or code blocks will be exported as plain paragraphs in Word.",

  // --- Settings → Manuscript -------------------------------------------------
  "settings.manuscript.heading": "Manuscript",
  "settings.authorName.name": "Your name",
  "settings.authorName.desc":
    "Your legal name, for the title page of Word manuscripts. A book's byline (pen name) can differ — set it in Publish → Compile.",
  "settings.authorContact.name": "Contact details",
  "settings.authorContact.desc":
    "Address, email, phone — one per line, under your name on the title page.",
  "settings.compileFormat.md": "Markdown",
  "settings.compileFormat.html": "HTML",
  "settings.compileFormat.docx": "Word (.docx)",
  "settings.compileFormat.pandoc": "Pandoc (docx/pdf/epub)",

  // --- Revise → Audit ---------------------------------------------------------
  "audit.noProjects": "No multi-scene projects.",
  "audit.summary.story": "Story {done}/{total}",
  "audit.summary.chapters": "Chapters audited {done}/{total}",
  "audit.summary.scenes": "Scenes audited {done}/{total}",
  "audit.summary.prose": "Prose {done}/{total}",
  "audit.section.story": "Story-level ({done}/{total})",
  "audit.section.chapters": "Chapters ({done}/{total} complete)",
  "audit.section.prose": "Prose-level ({done}/{total})",
  "audit.section.scenes": "Scenes ({done}/{total} complete)",
  "audit.section.openings": "Scene openings",
  "audit.section.arc": "Character arcs",
  "audit.section.roster": "Side-character roster",
  "audit.section.style": "Style sheet",
  "audit.notePlaceholder": "Add a note…",
  "audit.saveFailed": "Couldn't save the checklist change.",
  "audit.noScenes": "No scenes yet.",
  "audit.chapters.intro":
    "Does each chapter pull its weight? Tick what it already does and note what it still needs. Customize the list under Customize → Revision checklists.",
  "audit.chapters.scenes.one": "{count} scene",
  "audit.chapters.scenes.other": "{count} scenes",
  "audit.openings.heuristic":
    "Heuristic — classified from each scene's first line; override per scene in the Inspector.",
  "audit.openings.analyzing": "Analyzing openings…",
  "audit.openings.none": "No scenes to analyze.",
  "audit.openings.variety": "Good variety — no runs of repeated openings.",
  "audit.openings.run": "{count} scenes in a row open with {type} (scenes {from}–{to}).",
  "audit.arc.track": "+ track character",
  "audit.arc.empty":
    "Track a character to chart their arc. Record per-scene internal/external state in the Scene Inspector (link the character to the scene first).",
  "audit.arc.noData": "No data",
  "audit.arc.transforms.one": "Transforms · {count} scene",
  "audit.arc.transforms.other": "Transforms · {count} scenes",
  "audit.arc.flat.one": "Flat · {count} scene",
  "audit.arc.flat.other": "Flat · {count} scenes",
  "audit.arc.cellNoData": "{title} — no data",
  "audit.arc.flatStretch": "Flat stretch ({count} scenes): {list}",
  "audit.arc.internal": "Internal: {text}",
  "audit.arc.external": "External: {text}",
  "audit.arc.saveFailed": "Couldn't save the tracked characters.",
  "audit.roster.empty": "No Codex characters yet. Add characters in the Codex to build a roster.",
  "audit.roster.intro":
    "Each side character should serve a function, have a goal + flaw, and a memorable trait. Edit fields in the Codex.",
  "audit.roster.scenes.one": "{count} scene",
  "audit.roster.scenes.other": "{count} scenes",
  "audit.roster.function": "Function: {text}",
  "audit.roster.goal": "Goal: {text}",
  "audit.roster.flaw": "Flaw: {text}",
  "audit.roster.trait": "Trait: {text}",
  "audit.roster.noFields": "No roster fields set.",
  "audit.roster.missing": "Missing: {list}",
  "audit.roster.walkOn": "Appears once — cut or merge?",
  "audit.style.not": "not: {list}",
  "audit.style.remove": "Remove {name}",
  "audit.style.preferred": "Preferred form",
  "audit.style.avoid": "Avoid (comma-separated)",
  "audit.style.add": "Add",
  "audit.style.scan": "Scan manuscript",
  "audit.style.needEntry": "Add at least one style entry first.",
  "audit.style.scanning": "Scanning…",
  "audit.style.none": "No style deviations found.",
  "audit.style.open": "Open “{title}” in Write",
  "audit.style.goLine": "Go to line {line} in Write",
  "audit.style.saveFailed": "Couldn't save the style sheet.",

  // --- Customize → Revision checklists ---------------------------------------
  "customize.revision.defaults": "Story {story} · Chapter {chapter} · Scene {scene} · Prose {prose} (defaults)",
  "customize.revision.touched": "{count} of {total} tiers customized",
  "customize.revision.intro":
    "The revision audit's passes, macro to micro. Hiding a checkpoint keeps any ticks already in your notes; renaming keeps the same stored key. Add your own where the method misses something you always check.",
  "customize.revision.story": "Story-level",
  "customize.revision.chapter": "Chapter-level (per chapter)",
  "customize.revision.scene": "Scene-level (per scene)",
  "customize.revision.prose": "Prose-level",
} as const;

export type MessageKey = keyof typeof en;
