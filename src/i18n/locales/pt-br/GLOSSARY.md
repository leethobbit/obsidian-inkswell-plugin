# Glossário pt-BR (Português do Brasil)

Termos recorrentes da tradução do Inkswell. Se mudar um termo, mude em todos os arquivos desta pasta (busque pela pasta inteira).

## Convenções

- **Tratamento:** *você*, sempre. Instruções no imperativo da 3ª pessoa ("Abra", "Escolha", "Clique"). Nada de "tu" nem de formas europeias (ficheiro, ecrã, guardar, utilizador).
- **Caixa:** frase normal em rótulos e botões ("Nova cena", não "Nova Cena"). Nomes de destinos e abas citados em texto ficam com inicial maiúscula (Planejar, Escrever, Codex).
- **Aspas:** tipográficas “…” e ‘…’; apóstrofo ’. Nunca aspas retas na interface.
- **Números:** os placeholders recebem números já formatados pelo `Intl` (1.234). Em texto fixo, decimal com vírgula ("1,5 mil"), exceto quando o valor é digitado no campo ("0.5" em `series.field.bookNumberDesc`, porque o campo espera ponto). *verify*
- **Plural:** no CLDR do português, a forma `.one` vale para **0 e 1**. Usamos o singular em `.one` ("0 palavra", "1 palavra"), seguindo a norma de que quantidades menores que 2 levam singular. Onde o 0 nunca aparece (seções escondidas quando vazias), isso não importa.
- **Abreviações:** "pal." (palavras), "min", "h", "d", "sem.", "ppm" (palavras por minuto).
- **Mantidos em inglês:** nomes de produto (Inkswell, Obsidian, Longform, Scrivener, pandoc, Word, Markdown, Lucide, BookBub, Goodreads, Kindle Unlimited), teclas (Ctrl/Cmd, Esc, Enter), palavras-chave dos marcadores (`[TODO: …]`, `[RESEARCH: …]`, `[NOTE: …]`, `[SCENE: …]`), sintaxe de link (`[[Nota]]`), chaves de frontmatter (`codex:`, `status: idea`, `sceneTemplate`, `codex-fields`, `inkswell-log`, `device`) e nomes de pastas/arquivos criados no cofre ("Writing log", "Inkswell conflicts", Templates, Ideas, Scene.md).

## Destinos e navegação

| Inglês | pt-BR | Nota |
|---|---|---|
| Home | Início | No celular, a aba vira "Cenas" (`nav.home.phone`) |
| Plan | Planejar | Destinos no infinitivo, como verbos de ação |
| Write | Escrever | "editor Escrever" = Write editor |
| Revise | Revisar | |
| Publish | Publicar | |
| Codex | Codex | Nome do recurso, masculino ("o Codex"). Não traduzido para "códice" |
| Track | Acompanhar | |
| Customize | Personalizar | |
| Search | Buscar | |
| Help | Ajuda | |
| Overview | Visão geral | |
| Structure | Estrutura | Tree / Board / Grid = Árvore / Quadro / Grade |
| Audit | Auditoria | |
| Analysis | Análise | |
| Compile (aba) | Compilar | |
| Checklist | Checklist | Masculino ("o checklist") |
| Launch | Lançamento | |
| rail | barra lateral / barra de navegação | A coluna de ícones à esquerda |
| side panel | painel lateral | Coluna da direita em Escrever |
| sidebar | barra lateral | A do Obsidian |
| companion | painel auxiliar | Visualização estreita na barra lateral do Obsidian |
| scene stream / Stream | fluxo de cenas / Fluxo | |
| focus mode | modo foco | |
| typewriter mode | modo máquina de escrever | |
| next-up note | nota de próxima sessão | "Next up:" = "Próxima sessão:" |
| peek / Codex card | ficha do Codex | |
| inspector | inspetor (de cena) | |

## Escrita e estrutura

| Inglês | pt-BR | Nota |
|---|---|---|
| project | projeto | |
| book | livro | |
| series | série | |
| standalone | avulso / Avulsos | Livro fora de série |
| shelf | estante | |
| scene | cena | |
| chapter | capítulo | |
| act | ato | Ato I / Ato 2 |
| beat | beat | Masculino ("o beat", "os beats"). Termo usado no meio de roteiro no Brasil. *verify* |
| beat sheet | folha de beats | *verify* |
| beat template | modelo de beats | |
| scaffold (structure/scenes) | gerar (estrutura/cenas) | Botão "Gerar estrutura" |
| placeholder scene / stub | cena provisória / esboço de cena | |
| outline | esboço | O painel Árvore e o "outline" em geral |
| plot grid | grade de enredo | |
| plotline | linha de enredo | |
| subplot | subtrama | |
| logline | logline | Termo corrente no Brasil |
| synopsis | sinopse | |
| theme | tema | |
| plot groundwork | base do enredo | |
| POV | POV | Em prosa às vezes "ponto de vista" |
| draft (versão do manuscrito) | versão | "New draft" = "Nova versão". Evita confusão com o status "Rascunho" |
| draft (status de cena) | Rascunho | Status: Ideia, Esboçada, Rascunho, Escrita, Revisada, Final |
| drafting (fase) | escrita | Prompts: "Escrita" / "Revisão" |
| first draft | primeiro rascunho | |
| manuscript | manuscrito | |
| prose | prosa | |
| story bible | bíblia da história | |
| codex entry | verbete (do Codex) | |
| codex type | tipo (do Codex) | Personagem, Local, Mundo, Facção, Item, Evento, Conceito |
| scope | escopo | Global / Série / Livros |
| alias | apelido | Campo "Apelidos" |
| pin / keep at top | fixar / fixar no topo | |
| template (note) | modelo / nota de modelo | |
| starter content | conteúdo inicial | |
| built-in | nativo | |
| shipped (name/fields) | original | "Restaurar o nome original" |
| writing prompt | prompt de escrita | *verify* — alternativa: "proposta de escrita" |
| ideas inbox | caixa de entrada de ideias | |
| capture | capturar | |

