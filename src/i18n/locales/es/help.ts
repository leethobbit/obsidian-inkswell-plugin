/** Spanish UI strings — the `help` area (mirrors ../en/help.ts). */
import type { Catalog } from "../types";

export const help: Catalog = {
  // --- Topic: write ---
  "help.write.title": "Cómo funcionan la redacción y los marcadores de tarea",
  "help.write.columns": "Escribir es un editor sin distracciones: elige una escena a la izquierda, redacta en el centro y ten a mano lo que necesites en la columna de la derecha. Esa columna tiene cuatro pestañas: Escena (detalles de la escena en la que estás), Códice (quién y qué aparece en ella), Planificar (las escenas de este capítulo, los beats y tu nota de planificación) y Registro de revisiones (los marcadores de tarea pendientes y las decisiones de revisión registradas de este proyecto, empezando por la escena actual; haz clic en un marcador para ir a él). Los cambios se guardan al salir del campo y al cambiar de escena, nunca a mitad de una pulsación.",
  "help.write.room": "Haz sitio para la página: los botones de ambos extremos de la barra de herramientas ocultan la lista de escenas y la columna derecha, y puedes arrastrar la línea junto a la columna para cambiar su tamaño. Concentración (el botón de las flechas) oculta todo menos el editor y la barra de herramientas; vuelve a pulsarlo para recuperarlo todo. Pliega la nota «Lo siguiente» con la flecha de su extremo. Haz clic derecho en el texto para dar formato, consultar el códice, dividir una escena o registrar una decisión de revisión.",
  "help.write.stream": "Cambia de Escena a Flujo (arriba en Escribir; no disponible en teléfonos) para ver todo el libro como una sola página, en orden. Haz clic en cualquier sitio para editar esa escena allí mismo; las flechas del teclado continúan en la escena siguiente. Salta entre capítulos desde el menú superior o desde los nombres de capítulo de la izquierda, y limita la página a un capítulo, POV, trama, personaje o estado. Cada escena se sigue guardando en su propia nota.",
  "help.write.markers": "No te detengas a documentarte ni a pulir una parte difícil. Deja un marcador entre corchetes y sigue adelante: se resaltan en el editor y se recogen más tarde en Revisar → Registro de revisiones. La palabra clave no distingue mayúsculas de minúsculas y el «: texto» es opcional.",
  "help.write.markerPicker": "Ejecuta «Insertar un marcador de tarea…» para abrir un selector que lo inserta en el cursor.",
  "help.write.peek": "Comprueba un detalle sin salir de la página: mantén pulsado Ctrl (Cmd en Mac) y señala el nombre de un personaje o un lugar en el texto para ver su ficha del códice. Pasa el puntero o toca un nombre en la columna Escena para ver la misma ficha, o ejecuta «Buscar en el códice» (también en el menú contextual). Esc la cierra y el cursor se queda donde estaba.",
  "help.write.companions": "Ten cosas a mano mientras escribes: haz clic derecho en Códice, Planificar, Progreso o Inicio en la barra izquierda y elige «Abrir en la barra lateral», o ejecuta «Abrir un acompañante en la barra lateral…». Los acompañantes siguen la escena que estás escribiendo: Códice muestra quién y qué aparece en ella, Planificar muestra las escenas, sinopsis y beats de este capítulo junto con tu nota de planificación, Escenas es el esquema completo y Registro de revisiones muestra lo que queda en esta escena. Arrástralos a donde quieras; Obsidian lo recuerda. Al hacer clic en una escena desde allí se abre en Escribir, o en una pestaña normal si lo eliges en la configuración.",
  "help.write.customMarkers": "¿Quieres tu propia palabra, como [CHECK: ] o [TK: ]? Añádela en Personalizar → Marcadores de tarea, donde también puedes ocultar los integrados.",

  // --- Topic: track/sync ---
  "help.sync.title": "¿Escribes en más de un dispositivo?",
  "help.sync.body": "Las palabras se cuentan en el dispositivo donde las escribes, así que este panel solo conoce este dispositivo. Para que las rachas y los totales incluyan todos tus dispositivos, activa Configuración → Inkswell → «Sincronizar el historial de escritura entre dispositivos». Inkswell guardará entonces una pequeña nota de registro por dispositivo en la carpeta «Writing log» de tu carpeta base y las combinará aquí; la sincronización de tu bóveda (Obsidian Sync, iCloud…) se encarga de llevar las notas.",

  // --- Topic: plan/beats ---
  "help.beats.title": "Cómo funciona la hoja de beats",
  "help.beats.intro": "Un esquema estructural del proyecto activo, creado a partir de la plantilla de beats que elijas en el desplegable Plantilla. Se incluyen ocho:",
  "help.beats.template.saveTheCat": "Save the Cat (15 beats)",
  "help.beats.template.threeAct": "Tres actos (7)",
  "help.beats.template.herosJourney": "El viaje del héroe (12)",
  "help.beats.template.sevenPoint": "Siete puntos (7)",
  "help.beats.template.storyCircle": "Story Circle (8)",
  "help.beats.template.romancingTheBeat": "Romancing the Beat (14)",
  "help.beats.template.twentySevenChapter": "27 capítulos (27)",
  "help.beats.template.tenPoint": "Esquema de diez puntos (10): enumera las diez cosas que deben ocurrir en tu historia",
  "help.beats.custom": "También puedes añadir tus propias estructuras en Personalizar → Plantillas de beats; aparecen en el desplegable junto a las integradas.",
  "help.beats.perBeat": "Cada beat incluye su propósito, una nota de planificación, una escena vinculada opcional y una casilla de hecho; la barra superior muestra cuántos están completos. Cambia de plantilla cuando quieras: cada una conserva sus propias notas y vínculos, así que no pierdes nada si vuelves a la anterior.",
  "help.beats.tip.inline": "Escribe directamente en la nota de planificación de un beat: está integrada, no es un archivo aparte.",
  "help.beats.tip.link": "Vincula cada beat con la escena que lo desarrolla para que Planificar y Escribir estén sincronizados.",
  "help.beats.tip.scaffold": "Generar crea en un solo paso escenas provisionales para todos los beats sin vincular.",

  // --- Topic: plan/board ---
  "help.board.title": "Cómo funciona el tablero",
  "help.board.groupBy": "Una vista Kanban de tus escenas. Usa el selector Agrupar por para organizar las columnas por Estado, Acto, Capítulo o POV.",
  "help.board.drag": "Arrastra una tarjeta a otra columna para cambiar ese valor de la escena (p. ej., pasarla de Borrador a Revisada). Haz clic en una tarjeta para abrir la escena; haz clic derecho (o usa el botón ⋯) para cambiarle el nombre, editarla o eliminarla. El color de la tarjeta sale del campo de color de la escena.",

  // --- Topic: plan/grid ---
  "help.grid.title": "Cómo funciona la cuadrícula de tramas",
  "help.grid.matrix": "Una matriz de tramas × capítulos para seguir subtramas y arcos. Las columnas son tus tramas; las filas, tus capítulos; cada celda muestra las escenas que hacen avanzar esa trama en ese punto. Las celdas son tus escenas reales: la cuadrícula se deriva del frontmatter de las escenas, así que siempre coincide con el manuscrito, y un tramo vacío en una columna es una señal de ritmo, no un hueco administrativo.",
  "help.grid.cells": "Haz clic en el + de una celda para etiquetar una escena existente o crear allí mismo una escena provisional (estado Idea): así se planifica un beat que aún no has escrito. Expande la fila de un capítulo para activar o desactivar la pertenencia de cada escena sin arrastrar. Arrastra una etiqueta a otra celda para moverla entre tramas o capítulos; una escena puede pertenecer a varias tramas a la vez.",
  "help.grid.tip.plotlines": "Gestiona las tramas desde los encabezados de columna: cambiar el nombre (actualiza todas las escenas etiquetadas), cambiar el color, reordenar, enfocar o eliminar.",
  "help.grid.tip.compact": "¿Libro grande? El modo compacto muestra las celdas como puntos de color (automático en cuadrículas grandes), y las filas de acto se contraen en recuentos por columna.",
  "help.grid.tip.untracked": "Las etiquetas que no coinciden con ninguna trama aparecen como columnas «sin seguimiento»: incorpóralas a tu lista o quítalas de todas las escenas.",

  // --- Topic: plan/outline ---
  "help.outline.title": "Cómo funciona el esquema",
  "help.outline.tree": "La vista Árbol de Estructura: organiza tu libro en actos que contienen capítulos que contienen escenas. Arrastra una escena a un capítulo (o un capítulo a un acto) y suéltala encima o debajo de una fila para reordenar. Este árbol es la fuente de verdad: al organizarlo también fijas el orden de lectura del manuscrito, de modo que las escenas de cada capítulo van juntas. Haz clic derecho en una escena (o toca ⋯) para cambiarle el nombre, editar sus detalles o su sinopsis, o moverla a otro capítulo. Las vistas Tablero y Cuadrícula (arriba en la pestaña) muestran las mismas escenas de otra manera.",
  "help.outline.order": "Estructura va al final de Planificar a propósito. Lo habitual es esbozar primero los beats, sacar escenas de esos beats y redactarlas en Escribir; la estructura puede esperar. Cuando tengas escenas reales, vuelve aquí para agruparlas en actos y capítulos.",
  "help.outline.tip.nesting": "Anidar es opcional: una escena puede quedar fuera de cualquier capítulo y un capítulo fuera de cualquier acto (los grupos «Capítulos sin acto» y «Escenas sin asignar»).",
  "help.outline.tip.targets": "Ponle a un capítulo un objetivo de palabras para seguir su progreso; los mismos objetivos aparecen en Progreso.",
  "help.outline.tip.open": "Haz clic en una escena para abrirla en Escribir; usa el menú ⋯ (o el clic derecho) para cambiarle el nombre, moverla o eliminarla.",

  // --- Topic: codex ---
  "help.codex.title": "Cómo funciona el códice",
  "help.codex.intro": "Tu biblia de la historia: personajes, lugares, facciones, objetos, acontecimientos y conceptos, cada uno con una ficha estructurada que se guarda sola en el frontmatter de la nota.",
  "help.codex.scopeIntro": "Cada entrada tiene un alcance que controla dónde aparece:",
  "help.codex.scope.global": "Global (predeterminado): disponible en todos los proyectos.",
  "help.codex.scope.project": "Proyecto: pon codex-project en la nota; solo ese libro la ve. En Alcance, haz clic en Cambiar…, elige Libros y marca los libros para compartir una entrada entre algunos libros de una serie sin extenderla a toda la serie.",
  "help.codex.scope.series": "Serie: pon codex-series; se comparte entre los libros de una serie.",
  "help.codex.pins": "Fija a tu reparto principal: haz clic derecho en una entrada (o toca ⋯) y elige Fijar en este libro. Las entradas fijadas aparecen primero en su grupo, con una chincheta, y salen primero cuando escribes [[ en Escribir. Las fijaciones pertenecen al libro abierto, así que un personaje de una serie puede estar fijado en un libro y no en el siguiente. El cuadro de búsqueda también encuentra el Papel de un personaje y el Tipo de un lugar u objeto: escribe «antag» para encontrar a tus antagonistas.",
  "help.codex.appearsIn": "La lista «Aparece en» de cada entrada se actualiza sola: muestra todas las escenas cuyo texto menciona la entrada por su nombre o alias, además de las escenas que la enlazan en sus metadatos (Personajes, Lugar, POV), en todas las categorías; así una entrada nueva encuentra sus escenas sin tener que etiquetar nada. Las etiquetas rellenas son escenas enlazadas (quien escribe puso ahí la entrada); las de contorno son menciones solo en el texto (alguien habla de ella). La línea de cada libro cuenta ambas, además de las escenas de POV.",
  "help.codex.places": "Los lugares se anidan: pon en el campo Dentro de de un lugar un mundo u otro lugar, y la lista Lugares los mostrará como un árbol (Mundo › Región › Ciudad). En un mundo o un lugar, «Nuevo lugar dentro…» crea uno ya colocado, con su mismo alcance.",
  "help.codex.links": "Los enlaces llevan a algún sitio: haz clic en un nombre de un campo de enlaces (Relaciones, Aliados…) para abrir esa entrada, o en la flecha junto a una elección única, como Propietario. Ctrl/Cmd + clic abre la nota en una pestaña nueva. «Archivos enlazados» muestra lo que la nota de la entrada enlaza fuera del códice (un lienzo de inspiración, un PDF, una nota de documentación), además de cualquier lienzo que contenga la ficha de la entrada. Añade un enlace como [[Moodboard.canvas]] al texto de la nota o a una propiedad; un enlace a un lienzo o a un PDF necesita su extensión.",
  "help.codex.portraits": "Una imagen que subas como retrato de una entrada se guarda donde Obsidian coloca los adjuntos nuevos (Configuración → Archivos y enlaces → Ubicación predeterminada para nuevos archivos adjuntos). Elige «En una subcarpeta de la carpeta actual» para guardar las imágenes de cada entrada en una carpeta junto a ella.",

  // --- Topic: revise/audit ---
  "help.audit.title": "Cómo funciona la auditoría de revisión",
  "help.audit.intro": "Listas de comprobación por niveles que llevan un borrador de caótico a terminado, de lo macro a lo micro:",
  "help.audit.tier.story": "Historia: 18 puntos de control para todo el manuscrito (se guardan en el proyecto).",
  "help.audit.tier.chapters": "Capítulos: 10 comprobaciones por capítulo: ¿se gana su sitio, engancha, hace avanzar la historia, termina invitando a seguir? (Se guardan en el proyecto; aparecen cuando tu libro tiene capítulos).",
  "help.audit.tier.scene": "Escena: una pasada de 14 puntos por escena (se guarda en el frontmatter de cada escena).",
  "help.audit.tier.prose": "Prosa: 32 comprobaciones línea a línea, agrupadas.",
  "help.audit.customize": "Cambia el nombre, reordena, oculta o añade comprobaciones en Personalizar → Listas de revisión.",
  "help.audit.opening": "La pasada por escena clasifica automáticamente cada apertura (Acción / Diálogo / Pensamiento / Reflexión); corrígela si se equivoca. Haz clic en una escena para desplegar y editar su lista allí mismo, o ve a ella en Escribir.",

  // --- Topic: revise/todos ---
  "help.todos.title": "Cómo funciona el registro de revisiones",
  "help.todos.intro": "Todo lo que queda por revisar, en una lista agrupada por escena: los marcadores entre corchetes que dejaste al redactar y las decisiones de revisión que fuiste registrando. Usa las etiquetas para filtrar por tipo de marcador o de decisión.",
  "help.todos.jump": "Haz clic en un marcador para ir directamente a ese punto en Escribir; parpadea para que lo resuelvas enseguida. Edita la prosa para quitarlo y la lista se actualizará en el siguiente análisis.",
  "help.todos.decisions": "Las decisiones son resoluciones a nivel de historia («a partir de ahora, el hermano está muerto»): registra una con «Registrar una decisión», asígnale un tipo y vincúlala a una escena o a todo el proyecto. Márcala como aplicada cuando hayas hecho el cambio; haz clic en su texto para editarla. Para preguntas de documentación y escenas que faltan, mejor un marcador [RESEARCH: ] o [SCENE: ]: marca el punto exacto de la prosa.",

  // --- Topic: search ---
  "help.search.title": "Cómo funciona la búsqueda",
  "help.search.scope": "Búsqueda de texto completo en la prosa de tus escenas y en sus sinopsis. Elige un alcance (este borrador, toda la historia, la serie o toda la bóveda) y acota con los filtros de metadatos (estado, POV, capítulo, trama, personaje).",
  "help.search.results": "Los resultados se agrupan por escena. Haz clic en un resultado para ir directamente a él en Escribir, donde parpadea para que lo encuentres enseguida. Un resultado en la sinopsis abre la escena sin parpadeo (la sinopsis no forma parte del cuerpo editable). Aplica solo un filtro, sin texto de búsqueda, para ver todas las escenas que coinciden: un buscador estructurado rápido.",
  "help.search.matching": "La coincidencia es literal (sin comodines ni expresiones regulares), con las opciones Distinguir mayúsculas y Palabra completa; las escenas archivadas solo se incluyen si marcas «Incluir archivados».",

  // --- Topic: publish/compile ---
  "help.compile.title": "Cómo funciona la compilación",
  "help.compile.formats": "Reúne las escenas del proyecto activo en un solo archivo de manuscrito. Elige un formato (Markdown, HTML, Word, o PDF/EPUB mediante Pandoc), indica el nombre de salida y compila.",
  "help.compile.docx": "Word (.docx) viene integrado y funciona en todos los dispositivos. Genera un manuscrito estándar: doble espacio, sangría, cada capítulo en una página nueva, una portada con tu nombre y el recuento de palabras, y un encabezado de página. Añade tu nombre y tus datos de contacto en Configuración → Inkswell → Manuscrito; fija un seudónimo y el apellido del encabezado para cada libro debajo del formato.",
  "help.compile.steps": "El proceso se ejecuta en pasos que puedes activar o desactivar: pasos por escena (quitar los marcadores de tarea, incluidos los tuyos, filtrar metadatos) y pasos del manuscrito (encabezados, saltos de página, limpiar líneas en blanco). Tus elecciones se recuerdan en cada proyecto.",

  // --- Topic: customize ---
  "help.customize.title": "Cómo funciona Personalizar",
  "help.customize.intro": "Personalizar cambia la FORMA de Inkswell: qué tipos de códice existen y qué campos muestra cada uno, con qué empieza una entrada o una escena nueva, las estructuras de beats, los estados de escena, las propuestas de escritura, las listas de revisión y de publicación, y qué funciones opcionales se muestran. Las preferencias (metas, comportamiento del editor, carpetas) siguen en Configuración.",
  "help.customize.tip.sections": "Elige una sección a la izquierda y edítala a la derecha. Los cambios se guardan sobre la marcha.",
  "help.customize.tip.templates": "Los campos del códice y el contenido inicial se guardan en notas de plantilla corrientes dentro de la carpeta Templates de tu carpeta base: editar aquí edita esas notas, y puedes seguir abriéndolas directamente.",
  "help.customize.tip.lossless": "Los elementos integrados nunca se eliminan: ocultar no pierde nada, los cambios de nombre conservan el id guardado y cada sección permite volver a los valores predeterminados de Inkswell.",
  "help.customize.tip.ownItems": "Tus propios elementos (un tipo personalizado, un punto de una lista, una propuesta) se guardan en el data.json del complemento y viajan con la carpeta de configuración de tu bóveda.",

  // --- Help index section: home ---
  "help.section.home.phase": "Inicio",
  "help.section.home.summary": "Tus libros en estantes, el árbol de escenas de un libro y una bandeja de ideas para historias.",
  "help.home.hub": "Tu centro de operaciones. Todos los proyectos muestra tus libros como tarjetas en estantes (un estante por serie, en orden de libro, y otro para los libros independientes), cada una con su portada (o una generada provisionalmente), número de libro, escenas y palabras, progreso hacia el objetivo y la última vez que lo editaste. Haz clic en una tarjeta para centrarte en ese libro; su menú ⋯ (al pasar el puntero en escritorio, siempre visible en pantallas táctiles) le cambia el nombre, fija su serie, cambia la portada o lo archiva.",
  "help.home.archive": "Archivar un libro terminado o aparcado solo lo quita de la vista: sale de los estantes y de la lista de proyectos y queda en la sección Archivados, al final de Inicio. Sus palabras siguen contando para tus metas, y se compila y conserva su códice como antes. Desarchívalo desde su menú ⋯. En una serie, un libro archivado sigue en el estante, atenuado; o activa «Ocultar los libros archivados de su serie» en la configuración para sacarlo del todo del estante de la serie.",
  "help.home.focused": "Un libro seleccionado muestra la tarjeta principal (portada, logline, tema, objetivo), una tira con las demás portadas de su serie (haz clic en una para cambiar) y su árbol de escenas; arrastra las filas de escena para reordenarlas, o usa el menú ⋯ para moverlas, cambiarles el nombre o eliminarlas. El inspector de la derecha edita los metadatos de la escena seleccionada.",
  "help.home.ideas": "Captura ideas para historias en la bandeja que hay debajo de los estantes sin salir de la página: pulsa Intro para guardar. Haz clic en una idea para editarla allí mismo; su menú ⋯ o de clic derecho la copia, la guarda como nota en la carpeta Ideas de tu carpeta base (y la quita de la bandeja), la fija arriba o la elimina. Haz clic en el encabezado Ideas para contraer la sección.",
  "help.home.seriesHeading": "Series",
  "help.home.seriesAdd": "Una serie es un conjunto de libros que comparten un nombre: no hay ninguna nota adicional, solo una etiqueta en cada libro. Añade un libro a una serie desde su menú ⋯ o de clic derecho (Serie…) o desde la línea de serie bajo el título en su tarjeta principal: elige una serie existente o empieza una nueva, y fija el número de libro (por defecto, el siguiente libre). Nuevo proyecto tiene los mismos campos, así que puedes crear un libro directamente dentro de una serie.",
  "help.home.seriesManage": "El menú ⋯ o de clic derecho del encabezado de la serie gestiona el conjunto: Nuevo libro en esta serie, Añadir un proyecto existente, Cambiar nombre de la serie (todos los libros y todas las entradas del códice con alcance de serie lo siguen) y Reordenar libros (arrastra y, al guardar, se renumeran 1, 2, 3…).",

  // --- Help index section: plan ---
  "help.section.plan.phase": "Planificar",
  "help.section.plan.summary": "Los campos del resumen, la hoja de beats y Estructura (árbol del esquema, tablero y cuadrícula de tramas).",
  "help.plan.overview": "Resumen reúne los campos de la novela (logline, tema, género) y la prosa larga (sinopsis, esbozo en tres actos). Beats es la hoja de beats. Estructura combina el árbol del esquema, el tablero Kanban y la cuadrícula de tramas tras un único selector Árbol | Tablero | Cuadrícula: tres vistas de las mismas escenas. Todo se detalla a continuación.",
  "help.plan.sortByChapter": "¿Estás migrando un manuscrito numerado cuyas escenas han quedado desordenadas? Estructura → Árbol tiene un botón «Ordenar por capítulo» (también en el menú ⋯ de un libro en Inicio y como comando «Ordenar escenas por número de capítulo»): reordena el manuscrito una vez según el número de la etiqueta de capítulo de cada escena (en cifras o en letra) y deja las escenas sin número al final, en su orden actual. Es una acción puntual, no un modo; después, el orden por arrastre sigue siendo cosa tuya.",

  // --- Help index section: write ---
  "help.section.write.phase": "Escribir",
  "help.section.write.summary": "El editor de manuscrito sin distracciones y los marcadores de tarea.",

  // --- Help index section: codex ---
  "help.section.codex.phase": "Códice",
  "help.section.codex.summary": "Tu biblia de la historia, con alcance global, de proyecto o de serie.",

  // --- Help index section: search ---
  "help.section.search.phase": "Buscar",
  "help.section.search.summary": "Búsqueda de texto completo en las escenas, con alcance y filtros.",

  // --- Help index section: track ---
  "help.section.track.phase": "Progreso",
  "help.section.track.summary": "Recuentos de palabras, rachas, ritmo, sprints y estructura.",
  "help.track.dashboard": "Un panel de tu escritura: recuentos diarios, semanales y mensuales, rachas, un mapa de calor de 26 semanas, el historial de sprints y un desglose de la estructura de escenas. La barra de estado inferior refleja el progreso de hoy y cualquier sprint en marcha; haz clic en ella para abrir Progreso.",
  "help.track.goals": "Solo la escritura en proyectos cuenta para las metas: por defecto, las escenas del manuscrito. En Configuración → Qué cuenta para las metas también puedes incluir notas de planificación, notas del códice u otras notas de proyecto; el resto de tu bóveda nunca cuenta.",
  "help.track.sprint": "Empieza un sprint cronometrado desde la barra lateral (o con el comando «Empezar un sprint de escritura») para escribir contra el reloj y con una meta de palabras.",
  "help.track.challenge": "Un reto de escritura («Configurar un reto de escritura», o el enlace de la tarjeta Metas) es un intervalo de fechas con un objetivo de palabras; por ejemplo, 50 000 palabras en noviembre. Cuenta cada palabra válida para las metas que escribas en ese intervalo, en cualquier proyecto, y muestra dónde deberías estar hoy, cuánto vas por delante o por detrás y qué necesitas escribir hoy. Haz clic en el total para copiarlo y pegarlo en la web de un evento. ¿Escribes en más de un dispositivo? Activa la sincronización del historial para que el recuento los incluya todos.",

  // --- Help index section: revise ---
  "help.section.revise.phase": "Revisar",
  "help.section.revise.summary": "Listas de auditoría, el registro de revisiones y el análisis de la prosa.",
  "help.revise.analysisHeading": "Análisis",
  "help.revise.analysis": "Índices de legibilidad, tus palabras más usadas y detección de frases repetidas (ecos) en todo el manuscrito; se ejecuta a petición para una pasada de estilo.",

  // --- Help index section: publish ---
  "help.section.publish.phase": "Publicar",
  "help.section.publish.summary": "Compilación, la lista de autopublicación y la planificación del lanzamiento.",
  "help.publish.checklistHeading": "Lista y lanzamiento",
  "help.publish.checklist": "Lista sigue unas 50 tareas de autopublicación y una hoja de metadatos por formato (ISBN, contracubierta, palabras clave). Lanzamiento planifica un calendario de preventa con fechas de hitos calculadas automáticamente y seguimientos de presupuesto, cubierta, marketing y lectores de ARC.",

  // --- Help index section: customize ---
  "help.section.customize.phase": "Personalizar",
  "help.section.customize.summary": "Adapta Inkswell a tu proceso: tipos, campos, plantillas, estructuras, listas, propuestas.",

  // --- Help index section: data ---
  "help.section.data.phase": "Tus datos y copias de seguridad",
  "help.section.data.summary": "Dónde se guarda todo y cómo recuperarlo.",
  "help.data.storage": "Todo lo que guarda Inkswell es texto sin formato. La prosa de las escenas son notas corrientes en la carpeta de escenas de tu proyecto. Los datos de planificación (beats, estructura del esquema, metas, el registro de revisiones, las listas de auditoría, la configuración de compilación y de publicación) se guardan en el frontmatter de tu NOTA ÍNDICE DEL PROYECTO: la nota que lleva el nombre de tu proyecto, junto a tus escenas. Las entradas del códice son notas corrientes con una clave codex. La configuración del complemento, el historial de escritura, los sprints y la bandeja de ideas se guardan en el data.json del complemento.",
  "help.data.history": "El historial de escritura cuenta las palabras que escribes en Obsidian: en sus editores y en el panel Escribir. Un archivo que cambia fuera de Obsidian, o que llega de otro dispositivo mediante la sincronización, solo restablece el punto de partida de ese archivo; esas palabras nunca se registran como escritas en este dispositivo.",
  "help.data.sync": "Para ver juntos los historiales de todos tus dispositivos, activa «Sincronizar el historial de escritura entre dispositivos» en la configuración. Cada dispositivo guardará entonces una pequeña nota de registro escrita automáticamente (con una clave inkswell-log en su frontmatter) en la carpeta «Writing log» de tu carpeta base, y Progreso las combinará. Cambia el nombre de un dispositivo con la propiedad device de esa nota; si un dispositivo ya no existe, elimina su nota.",
  "help.data.recoveryHeading": "Si algo sale mal",
  "help.data.fileRecovery": "La Recuperación de archivos de Obsidian (Configuración → Recuperación de archivos → Ver) guarda instantáneas periódicas de cada nota que cambia, incluidas las que escribe Inkswell. Su búsqueda encuentra NOMBRES DE ARCHIVO: para los datos de planificación, busca el nombre de tu proyecto y abre las instantáneas de la nota índice; para la prosa, busca el nombre de la escena.",
  "help.data.conflicts": "Siempre que Inkswell tiene que desplazar una versión de tu texto (al resolver un conflicto entre el editor y el disco, al salir de una escena antes de resolverlo o al sobrescribir un archivo durante la compilación porque lo pediste), antes guarda la versión desplazada en la carpeta «Inkswell conflicts». Nunca se descarta nada sin avisar.",
  "help.data.backups": "Inkswell también guarda una copia de seguridad diaria de data.json (los últimos 7 días) en una carpeta backups junto a él, dentro de la carpeta del propio complemento en el directorio de configuración de tu bóveda. Para recuperar solo tu configuración (tipos de códice personalizados, tipos renombrados, cambios de Personalizar, la barra lateral), ejecuta el comando «Restaurar la configuración desde una copia de seguridad» y elige un día; tu historial de escritura no cambia. Para restaurarlo todo: desactiva Inkswell, copia la copia de seguridad encima de data.json y vuelve a activarlo. Si data.json no se puede leer al iniciar Obsidian, Inkswell carga por sí mismo la copia más reciente y te avisa.",

  // --- Help panel ---
  "help.panel.title": "Cómo funciona Inkswell",
  "help.panel.intro": "Una referencia de cada parte del taller. El proceso va de Planificar → Escribir → Revisar → Publicar, con Códice y Progreso al lado. Despliega una sección para profundizar.",
  "help.panel.shape": "Adapta Inkswell a tu proceso en {link}: tipos y campos del códice, plantillas, estructuras, listas, propuestas y qué funciones se muestran (o haz clic derecho en una pestaña opcional para ocultarla). Ocultar no pierde nada: tus datos se conservan y al reactivarla se restaura.",
  "help.panel.shape.link": "Personalizar",
  "help.panel.reset": "Restablecer consejos y volver a ver la bienvenida",
  "help.panel.reset.done": "Consejos restablecidos.",

  // --- Contextual tip ---
  "help.hint.dismiss": "Descartar este consejo",

  // --- Welcome ---
  "welcome.title": "Te damos la bienvenida a Inkswell",
  "welcome.intro": "Un taller completo para novelistas: una sola pestaña, organizada según la fase en la que estés. Cambia de fase desde la barra de iconos de la izquierda:",
  "welcome.phase.plan.name": "Planificar",
  "welcome.phase.plan.blurb": "Resumen, hoja de beats y estructura de la historia.",
  "welcome.phase.write.name": "Escribir",
  "welcome.phase.write.blurb": "Editor sin distracciones con marcadores de tarea.",
  "welcome.phase.revise.name": "Revisar",
  "welcome.phase.revise.blurb": "Auditoría, registro de decisiones y repasos.",
  "welcome.phase.publish.name": "Publicar",
  "welcome.phase.publish.blurb": "Compila y lanza tu libro.",
  "welcome.phase.codex.name": "Códice",
  "welcome.phase.codex.blurb": "Tu biblia de la historia, presente en todo momento.",
  "welcome.phase.track.name": "Progreso",
  "welcome.phase.track.blurb": "Recuentos de palabras, rachas y sprints.",
  "welcome.tips": "¿Es la primera vez que abres un panel? Busca el consejo «Cómo funciona» en la parte superior y descártalo cuando lo tengas claro. La pestaña Ayuda de la barra lateral guarda la guía completa.",
  "welcome.start": "Empezar",
};
