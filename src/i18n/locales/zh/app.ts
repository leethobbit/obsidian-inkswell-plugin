/** Simplified Chinese UI strings — the `app` area (mirrors ../en/app.ts). */
import type { Catalog } from "../types";

export const app: Catalog = {
  // --- Plugin load -----------------------------------------------------------
  "app.hoverSource": "Inkswell 写作编辑器",
  "app.ribbon": "Inkswell 项目",
  "app.recovered":
    "Inkswell 无法读取数据文件，已从 {date} 的备份中载入你的设置和写作记录。该日期之后的更改可能已丢失。",
  "app.recoveredKept":
    "Inkswell 无法读取数据文件，已从 {date} 的备份中载入你的设置和写作记录。该日期之后的更改可能已丢失。无法读取的文件已保留为 {file}。",
  "app.categoryNotice":
    "Inkswell 的目标现在只统计项目字数。可在“设置 → Inkswell”中选择要统计的内容（场景、规划、设定集）。",

  // --- Commands --------------------------------------------------------------
  "app.command.openProjects": "打开项目",
  "app.command.newProject": "新建项目",
  "app.command.renameProject": "重命名项目",
  "app.command.archiveProject": "归档当前项目",
  "app.command.unarchiveProject": "取消归档当前项目",
  "app.command.setUpChallenge": "设置写作挑战",
  "app.command.exportStoryBible": "导出故事圣经",
  "app.command.newScene": "新建场景",
  "app.command.sortByChapter": "按章节编号排序场景",
  "app.command.openBeats": "打开节拍表（规划）",
  "app.command.openBoard": "打开卡片板（规划）",
  "app.command.openPlotGrid": "打开情节网格（规划）",
  "app.command.openCodex": "打开设定集",
  "app.command.openWrite": "打开写作",
  "app.command.openStats": "打开写作统计（追踪）",
  "app.command.openCompile": "打开编译（发布）",
  "app.command.compileActive": "编译当前项目",
  "app.command.searchScenes": "搜索场景",
  "app.command.insertTodo": "插入待办标记…",
  "app.command.toggleBold": "切换粗体（写作编辑器）",
  "app.command.toggleItalic": "切换斜体（写作编辑器）",
  "app.command.toggleStrikethrough": "切换删除线（写作编辑器）",
  "app.command.splitScene": "在光标处拆分场景（写作编辑器）",
  "app.command.toggleStream": "切换场景连读（写作）",
  "app.command.jumpToChapter": "跳转到章节…（场景连读）",
  "app.command.nextChapter": "下一章（场景连读）",
  "app.command.previousChapter": "上一章（场景连读）",
  "app.command.moveSelection": "将所选内容移至新场景（写作编辑器）",
  "app.command.quickCodex": "用所选内容创建设定集条目（写作编辑器）",
  "app.command.openLink": "打开光标处的链接（写作编辑器）",
  "app.command.toggleTypewriter": "切换打字机模式（写作编辑器）",
  "app.typewriterOn": "打字机模式已开启",
  "app.typewriterOff": "打字机模式已关闭",
  "app.command.startSprint": "开始写作冲刺",
  "app.command.endSprint": "立即结束当前冲刺",
  "app.command.cancelSprint": "取消当前冲刺",
  "app.command.setWordTarget": "设置当前项目的字数目标",
  "app.command.logRevision": "记录修订决定",
  "app.notInProject": "当前文件不属于任何 Inkswell 项目。",
  "app.command.openRevisions": "打开修订日志",
  "app.command.openAnalysis": "打开分析（修订）",
  "app.command.openHelp": "打开帮助",
  "app.command.openCustomize": "打开自定义",
  "app.command.restoreSettings": "从备份恢复设置",
  "app.command.manageFeatures": "管理功能",
  "app.command.quickCapture": "快速记录灵感",

  // --- Settings backups ------------------------------------------------------
  "app.noBackups": "Inkswell 还没有备份。你每天打开 Obsidian 时都会生成一份。",
  "app.settingsRestored":
    "已从 {date} 的备份恢复设置。你的写作记录和灵感没有改动。",

  // --- Ideas inbox -----------------------------------------------------------
  "app.capture.title": "快速记录",
  "app.capture.cta": "记录",
  "app.capture.done": "灵感已记录。",
  "app.idea.saveFailed": "无法将灵感保存为笔记。",
  "app.idea.saved": "已保存到 {path}",

  // --- Compile, archive, project lookup --------------------------------------
  "app.compile.noProject": "没有可编译的当前项目。请先在 Inkswell 中打开一个项目。",
  "app.archive.archived": "已归档“{title}”。可在主页的“已归档”中找到。",
  "app.archive.restored": "“{title}”已回到主页。",
  "app.archive.seriesArchived": "已归档“{name}”系列。可在主页的“已归档”中找到。",
  "app.archive.seriesRestored": "“{name}”系列已回到主页。",
  "app.noProject": "未找到 Inkswell 项目。请用“新建项目”命令创建一个。",
};