## Revisão

| Inglês | pt-BR | Nota |
|---|---|---|
| revision log | registro de revisões | |
| revision decision | decisão de revisão | "Log a decision" = "Registrar uma decisão" |
| applied | aplicada | |
| to-do marker / marker | marcador de pendência / marcador | |
| revision audit | auditoria de revisão | |
| checkpoint | ponto de verificação | |
| tier | nível | Nível da história / do capítulo / da cena / da prosa |
| lift-out test | teste de remoção | Manter / Cortar / Fundir |
| side-character roster | elenco de coadjuvantes | |
| style sheet | folha de estilo | |
| echoes | ecos | |
| dialogue tags | verbos de elocução | |
| purple prose | prosa rebuscada | |
| filter words | palavras-filtro | |
| plot hole | furo de enredo | |
| continuity | continuidade | |

## Acompanhar

| Inglês | pt-BR | Nota |
|---|---|---|
| word count | contagem de palavras | |
| goal (daily/weekly) | meta (diária/semanal) | |
| word target (project) | meta de palavras | "goal" e "target" viram ambos "meta" |
| deadline | prazo | |
| pace | ritmo | Adiantado / No ritmo / Atrasado |
| streak | sequência | |
| habit | hábito | |
| milestone | marco | |
| sprint | sprint | Masculino ("o sprint") |
| writing challenge | desafio de escrita | |
| par (challenge) | ritmo esperado / esperado | |
| heatmap | mapa de calor | |
| wpm | ppm | palavras por minuto |
| writing history | histórico de escrita | |

## Publicar

| Inglês | pt-BR | Nota |
|---|---|---|
| compile | compilar / compilação | |
| reference doc | documento de referência | |
| scene separator / scene break | separador de cenas / quebra de cena | |
| title page | folha de rosto | |
| byline | nome de autor | |
| running header | cabeçalho (de página) | |
| pre-export check | verificação antes de exportar | |
| self-publishing | autopublicação | |
| front / back matter | elementos pré-textuais / pós-textuais | |
| blurb | texto de quarta capa | |
| tagline | slogan | |
| comp covers | capas de referência | |
| cover designer | capista | |
| formatting | diagramação | |
| interior | miolo | |
| proof | prova | |
| paperback / hardcover | brochura / capa dura | |
| pre-order | pré-venda | |
| ARC | ARC / cópia antecipada | "Leitores de ARC". *verify* |
| beta readers | leitores beta | |
| newsletter swaps | trocas de divulgação entre newsletters | |

## Estruturas de beats

| Inglês | pt-BR | Nota |
|---|---|---|
| Save the Cat | Save the Cat | Nome mantido; beats seguem a tradução corrente ("Imagem de abertura", "Noite escura da alma", "Os vilões se aproximam"…) |
| Hero's Journey | Jornada do herói | Etapas pela tradução corrente de Vogler ("Mundo comum", "Chamado à aventura", "Aproximação da caverna oculta"…) |
| Three-Act | Três atos | "Ponto de virada 1/2", "Incidente incitante" |
| Seven-Point | Sete pontos | Pinch point = "ponto de pressão". *verify* |
| Story Circle | Story Circle | Nome mantido (Dan Harmon); etapas traduzidas |
| Romancing the Beat | Romancing the Beat | Nome mantido; etapas traduzidas ("Nem pensar nº 1", "Fundo do poço"…). *verify* |
| 27-Chapter | 27 capítulos | |
| Ten-Point Outline | Esboço em dez pontos | |

## Nomes da interface do Obsidian (verify)

Usados quando o texto manda o usuário a um menu do próprio Obsidian. Conferir contra a interface pt-BR atual do Obsidian.

| Inglês | pt-BR usado | Status |
|---|---|---|
| Settings | Configurações | verify |
| Hotkeys | Atalhos | verify (não aparece no catálogo atual) |
| command palette | paleta de comandos | verify |
| vault | cofre | verify |
| status bar | barra de status | verify |
| file explorer | explorador de arquivos | verify |
| Appearance → Text font | Aparência → Fonte do texto | verify |
| Files and links → Default location for new attachments | Arquivos e links → Local padrão para novos anexos | verify |
| In subfolder under current folder | Em subpasta dentro da pasta atual | verify |
| File Recovery → View | Recuperação de arquivos → Visualizar | verify |
| properties / frontmatter | propriedades / frontmatter | "frontmatter" mantido onde o texto é técnico |
| trash | lixeira | verify |
| developer console | console do desenvolvedor | |
| canvas | canvas | verify |
| tag | tag | verify |
