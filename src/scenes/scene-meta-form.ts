/**
 * Shared renderer for a scene's metadata fields, written straight to the scene's
 * frontmatter via `writeSceneMeta` (never the prose body). Used by both the Scene
 * Inspector (side column) and the "Edit scene" modal, so the two stay in sync.
 */

import { App, Platform, TFile } from "obsidian";
import { MessageKey, t } from "../i18n";
import { tryFileOp } from "../lib/notify";
import { tagField } from "../lib/focus-preserve";
import { autosizeTextarea } from "../lib/form-fields";
import { readProfile, writeProfile } from "../codex/codex-profile";
import type { ProfileField } from "../codex/profile-schema";
import type { CodexEntity } from "../codex/types";
import { renderProfileFieldControl } from "../codex/profile-field-controls";
import { linkTarget, toLink } from "../codex/codex";
import { featureEnabled } from "../features";
import { getCodexEntities } from "../codex/codex-store";
import { filterToScope, scopeContextForProject } from "../codex/codex-scope";
import { Project } from "../projects/types";
import { Checkpoint, SCENE_CHECKPOINTS } from "../revisions/audit";
import { readSceneAudit, writeSceneAudit } from "../revisions/audit-meta";
import { OPENING_LABEL, OPENING_TYPES, OpeningType } from "../revisions/openings";
import { distinctInOrder } from "../outliner/structure";
import {
  InspectorFieldDef,
  InspectorFieldId,
  SceneMeta,
  StatusDef,
  inspectorFields,
  readSceneMeta,
  sceneStatuses,
  updateSceneList,
  writeSceneMeta,
} from "./scene-meta";

/** Shared scene/plotline color swatches (also used by the Plot Grid column menu). */
export const COLORS = ["#e06c75", "#e5c07b", "#98c379", "#56b6c2", "#61afef", "#c678dd"];

/** Lift-out verdict (stored value) → its UI label's catalog key. */
const VERDICT_LABEL_KEYS: Record<"keep" | "cut" | "merge", MessageKey> = {
  keep: "scene.audit.verdict.keep",
  cut: "scene.audit.verdict.cut",
  merge: "scene.audit.verdict.merge",
};

// Unique <datalist> id per field instance (Inspector + Edit modal can coexist).
let povListSeq = 0;
let structureListSeq = 0;

interface ChipListOptions {
  /** Stored values (wikilinks or plain titles). */
  current: string[];
  /** Chip text for a stored value. */
  label: (value: string) => string;
  /** Values offered by the "add" picker (already excluding `current`). */
  candidates: string[];
  addLabel: string;
  /** `tagField` key for the picker (focus survives the rebuild). */
  tag: string;
  /** Shown when there is nothing to add or remove; null = nothing. */
  emptyText: string | null;
  onAdd(value: string): void;
  onRemove(value: string): void;
  /** Extra behaviour for one chip (the Codex peek on Characters / Location). */
  decorate?(chip: HTMLElement, value: string): void;
}

/**
 * The chips + "add" picker every multi-value scene field uses (Characters,
 * Location, Plotlines). One markup, one behavior — the callers only decide what
 * a value is and how it's persisted.
 */
function renderChipList(host: HTMLElement, opts: ChipListOptions): void {
  const chips = host.createDiv({ cls: "inkswell-inspector__chips" });
  for (const value of opts.current) {
    const chip = chips.createSpan({ cls: "inkswell-chip", text: opts.label(value) });
    const x = chip.createSpan({ cls: "inkswell-chip__x", text: "×" });
    x.setAttribute("aria-label", t("scene.form.removeChip", { name: opts.label(value) }));
    x.onclick = (e) => {
      e.stopPropagation();
      opts.onRemove(value);
    };
    opts.decorate?.(chip, value);
  }
  if (opts.candidates.length > 0) {
    const add = host.createEl("select", { cls: "dropdown" });
    tagField(add, opts.tag);
    add.createEl("option", { text: opts.addLabel, value: "" });
    for (const c of opts.candidates) add.createEl("option", { text: c, value: c });
    add.value = "";
    add.onchange = () => {
      if (add.value) opts.onAdd(add.value);
    };
  } else if (opts.emptyText) {
    host.createSpan({ cls: "inkswell-stats__muted", text: opts.emptyText });
  }
}

