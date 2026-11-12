/** English UI strings — Track destination: stats, goals, challenges, sprints, tracking (src/stats, src/tracking, src/goals, src/sprints). See ./index.ts for the rules. */
export const track = {
  // --- Track → layout --------------------------------------------------------
  "stats.section.activity": "Activity",
  "stats.section.challenge": "Challenge",
  "stats.section.targets": "Project targets",
  "stats.section.goals": "Goals",
  "stats.section.sprints": "Sprints",
  "stats.section.structure": "Structure",
  "stats.section.drafts": "Drafts",

  // --- Track → Activity ------------------------------------------------------
  "stats.activity.heatmap.one": "Activity ({count} week)",
  "stats.activity.heatmap.other": "Activity ({count} weeks)",
  "stats.activity.nextMilestone": "Next milestone: {milestone} ({remaining} to go)",
  "stats.activity.allMilestones": "All milestones reached 🎉",

  // --- Track → Goals ---------------------------------------------------------
  "stats.goals.today": "Today",
  "stats.goals.week": "Week",
  "stats.goals.month": "Month",
  "stats.goals.habit": "Habit: {met} / {days} days this week (≥ {min} words/day)",
  "stats.goals.streak": "Current streak {current} · Longest {longest}",
  "stats.goals.mood": "Mood today:",
  "stats.goals.setUpChallenge": "Set up a writing challenge…",
  "stats.goals.lifetime": "Total {words} words · {days} days written",
  "stats.goals.lifetimeBest": "Total {words} words · {days} days written · best day {best} ({date})",

  // --- Track → Challenge card ------------------------------------------------
  "stats.challenge.startsIn.one": "Starts in {count} day",
  "stats.challenge.startsIn.other": "Starts in {count} days",
  "stats.challenge.dayOf.one": "Day {day} of {total} · {count} day left",
  "stats.challenge.dayOf.other": "Day {day} of {total} · {count} days left",
  "stats.challenge.finished": "Finished",
  "stats.challenge.upcomingTarget": "Target {target} words · ≈{perDay}/day over {days} days",
  "stats.challenge.parToday": "Par today: {par}",
  "stats.challenge.copyTotal": "Copy total",
  "stats.challenge.copied": "Copied {count}",
  "stats.challenge.copyFailed": "Couldn't copy to the clipboard.",
  "stats.challenge.total": "{total} / {target}",
  "stats.challenge.totalPar": "{total} / {target} (par {par})",
  "stats.challenge.met": "Target met 🎉",
  "stats.challenge.aheadToday": "Ahead by {diff} · Today {today} / {needed} needed",
  "stats.challenge.behindToday": "Behind by {diff} · Today {today} / {needed} needed",
  "stats.challenge.metBest": "Target met 🎉 · best day {best} ({date})",
  "stats.challenge.short": "{short} short",
  "stats.challenge.shortBest": "{short} short · best day {best} ({date})",
  "stats.challenge.deviceOnly":
    "Counting this device only — turn on Sync writing history to include your other devices. {link}",
  "stats.challenge.deviceOnlyLink": "Turn it on",

  // --- Track → overview cards ------------------------------------------------
  "stats.card.words": "Words",
  "stats.card.scenes": "Scenes",
  "stats.card.readTime": "Read time",
  "stats.card.today": "Today",

  // --- Track → writing history chart -----------------------------------------
  "stats.range.days7": "7d",
  "stats.range.days30": "30d",
  "stats.range.days90": "90d",
  "stats.range.all": "All",
  "stats.chart.empty": "No writing logged yet.",
  // `.one` reads "words" on purpose: English output must not change (rule 1).
  "stats.chart.bar.one": "{date}: {count} words",
  "stats.chart.bar.other": "{date}: {count} words",
  "stats.chart.max": "max {max}/day",

  // --- Track → Sprints -------------------------------------------------------
  "stats.sprints.empty": "No sprints yet. Start one from Write or the command palette.",
  // `.one` reads "sprints" on purpose: English output must not change (rule 1).
  "stats.sprints.summary.one": "{count} sprints · {words} words · {wpm} wpm avg",
  "stats.sprints.summary.other": "{count} sprints · {words} words · {wpm} wpm avg",
  "stats.sprints.best": "Best {words} words · {wpm} wpm peak",
  "stats.sprints.bestGoals": "Best {words} words · {wpm} wpm peak · goals {met}/{total} ({pct}%)",
  "stats.sprints.col.date": "Date",
  "stats.sprints.col.words": "Words",
  "stats.sprints.col.wpm": "wpm",
  "stats.sprints.col.time": "Time",
  "stats.sprints.col.goal": "Goal",
  "stats.minutesShort": "{minutes}m",

  // --- Track → Structure -----------------------------------------------------
  "stats.structure.noProjects": "No multi-scene projects.",
  "stats.structure.byStatus": "By status",
  "stats.structure.byPov": "By POV",
  "stats.structure.byAct": "By act",
  "stats.structure.byChapter": "By chapter",
  "stats.structure.chapterTargets": "Chapter targets",

  // --- Track → Drafts --------------------------------------------------------
  "stats.drafts.comparing.one": "Comparing {count} draft of \"{title}\" (Δ vs the first draft).",
  "stats.drafts.comparing.other": "Comparing {count} drafts of \"{title}\" (Δ vs the first draft).",
  "stats.drafts.col.draft": "Draft",
  "stats.drafts.col.words": "Words",
  "stats.drafts.col.scenes": "Scenes",
  "stats.drafts.col.statusMix": "Status mix",
  "stats.drafts.col.age": "Age",
  "stats.drafts.singleNote": "single note",
  "stats.drafts.mixSegment": "{count} {label}",
  "stats.drafts.age.today": "today",
  "stats.drafts.age.days.one": "{count} day",
  "stats.drafts.age.days.other": "{count} days",
  "stats.drafts.age.months.one": "{count} mo",
  "stats.drafts.age.months.other": "{count} mo",

  // --- Track → Project targets -----------------------------------------------
  "stats.targets.empty": "No project word targets set. Use the 'Set word target' command.",
  "stats.targets.met": "{words} / {target} — target met 🎉",
  "stats.targets.noRecent": "{words} / {target} — {remaining} left, no recent writing",
  "stats.targets.eta": "{words} / {target} — {remaining} left, ~{days} day(s) at {rate}/day",
  "stats.targets.pace.ahead":
    "Ahead · need ~{rate}/writing-day · {days} days left (avg {avg}/day over {window} days)",
  "stats.targets.pace.onTrack":
    "On track · need ~{rate}/writing-day · {days} days left (avg {avg}/day over {window} days)",
  "stats.targets.pace.behind":
    "Behind · need ~{rate}/writing-day · {days} days left (avg {avg}/day over {window} days)",
  "stats.targets.suggestDeadline": "Set a deadline (≈{weeks} weeks suggested) for pace tracking.",
  "stats.targets.zone": "{pct}% · {label} — {note}",
  "stats.ring.percent": "{pct}%",
  "stats.ring.ofMax": "{value} / {max}",

  // --- Read time (stats/format.ts) -------------------------------------------
  "stats.readTime.underMinute": "<1m",
  "stats.readTime.hours": "{hours}h {minutes}m",

  // --- Draft-progress zones (goals/goals.ts) ---------------------------------
  "goal.zone.start.label": "Starting line",
  "goal.zone.start.note": "Name why this story excites you, then write fast and forward.",
  "goal.zone.catalyst.label": "Catalyst check",
  "goal.zone.catalyst.note": "Has the inciting incident hit yet? If not, push it now.",
  "goal.zone.act2.label": "Into Act 2",
  "goal.zone.act2.note": "The hero commits. Keep momentum — don't restart.",
  "goal.zone.muddle.label": "The Muddle",
  "goal.zone.muddle.note": "The hardest stretch. Doubt is normal; keep drafting forward.",
  "goal.zone.shiny.label": "Shiny new idea",
  "goal.zone.shiny.note": "Tempted by a new project? Log it and finish this draft.",
  "goal.zone.halfway.label": "Halfway",
  "goal.zone.halfway.note": "Reconnect with why you started. Push through the midpoint.",
  "goal.zone.discipline.label": "Discipline over inspiration",
  "goal.zone.discipline.note": "Write regardless of how it feels today.",
  "goal.zone.victory.label": "Victory in sight",
  "goal.zone.victory.note": "30% to go. Resist revising — capture ideas and move on.",
  "goal.zone.homeStretch.label": "Home stretch",
  "goal.zone.homeStretch.note": "Start aiming at the ending. Save revision ideas as fuel.",
  "goal.zone.windingDown.label": "Winding down",
  "goal.zone.windingDown.note": "Stop chasing perfection — there's just where you stop.",
  "goal.zone.complete.label": "Draft complete",
  "goal.zone.complete.note": "Celebrate. Don't judge it yet — that's Future You's job.",

  // --- Writing challenge dialog ----------------------------------------------
  "goal.challenge.titleEdit": "Edit writing challenge",
  "goal.challenge.titleNew": "Set up a writing challenge",
  "goal.challenge.intro":
    "Counts every word you write in the date range toward the target, in any project — the same words your daily goal counts.",
  "goal.challenge.name": "Name",
  "goal.challenge.start": "Start",
  "goal.challenge.end": "End",
  "goal.challenge.endDesc": "Inclusive.",
  "goal.challenge.target": "Target words",
  "goal.challenge.clear": "Clear challenge",
  "goal.challenge.cleared": "Writing challenge cleared.",
  "goal.challenge.invalid": "Check the dates (end on or after start, at most 400 days) and a target above 0.",
  "goal.challenge.set": "Challenge set: {target} words, {start} to {end}.",

  // --- Word target dialog ----------------------------------------------------
  "goal.target.title": "Word target: {title}",
  "goal.target.words": "Target words",
  "goal.target.wordsDesc": "Total word count goal for this project (0 to clear).",
  "goal.target.deadline": "Deadline",
  "goal.target.deadlineDesc": "Optional finish date — drives the pace calculator on Track.",
  "goal.target.daysPerWeek": "Writing days per week",
  "goal.target.daysPerWeekDesc": "How many days a week you write (1–7), for the pace calculation.",
  "goal.target.indexMissing": "Project index not found.",
  "goal.target.saveFailed": "Couldn't save the word target.",
  "goal.target.set": "Target set to {count} words.",
  "goal.target.cleared": "Target cleared.",

  // --- Sprints ---------------------------------------------------------------
  "sprint.alreadyRunning": "A sprint is already running.",
  "sprint.started": "Sprint started: {minutes} min",
  "sprint.startedGoal": "Sprint started: {minutes} min, goal {goal} words",
  "sprint.cancelled": "Sprint cancelled.",
  "sprint.complete": "Sprint complete! {words} words",
  "sprint.completeGoal": "Sprint complete! {words} words (goal {goal})",
  "sprint.completeGoalMet": "Sprint complete! {words} words (goal {goal} ✓)",
  "sprint.modal.title": "Start a writing sprint",
  "sprint.modal.start": "Start",
  "sprint.modal.duration": "Duration (minutes)",
  "sprint.modal.goal": "Word goal (optional)",
  "sprint.modal.goalDesc": "Leave at 0 for no goal.",

  // --- Writing-history sync --------------------------------------------------
  "track.logSync.writeFailed": "Couldn't write the writing-history log note.",
} as const;
