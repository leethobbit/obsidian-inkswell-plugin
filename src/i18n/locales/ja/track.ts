/** Japanese UI strings — the `track` area (mirrors ../en/track.ts). */
import type { Catalog } from "../types";

export const track: Catalog = {
  // --- Track → layout --------------------------------------------------------
  "stats.section.activity": "アクティビティ",
  "stats.section.challenge": "チャレンジ",
  "stats.section.targets": "プロジェクトの目標",
  "stats.section.goals": "目標",
  "stats.section.sprints": "スプリント",
  "stats.section.structure": "構成",
  "stats.section.drafts": "ドラフト",

  // --- Track → Activity ------------------------------------------------------
  "stats.activity.heatmap.one": "アクティビティ（{count} 週間）",
  "stats.activity.heatmap.other": "アクティビティ（{count} 週間）",
  "stats.activity.nextMilestone": "次のマイルストーン：{milestone}（あと {remaining}）",
  "stats.activity.allMilestones": "すべてのマイルストーンを達成しました 🎉",

  // --- Track → Goals ---------------------------------------------------------
  "stats.goals.today": "今日",
  "stats.goals.week": "今週",
  "stats.goals.month": "今月",
  "stats.goals.habit": "習慣：今週 {days} 日中 {met} 日（1 日 {min} 語以上）",
  "stats.goals.streak": "現在の連続記録 {current} · 最長 {longest}",
  "stats.goals.mood": "今日の気分：",
  "stats.goals.setUpChallenge": "執筆チャレンジを設定…",
  "stats.goals.lifetime": "合計 {words}語 · 執筆日数 {days} 日",
  "stats.goals.lifetimeBest": "合計 {words}語 · 執筆日数 {days} 日 · 最高記録 {best}（{date}）",

  // --- Track → Challenge card ------------------------------------------------
  "stats.challenge.startsIn.one": "あと {count} 日で開始",
  "stats.challenge.startsIn.other": "あと {count} 日で開始",
  "stats.challenge.dayOf.one": "{total} 日中 {day} 日目 · 残り {count} 日",
  "stats.challenge.dayOf.other": "{total} 日中 {day} 日目 · 残り {count} 日",
  "stats.challenge.finished": "終了",
  "stats.challenge.upcomingTarget": "目標 {target}語 · {days} 日間で 1 日あたり約 {perDay}",
  "stats.challenge.parToday": "今日の基準：{par}",
  "stats.challenge.copyTotal": "合計をコピー",
  "stats.challenge.copied": "{count} をコピーしました",
  "stats.challenge.copyFailed": "クリップボードにコピーできませんでした。",
  "stats.challenge.total": "{total} / {target}",
  "stats.challenge.totalPar": "{total} / {target}（基準 {par}）",
  "stats.challenge.met": "目標達成 🎉",
  "stats.challenge.aheadToday": "{diff} 先行 · 今日 {today} / 必要 {needed}",
  "stats.challenge.behindToday": "{diff} 遅れ · 今日 {today} / 必要 {needed}",
  "stats.challenge.metBest": "目標達成 🎉 · 最高記録 {best}（{date}）",
  "stats.challenge.short": "{short} 不足",
  "stats.challenge.shortBest": "{short} 不足 · 最高記録 {best}（{date}）",
  "stats.challenge.deviceOnly":
    "このデバイスの分だけを数えています。ほかのデバイスの分も含めるには「執筆履歴をデバイス間で同期」をオンにしてください。{link}",
  "stats.challenge.deviceOnlyLink": "オンにする",

  // --- Track → overview cards ------------------------------------------------
  "stats.card.words": "語数",
  "stats.card.scenes": "シーン",
  "stats.card.readTime": "読了時間",
  "stats.card.today": "今日",

  // --- Track → writing history chart -----------------------------------------
  "stats.range.days7": "7日",
  "stats.range.days30": "30日",
  "stats.range.days90": "90日",
  "stats.range.all": "すべて",
  "stats.chart.empty": "執筆の記録はまだありません。",
  // `.one` reads "words" on purpose: English output must not change (rule 1).
  "stats.chart.bar.one": "{date}：{count}語",
  "stats.chart.bar.other": "{date}：{count}語",
  "stats.chart.max": "最大 {max}/日",

  // --- Track → Sprints -------------------------------------------------------
  "stats.sprints.empty": "スプリントはまだありません。執筆画面かコマンドパレットから開始してください。",
  // `.one` reads "sprints" on purpose: English output must not change (rule 1).
  "stats.sprints.summary.one": "スプリント {count} 回 · {words}語 · 平均 {wpm} 語/分",
  "stats.sprints.summary.other": "スプリント {count} 回 · {words}語 · 平均 {wpm} 語/分",
  "stats.sprints.best": "最高 {words}語 · 最速 {wpm} 語/分",
  "stats.sprints.bestGoals": "最高 {words}語 · 最速 {wpm} 語/分 · 目標達成 {met}/{total}（{pct}%）",
  "stats.sprints.col.date": "日付",
  "stats.sprints.col.words": "語数",
  "stats.sprints.col.wpm": "語/分",
  "stats.sprints.col.time": "時間",
  "stats.sprints.col.goal": "目標",
  "stats.minutesShort": "{minutes}分",

  // --- Track → Structure -----------------------------------------------------
  "stats.structure.noProjects": "複数シーンのプロジェクトがありません。",
  "stats.structure.byStatus": "ステータス別",
  "stats.structure.byPov": "視点別",
  "stats.structure.byAct": "幕別",
  "stats.structure.byChapter": "章別",
  "stats.structure.chapterTargets": "章ごとの目標",

  // --- Track → Drafts --------------------------------------------------------
  "stats.drafts.comparing.one": "「{title}」の {count} 個のドラフトを比較しています（Δ は最初のドラフトとの差）。",
  "stats.drafts.comparing.other": "「{title}」の {count} 個のドラフトを比較しています（Δ は最初のドラフトとの差）。",
  "stats.drafts.col.draft": "ドラフト",
  "stats.drafts.col.words": "語数",
  "stats.drafts.col.scenes": "シーン",
  "stats.drafts.col.statusMix": "ステータスの内訳",
  "stats.drafts.col.age": "経過",
  "stats.drafts.singleNote": "単一ノート",
  "stats.drafts.mixSegment": "{label} {count}",
  "stats.drafts.age.today": "今日",
  "stats.drafts.age.days.one": "{count} 日",
  "stats.drafts.age.days.other": "{count} 日",
  "stats.drafts.age.months.one": "{count} か月",
  "stats.drafts.age.months.other": "{count} か月",

  // --- Track → Project targets -----------------------------------------------
  "stats.targets.empty": "プロジェクトの目標語数は設定されていません。「目標語数を設定」コマンドを使ってください。",
  "stats.targets.met": "{words} / {target} — 目標達成 🎉",
  "stats.targets.noRecent": "{words} / {target} — 残り {remaining}、最近の執筆なし",
  "stats.targets.eta": "{words} / {target} — 残り {remaining}、1 日 {rate} のペースで約 {days} 日",
  "stats.targets.pace.ahead":
    "先行 · 執筆日 1 日あたり約 {rate} 必要 · 残り {days} 日（直近 {window} 日の平均 {avg}/日）",
  "stats.targets.pace.onTrack":
    "順調 · 執筆日 1 日あたり約 {rate} 必要 · 残り {days} 日（直近 {window} 日の平均 {avg}/日）",
  "stats.targets.pace.behind":
    "遅れ · 執筆日 1 日あたり約 {rate} 必要 · 残り {days} 日（直近 {window} 日の平均 {avg}/日）",
  "stats.targets.suggestDeadline": "ペースを追跡するには締め切りを設定してください（目安は約 {weeks} 週間）。",
  "stats.targets.zone": "{pct}% · {label} — {note}",
  "stats.ring.percent": "{pct}%",
  "stats.ring.ofMax": "{value} / {max}",

  // --- Read time (stats/format.ts) -------------------------------------------
  "stats.readTime.underMinute": "1分未満",
  "stats.readTime.hours": "{hours}時間{minutes}分",

  // --- Draft-progress zones (goals/goals.ts) ---------------------------------
  "goal.zone.start.label": "スタートライン",
  "goal.zone.start.note": "この物語のどこにわくわくするのかを言葉にしたら、あとは前へ前へと速く書きましょう。",
  "goal.zone.catalyst.label": "きっかけの確認",
  "goal.zone.catalyst.note": "発端となる事件はもう起きましたか？ まだなら、今起こしましょう。",
  "goal.zone.act2.label": "第二幕へ",
  "goal.zone.act2.note": "主人公が覚悟を決めます。勢いを保ち、書き直しはしないで。",
  "goal.zone.muddle.label": "ぬかるみ",
  "goal.zone.muddle.note": "いちばんつらい区間です。迷いは当たり前。前へ書き進めましょう。",
  "goal.zone.shiny.label": "新しいアイデアの誘惑",
  "goal.zone.shiny.note": "新しいプロジェクトに心が揺れていますか？ メモしておいて、このドラフトを書き上げましょう。",
  "goal.zone.halfway.label": "折り返し地点",
  "goal.zone.halfway.note": "書き始めた理由を思い出しましょう。ミッドポイントを押し切って。",
  "goal.zone.discipline.label": "ひらめきより習慣",
  "goal.zone.discipline.note": "今日の気分がどうであれ、書きましょう。",
  "goal.zone.victory.label": "ゴールが見えてきた",
  "goal.zone.victory.note": "残り 30%。推敲したくなっても我慢して、アイデアはメモして先へ進みましょう。",
  "goal.zone.homeStretch.label": "ラストスパート",
  "goal.zone.homeStretch.note": "結末に狙いを定め始めましょう。推敲のアイデアは燃料として取っておいて。",
  "goal.zone.windingDown.label": "仕上げの段階",
  "goal.zone.windingDown.note": "完璧を追うのはやめましょう。あるのは、あなたが筆を置く場所だけです。",
  "goal.zone.complete.label": "ドラフト完成",
  "goal.zone.complete.note": "お祝いしましょう。まだ評価はしないで。それは未来のあなたの仕事です。",

  // --- Writing challenge dialog ----------------------------------------------
  "goal.challenge.titleEdit": "執筆チャレンジを編集",
  "goal.challenge.titleNew": "執筆チャレンジを設定",
  "goal.challenge.intro":
    "期間中にどのプロジェクトで書いた語も、すべて目標に向けて数えます。1 日の目標で数えるのと同じ語数です。",
  "goal.challenge.name": "名前",
  "goal.challenge.start": "開始",
  "goal.challenge.end": "終了",
  "goal.challenge.endDesc": "この日を含みます。",
  "goal.challenge.target": "目標語数",
  "goal.challenge.clear": "チャレンジを解除",
  "goal.challenge.cleared": "執筆チャレンジを解除しました。",
  "goal.challenge.invalid": "日付（終了日は開始日以降、最長 400 日）と、0 より大きい目標を確認してください。",
  "goal.challenge.set": "チャレンジを設定しました：{start}〜{end}、{target}語。",

  // --- Word target dialog ----------------------------------------------------
  "goal.target.title": "目標語数：{title}",
  "goal.target.words": "目標語数",
  "goal.target.wordsDesc": "このプロジェクト全体の目標語数です（0 で解除）。",
  "goal.target.deadline": "締め切り",
  "goal.target.deadlineDesc": "任意の完成予定日です。記録画面のペース計算に使われます。",
  "goal.target.daysPerWeek": "週あたりの執筆日数",
  "goal.target.daysPerWeekDesc": "ペース計算に使う、1 週間に書く日数（1〜7）です。",
  "goal.target.indexMissing": "プロジェクトのインデックスが見つかりません。",
  "goal.target.saveFailed": "目標語数を保存できませんでした。",
  "goal.target.set": "目標を {count}語に設定しました。",
  "goal.target.cleared": "目標を解除しました。",

  // --- Sprints ---------------------------------------------------------------
  "sprint.alreadyRunning": "スプリントはすでに実行中です。",
  "sprint.started": "スプリント開始：{minutes}分",
  "sprint.startedGoal": "スプリント開始：{minutes}分、目標 {goal}語",
  "sprint.cancelled": "スプリントをキャンセルしました。",
  "sprint.complete": "スプリント完了！ {words}語",
  "sprint.completeGoal": "スプリント完了！ {words}語（目標 {goal}）",
  "sprint.completeGoalMet": "スプリント完了！ {words}語（目標 {goal} ✓）",
  "sprint.modal.title": "執筆スプリントを開始",
  "sprint.modal.start": "開始",
  "sprint.modal.duration": "時間（分）",
  "sprint.modal.goal": "目標語数（任意）",
  "sprint.modal.goalDesc": "目標なしの場合は 0 のままにします。",

  // --- Writing-history sync --------------------------------------------------
  "track.logSync.writeFailed": "執筆履歴の記録ノートを書き込めませんでした。",
};