/** One labelled field row (label optional). */
function field(parent: HTMLElement, label: string, build: (host: HTMLElement) => void): void {
  const f = parent.createDiv({ cls: "inkswell-inspector__field" });
  if (label) f.createDiv({ cls: "inkswell-inspector__label", text: label });
  build(f.createDiv({ cls: "inkswell-inspector__control" }));
}

/** Existing act/chapter labels across the book's scenes + any planned groups. */
function structureLabels(app: App, project: Project | null, kind: "act" | "chapter"): string[] {
  if (!project || project.draft.format !== "scenes") return [];
  const sceneLabels = project.scenes.map((s) => {
    if (!s.path) return undefined;
    const f = app.vault.getAbstractFileByPath(s.path);
    return f instanceof TFile ? readSceneMeta(app, f)[kind] : undefined;
  });
  const configured = (kind === "act" ? project.inkswell?.acts : project.inkswell?.chapters) ?? [];
  return distinctInOrder([...sceneLabels, ...configured.map((g) => g.title)]);
}

/**
 * Render all editable scene-metadata field rows into `container`. When `project`
 * (the scene's owning book) is given, the codex pickers are scoped to that book +
 * its series + global entries; without it, all entities are offered.
 */
export function renderSceneMetaFields(
  container: HTMLElement,
  app: App,
  file: TFile,
  project: Project | null = null,
  disabledFeatures: readonly string[] = [],
  markWrite?: (path: string) => void,
  /** Full project list — needed to widen the scope vantage to the whole story. */
  allProjects: Project[] = project ? [project] : [],
  /** Effective statuses (`sceneStatuses(override)`); shipped by default. */
  statuses: readonly StatusDef[] = sceneStatuses(),
  /** Effective field layout (`inspectorFields(override)`); shipped by default. */
  fields: readonly InspectorFieldDef[] = inspectorFields(),
  /** The writer's own fields (#52) and a codex-type labeller for their link pickers. */
  extra: {
    customFields?: readonly ProfileField[];
    typeLabel?: (id: string) => string;
    /** Give a Characters / Location chip the Codex peek (the Scene inspector does). */
    peekChip?: (chip: HTMLElement, entity: CodexEntity, visible: readonly CodexEntity[]) => void;
  } = {}
): void {
  const meta = readSceneMeta(app, file);
  const save = (patch: Partial<SceneMeta>) => {
    markWrite?.(file.path);
    void tryFileOp(() => writeSceneMeta(app, file, patch), t("scene.form.saveFailed"));
  };
  // Chip lists persist as list OPS against the file's CURRENT value — a value
  // patch built from this render's `meta` would overwrite links added since.
  const saveList = (
    key: "characters" | "location" | "plotlines",
    transform: (current: string[]) => string[]
  ) => {
    markWrite?.(file.path);
    void tryFileOp(
      () => updateSceneList(app, file, key, transform),
      t("scene.form.saveFailed")
    );
  };
  const entities = filterToScope(
    getCodexEntities(app),
    scopeContextForProject(project, allProjects)
  );

  // One renderer per field; the writer's Customize layout picks which run,
  // in what order, under what label (hidden fields keep their stored values).
  const render: Record<InspectorFieldId, (label: string) => void> = {} as Record<
    InspectorFieldId,
    (label: string) => void
  >;

  render.status = (label) => field(container, label, (host) => {
    const sel = host.createEl("select", { cls: "dropdown" });
    tagField(sel, "scene:status");
    sel.createEl("option", { text: t("scene.form.none"), value: "" });
    // Visible statuses, plus the scene's CURRENT status if the writer hid it —
    // a real stored value must never render as a blank select.
    for (const s of statuses) {
      if (s.hidden && meta.status !== s.id) continue;
      const o = sel.createEl("option", {
        text: s.hidden ? t("scene.form.statusHidden", { label: s.label }) : s.label,
        value: s.id,
      });
      if (meta.status === s.id) o.selected = true;
    }
    sel.value = meta.status ?? "";
    sel.onchange = () => save({ status: (sel.value || undefined) as SceneMeta["status"] });
  });

  render.subtitle = (label) => field(container, label, (host) => {
    const input = host.createEl("input", { type: "text" });
    tagField(input, "scene:subtitle");
    input.value = meta.subtitle ?? "";
    input.placeholder = t("scene.form.subtitlePlaceholder");
    input.onchange = () => save({ subtitle: input.value });
  });

  render.synopsis = (label) => field(container, label, (host) => {
    const ta = host.createEl("textarea", { cls: "inkswell-inspector__textarea" });
    tagField(ta, "scene:synopsis");
    ta.rows = 3;
    ta.value = meta.synopsis ?? "";
    ta.placeholder = t("scene.form.synopsisPlaceholder");
    ta.onchange = () => save({ synopsis: ta.value });
    autosizeTextarea(ta);
  });

  // POV — suggests codex characters (typo-free, discoverable) but stays free
  // text, since POV can also be a narrative mode ("Omniscient", "First person").
  render.pov = (label) => field(container, label, (host) => {
    const input = host.createEl("input", { type: "text" });
    tagField(input, "scene:pov");
    input.value = meta.pov ?? "";
    input.placeholder = t("scene.form.povPlaceholder");
    const chars = entities.filter((e) => e.category === "character");
    if (chars.length > 0) {
      const listId = `inkswell-pov-${povListSeq++}`;
      const list = host.createEl("datalist");
      list.id = listId;
      for (const c of chars) list.createEl("option", { value: c.name });
      input.setAttribute("list", listId);
    }
    input.onchange = () => save({ pov: input.value });
  });

  // Linked codex entities of one category as chips + an "add" picker. The list
  // op composes against the file's CURRENT value (see saveList).
  const linkChips = (
    host: HTMLElement,
    key: "characters" | "location",
    category: string,
    current: string[],
    addLabel: MessageKey,
    emptyText: MessageKey
  ) => {
    const pool = entities.filter((e) => e.category === category);
    renderChipList(host, {
      current,
      label: linkTarget,
      candidates: pool
        .filter((c) => !current.some((link) => linkTarget(link) === c.name))
        .map((c) => c.name),
      addLabel: t(addLabel),
      tag: `scene:${key}-add`,
      emptyText: pool.length === 0 ? t(emptyText) : null,
      decorate: extra.peekChip
        ? (chip, value) => {
            const name = linkTarget(value).trim().toLowerCase();
            const entity = pool.find((e) => e.name.toLowerCase() === name);
            if (entity) extra.peekChip?.(chip, entity, entities);
          }
        : undefined,
      onAdd: (name) => {
        const link = toLink(name);
        saveList(key, (cur) => (cur.includes(link) ? cur : [...cur, link]));
      },
      onRemove: (link) => saveList(key, (cur) => cur.filter((c) => c !== link)),
    });
  };

  // Characters (linked codex entities)
  render.characters = (label) => field(container, label, (host) =>
    linkChips(host, "characters", "character", meta.characters ?? [], "scene.form.addCharacter", "scene.form.noCharacters")
  );

  // Locations (linked codex entities; several allowed since 1.18 — #44)
  render.location = (label) => field(container, label, (host) =>
    linkChips(host, "location", "location", meta.location ?? [], "scene.form.addLocation", "scene.form.noLocations")
  );

  // Codex mentions are surfaced automatically on each entry's "Appears in" list
  // (scenesForEntity scans scene text) — no manual "detect" step here. The
  // Characters/Location fields above remain explicit metadata for the Search
  // character filter and the Revise → Audit character-arc roster.

  // Act + Chapter — free text, but suggest existing labels (and planned groups)
  // so users reuse chapters/acts instead of creating typo'd phantom ones.
  render.structure = (label) => field(container, label, (host) => {
    const row = host.createDiv({ cls: "inkswell-inspector__pair" });
    const suggest = (input: HTMLInputElement, kind: "act" | "chapter") => {
      // iOS WebKit turns a datalist into a picker that fights typing a new
      // label (#47); there the field is plain free text.
      if (Platform.isIosApp) return;
      const labels = structureLabels(app, project, kind);
      if (labels.length === 0) return;
      const listId = `inkswell-${kind}-${structureListSeq++}`;
      const list = host.createEl("datalist");
      list.id = listId;
      for (const l of labels) list.createEl("option", { value: l });
      input.setAttribute("list", listId);
    };
    const act = row.createEl("input", { type: "text" });
    tagField(act, "scene:act");
    act.value = meta.act ?? "";
    act.placeholder = t("scene.form.actPlaceholder");
    suggest(act, "act");
    act.onchange = () => save({ act: act.value });
    const ch = row.createEl("input", { type: "text" });
    tagField(ch, "scene:chapter");
    ch.value = meta.chapter ?? "";
    ch.placeholder = t("scene.form.chapterPlaceholder");
    suggest(ch, "chapter");
    ch.onchange = () => save({ chapter: ch.value });
  });

  // Plotlines — plain titles from the project's plotline list (Plan → Grid).
  // Same chips pattern as Characters, but titles are strings, not wikilinks.
  // Hidden when the Plot grid feature is off (its data is kept, just not shown).
  render.plotlines = (label) => {
    if (!featureEnabled(disabledFeatures, "plot-grid")) return;
    field(container, label, (host) => {
      const current = meta.plotlines ?? [];
      const configured = (project?.inkswell?.plotlines ?? []).map((p) => p.title);
      renderChipList(host, {
        current,
        label: (title) => title,
        candidates: configured.filter((title) => !current.includes(title)),
        addLabel: t("scene.form.addPlotline"),
        tag: "scene:plotlines-add",
        emptyText:
          configured.length === 0 && current.length === 0
            ? t("scene.form.noPlotlines")
            : null,
        onAdd: (title) =>
          saveList("plotlines", (cur) => (cur.includes(title) ? cur : [...cur, title])),
        onRemove: (title) => saveList("plotlines", (cur) => cur.filter((c) => c !== title)),
      });
    });
  };

  render.targetWords = (label) => field(container, label, (host) => {
    const input = host.createEl("input", { type: "number" });
    tagField(input, "scene:target-words");
    input.value = meta.targetWords ? String(meta.targetWords) : "";
    input.placeholder = "0";
    input.onchange = () => {
      const n = Math.floor(Number(input.value));
      save({ targetWords: Number.isFinite(n) && n > 0 ? n : undefined });
    };
  });

  render.color = (label) => field(container, label, (host) => {
    const row = host.createDiv({ cls: "inkswell-inspector__swatches" });
    for (const c of COLORS) {
      const sw = row.createDiv({ cls: "inkswell-swatch" });
      sw.style.backgroundColor = c;
      if (meta.color === c) sw.addClass("is-selected");
      sw.onclick = () => save({ color: c });
    }
    const clear = row.createDiv({ cls: "inkswell-swatch inkswell-swatch--clear" });
    clear.setText("×");
    clear.onclick = () => save({ color: undefined });
  });

  // Working notes — an outline to draft against (#49). Its own field, not the
  // synopsis: the synopsis feeds Board cards and the Outline.
  render.notes = (label) => field(container, label, (host) => {
    const ta = host.createEl("textarea", { cls: "inkswell-inspector__textarea" });
    tagField(ta, "scene:notes");
    ta.rows = 4;
    if (meta.notes === undefined && app.metadataCache.getFileCache(file)?.frontmatter?.["notes"] != null) {
      // Another tool stored non-text under `notes` — don't offer to overwrite it.
      ta.disabled = true;
      ta.placeholder = t("scene.form.notesReadOnly");
      return;
    }
    ta.value = meta.notes ?? "";
    ta.placeholder = t("scene.form.notesPlaceholder");
    ta.onchange = () => save({ notes: ta.value });
    autosizeTextarea(ta);
  });

  // Archived — a checkbox row; the label reads as its caption.
  render.inactive = (label) => field(container, "", (host) => {
    const row = host.createEl("label", { cls: "inkswell-inspector__toggle" });
    const cb = row.createEl("input", { type: "checkbox" });
    cb.checked = !!meta.inactive;
    cb.onchange = () => save({ inactive: cb.checked });
    row.createSpan({
      // The shipped label (in the current UI language) gets the longer
      // explanation; a writer's rename reads as their own caption.
      text:
        label === t("scene.field.inactive")
          ? t("scene.form.inactive")
          : t("scene.form.inactiveRenamed", { label }),
    });
  });

  // The writer's own fields (#52): rendered with the codex field controls,
  // stored as plain frontmatter keys. Lists/links apply as deltas against the
  // file's current value (gotcha 10); every write is marked as our own.
  render.custom = () => {
    const custom = extra.customFields ?? [];
    if (custom.length === 0) return;
    const profile = readProfile(app, file, [...custom]);
    for (const cf of custom) {
      field(container, cf.label, (control) =>
        renderProfileFieldControl(control, {
          app,
          field: cf,
          value: profile[cf.key],
          candidates: () => entities.map((e) => ({ name: e.name, category: e.category })),
          typeLabel: extra.typeLabel ?? ((id) => id),
          tagPrefix: "scene:x",
          saveValue: (value) => {
            markWrite?.(file.path);
            void tryFileOp(
              () => writeProfile(app, file, [cf], { [cf.key]: value }),
              t("scene.form.saveFailed")
            );
          },
          updateList: (transform) => {
            markWrite?.(file.path);
            void tryFileOp(
              () => updateSceneList(app, file, cf.key, transform),
              t("scene.form.saveFailed")
            );
          },
        })
      );
    }
  };

  for (const f of fields) if (!f.hidden) render[f.id](f.label);
}

