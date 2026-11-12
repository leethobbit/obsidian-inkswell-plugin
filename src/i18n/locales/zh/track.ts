/** Simplified Chinese UI strings — the `track` area (mirrors ../en/track.ts). */
import type { Catalog } from "../types";

export const track: Catalog = {
  // --- Track → layout --------------------------------------------------------
  "stats.section.activity": "活动",
  "stats.section.challenge": "挑战",
  "stats.section.targets": "项目目标",
  "stats.section.goals": "目标",
  "stats.section.sprints": "冲刺",
  "stats.section.structure": "结构",
  "stats.section.drafts": "稿本",

  // --- Track → Activity ------------------------------------------------------
  "stats.activity.heatmap.one": "活动（{count} 周）",
  "stats.activity.heatmap.other": "活动（{count} 周）",
  "stats.activity.nextMilestone": "下一个里程碑：{milestone}（还差 {remaining} 字）",
  "stats.activity.allMilestones": "所有里程碑均已达成 🎉",

  // --- Track → Goals ---------------------------------------------------------
  "stats.goals.today": "今日",
  "stats.goals.week": "本周",
  "stats.goals.month": "本月",
  "stats.goals.habit": "习惯：本周 {met} / {days} 天（每天 ≥ {min} 字）",
  "stats.goals.streak": "当前连续 {current} · 最长 {longest}",
  "stats.goals.mood": "今日心情：",
  "stats.goals.setUpChallenge": "设置写作挑战…",
  "stats.goals.lifetime": "总计 {words} 字 · 写作 {days} 天",
  "stats.goals.lifetimeBest": "总计 {words} 字 · 写作 {days} 天 · 最佳单日 {best}（{date}）",

  // --- Track → Challenge card ------------------------------------------------
  "stats.challenge.startsIn.one": "{count} 天后开始",
  "stats.challenge.startsIn.other": "{count} 天后开始",
  "stats.challenge.dayOf.one": "第 {day}/{total} 天 · 还剩 {count} 天",
  "stats.challenge.dayOf.other": "第 {day}/{total} 天 · 还剩 {count} 天",
  "stats.challenge.finished": "已结束",
  "stats.challenge.upcomingTarget": "目标 {target} 字 · {days} 天内平均每天约 {perDay} 字",
  "stats.challenge.parToday": "今日应达：{par}",
  "stats.challenge.copyTotal": "复制总数",
  "stats.challenge.copied": "已复制 {count}",
  "stats.challenge.copyFailed": "无法复制到剪贴板。",
  "stats.challenge.total": "{total} / {target}",
  "stats.challenge.totalPar": "{total} / {target}（应达 {par}）",
  "stats.challenge.met": "目标已达成 🎉",
  "stats.challenge.aheadToday": "领先 {diff} 字 · 今日 {today} / 需 {needed}",
  "stats.challenge.behindToday": "落后 {diff} 字 · 今日 {today} / 需 {needed}",
  "stats.challenge.metBest": "目标已达成 🎉 · 最佳单日 {best}（{date}）",
  "stats.challenge.short": "还差 {short} 字",
  "stats.challenge.shortBest": "还差 {short} 字 · 最佳单日 {best}（{date}）",
  "stats.challenge.deviceOnly":
    "仅统计此设备。开启“跨设备同步写作记录”即可包含你的其他设备。{link}",
  "stats.challenge.deviceOnlyLink": "开启",

  // --- Track → overview cards ------------------------------------------------
  "stats.card.words": "字数",
  "stats.card.scenes": "场景",
  "stats.card.readTime": "阅读时长",
  "stats.card.today": "今日",

  // --- Track → writing history chart -----------------------------------------
  "stats.range.days7": "7 天",
  "stats.range.days30": "30 天",
  "stats.range.days90": "90 天",
  "stats.range.all": "全部",
  "stats.chart.empty": "还没有写作记录。",
  // `.one` reads "words" on purpose: English output must not change (rule 1).
  "stats.chart.bar.one": "{date}：{count} 字",
  "stats.chart.bar.other": "{date}：{count} 字",
  "stats.chart.max": "最高 {max} 字/天",

  // --- Track → Sprints -------------------------------------------------------
  "stats.sprints.empty": "还没有冲刺。可从写作页或命令面板开始一次。",
  // `.one` reads "sprints" on purpose: English output must not change (rule 1).
  "stats.sprints.summary.one": "{count} 次冲刺 · {words} 字 · 平均 {wpm} 字/分钟",
  "stats.sprints.summary.other": "{count} 次冲刺 · {words} 字 · 平均 {wpm} 字/分钟",
  "stats.sprints.best": "最佳 {words} 字 · 峰值 {wpm} 字/分钟",
  "stats.sprints.bestGoals": "最佳 {words} 字 · 峰值 {wpm} 字/分钟 · 达成目标 {met}/{total}（{pct}%）",
  "stats.sprints.col.date": "日期",
  "stats.sprints.col.words": "字数",
  "stats.sprints.col.wpm": "字/分钟",
  "stats.sprints.col.time": "时长",
  "stats.sprints.col.goal": "目标",
  "stats.minutesShort": "{minutes} 分钟",

  // --- Track → Structure -----------------------------------------------------
  "stats.structure.noProjects": "没有多场景项目。",
  "stats.structure.byStatus": "按状态",
  "stats.structure.byPov": "按视角",
  "stats.structure.byAct": "按幕",
  "stats.structure.byChapter": "按章节",
  "stats.structure.chapterTargets": "章节目标",

  // --- Track → Drafts --------------------------------------------------------
  "stats.drafts.comparing.one": "正在比较“{title}”的 {count} 个稿本（Δ 为与第一稿相比）。",
  "stats.drafts.comparing.other": "正在比较“{title}”的 {count} 个稿本（Δ 为与第一稿相比）。",
  "stats.drafts.col.draft": "稿本",
  "stats.drafts.col.words": "字数",
  "stats.drafts.col.scenes": "场景",
  "stats.drafts.col.statusMix": "状态分布",
  "stats.drafts.col.age": "时长",
  "stats.drafts.singleNote": "单篇笔记",
  "stats.drafts.mixSegment": "{label} {count}",
  "stats.drafts.age.today": "今天",
  "stats.drafts.age.days.one": "{count} 天",
  "stats.drafts.age.days.other": "{count} 天",
  "stats.drafts.age.months.one": "{count} 个月",
  "stats.drafts.age.months.other": "{count} 个月",

  // --- Track → Project targets -----------------------------------------------
  "stats.targets.empty": "还没有设置项目字数目标。请使用“设置字数目标”命令。",
  "stats.targets.met": "{words} / {target}，目标已达成 🎉",
  "stats.targets.noRecent": "{words} / {target}，还差 {remaining} 字，近期没有写作",
  "stats.targets.eta": "{words} / {target}，还差 {remaining} 字，按每天 {rate} 字约需 {days} 天",
  "stats.targets.pace.ahead":
    "领先 · 每个写作日需约 {rate} 字 · 还剩 {days} 天（近 {window} 天平均每天 {avg} 字）",
  "stats.targets.pace.onTrack":
    "进度正常 · 每个写作日需约 {rate} 字 · 还剩 {days} 天（近 {window} 天平均每天 {avg} 字）",
  "stats.targets.pace.behind":
    "落后 · 每个写作日需约 {rate} 字 · 还剩 {days} 天（近 {window} 天平均每天 {avg} 字）",
  "stats.targets.suggestDeadline": "设置截止日期（建议约 {weeks} 周）即可追踪进度。",
  "stats.targets.zone": "{pct}% · {label}：{note}",
  "stats.ring.percent": "{pct}%",
  "stats.ring.ofMax": "{value} / {max}",

  // --- Read time (stats/format.ts) -------------------------------------------
  "stats.readTime.underMinute": "<1 分钟",
  "stats.readTime.hours": "{hours} 小时 {minutes} 分钟",

  // --- Draft-progress zones (goals/goals.ts) ---------------------------------
  "goal.zone.start.label": "起跑线",
  "goal.zone.start.note": "说出这个故事让你兴奋的原因，然后放手快写，一路向前。",
  "goal.zone.catalyst.label": "检查催化剂",
  "goal.zone.catalyst.note": "激励事件发生了吗？如果还没有，现在就推动它。",
  "goal.zone.act2.label": "进入第二幕",
  "goal.zone.act2.note": "主角下定决心。保持势头，不要推倒重来。",
  "goal.zone.muddle.label": "泥沼期",
  "goal.zone.muddle.note": "最难熬的一段。怀疑很正常，继续往下写。",
  "goal.zone.shiny.label": "新点子的诱惑",
  "goal.zone.shiny.note": "被新项目吸引了？先记下来，把这一稿写完。",
  "goal.zone.halfway.label": "半程",
  "goal.zone.halfway.note": "重温你开始写的初衷。冲过中点。",
  "goal.zone.discipline.label": "自律胜过灵感",
  "goal.zone.discipline.note": "不管今天感觉如何，都要写。",
  "goal.zone.victory.label": "胜利在望",
  "goal.zone.victory.note": "还剩 30%。忍住不要修改，记下想法继续前进。",
  "goal.zone.homeStretch.label": "最后冲刺",
  "goal.zone.homeStretch.note": "开始瞄准结局。把修改想法存起来当作燃料。",
  "goal.zone.windingDown.label": "收尾阶段",
  "goal.zone.windingDown.note": "别再追求完美，写到哪里就停在哪里。",
  "goal.zone.complete.label": "初稿完成",
  "goal.zone.complete.note": "庆祝一下。先别评判它，那是未来的你要做的事。",

  // --- Writing challenge dialog ----------------------------------------------
  "goal.challenge.titleEdit": "编辑写作挑战",
  "goal.challenge.titleNew": "设置写作挑战",
  "goal.challenge.intro":
    "在日期范围内，你在任何项目中写下的每个字都计入目标，与每日目标统计的字数相同。",
  "goal.challenge.name": "名称",
  "goal.challenge.start": "开始",
  "goal.challenge.end": "结束",
  "goal.challenge.endDesc": "包含当天。",
  "goal.challenge.target": "目标字数",
  "goal.challenge.clear": "清除挑战",
  "goal.challenge.cleared": "写作挑战已清除。",
  "goal.challenge.invalid": "请检查日期（结束日期不早于开始日期，最长 400 天），并确保目标大于 0。",
  "goal.challenge.set": "挑战已设置：{start} 至 {end}，{target} 字。",

  // --- Word target dialog ----------------------------------------------------
  "goal.target.title": "字数目标：{title}",
  "goal.target.words": "目标字数",
  "goal.target.wordsDesc": "此项目的总字数目标（填 0 清除）。",
  "goal.target.deadline": "截止日期",
  "goal.target.deadlineDesc": "可选的完成日期，用于追踪页的进度计算。",
  "goal.target.daysPerWeek": "每周写作天数",
  "goal.target.daysPerWeekDesc": "你每周写作几天（1–7），用于进度计算。",
  "goal.target.indexMissing": "找不到项目索引。",
  "goal.target.saveFailed": "无法保存字数目标。",
  "goal.target.set": "目标已设为 {count} 字。",
  "goal.target.cleared": "目标已清除。",

  // --- Sprints ---------------------------------------------------------------
  "sprint.alreadyRunning": "已有一个冲刺正在进行。",
  "sprint.started": "冲刺开始：{minutes} 分钟",
  "sprint.startedGoal": "冲刺开始：{minutes} 分钟，目标 {goal} 字",
  "sprint.cancelled": "冲刺已取消。",
  "sprint.complete": "冲刺完成！{words} 字",
  "sprint.completeGoal": "冲刺完成！{words} 字（目标 {goal}）",
  "sprint.completeGoalMet": "冲刺完成！{words} 字（目标 {goal} ✓）",
  "sprint.modal.title": "开始写作冲刺",
  "sprint.modal.start": "开始",
  "sprint.modal.duration": "时长（分钟）",
  "sprint.modal.goal": "字数目标（可选）",
  "sprint.modal.goalDesc": "保持 0 表示不设目标。",

  // --- Writing-history sync --------------------------------------------------
  "track.logSync.writeFailed": "无法写入写作记录日志笔记。",
};
