/** Brazilian Portuguese UI strings — the `settings` area (mirrors ../en/settings.ts). */
import type { Catalog } from "../types";

export const settings: Catalog = {
  // --- Settings tab ------------------------------------------------------------
  "settings.customize.name": "Personalizar o Inkswell",
  "settings.customize.desc":
    "Tipos e campos do Codex, modelos iniciais, estruturas de beats, status de cena, prompts de escrita, checklists e quais recursos aparecem — tudo editado dentro do Inkswell.",
  "settings.customize.button": "Abrir Personalizar",
  "settings.defaultCompileFormat.name": "Formato de compilação padrão",
  "settings.defaultCompileFormat.desc": "Formato já selecionado quando você abre a janela de compilação.",
  "settings.showWordCounts.name": "Mostrar contagem de palavras",
  "settings.showWordCounts.desc": "Exibe a contagem de palavras por cena e por projeto no explorador.",
  "settings.hideArchived.name": "Ocultar livros arquivados das suas séries",
  "settings.hideArchived.desc":
    "Um livro arquivado sai da estante da série e das capas da série no Início, e fica sob o nome da série na seção Arquivados — prático para contos que você arquiva depois de publicados. Desativado, os livros arquivados continuam na estante da série, esmaecidos.",
  "settings.syncHistory.name": "Sincronizar o histórico de escrita entre dispositivos",
  "settings.syncHistory.desc":
    "As palavras são contadas no dispositivo em que você as digita. Ative para manter uma pequena nota de registro por dispositivo na pasta “Writing log” da sua pasta base e juntá-las em Acompanhar, para que sequências e totais incluam todos os dispositivos. A sincronização do seu cofre (Obsidian Sync, iCloud, …) leva as notas.",
  "settings.sceneHeadingLevel.name": "Nível do título da cena",
  "settings.sceneHeadingLevel.desc": "Nível de título (1–6) para a etapa opcional de compilação “inserir título antes”.",

  // --- Settings → Manuscript -------------------------------------------------
  "settings.manuscript.heading": "Manuscrito",
  "settings.authorName.name": "Seu nome",
  "settings.authorName.desc":
    "Seu nome civil, para a folha de rosto dos manuscritos em Word. O nome de autor de um livro (pseudônimo) pode ser outro — defina-o em Publicar → Compilar.",
  "settings.authorContact.name": "Dados de contato",
  "settings.authorContact.desc":
    "Endereço, e-mail, telefone — um por linha, abaixo do seu nome na folha de rosto.",
  "settings.compileFormat.md": "Markdown",
  "settings.compileFormat.html": "HTML",
  "settings.compileFormat.docx": "Word (.docx)",
  "settings.compileFormat.pandoc": "Pandoc (docx/pdf/epub)",
  "settings.interfaceLanguage.name": "Idioma da interface",
  "lib.rowMenu.openInTabHint": "Ctrl/Cmd + clique para abrir em nova aba",
  "settings.interfaceLanguage.desc":
    "O Inkswell segue o idioma do Obsidian quando existe uma tradução revisada. Escolha um idioma aqui para substituí-lo, incluindo traduções em rascunho. O texto escrito nas suas notas continua como está.",
  "settings.interfaceLanguage.auto": "Igual ao Obsidian",
  "settings.interfaceLanguage.draft": "{name} (rascunho — ajude a revisar)",
  "settings.interfaceLanguage.applied": "Idioma alterado. Os nomes dos comandos, esta aba de configurações e a barra de abas do celular mudam depois que você reiniciar o Obsidian.",
  "settings.companionSceneTarget.name": "Abrir cenas da barra lateral em",
  "settings.companionSceneTarget.desc":
    "Onde uma cena abre quando você clica nela em um painel auxiliar da barra lateral. Ctrl/Cmd + clique sempre abre uma nova aba.",
  "settings.companionSceneTarget.write": "Escrever do Inkswell",
  "settings.companionSceneTarget.tab": "Uma aba comum",

  // --- Settings → Write editor -----------------------------------------------
  "settings.writeEditor.heading": "Editor Escrever",
  "settings.typewriterMode.name": "Modo máquina de escrever",
  "settings.typewriterMode.desc":
    "Mantém a linha que você está digitando centralizada verticalmente no editor Escrever, para que seus olhos fiquem num só lugar. Cliques do mouse não recentralizam. Também disponível como o comando “Alternar modo máquina de escrever (editor Escrever)”.",
  "settings.manuscriptTypography.name": "Tipografia de manuscrito",
  "settings.manuscriptTypography.desc":
    "Layout de livro no editor Escrever: os parágrafos ganham recuo na primeira linha (exceto o primeiro parágrafo depois de um título ou de uma quebra de cena) e os títulos ficam centralizados. Apenas visual — seu texto não muda. A fonte segue Aparência → Fonte do texto, do Obsidian.",
  "settings.smartDashes.name": "Travessões inteligentes",
  "settings.smartDashes.desc":
    "No editor Escrever, digitar -- vira meia-risca (–) e um terceiro - vira travessão (—). Uma linha só de hífens (---) não é alterada. Vale só para o editor Escrever do Inkswell, não para as notas do Obsidian.",
  "settings.smartQuotes.name": "Aspas inteligentes",
  "settings.smartQuotes.desc":
    "Aspas retas digitadas no editor Escrever viram aspas curvas (“ ” e ‘ ’); apóstrofos viram ’. Não se aplica dentro de código e links.",
  "settings.smartEllipsis.name": "Reticências inteligentes",
  "settings.smartEllipsis.desc": "Três pontos digitados no editor Escrever viram reticências (…).",
  "settings.milestoneWords.name": "Marcos a cada…",
  "settings.milestoneWords.desc":
    "Coloca uma pequena etiqueta na margem do editor Escrever, na linha em que a contagem de palavras da cena passa por cada múltiplo deste número (ex.: 500 → etiquetas em 500, 1 mil, 1,5 mil…). 0 = desativado; mínimo 100.",

  // --- Settings → Goals & sprints --------------------------------------------
  "settings.goals.heading": "Metas e sprints",
  "settings.weekStart.name": "A semana começa no",
  "settings.weekStart.desc": "Primeiro dia da semana para metas semanais, acompanhamento de hábito e o mapa de calor.",
  "settings.weekStart.monday": "Segunda-feira",
  "settings.weekStart.sunday": "Domingo",
  "settings.dailyWordGoal.name": "Meta diária de palavras",
  "settings.dailyWordGoal.desc": "Palavras por dia a atingir, mostradas na barra de status e nas estatísticas.",
  "settings.weeklyWordGoal.name": "Meta semanal de palavras",
  "settings.weeklyWordGoal.desc": "Palavras por semana a atingir (do início da semana até hoje).",
  "settings.monthlyWordGoal.name": "Meta mensal de palavras",
  "settings.monthlyWordGoal.desc": "Palavras por mês a atingir (do dia 1º até hoje).",
  "settings.habitDaysPerWeek.name": "Hábito: dias por semana",
  "settings.habitDaysPerWeek.desc": "Em quantos dias por semana você pretende escrever.",
  "settings.habitMinWords.name": "Hábito: mínimo de palavras/dia",
  "settings.habitMinWords.desc": "Mínimo de palavras para um dia contar para o hábito.",
  "settings.defaultSprintMinutes.name": "Duração padrão do sprint",
  "settings.defaultSprintMinutes.desc": "Duração padrão do sprint, em minutos.",
  "settings.defaultSprintWordGoal.name": "Meta de palavras padrão do sprint",
  "settings.defaultSprintWordGoal.desc": "Meta de palavras já preenchida na janela do sprint. 0 = sem meta.",
  "settings.streakThreshold.name": "Mínimo para a sequência",
  "settings.streakThreshold.desc": "Mínimo de palavras em um dia para ele estender sua sequência de escrita.",

  // --- Settings → What counts toward goals -----------------------------------
  "settings.counts.heading": "O que conta para as metas",
  "settings.counts.intro":
    "Metas, sequências e sprints só contam o que é escrito em notas de projeto — notas em outros lugares do cofre nunca contam. Escolha quais tipos contam. Mudar uma opção também reconta as palavras já escritas desde que esta opção foi criada; o histórico mais antigo sempre conta.",
  "settings.counts.scene.name": "Cenas do manuscrito",
  "settings.counts.scene.desc": "Arquivos de cena e projetos de nota única — o próprio manuscrito.",
  "settings.counts.planning.name": "Notas de planejamento",
  "settings.counts.planning.desc": "A nota de planejamento de cada projeto (sinopse, base do enredo, esboço dos atos).",
  "settings.counts.codex.name": "Notas do Codex",
  "settings.counts.codex.desc": "Notas com uma chave codex (personagens, lugares, lore), onde quer que estejam.",
  "settings.counts.other.name": "Outras notas do projeto",
  "settings.counts.other.desc": "A nota de índice do projeto e quaisquer outras notas dentro da pasta de um projeto.",

  // --- Settings → Folders ----------------------------------------------------
  "settings.folders.heading": "Pastas",
  "settings.baseFolder.name": "Pasta base",
  "settings.baseFolder.desc":
    "Pasta onde ficam os novos projetos e a estrutura compartilhada do Codex. Em branco = raiz do cofre. Isso só define onde o conteúdo novo é criado — projetos e Codex existentes em qualquer lugar do cofre continuam funcionando.",
  "settings.baseFolder.placeholder": "(raiz do cofre)",
  "settings.codexFolder.name": "Nome da pasta do Codex",
  "settings.codexFolder.desc": "Nome da subpasta usada para as notas do Codex (compartilhadas e por projeto).",
  "settings.coLocateCodex.name": "Guardar o Codex junto dos projetos",
  "settings.coLocateCodex.desc":
    "Verbetes de um livro são criados na pasta do Codex do próprio projeto; verbetes de série e globais vão para o Codex compartilhado da pasta base. É só organização — a visibilidade é definida em cada verbete pelo campo Escopo, não pelo lugar onde a nota fica.",

  // --- Settings → Layout -----------------------------------------------------
  "settings.layout.heading": "Layout",
  "settings.forceTablet.name": "Usar o layout completo neste dispositivo",
  "settings.forceTablet.desc":
    "O Obsidian classifica esta tela como de celular, então o Inkswell mostra o layout de celular e deixa Planejar e Publicar atrás de um aviso de “precisa de uma tela maior”. Ative se você estiver em um tablet.",

  // --- Settings → Help -------------------------------------------------------
  "settings.help.heading": "Ajuda",
  "settings.showHints.name": "Mostrar dicas contextuais",
  "settings.showHints.desc":
    "Mostra os quadros dispensáveis “Como funciona” no topo dos painéis. As dicas que você dispensar continuam ocultas até você redefini-las abaixo.",
  "settings.resetTips.name": "Redefinir dicas e rever as boas-vindas",
  "settings.resetTips.desc": "Reativa todas as dicas dispensadas e mostra a tela de boas-vindas de novo.",
  "settings.resetTips.done": "Dicas redefinidas.",

  // --- Restore settings modal ------------------------------------------------
  "settings.restore.placeholder": "Restaurar configurações do backup de…",

  // --- Optional features (src/features.ts) -------------------------------------
  "feature.group.planning": "Planejamento",
  "feature.group.revision": "Revisão",
  "feature.group.publishing": "Publicação",
  "feature.group.writing": "Escrita",
  "feature.beats.label": "Beats",
  "feature.beats.desc": "O planejador de folha de beats (Planejar → Beats) e a estrutura de cenas que ele cria.",
  "feature.board.label": "Quadro",
  "feature.board.desc": "A visualização em quadro Kanban das suas cenas (Planejar → Estrutura → Quadro).",
  "feature.plotGrid.label": "Grade de enredo",
  "feature.plotGrid.desc":
    "A matriz linha de enredo × capítulo (Planejar → Estrutura → Grade) e o campo Linhas de enredo da cena.",
  "feature.audit.label": "Auditoria de revisão",
  "feature.audit.desc": "Os checklists de auditoria de revisão e o acompanhamento de arcos de personagem (Revisar → Auditoria).",
  "feature.analysis.label": "Análise",
  "feature.analysis.desc": "Análise de legibilidade, frequência de palavras e ecos (Revisar → Análise).",
  "feature.checklist.label": "Checklist de publicação",
  "feature.checklist.desc": "O checklist de tarefas de autopublicação (Publicar → Checklist).",
  "feature.launch.label": "Planejador de lançamento",
  "feature.launch.desc": "O cronograma de pré-venda e os acompanhamentos de lançamento (Publicar → Lançamento).",
  "feature.prompts.label": "Prompts de escrita",
  "feature.prompts.desc": "O botão de prompts de escrita / ideias na barra de ferramentas de Escrever.",
  "feature.stream.label": "Fluxo de cenas",
  "feature.stream.desc":
    "A visualização Fluxo de Escrever: leia e edite as cenas de um livro como uma página contínua. Não aparece em celulares.",
  "feature.tracking.label": "Acompanhamento",
  "feature.tracking.desc":
    "Metas de palavras, sprints de escrita, o contador da barra de status e o painel Acompanhar. As palavras continuam sendo registradas enquanto o recurso está oculto, então reativá-lo mostra o histórico completo.",

  // --- Shared helpers (src/lib) ------------------------------------------------
  "lib.hideMenu.item": "Ocultar {label}",
  "lib.hideMenu.hidden": "{label} oculto.",
  "lib.hideMenu.notice": "{hidden} {undo} — ou reative em Personalizar → Recursos.",
  "lib.hideMenu.undo": "Desfazer",
  "lib.listEditor.moveUp": "Mover para cima",
  "lib.listEditor.moveDown": "Mover para baixo",
  "lib.phoneRedirect.title": "{surface} precisa de uma tela maior",
  "lib.phoneRedirect.body":
    "Abra este projeto em um tablet ou computador para usar esta visualização. A escrita e a sua lista de cenas funcionam aqui no celular.",
  "lib.phoneRedirect.useFullLayout": "Não é um celular? Use o layout completo",
  "lib.rowMenu.more": "Mais ações",
  "lib.images.pickPlaceholder": "Escolha uma imagem do cofre…",
  "lib.relativeTime.justNow": "agora mesmo",
  "lib.relativeTime.minutes.one": "há {count} min",
  "lib.relativeTime.minutes.other": "há {count} min",
  "lib.relativeTime.hours.one": "há {count} h",
  "lib.relativeTime.hours.other": "há {count} h",
  "lib.relativeTime.days.one": "há {count} d",
  "lib.relativeTime.days.other": "há {count} d",
  "lib.relativeTime.weeks.one": "há {count} sem.",
  "lib.relativeTime.weeks.other": "há {count} sem.",
  "lib.relativeTime.months.one": "há {count} mês",
  "lib.relativeTime.months.other": "há {count} meses",
  "lib.relativeTime.years.one": "há {count} ano",
  "lib.relativeTime.years.other": "há {count} anos",
  "lib.settingsSummary.none": "nenhuma configuração",
  "lib.settingsSummary.customTypes.one": "{count} tipo de Codex personalizado",
  "lib.settingsSummary.customTypes.other": "{count} tipos de Codex personalizados",
  "lib.settingsSummary.renamedTypes.one": "{count} tipo renomeado",
  "lib.settingsSummary.renamedTypes.other": "{count} tipos renomeados",
  "lib.settingsSummary.beatTemplates.one": "{count} modelo de beats",
  "lib.settingsSummary.beatTemplates.other": "{count} modelos de beats",
  "lib.settingsSummary.lists.one": "{count} lista personalizada",
  "lib.settingsSummary.lists.other": "{count} listas personalizadas",
  "lib.settingsSummary.rail": "barra de navegação organizada",
  "lib.settingsSummary.challenge": "desafio de escrita",
  "lib.settingsSummary.defaults": "configurações padrão",

  // --- Customize → catalog -----------------------------------------------------
  "customize.group.codex": "Codex",
  "customize.group.plan": "Planejar",
  "customize.group.write": "Escrever",
  "customize.group.revise": "Revisar",
  "customize.group.publish": "Publicar",
  "customize.group.inkswell": "Inkswell",
  "customize.entry.codexTypes": "Tipos e campos do Codex",
  "customize.entry.beatTemplates": "Modelos de beats",
  "customize.entry.sceneTemplate": "Modelo de cena",
  "customize.entry.sceneStatuses": "Status de cena",
  "customize.entry.sceneFields": "Campos do inspetor de cena",
  "customize.entry.writingPrompts": "Prompts de escrita",
  "customize.entry.todoMarkers": "Marcadores de pendência",
  "customize.entry.revisionChecklists": "Checklists de revisão",
  "customize.entry.publishingChecklist": "Checklist de publicação",
  "customize.entry.features": "Recursos",

  // --- Customize → panel -------------------------------------------------------
  "customize.badge.hidden": "oculto",
  "customize.badge.yours": "seu",
  "customize.hiddenFeature": "Este recurso está oculto no momento. {link}.",
  "customize.hiddenFeature.link": "Ative-o em Recursos",

  // --- Customize → catalog-row summaries (joined with " · ") ------------------
  "customize.summary.builtIn.one": "{count} nativo",
  "customize.summary.builtIn.other": "{count} nativos",
  "customize.summary.yours.one": "{count} seu",
  "customize.summary.yours.other": "{count} seus",
  "customize.summary.hidden.one": "{count} oculto",
  "customize.summary.hidden.other": "{count} ocultos",
  "customize.summary.renamed.one": "{count} renomeado",
  "customize.summary.renamed.other": "{count} renomeados",
  "customize.summary.custom.one": "{count} personalizado",
  "customize.summary.custom.other": "{count} personalizados",
  "customize.summary.reordered": "reordenado",
  "customize.summary.customized": "Personalizado",

  // --- Customize → list editor (override-editor.ts) ----------------------------
  "list.addGroup": "Adicionar grupo…",
  "list.newGroup": "Novo grupo",
  "list.groupName": "Nome do grupo",
  "list.showGroup": "Mostrar grupo",
  "list.hideGroup": "Ocultar grupo",
  "list.removeGroup": "Remover grupo",
  "list.wasLabel": "antes “{label}”",
  "list.show": "Mostrar",
  "list.hide": "Ocultar",
  "list.restoreName": "Restaurar o nome original",
  "list.removed": "“{label}” removido. O que já estava marcado nele continua nas suas notas.",
  "list.resetDefaults": "Redefinir para o padrão do Inkswell",
  "list.meta.auditScene": "Pontos de verificação da cena",
  "list.meta.auditStory": "Pontos de verificação da história",
  "list.meta.auditChapter": "Pontos de verificação do capítulo",
  "list.meta.auditPage": "Pontos de verificação da prosa",
  "list.task.empty": "Nenhuma tarefa aqui ainda.",
  "list.task.add": "Adicionar tarefa…",
  "list.task.new": "Nova tarefa",
  "list.task.aria": "rótulo da tarefa",
  "list.checkpoint.empty": "Nenhum ponto de verificação aqui ainda.",
  "list.checkpoint.add": "Adicionar ponto de verificação…",
  "list.checkpoint.new": "Novo ponto de verificação",
  "list.checkpoint.aria": "rótulo do ponto de verificação",
  "list.field.empty": "Nenhum campo aqui ainda.",
  "list.field.add": "Adicionar campo…",
  "list.field.new": "Novo campo",
  "list.field.aria": "rótulo do campo",
  "list.status.empty": "Nenhum status aqui ainda.",
  "list.status.add": "Adicionar status…",
  "list.status.new": "Novo status",
  "list.status.aria": "rótulo do status",
  "list.marker.empty": "Nenhum marcador aqui ainda.",
  "list.marker.add": "Adicionar marcador…",
  "list.marker.new": "Novo marcador",
  "list.marker.aria": "rótulo do marcador",
  "list.prompt.empty": "Nenhum prompt aqui ainda.",
  "list.prompt.add": "Adicionar prompt…",
  "list.prompt.new": "Novo prompt",
  "list.prompt.aria": "rótulo do prompt",

  // --- Customize → fields editor (field-spec*.ts) ------------------------------
  "customize.fieldKind.text": "Texto",
  "customize.fieldKind.textarea": "Texto longo",
  "customize.fieldKind.number": "Número",
  "customize.fieldKind.date": "Data",
  "customize.fieldKind.list": "Lista",
  "customize.fieldKind.image": "Imagem",
  "customize.fieldKind.links": "Links",
  "customize.fieldKind.link": "Link único",
  "customize.fields.startWithLetter": "Comece o rótulo com uma letra.",
  "customize.fields.enterLabel": "Digite um rótulo.",
  "customize.fields.reserved": "“{key}” é gerenciado pelo Inkswell.",
  "customize.fields.duplicate": "“{key}” já é um campo.",
  "customize.fields.badKey": "Use letras e números (sem espaços ou símbolos).",
  "customize.fields.createTemplateFailed": "Não foi possível criar a nota de modelo.",
  "customize.fields.saveFailed": "Não foi possível salvar os campos.",
  "customize.fields.resetFailed": "Não foi possível redefinir os campos.",
  "customize.fields.labelPlaceholder": "Rótulo",
  "customize.fields.labelAria": "Rótulo de {key}",
  "customize.fields.kindAria": "Tipo de {key}",
  "customize.fields.anyType": "Qualquer tipo",
  "customize.fields.typeEither": "{first} ou {second}",
  "customize.fields.restrictAria": "Restringir {key} a um tipo",
  "customize.fields.perLinkLabels": "Rótulos por link",
  "customize.fields.add": "Adicionar campo…",
  "customize.addField.title": "Adicionar campo",
  "customize.addField.label": "Rótulo",
  "customize.addField.labelPlaceholder": "ex.: Data de nascimento",
  "customize.addField.kind": "Tipo",
  "customize.addField.builtin.name": "Ou adicione um dos campos nativos do Inkswell",
  "customize.addField.builtin.desc":
    "Mantém o rótulo e o seletor — um bestiário pode pegar emprestado Relacionamentos, por exemplo.",
  "customize.addField.storedAs": "Salvo como {key}",

  // --- Customize → template body editor ----------------------------------------
  "customize.templateBody.create": "Criar nota de modelo",
  "customize.templateBody.loading": "Carregando…",
  "customize.templateBody.saveFailed": "Não foi possível salvar o modelo.",
  "customize.templateBody.open": "Abrir nota de modelo",
  "customize.templateBody.openAria": "Abrir {path} em uma aba (para editar o frontmatter)",

  // --- Customize → Codex types -------------------------------------------------
  "customize.codex.intro":
    "Cada tipo do Codex tem uma exibição (nome, plural, ícone), os campos que seus verbetes mostram no painel do Codex e o conteúdo inicial com que um novo verbete começa. Campos e conteúdo inicial ficam numa nota de modelo comum — editar aqui edita essa nota.",
  "customize.codex.rowDescRenamed": "{plural} · codex: {id} · renomeado de {shipped}",
  "customize.codex.rowDesc": "{plural} · codex: {id}",
  "customize.codex.rowDescCustom": "{plural} · codex: {id} · personalizado",
  "customize.codex.entries.one": "{count} verbete",
  "customize.codex.entries.other": "{count} verbetes",
  "customize.codex.fieldsFrom": "Campos: {name}",
  "customize.codex.fieldsShipped": "Campos: originais",
  "customize.codex.editDisplay": "Editar exibição…",
  "customize.codex.deleteType": "Excluir tipo…",
  "customize.codex.newType": "Novo tipo…",
  "customize.codex.generate": "Gerar todos os modelos iniciais",
  "customize.codex.generateAria":
    "Cria uma nota de modelo para cada tipo que ainda não tem (mais Scene.md e um README)",
  "customize.codex.vaultRoot": "(raiz do cofre)",
  "customize.codex.generateFailed": "Não foi possível gerar os modelos iniciais.",
  "customize.codex.generated.one": "{count} modelo criado em “{folder}”.",
  "customize.codex.generated.other": "{count} modelos criados em “{folder}”.",
  "customize.codex.generatedNone": "Os modelos já existem — nada para criar.",
  "customize.codex.back": "‹ Tipos do Codex",
  "customize.codex.gone": "Esse tipo não existe mais.",
  "customize.codex.idLine": "codex: {id}",
  "customize.codex.card.display": "Exibição",
  "customize.codex.card.fields": "Campos",
  "customize.codex.card.starter": "Conteúdo inicial",
  "customize.codex.starterHint":
    "É com isto que um novo verbete começa. {{title}} vira o nome do verbete. O próprio Inkswell adiciona codex: e o escopo de projeto/série — não adicione uma chave codex:.",
  "customize.codex.starterNone": "Ainda não há nota de modelo — novos {plural} começam só com um título.",
  "customize.codex.display.name": "Nome",
  "customize.codex.display.plural": "Plural",
  "customize.codex.display.icon": "Ícone",
  "customize.codex.display.shipped": "Original: {label} / {plural} / {icon}. Os verbetes mantêm codex: {id}.",
  "customize.codex.display.edit": "Editar…",
  "customize.codex.display.reset": "Redefinir para o padrão",
  "customize.codex.fieldsSource": "Campos de {link}. O campo Apelidos sempre vem primeiro.",
  "customize.codex.fieldsSourceShipped":
    "Usando os campos originais do Inkswell. Sua primeira alteração cria uma nota de modelo para este tipo e registra os campos nela. O campo Apelidos sempre vem primeiro.",
  "customize.codex.fieldsEmpty": "Nenhum campo ainda — adicione um abaixo.",
  "customize.codex.fieldsReset": "Redefinir para os campos originais",
  "customize.codex.fieldsResetConfirm":
    "Usar os campos originais do Inkswell para {type}? Isso remove a propriedade codex-fields de {template} — os verbetes existentes mantêm o frontmatter.",
  "customize.codex.fieldsResetConfirmNoTemplate":
    "Usar os campos originais do Inkswell para {type}? Isso remove a propriedade codex-fields do modelo — os verbetes existentes mantêm o frontmatter.",
  "customize.codex.fieldsLabelDesc": "O que o painel do Codex mostra. A chave salva é derivada dele.",
  "customize.codex.builtinField.generic": "{label} (tipos personalizados)",
  "customize.codex.builtinField.type": "{label} ({type})",

  // --- Customize → Beat templates ----------------------------------------------
  "customize.beats.intro":
    "Estruturas de beats para Planejar → Beats. As nativas não podem ser alteradas, mas duplicar uma gera uma cópia editável. Seus modelos aparecem no seletor na ordem abaixo.",
  "customize.beats.builtIn": "Nativos",
  "customize.beats.rowDesc.one": "{count} beat · modelo: {id}",
  "customize.beats.rowDesc.other": "{count} beats · modelo: {id}",
  "customize.beats.duplicateAsCustom": "Duplicar como personalizado",
  "customize.beats.yours": "Seus",
  "customize.beats.empty": "Você ainda não tem modelos próprios — duplique um nativo ou comece um novo.",
  "customize.beats.editBeats": "Editar beats",
  "customize.beats.duplicate": "Duplicar",
  "customize.beats.newTemplate": "Novo modelo…",
  "customize.beats.created": "“{name}” criado.",
  "customize.beats.back": "‹ Modelos de beats",
  "customize.beats.gone": "Esse modelo não existe mais.",
  "customize.beats.idLine": "modelo: {id}",
  "customize.beats.rename": "Renomear…",
  "customize.beats.pageIntro":
    "Beats na ordem do livro. “Em %” é onde o beat fica no manuscrito. O nome de um beat é a sua chave: renomear um beat recomeça as notas salvas dele do zero (volte ao nome antigo para recuperá-las); reordenar e reescrever o propósito é sempre seguro.",
  "customize.beats.noBeats": "Nenhum beat ainda.",
  "customize.beats.namePlaceholder": "Nome do beat",
  "customize.beats.nameAria": "Nome do beat",
  "customize.beats.atAria": "Posição no livro, em porcentagem",
  "customize.beats.purposePlaceholder": "Propósito (opcional)",
  "customize.beats.purposeAria": "Propósito do beat",
  "customize.beats.needOne": "Um modelo precisa de pelo menos um beat.",
  "customize.beats.addBeat": "Adicionar beat…",
  "customize.beats.editAsText": "Editar como texto…",
  "customize.beats.textHelp":
    "Um beat por linha: “Nome”, “Nome | propósito” ou “25% | Nome | propósito”. Aplicar substitui a lista acima.",
  "customize.beats.apply": "Aplicar",
  "customize.beats.addModal.title": "Adicionar beat",
  "customize.beats.addModal.name": "Nome",
  "customize.beats.addModal.nameDesc": "Também é a chave do beat (convertida em slug).",
  "customize.beats.addModal.namePlaceholder": "ex.: Ponto médio",
  "customize.beats.addModal.purpose": "Propósito",
  "customize.beats.addModal.purposePlaceholder": "Uma frase, opcional",
  "customize.beats.nameRequired": "O nome é obrigatório.",
  "customize.beats.nameNeedsChars": "O nome precisa ter letras ou números.",
  "customize.beats.renameModal.title": "Renomear modelo",
  "customize.beats.renameModal.name": "Nome",
  "customize.beats.renameModal.nameDesc":
    "Só o nome de exibição — o id do modelo (e todo projeto que o usa) não muda.",

  // --- Customize → Scene template ----------------------------------------------
  "customize.sceneTemplate.using": "Usando Templates/Scene.md",
  "customize.sceneTemplate.default": "Padrão (cena vazia)",
  "customize.sceneTemplate.intro":
    "Toda cena que o Inkswell cria começa a partir desta nota: o frontmatter e o corpo dela são copiados e {{title}} vira o nome da cena. Sem ela, as novas cenas começam vazias.",
  "customize.sceneTemplate.projectOwn":
    "O projeto ativo usa um modelo próprio: {template} (a chave sceneTemplate na nota de índice dele).",
  "customize.sceneTemplate.card": "Conteúdo inicial",
  "customize.sceneTemplate.hint":
    "{{title}} vira o nome da cena. Uma chave status: aqui define o status padrão (senão as novas cenas recebem status: idea); uma sinopse que o próprio Inkswell preenche sempre prevalece.",
  "customize.sceneTemplate.none": "Ainda não há nota de modelo ({path}) — as novas cenas começam vazias.",

  // --- Customize → Scene statuses ----------------------------------------------
  "customize.statuses.defaults": "Ideia → Final (padrão)",
  "customize.statuses.intro":
    "Renomeie um status para combinar com o seu processo (“Rascunho 1”, “Polimento”, “Fechado”), oculte os que você não usa e defina a ordem em que o Quadro e os seletores os mostram. As cenas mantêm o valor salvo de qualquer forma, então é seguro mudar no meio do livro; uma cena com um status oculto ainda o mostra, marcado como oculto. Nesta versão não é possível adicionar novos status.",

  // --- Customize → Scene inspector fields --------------------------------------
  "customize.sceneFields.own.one": "{count} seu",
  "customize.sceneFields.own.other": "{count} seus",
  "customize.sceneFields.defaults": "Todos os campos (padrão)",
  "customize.sceneFields.card.layout": "Layout",
  "customize.sceneFields.layoutIntro":
    "Escolha quais campos o inspetor de cena mostra e em que ordem. Oculte os que você não usa, ou suba Notas se você escreve a partir de um esboço. “Seus campos” é o bloco de campos que você adiciona abaixo. Ocultar um campo só o esconde aqui — as cenas mantêm o que já guardam, e reexibi-lo traz tudo de volta na hora.",
  "customize.sceneFields.card.own": "Seus campos",
  "customize.sceneFields.ownIntro":
    "Adicione campos para o seu próprio processo — os Cinco Mandamentos do Story Grid, o objetivo e o desastre de uma cena — e eles aparecem no inspetor de todas as cenas. Cada um é salvo como uma propriedade comum da cena; remover um campo aqui nunca apaga o que você escreveu.",
  "customize.sceneFields.storedIn": "Salvos em {link} (compartilhado por todos os projetos).",
  "customize.sceneFields.firstCreates":
    "Seu primeiro campo cria a nota de modelo de cena e registra os campos nela.",
  "customize.sceneFields.empty": "Você ainda não tem campos próprios.",
  "customize.sceneFields.reset": "Remover todos os seus campos",
  "customize.sceneFields.resetConfirm":
    "Remover todos os seus campos? Isso apaga a propriedade {key} de {template} — as cenas mantêm os valores que já guardam.",
  "customize.sceneFields.resetConfirmNoTemplate":
    "Remover todos os seus campos? Isso apaga a propriedade {key} do modelo de cena — as cenas mantêm os valores que já guardam.",
  "customize.sceneFields.labelDesc":
    "O que o inspetor de cena mostra. O nome da propriedade salva é derivado dele.",

  // --- Customize → Writing prompts ---------------------------------------------
  "customize.prompts.intro":
    "Os prompts por trás do botão Prompt na barra de ferramentas de Escrever. Oculte os que você não quer ver nunca mais, reescreva qualquer um ou adicione os seus — escreva {pov} onde deve entrar o nome do personagem de POV da cena. Cada prompt tem uma fase (escrita ou revisão) e uma categoria pela qual o botão filtra — mude qualquer uma das duas em qualquer prompt, inclusive nos nativos.",
  "customize.prompts.phase.draft": "Escrita",
  "customize.prompts.phase.revise": "Revisão",
  "customize.prompts.phaseAria": "Fase",
  "customize.prompts.categoryAria": "Categoria",

  // --- Customize → To-do markers -----------------------------------------------
  "customize.markers.intro":
    "Marcadores que você deixa na prosa para voltar depois — [TODO: …], [RESEARCH: …] e os demais — e encontra em Revisar → Registro de revisões. A compilação remove todos. Para usar outra palavra, adicione seu próprio marcador (e oculte o nativo, se quiser). Ocultar um marcador só o tira do menu Inserir: os marcadores que já estão nas suas cenas continuam sendo encontrados e removidos na compilação.",
  "customize.markers.wordPrompt": "Palavra a digitar nas suas cenas (ex.: CHECK)",
  "customize.markers.invalidWord":
    "A palavra de um marcador começa com uma letra e tem de 2 a 20 letras, dígitos ou hifens.",
  "customize.markers.taken": "[{keyword}] já é um marcador.",
  "customize.markers.inactive": "palavra já usada — inativo",
  "customize.markers.removeConfirm":
    "Remover “{label}”? Os marcadores já digitados nas suas cenas como [{keyword}: …] não serão encontrados no registro de revisões nem removidos na compilação. Para que continuem funcionando, oculte o marcador em vez de removê-lo.",
  "customize.markers.removed":
    "“{label}” removido. Os marcadores [{keyword}: …] continuam nas suas cenas como texto simples.",

  // --- Customize → Publishing checklist ----------------------------------------
  "customize.publishing.defaults": "{phases} · {tasks} (padrão)",
  "customize.publishing.phases.one": "{count} fase",
  "customize.publishing.phases.other": "{count} fases",
  "customize.publishing.tasks.one": "{count} tarefa",
  "customize.publishing.tasks.other": "{count} tarefas",
  "customize.publishing.intro":
    "Publicar → Checklist, fase por fase. Oculte fases ou tarefas que não se aplicam ao seu caminho, renomeie, reordene e adicione as suas. As marcações ficam salvas por projeto sob o id da tarefa, então nada que você já marcou se perde quando você oculta ou renomeia.",
  "customize.publishing.optional": "Opcional",

  // --- Customize → Features ----------------------------------------------------
  "customize.features.allShown": "Tudo visível",
  "customize.features.hidden": "{count} de {total} ocultos",
  "customize.features.intro":
    "Oculte o que você não usa para manter o Inkswell enxuto. Ocultar só esconde — suas notas e seus dados são mantidos, e reativar um recurso restaura tudo. Você também pode clicar com o botão direito em uma aba opcional em qualquer lugar do app para ocultá-la.",
};