/**
 * Render the 14 scene-level revision-audit checkpoints (the scene-level
 * revision pass) plus a freeform note, writing to scene frontmatter via
 * `writeSceneAudit`. Shared by the Scene Inspector and the Revise → Audit
 * dashboard. `onChange` fires after each toggle so a caller can refresh a badge.
 */
export function renderSceneAuditFields(
  container: HTMLElement,
  app: App,
  file: TFile,
  onChange?: () => void,
  markWrite?: (path: string) => void,
  /** Effective checkpoints (`sceneCheckpoints(override)`); shipped by default. */
  checkpoints: readonly Checkpoint[] = SCENE_CHECKPOINTS
): void {
  const audit = readSceneAudit(app, file);
  const saveAudit = (patch: Parameters<typeof writeSceneAudit>[2]) => {
    markWrite?.(file.path);
    void tryFileOp(() => writeSceneAudit(app, file, patch), t("scene.audit.saveFailed"));
  };
  const list = container.createDiv({ cls: "inkswell-audit__checks" });
  for (const cp of checkpoints) {
    const label = list.createEl("label", { cls: "inkswell-audit__check" });
    const cb = label.createEl("input", { type: "checkbox" });
    cb.checked = !!audit.checks[cp.id];
    cb.onchange = () => {
      saveAudit({ checks: { [cp.id]: cb.checked } });
      onChange?.();
    };
    label.createSpan({ text: cp.label });
  }

  // Lift-out test: verdict + "if removed, what breaks?" cascade note.
  field(container, t("scene.audit.liftOut"), (host) => {
    const sel = host.createEl("select", { cls: "dropdown" });
    tagField(sel, "audit:verdict");
    sel.createEl("option", { text: t("scene.audit.undecided"), value: "" });
    for (const v of ["keep", "cut", "merge"] as const) {
      const o = sel.createEl("option", { text: t(VERDICT_LABEL_KEYS[v]), value: v });
      if (audit.verdict === v) o.selected = true;
    }
    sel.value = audit.verdict ?? "";
    sel.onchange = () => saveAudit({ verdict: sel.value as "" | "keep" });
  });
  field(container, t("scene.audit.ifRemoved"), (host) => {
    const ta = host.createEl("textarea", { cls: "inkswell-inspector__textarea" });
    tagField(ta, "audit:purpose");
    ta.rows = 2;
    ta.value = audit.purpose ?? "";
    ta.placeholder = t("scene.audit.ifRemovedPlaceholder");
    ta.onchange = () => saveAudit({ purpose: ta.value });
    autosizeTextarea(ta);
  });

  // Opening type — override the heuristic when it's wrong.
  field(container, t("scene.audit.opening"), (host) => {
    const sel = host.createEl("select", { cls: "dropdown" });
    tagField(sel, "audit:opening");
    sel.createEl("option", { text: t("scene.audit.auto"), value: "" });
    for (const type of OPENING_TYPES) {
      if (type === "unknown") continue;
      const o = sel.createEl("option", { text: OPENING_LABEL[type], value: type });
      if (audit.opening === type) o.selected = true;
    }
    sel.value = audit.opening ?? "";
    sel.onchange = () => saveAudit({ opening: sel.value as "" | OpeningType });
  });

  // Character arc snapshots — internal (flaw) + external (problem) state for each
  // character linked to this scene. Drives the Audit dashboard's arc grid.
  const linkedChars = (readSceneMeta(app, file).characters ?? []).map(linkTarget);
  if (linkedChars.length > 0) {
    field(container, t("scene.audit.arc"), (host) => {
      for (const name of linkedChars) {
        const snap = audit.arc[name] ?? {};
        const row = host.createDiv({ cls: "inkswell-audit__arcrow" });
        row.createSpan({ cls: "inkswell-audit__arcname", text: name });
        const internal = row.createEl("input", { type: "text", cls: "inkswell-audit__arcfield" });
        tagField(internal, `audit:arc-${name}-internal`);
        internal.value = snap.internal ?? "";
        internal.placeholder = t("scene.audit.arcInternal");
        const external = row.createEl("input", { type: "text", cls: "inkswell-audit__arcfield" });
        tagField(external, `audit:arc-${name}-external`);
        external.value = snap.external ?? "";
        external.placeholder = t("scene.audit.arcExternal");
        const save = () =>
          saveAudit({ arc: { [name]: { internal: internal.value, external: external.value } } });
        internal.onchange = save;
        external.onchange = save;
      }
    });
  }

  const noteWrap = container.createDiv({ cls: "inkswell-inspector__field" });
  noteWrap.createDiv({ cls: "inkswell-inspector__label", text: t("scene.audit.note") });
  const ta = noteWrap.createDiv({ cls: "inkswell-inspector__control" }).createEl("textarea", {
    cls: "inkswell-inspector__textarea",
  });
  tagField(ta, "audit:note");
  ta.rows = 2;
  ta.value = audit.note ?? "";
  ta.placeholder = t("scene.audit.notePlaceholder");
  ta.onchange = () => saveAudit({ note: ta.value });
  autosizeTextarea(ta);
}
