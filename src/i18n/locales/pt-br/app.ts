/** Brazilian Portuguese UI strings — the `app` area (mirrors ../en/app.ts). */
import type { Catalog } from "../types";

export const app: Catalog = {
  // --- Plugin load -----------------------------------------------------------
  "app.hoverSource": "Editor Escrever do Inkswell",
  "app.ribbon": "Projetos do Inkswell",
  "app.recovered":
    "O Inkswell não conseguiu ler o arquivo de dados, então carregou suas configurações e seu histórico de escrita do backup de {date}. Alterações feitas depois desse dia podem estar faltando.",
  "app.recoveredKept":
    "O Inkswell não conseguiu ler o arquivo de dados, então carregou suas configurações e seu histórico de escrita do backup de {date}. Alterações feitas depois desse dia podem estar faltando. O arquivo ilegível foi mantido como {file}.",
  "app.categoryNotice":
    "As metas do Inkswell agora contam só as palavras dos projetos. Escolha o que conta (cenas, planejamento, Codex) em Configurações → Inkswell.",

  // --- Commands --------------------------------------------------------------
  "app.command.openProjects": "Abrir projetos",
  "app.command.newProject": "Novo projeto",
  "app.command.renameProject": "Renomear projeto",
  "app.command.archiveProject": "Arquivar o projeto atual",
  "app.command.unarchiveProject": "Desarquivar o projeto atual",
  "app.command.setUpChallenge": "Configurar desafio de escrita",
  "app.command.exportStoryBible": "Exportar bíblia da história",
  "app.command.newScene": "Nova cena",
  "app.command.sortByChapter": "Ordenar cenas pelo número do capítulo",
  "app.command.openBeats": "Abrir folha de beats (Planejar)",
  "app.command.openBoard": "Abrir quadro (Planejar)",
  "app.command.openPlotGrid": "Abrir grade de enredo (Planejar)",
  "app.command.openCodex": "Abrir Codex",
  "app.command.openWrite": "Abrir Escrever",
  "app.command.openStats": "Abrir estatísticas de escrita (Acompanhar)",
  "app.command.openCompile": "Abrir compilação (Publicar)",
  "app.command.compileActive": "Compilar o projeto ativo",
  "app.command.searchScenes": "Buscar cenas",
  "app.command.insertTodo": "Inserir um marcador de pendência…",
  "app.command.toggleBold": "Alternar negrito (editor Escrever)",
  "app.command.toggleItalic": "Alternar itálico (editor Escrever)",
  "app.command.toggleStrikethrough": "Alternar tachado (editor Escrever)",
  "app.command.splitScene": "Dividir a cena no cursor (editor Escrever)",
  "app.command.toggleStream": "Alternar fluxo de cenas (Escrever)",
  "app.command.jumpToChapter": "Ir para o capítulo… (fluxo de cenas)",
  "app.command.nextChapter": "Próximo capítulo (fluxo de cenas)",
  "app.command.previousChapter": "Capítulo anterior (fluxo de cenas)",
  "app.command.moveSelection": "Mover a seleção para uma nova cena (editor Escrever)",
  "app.command.quickCodex": "Criar verbete do Codex a partir da seleção (editor Escrever)",
  "app.command.openLink": "Abrir o link no cursor (editor Escrever)",
  "app.command.toggleTypewriter": "Alternar modo máquina de escrever (editor Escrever)",
  "app.typewriterOn": "Modo máquina de escrever ativado",
  "app.typewriterOff": "Modo máquina de escrever desativado",
  "app.command.startSprint": "Iniciar um sprint de escrita",
  "app.command.endSprint": "Encerrar o sprint atual agora",
  "app.command.cancelSprint": "Cancelar o sprint atual",
  "app.command.setWordTarget": "Definir a meta de palavras do projeto ativo",
  "app.command.logRevision": "Registrar uma decisão de revisão",
  "app.notInProject": "O arquivo ativo não faz parte de um projeto do Inkswell.",
  "app.command.openRevisions": "Abrir registro de revisões",
  "app.command.openAnalysis": "Abrir análise (Revisar)",
  "app.command.openHelp": "Abrir ajuda",
  "app.command.openCustomize": "Abrir Personalizar",
  "app.command.restoreSettings": "Restaurar configurações de um backup",
  "app.command.manageFeatures": "Gerenciar recursos",
  "app.command.quickCapture": "Capturar uma ideia rapidamente",

  // --- Settings backups ------------------------------------------------------
  "app.noBackups": "O Inkswell ainda não tem backups. Um é feito a cada dia em que você abre o Obsidian.",
  "app.settingsRestored":
    "Configurações restauradas do backup de {date}. Seu histórico de escrita e suas ideias não foram alterados.",

  // --- Ideas inbox -----------------------------------------------------------
  "app.capture.title": "Captura rápida",
  "app.capture.cta": "Capturar",
  "app.capture.done": "Ideia capturada.",
  "app.idea.saveFailed": "Não foi possível salvar a ideia como nota.",
  "app.idea.saved": "Salva em {path}",

  // --- Compile, archive, project lookup --------------------------------------
  "app.compile.noProject": "Nenhum projeto ativo para compilar. Abra um no Inkswell primeiro.",
  "app.archive.archived": "“{title}” foi arquivado. Ele fica em Arquivados, no Início.",
  "app.archive.restored": "“{title}” voltou para o Início.",
  "app.archive.seriesArchived": "A série “{name}” foi arquivada. Ela fica em Arquivados, no Início.",
  "app.archive.seriesRestored": "A série “{name}” voltou para o Início.",
  "app.noProject": "Nenhum projeto do Inkswell encontrado. Crie um com o comando Novo projeto.",
};
