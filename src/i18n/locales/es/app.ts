/** Spanish UI strings — the `app` area (mirrors ../en/app.ts). */
import type { Catalog } from "../types";

export const app: Catalog = {
  // --- Plugin load -----------------------------------------------------------
  "app.hoverSource": "Editor de Escribir de Inkswell",
  "app.ribbon": "Proyectos de Inkswell",
  "app.recovered":
    "Inkswell no pudo leer su archivo de datos, así que cargó tu configuración y tu historial de escritura desde la copia de seguridad del {date}. Puede que falten los cambios posteriores a ese día.",
  "app.recoveredKept":
    "Inkswell no pudo leer su archivo de datos, así que cargó tu configuración y tu historial de escritura desde la copia de seguridad del {date}. Puede que falten los cambios posteriores a ese día. El archivo ilegible se conservó como {file}.",
  "app.categoryNotice":
    "Las metas de Inkswell ahora solo cuentan las palabras del proyecto. Elige qué cuenta (escenas, planificación, códice) en Configuración → Inkswell.",

  // --- Commands --------------------------------------------------------------
  "app.command.openProjects": "Abrir proyectos",
  "app.command.newProject": "Nuevo proyecto",
  "app.command.renameProject": "Cambiar nombre del proyecto",
  "app.command.archiveProject": "Archivar el proyecto actual",
  "app.command.unarchiveProject": "Desarchivar el proyecto actual",
  "app.command.setUpChallenge": "Configurar un reto de escritura",
  "app.command.exportStoryBible": "Exportar la biblia de la historia",
  "app.command.newScene": "Nueva escena",
  "app.command.sortByChapter": "Ordenar escenas por número de capítulo",
  "app.command.openBeats": "Abrir hoja de beats (Planificar)",
  "app.command.openBoard": "Abrir tablero (Planificar)",
  "app.command.openPlotGrid": "Abrir cuadrícula de tramas (Planificar)",
  "app.command.openCodex": "Abrir el códice",
  "app.command.openWrite": "Abrir Escribir",
  "app.command.openStats": "Abrir estadísticas de escritura (Progreso)",
  "app.command.openCompile": "Abrir compilación (Publicar)",
  "app.command.compileActive": "Compilar el proyecto activo",
  "app.command.searchScenes": "Buscar escenas",
  "app.command.insertTodo": "Insertar un marcador de tarea…",
  "app.command.toggleBold": "Alternar negrita (editor de Escribir)",
  "app.command.toggleItalic": "Alternar cursiva (editor de Escribir)",
  "app.command.toggleStrikethrough": "Alternar tachado (editor de Escribir)",
  "app.command.splitScene": "Dividir la escena en el cursor (editor de Escribir)",
  "app.command.toggleStream": "Alternar flujo de escenas (Escribir)",
  "app.command.jumpToChapter": "Ir al capítulo… (flujo de escenas)",
  "app.command.nextChapter": "Capítulo siguiente (flujo de escenas)",
  "app.command.previousChapter": "Capítulo anterior (flujo de escenas)",
  "app.command.moveSelection": "Mover la selección a una escena nueva (editor de Escribir)",
  "app.command.quickCodex": "Crear una entrada del códice con la selección (editor de Escribir)",
  "app.command.openLink": "Abrir el enlace del cursor (editor de Escribir)",
  "app.command.toggleTypewriter": "Alternar modo máquina de escribir (editor de Escribir)",
  "app.typewriterOn": "Modo máquina de escribir activado",
  "app.typewriterOff": "Modo máquina de escribir desactivado",
  "app.command.startSprint": "Empezar un sprint de escritura",
  "app.command.endSprint": "Terminar ya el sprint actual",
  "app.command.cancelSprint": "Cancelar el sprint actual",
  "app.command.setWordTarget": "Fijar el objetivo de palabras del proyecto activo",
  "app.command.logRevision": "Registrar una decisión de revisión",
  "app.notInProject": "El archivo activo no forma parte de un proyecto de Inkswell.",
  "app.command.openRevisions": "Abrir el registro de revisiones",
  "app.command.openAnalysis": "Abrir análisis (Revisar)",
  "app.command.openHelp": "Abrir la ayuda",
  "app.command.openCustomize": "Abrir Personalizar",
  "app.command.restoreSettings": "Restaurar la configuración desde una copia de seguridad",
  "app.command.manageFeatures": "Gestionar funciones",
  "app.command.quickCapture": "Capturar una idea al vuelo",

  // --- Settings backups ------------------------------------------------------
  "app.noBackups": "Inkswell aún no tiene copias de seguridad. Se crea una cada día que abres Obsidian.",
  "app.settingsRestored":
    "Configuración restaurada desde la copia de seguridad del {date}. Tu historial de escritura y tus ideas no se han modificado.",

  // --- Ideas inbox -----------------------------------------------------------
  "app.capture.title": "Captura rápida",
  "app.capture.cta": "Capturar",
  "app.capture.done": "Idea capturada.",
  "app.idea.saveFailed": "No se pudo guardar la idea como nota.",
  "app.idea.saved": "Guardada en {path}",

  // --- Compile, archive, project lookup --------------------------------------
  "app.compile.noProject": "No hay ningún proyecto activo que compilar. Abre uno en Inkswell primero.",
  "app.archive.archived": "Se archivó «{title}». Está en Archivados, en Inicio.",
  "app.archive.restored": "«{title}» vuelve a estar en Inicio.",
  "app.archive.seriesArchived": "Se archivó la serie «{name}». Está en Archivados, en Inicio.",
  "app.archive.seriesRestored": "La serie «{name}» vuelve a estar en Inicio.",
  "app.noProject": "No se encontró ningún proyecto de Inkswell. Crea uno con el comando Nuevo proyecto.",
};
