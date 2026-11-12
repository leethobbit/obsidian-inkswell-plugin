/** Brazilian Portuguese UI strings — the `track` area (mirrors ../en/track.ts). */
import type { Catalog } from "../types";

export const track: Catalog = {
  // --- Track → layout --------------------------------------------------------
  "stats.section.activity": "Atividade",
  "stats.section.challenge": "Desafio",
  "stats.section.targets": "Metas dos projetos",
  "stats.section.goals": "Metas",
  "stats.section.sprints": "Sprints",
  "stats.section.structure": "Estrutura",
  "stats.section.drafts": "Versões",

  // --- Track → Activity ------------------------------------------------------
  "stats.activity.heatmap.one": "Atividade ({count} semana)",
  "stats.activity.heatmap.other": "Atividade ({count} semanas)",
  "stats.activity.nextMilestone": "Próximo marco: {milestone} (faltam {remaining})",
  "stats.activity.allMilestones": "Todos os marcos alcançados 🎉",

  // --- Track → Goals ---------------------------------------------------------
  "stats.goals.today": "Hoje",
  "stats.goals.week": "Semana",
  "stats.goals.month": "Mês",
  "stats.goals.habit": "Hábito: {met} / {days} dias nesta semana (≥ {min} palavras/dia)",
  "stats.goals.streak": "Sequência atual {current} · Mais longa {longest}",
  "stats.goals.mood": "Humor hoje:",
  "stats.goals.setUpChallenge": "Configurar um desafio de escrita…",
  "stats.goals.lifetime": "Total de {words} palavras · {days} dias com escrita",
  "stats.goals.lifetimeBest": "Total de {words} palavras · {days} dias com escrita · melhor dia {best} ({date})",

  // --- Track → Challenge card ------------------------------------------------
  "stats.challenge.startsIn.one": "Começa em {count} dia",
  "stats.challenge.startsIn.other": "Começa em {count} dias",
  "stats.challenge.dayOf.one": "Dia {day} de {total} · falta {count} dia",
  "stats.challenge.dayOf.other": "Dia {day} de {total} · faltam {count} dias",
  "stats.challenge.finished": "Encerrado",
  "stats.challenge.upcomingTarget": "Meta de {target} palavras · ≈{perDay}/dia em {days} dias",
  "stats.challenge.parToday": "Ritmo esperado hoje: {par}",
  "stats.challenge.copyTotal": "Copiar total",
  "stats.challenge.copied": "{count} copiado",
  "stats.challenge.copyFailed": "Não foi possível copiar para a área de transferência.",
  "stats.challenge.total": "{total} / {target}",
  "stats.challenge.totalPar": "{total} / {target} (esperado {par})",
  "stats.challenge.met": "Meta alcançada 🎉",
  "stats.challenge.aheadToday": "{diff} à frente · Hoje {today} / {needed} necessárias",
  "stats.challenge.behindToday": "{diff} atrás · Hoje {today} / {needed} necessárias",
  "stats.challenge.metBest": "Meta alcançada 🎉 · melhor dia {best} ({date})",
  "stats.challenge.short": "faltaram {short}",
  "stats.challenge.shortBest": "faltaram {short} · melhor dia {best} ({date})",
  "stats.challenge.deviceOnly":
    "Contando só este dispositivo — ative Sincronizar o histórico de escrita para incluir seus outros dispositivos. {link}",
  "stats.challenge.deviceOnlyLink": "Ativar",

  // --- Track → overview cards ------------------------------------------------
  "stats.card.words": "Palavras",
  "stats.card.scenes": "Cenas",
  "stats.card.readTime": "Tempo de leitura",
  "stats.card.today": "Hoje",

  // --- Track → writing history chart -----------------------------------------
  "stats.range.days7": "7 d",
  "stats.range.days30": "30 d",
  "stats.range.days90": "90 d",
  "stats.range.all": "Tudo",
  "stats.chart.empty": "Nenhuma escrita registrada ainda.",
  "stats.chart.bar.one": "{date}: {count} palavra",
  "stats.chart.bar.other": "{date}: {count} palavras",
  "stats.chart.max": "máx. {max}/dia",

  // --- Track → Sprints -------------------------------------------------------
  "stats.sprints.empty": "Nenhum sprint ainda. Comece um em Escrever ou pela paleta de comandos.",
  "stats.sprints.summary.one": "{count} sprint · {words} palavras · média de {wpm} ppm",
  "stats.sprints.summary.other": "{count} sprints · {words} palavras · média de {wpm} ppm",
  "stats.sprints.best": "Melhor: {words} palavras · pico de {wpm} ppm",
  "stats.sprints.bestGoals": "Melhor: {words} palavras · pico de {wpm} ppm · metas {met}/{total} ({pct}%)",
  "stats.sprints.col.date": "Data",
  "stats.sprints.col.words": "Palavras",
  "stats.sprints.col.wpm": "ppm",
  "stats.sprints.col.time": "Tempo",
  "stats.sprints.col.goal": "Meta",
  "stats.minutesShort": "{minutes} min",

  // --- Track → Structure -----------------------------------------------------
  "stats.structure.noProjects": "Nenhum projeto com várias cenas.",
  "stats.structure.byStatus": "Por status",
  "stats.structure.byPov": "Por POV",
  "stats.structure.byAct": "Por ato",
  "stats.structure.byChapter": "Por capítulo",
  "stats.structure.chapterTargets": "Metas dos capítulos",

  // --- Track → Drafts --------------------------------------------------------
  "stats.drafts.comparing.one": "Comparando {count} versão de “{title}” (Δ em relação à primeira versão).",
  "stats.drafts.comparing.other": "Comparando {count} versões de “{title}” (Δ em relação à primeira versão).",
  "stats.drafts.col.draft": "Versão",
  "stats.drafts.col.words": "Palavras",
  "stats.drafts.col.scenes": "Cenas",
  "stats.drafts.col.statusMix": "Distribuição de status",
  "stats.drafts.col.age": "Idade",
  "stats.drafts.singleNote": "nota única",
  "stats.drafts.mixSegment": "{count} {label}",
  "stats.drafts.age.today": "hoje",
  "stats.drafts.age.days.one": "{count} dia",
  "stats.drafts.age.days.other": "{count} dias",
  "stats.drafts.age.months.one": "{count} mês",
  "stats.drafts.age.months.other": "{count} meses",

  // --- Track → Project targets -----------------------------------------------
  "stats.targets.empty": "Nenhuma meta de palavras definida nos projetos. Use o comando “Definir a meta de palavras do projeto ativo”.",
  "stats.targets.met": "{words} / {target} — meta alcançada 🎉",
  "stats.targets.noRecent": "{words} / {target} — faltam {remaining}, sem escrita recente",
  "stats.targets.eta": "{words} / {target} — faltam {remaining}, ~{days} dia(s) a {rate}/dia",
  "stats.targets.pace.ahead":
    "Adiantado · precisa de ~{rate}/dia de escrita · faltam {days} dias (média de {avg}/dia nos últimos {window} dias)",
  "stats.targets.pace.onTrack":
    "No ritmo · precisa de ~{rate}/dia de escrita · faltam {days} dias (média de {avg}/dia nos últimos {window} dias)",
  "stats.targets.pace.behind":
    "Atrasado · precisa de ~{rate}/dia de escrita · faltam {days} dias (média de {avg}/dia nos últimos {window} dias)",
  "stats.targets.suggestDeadline": "Defina um prazo (sugestão: ≈{weeks} semanas) para acompanhar o ritmo.",
  "stats.targets.zone": "{pct}% · {label} — {note}",
  "stats.ring.percent": "{pct}%",
  "stats.ring.ofMax": "{value} / {max}",

  // --- Read time (stats/format.ts) -------------------------------------------
  "stats.readTime.underMinute": "<1 min",
  "stats.readTime.hours": "{hours} h {minutes} min",

  // --- Draft-progress zones (goals/goals.ts) ---------------------------------
  "goal.zone.start.label": "Linha de largada",
  "goal.zone.start.note": "Diga por que esta história empolga você, depois escreva rápido e sempre para a frente.",
  "goal.zone.catalyst.label": "Hora do catalisador",
  "goal.zone.catalyst.note": "O incidente incitante já aconteceu? Se não, provoque-o agora.",
  "goal.zone.act2.label": "Entrando no Ato 2",
  "goal.zone.act2.note": "O herói se compromete. Mantenha o embalo — não recomece.",
  "goal.zone.muddle.label": "O atoleiro",
  "goal.zone.muddle.note": "O trecho mais difícil. Duvidar é normal; continue escrevendo para a frente.",
  "goal.zone.shiny.label": "A ideia nova e brilhante",
  "goal.zone.shiny.note": "Tentado por um projeto novo? Anote a ideia e termine este rascunho.",
  "goal.zone.halfway.label": "Metade do caminho",
  "goal.zone.halfway.note": "Lembre-se de por que você começou. Atravesse o ponto médio.",
  "goal.zone.discipline.label": "Disciplina acima da inspiração",
  "goal.zone.discipline.note": "Escreva, não importa como você se sinta hoje.",
  "goal.zone.victory.label": "Vitória à vista",
  "goal.zone.victory.note": "Faltam 30%. Resista à vontade de revisar — anote as ideias e siga em frente.",
  "goal.zone.homeStretch.label": "Reta final",
  "goal.zone.homeStretch.note": "Comece a mirar no final. Guarde as ideias de revisão como combustível.",
  "goal.zone.windingDown.label": "Desacelerando",
  "goal.zone.windingDown.note": "Pare de buscar a perfeição — o fim é simplesmente onde você para.",
  "goal.zone.complete.label": "Rascunho completo",
  "goal.zone.complete.note": "Comemore. Não julgue ainda — isso é trabalho do Você do Futuro.",

  // --- Writing challenge dialog ----------------------------------------------
  "goal.challenge.titleEdit": "Editar desafio de escrita",
  "goal.challenge.titleNew": "Configurar um desafio de escrita",
  "goal.challenge.intro":
    "Conta para a meta cada palavra que você escrever no período, em qualquer projeto — as mesmas palavras que a sua meta diária conta.",
  "goal.challenge.name": "Nome",
  "goal.challenge.start": "Início",
  "goal.challenge.end": "Fim",
  "goal.challenge.endDesc": "Incluído.",
  "goal.challenge.target": "Meta de palavras",
  "goal.challenge.clear": "Limpar desafio",
  "goal.challenge.cleared": "Desafio de escrita removido.",
  "goal.challenge.invalid": "Confira as datas (fim no mesmo dia ou depois do início, no máximo 400 dias) e uma meta acima de 0.",
  "goal.challenge.set": "Desafio definido: {target} palavras, de {start} a {end}.",

  // --- Word target dialog ----------------------------------------------------
  "goal.target.title": "Meta de palavras: {title}",
  "goal.target.words": "Meta de palavras",
  "goal.target.wordsDesc": "Meta de contagem total de palavras para este projeto (0 para limpar).",
  "goal.target.deadline": "Prazo",
  "goal.target.deadlineDesc": "Data de conclusão opcional — alimenta a calculadora de ritmo em Acompanhar.",
  "goal.target.daysPerWeek": "Dias de escrita por semana",
  "goal.target.daysPerWeekDesc": "Quantos dias por semana você escreve (1–7), para o cálculo do ritmo.",
  "goal.target.indexMissing": "Índice do projeto não encontrado.",
  "goal.target.saveFailed": "Não foi possível salvar a meta de palavras.",
  "goal.target.set": "Meta definida para {count} palavras.",
  "goal.target.cleared": "Meta removida.",

  // --- Sprints ---------------------------------------------------------------
  "sprint.alreadyRunning": "Já há um sprint em andamento.",
  "sprint.started": "Sprint iniciado: {minutes} min",
  "sprint.startedGoal": "Sprint iniciado: {minutes} min, meta de {goal} palavras",
  "sprint.cancelled": "Sprint cancelado.",
  "sprint.complete": "Sprint concluído! {words} palavras",
  "sprint.completeGoal": "Sprint concluído! {words} palavras (meta {goal})",
  "sprint.completeGoalMet": "Sprint concluído! {words} palavras (meta {goal} ✓)",
  "sprint.modal.title": "Iniciar um sprint de escrita",
  "sprint.modal.start": "Iniciar",
  "sprint.modal.duration": "Duração (minutos)",
  "sprint.modal.goal": "Meta de palavras (opcional)",
  "sprint.modal.goalDesc": "Deixe em 0 para não ter meta.",

  // --- Writing-history sync --------------------------------------------------
  "track.logSync.writeFailed": "Não foi possível gravar a nota de registro do histórico de escrita.",
};
