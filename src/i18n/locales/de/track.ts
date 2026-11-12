/** German UI strings — the `track` area (mirrors ../en/track.ts). */
import type { Catalog } from "../types";

export const track: Catalog = {
  // --- Track → layout --------------------------------------------------------
  "stats.section.activity": "Aktivität",
  "stats.section.challenge": "Challenge",
  "stats.section.targets": "Projektziele",
  "stats.section.goals": "Ziele",
  "stats.section.sprints": "Sprints",
  "stats.section.structure": "Struktur",
  "stats.section.drafts": "Fassungen",

  // --- Track → Activity ------------------------------------------------------
  "stats.activity.heatmap.one": "Aktivität ({count} Woche)",
  "stats.activity.heatmap.other": "Aktivität ({count} Wochen)",
  "stats.activity.nextMilestone": "Nächster Meilenstein: {milestone} (noch {remaining})",
  "stats.activity.allMilestones": "Alle Meilensteine erreicht 🎉",

  // --- Track → Goals ---------------------------------------------------------
  "stats.goals.today": "Heute",
  "stats.goals.week": "Woche",
  "stats.goals.month": "Monat",
  "stats.goals.habit": "Gewohnheit: {met} / {days} Tage diese Woche (≥ {min} Wörter/Tag)",
  "stats.goals.streak": "Aktuelle Serie {current} · Längste {longest}",
  "stats.goals.mood": "Stimmung heute:",
  "stats.goals.setUpChallenge": "Schreib-Challenge einrichten …",
  "stats.goals.lifetime": "Insgesamt {words} Wörter · an {days} Tagen geschrieben",
  "stats.goals.lifetimeBest": "Insgesamt {words} Wörter · an {days} Tagen geschrieben · bester Tag {best} ({date})",

  // --- Track → Challenge card ------------------------------------------------
  "stats.challenge.startsIn.one": "Beginnt in {count} Tag",
  "stats.challenge.startsIn.other": "Beginnt in {count} Tagen",
  "stats.challenge.dayOf.one": "Tag {day} von {total} · noch {count} Tag",
  "stats.challenge.dayOf.other": "Tag {day} von {total} · noch {count} Tage",
  "stats.challenge.finished": "Beendet",
  "stats.challenge.upcomingTarget": "Ziel {target} Wörter · ≈{perDay}/Tag über {days} Tage",
  "stats.challenge.parToday": "Soll heute: {par}",
  "stats.challenge.copyTotal": "Summe kopieren",
  "stats.challenge.copied": "{count} kopiert",
  "stats.challenge.copyFailed": "Kopieren in die Zwischenablage fehlgeschlagen.",
  "stats.challenge.total": "{total} / {target}",
  "stats.challenge.totalPar": "{total} / {target} (Soll {par})",
  "stats.challenge.met": "Ziel erreicht 🎉",
  "stats.challenge.aheadToday": "{diff} voraus · heute {today} / {needed} nötig",
  "stats.challenge.behindToday": "{diff} im Rückstand · heute {today} / {needed} nötig",
  "stats.challenge.metBest": "Ziel erreicht 🎉 · bester Tag {best} ({date})",
  "stats.challenge.short": "{short} fehlen",
  "stats.challenge.shortBest": "{short} fehlen · bester Tag {best} ({date})",
  "stats.challenge.deviceOnly":
    "Es wird nur dieses Gerät gezählt – schalte „Schreibverlauf zwischen Geräten synchronisieren“ ein, um deine anderen Geräte einzubeziehen. {link}",
  "stats.challenge.deviceOnlyLink": "Einschalten",

  // --- Track → overview cards ------------------------------------------------
  "stats.card.words": "Wörter",
  "stats.card.scenes": "Szenen",
  "stats.card.readTime": "Lesezeit",
  "stats.card.today": "Heute",

  // --- Track → writing history chart -----------------------------------------
  "stats.range.days7": "7 T.",
  "stats.range.days30": "30 T.",
  "stats.range.days90": "90 T.",
  "stats.range.all": "Alle",
  "stats.chart.empty": "Noch nichts geschrieben und erfasst.",
  // `.one` reads "words" on purpose: English output must not change (rule 1).
  "stats.chart.bar.one": "{date}: {count} Wort",
  "stats.chart.bar.other": "{date}: {count} Wörter",
  "stats.chart.max": "max. {max}/Tag",

  // --- Track → Sprints -------------------------------------------------------
  "stats.sprints.empty": "Noch keine Sprints. Starte einen in Schreiben oder über die Befehlspalette.",
  // `.one` reads "sprints" on purpose: English output must not change (rule 1).
  "stats.sprints.summary.one": "{count} Sprint · {words} Wörter · Ø {wpm} WpM",
  "stats.sprints.summary.other": "{count} Sprints · {words} Wörter · Ø {wpm} WpM",
  "stats.sprints.best": "Bestwert {words} Wörter · Spitze {wpm} WpM",
  "stats.sprints.bestGoals": "Bestwert {words} Wörter · Spitze {wpm} WpM · Ziele {met}/{total} ({pct} %)",
  "stats.sprints.col.date": "Datum",
  "stats.sprints.col.words": "Wörter",
  "stats.sprints.col.wpm": "WpM",
  "stats.sprints.col.time": "Zeit",
  "stats.sprints.col.goal": "Ziel",
  "stats.minutesShort": "{minutes} Min.",

  // --- Track → Structure -----------------------------------------------------
  "stats.structure.noProjects": "Keine Projekte mit mehreren Szenen.",
  "stats.structure.byStatus": "Nach Status",
  "stats.structure.byPov": "Nach POV",
  "stats.structure.byAct": "Nach Akt",
  "stats.structure.byChapter": "Nach Kapitel",
  "stats.structure.chapterTargets": "Kapitelziele",

  // --- Track → Drafts --------------------------------------------------------
  "stats.drafts.comparing.one": "Vergleich von {count} Fassung von „{title}“ (Δ gegenüber der ersten Fassung).",
  "stats.drafts.comparing.other": "Vergleich von {count} Fassungen von „{title}“ (Δ gegenüber der ersten Fassung).",
  "stats.drafts.col.draft": "Fassung",
  "stats.drafts.col.words": "Wörter",
  "stats.drafts.col.scenes": "Szenen",
  "stats.drafts.col.statusMix": "Statusverteilung",
  "stats.drafts.col.age": "Alter",
  "stats.drafts.singleNote": "einzelne Notiz",
  "stats.drafts.mixSegment": "{count} {label}",
  "stats.drafts.age.today": "heute",
  "stats.drafts.age.days.one": "{count} Tag",
  "stats.drafts.age.days.other": "{count} Tage",
  "stats.drafts.age.months.one": "{count} Mon.",
  "stats.drafts.age.months.other": "{count} Mon.",

  // --- Track → Project targets -----------------------------------------------
  "stats.targets.empty": "Keine Wortziele für Projekte festgelegt. Nutze den Befehl „Wortziel für das aktive Projekt festlegen“.",
  "stats.targets.met": "{words} / {target} – Ziel erreicht 🎉",
  "stats.targets.noRecent": "{words} / {target} – noch {remaining}, zuletzt nichts geschrieben",
  "stats.targets.eta": "{words} / {target} – noch {remaining}, ca. {days} Tag(e) bei {rate}/Tag",
  "stats.targets.pace.ahead":
    "Voraus · nötig ca. {rate}/Schreibtag · noch {days} Tage (Ø {avg}/Tag über {window} Tage)",
  "stats.targets.pace.onTrack":
    "Im Plan · nötig ca. {rate}/Schreibtag · noch {days} Tage (Ø {avg}/Tag über {window} Tage)",
  "stats.targets.pace.behind":
    "Im Rückstand · nötig ca. {rate}/Schreibtag · noch {days} Tage (Ø {avg}/Tag über {window} Tage)",
  "stats.targets.suggestDeadline": "Lege einen Termin fest (≈{weeks} Wochen empfohlen), um dein Tempo zu verfolgen.",
  "stats.targets.zone": "{pct} % · {label} – {note}",
  "stats.ring.percent": "{pct} %",
  "stats.ring.ofMax": "{value} / {max}",

  // --- Read time (stats/format.ts) -------------------------------------------
  "stats.readTime.underMinute": "<1 Min.",
  "stats.readTime.hours": "{hours} Std. {minutes} Min.",

  // --- Draft-progress zones (goals/goals.ts) ---------------------------------
  "goal.zone.start.label": "Startlinie",
  "goal.zone.start.note": "Benenne, was dich an dieser Geschichte begeistert, und dann schreib schnell und nach vorn.",
  "goal.zone.catalyst.label": "Auslöser-Check",
  "goal.zone.catalyst.note": "Ist das auslösende Ereignis schon passiert? Wenn nicht, bring es jetzt.",
  "goal.zone.act2.label": "Hinein in Akt 2",
  "goal.zone.act2.note": "Die Hauptfigur legt sich fest. Halte den Schwung – fang nicht neu an.",
  "goal.zone.muddle.label": "Der Sumpf",
  "goal.zone.muddle.note": "Die zäheste Strecke. Zweifel sind normal; schreib einfach weiter.",
  "goal.zone.shiny.label": "Verlockende neue Idee",
  "goal.zone.shiny.note": "Lockt ein neues Projekt? Notier es und bring diese Fassung zu Ende.",
  "goal.zone.halfway.label": "Halbzeit",
  "goal.zone.halfway.note": "Erinnere dich, warum du angefangen hast. Kämpf dich durch den Mittelpunkt.",
  "goal.zone.discipline.label": "Disziplin statt Inspiration",
  "goal.zone.discipline.note": "Schreib, egal wie es sich heute anfühlt.",
  "goal.zone.victory.label": "Ziel in Sicht",
  "goal.zone.victory.note": "Noch 30 %. Widersteh dem Überarbeiten – notier Ideen und mach weiter.",
  "goal.zone.homeStretch.label": "Zielgerade",
  "goal.zone.homeStretch.note": "Nimm das Ende ins Visier. Heb Ideen für die Überarbeitung als Treibstoff auf.",
  "goal.zone.windingDown.label": "Auslaufen",
  "goal.zone.windingDown.note": "Hör auf, der Perfektion nachzujagen – es gibt nur den Punkt, an dem du aufhörst.",
  "goal.zone.complete.label": "Fassung fertig",
  "goal.zone.complete.note": "Feier das. Urteile noch nicht darüber – das ist die Aufgabe deines künftigen Ichs.",

  // --- Writing challenge dialog ----------------------------------------------
  "goal.challenge.titleEdit": "Schreib-Challenge bearbeiten",
  "goal.challenge.titleNew": "Schreib-Challenge einrichten",
  "goal.challenge.intro":
    "Zählt jedes Wort, das du im Zeitraum schreibst, auf das Ziel – in jedem Projekt; dieselben Wörter, die auch dein Tagesziel zählt.",
  "goal.challenge.name": "Name",
  "goal.challenge.start": "Beginn",
  "goal.challenge.end": "Ende",
  "goal.challenge.endDesc": "Einschließlich.",
  "goal.challenge.target": "Wortziel",
  "goal.challenge.clear": "Challenge entfernen",
  "goal.challenge.cleared": "Schreib-Challenge entfernt.",
  "goal.challenge.invalid": "Prüfe die Daten (Ende am oder nach dem Beginn, höchstens 400 Tage) und ein Ziel über 0.",
  "goal.challenge.set": "Challenge festgelegt: {target} Wörter, {start} bis {end}.",

  // --- Word target dialog ----------------------------------------------------
  "goal.target.title": "Wortziel: {title}",
  "goal.target.words": "Wortziel",
  "goal.target.wordsDesc": "Angestrebte Gesamtwortzahl für dieses Projekt (0 zum Entfernen).",
  "goal.target.deadline": "Termin",
  "goal.target.deadlineDesc": "Optionales Abschlussdatum – steuert den Tempo-Rechner unter Fortschritt.",
  "goal.target.daysPerWeek": "Schreibtage pro Woche",
  "goal.target.daysPerWeekDesc": "An wie vielen Tagen pro Woche du schreibst (1–7), für die Tempoberechnung.",
  "goal.target.indexMissing": "Projektindex nicht gefunden.",
  "goal.target.saveFailed": "Das Wortziel konnte nicht gespeichert werden.",
  "goal.target.set": "Ziel auf {count} Wörter festgelegt.",
  "goal.target.cleared": "Ziel entfernt.",

  // --- Sprints ---------------------------------------------------------------
  "sprint.alreadyRunning": "Es läuft bereits ein Sprint.",
  "sprint.started": "Sprint gestartet: {minutes} Min.",
  "sprint.startedGoal": "Sprint gestartet: {minutes} Min., Ziel {goal} Wörter",
  "sprint.cancelled": "Sprint abgebrochen.",
  "sprint.complete": "Sprint geschafft! {words} Wörter",
  "sprint.completeGoal": "Sprint geschafft! {words} Wörter (Ziel {goal})",
  "sprint.completeGoalMet": "Sprint geschafft! {words} Wörter (Ziel {goal} ✓)",
  "sprint.modal.title": "Schreibsprint starten",
  "sprint.modal.start": "Starten",
  "sprint.modal.duration": "Dauer (Minuten)",
  "sprint.modal.goal": "Wortziel (optional)",
  "sprint.modal.goalDesc": "Auf 0 lassen für kein Ziel.",

  // --- Writing-history sync --------------------------------------------------
  "track.logSync.writeFailed": "Die Protokollnotiz für den Schreibverlauf konnte nicht geschrieben werden.",
};
