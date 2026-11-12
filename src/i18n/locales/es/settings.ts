/** Spanish UI strings — the `settings` area (mirrors ../en/settings.ts). */
import type { Catalog } from "../types";

export const settings: Catalog = {
  // --- Settings tab ------------------------------------------------------------
  "settings.customize.name": "Personalizar Inkswell",
  "settings.customize.desc":
    "Tipos y campos del códice, plantillas iniciales, estructuras de beats, estados de escena, propuestas de escritura, listas de comprobación y qué funciones se muestran; todo se edita dentro de Inkswell.",
  "settings.customize.button": "Abrir Personalizar",
  "settings.defaultCompileFormat.name": "Formato de compilación predeterminado",
  "settings.defaultCompileFormat.desc": "Formato preseleccionado al abrir el diálogo de compilación.",
  "settings.showWordCounts.name": "Mostrar recuentos de palabras",
  "settings.showWordCounts.desc": "Muestra el recuento de palabras de cada escena y de cada proyecto en el explorador.",
  "settings.hideArchived.name": "Ocultar los libros archivados de su serie",
  "settings.hideArchived.desc":
    "Un libro archivado sale del estante de su serie y de las portadas de la serie en Inicio, y queda bajo el nombre de su serie en la sección Archivados; útil para relatos que archivas una vez publicados. Si está desactivado, los libros archivados siguen en el estante de la serie, atenuados.",
  "settings.syncHistory.name": "Sincronizar el historial de escritura entre dispositivos",
  "settings.syncHistory.desc":
    "Las palabras se cuentan en el dispositivo donde las escribes. Activa esta opción para guardar una pequeña nota de registro por dispositivo en la carpeta «Writing log» de tu carpeta base y combinarlas en Progreso, de modo que las rachas y los totales incluyan todos tus dispositivos. La sincronización de tu bóveda (Obsidian Sync, iCloud…) se encarga de llevar las notas.",
  "settings.sceneHeadingLevel.name": "Nivel de encabezado de escena",
  "settings.sceneHeadingLevel.desc": "Nivel de encabezado (1–6) para el paso opcional de compilación «anteponer título».",

  // --- Settings → Manuscript -------------------------------------------------
  "settings.manuscript.heading": "Manuscrito",
  "settings.authorName.name": "Tu nombre",
  "settings.authorName.desc":
    "Tu nombre legal, para la portada de los manuscritos de Word. La firma de un libro (seudónimo) puede ser distinta; configúrala en Publicar → Compilar.",
  "settings.authorContact.name": "Datos de contacto",
  "settings.authorContact.desc":
    "Dirección, correo electrónico, teléfono: uno por línea, debajo de tu nombre en la portada.",
  "settings.compileFormat.md": "Markdown",
  "settings.compileFormat.html": "HTML",
  "settings.compileFormat.docx": "Word (.docx)",
  "settings.compileFormat.pandoc": "Pandoc (docx/pdf/epub)",
  "settings.interfaceLanguage.name": "Idioma de la interfaz",
  "lib.rowMenu.openInTabHint": "Ctrl/Cmd + clic para abrir en una pestaña nueva",
  "settings.interfaceLanguage.desc":
    "Inkswell usa el idioma de Obsidian cuando existe una traducción revisada. Elige aquí otro para cambiarlo, incluidas las traducciones en borrador. El texto escrito en tus notas no cambia.",
  "settings.interfaceLanguage.auto": "El mismo que Obsidian",
  "settings.interfaceLanguage.draft": "{name} (borrador; ayuda a revisarlo)",
  "settings.interfaceLanguage.applied": "Idioma cambiado. Los nombres de los comandos, esta pestaña de configuración y la barra de pestañas del teléfono cambian al reiniciar Obsidian.",
  "settings.companionSceneTarget.name": "Abrir escenas de la barra lateral en",
  "settings.companionSceneTarget.desc":
    "Dónde se abre una escena al hacer clic en ella en un acompañante de la barra lateral. Ctrl/Cmd + clic siempre abre una pestaña nueva.",
  "settings.companionSceneTarget.write": "Escribir de Inkswell",
  "settings.companionSceneTarget.tab": "Una pestaña normal",

  // --- Settings → Write editor -----------------------------------------------
  "settings.writeEditor.heading": "Editor de Escribir",
  "settings.typewriterMode.name": "Modo máquina de escribir",
  "settings.typewriterMode.desc":
    "Mantiene la línea en la que escribes centrada verticalmente en el editor de Escribir, para que tu mirada no se mueva. Los clics del ratón no vuelven a centrar. También está disponible como el comando «Alternar modo máquina de escribir (editor de Escribir)».",
  "settings.manuscriptTypography.name": "Tipografía de manuscrito",
  "settings.manuscriptTypography.desc":
    "Maquetación de libro en el editor de Escribir: los párrafos llevan sangría de primera línea (salvo el primero tras un encabezado o un salto de escena) y los encabezados van centrados. Es solo visual: tu texto no cambia. La fuente sigue la opción Apariencia → Fuente del texto de Obsidian.",
  "settings.smartDashes.name": "Rayas inteligentes",
  "settings.smartDashes.desc":
    "En el editor de Escribir, al teclear -- se obtiene una semirraya (–) y un tercer - la convierte en raya (—). Una línea de guiones (---) se deja tal cual. Solo afecta al editor de Escribir de Inkswell, no a las notas de Obsidian.",
  "settings.smartQuotes.name": "Comillas tipográficas",
  "settings.smartQuotes.desc":
    "Las comillas rectas que escribes en el editor de Escribir se convierten en comillas curvas (“ ” y ‘ ’); los apóstrofos pasan a ser ’. No se aplica dentro de código ni de enlaces.",
  "settings.smartEllipsis.name": "Puntos suspensivos inteligentes",
  "settings.smartEllipsis.desc": "Tres puntos escritos en el editor de Escribir se convierten en puntos suspensivos (…).",
  "settings.milestoneWords.name": "Marcas de hito cada…",
  "settings.milestoneWords.desc":
    "Pone una pequeña marca en el margen del editor de Escribir, en la línea donde el recuento acumulado de la escena supera cada múltiplo de este número (p. ej., 500 → marcas en 500, 1k, 1.5k…). 0 = desactivado; mínimo 100.",

  // --- Settings → Goals & sprints --------------------------------------------
  "settings.goals.heading": "Metas y sprints",
  "settings.weekStart.name": "La semana empieza el",
  "settings.weekStart.desc": "Primer día de la semana para las metas semanales, el seguimiento del hábito y el mapa de calor.",
  "settings.weekStart.monday": "Lunes",
  "settings.weekStart.sunday": "Domingo",
  "settings.dailyWordGoal.name": "Meta diaria de palabras",
  "settings.dailyWordGoal.desc": "Palabras objetivo al día; se muestran en la barra de estado y en las estadísticas.",
  "settings.weeklyWordGoal.name": "Meta semanal de palabras",
  "settings.weeklyWordGoal.desc": "Palabras objetivo a la semana (del inicio de la semana a hoy).",
  "settings.monthlyWordGoal.name": "Meta mensual de palabras",
  "settings.monthlyWordGoal.desc": "Palabras objetivo al mes (del día 1 a hoy).",
  "settings.habitDaysPerWeek.name": "Hábito: días por semana",
  "settings.habitDaysPerWeek.desc": "Cuántos días a la semana quieres escribir.",
  "settings.habitMinWords.name": "Hábito: mínimo de palabras al día",
  "settings.habitMinWords.desc": "Palabras mínimas para que un día cuente para el hábito.",
  "settings.defaultSprintMinutes.name": "Duración predeterminada del sprint",
  "settings.defaultSprintMinutes.desc": "Duración predeterminada del sprint, en minutos.",
  "settings.defaultSprintWordGoal.name": "Meta de palabras predeterminada del sprint",
  "settings.defaultSprintWordGoal.desc": "Meta de palabras que aparece rellenada en el diálogo del sprint. 0 = sin meta.",
  "settings.streakThreshold.name": "Umbral de racha",
  "settings.streakThreshold.desc": "Palabras mínimas en un día para que prolongue tu racha de escritura.",

  // --- Settings → What counts toward goals -----------------------------------
  "settings.counts.heading": "Qué cuenta para las metas",
  "settings.counts.intro":
    "Las metas, las rachas y los sprints solo cuentan lo que escribes en notas de proyecto; las notas del resto de la bóveda nunca cuentan. Elige qué tipos cuentan. Cambiar una opción también vuelve a contar las palabras escritas desde que existe esta opción; el historial anterior siempre cuenta.",
  "settings.counts.scene.name": "Escenas del manuscrito",
  "settings.counts.scene.desc": "Archivos de escena y proyectos de una sola nota: el manuscrito en sí.",
  "settings.counts.planning.name": "Notas de planificación",
  "settings.counts.planning.desc": "La nota de planificación de cada proyecto (sinopsis, bases de la trama, esbozo de actos).",
  "settings.counts.codex.name": "Notas del códice",
  "settings.counts.codex.desc": "Notas con una clave codex (personajes, lugares, trasfondo), estén donde estén.",
  "settings.counts.other.name": "Otras notas del proyecto",
  "settings.counts.other.desc": "La nota índice del proyecto y cualquier otra nota dentro de la carpeta del proyecto.",

  // --- Settings → Folders ----------------------------------------------------
  "settings.folders.heading": "Carpetas",
  "settings.baseFolder.name": "Carpeta base",
  "settings.baseFolder.desc":
    "Carpeta donde se crean los proyectos nuevos y la estructura compartida del códice. En blanco = raíz de la bóveda. Solo indica dónde se crea el contenido nuevo; los proyectos y el códice que ya existan en cualquier lugar de la bóveda siguen funcionando.",
  "settings.baseFolder.placeholder": "(raíz de la bóveda)",
  "settings.codexFolder.name": "Nombre de la carpeta del códice",
  "settings.codexFolder.desc": "Nombre de la subcarpeta para las notas del códice (compartidas y por proyecto).",
  "settings.coLocateCodex.name": "Guardar el códice junto a cada proyecto",
  "settings.coLocateCodex.desc":
    "Las entradas de un libro se crean en la carpeta de códice de su propio proyecto; las de serie y las globales van al códice base compartido. Es solo organización: la visibilidad de cada entrada la decide su campo Alcance, no el lugar donde está la nota.",

  // --- Settings → Layout -----------------------------------------------------
  "settings.layout.heading": "Diseño",
  "settings.forceTablet.name": "Usar el diseño completo en este dispositivo",
  "settings.forceTablet.desc":
    "Obsidian considera que esta pantalla es de teléfono, así que Inkswell muestra su diseño para teléfono y deja Planificar y Publicar tras un aviso de «necesita una pantalla más grande». Actívalo si usas una tableta.",

  // --- Settings → Help -------------------------------------------------------
  "settings.help.heading": "Ayuda",
  "settings.showHints.name": "Mostrar consejos contextuales",
  "settings.showHints.desc":
    "Muestra los recuadros descartables «Cómo funciona» en la parte superior de los paneles. Los consejos que descartes siguen ocultos hasta que los restablezcas abajo.",
  "settings.resetTips.name": "Restablecer consejos y volver a ver la bienvenida",
  "settings.resetTips.desc": "Vuelve a activar todos los consejos descartados y muestra otra vez la pantalla de bienvenida.",
  "settings.resetTips.done": "Consejos restablecidos.",

  // --- Restore settings modal ------------------------------------------------
  "settings.restore.placeholder": "Restaurar la configuración desde la copia de seguridad del…",

  // --- Optional features (src/features.ts) -------------------------------------
  "feature.group.planning": "Planificación",
  "feature.group.revision": "Revisión",
  "feature.group.publishing": "Publicación",
  "feature.group.writing": "Escritura",
  "feature.beats.label": "Beats",
  "feature.beats.desc": "El planificador de la hoja de beats (Planificar → Beats) y su andamiaje de escenas.",
  "feature.board.label": "Tablero",
  "feature.board.desc": "La vista de tablero Kanban de tus escenas (Planificar → Estructura → Tablero).",
  "feature.plotGrid.label": "Cuadrícula de tramas",
  "feature.plotGrid.desc":
    "La matriz de tramas × capítulos (Planificar → Estructura → Cuadrícula) y el campo Tramas de la escena.",
  "feature.audit.label": "Auditoría de revisión",
  "feature.audit.desc": "Las listas de comprobación de la auditoría de revisión y el seguimiento de arcos de personaje (Revisar → Auditoría).",
  "feature.analysis.label": "Análisis",
  "feature.analysis.desc": "Análisis de legibilidad, frecuencia de palabras y ecos (Revisar → Análisis).",
  "feature.checklist.label": "Lista de publicación",
  "feature.checklist.desc": "La lista de tareas de autopublicación (Publicar → Lista).",
  "feature.launch.label": "Planificador de lanzamiento",
  "feature.launch.desc": "El calendario de preventa y los seguimientos de lanzamiento (Publicar → Lanzamiento).",
  "feature.prompts.label": "Propuestas de escritura",
  "feature.prompts.desc": "El botón de propuestas de escritura e ideas de la barra de herramientas de Escribir.",
  "feature.stream.label": "Flujo de escenas",
  "feature.stream.desc":
    "La vista Flujo de Escribir: lee y edita las escenas de un libro como una sola página continua. No se muestra en teléfonos.",
  "feature.tracking.label": "Seguimiento",
  "feature.tracking.desc":
    "Metas de palabras, sprints de escritura, el contador de la barra de estado y el panel de Progreso. Las palabras se siguen registrando mientras está oculto, así que al reactivarlo verás todo el historial.",

  // --- Shared helpers (src/lib) ------------------------------------------------
  "lib.hideMenu.item": "Ocultar {label}",
  "lib.hideMenu.hidden": "Se ocultó {label}.",
  "lib.hideMenu.notice": "{hidden} {undo}, o vuelve a activarlo en Personalizar → Funciones.",
  "lib.hideMenu.undo": "Deshacer",
  "lib.listEditor.moveUp": "Subir",
  "lib.listEditor.moveDown": "Bajar",
  "lib.phoneRedirect.title": "{surface} necesita una pantalla más grande",
  "lib.phoneRedirect.body":
    "Abre este proyecto en una tableta o un ordenador para ver esta vista. La redacción y tu lista de escenas funcionan aquí, en el teléfono.",
  "lib.phoneRedirect.useFullLayout": "¿No es un teléfono? Usa el diseño completo",
  "lib.rowMenu.more": "Más acciones",
  "lib.images.pickPlaceholder": "Elige una imagen de la bóveda…",
  "lib.relativeTime.justNow": "ahora mismo",
  "lib.relativeTime.minutes.one": "hace {count} min",
  "lib.relativeTime.minutes.other": "hace {count} min",
  "lib.relativeTime.hours.one": "hace {count} h",
  "lib.relativeTime.hours.other": "hace {count} h",
  "lib.relativeTime.days.one": "hace {count} d",
  "lib.relativeTime.days.other": "hace {count} d",
  "lib.relativeTime.weeks.one": "hace {count} sem.",
  "lib.relativeTime.weeks.other": "hace {count} sem.",
  "lib.relativeTime.months.one": "hace {count} mes",
  "lib.relativeTime.months.other": "hace {count} meses",
  "lib.relativeTime.years.one": "hace {count} año",
  "lib.relativeTime.years.other": "hace {count} años",
  "lib.settingsSummary.none": "sin configuración",
  "lib.settingsSummary.customTypes.one": "{count} tipo de códice personalizado",
  "lib.settingsSummary.customTypes.other": "{count} tipos de códice personalizados",
  "lib.settingsSummary.renamedTypes.one": "{count} tipo renombrado",
  "lib.settingsSummary.renamedTypes.other": "{count} tipos renombrados",
  "lib.settingsSummary.beatTemplates.one": "{count} plantilla de beats",
  "lib.settingsSummary.beatTemplates.other": "{count} plantillas de beats",
  "lib.settingsSummary.lists.one": "{count} lista personalizada",
  "lib.settingsSummary.lists.other": "{count} listas personalizadas",
  "lib.settingsSummary.rail": "barra lateral reorganizada",
  "lib.settingsSummary.challenge": "reto de escritura",
  "lib.settingsSummary.defaults": "configuración predeterminada",

  // --- Customize → catalog -----------------------------------------------------
  "customize.group.codex": "Códice",
  "customize.group.plan": "Planificar",
  "customize.group.write": "Escribir",
  "customize.group.revise": "Revisar",
  "customize.group.publish": "Publicar",
  "customize.group.inkswell": "Inkswell",
  "customize.entry.codexTypes": "Tipos y campos del códice",
  "customize.entry.beatTemplates": "Plantillas de beats",
  "customize.entry.sceneTemplate": "Plantilla de escena",
  "customize.entry.sceneStatuses": "Estados de escena",
  "customize.entry.sceneFields": "Campos del inspector de escena",
  "customize.entry.writingPrompts": "Propuestas de escritura",
  "customize.entry.todoMarkers": "Marcadores de tarea",
  "customize.entry.revisionChecklists": "Listas de revisión",
  "customize.entry.publishingChecklist": "Lista de publicación",
  "customize.entry.features": "Funciones",

  // --- Customize → panel -------------------------------------------------------
  "customize.badge.hidden": "oculto",
  "customize.badge.yours": "tuyo",
  "customize.hiddenFeature": "Esta función está oculta. {link}.",
  "customize.hiddenFeature.link": "Actívala en Funciones",

  // --- Customize → catalog-row summaries (joined with " · ") ------------------
  "customize.summary.builtIn.one": "{count} incluido",
  "customize.summary.builtIn.other": "{count} incluidos",
  "customize.summary.yours.one": "{count} tuyo",
  "customize.summary.yours.other": "{count} tuyos",
  "customize.summary.hidden.one": "{count} oculto",
  "customize.summary.hidden.other": "{count} ocultos",
  "customize.summary.renamed.one": "{count} renombrado",
  "customize.summary.renamed.other": "{count} renombrados",
  "customize.summary.custom.one": "{count} personalizado",
  "customize.summary.custom.other": "{count} personalizados",
  "customize.summary.reordered": "reordenado",
  "customize.summary.customized": "Personalizado",

  // --- Customize → list editor (override-editor.ts) ----------------------------
  "list.addGroup": "Añadir grupo…",
  "list.newGroup": "Grupo nuevo",
  "list.groupName": "Nombre del grupo",
  "list.showGroup": "Mostrar grupo",
  "list.hideGroup": "Ocultar grupo",
  "list.removeGroup": "Quitar grupo",
  "list.wasLabel": "antes «{label}»",
  "list.show": "Mostrar",
  "list.hide": "Ocultar",
  "list.restoreName": "Restaurar el nombre original",
  "list.removed": "Se quitó «{label}». Lo que ya marcaste en ese elemento se queda en tus notas.",
  "list.resetDefaults": "Restablecer los valores predeterminados de Inkswell",
  "list.meta.auditScene": "Puntos de control de escena",
  "list.meta.auditStory": "Puntos de control de la historia",
  "list.meta.auditChapter": "Puntos de control de capítulo",
  "list.meta.auditPage": "Puntos de control de prosa",
  "list.task.empty": "Aún no hay tareas aquí.",
  "list.task.add": "Añadir tarea…",
  "list.task.new": "Tarea nueva",
  "list.task.aria": "etiqueta de la tarea",
  "list.checkpoint.empty": "Aún no hay puntos de control aquí.",
  "list.checkpoint.add": "Añadir punto de control…",
  "list.checkpoint.new": "Punto de control nuevo",
  "list.checkpoint.aria": "etiqueta del punto de control",
  "list.field.empty": "Aún no hay campos aquí.",
  "list.field.add": "Añadir campo…",
  "list.field.new": "Campo nuevo",
  "list.field.aria": "etiqueta del campo",
  "list.status.empty": "Aún no hay estados aquí.",
  "list.status.add": "Añadir estado…",
  "list.status.new": "Estado nuevo",
  "list.status.aria": "etiqueta del estado",
  "list.marker.empty": "Aún no hay marcadores aquí.",
  "list.marker.add": "Añadir marcador…",
  "list.marker.new": "Marcador nuevo",
  "list.marker.aria": "etiqueta del marcador",
  "list.prompt.empty": "Aún no hay propuestas aquí.",
  "list.prompt.add": "Añadir propuesta…",
  "list.prompt.new": "Propuesta nueva",
  "list.prompt.aria": "etiqueta de la propuesta",

  // --- Customize → fields editor (field-spec*.ts) ------------------------------
  "customize.fieldKind.text": "Texto",
  "customize.fieldKind.textarea": "Texto largo",
  "customize.fieldKind.number": "Número",
  "customize.fieldKind.date": "Fecha",
  "customize.fieldKind.list": "Lista",
  "customize.fieldKind.image": "Imagen",
  "customize.fieldKind.links": "Enlaces",
  "customize.fieldKind.link": "Enlace único",
  "customize.fields.startWithLetter": "La etiqueta debe empezar por una letra.",
  "customize.fields.enterLabel": "Escribe una etiqueta.",
  "customize.fields.reserved": "Inkswell gestiona «{key}».",
  "customize.fields.duplicate": "«{key}» ya es un campo.",
  "customize.fields.badKey": "Usa letras y números (sin espacios ni símbolos).",
  "customize.fields.createTemplateFailed": "No se pudo crear la nota de plantilla.",
  "customize.fields.saveFailed": "No se pudieron guardar los campos.",
  "customize.fields.resetFailed": "No se pudieron restablecer los campos.",
  "customize.fields.labelPlaceholder": "Etiqueta",
  "customize.fields.labelAria": "Etiqueta de {key}",
  "customize.fields.kindAria": "Tipo de {key}",
  "customize.fields.anyType": "Cualquier tipo",
  "customize.fields.typeEither": "{first} o {second}",
  "customize.fields.restrictAria": "Limitar {key} a un tipo",
  "customize.fields.perLinkLabels": "Etiquetas por enlace",
  "customize.fields.add": "Añadir campo…",
  "customize.addField.title": "Añadir campo",
  "customize.addField.label": "Etiqueta",
  "customize.addField.labelPlaceholder": "p. ej., Fecha de nacimiento",
  "customize.addField.kind": "Clase",
  "customize.addField.builtin.name": "O añade uno de los campos integrados de Inkswell",
  "customize.addField.builtin.desc":
    "Conserva su etiqueta y su selector; un bestiario puede tomar prestado Relaciones, por ejemplo.",
  "customize.addField.storedAs": "Se guarda como {key}",

  // --- Customize → template body editor ----------------------------------------
  "customize.templateBody.create": "Crear nota de plantilla",
  "customize.templateBody.loading": "Cargando…",
  "customize.templateBody.saveFailed": "No se pudo guardar la plantilla.",
  "customize.templateBody.open": "Abrir nota de plantilla",
  "customize.templateBody.openAria": "Abrir {path} en una pestaña (para editar el frontmatter)",

  // --- Customize → Codex types -------------------------------------------------
  "customize.codex.intro":
    "Cada tipo de códice tiene una presentación (nombre, plural, icono), los campos que sus entradas muestran en el panel del códice y el contenido inicial con el que empieza una entrada nueva. Los campos y el contenido inicial se guardan en una nota de plantilla corriente: editar aquí edita esa nota.",
  "customize.codex.rowDescRenamed": "{plural} · codex: {id} · renombrado desde {shipped}",
  "customize.codex.rowDesc": "{plural} · codex: {id}",
  "customize.codex.rowDescCustom": "{plural} · codex: {id} · personalizado",
  "customize.codex.entries.one": "{count} entrada",
  "customize.codex.entries.other": "{count} entradas",
  "customize.codex.fieldsFrom": "Campos: {name}",
  "customize.codex.fieldsShipped": "Campos: originales",
  "customize.codex.editDisplay": "Editar presentación…",
  "customize.codex.deleteType": "Eliminar tipo…",
  "customize.codex.newType": "Tipo nuevo…",
  "customize.codex.generate": "Generar todas las plantillas iniciales",
  "customize.codex.generateAria":
    "Crear una nota de plantilla para cada tipo que no la tenga (además de Scene.md y un README)",
  "customize.codex.vaultRoot": "(raíz de la bóveda)",
  "customize.codex.generateFailed": "No se pudieron generar las plantillas iniciales.",
  "customize.codex.generated.one": "Se creó {count} plantilla en «{folder}».",
  "customize.codex.generated.other": "Se crearon {count} plantillas en «{folder}».",
  "customize.codex.generatedNone": "Las plantillas ya existen; no hay nada que crear.",
  "customize.codex.back": "‹ Tipos del códice",
  "customize.codex.gone": "Ese tipo ya no existe.",
  "customize.codex.idLine": "codex: {id}",
  "customize.codex.card.display": "Presentación",
  "customize.codex.card.fields": "Campos",
  "customize.codex.card.starter": "Contenido inicial",
  "customize.codex.starterHint":
    "Así empieza una entrada nueva. {{title}} se sustituye por el nombre de la entrada. Inkswell añade por sí mismo codex: y el alcance de proyecto o serie; no añadas una clave codex:.",
  "customize.codex.starterNone": "Aún no hay nota de plantilla: las entradas nuevas de {plural} empiezan solo con un encabezado.",
  "customize.codex.display.name": "Nombre",
  "customize.codex.display.plural": "Plural",
  "customize.codex.display.icon": "Icono",
  "customize.codex.display.shipped": "Original: {label} / {plural} / {icon}. Las entradas conservan codex: {id}.",
  "customize.codex.display.edit": "Editar…",
  "customize.codex.display.reset": "Restablecer valor predeterminado",
  "customize.codex.fieldsSource": "Campos de {link}. Alias siempre va primero.",
  "customize.codex.fieldsSourceShipped":
    "Se usan los campos originales de Inkswell. Tu primer cambio crea una nota de plantilla para este tipo y guarda los campos en ella. Alias siempre va primero.",
  "customize.codex.fieldsEmpty": "Aún no hay campos; añade uno abajo.",
  "customize.codex.fieldsReset": "Restablecer los campos originales",
  "customize.codex.fieldsResetConfirm":
    "¿Usar los campos originales de Inkswell para {type}? Esto quita la propiedad codex-fields de {template}; las entradas existentes conservan su frontmatter.",
  "customize.codex.fieldsResetConfirmNoTemplate":
    "¿Usar los campos originales de Inkswell para {type}? Esto quita la propiedad codex-fields de la plantilla; las entradas existentes conservan su frontmatter.",
  "customize.codex.fieldsLabelDesc": "Lo que muestra el panel del códice. La clave guardada se deriva de ella.",
  "customize.codex.builtinField.generic": "{label} (tipos personalizados)",
  "customize.codex.builtinField.type": "{label} ({type})",

  // --- Customize → Beat templates ----------------------------------------------
  "customize.beats.intro":
    "Estructuras de beats para Planificar → Beats. Las integradas no se pueden cambiar, pero al duplicar una obtienes una copia editable. Tus plantillas aparecen en el selector en el orden de abajo.",
  "customize.beats.builtIn": "Integradas",
  "customize.beats.rowDesc.one": "{count} beat · plantilla: {id}",
  "customize.beats.rowDesc.other": "{count} beats · plantilla: {id}",
  "customize.beats.duplicateAsCustom": "Duplicar como personalizada",
  "customize.beats.yours": "Tuyas",
  "customize.beats.empty": "Aún no tienes plantillas propias: duplica una integrada o empieza una nueva.",
  "customize.beats.editBeats": "Editar beats",
  "customize.beats.duplicate": "Duplicar",
  "customize.beats.newTemplate": "Plantilla nueva…",
  "customize.beats.created": "Se creó «{name}».",
  "customize.beats.back": "‹ Plantillas de beats",
  "customize.beats.gone": "Esa plantilla ya no existe.",
  "customize.beats.idLine": "plantilla: {id}",
  "customize.beats.rename": "Cambiar nombre…",
  "customize.beats.pageIntro":
    "Beats en el orden del libro. «En %» indica dónde cae el beat en el manuscrito. El nombre de un beat es su clave: si lo cambias, sus notas guardadas empiezan de cero (recupera el nombre anterior para recuperarlas); reordenar y reescribir el propósito siempre es seguro.",
  "customize.beats.noBeats": "Aún no hay beats.",
  "customize.beats.namePlaceholder": "Nombre del beat",
  "customize.beats.nameAria": "Nombre del beat",
  "customize.beats.atAria": "Posición en el libro, en porcentaje",
  "customize.beats.purposePlaceholder": "Propósito (opcional)",
  "customize.beats.purposeAria": "Propósito del beat",
  "customize.beats.needOne": "Una plantilla necesita al menos un beat.",
  "customize.beats.addBeat": "Añadir beat…",
  "customize.beats.editAsText": "Editar como texto…",
  "customize.beats.textHelp":
    "Un beat por línea: «Nombre», «Nombre | propósito» o «25% | Nombre | propósito». Aplicar sustituye la lista de arriba.",
  "customize.beats.apply": "Aplicar",
  "customize.beats.addModal.title": "Añadir beat",
  "customize.beats.addModal.name": "Nombre",
  "customize.beats.addModal.nameDesc": "También es la clave del beat (convertida en slug).",
  "customize.beats.addModal.namePlaceholder": "p. ej., Punto medio",
  "customize.beats.addModal.purpose": "Propósito",
  "customize.beats.addModal.purposePlaceholder": "Una línea opcional",
  "customize.beats.nameRequired": "El nombre es obligatorio.",
  "customize.beats.nameNeedsChars": "El nombre debe contener letras o números.",
  "customize.beats.renameModal.title": "Cambiar nombre de la plantilla",
  "customize.beats.renameModal.name": "Nombre",
  "customize.beats.renameModal.nameDesc":
    "Solo el nombre visible: el id de la plantilla (y cada proyecto que la usa) no cambia.",

  // --- Customize → Scene template ----------------------------------------------
  "customize.sceneTemplate.using": "Usando Templates/Scene.md",
  "customize.sceneTemplate.default": "Predeterminada (escena vacía)",
  "customize.sceneTemplate.intro":
    "Cada escena que crea Inkswell parte de esta nota: se copian su frontmatter y su cuerpo, y {{title}} se sustituye por el nombre de la escena. Sin ella, las escenas nuevas empiezan vacías.",
  "customize.sceneTemplate.projectOwn":
    "El proyecto activo usa su propia plantilla: {template} (la clave sceneTemplate de su nota índice).",
  "customize.sceneTemplate.card": "Contenido inicial",
  "customize.sceneTemplate.hint":
    "{{title}} se sustituye por el nombre de la escena. Una clave status: aquí fija el estado predeterminado (si no, las escenas nuevas reciben status: idea); una sinopsis que Inkswell rellene por sí mismo siempre tiene prioridad.",
  "customize.sceneTemplate.none": "Aún no hay nota de plantilla ({path}): las escenas nuevas empiezan vacías.",

  // --- Customize → Scene statuses ----------------------------------------------
  "customize.statuses.defaults": "Idea → Final (predeterminados)",
  "customize.statuses.intro":
    "Cambia el nombre de un estado para que encaje con tu proceso («Borrador 1», «Pulido», «Cerrado»), oculta los que no uses y fija el orden en que los muestran el tablero y los selectores. Las escenas conservan el valor guardado en cualquier caso, así que puedes cambiarlo a mitad de libro; una escena con un estado oculto lo sigue mostrando, marcado como oculto. En esta versión no se pueden añadir estados nuevos.",

  // --- Customize → Scene inspector fields --------------------------------------
  "customize.sceneFields.own.one": "{count} propio",
  "customize.sceneFields.own.other": "{count} propios",
  "customize.sceneFields.defaults": "Todos los campos (predeterminado)",
  "customize.sceneFields.card.layout": "Disposición",
  "customize.sceneFields.layoutIntro":
    "Elige qué campos muestra el inspector de escena y en qué orden. Oculta los que no uses, o sube Notas si redactas siguiendo un esquema. «Tus campos» es el bloque de campos que añades abajo. Ocultar un campo solo lo oculta aquí: las escenas conservan lo que ya tengan guardado y, al mostrarlo de nuevo, vuelve tal cual.",
  "customize.sceneFields.card.own": "Tus campos",
  "customize.sceneFields.ownIntro":
    "Añade campos para tu propio proceso (los cinco mandamientos de Story Grid, el objetivo y el desastre de una escena) y aparecerán en el inspector de todas las escenas. Cada uno se guarda como una propiedad corriente de la escena; quitar un campo aquí nunca borra lo que escribiste.",
  "customize.sceneFields.storedIn": "Guardados en {link} (compartido por todos los proyectos).",
  "customize.sceneFields.firstCreates":
    "Tu primer campo crea la nota de plantilla de escena y los guarda allí.",
  "customize.sceneFields.empty": "Aún no tienes campos propios.",
  "customize.sceneFields.reset": "Quitar todos tus campos",
  "customize.sceneFields.resetConfirm":
    "¿Quitar todos tus campos propios? Esto elimina la propiedad {key} de {template}; las escenas conservan los valores que ya tengan guardados.",
  "customize.sceneFields.resetConfirmNoTemplate":
    "¿Quitar todos tus campos propios? Esto elimina la propiedad {key} de la plantilla de escena; las escenas conservan los valores que ya tengan guardados.",
  "customize.sceneFields.labelDesc":
    "Lo que muestra el inspector de escena. El nombre de la propiedad guardada se deriva de ella.",

  // --- Customize → Writing prompts ---------------------------------------------
  "customize.prompts.intro":
    "Las propuestas que hay detrás del botón Propuesta de la barra de Escribir. Oculta las que no quieras volver a ver, reescribe cualquiera o añade las tuyas; escribe {pov} donde deba ir el nombre del personaje del punto de vista de la escena. Cada propuesta tiene una fase (redacción o revisión) y una categoría por la que filtra el botón; puedes cambiar ambas en cualquier propuesta, incluidas las integradas.",
  "customize.prompts.phase.draft": "Redacción",
  "customize.prompts.phase.revise": "Revisión",
  "customize.prompts.phaseAria": "Fase",
  "customize.prompts.categoryAria": "Categoría",

  // --- Customize → To-do markers -----------------------------------------------
  "customize.markers.intro":
    "Marcadores que dejas en tu prosa para volver a ellos más tarde ([TODO: …], [RESEARCH: …] y los demás) y que luego encuentras en Revisar → Registro de revisiones. Al compilar se eliminan todos. Para usar otra palabra, añade tu propio marcador (y oculta el integrado si quieres). Ocultar un marcador solo lo quita del menú Insertar: los marcadores que ya estén en tus escenas se siguen encontrando y se siguen eliminando al compilar.",
  "customize.markers.wordPrompt": "Palabra que escribirás en tus escenas (p. ej., CHECK)",
  "customize.markers.invalidWord":
    "La palabra de un marcador empieza por una letra y tiene de 2 a 20 letras, dígitos o guiones.",
  "customize.markers.taken": "[{keyword}] ya es un marcador.",
  "customize.markers.inactive": "palabra ya en uso: inactivo",
  "customize.markers.removeConfirm":
    "¿Quitar «{label}»? Los marcadores que ya estén en tus escenas como [{keyword}: …] no aparecerán en el registro de revisiones ni se eliminarán al compilar. Para que sigan funcionando, oculta el marcador en su lugar.",
  "customize.markers.removed":
    "Se quitó «{label}». Los marcadores [{keyword}: …] se quedan en tus escenas como texto normal.",

  // --- Customize → Publishing checklist ----------------------------------------
  "customize.publishing.defaults": "{phases} · {tasks} (predeterminado)",
  "customize.publishing.phases.one": "{count} fase",
  "customize.publishing.phases.other": "{count} fases",
  "customize.publishing.tasks.one": "{count} tarea",
  "customize.publishing.tasks.other": "{count} tareas",
  "customize.publishing.intro":
    "Publicar → Lista, fase por fase. Oculta las fases o tareas que no se apliquen a tu camino, cambia el nombre de cualquiera, reordénalas y añade las tuyas. Las marcas se guardan por proyecto con el id de la tarea, así que no pierdes nada de lo ya marcado al ocultar o cambiar nombres.",
  "customize.publishing.optional": "Opcional",

  // --- Customize → Features ----------------------------------------------------
  "customize.features.allShown": "Todo visible",
  "customize.features.hidden": "{count} de {total} ocultas",
  "customize.features.intro":
    "Oculta las partes que no uses para que Inkswell sea más ligero. Ocultar solo oculta: tus notas y datos se conservan, y al volver a activar una función se restaura todo. También puedes hacer clic derecho en una pestaña opcional en cualquier parte de la aplicación para ocultarla.",
};
