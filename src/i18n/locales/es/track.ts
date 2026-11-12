/** Spanish UI strings — the `track` area (mirrors ../en/track.ts). */
import type { Catalog } from "../types";

export const track: Catalog = {
  // --- Track → layout --------------------------------------------------------
  "stats.section.activity": "Actividad",
  "stats.section.challenge": "Reto",
  "stats.section.targets": "Objetivos de los proyectos",
  "stats.section.goals": "Metas",
  "stats.section.sprints": "Sprints",
  "stats.section.structure": "Estructura",
  "stats.section.drafts": "Borradores",

  // --- Track → Activity ------------------------------------------------------
  "stats.activity.heatmap.one": "Actividad ({count} semana)",
  "stats.activity.heatmap.other": "Actividad ({count} semanas)",
  "stats.activity.nextMilestone": "Próximo hito: {milestone} (faltan {remaining})",
  "stats.activity.allMilestones": "Todos los hitos alcanzados 🎉",

  // --- Track → Goals ---------------------------------------------------------
  "stats.goals.today": "Hoy",
  "stats.goals.week": "Semana",
  "stats.goals.month": "Mes",
  "stats.goals.habit": "Hábito: {met} / {days} días esta semana (≥ {min} palabras/día)",
  "stats.goals.streak": "Racha actual {current} · Mejor racha {longest}",
  "stats.goals.mood": "Ánimo de hoy:",
  "stats.goals.setUpChallenge": "Configurar un reto de escritura…",
  "stats.goals.lifetime": "Total {words} palabras · {days} días de escritura",
  "stats.goals.lifetimeBest": "Total {words} palabras · {days} días de escritura · mejor día {best} ({date})",

  // --- Track → Challenge card ------------------------------------------------
  "stats.challenge.startsIn.one": "Empieza dentro de {count} día",
  "stats.challenge.startsIn.other": "Empieza dentro de {count} días",
  "stats.challenge.dayOf.one": "Día {day} de {total} · queda {count} día",
  "stats.challenge.dayOf.other": "Día {day} de {total} · quedan {count} días",
  "stats.challenge.finished": "Terminado",
  "stats.challenge.upcomingTarget": "Objetivo {target} palabras · ≈{perDay}/día durante {days} días",
  "stats.challenge.parToday": "Ritmo previsto para hoy: {par}",
  "stats.challenge.copyTotal": "Copiar total",
  "stats.challenge.copied": "Se copió {count}",
  "stats.challenge.copyFailed": "No se pudo copiar al portapapeles.",
  "stats.challenge.total": "{total} / {target}",
  "stats.challenge.totalPar": "{total} / {target} (previsto {par})",
  "stats.challenge.met": "Objetivo cumplido 🎉",
  "stats.challenge.aheadToday": "Vas {diff} por delante · Hoy {today} / {needed} necesarias",
  "stats.challenge.behindToday": "Vas {diff} por detrás · Hoy {today} / {needed} necesarias",
  "stats.challenge.metBest": "Objetivo cumplido 🎉 · mejor día {best} ({date})",
  "stats.challenge.short": "Faltaron {short}",
  "stats.challenge.shortBest": "Faltaron {short} · mejor día {best} ({date})",
  "stats.challenge.deviceOnly":
    "Solo se cuenta este dispositivo; activa Sincronizar el historial de escritura para incluir tus otros dispositivos. {link}",
  "stats.challenge.deviceOnlyLink": "Activarlo",

  // --- Track → overview cards ------------------------------------------------
  "stats.card.words": "Palabras",
  "stats.card.scenes": "Escenas",
  "stats.card.readTime": "Tiempo de lectura",
  "stats.card.today": "Hoy",

  // --- Track → writing history chart -----------------------------------------
  "stats.range.days7": "7 d",
  "stats.range.days30": "30 d",
  "stats.range.days90": "90 d",
  "stats.range.all": "Todo",
  "stats.chart.empty": "Aún no hay escritura registrada.",
  "stats.chart.bar.one": "{date}: {count} palabra",
  "stats.chart.bar.other": "{date}: {count} palabras",
  "stats.chart.max": "máx. {max}/día",

  // --- Track → Sprints -------------------------------------------------------
  "stats.sprints.empty": "Aún no hay sprints. Empieza uno desde Escribir o desde la paleta de comandos.",
  "stats.sprints.summary.one": "{count} sprint · {words} palabras · {wpm} ppm de media",
  "stats.sprints.summary.other": "{count} sprints · {words} palabras · {wpm} ppm de media",
  "stats.sprints.best": "Mejor {words} palabras · {wpm} ppm máximo",
  "stats.sprints.bestGoals": "Mejor {words} palabras · {wpm} ppm máximo · metas {met}/{total} ({pct} %)",
  "stats.sprints.col.date": "Fecha",
  "stats.sprints.col.words": "Palabras",
  "stats.sprints.col.wpm": "ppm",
  "stats.sprints.col.time": "Tiempo",
  "stats.sprints.col.goal": "Meta",
  "stats.minutesShort": "{minutes} min",

  // --- Track → Structure -----------------------------------------------------
  "stats.structure.noProjects": "No hay proyectos de varias escenas.",
  "stats.structure.byStatus": "Por estado",
  "stats.structure.byPov": "Por POV",
  "stats.structure.byAct": "Por acto",
  "stats.structure.byChapter": "Por capítulo",
  "stats.structure.chapterTargets": "Objetivos por capítulo",

  // --- Track → Drafts --------------------------------------------------------
  "stats.drafts.comparing.one": "Comparando {count} borrador de «{title}» (Δ frente al primer borrador).",
  "stats.drafts.comparing.other": "Comparando {count} borradores de «{title}» (Δ frente al primer borrador).",
  "stats.drafts.col.draft": "Borrador",
  "stats.drafts.col.words": "Palabras",
  "stats.drafts.col.scenes": "Escenas",
  "stats.drafts.col.statusMix": "Reparto de estados",
  "stats.drafts.col.age": "Antigüedad",
  "stats.drafts.singleNote": "nota única",
  "stats.drafts.mixSegment": "{count} {label}",
  "stats.drafts.age.today": "hoy",
  "stats.drafts.age.days.one": "{count} día",
  "stats.drafts.age.days.other": "{count} días",
  "stats.drafts.age.months.one": "{count} mes",
  "stats.drafts.age.months.other": "{count} meses",

  // --- Track → Project targets -----------------------------------------------
  "stats.targets.empty": "No hay objetivos de palabras en los proyectos. Usa el comando «Fijar el objetivo de palabras».",
  "stats.targets.met": "{words} / {target}: objetivo cumplido 🎉",
  "stats.targets.noRecent": "{words} / {target}: faltan {remaining}, sin escritura reciente",
  "stats.targets.eta": "{words} / {target}: faltan {remaining}, unos {days} días a {rate}/día",
  "stats.targets.pace.ahead":
    "Por delante · necesitas ~{rate}/día de escritura · quedan {days} días (media {avg}/día en {window} días)",
  "stats.targets.pace.onTrack":
    "Al día · necesitas ~{rate}/día de escritura · quedan {days} días (media {avg}/día en {window} días)",
  "stats.targets.pace.behind":
    "Por detrás · necesitas ~{rate}/día de escritura · quedan {days} días (media {avg}/día en {window} días)",
  "stats.targets.suggestDeadline": "Fija una fecha límite (se sugieren ≈{weeks} semanas) para seguir el ritmo.",
  "stats.targets.zone": "{pct} % · {label}: {note}",
  "stats.ring.percent": "{pct} %",
  "stats.ring.ofMax": "{value} / {max}",

  // --- Read time (stats/format.ts) -------------------------------------------
  "stats.readTime.underMinute": "<1 min",
  "stats.readTime.hours": "{hours} h {minutes} min",

  // --- Draft-progress zones (goals/goals.ts) ---------------------------------
  "goal.zone.start.label": "Línea de salida",
  "goal.zone.start.note": "Ponle nombre a lo que te entusiasma de esta historia y luego escribe rápido y hacia delante.",
  "goal.zone.catalyst.label": "Revisión del catalizador",
  "goal.zone.catalyst.note": "¿Ha llegado ya el incidente desencadenante? Si no, provócalo ahora.",
  "goal.zone.act2.label": "Entrando en el acto 2",
  "goal.zone.act2.note": "El héroe se compromete. Mantén el impulso; no vuelvas a empezar.",
  "goal.zone.muddle.label": "El atolladero",
  "goal.zone.muddle.note": "El tramo más difícil. Dudar es normal; sigue redactando hacia delante.",
  "goal.zone.shiny.label": "La idea nueva y reluciente",
  "goal.zone.shiny.note": "¿Te tienta un proyecto nuevo? Anótalo y termina este borrador.",
  "goal.zone.halfway.label": "A mitad de camino",
  "goal.zone.halfway.note": "Recuerda por qué empezaste. Supera el punto medio.",
  "goal.zone.discipline.label": "Disciplina antes que inspiración",
  "goal.zone.discipline.note": "Escribe, te sientas como te sientas hoy.",
  "goal.zone.victory.label": "La victoria a la vista",
  "goal.zone.victory.note": "Queda un 30 %. Resiste la tentación de revisar: anota las ideas y sigue.",
  "goal.zone.homeStretch.label": "La recta final",
  "goal.zone.homeStretch.note": "Empieza a apuntar al final. Guarda las ideas de revisión como combustible.",
  "goal.zone.windingDown.label": "Cerrando",
  "goal.zone.windingDown.note": "Deja de perseguir la perfección: solo existe el punto donde paras.",
  "goal.zone.complete.label": "Borrador terminado",
  "goal.zone.complete.note": "Celébralo. No lo juzgues todavía: eso es trabajo de tu yo del futuro.",

  // --- Writing challenge dialog ----------------------------------------------
  "goal.challenge.titleEdit": "Editar reto de escritura",
  "goal.challenge.titleNew": "Configurar un reto de escritura",
  "goal.challenge.intro":
    "Cuenta para el objetivo cada palabra que escribas en ese intervalo de fechas, en cualquier proyecto: las mismas palabras que cuenta tu meta diaria.",
  "goal.challenge.name": "Nombre",
  "goal.challenge.start": "Inicio",
  "goal.challenge.end": "Fin",
  "goal.challenge.endDesc": "Incluido.",
  "goal.challenge.target": "Palabras objetivo",
  "goal.challenge.clear": "Borrar el reto",
  "goal.challenge.cleared": "Reto de escritura borrado.",
  "goal.challenge.invalid": "Revisa las fechas (el fin igual o posterior al inicio, 400 días como máximo) y un objetivo mayor que 0.",
  "goal.challenge.set": "Reto fijado: {target} palabras, del {start} al {end}.",

  // --- Word target dialog ----------------------------------------------------
  "goal.target.title": "Objetivo de palabras: {title}",
  "goal.target.words": "Palabras objetivo",
  "goal.target.wordsDesc": "Meta total de palabras de este proyecto (0 para borrarla).",
  "goal.target.deadline": "Fecha límite",
  "goal.target.deadlineDesc": "Fecha opcional de finalización: alimenta la calculadora de ritmo de Progreso.",
  "goal.target.daysPerWeek": "Días de escritura por semana",
  "goal.target.daysPerWeekDesc": "Cuántos días a la semana escribes (1–7), para calcular el ritmo.",
  "goal.target.indexMissing": "No se encontró el índice del proyecto.",
  "goal.target.saveFailed": "No se pudo guardar el objetivo de palabras.",
  "goal.target.set": "Objetivo fijado en {count} palabras.",
  "goal.target.cleared": "Objetivo borrado.",

  // --- Sprints ---------------------------------------------------------------
  "sprint.alreadyRunning": "Ya hay un sprint en marcha.",
  "sprint.started": "Sprint iniciado: {minutes} min",
  "sprint.startedGoal": "Sprint iniciado: {minutes} min, meta {goal} palabras",
  "sprint.cancelled": "Sprint cancelado.",
  "sprint.complete": "¡Sprint terminado! {words} palabras",
  "sprint.completeGoal": "¡Sprint terminado! {words} palabras (meta {goal})",
  "sprint.completeGoalMet": "¡Sprint terminado! {words} palabras (meta {goal} ✓)",
  "sprint.modal.title": "Empezar un sprint de escritura",
  "sprint.modal.start": "Empezar",
  "sprint.modal.duration": "Duración (minutos)",
  "sprint.modal.goal": "Meta de palabras (opcional)",
  "sprint.modal.goalDesc": "Déjalo en 0 para no tener meta.",

  // --- Writing-history sync --------------------------------------------------
  "track.logSync.writeFailed": "No se pudo escribir la nota de registro del historial de escritura.",
};
