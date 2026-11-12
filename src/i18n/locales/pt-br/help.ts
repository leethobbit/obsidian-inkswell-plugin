/** Brazilian Portuguese UI strings — the `help` area (mirrors ../en/help.ts). */
import type { Catalog } from "../types";

export const help: Catalog = {
  // --- Topic: write ---
  "help.write.title": "Como funcionam a escrita e os marcadores de pendência",
  "help.write.columns": "Escrever é um editor sem distrações: escolha uma cena à esquerda, escreva no centro e mantenha o que você precisa na coluna da direita. Essa coluna tem quatro abas — Cena (detalhes da cena em que você está), Codex (quem e o que aparece nela), Planejar (as cenas e os beats deste capítulo e a sua nota de planejamento) e Registro de revisões (os marcadores de pendência e as decisões de revisão em aberto deste projeto, começando pela cena atual — clique em um marcador para ir até ele). As edições são salvas quando o campo perde o foco e quando você troca de cena — nunca no meio da digitação.",
  "help.write.room": "Abra espaço para a página: os botões nas pontas da barra de ferramentas ocultam a lista de cenas e a coluna da direita, e você pode arrastar a linha ao lado da coluna para redimensioná-la. Foco (o botão das setas) oculta tudo menos o editor e a barra de ferramentas; clique de novo para trazer tudo de volta. Recolha a nota “Próxima sessão” com a seta no fim dela. Clique com o botão direito no texto para formatação, consulta ao Codex, divisão de cena e registro de uma decisão de revisão.",
  "help.write.stream": "Mude de Cena para Fluxo (no topo de Escrever; não disponível no celular) para ver o livro inteiro como uma página só, em ordem. Clique em qualquer lugar para editar aquela cena ali mesmo; as setas do teclado continuam para a cena seguinte. Pule entre capítulos pelo menu no topo ou pelos nomes dos capítulos à esquerda, e restrinja a página a um capítulo, POV, linha de enredo, personagem ou status. Cada cena continua sendo salva na própria nota.",
  "help.write.markers": "Não pare para pesquisar ou aperfeiçoar um trecho difícil. Deixe um marcador entre colchetes e siga em frente — eles ficam destacados no editor e são recolhidos depois em Revisar → Registro de revisões. A palavra-chave não diferencia maiúsculas de minúsculas e o “: texto” é opcional.",
  "help.write.markerPicker": "Use “Inserir um marcador de pendência…” para abrir um seletor que insere um marcador no cursor.",
  "help.write.peek": "Confira um detalhe sem sair da página: segure Ctrl (Cmd no Mac) e aponte para o nome de um personagem ou lugar no texto para ver a ficha dele no Codex. Passe o mouse ou toque em um nome na coluna Cena para ver a mesma ficha, ou use “Consultar no Codex” (também no menu do botão direito). Esc fecha a ficha e o cursor fica onde estava.",
  "help.write.companions": "Mantenha coisas ao seu lado enquanto escreve: clique com o botão direito em Codex, Planejar, Acompanhar ou Início na barra à esquerda e escolha “Abrir na barra lateral”, ou use “Abrir um painel auxiliar na barra lateral…”. Os painéis auxiliares acompanham a cena que você está escrevendo: Codex lista quem e o que aparece nela, Planejar mostra as cenas, as sinopses e os beats deste capítulo e a sua nota de planejamento, Cenas é o esboço inteiro, e Registro de revisões lista o que falta nesta cena. Arraste-os para onde quiser; o Obsidian se lembra. Clicar em uma cena ali a abre em Escrever, ou em uma aba comum se você escolher isso nas Configurações.",
  "help.write.customMarkers": "Quer uma palavra sua, como [CHECK: ] ou [TK: ]? Adicione-a em Personalizar → Marcadores de pendência, onde você também pode ocultar os nativos.",

  // --- Topic: track/sync ---
  "help.sync.title": "Escreve em mais de um dispositivo?",
  "help.sync.body": "As palavras são contadas no dispositivo em que você as digita, então este painel só conhece este dispositivo. Para que sequências e totais incluam todos os dispositivos, ative Configurações → Inkswell → “Sincronizar o histórico de escrita entre dispositivos”. O Inkswell passa a manter uma pequena nota de registro por dispositivo na pasta “Writing log” da sua pasta base e as junta aqui — a sincronização do seu cofre (Obsidian Sync, iCloud, …) leva as notas.",

  // --- Topic: plan/beats ---
  "help.beats.title": "Como funciona a folha de beats",
  "help.beats.intro": "Um esboço estrutural do projeto ativo, montado a partir de um modelo de beats que você escolhe no menu Modelo. Oito estão incluídos:",
  "help.beats.template.saveTheCat": "Save the Cat (15 beats)",
  "help.beats.template.threeAct": "Três atos (7)",
  "help.beats.template.herosJourney": "Jornada do herói (12)",
  "help.beats.template.sevenPoint": "Sete pontos (7)",
  "help.beats.template.storyCircle": "Story Circle (8)",
  "help.beats.template.romancingTheBeat": "Romancing the Beat (14)",
  "help.beats.template.twentySevenChapter": "27 capítulos (27)",
  "help.beats.template.tenPoint": "Esboço em dez pontos (10) — liste as dez coisas que precisam acontecer na sua história",
  "help.beats.custom": "Você também pode adicionar suas próprias estruturas em Personalizar → Modelos de beats — elas aparecem no menu ao lado das nativas.",
  "help.beats.perBeat": "Cada beat traz o seu propósito, uma nota de planejamento, uma cena vinculada opcional e uma marcação de concluído; a barra no topo mostra quantos estão completos. Troque de modelo quando quiser — cada um guarda as próprias notas e vínculos, então nada se perde se você voltar.",
  "help.beats.tip.inline": "Digite direto na nota de planejamento de um beat — ela fica ali mesmo, não é um arquivo separado.",
  "help.beats.tip.link": "Vincule um beat à cena que o realiza, para que Planejar e Escrever fiquem sincronizados.",
  "help.beats.tip.scaffold": "Gerar estrutura cria esboços de cena para todos os beats sem vínculo de uma só vez.",

  // --- Topic: plan/board ---
  "help.board.title": "Como funciona o quadro",
  "help.board.groupBy": "Uma visualização Kanban das suas cenas. Use o seletor Agrupar por para organizar as colunas por status, ato, capítulo ou POV.",
  "help.board.drag": "Arraste um cartão para outra coluna para mudar esse valor na cena (ex.: de Rascunho para Revisada). Clique em um cartão para abrir a cena; clique com o botão direito (ou no botão ⋯) para renomear, editar e excluir. A cor do cartão vem do campo de cor da cena.",

  // --- Topic: plan/grid ---
  "help.grid.title": "Como funciona a grade de enredo",
  "help.grid.matrix": "Uma matriz linha de enredo × capítulo para acompanhar subtramas e arcos. As colunas são suas linhas de enredo; as linhas da grade são seus capítulos; cada célula mostra as cenas que fazem aquela linha de enredo avançar ali. As células são suas cenas reais — a grade vem do frontmatter das cenas, então sempre corresponde ao manuscrito, e um trecho vazio numa coluna é um sinal de ritmo, não uma falha de anotação.",
  "help.grid.cells": "Clique no + de uma célula para marcar uma cena existente ou criar ali mesmo um esboço de cena (status Ideia) — é assim que você planeja um beat que ainda não escreveu. Expanda a linha de um capítulo para incluir ou tirar cada cena sem arrastar. Arraste uma etiqueta para outra célula para movê-la entre linhas de enredo ou capítulos; uma cena pode pertencer a várias linhas de enredo ao mesmo tempo.",
  "help.grid.tip.plotlines": "Gerencie as linhas de enredo pelos cabeçalhos das colunas: renomear (atualiza todas as cenas marcadas), mudar a cor, reordenar, focar ou excluir.",
  "help.grid.tip.compact": "Livro grande? O modo compacto mostra as células como pontos coloridos (automático em grades grandes), e as linhas dos atos se recolhem em contagens por coluna.",
  "help.grid.tip.untracked": "Tags que não correspondem a nenhuma linha de enredo aparecem como colunas “não acompanhadas” — adote-as na sua lista ou remova-as de todas as cenas.",

  // --- Topic: plan/outline ---
  "help.outline.title": "Como funciona o esboço",
  "help.outline.tree": "A visualização em Árvore da Estrutura: organize o livro em atos que contêm capítulos que contêm cenas. Arraste uma cena para um capítulo (ou um capítulo para um ato) e solte acima ou abaixo de uma linha para reordenar. Esta árvore é a referência oficial — organizá-la também define a ordem de leitura do manuscrito, então as cenas de cada capítulo ficam juntas. Clique com o botão direito em uma cena (ou toque em ⋯) para renomeá-la, editar os detalhes ou a sinopse, ou movê-la para outro capítulo. As visualizações Quadro e Grade (no topo da aba) mostram as mesmas cenas de outro jeito.",
  "help.outline.order": "A Estrutura vem por último em Planejar de propósito. O caminho de sempre é rascunhar seus Beats primeiro, gerar cenas a partir desses beats e escrevê-las em Escrever — a estrutura pode esperar. Quando você tiver cenas de verdade, volte aqui para agrupá-las em atos e capítulos.",
  "help.outline.tip.nesting": "Aninhar é opcional — uma cena pode ficar fora de qualquer capítulo e um capítulo fora de qualquer ato (os grupos “Capítulos sem ato” / “Cenas sem lugar”).",
  "help.outline.tip.targets": "Dê a um capítulo uma meta de palavras para acompanhar o progresso dele; as mesmas metas aparecem em Acompanhar.",
  "help.outline.tip.open": "Clique em uma cena para abri-la em Escrever; use o menu ⋯ (ou o botão direito) para renomear, mover ou excluir.",

  // --- Topic: codex ---
  "help.codex.title": "Como funciona o Codex",
  "help.codex.intro": "A bíblia da sua história: personagens, locais, facções, itens, eventos e conceitos, cada um com um perfil estruturado que é salvo automaticamente no frontmatter da nota.",
  "help.codex.scopeIntro": "Todo verbete tem um escopo que controla onde ele aparece:",
  "help.codex.scope.global": "Global (padrão) — disponível em todos os projetos.",
  "help.codex.scope.project": "Projeto — defina codex-project na nota; só aquele livro o vê. Em Escopo, clique em Alterar…, escolha Livros e marque os livros para compartilhar um verbete entre alguns livros de uma série sem torná-lo válido para a série toda.",
  "help.codex.scope.series": "Série — defina codex-series; compartilhado entre os livros de uma série.",
  "help.codex.pins": "Fixe o seu elenco principal: clique com o botão direito em um verbete (ou toque em ⋯) e escolha Fixar neste livro. Os verbetes fixados aparecem primeiro no grupo, com um alfinete, e vêm primeiro quando você digita [[ em Escrever. As fixações pertencem ao livro aberto, então um personagem da série pode estar fixado em um livro e não no seguinte. A caixa de busca também encontra o Papel de um personagem e o Tipo de um lugar ou item: digite “antag” para achar seus antagonistas.",
  "help.codex.appearsIn": "A lista “Aparece em” de cada verbete se atualiza sozinha: mostra todas as cenas cujo texto cita o verbete pelo nome ou por um apelido, mais qualquer cena que o vincule nos metadados (Personagens, Local, POV), em todas as categorias — então um verbete novo encontra suas cenas sem nenhuma etapa de marcação. Etiquetas preenchidas são cenas vinculadas (quem escreve pôs o verbete ali); etiquetas com contorno são menções só no texto (alguém fala dele). A linha de cada livro conta as duas, mais as cenas de POV.",
  "help.codex.places": "Os lugares se aninham: defina o campo Dentro de de um local como um mundo ou outro local, e a lista de Locais os mostra como uma árvore (Mundo › Região › Cidade). Em um mundo ou local, “Novo lugar dentro…” cria um já no lugar certo, com o mesmo escopo.",
  "help.codex.links": "Os links levam a algum lugar: clique em um nome em um campo de links (Relacionamentos, Aliados…) para abrir aquele verbete, ou na seta ao lado de uma escolha única como Dono. Ctrl/Cmd + clique abre a nota em uma nova aba. “Arquivos vinculados” lista aquilo a que a nota do verbete aponta fora do Codex (um canvas de moodboard, um PDF, uma nota de pesquisa), mais qualquer canvas que contenha a ficha do verbete. Adicione um link como [[Moodboard.canvas]] ao texto da nota ou a uma propriedade; um link para um canvas ou PDF precisa da extensão.",
  "help.codex.portraits": "Uma imagem que você envia como retrato de um verbete é salva onde o Obsidian coloca novos anexos (Configurações → Arquivos e links → Local padrão para novos anexos). Escolha “Em subpasta dentro da pasta atual” para manter as imagens de cada verbete numa pasta ao lado dele.",

  // --- Topic: revise/audit ---
  "help.audit.title": "Como funciona a auditoria de revisão",
  "help.audit.intro": "Checklists em níveis que levam um rascunho do bagunçado ao pronto, do macro ao micro:",
  "help.audit.tier.story": "História — 18 pontos de verificação para o manuscrito inteiro (salvos no projeto).",
  "help.audit.tier.chapters": "Capítulos — 10 verificações por capítulo: ele merece estar ali, tem gancho, faz a história avançar, termina puxando o leitor? (Salvas no projeto; aparecem quando o livro tem capítulos.)",
  "help.audit.tier.scene": "Cena — uma passada de 14 pontos por cena (salva no frontmatter de cada cena).",
  "help.audit.tier.prose": "Prosa — 32 verificações linha a linha, agrupadas.",
  "help.audit.customize": "Renomeie, reordene, oculte ou adicione verificações em Personalizar → Checklists de revisão.",
  "help.audit.opening": "A passada por cena classifica cada abertura (Ação / Diálogo / Pensamento / Reflexão) automaticamente — corrija se o palpite estiver errado. Clique em uma cena para expandi-la e editar o checklist ali mesmo, ou vá até ela em Escrever.",

  // --- Topic: revise/todos ---
  "help.todos.title": "Como funciona o registro de revisões",
  "help.todos.intro": "Tudo o que falta revisar, numa lista agrupada por cena: os marcadores entre colchetes que você deixou enquanto escrevia e as decisões de revisão que você registrou pelo caminho. Use as etiquetas para filtrar por tipo de marcador ou de decisão.",
  "help.todos.jump": "Clique em um marcador para ir direto àquele ponto em Escrever — ele pisca para você resolvê-lo rápido; edite a prosa para removê-lo e a lista se atualiza na próxima verificação.",
  "help.todos.decisions": "Decisões são as regras no nível da história (“daqui em diante, o irmão está morto”): registre uma com “Registrar uma decisão”, dê um tipo a ela e vincule-a a uma cena ou ao projeto inteiro. Marque-a como aplicada depois de fazer a mudança; clique no texto para editá-la. Para dúvidas de pesquisa e cenas que faltam, prefira um marcador [RESEARCH: ] ou [SCENE: ] — ele marca o ponto exato na prosa.",

  // --- Topic: search ---
  "help.search.title": "Como funciona a busca",
  "help.search.scope": "Busca de texto completo na prosa das suas cenas e nas sinopses. Escolha um escopo — esta versão, a história toda, a série ou o cofre inteiro — e refine com os filtros de metadados (status, POV, capítulo, linha de enredo, personagem).",
  "help.search.results": "Os resultados são agrupados por cena. Clique em um resultado para ir direto a ele em Escrever, onde ele pisca para você encontrá-lo rápido. Um resultado na sinopse abre a cena sem piscar (a sinopse não faz parte do texto editável). Defina só um filtro, sem termo de busca, para listar todas as cenas que correspondem — um localizador estruturado rápido.",
  "help.search.matching": "A busca é literal (sem curingas nem regex), com as opções Diferenciar maiúsculas e Palavra inteira; cenas arquivadas só entram quando você marca “Incluir arquivados”.",

  // --- Topic: publish/compile ---
  "help.compile.title": "Como funciona a compilação",
  "help.compile.formats": "Reúna as cenas do projeto ativo em um único arquivo de manuscrito. Escolha um formato — Markdown, HTML, Word ou PDF/EPUB via Pandoc —, defina o nome do arquivo de saída e compile.",
  "help.compile.docx": "O Word (.docx) já vem embutido e funciona em qualquer dispositivo. Ele gera um manuscrito padrão: espaço duplo, parágrafos com recuo, capítulos em página nova, uma folha de rosto com seu nome e a contagem de palavras, e um cabeçalho de página. Adicione seu nome e seus dados de contato em Configurações → Inkswell → Manuscrito; defina um pseudônimo e o sobrenome do cabeçalho de cada livro abaixo do formato.",
  "help.compile.steps": "O processo roda em etapas que você pode ativar ou desativar: etapas por cena (remover marcadores de pendência, inclusive os seus, filtrar metadados) e etapas do manuscrito (títulos, quebras de página, limpeza de linhas em branco). Suas escolhas são lembradas por projeto.",

  // --- Topic: customize ---
  "help.customize.title": "Como funciona Personalizar",
  "help.customize.intro": "Personalizar muda a FORMA do Inkswell — quais tipos de Codex existem e que campos cada um mostra, com o que um novo verbete ou uma nova cena começa, estruturas de beats, status de cena, prompts de escrita, os checklists de revisão e de publicação e quais recursos opcionais aparecem. As preferências (metas, comportamento do editor, pastas) ficam nas Configurações.",
  "help.customize.tip.sections": "Escolha uma seção à esquerda; edite à direita. As alterações são salvas na hora.",
  "help.customize.tip.templates": "Os campos e o conteúdo inicial do Codex ficam em notas de modelo comuns, na pasta Templates da sua pasta base — editar aqui edita essas notas, e você ainda pode abri-las diretamente.",
  "help.customize.tip.lossless": "Os itens nativos nunca são excluídos: ocultar não perde nada, renomear mantém o id salvo e toda seção pode ser redefinida para o padrão do Inkswell.",
  "help.customize.tip.ownItems": "Os seus próprios itens (um tipo personalizado, um item de checklist, um prompt) ficam no data.json do plugin e viajam junto com a pasta de configuração do seu cofre.",

  // --- Help index section: home ---
  "help.section.home.phase": "Início",
  "help.section.home.summary": "Seus livros nas estantes, a árvore de cenas de um livro e uma caixa de entrada para ideias de histórias.",
  "help.home.hub": "Sua central. Todos os projetos mostra seus livros como cartões em estantes — uma estante por série, na ordem dos livros, mais uma para os livros avulsos —, cada um com a capa (ou uma capa gerada provisória), o número do livro, cenas e palavras, o progresso em direção à meta e quando você o editou pela última vez. Clique em um cartão para focar naquele livro; o menu ⋯ dele (ao passar o mouse no computador, sempre visível no toque) renomeia, define a série, troca a capa ou arquiva.",
  "help.home.archive": "Arquivar um livro terminado ou engavetado só o tira de vista: ele sai das estantes e da lista de projetos e fica na seção Arquivados, no fim do Início. As palavras dele continuam contando para as suas metas, e ele compila e mantém o Codex como antes. Desarquive pelo menu ⋯ dele. Numa série, um livro arquivado continua na estante, esmaecido — ou ative “Ocultar livros arquivados das suas séries” nas Configurações para tirá-lo totalmente da estante da série.",
  "help.home.focused": "Um livro em foco mostra o cartão de destaque (capa, logline, tema, meta), uma faixa com as outras capas da série (clique em uma para trocar) e a árvore de cenas; arraste as linhas das cenas para reordenar, ou use o menu ⋯ para mover, renomear ou excluir. O inspetor à direita edita os metadados da cena selecionada.",
  "help.home.ideas": "Capture ideias de histórias na caixa de entrada abaixo das estantes sem sair da página — pressione Enter para salvar. Clique em uma ideia para editá-la ali mesmo; o menu ⋯ / do botão direito copia a ideia, salva como nota na pasta Ideas da sua pasta base (e a tira da caixa de entrada), fixa no topo ou exclui. Clique no cabeçalho Ideias para recolher a seção.",
  "help.home.seriesHeading": "Séries",
  "help.home.seriesAdd": "Uma série é um conjunto de livros que compartilham um nome — sem nota extra, só uma marcação em cada livro. Adicione um livro a uma série pelo menu ⋯ / do botão direito dele (Série…) ou pela linha da série abaixo do título no cartão de destaque: escolha uma série existente ou comece uma nova, e defina o número do livro (por padrão, o próximo livre). Novo projeto tem os mesmos campos, então dá para criar um livro direto numa série.",
  "help.home.seriesManage": "O menu ⋯ / do botão direito no cabeçalho da série gerencia o conjunto todo: Novo livro nesta série, Adicionar projeto existente, Renomear série (todos os livros e todos os verbetes do Codex com escopo de série acompanham) e Reordenar livros (arraste e Salvar renumera 1, 2, 3…).",

  // --- Help index section: plan ---
  "help.section.plan.phase": "Planejar",
  "help.section.plan.summary": "Campos da visão geral, a folha de beats e a Estrutura (árvore do esboço, quadro e grade de enredo).",
  "help.plan.overview": "Visão geral guarda os campos do romance como um todo (logline, tema, gênero) e textos longos (sinopse, esboço em três atos). Beats é a folha de beats. Estrutura reúne a árvore do esboço, o quadro Kanban e a grade de enredo atrás de um seletor Árvore | Quadro | Grade — três visualizações das mesmas cenas. Tudo é detalhado abaixo.",
  "help.plan.sortByChapter": "Está migrando um manuscrito numerado cujas cenas chegaram fora de ordem? Estrutura → Árvore tem um botão “Ordenar por capítulo” (também no menu ⋯ de um livro no Início e como o comando “Ordenar cenas pelo número do capítulo”): ele reordena o manuscrito uma vez pelo número no rótulo de capítulo de cada cena — em algarismos ou por extenso — e deixa as cenas sem número na ordem atual, no final. É uma ação única, não um modo; depois disso, a ordem por arraste continua sendo sua.",

  // --- Help index section: write ---
  "help.section.write.phase": "Escrever",
  "help.section.write.summary": "O editor de manuscrito sem distrações e os marcadores de pendência.",

  // --- Help index section: codex ---
  "help.section.codex.phase": "Codex",
  "help.section.codex.summary": "A bíblia da sua história, com escopo global / de projeto / de série.",

  // --- Help index section: search ---
  "help.section.search.phase": "Buscar",
  "help.section.search.summary": "Busca de texto completo nas cenas, com escopo e filtros.",

  // --- Help index section: track ---
  "help.section.track.phase": "Acompanhar",
  "help.section.track.summary": "Contagem de palavras, sequências, ritmo, sprints e estrutura.",
  "help.track.dashboard": "Um painel da sua escrita: contagens diárias/semanais/mensais, sequências, um mapa de calor de 26 semanas, o histórico de sprints e um detalhamento da estrutura das cenas. A barra de status, embaixo, espelha o progresso de hoje e qualquer sprint em andamento — clique nela para abrir Acompanhar.",
  "help.track.goals": "Só a escrita nos projetos conta para as metas — por padrão, as cenas do manuscrito. Configurações → O que conta para as metas também pode incluir notas de planejamento, notas do Codex ou outras notas do projeto; o resto do cofre nunca conta.",
  "help.track.sprint": "Inicie um sprint cronometrado pela barra lateral (ou pelo comando “Iniciar um sprint de escrita”) para escrever contra o relógio e uma meta de palavras.",
  "help.track.challenge": "Um desafio de escrita (“Configurar desafio de escrita”, ou o link no cartão Metas) é um período e uma meta de palavras — digamos, 50.000 palavras em novembro. Ele conta cada palavra válida para as metas que você escrever nesse período, em qualquer projeto, e mostra onde você deveria estar hoje, quanto está adiantado ou atrasado e quanto precisa escrever hoje. Clique no total para copiá-lo para o site de um evento. Escreve em mais de um dispositivo? Ative a sincronização do histórico para que a contagem inclua todos eles.",

  // --- Help index section: revise ---
  "help.section.revise.phase": "Revisar",
  "help.section.revise.summary": "Checklists de auditoria, o registro de revisões e a análise da prosa.",
  "help.revise.analysisHeading": "Análise",
  "help.revise.analysis": "Índices de legibilidade, suas palavras mais usadas e a detecção de expressões repetidas (ecos) no manuscrito inteiro — execute quando quiser, numa passada de estilo.",

  // --- Help index section: publish ---
  "help.section.publish.phase": "Publicar",
  "help.section.publish.summary": "Compilação, o checklist de autopublicação e o planejamento do lançamento.",
  "help.publish.checklistHeading": "Checklist e lançamento",
  "help.publish.checklist": "Checklist acompanha cerca de 50 tarefas de autopublicação, além de uma ficha de metadados por formato (ISBN, texto de quarta capa, palavras-chave). Lançamento planeja um cronograma de pré-venda com datas de marcos calculadas automaticamente e acompanhamentos de orçamento, capa, marketing e leitores de ARC.",

  // --- Help index section: customize ---
  "help.section.customize.phase": "Personalizar",
  "help.section.customize.summary": "Adapte o Inkswell ao seu processo — tipos, campos, modelos, estruturas, checklists, prompts.",

  // --- Help index section: data ---
  "help.section.data.phase": "Seus dados e backups",
  "help.section.data.summary": "Onde tudo fica guardado e como recuperar.",
  "help.data.storage": "Tudo o que o Inkswell guarda é texto simples. A prosa das cenas fica em notas comuns na pasta de cenas do projeto. Os dados de planejamento — beats, estrutura do esboço, metas, o registro de revisões, os checklists de auditoria, as configurações de compilação e de publicação — ficam no frontmatter da NOTA DE ÍNDICE DO PROJETO: a nota com o nome do seu projeto, ao lado das cenas. Os verbetes do Codex são notas comuns com uma chave codex. As configurações do plugin, o histórico de escrita, os sprints e a caixa de entrada de ideias ficam no data.json do plugin.",
  "help.data.history": "O histórico de escrita conta as palavras que você digita no Obsidian — nos editores dele e no painel Escrever. Um arquivo que muda fora do Obsidian, ou que chega de outro dispositivo pela sincronização, só redefine o ponto de partida daquele arquivo; essas palavras nunca são registradas como escritas neste dispositivo.",
  "help.data.sync": "Para ver o histórico de todos os dispositivos junto, ative “Sincronizar o histórico de escrita entre dispositivos” nas Configurações. Cada dispositivo passa a manter uma pequena nota de registro, gravada automaticamente (com uma chave inkswell-log no frontmatter), na pasta “Writing log” da sua pasta base, e Acompanhar junta todas. Renomeie um dispositivo pela propriedade device dessa nota; se um dispositivo não existe mais, exclua a nota dele.",
  "help.data.recoveryHeading": "Se algo der errado",
  "help.data.fileRecovery": "A Recuperação de arquivos do Obsidian (Configurações → Recuperação de arquivos → Visualizar) guarda instantâneos periódicos de toda nota que muda, inclusive as que o Inkswell grava. A busca dela procura pelos NOMES DOS ARQUIVOS: para os dados de planejamento, busque o nome do seu projeto e abra os instantâneos da nota de índice; para a prosa, busque o nome da cena.",
  "help.data.conflicts": "Sempre que o Inkswell precisa substituir uma versão do seu texto — ao resolver um conflito entre o editor e o disco, ao sair de uma cena antes de você resolver um, ou ao sobrescrever um arquivo na compilação a seu pedido — a versão substituída é salva antes na pasta “Inkswell conflicts”. Nada é descartado em silêncio.",
  "help.data.backups": "O Inkswell também mantém um backup diário do data.json (dos últimos 7 dias) numa pasta backups ao lado dele — dentro da pasta do próprio plugin, no diretório de configuração do seu cofre. Para trazer de volta só as configurações (tipos de Codex personalizados, tipos renomeados, alterações em Personalizar, a barra lateral), use o comando “Restaurar configurações de um backup” e escolha um dia; seu histórico de escrita continua como está. Para restaurar tudo: desative o Inkswell, copie o backup por cima do data.json e reative. Se o data.json não puder ser lido quando o Obsidian abrir, o Inkswell carrega sozinho o backup mais recente e avisa você.",

  // --- Help panel ---
  "help.panel.title": "Como o Inkswell funciona",
  "help.panel.intro": "Uma referência para cada parte da bancada. O fluxo vai de Planejar → Escrever → Revisar → Publicar, com o Codex e Acompanhar ao lado. Expanda uma seção para se aprofundar.",
  "help.panel.shape": "Adapte o Inkswell ao seu processo em {link} — tipos e campos do Codex, modelos, estruturas, checklists, prompts e quais recursos aparecem (ou clique com o botão direito em uma aba opcional para ocultá-la). Ocultar não perde nada — seus dados são mantidos e reativar restaura tudo.",
  "help.panel.shape.link": "Personalizar",
  "help.panel.reset": "Redefinir dicas e rever as boas-vindas",
  "help.panel.reset.done": "Dicas redefinidas.",

  // --- Contextual tip ---
  "help.hint.dismiss": "Dispensar esta dica",

  // --- Welcome ---
  "welcome.title": "Boas-vindas ao Inkswell",
  "welcome.intro": "Uma bancada completa para romancistas — uma aba só, organizada pela fase em que você está. Troque de fase pela barra de ícones à esquerda:",
  "welcome.phase.plan.name": "Planejar",
  "welcome.phase.plan.blurb": "Visão geral, folha de beats e estrutura da história.",
  "welcome.phase.write.name": "Escrever",
  "welcome.phase.write.blurb": "Editor sem distrações, com marcadores de pendência.",
  "welcome.phase.revise.name": "Revisar",
  "welcome.phase.revise.blurb": "Auditoria, registro de decisões e varreduras.",
  "welcome.phase.publish.name": "Publicar",
  "welcome.phase.publish.blurb": "Compile e lance o seu livro.",
  "welcome.phase.codex.name": "Codex",
  "welcome.phase.codex.blurb": "A bíblia da sua história, usada em todo lugar.",
  "welcome.phase.track.name": "Acompanhar",
  "welcome.phase.track.blurb": "Contagem de palavras, sequências e sprints.",
  "welcome.tips": "Primeira vez num painel? Procure a dica “Como funciona” no topo — dispense-a quando tiver entendido. A aba Ajuda na barra lateral guarda o guia completo.",
  "welcome.start": "Começar",
};
