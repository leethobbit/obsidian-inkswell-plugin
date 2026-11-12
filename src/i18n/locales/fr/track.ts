/** French UI strings — the `track` area (mirrors ../en/track.ts). */
import type { Catalog } from "../types";

export const track: Catalog = {
  // --- Track → layout --------------------------------------------------------
  "stats.section.activity": "Activité",
  "stats.section.challenge": "Défi",
  "stats.section.targets": "Objectifs des projets",
  "stats.section.goals": "Objectifs",
  "stats.section.sprints": "Sprints",
  "stats.section.structure": "Structure",
  "stats.section.drafts": "Versions",

  // --- Track → Activity ------------------------------------------------------
  "stats.activity.heatmap.one": "Activité ({count} semaine)",
  "stats.activity.heatmap.other": "Activité ({count} semaines)",
  "stats.activity.nextMilestone": "Prochain palier : {milestone} (encore {remaining})",
  "stats.activity.allMilestones": "Tous les paliers sont atteints 🎉",

  // --- Track → Goals ---------------------------------------------------------
  "stats.goals.today": "Aujourd’hui",
  "stats.goals.week": "Semaine",
  "stats.goals.month": "Mois",
  "stats.goals.habit": "Habitude : {met} / {days} jours cette semaine (≥ {min} mots par jour)",
  "stats.goals.streak": "Série en cours : {current} · record : {longest}",
  "stats.goals.mood": "Humeur du jour :",
  "stats.goals.setUpChallenge": "Configurer un défi d’écriture…",
  "stats.goals.lifetime": "Total {words} mots · {days} jours d’écriture",
  "stats.goals.lifetimeBest": "Total {words} mots · {days} jours d’écriture · meilleur jour {best} ({date})",

  // --- Track → Challenge card ------------------------------------------------
  "stats.challenge.startsIn.one": "Commence dans {count} jour",
  "stats.challenge.startsIn.other": "Commence dans {count} jours",
  "stats.challenge.dayOf.one": "Jour {day} sur {total} · {count} jour restant",
  "stats.challenge.dayOf.other": "Jour {day} sur {total} · {count} jours restants",
  "stats.challenge.finished": "Terminé",
  "stats.challenge.upcomingTarget": "Objectif {target} mots · ≈ {perDay} par jour sur {days} jours",
  "stats.challenge.parToday": "Repère du jour : {par}",
  "stats.challenge.copyTotal": "Copier le total",
  "stats.challenge.copied": "{count} copié",
  "stats.challenge.copyFailed": "Impossible de copier dans le presse-papiers.",
  "stats.challenge.total": "{total} / {target}",
  "stats.challenge.totalPar": "{total} / {target} (repère {par})",
  "stats.challenge.met": "Objectif atteint 🎉",
  "stats.challenge.aheadToday": "En avance de {diff} · Aujourd’hui {today} / {needed} nécessaires",
  "stats.challenge.behindToday": "En retard de {diff} · Aujourd’hui {today} / {needed} nécessaires",
  "stats.challenge.metBest": "Objectif atteint 🎉 · meilleur jour {best} ({date})",
  "stats.challenge.short": "Il manque {short}",
  "stats.challenge.shortBest": "Il manque {short} · meilleur jour {best} ({date})",
  "stats.challenge.deviceOnly":
    "Seul cet appareil est compté — activez Synchroniser l’historique d’écriture pour inclure vos autres appareils. {link}",
  "stats.challenge.deviceOnlyLink": "L’activer",

  // --- Track → overview cards ------------------------------------------------
  "stats.card.words": "Mots",
  "stats.card.scenes": "Scènes",
  "stats.card.readTime": "Temps de lecture",
  "stats.card.today": "Aujourd’hui",

  // --- Track → writing history chart -----------------------------------------
  "stats.range.days7": "7 j",
  "stats.range.days30": "30 j",
  "stats.range.days90": "90 j",
  "stats.range.all": "Tout",
  "stats.chart.empty": "Aucune écriture enregistrée pour l’instant.",
  // `.one` reads "words" on purpose: English output must not change (rule 1).
  "stats.chart.bar.one": "{date} : {count} mot",
  "stats.chart.bar.other": "{date} : {count} mots",
  "stats.chart.max": "max. {max} par jour",

  // --- Track → Sprints -------------------------------------------------------
  "stats.sprints.empty": "Aucun sprint pour l’instant. Lancez-en un depuis Écrire ou la palette de commandes.",
  // `.one` reads "sprints" on purpose: English output must not change (rule 1).
  "stats.sprints.summary.one": "{count} sprint · {words} mots · {wpm} mots/min en moyenne",
  "stats.sprints.summary.other": "{count} sprints · {words} mots · {wpm} mots/min en moyenne",
  "stats.sprints.best": "Record {words} mots · pointe à {wpm} mots/min",
  "stats.sprints.bestGoals": "Record {words} mots · pointe à {wpm} mots/min · objectifs {met}/{total} ({pct} %)",
  "stats.sprints.col.date": "Date",
  "stats.sprints.col.words": "Mots",
  "stats.sprints.col.wpm": "mots/min",
  "stats.sprints.col.time": "Durée",
  "stats.sprints.col.goal": "Objectif",
  "stats.minutesShort": "{minutes} min",

  // --- Track → Structure -----------------------------------------------------
  "stats.structure.noProjects": "Aucun projet en plusieurs scènes.",
  "stats.structure.byStatus": "Par statut",
  "stats.structure.byPov": "Par PDV",
  "stats.structure.byAct": "Par acte",
  "stats.structure.byChapter": "Par chapitre",
  "stats.structure.chapterTargets": "Objectifs des chapitres",

  // --- Track → Drafts --------------------------------------------------------
  "stats.drafts.comparing.one": "Comparaison de {count} version de « {title} » (Δ par rapport à la première version).",
  "stats.drafts.comparing.other": "Comparaison de {count} versions de « {title} » (Δ par rapport à la première version).",
  "stats.drafts.col.draft": "Version",
  "stats.drafts.col.words": "Mots",
  "stats.drafts.col.scenes": "Scènes",
  "stats.drafts.col.statusMix": "Répartition des statuts",
  "stats.drafts.col.age": "Âge",
  "stats.drafts.singleNote": "note unique",
  "stats.drafts.mixSegment": "{count} {label}",
  "stats.drafts.age.today": "aujourd’hui",
  "stats.drafts.age.days.one": "{count} jour",
  "stats.drafts.age.days.other": "{count} jours",
  "stats.drafts.age.months.one": "{count} mois",
  "stats.drafts.age.months.other": "{count} mois",

  // --- Track → Project targets -----------------------------------------------
  "stats.targets.empty": "Aucun objectif de mots défini pour les projets. Utilisez la commande « Définir l’objectif de mots ».",
  "stats.targets.met": "{words} / {target} — objectif atteint 🎉",
  "stats.targets.noRecent": "{words} / {target} — encore {remaining}, pas d’écriture récente",
  "stats.targets.eta": "{words} / {target} — encore {remaining}, ~{days} jour(s) à {rate} par jour",
  "stats.targets.pace.ahead":
    "En avance · il faut ~{rate} par jour d’écriture · {days} jours restants (moyenne {avg} par jour sur {window} jours)",
  "stats.targets.pace.onTrack":
    "Dans les temps · il faut ~{rate} par jour d’écriture · {days} jours restants (moyenne {avg} par jour sur {window} jours)",
  "stats.targets.pace.behind":
    "En retard · il faut ~{rate} par jour d’écriture · {days} jours restants (moyenne {avg} par jour sur {window} jours)",
  "stats.targets.suggestDeadline": "Fixez une échéance (≈ {weeks} semaines suggérées) pour suivre votre rythme.",
  "stats.targets.zone": "{pct} % · {label} — {note}",
  "stats.ring.percent": "{pct} %",
  "stats.ring.ofMax": "{value} / {max}",

  // --- Read time (stats/format.ts) -------------------------------------------
  "stats.readTime.underMinute": "< 1 min",
  "stats.readTime.hours": "{hours} h {minutes} min",

  // --- Draft-progress zones (goals/goals.ts) ---------------------------------
  "goal.zone.start.label": "Ligne de départ",
  "goal.zone.start.note": "Formulez ce qui vous enthousiasme dans cette histoire, puis écrivez vite, toujours en avant.",
  "goal.zone.catalyst.label": "Où en est le catalyseur ?",
  "goal.zone.catalyst.note": "L’élément déclencheur a-t-il eu lieu ? Sinon, provoquez-le maintenant.",
  "goal.zone.act2.label": "Entrée dans l’acte II",
  "goal.zone.act2.note": "Le héros s’engage. Gardez l’élan — ne recommencez pas.",
  "goal.zone.muddle.label": "Le ventre mou",
  "goal.zone.muddle.note": "Le passage le plus dur. Le doute est normal ; continuez d’avancer.",
  "goal.zone.shiny.label": "La nouvelle idée qui brille",
  "goal.zone.shiny.note": "Tenté par un nouveau projet ? Notez-le et terminez cette version.",
  "goal.zone.halfway.label": "À mi-chemin",
  "goal.zone.halfway.note": "Retrouvez pourquoi vous avez commencé. Franchissez le point médian.",
  "goal.zone.discipline.label": "La discipline avant l’inspiration",
  "goal.zone.discipline.note": "Écrivez, quel que soit votre ressenti aujourd’hui.",
  "goal.zone.victory.label": "La victoire en vue",
  "goal.zone.victory.note": "Plus que 30 %. Résistez à l’envie de réviser — notez vos idées et avancez.",
  "goal.zone.homeStretch.label": "Dernière ligne droite",
  "goal.zone.homeStretch.note": "Commencez à viser la fin. Gardez vos idées de révision comme carburant.",
  "goal.zone.windingDown.label": "Le bout du chemin",
  "goal.zone.windingDown.note": "Cessez de courir après la perfection — un texte n’est jamais fini, on choisit où s’arrêter.",
  "goal.zone.complete.label": "Version terminée",
  "goal.zone.complete.note": "Fêtez ça. Ne la jugez pas encore — ce sera le travail de votre vous futur.",

  // --- Writing challenge dialog ----------------------------------------------
  "goal.challenge.titleEdit": "Modifier le défi d’écriture",
  "goal.challenge.titleNew": "Configurer un défi d’écriture",
  "goal.challenge.intro":
    "Compte pour l’objectif chaque mot écrit pendant la période, dans n’importe quel projet — les mêmes mots que compte votre objectif quotidien.",
  "goal.challenge.name": "Nom",
  "goal.challenge.start": "Début",
  "goal.challenge.end": "Fin",
  "goal.challenge.endDesc": "Incluse.",
  "goal.challenge.target": "Objectif de mots",
  "goal.challenge.clear": "Effacer le défi",
  "goal.challenge.cleared": "Défi d’écriture effacé.",
  "goal.challenge.invalid": "Vérifiez les dates (fin le jour du début ou après, 400 jours au maximum) et un objectif supérieur à 0.",
  "goal.challenge.set": "Défi défini : {target} mots, du {start} au {end}.",

  // --- Word target dialog ----------------------------------------------------
  "goal.target.title": "Objectif de mots : {title}",
  "goal.target.words": "Objectif de mots",
  "goal.target.wordsDesc": "Nombre total de mots visé pour ce projet (0 pour effacer).",
  "goal.target.deadline": "Échéance",
  "goal.target.deadlineDesc": "Date de fin facultative — alimente le calcul du rythme dans Suivi.",
  "goal.target.daysPerWeek": "Jours d’écriture par semaine",
  "goal.target.daysPerWeekDesc": "Combien de jours par semaine vous écrivez (1–7), pour le calcul du rythme.",
  "goal.target.indexMissing": "Index du projet introuvable.",
  "goal.target.saveFailed": "Impossible d’enregistrer l’objectif de mots.",
  "goal.target.set": "Objectif fixé à {count} mots.",
  "goal.target.cleared": "Objectif effacé.",

  // --- Sprints ---------------------------------------------------------------
  "sprint.alreadyRunning": "Un sprint est déjà en cours.",
  "sprint.started": "Sprint lancé : {minutes} min",
  "sprint.startedGoal": "Sprint lancé : {minutes} min, objectif {goal} mots",
  "sprint.cancelled": "Sprint annulé.",
  "sprint.complete": "Sprint terminé ! {words} mots",
  "sprint.completeGoal": "Sprint terminé ! {words} mots (objectif {goal})",
  "sprint.completeGoalMet": "Sprint terminé ! {words} mots (objectif {goal} ✓)",
  "sprint.modal.title": "Lancer un sprint d’écriture",
  "sprint.modal.start": "Lancer",
  "sprint.modal.duration": "Durée (minutes)",
  "sprint.modal.goal": "Objectif de mots (facultatif)",
  "sprint.modal.goalDesc": "Laissez 0 pour ne pas fixer d’objectif.",

  // --- Writing-history sync --------------------------------------------------
  "track.logSync.writeFailed": "Impossible d’écrire la note de journal de l’historique d’écriture.",
};
