/** Simplified Chinese UI strings — the `settings` area (mirrors ../en/settings.ts). */
import type { Catalog } from "../types";

export const settings: Catalog = {
  // --- Settings tab ------------------------------------------------------------
  "settings.customize.name": "自定义 Inkswell",
  "settings.customize.desc":
    "设定集类型与字段、初始模板、节拍结构、场景状态、写作提示、清单，以及要显示哪些功能，全部在 Inkswell 内编辑。",
  "settings.customize.button": "打开自定义",
  "settings.defaultCompileFormat.name": "默认编译格式",
  "settings.defaultCompileFormat.desc": "打开编译对话框时预先选中的格式。",
  "settings.showWordCounts.name": "显示字数",
  "settings.showWordCounts.desc": "在项目浏览器中显示每个场景和每个项目的字数。",
  "settings.hideArchived.name": "在系列中隐藏已归档的书",
  "settings.hideArchived.desc":
    "已归档的书会离开系列书架和主页上的系列封面，归入“已归档”分区下对应的系列名中，适合发表后就归档的短篇小说。关闭时，已归档的书仍留在系列书架上，以淡色显示。",
  "settings.syncHistory.name": "跨设备同步写作记录",
  "settings.syncHistory.desc":
    "字数在你打字的设备上统计。开启后，每台设备会在基础文件夹的“Writing log”文件夹中保存一份小型日志笔记，并在追踪中合并，因此连续天数和总计会包含所有设备。这些笔记由你仓库自身的同步方式（Obsidian Sync、iCloud 等）同步。",
  "settings.sceneHeadingLevel.name": "场景标题级别",
  "settings.sceneHeadingLevel.desc": "可选编译步骤“在前面加标题”所用的标题级别（1–6）。",

  // --- Settings → Manuscript -------------------------------------------------
  "settings.manuscript.heading": "书稿",
  "settings.authorName.name": "你的姓名",
  "settings.authorName.desc":
    "你的真实姓名，用于 Word 书稿的扉页。书的署名（笔名）可以不同，在“发布 → 编译”中设置。",
  "settings.authorContact.name": "联系方式",
  "settings.authorContact.desc":
    "地址、邮箱、电话，每行一项，显示在扉页你的姓名下方。",
  "settings.compileFormat.md": "Markdown",
  "settings.compileFormat.html": "HTML",
  "settings.compileFormat.docx": "Word (.docx)",
  "settings.compileFormat.pandoc": "Pandoc (docx/pdf/epub)",
  "settings.interfaceLanguage.name": "界面语言",
  "lib.rowMenu.openInTabHint": "按住 Ctrl/Cmd 点击可在新标签页中打开",
  "settings.interfaceLanguage.desc":
    "如果有已审校的翻译，Inkswell 会跟随 Obsidian 的语言。在这里选择一种语言可覆盖该设置，包括草稿翻译。已写入笔记的文本保持不变。",
  "settings.interfaceLanguage.auto": "与 Obsidian 相同",
  "settings.interfaceLanguage.draft": "{name}（草稿，欢迎帮助审校）",
  "settings.interfaceLanguage.applied": "语言已更改。命令名称、此设置页和手机标签栏会在重启 Obsidian 后切换。",
  "settings.companionSceneTarget.name": "从侧边栏打开场景的位置",
  "settings.companionSceneTarget.desc":
    "在侧栏面板中点击场景时在哪里打开。按住 Ctrl/Cmd 点击始终在新标签页中打开。",
  "settings.companionSceneTarget.write": "Inkswell 写作",
  "settings.companionSceneTarget.tab": "普通标签页",

  // --- Settings → Write editor -----------------------------------------------
  "settings.writeEditor.heading": "写作编辑器",
  "settings.typewriterMode.name": "打字机模式",
  "settings.typewriterMode.desc":
    "让你正在输入的那一行在写作编辑器中保持垂直居中，视线不必移动。鼠标点击不会重新居中。也可以使用命令“切换打字机模式（写作编辑器）”。",
  "settings.manuscriptTypography.name": "书稿排版",
  "settings.manuscriptTypography.desc":
    "在写作编辑器中使用书籍式排版：段落首行缩进（标题或场景分隔后的第一段除外），标题居中。仅影响显示，你的文本不会改变。字体跟随 Obsidian 的“外观 → 文本字体”。",
  "settings.smartDashes.name": "智能破折号",
  "settings.smartDashes.desc":
    "在写作编辑器中，输入 -- 会变成短破折号（–），再输入一个 - 会变成长破折号（—）。整行的短横线（---）不受影响。仅作用于 Inkswell 的写作编辑器，不影响 Obsidian 的笔记。",
  "settings.smartQuotes.name": "智能引号",
  "settings.smartQuotes.desc":
    "在写作编辑器中输入的直引号会变成弯引号（“ ” 和 ‘ ’），撇号会变成 ’。代码和链接内不做替换。",
  "settings.smartEllipsis.name": "智能省略号",
  "settings.smartEllipsis.desc": "在写作编辑器中连续输入三个句点会变成省略号（…）。",
  "settings.milestoneWords.name": "里程碑标签间隔…",
  "settings.milestoneWords.desc":
    "当场景的累计字数每超过这个数的整数倍时，在写作编辑器页边对应的行上放一个小标签（例如 500 → 在 500、1k、1.5k… 处标记）。0 = 关闭；最小值为 100。",

  // --- Settings → Goals & sprints --------------------------------------------
  "settings.goals.heading": "目标与冲刺",
  "settings.weekStart.name": "每周起始日",
  "settings.weekStart.desc": "每周目标、习惯追踪和热力图所用的一周第一天。",
  "settings.weekStart.monday": "星期一",
  "settings.weekStart.sunday": "星期日",
  "settings.dailyWordGoal.name": "每日字数目标",
  "settings.dailyWordGoal.desc": "每天的目标字数，显示在状态栏和统计中。",
  "settings.weeklyWordGoal.name": "每周字数目标",
  "settings.weeklyWordGoal.desc": "每周的目标字数（本周首日→今天）。",
  "settings.monthlyWordGoal.name": "每月字数目标",
  "settings.monthlyWordGoal.desc": "每月的目标字数（1 日→今天）。",
  "settings.habitDaysPerWeek.name": "习惯：每周天数",
  "settings.habitDaysPerWeek.desc": "你计划每周写作几天。",
  "settings.habitMinWords.name": "习惯：每日最少字数",
  "settings.habitMinWords.desc": "一天至少写多少字才计入习惯。",
  "settings.defaultSprintMinutes.name": "默认冲刺时长",
  "settings.defaultSprintMinutes.desc": "默认的冲刺时长（分钟）。",
  "settings.defaultSprintWordGoal.name": "默认冲刺字数目标",
  "settings.defaultSprintWordGoal.desc": "冲刺对话框中预填的字数目标。0 = 无目标。",
  "settings.streakThreshold.name": "连续写作门槛",
  "settings.streakThreshold.desc": "一天至少写多少字才能延续你的连续写作天数。",

  // --- Settings → What counts toward goals -----------------------------------
  "settings.counts.heading": "哪些内容计入目标",
  "settings.counts.intro":
    "目标、连续天数和冲刺只统计项目笔记中的写作，仓库其他位置的笔记从不计入。选择要计入的类型。切换开关时，自此选项推出以来已写的字数也会重新统计；更早的记录始终计入。",
  "settings.counts.scene.name": "书稿场景",
  "settings.counts.scene.desc": "场景文件和单笔记项目，即书稿本身。",
  "settings.counts.planning.name": "规划笔记",
  "settings.counts.planning.desc": "每个项目的规划笔记（梗概、情节铺垫、分幕草图）。",
  "settings.counts.codex.name": "设定集笔记",
  "settings.counts.codex.desc": "带有 codex 键的笔记（人物、地点、背景设定），无论存放在哪里。",
  "settings.counts.other.name": "其他项目笔记",
  "settings.counts.other.desc": "项目索引笔记以及项目文件夹内的其他笔记。",

  // --- Settings → Folders ----------------------------------------------------
  "settings.folders.heading": "文件夹",
  "settings.baseFolder.name": "基础文件夹",
  "settings.baseFolder.desc":
    "新项目和共享设定集结构所在的文件夹。留空 = 仓库根目录。这只决定新内容创建在哪里，仓库中任何位置已有的项目和设定集都照常可用。",
  "settings.baseFolder.placeholder": "（仓库根目录）",
  "settings.codexFolder.name": "设定集文件夹名称",
  "settings.codexFolder.desc": "设定集笔记使用的子文件夹名称（共享和按项目的都用这个名称）。",
  "settings.coLocateCodex.name": "设定集与项目放在一起",
  "settings.coLocateCodex.desc":
    "限于单本书的条目创建在该项目自己的设定集文件夹中；系列和全局条目放在共享的基础设定集中。这只影响组织方式：条目在哪里可见由它的“范围”字段决定，与笔记存放位置无关。",

  // --- Settings → Layout -----------------------------------------------------
  "settings.layout.heading": "布局",
  "settings.forceTablet.name": "在此设备上使用完整布局",
  "settings.forceTablet.desc":
    "Obsidian 将这块屏幕识别为手机尺寸，所以 Inkswell 显示手机布局，并在规划和发布中显示“需要更大的屏幕”提示。如果你使用的是平板，请开启此项。",

  // --- Settings → Help -------------------------------------------------------
  "settings.help.heading": "帮助",
  "settings.showHints.name": "显示情境提示",
  "settings.showHints.desc":
    "在面板顶部显示可关闭的“使用说明”提示框。你关闭的提示会一直隐藏，直到你在下方重置。",
  "settings.resetTips.name": "重置提示并重新显示欢迎页",
  "settings.resetTips.desc": "重新启用所有已关闭的提示，并再次显示欢迎页。",
  "settings.resetTips.done": "提示已重置。",

  // --- Restore settings modal ------------------------------------------------
  "settings.restore.placeholder": "从以下日期的备份恢复设置…",

  // --- Optional features (src/features.ts) -------------------------------------
  "feature.group.planning": "规划",
  "feature.group.revision": "修订",
  "feature.group.publishing": "出版",
  "feature.group.writing": "写作",
  "feature.beats.label": "节拍",
  "feature.beats.desc": "节拍表规划器（规划 → 节拍）及其场景框架。",
  "feature.board.label": "卡片板",
  "feature.board.desc": "以看板形式查看场景（规划 → 结构 → 卡片板）。",
  "feature.plotGrid.label": "情节网格",
  "feature.plotGrid.desc":
    "情节线 × 章节矩阵（规划 → 结构 → 网格）以及场景的“情节线”字段。",
  "feature.audit.label": "修订检查",
  "feature.audit.desc": "修订检查清单和人物弧光追踪（修订 → 检查）。",
  "feature.analysis.label": "分析",
  "feature.analysis.desc": "可读性、词频和重复用词分析（修订 → 分析）。",
  "feature.checklist.label": "出版清单",
  "feature.checklist.desc": "自出版任务清单（发布 → 清单）。",
  "feature.launch.label": "上市规划",
  "feature.launch.desc": "预售时间线和上市追踪（发布 → 上市）。",
  "feature.prompts.label": "写作提示",
  "feature.prompts.desc": "写作工具栏上的写作提示/构思按钮。",
  "feature.stream.label": "场景连读",
  "feature.stream.desc":
    "写作的连读视图：把一本书的所有场景当作一整页连续阅读和编辑。手机上不显示。",
  "feature.tracking.label": "追踪",
  "feature.tracking.desc":
    "字数目标、写作冲刺、状态栏计数器和追踪仪表盘。隐藏期间仍会记录字数，重新开启后可看到完整记录。",

  // --- Shared helpers (src/lib) ------------------------------------------------
  "lib.hideMenu.item": "隐藏{label}",
  "lib.hideMenu.hidden": "已隐藏{label}。",
  "lib.hideMenu.notice": "{hidden} {undo}，也可以在“自定义 → 功能”中重新开启。",
  "lib.hideMenu.undo": "撤销",
  "lib.listEditor.moveUp": "上移",
  "lib.listEditor.moveDown": "下移",
  "lib.phoneRedirect.title": "{surface}需要更大的屏幕",
  "lib.phoneRedirect.body":
    "请在平板或电脑上打开此项目来使用这个视图。在手机上可以起草和使用场景列表。",
  "lib.phoneRedirect.useFullLayout": "不是手机？使用完整布局",
  "lib.rowMenu.more": "更多操作",
  "lib.images.pickPlaceholder": "从仓库中选择图片…",
  "lib.relativeTime.justNow": "刚刚",
  "lib.relativeTime.minutes.one": "{count} 分钟前",
  "lib.relativeTime.minutes.other": "{count} 分钟前",
  "lib.relativeTime.hours.one": "{count} 小时前",
  "lib.relativeTime.hours.other": "{count} 小时前",
  "lib.relativeTime.days.one": "{count} 天前",
  "lib.relativeTime.days.other": "{count} 天前",
  "lib.relativeTime.weeks.one": "{count} 周前",
  "lib.relativeTime.weeks.other": "{count} 周前",
  "lib.relativeTime.months.one": "{count} 个月前",
  "lib.relativeTime.months.other": "{count} 个月前",
  "lib.relativeTime.years.one": "{count} 年前",
  "lib.relativeTime.years.other": "{count} 年前",
  "lib.settingsSummary.none": "无设置",
  "lib.settingsSummary.customTypes.one": "{count} 个自定义设定集类型",
  "lib.settingsSummary.customTypes.other": "{count} 个自定义设定集类型",
  "lib.settingsSummary.renamedTypes.one": "{count} 个重命名的类型",
  "lib.settingsSummary.renamedTypes.other": "{count} 个重命名的类型",
  "lib.settingsSummary.beatTemplates.one": "{count} 个节拍模板",
  "lib.settingsSummary.beatTemplates.other": "{count} 个节拍模板",
  "lib.settingsSummary.lists.one": "{count} 个自定义列表",
  "lib.settingsSummary.lists.other": "{count} 个自定义列表",
  "lib.settingsSummary.rail": "导航栏排列",
  "lib.settingsSummary.challenge": "写作挑战",
  "lib.settingsSummary.defaults": "默认设置",

  // --- Customize → catalog -----------------------------------------------------
  "customize.group.codex": "设定集",
  "customize.group.plan": "规划",
  "customize.group.write": "写作",
  "customize.group.revise": "修订",
  "customize.group.publish": "发布",
  "customize.group.inkswell": "Inkswell",
  "customize.entry.codexTypes": "设定集类型与字段",
  "customize.entry.beatTemplates": "节拍模板",
  "customize.entry.sceneTemplate": "场景模板",
  "customize.entry.sceneStatuses": "场景状态",
  "customize.entry.sceneFields": "场景检查器字段",
  "customize.entry.writingPrompts": "写作提示",
  "customize.entry.todoMarkers": "待办标记",
  "customize.entry.revisionChecklists": "修订清单",
  "customize.entry.publishingChecklist": "出版清单",
  "customize.entry.features": "功能",

  // --- Customize → panel -------------------------------------------------------
  "customize.badge.hidden": "已隐藏",
  "customize.badge.yours": "你的",
  "customize.hiddenFeature": "此功能当前已隐藏。{link}。",
  "customize.hiddenFeature.link": "在“功能”中开启",

  // --- Customize → catalog-row summaries (joined with " · ") ------------------
  "customize.summary.builtIn.one": "{count} 个内置",
  "customize.summary.builtIn.other": "{count} 个内置",
  "customize.summary.yours.one": "{count} 个你的",
  "customize.summary.yours.other": "{count} 个你的",
  "customize.summary.hidden.one": "{count} 个已隐藏",
  "customize.summary.hidden.other": "{count} 个已隐藏",
  "customize.summary.renamed.one": "{count} 个已重命名",
  "customize.summary.renamed.other": "{count} 个已重命名",
  "customize.summary.custom.one": "{count} 个自定义",
  "customize.summary.custom.other": "{count} 个自定义",
  "customize.summary.reordered": "已调整顺序",
  "customize.summary.customized": "已自定义",

  // --- Customize → list editor (override-editor.ts) ----------------------------
  "list.addGroup": "添加分组…",
  "list.newGroup": "新分组",
  "list.groupName": "分组名称",
  "list.showGroup": "显示分组",
  "list.hideGroup": "隐藏分组",
  "list.removeGroup": "移除分组",
  "list.wasLabel": "原为“{label}”",
  "list.show": "显示",
  "list.hide": "隐藏",
  "list.restoreName": "恢复默认名称",
  "list.removed": "已移除“{label}”。其下已勾选的内容仍保留在你的笔记中。",
  "list.resetDefaults": "恢复 Inkswell 的默认设置",
  "list.meta.auditScene": "场景检查点",
  "list.meta.auditStory": "故事检查点",
  "list.meta.auditChapter": "章节检查点",
  "list.meta.auditPage": "文字检查点",
  "list.task.empty": "这里还没有任务。",
  "list.task.add": "添加任务…",
  "list.task.new": "新任务",
  "list.task.aria": "任务名称",
  "list.checkpoint.empty": "这里还没有检查点。",
  "list.checkpoint.add": "添加检查点…",
  "list.checkpoint.new": "新检查点",
  "list.checkpoint.aria": "检查点名称",
  "list.field.empty": "这里还没有字段。",
  "list.field.add": "添加字段…",
  "list.field.new": "新字段",
  "list.field.aria": "字段名称",
  "list.status.empty": "这里还没有状态。",
  "list.status.add": "添加状态…",
  "list.status.new": "新状态",
  "list.status.aria": "状态名称",
  "list.marker.empty": "这里还没有标记。",
  "list.marker.add": "添加标记…",
  "list.marker.new": "新标记",
  "list.marker.aria": "标记名称",
  "list.prompt.empty": "这里还没有提示。",
  "list.prompt.add": "添加提示…",
  "list.prompt.new": "新提示",
  "list.prompt.aria": "提示内容",

  // --- Customize → fields editor (field-spec*.ts) ------------------------------
  "customize.fieldKind.text": "文本",
  "customize.fieldKind.textarea": "长文本",
  "customize.fieldKind.number": "数字",
  "customize.fieldKind.date": "日期",
  "customize.fieldKind.list": "列表",
  "customize.fieldKind.image": "图片",
  "customize.fieldKind.links": "多个链接",
  "customize.fieldKind.link": "单个链接",
  "customize.fields.startWithLetter": "名称须以字母开头。",
  "customize.fields.enterLabel": "请输入名称。",
  "customize.fields.reserved": "“{key}”由 Inkswell 管理。",
  "customize.fields.duplicate": "“{key}”已经是一个字段。",
  "customize.fields.badKey": "请使用字母和数字（不含空格或符号）。",
  "customize.fields.createTemplateFailed": "无法创建模板笔记。",
  "customize.fields.saveFailed": "无法保存字段。",
  "customize.fields.resetFailed": "无法重置字段。",
  "customize.fields.labelPlaceholder": "名称",
  "customize.fields.labelAria": "{key} 的名称",
  "customize.fields.kindAria": "{key} 的类型",
  "customize.fields.anyType": "任意类型",
  "customize.fields.typeEither": "{first}或{second}",
  "customize.fields.restrictAria": "将 {key} 限定为某一类型",
  "customize.fields.perLinkLabels": "每个链接单独标注",
  "customize.fields.add": "添加字段…",
  "customize.addField.title": "添加字段",
  "customize.addField.label": "名称",
  "customize.addField.labelPlaceholder": "例如：出生日期",
  "customize.addField.kind": "类型",
  "customize.addField.builtin.name": "或添加 Inkswell 的内置字段",
  "customize.addField.builtin.desc":
    "保留它的名称和选择器，例如怪物图鉴可以借用“关系”字段。",
  "customize.addField.storedAs": "存储为 {key}",

  // --- Customize → template body editor ----------------------------------------
  "customize.templateBody.create": "创建模板笔记",
  "customize.templateBody.loading": "加载中…",
  "customize.templateBody.saveFailed": "无法保存模板。",
  "customize.templateBody.open": "打开模板笔记",
  "customize.templateBody.openAria": "在标签页中打开 {path}（用于编辑属性）",

  // --- Customize → Codex types -------------------------------------------------
  "customize.codex.intro":
    "每个设定集类型都有显示设置（名称、复数形式、图标）、其条目在设定集面板中显示的字段，以及新条目的初始内容。字段和初始内容保存在一篇普通的模板笔记中，在这里编辑就是编辑那篇笔记。",
  "customize.codex.rowDescRenamed": "{plural} · codex: {id} · 由{shipped}重命名",
  "customize.codex.rowDesc": "{plural} · codex: {id}",
  "customize.codex.rowDescCustom": "{plural} · codex: {id} · 自定义",
  "customize.codex.entries.one": "{count} 个条目",
  "customize.codex.entries.other": "{count} 个条目",
  "customize.codex.fieldsFrom": "字段：{name}",
  "customize.codex.fieldsShipped": "字段：内置",
  "customize.codex.editDisplay": "编辑显示…",
  "customize.codex.deleteType": "删除类型…",
  "customize.codex.newType": "新建类型…",
  "customize.codex.generate": "生成全部初始模板",
  "customize.codex.generateAria":
    "为每个还没有模板笔记的类型创建一篇（另加 Scene.md 和一份 README）",
  "customize.codex.vaultRoot": "（仓库根目录）",
  "customize.codex.generateFailed": "无法生成初始模板。",
  "customize.codex.generated.one": "已在“{folder}”中创建 {count} 个模板。",
  "customize.codex.generated.other": "已在“{folder}”中创建 {count} 个模板。",
  "customize.codex.generatedNone": "模板已存在，无需创建。",
  "customize.codex.back": "‹ 设定集类型",
  "customize.codex.gone": "该类型已不存在。",
  "customize.codex.idLine": "codex: {id}",
  "customize.codex.card.display": "显示",
  "customize.codex.card.fields": "字段",
  "customize.codex.card.starter": "初始内容",
  "customize.codex.starterHint":
    "这是新条目的初始内容。{{title}} 会替换为条目名称。Inkswell 会自行添加 codex: 和项目/系列范围，请不要添加 codex: 键。",
  "customize.codex.starterNone": "还没有模板笔记，新的{plural}只会有一个标题。",
  "customize.codex.display.name": "名称",
  "customize.codex.display.plural": "复数形式",
  "customize.codex.display.icon": "图标",
  "customize.codex.display.shipped": "内置为 {label} / {plural} / {icon}。条目保留 codex: {id}。",
  "customize.codex.display.edit": "编辑…",
  "customize.codex.display.reset": "恢复默认",
  "customize.codex.fieldsSource": "字段来自 {link}。“别名”始终排在第一位。",
  "customize.codex.fieldsSourceShipped":
    "正在使用 Inkswell 的内置字段。你第一次修改时，会为此类型创建模板笔记并把字段记录在其中。“别名”始终排在第一位。",
  "customize.codex.fieldsEmpty": "还没有字段，请在下方添加。",
  "customize.codex.fieldsReset": "恢复内置字段",
  "customize.codex.fieldsResetConfirm":
    "为{type}使用 Inkswell 的内置字段？这会从 {template} 中移除 codex-fields 属性，已有条目的属性保持不变。",
  "customize.codex.fieldsResetConfirmNoTemplate":
    "为{type}使用 Inkswell 的内置字段？这会从模板中移除 codex-fields 属性，已有条目的属性保持不变。",
  "customize.codex.fieldsLabelDesc": "设定集面板中显示的名称。存储的键名由它生成。",
  "customize.codex.builtinField.generic": "{label}（自定义类型）",
  "customize.codex.builtinField.type": "{label}（{type}）",

  // --- Customize → Beat templates ----------------------------------------------
  "customize.beats.intro":
    "用于“规划 → 节拍”的节拍结构。内置模板无法修改，但复制一份即可得到可编辑的副本。你的模板会按下方顺序出现在选择器中。",
  "customize.beats.builtIn": "内置",
  "customize.beats.rowDesc.one": "{count} 个节拍 · 模板：{id}",
  "customize.beats.rowDesc.other": "{count} 个节拍 · 模板：{id}",
  "customize.beats.duplicateAsCustom": "复制为自定义模板",
  "customize.beats.yours": "你的",
  "customize.beats.empty": "你还没有自己的模板。复制一个内置模板，或新建一个。",
  "customize.beats.editBeats": "编辑节拍",
  "customize.beats.duplicate": "复制",
  "customize.beats.newTemplate": "新建模板…",
  "customize.beats.created": "已创建“{name}”。",
  "customize.beats.back": "‹ 节拍模板",
  "customize.beats.gone": "该模板已不存在。",
  "customize.beats.idLine": "模板：{id}",
  "customize.beats.rename": "重命名…",
  "customize.beats.pageIntro":
    "节拍按在书中的顺序排列。“位置 %”表示该节拍在书稿中的位置。节拍名称就是它的键：重命名后，它已保存的笔记会重新开始（改回原名即可找回）；调整顺序和改写用途说明则始终安全。",
  "customize.beats.noBeats": "还没有节拍。",
  "customize.beats.namePlaceholder": "节拍名称",
  "customize.beats.nameAria": "节拍名称",
  "customize.beats.atAria": "在书中的位置（百分比）",
  "customize.beats.purposePlaceholder": "用途（可选）",
  "customize.beats.purposeAria": "节拍用途",
  "customize.beats.needOne": "模板至少需要一个节拍。",
  "customize.beats.addBeat": "添加节拍…",
  "customize.beats.editAsText": "以文本编辑…",
  "customize.beats.textHelp":
    "每行一个节拍：“名称”、“名称 | 用途”或“25% | 名称 | 用途”。“应用”会替换上方的列表。",
  "customize.beats.apply": "应用",
  "customize.beats.addModal.title": "添加节拍",
  "customize.beats.addModal.name": "名称",
  "customize.beats.addModal.nameDesc": "同时也是节拍的键（会转换为短标识）。",
  "customize.beats.addModal.namePlaceholder": "例如：中点",
  "customize.beats.addModal.purpose": "用途",
  "customize.beats.addModal.purposePlaceholder": "可选的一句话说明",
  "customize.beats.nameRequired": "名称为必填项。",
  "customize.beats.nameNeedsChars": "名称必须包含字母或数字。",
  "customize.beats.renameModal.title": "重命名模板",
  "customize.beats.renameModal.name": "名称",
  "customize.beats.renameModal.nameDesc":
    "仅修改显示名称，模板 ID（以及使用它的所有项目）不变。",

  // --- Customize → Scene template ----------------------------------------------
  "customize.sceneTemplate.using": "正在使用 Templates/Scene.md",
  "customize.sceneTemplate.default": "默认（空场景）",
  "customize.sceneTemplate.intro":
    "Inkswell 创建的每个场景都以这篇笔记为起点：复制其属性和正文，并把 {{title}} 替换为场景名称。没有模板时，新场景为空。",
  "customize.sceneTemplate.projectOwn":
    "当前项目改用它自己的模板：{template}（其索引笔记上的 sceneTemplate 键）。",
  "customize.sceneTemplate.card": "初始内容",
  "customize.sceneTemplate.hint":
    "{{title}} 会替换为场景名称。在这里写 status: 键可设置默认状态（否则新场景为 status: idea）；Inkswell 自动填入的梗概始终优先。",
  "customize.sceneTemplate.none": "还没有模板笔记（{path}），新场景为空。",

  // --- Customize → Scene statuses ----------------------------------------------
  "customize.statuses.defaults": "构思 → 定稿（默认）",
  "customize.statuses.intro":
    "按你的流程重命名状态（“初稿”“润色”“锁定”），隐藏不用的状态，并设置它们在卡片板和选择器中的顺序。无论怎样修改，场景都保留已存储的值，所以写到一半也可以放心调整；处于隐藏状态的场景仍会显示该状态，并标为已隐藏。此版本暂不支持添加新状态。",

  // --- Customize → Scene inspector fields --------------------------------------
  "customize.sceneFields.own.one": "{count} 个你的字段",
  "customize.sceneFields.own.other": "{count} 个你的字段",
  "customize.sceneFields.defaults": "全部字段（默认）",
  "customize.sceneFields.card.layout": "布局",
  "customize.sceneFields.layoutIntro":
    "选择场景检查器显示哪些字段以及显示顺序。隐藏你不用的字段；如果你按大纲写作，可以把“笔记”移到前面。“你的字段”是你在下方添加的那组字段。隐藏字段只是在这里不显示，场景已存储的内容不受影响，取消隐藏即可恢复。",
  "customize.sceneFields.card.own": "你的字段",
  "customize.sceneFields.ownIntro":
    "按你自己的流程添加字段，比如 Story Grid 的“五大要素”、场景的目标与灾难，它们会出现在每个场景的检查器中。每个字段都保存为场景上的普通属性；在这里移除字段，绝不会删除你写下的内容。",
  "customize.sceneFields.storedIn": "存储在 {link} 中（所有项目共享）。",
  "customize.sceneFields.firstCreates":
    "添加第一个字段时会创建场景模板笔记，并把字段记录在其中。",
  "customize.sceneFields.empty": "你还没有自己的字段。",
  "customize.sceneFields.reset": "移除你的全部字段",
  "customize.sceneFields.resetConfirm":
    "移除你自己的全部字段？这会从 {template} 中删除 {key} 属性，场景已存储的值保持不变。",
  "customize.sceneFields.resetConfirmNoTemplate":
    "移除你自己的全部字段？这会从场景模板中删除 {key} 属性，场景已存储的值保持不变。",
  "customize.sceneFields.labelDesc":
    "场景检查器中显示的名称。存储的属性名由它生成。",

  // --- Customize → Writing prompts ---------------------------------------------
  "customize.prompts.intro":
    "写作工具栏“提示”按钮背后的提示内容。隐藏你不想再看到的，改写任意一条，或添加你自己的：在应填入场景视角人物姓名的地方写 {pov}。每条提示都有一个阶段（起草或修订）和一个供按钮筛选的类别，任何提示（包括内置提示）都可以修改这两项。",
  "customize.prompts.phase.draft": "起草",
  "customize.prompts.phase.revise": "修订",
  "customize.prompts.phaseAria": "阶段",
  "customize.prompts.categoryAria": "类别",

  // --- Customize → To-do markers -----------------------------------------------
  "customize.markers.intro":
    "标记是你在正文中留下、以后再回来处理的记号，比如 [TODO: …]、[RESEARCH: …] 等，之后可在“修订 → 修订日志”中找到。编译时会全部移除。想用别的词，就添加你自己的标记（如果愿意，也可以隐藏内置的那个）。隐藏标记只是把它从“插入”菜单中去掉：场景中已有的标记仍会被找到，编译时也仍会被移除。",
  "customize.markers.wordPrompt": "在场景中输入的词（例如 CHECK）",
  "customize.markers.invalidWord":
    "标记词须以字母开头，由 2–20 个字母、数字或连字符组成。",
  "customize.markers.taken": "[{keyword}] 已经是一个标记。",
  "customize.markers.inactive": "该词已被使用，未生效",
  "customize.markers.removeConfirm":
    "移除“{label}”？场景中已有的 [{keyword}: …] 标记将不会出现在修订日志中，编译时也不会被移除。如果想让它们继续生效，请改为隐藏此标记。",
  "customize.markers.removed":
    "已移除“{label}”。所有 [{keyword}: …] 标记都会以普通文本留在你的场景中。",

  // --- Customize → Publishing checklist ----------------------------------------
  "customize.publishing.defaults": "{phases} · {tasks}（默认）",
  "customize.publishing.phases.one": "{count} 个阶段",
  "customize.publishing.phases.other": "{count} 个阶段",
  "customize.publishing.tasks.one": "{count} 项任务",
  "customize.publishing.tasks.other": "{count} 项任务",
  "customize.publishing.intro":
    "“发布 → 清单”按阶段排列。隐藏不适用于你出版路线的阶段或任务，重命名、调整顺序或添加你自己的任务都可以。勾选状态按任务 ID 保存在各项目中，所以隐藏或重命名时不会丢失已勾选的内容。",
  "customize.publishing.optional": "可选",

  // --- Customize → Features ----------------------------------------------------
  "customize.features.allShown": "全部显示",
  "customize.features.hidden": "已隐藏 {count}/{total} 项",
  "customize.features.intro":
    "隐藏你不用的界面，让 Inkswell 保持简洁。隐藏只是隐藏：你的笔记和数据都会保留，重新开启功能即可恢复一切。你也可以在应用中任何地方右键点击可选的标签页来隐藏它。",
};
