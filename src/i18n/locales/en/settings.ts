/** English UI strings — Settings tab, Customize destination, shared list editors (src/settings, src/customize, src/lib, src/features.ts). See ./index.ts for the rules. */
export const settings = {
  // --- Settings tab ------------------------------------------------------------
  "settings.customize.name": "Customize Inkswell",
  "settings.customize.desc":
    "Codex types and fields, starter templates, beat structures, scene statuses, writing prompts, checklists, and which features are shown — all edited inside Inkswell.",
  "settings.customize.button": "Open customize",
  "settings.defaultCompileFormat.name": "Default compile format",
  "settings.defaultCompileFormat.desc": "Format pre-selected when you open the compile dialog.",
  "settings.showWordCounts.name": "Show word counts",
  "settings.showWordCounts.desc": "Display per-scene and per-project word counts in the explorer.",
  "settings.hideArchived.name": "Hide archived books from their series",
  "settings.hideArchived.desc":
    "An archived book leaves its series shelf and the series covers on Home, and waits under its series name in the Archived section — handy for short stories you archive once they're out. When off, archived books stay on the series shelf, dimmed.",
  "settings.syncHistory.name": "Sync writing history across devices",
  "settings.syncHistory.desc":
    "Words are counted on the device where you type them. Turn this on to keep a small log note per device under your base folder's “Writing log” folder and merge them on Track, so streaks and totals include every device. Your vault's own sync (Obsidian Sync, iCloud, …) carries the notes.",
  "settings.sceneHeadingLevel.name": "Scene heading level",
  "settings.sceneHeadingLevel.desc": "Heading level (1–6) for the optional 'prepend title' compile step.",

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
  "settings.interfaceLanguage.name": "Interface language",
  "lib.rowMenu.openInTabHint": "Ctrl/Cmd-click to open in a new tab",
  "settings.interfaceLanguage.desc":
    "Inkswell follows Obsidian's language when a reviewed translation exists. Choose one here to override it, including draft translations. Text written into your notes stays as it is.",
  "settings.interfaceLanguage.auto": "Same as Obsidian",
  "settings.interfaceLanguage.draft": "{name} (draft — help review)",
  "settings.interfaceLanguage.applied": "Language changed. Command names, this settings tab, and the phone tab bar switch after you restart Obsidian.",
  "settings.companionSceneTarget.name": "Open scenes from the sidebar in",
  "settings.companionSceneTarget.desc":
    "Where a scene opens when you click it in a sidebar companion. Ctrl/Cmd-click always opens a new tab.",
  "settings.companionSceneTarget.write": "Inkswell Write",
  "settings.companionSceneTarget.tab": "A regular tab",

  // --- Settings → Write editor -----------------------------------------------
  "settings.writeEditor.heading": "Write editor",
  "settings.typewriterMode.name": "Typewriter mode",
  "settings.typewriterMode.desc":
    "Keep the line you're typing on vertically centered in the Write editor, so your eyes stay in one place. Mouse clicks don't recenter. Also available as the command “Toggle typewriter mode (Write editor)”.",
  "settings.manuscriptTypography.name": "Manuscript typography",
  "settings.manuscriptTypography.desc":
    "Book-style layout in the Write editor: paragraphs get a first-line indent (except the first paragraph after a heading or scene break), and headings are centered. Purely visual — your text is unchanged. The font follows Obsidian's Appearance → Text font.",
  "settings.smartDashes.name": "Smart dashes",
  "settings.smartDashes.desc":
    "In the Write editor, typing -- becomes an en dash (–) and a third - makes an em dash (—). A line of dashes (---) is left alone. Applies only to Inkswell's Write editor, not Obsidian's notes.",
  "settings.smartQuotes.name": "Smart quotes",
  "settings.smartQuotes.desc":
    "Straight quotes typed in the Write editor become curly quotes (“ ” and ‘ ’); apostrophes become ’. Skipped inside code and links.",
  "settings.smartEllipsis.name": "Smart ellipsis",
  "settings.smartEllipsis.desc": "Three periods typed in the Write editor become an ellipsis (…).",
  "settings.milestoneWords.name": "Milestone tags every…",
  "settings.milestoneWords.desc":
    "Put a small tag in the Write editor's margin on the line where the scene's running word count passes each multiple of this number (e.g. 500 → tags at 500, 1k, 1.5k…). 0 = off; minimum 100.",

  // --- Settings → Goals & sprints --------------------------------------------
  "settings.goals.heading": "Goals & sprints",
  "settings.weekStart.name": "Week starts on",
  "settings.weekStart.desc": "First day of the week for weekly goals, habit tracking, and the heatmap.",
  "settings.weekStart.monday": "Monday",
  "settings.weekStart.sunday": "Sunday",
  "settings.dailyWordGoal.name": "Daily word goal",
  "settings.dailyWordGoal.desc": "Target words per day, shown in the status bar and stats.",
  "settings.weeklyWordGoal.name": "Weekly word goal",
  "settings.weeklyWordGoal.desc": "Target words per week (start of week→today).",
  "settings.monthlyWordGoal.name": "Monthly word goal",
  "settings.monthlyWordGoal.desc": "Target words per month (1st→today).",
  "settings.habitDaysPerWeek.name": "Habit: days per week",
  "settings.habitDaysPerWeek.desc": "How many days a week you aim to write.",
  "settings.habitMinWords.name": "Habit: minimum words/day",
  "settings.habitMinWords.desc": "Minimum words for a day to count toward the habit.",
  "settings.defaultSprintMinutes.name": "Default sprint length",
  "settings.defaultSprintMinutes.desc": "Default sprint duration in minutes.",
  "settings.defaultSprintWordGoal.name": "Default sprint word goal",
  "settings.defaultSprintWordGoal.desc": "Word goal pre-filled in the sprint dialog. 0 = no goal.",
  "settings.streakThreshold.name": "Streak threshold",
  "settings.streakThreshold.desc": "Minimum words in a day for it to extend your writing streak.",

  // --- Settings → What counts toward goals -----------------------------------
  "settings.counts.heading": "What counts toward goals",
  "settings.counts.intro":
    "Goals, streaks, and sprints only ever count writing in project notes — notes elsewhere in the vault never count. Choose which kinds count. Changing a toggle also re-counts words already written since this option was introduced; older history always counts.",
  "settings.counts.scene.name": "Manuscript scenes",
  "settings.counts.scene.desc": "Scene files and single-note projects — the manuscript itself.",
  "settings.counts.planning.name": "Planning notes",
  "settings.counts.planning.desc": "Each project's planning note (synopsis, plot groundwork, act sketch).",
  "settings.counts.codex.name": "Codex notes",
  "settings.counts.codex.desc": "Notes with a codex key (characters, places, lore), wherever they live.",
  "settings.counts.other.name": "Other project notes",
  "settings.counts.other.desc": "The project index note and any other notes inside a project's folder.",

  // --- Settings → Folders ----------------------------------------------------
  "settings.folders.heading": "Folders",
  "settings.baseFolder.name": "Base folder",
  "settings.baseFolder.desc":
    "Folder new projects and the shared codex scaffold under. Blank = vault root. This only sets where new content is created — existing projects and codex anywhere in the vault still work.",
  "settings.baseFolder.placeholder": "(vault root)",
  "settings.codexFolder.name": "Codex folder name",
  "settings.codexFolder.desc": "Subfolder name used for codex notes (shared and per-project).",
  "settings.coLocateCodex.name": "Co-locate codex with projects",
  "settings.coLocateCodex.desc":
    "Book-scoped entries are created in their project's own codex folder; series and global entries go to the shared base codex. Organization only — visibility is set per-entry by its Scope field, not by where the note lives.",

  // --- Settings → Layout -----------------------------------------------------
  "settings.layout.heading": "Layout",
  "settings.forceTablet.name": "Use the full layout on this device",
  "settings.forceTablet.desc":
    "Obsidian classifies this screen as phone-sized, so Inkswell shows its phone layout and keeps Plan and Publish behind a “needs a larger screen” notice. Turn this on if you're on a tablet.",

  // --- Settings → Help -------------------------------------------------------
  "settings.help.heading": "Help",
  "settings.showHints.name": "Show contextual tips",
  "settings.showHints.desc":
    'Show the dismissible "How this works" callouts at the top of panels. Tips you dismiss stay hidden until you reset them below.',
  "settings.resetTips.name": "Reset tips & replay welcome",
  "settings.resetTips.desc": "Re-enable every dismissed tip and show the welcome screen again.",
  "settings.resetTips.done": "Tips reset.",

  // --- Restore settings modal ------------------------------------------------
  "settings.restore.placeholder": "Restore settings from the backup of…",

  // --- Optional features (src/features.ts) -------------------------------------
  "feature.group.planning": "Planning",
  "feature.group.revision": "Revision",
  "feature.group.publishing": "Publishing",
  "feature.group.writing": "Writing",
  "feature.beats.label": "Beats",
  "feature.beats.desc": "The beat-sheet planner (Plan → Beats) and its scene scaffolding.",
  "feature.board.label": "Board",
  "feature.board.desc": "The Kanban board view of your scenes (Plan → Structure → Board).",
  "feature.plotGrid.label": "Plot grid",
  "feature.plotGrid.desc":
    "The plotline × chapter matrix (Plan → Structure → Grid) and the scene Plotlines field.",
  "feature.audit.label": "Revision audit",
  "feature.audit.desc": "The revision audit checklists and character-arc tracker (Revise → Audit).",
  "feature.analysis.label": "Analysis",
  "feature.analysis.desc": "Readability, word-frequency, and echo analysis (Revise → Analysis).",
  "feature.checklist.label": "Publishing checklist",
  "feature.checklist.desc": "The self-publishing task checklist (Publish → Checklist).",
  "feature.launch.label": "Launch planner",
  "feature.launch.desc": "The pre-order timeline and launch trackers (Publish → Launch).",
  "feature.prompts.label": "Writing prompts",
  "feature.prompts.desc": "The writing-prompt / ideation button on the Write toolbar.",
  "feature.stream.label": "Scene stream",
  "feature.stream.desc":
    "Write's Stream view: read and edit a book's scenes as one continuous page. Not shown on phones.",
  "feature.tracking.label": "Tracking",
  "feature.tracking.desc":
    "Word goals, writing sprints, the status-bar counter, and the Track dashboard. Words are still logged while hidden, so turning it back on shows the full history.",

  // --- Shared helpers (src/lib) ------------------------------------------------
  "lib.hideMenu.item": "Hide {label}",
  "lib.hideMenu.hidden": "{label} hidden.",
  "lib.hideMenu.notice": "{hidden} {undo} — or turn it back on under Customize → Features.",
  "lib.hideMenu.undo": "Undo",
  "lib.listEditor.moveUp": "Move up",
  "lib.listEditor.moveDown": "Move down",
  "lib.phoneRedirect.title": "{surface} needs a larger screen",
  "lib.phoneRedirect.body":
    "Open this project on a tablet or desktop for this view. Drafting and your scene list work here on a phone.",
  "lib.phoneRedirect.useFullLayout": "Not a phone? Use the full layout",
  "lib.rowMenu.more": "More actions",
  "lib.images.pickPlaceholder": "Choose an image from the vault…",
  "lib.relativeTime.justNow": "just now",
  "lib.relativeTime.minutes.one": "{count}m ago",
  "lib.relativeTime.minutes.other": "{count}m ago",
  "lib.relativeTime.hours.one": "{count}h ago",
  "lib.relativeTime.hours.other": "{count}h ago",
  "lib.relativeTime.days.one": "{count}d ago",
  "lib.relativeTime.days.other": "{count}d ago",
  "lib.relativeTime.weeks.one": "{count}w ago",
  "lib.relativeTime.weeks.other": "{count}w ago",
  "lib.relativeTime.months.one": "{count}mo ago",
  "lib.relativeTime.months.other": "{count}mo ago",
  "lib.relativeTime.years.one": "{count}y ago",
  "lib.relativeTime.years.other": "{count}y ago",
  "lib.settingsSummary.none": "no settings",
  "lib.settingsSummary.customTypes.one": "{count} custom codex type",
  "lib.settingsSummary.customTypes.other": "{count} custom codex types",
  "lib.settingsSummary.renamedTypes.one": "{count} renamed type",
  "lib.settingsSummary.renamedTypes.other": "{count} renamed types",
  "lib.settingsSummary.beatTemplates.one": "{count} beat template",
  "lib.settingsSummary.beatTemplates.other": "{count} beat templates",
  "lib.settingsSummary.lists.one": "{count} customized list",
  "lib.settingsSummary.lists.other": "{count} customized lists",
  "lib.settingsSummary.rail": "rail arranged",
  "lib.settingsSummary.challenge": "writing challenge",
  "lib.settingsSummary.defaults": "default settings",

  // --- Customize → catalog -----------------------------------------------------
  "customize.group.codex": "Codex",
  "customize.group.plan": "Plan",
  "customize.group.write": "Write",
  "customize.group.revise": "Revise",
  "customize.group.publish": "Publish",
  "customize.group.inkswell": "Inkswell",
  "customize.entry.codexTypes": "Codex types & fields",
  "customize.entry.beatTemplates": "Beat templates",
  "customize.entry.sceneTemplate": "Scene template",
  "customize.entry.sceneStatuses": "Scene statuses",
  "customize.entry.sceneFields": "Scene inspector fields",
  "customize.entry.writingPrompts": "Writing prompts",
  "customize.entry.todoMarkers": "To-do markers",
  "customize.entry.revisionChecklists": "Revision checklists",
  "customize.entry.publishingChecklist": "Publishing checklist",
  "customize.entry.features": "Features",

  // --- Customize → panel -------------------------------------------------------
  "customize.badge.hidden": "hidden",
  "customize.badge.yours": "yours",
  "customize.hiddenFeature": "This feature is currently hidden. {link}.",
  "customize.hiddenFeature.link": "Turn it on under Features",

  // --- Customize → catalog-row summaries (joined with " · ") ------------------
  "customize.summary.builtIn.one": "{count} built-in",
  "customize.summary.builtIn.other": "{count} built-in",
  "customize.summary.yours.one": "{count} yours",
  "customize.summary.yours.other": "{count} yours",
  "customize.summary.hidden.one": "{count} hidden",
  "customize.summary.hidden.other": "{count} hidden",
  "customize.summary.renamed.one": "{count} renamed",
  "customize.summary.renamed.other": "{count} renamed",
  "customize.summary.custom.one": "{count} custom",
  "customize.summary.custom.other": "{count} custom",
  "customize.summary.reordered": "reordered",
  "customize.summary.customized": "Customized",

  // --- Customize → list editor (override-editor.ts) ----------------------------
  "list.addGroup": "Add group…",
  "list.newGroup": "New group",
  "list.groupName": "Group name",
  "list.showGroup": "Show group",
  "list.hideGroup": "Hide group",
  "list.removeGroup": "Remove group",
  "list.wasLabel": "was “{label}”",
  "list.show": "Show",
  "list.hide": "Hide",
  "list.restoreName": "Restore shipped name",
  "list.removed": "Removed \"{label}\". Anything already ticked under it stays in your notes.",
  "list.resetDefaults": "Reset to Inkswell's defaults",
  "list.meta.auditScene": "Scene checkpoints",
  "list.meta.auditStory": "Story checkpoints",
  "list.meta.auditChapter": "Chapter checkpoints",
  "list.meta.auditPage": "Prose checkpoints",
  "list.task.empty": "No tasks here yet.",
  "list.task.add": "Add task…",
  "list.task.new": "New task",
  "list.task.aria": "task label",
  "list.checkpoint.empty": "No checkpoints here yet.",
  "list.checkpoint.add": "Add checkpoint…",
  "list.checkpoint.new": "New checkpoint",
  "list.checkpoint.aria": "checkpoint label",
  "list.field.empty": "No fields here yet.",
  "list.field.add": "Add field…",
  "list.field.new": "New field",
  "list.field.aria": "field label",
  "list.status.empty": "No statuses here yet.",
  "list.status.add": "Add status…",
  "list.status.new": "New status",
  "list.status.aria": "status label",
  "list.marker.empty": "No markers here yet.",
  "list.marker.add": "Add marker…",
  "list.marker.new": "New marker",
  "list.marker.aria": "marker label",
  "list.prompt.empty": "No prompts here yet.",
  "list.prompt.add": "Add prompt…",
  "list.prompt.new": "New prompt",
  "list.prompt.aria": "prompt label",

  // --- Customize → fields editor (field-spec*.ts) ------------------------------
  "customize.fieldKind.text": "Text",
  "customize.fieldKind.textarea": "Long text",
  "customize.fieldKind.number": "Number",
  "customize.fieldKind.date": "Date",
  "customize.fieldKind.list": "List",
  "customize.fieldKind.image": "Image",
  "customize.fieldKind.links": "Links",
  "customize.fieldKind.link": "Single link",
  "customize.fields.startWithLetter": "Start the label with a letter.",
  "customize.fields.enterLabel": "Enter a label.",
  "customize.fields.reserved": "\"{key}\" is managed by Inkswell.",
  "customize.fields.duplicate": "\"{key}\" is already a field.",
  "customize.fields.badKey": "Use letters and numbers (no spaces or symbols).",
  "customize.fields.createTemplateFailed": "Couldn't create the template note.",
  "customize.fields.saveFailed": "Couldn't save the fields.",
  "customize.fields.resetFailed": "Couldn't reset the fields.",
  "customize.fields.labelPlaceholder": "Label",
  "customize.fields.labelAria": "Label for {key}",
  "customize.fields.kindAria": "Type of {key}",
  "customize.fields.anyType": "Any type",
  "customize.fields.typeEither": "{first} or {second}",
  "customize.fields.restrictAria": "Restrict {key} to a type",
  "customize.fields.perLinkLabels": "Per-link labels",
  "customize.fields.add": "Add field…",
  "customize.addField.title": "Add field",
  "customize.addField.label": "Label",
  "customize.addField.labelPlaceholder": "e.g. Birth date",
  "customize.addField.kind": "Kind",
  "customize.addField.builtin.name": "Or add one of Inkswell's built-in fields",
  "customize.addField.builtin.desc":
    "Keeps its label and picker — a bestiary can borrow Relationships, for example.",
  "customize.addField.storedAs": "Stored as {key}",

  // --- Customize → template body editor ----------------------------------------
  "customize.templateBody.create": "Create template note",
  "customize.templateBody.loading": "Loading…",
  "customize.templateBody.saveFailed": "Couldn't save the template.",
  "customize.templateBody.open": "Open template note",
  "customize.templateBody.openAria": "Open {path} in a tab (for frontmatter edits)",

  // --- Customize → Codex types -------------------------------------------------
  "customize.codex.intro":
    "Each codex type has a display (name, plural, icon), the fields its entries show in the Codex panel, and the starter content a new entry begins with. Fields and starter content live in an ordinary template note — editing here edits that note.",
  "customize.codex.rowDescRenamed": "{plural} · codex: {id} · renamed from {shipped}",
  "customize.codex.rowDesc": "{plural} · codex: {id}",
  "customize.codex.rowDescCustom": "{plural} · codex: {id} · custom",
  "customize.codex.entries.one": "{count} entry",
  "customize.codex.entries.other": "{count} entries",
  "customize.codex.fieldsFrom": "Fields: {name}",
  "customize.codex.fieldsShipped": "Fields: shipped",
  "customize.codex.editDisplay": "Edit display…",
  "customize.codex.deleteType": "Delete type…",
  "customize.codex.newType": "New type…",
  "customize.codex.generate": "Generate all starter templates",
  "customize.codex.generateAria":
    "Create a template note for every type that lacks one (plus Scene.md and a README)",
  "customize.codex.vaultRoot": "(vault root)",
  "customize.codex.generateFailed": "Couldn't generate the starter templates.",
  "customize.codex.generated.one": "Created {count} template in \"{folder}\".",
  "customize.codex.generated.other": "Created {count} templates in \"{folder}\".",
  "customize.codex.generatedNone": "Templates already exist — nothing to create.",
  "customize.codex.back": "‹ Codex types",
  "customize.codex.gone": "That type no longer exists.",
  "customize.codex.idLine": "codex: {id}",
  "customize.codex.card.display": "Display",
  "customize.codex.card.fields": "Fields",
  "customize.codex.card.starter": "Starter content",
  "customize.codex.starterHint":
    "This is what a new entry starts with. {{title}} becomes the entry's name. Inkswell adds codex: and the project/series scope itself — don't add a codex: key.",
  "customize.codex.starterNone": "No template note yet — new {plural} start with a heading only.",
  "customize.codex.display.name": "Name",
  "customize.codex.display.plural": "Plural",
  "customize.codex.display.icon": "Icon",
  "customize.codex.display.shipped": "Shipped as {label} / {plural} / {icon}. Entries keep codex: {id}.",
  "customize.codex.display.edit": "Edit…",
  "customize.codex.display.reset": "Reset to default",
  "customize.codex.fieldsSource": "Fields from {link}. Aliases always comes first.",
  "customize.codex.fieldsSourceShipped":
    "Using Inkswell's shipped fields. Your first change creates a template note for this type and records the fields there. Aliases always comes first.",
  "customize.codex.fieldsEmpty": "No fields yet — add one below.",
  "customize.codex.fieldsReset": "Reset to shipped fields",
  "customize.codex.fieldsResetConfirm":
    "Use Inkswell's shipped fields for {type}? This removes the codex-fields property from {template} — existing entries keep their frontmatter.",
  "customize.codex.fieldsResetConfirmNoTemplate":
    "Use Inkswell's shipped fields for {type}? This removes the codex-fields property from the template — existing entries keep their frontmatter.",
  "customize.codex.fieldsLabelDesc": "What the Codex panel shows. The stored key is derived from it.",
  "customize.codex.builtinField.generic": "{label} (custom types)",
  "customize.codex.builtinField.type": "{label} ({type})",

  // --- Customize → Beat templates ----------------------------------------------
  "customize.beats.intro":
    "Beat structures for Plan → Beats. Built-ins can't change, but duplicating one gives you an editable copy. Your templates appear in the picker in the order below.",
  "customize.beats.builtIn": "Built-in",
  "customize.beats.rowDesc.one": "{count} beat · template: {id}",
  "customize.beats.rowDesc.other": "{count} beats · template: {id}",
  "customize.beats.duplicateAsCustom": "Duplicate as custom",
  "customize.beats.yours": "Yours",
  "customize.beats.empty": "No templates of your own yet — duplicate a built-in or start a new one.",
  "customize.beats.editBeats": "Edit beats",
  "customize.beats.duplicate": "Duplicate",
  "customize.beats.newTemplate": "New template…",
  "customize.beats.created": "Created \"{name}\".",
  "customize.beats.back": "‹ Beat templates",
  "customize.beats.gone": "That template no longer exists.",
  "customize.beats.idLine": "template: {id}",
  "customize.beats.rename": "Rename…",
  "customize.beats.pageIntro":
    "Beats in book order. \"At %\" is where the beat sits in the manuscript. A beat's name is its key: renaming one starts its saved notes fresh (rename it back to recover them); reordering and rewording the purpose are always safe.",
  "customize.beats.noBeats": "No beats yet.",
  "customize.beats.namePlaceholder": "Beat name",
  "customize.beats.nameAria": "Beat name",
  "customize.beats.atAria": "Position in the book, percent",
  "customize.beats.purposePlaceholder": "Purpose (optional)",
  "customize.beats.purposeAria": "Beat purpose",
  "customize.beats.needOne": "A template needs at least one beat.",
  "customize.beats.addBeat": "Add beat…",
  "customize.beats.editAsText": "Edit as text…",
  "customize.beats.textHelp":
    "One beat per line: “Name”, “Name | purpose”, or “25% | Name | purpose”. Apply replaces the list above.",
  "customize.beats.apply": "Apply",
  "customize.beats.addModal.title": "Add beat",
  "customize.beats.addModal.name": "Name",
  "customize.beats.addModal.nameDesc": "Also the beat's key (slugified).",
  "customize.beats.addModal.namePlaceholder": "e.g. Midpoint",
  "customize.beats.addModal.purpose": "Purpose",
  "customize.beats.addModal.purposePlaceholder": "Optional one-liner",
  "customize.beats.nameRequired": "Name is required.",
  "customize.beats.nameNeedsChars": "Name must contain letters or numbers.",
  "customize.beats.renameModal.title": "Rename template",
  "customize.beats.renameModal.name": "Name",
  "customize.beats.renameModal.nameDesc":
    "Display name only — the template id (and every project using it) is unchanged.",

  // --- Customize → Scene template ----------------------------------------------
  "customize.sceneTemplate.using": "Using Templates/Scene.md",
  "customize.sceneTemplate.default": "Default (empty scene)",
  "customize.sceneTemplate.intro":
    "Every scene Inkswell creates starts from this note: its frontmatter and body are copied in and {{title}} becomes the scene's name. Without one, new scenes start empty.",
  "customize.sceneTemplate.projectOwn":
    "The active project uses its own template instead: {template} (the sceneTemplate key on its index note).",
  "customize.sceneTemplate.card": "Starter content",
  "customize.sceneTemplate.hint":
    "{{title}} becomes the scene's name. A status: key here sets the default status (otherwise new scenes get status: idea); a synopsis Inkswell seeds itself always wins.",
  "customize.sceneTemplate.none": "No template note yet ({path}) — new scenes start empty.",

  // --- Customize → Scene statuses ----------------------------------------------
  "customize.statuses.defaults": "Idea → Final (defaults)",
  "customize.statuses.intro":
    "Rename a status to match your process (“Draft 1”, “Polish”, “Locked”), hide the ones you don't use, and set the order the Board and pickers show them in. Scenes keep their stored value either way, so this is safe to change mid-book; a scene on a hidden status still shows it, marked hidden. New statuses can't be added in this version.",

  // --- Customize → Scene inspector fields --------------------------------------
  "customize.sceneFields.own.one": "{count} of your own",
  "customize.sceneFields.own.other": "{count} of your own",
  "customize.sceneFields.defaults": "All fields (defaults)",
  "customize.sceneFields.card.layout": "Layout",
  "customize.sceneFields.layoutIntro":
    "Choose which fields the scene inspector shows and in what order. Hide the ones you don't use, or move Notes up if you draft against an outline. “Your fields” is the block of fields you add below. Hiding a field only hides it here — scenes keep whatever they already store, and unhiding brings it straight back.",
  "customize.sceneFields.card.own": "Your fields",
  "customize.sceneFields.ownIntro":
    "Add fields for your own process — Story Grid's Five Commandments, a scene's goal and disaster — and they appear in every scene's inspector. Each is saved as an ordinary property on the scene; removing a field here never deletes what you wrote.",
  "customize.sceneFields.storedIn": "Stored in {link} (shared by every project).",
  "customize.sceneFields.firstCreates":
    "Your first field creates the scene template note and records them there.",
  "customize.sceneFields.empty": "No fields of your own yet.",
  "customize.sceneFields.reset": "Remove all your fields",
  "customize.sceneFields.resetConfirm":
    "Remove every field of your own? This deletes the {key} property from {template} — scenes keep the values they already store.",
  "customize.sceneFields.resetConfirmNoTemplate":
    "Remove every field of your own? This deletes the {key} property from the scene template — scenes keep the values they already store.",
  "customize.sceneFields.labelDesc":
    "What the scene inspector shows. The stored property name is derived from it.",

  // --- Customize → Writing prompts ---------------------------------------------
  "customize.prompts.intro":
    "The prompts behind the Write toolbar's Prompt button. Hide the ones you never want to see again, reword any, or add your own — write {pov} where the scene's POV character's name should go. Each prompt has a phase (drafting or revising) and a category the button filters on — change either on any prompt, including the built-in ones.",
  "customize.prompts.phase.draft": "Drafting",
  "customize.prompts.phase.revise": "Revising",
  "customize.prompts.phaseAria": "Phase",
  "customize.prompts.categoryAria": "Category",

  // --- Customize → To-do markers -----------------------------------------------
  "customize.markers.intro":
    "Markers you drop into your prose to come back to later — [TODO: …], [RESEARCH: …] and the rest — then find in Revise → Revision log. Compiling removes them all. To use a different word, add your own marker (and hide the built-in one if you like). Hiding a marker only takes it out of the Insert menu: markers already in your scenes are still found and still removed when you compile.",
  "customize.markers.wordPrompt": "Word to type in your scenes (e.g. CHECK)",
  "customize.markers.invalidWord":
    "A marker word starts with a letter and uses 2–20 letters, digits or hyphens. Use an alphabet with capital letters (like A–Z), so Inkswell can find it in your text.",
  "customize.markers.taken": "[{keyword}] is already a marker.",
  "customize.markers.inactive": "word already used — inactive",
  "customize.markers.removeConfirm":
    "Remove \"{label}\"? Markers already in your scenes typed as [{keyword}: …] won't be found in the revision log or removed when you compile. To keep them working, hide the marker instead.",
  "customize.markers.removed":
    "Removed \"{label}\". Any [{keyword}: …] markers stay in your scenes as plain text.",

  // --- Customize → Publishing checklist ----------------------------------------
  "customize.publishing.defaults": "{phases} · {tasks} (defaults)",
  "customize.publishing.phases.one": "{count} phase",
  "customize.publishing.phases.other": "{count} phases",
  "customize.publishing.tasks.one": "{count} task",
  "customize.publishing.tasks.other": "{count} tasks",
  "customize.publishing.intro":
    "Publish → Checklist, phase by phase. Hide phases or tasks that don't apply to your route, rename any, reorder, and add your own. Ticks are stored per project under the task's id, so nothing you've already checked is lost when you hide or rename.",
  "customize.publishing.optional": "Optional",

  // --- Customize → Features ----------------------------------------------------
  "customize.features.allShown": "Everything shown",
  "customize.features.hidden": "{count} of {total} hidden",
  "customize.features.intro":
    "Hide surfaces you don't use to keep Inkswell lean. Hiding only hides — your notes and data are kept, and turning a feature back on restores everything. You can also right-click an optional tab anywhere in the app to hide it.",
} as const;
