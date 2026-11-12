/**
 * Customize → Beat templates.
 *
 * List page: the eight built-ins (read-only; "Duplicate as custom" is the
 * on-ramp) and the writer's own templates as a reorderable list (their order is
 * the picker order in Plan → Beats). Template page: the beats as editable rows
 * (name / at % / purpose), drag-reorderable, with "Edit as text…" keeping the
 * line grammar as an import/escape hatch. Both paths share one id policy
 * (assignBeatIds), so notes can't cross-wire between them.
 */

import { App, Menu, Notice, Setting } from "obsidian";
import { t, tp } from "../../i18n";
import { FormModal } from "../../lib/form-modal";
import { renderListEditor } from "../../lib/list-editor";
import { slugify } from "../../lib/slug";
import { BEAT_TEMPLATES, BeatDef, TEMPLATE_META, templateLabel } from "../../outliner/beat-templates";
import { BeatTemplateModal } from "../../outliner/beat-template-modal";
import {
  BeatTemplateDef,
  allTemplateMeta,
  beatsFromRows,
  parseBeatLines,
  repositionBeat,
  serializeBeatLines,
} from "../../outliner/custom-templates";
import {
  deleteBeatTemplate,
  duplicateAsCustom,
  reorderBeatTemplates,
  saveBeatTemplate,
} from "../../outliner/template-actions";
import { taggedInput } from "../../views/panel-kit";
import type { CustomizeSection, SectionCtx } from "../section";

/** "Save the Cat (15)" → "Save the Cat". */
function builtinName(label: string): string {
  return label.replace(/\s*\(\d+\)\s*$/, "");
}

export const beatTemplatesSection: CustomizeSection = {
  id: "beat-templates",

  describe(plugin) {
    const n = plugin.settings.customBeatTemplates.length;
    const parts = [tp("customize.summary.builtIn", TEMPLATE_META.length)];
    if (n > 0) parts.push(tp("customize.summary.yours", n));
    return parts.join(" · ");
  },

  render(host, ctx) {
    if (ctx.target) renderTemplate(host, ctx, ctx.target);
    else renderList(host, ctx);
  },
};

// ---------------------------------------------------------------------------
// List page
// ---------------------------------------------------------------------------

function renderList(host: HTMLElement, ctx: SectionCtx): void {
  const { app, plugin } = ctx;
  host.createEl("p", {
    cls: "inkswell-stats__muted",
    text: t("customize.beats.intro"),
  });

  new Setting(host).setName(t("customize.beats.builtIn")).setHeading();
  const builtins = host.createDiv({ cls: "inkswell-customize__items" });
  for (const meta of TEMPLATE_META) {
    const row = builtins.createDiv({ cls: "inkswell-customize__item is-static" });
    const text = row.createDiv({ cls: "inkswell-customize__text" });
    // Display: the translated name. Duplicating copies the English data (below).
    text.createDiv({ cls: "inkswell-customize__name", text: builtinName(templateLabel(meta)) });
    text.createDiv({
      cls: "inkswell-customize__desc",
      text: tp("customize.beats.rowDesc", BEAT_TEMPLATES[meta.id]?.length ?? 0, { id: meta.id }),
    });
    const dup = row.createEl("button", { text: t("customize.beats.duplicateAsCustom") });
    dup.type = "button";
    dup.onclick = () => void duplicate(ctx, builtinName(meta.label), BEAT_TEMPLATES[meta.id] ?? []);
  }

  new Setting(host).setName(t("customize.beats.yours")).setHeading();
  const customs = plugin.settings.customBeatTemplates;
  renderListEditor<BeatTemplateDef>(host, {
    items: customs,
    keyPrefix: "customize:beat-templates",
    dragType: "inkswell/customize-beat-templates",
    emptyText: t("customize.beats.empty"),
    renderRow(el, tpl) {
      const text = el.createDiv({ cls: "inkswell-customize__text inkswell-customize__clickable" });
      text.createDiv({ cls: "inkswell-customize__name", text: tpl.name });
      text.createDiv({
        cls: "inkswell-customize__desc",
        text: tp("customize.beats.rowDesc", tpl.beats.length, { id: tpl.id }),
      });
      text.onclick = () => ctx.setTarget(tpl.id);
      const edit = el.createEl("button", { text: t("customize.beats.editBeats") });
      edit.type = "button";
      edit.onclick = () => ctx.setTarget(tpl.id);
    },
    extendMenu(menu: Menu, tpl) {
      menu.addItem((i) =>
        i.setTitle(t("customize.beats.editBeats")).setIcon("pencil").onClick(() => ctx.setTarget(tpl.id))
      );
      menu.addItem((i) =>
        i.setTitle(t("customize.beats.duplicate")).setIcon("copy").onClick(() => void duplicate(ctx, tpl.name, tpl.beats))
      );
    },
    onReorder: (next) => reorderBeatTemplates(plugin, next).then(() => ctx.rerender()),
    onRemove: (tpl) =>
      deleteBeatTemplate(app, plugin, tpl).then((done) => {
        if (done) ctx.rerender();
      }),
    add: {
      label: t("customize.beats.newTemplate"),
      action: () =>
        new BeatTemplateModal(app, {
          existing: null,
          takenIds: allTemplateMeta(plugin.settings.customBeatTemplates).map((m) => m.id),
          onSubmit: async (def) => {
            await saveBeatTemplate(plugin, def);
            ctx.setTarget(def.id);
          },
        }).open(),
    },
  });
}

async function duplicate(ctx: SectionCtx, name: string, beats: readonly BeatDef[]): Promise<void> {
  const def = duplicateAsCustom(name, beats, ctx.plugin.settings.customBeatTemplates);
  await saveBeatTemplate(ctx.plugin, def);
  new Notice(t("customize.beats.created", { name: def.name }));
  ctx.setTarget(def.id);
}

// ---------------------------------------------------------------------------
// Template page
// ---------------------------------------------------------------------------

function renderTemplate(host: HTMLElement, ctx: SectionCtx, id: string): void {
  const { app, plugin } = ctx;
  const back = host.createEl("a", { cls: "inkswell-customize__back", text: t("customize.beats.back") });
  back.onclick = (e) => {
    e.preventDefault();
    ctx.setTarget(null);
  };

  const tpl = plugin.settings.customBeatTemplates.find((x) => x.id === id);
  if (!tpl) {
    host.createDiv({ cls: "inkswell-stats__muted", text: t("customize.beats.gone") });
    return;
  }

  const head = host.createDiv({ cls: "inkswell-customize__typehead" });
  head.createEl("h4", { text: tpl.name });
  head.createSpan({ cls: "inkswell-stats__muted", text: t("customize.beats.idLine", { id: tpl.id }) });
  const rename = head.createEl("button", { text: t("customize.beats.rename") });
  rename.type = "button";
  rename.onclick = () =>
    new RenameTemplateModal(app, tpl.name, async (name) => {
      await saveBeatTemplate(plugin, { ...tpl, name });
      ctx.rerender();
    }).open();

  host.createEl("p", {
    cls: "inkswell-stats__muted",
    text: t("customize.beats.pageIntro"),
  });

  const beats = [...tpl.beats].sort((a, b) => a.position - b.position);
  const save = async (next: BeatDef[]): Promise<void> => {
    await saveBeatTemplate(plugin, { ...tpl, beats: next });
    ctx.rerender();
  };
  /** Re-derive ids from the (possibly renamed) rows through the shared policy. */
  const commitRows = (rows: { name: string; blurb: string; position: number | null }[]): void => {
    const result = beatsFromRows(rows);
    if ("error" in result) {
      new Notice(result.error);
      ctx.rerender();
      return;
    }
    void save(result.beats);
  };
  const prefix = `customize:beats:${tpl.id}`;

  renderListEditor<BeatDef>(host, {
    items: beats,
    keyPrefix: prefix,
    dragType: `inkswell/customize-beats-${tpl.id}`,
    emptyText: t("customize.beats.noBeats"),
    renderRow(el, beat, index) {
      const name = taggedInput(el, `${prefix}:name:${beat.id}`, { type: "text" });
      name.value = beat.name;
      name.placeholder = t("customize.beats.namePlaceholder");
      name.setAttribute("aria-label", t("customize.beats.nameAria"));
      name.onchange = () =>
        commitRows(beats.map((b, i) => (i === index ? { ...b, name: name.value } : b)));

      const at = taggedInput(el, `${prefix}:at:${beat.id}`, { type: "number", cls: "inkswell-customize__pct" });
      at.min = "0";
      at.max = "100";
      at.step = "1";
      at.value = String(Math.round(beat.position * 1000) / 10);
      at.setAttribute("aria-label", t("customize.beats.atAria"));
      at.onchange = () => {
        const n = Number(at.value);
        const position = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) / 100 : beat.position;
        void save(beats.map((b, i) => (i === index ? { ...b, position } : b)).sort((a, b) => a.position - b.position));
      };
      el.createSpan({ cls: "inkswell-stats__muted", text: "%" });

      const blurb = taggedInput(el, `${prefix}:blurb:${beat.id}`, { type: "text" });
      blurb.value = beat.blurb;
      blurb.placeholder = t("customize.beats.purposePlaceholder");
      blurb.setAttribute("aria-label", t("customize.beats.purposeAria"));
      blurb.onchange = () => void save(beats.map((b, i) => (i === index ? { ...b, blurb: blurb.value } : b)));
    },
    onReorder: (next) => {
      // The list editor hands back the new order; convert it into a position
      // change for the moved beat only (repositionBeat) so pins survive.
      const moved = next.findIndex((b, i) => b.id !== beats[i]?.id);
      if (moved < 0) return;
      const from = beats.findIndex((b) => b.id === next[moved].id);
      // `moved` is the first index that differs: if the beat moved down, that index
      // is where its old successor now sits, so the beat itself landed further on.
      const to = next.findIndex((b) => b.id === beats[from].id);
      return save(repositionBeat(beats, from, to));
    },
    onRemove: (beat) => {
      if (beats.length <= 1) {
        new Notice(t("customize.beats.needOne"));
        return;
      }
      return save(beats.filter((b) => b.id !== beat.id));
    },
    add: {
      label: t("customize.beats.addBeat"),
      action: () =>
        new AddBeatModal(app, (name, blurb) =>
          commitRows([...beats, { name, blurb, position: null }])
        ).open(),
    },
  });

  // Escape hatch / import path: the line grammar, applied as a whole.
  const details = host.createEl("details", { cls: "inkswell-customize__card" });
  details.createEl("summary", { text: t("customize.beats.editAsText") });
  const body = details.createDiv({ cls: "inkswell-customize__cardbody" });
  body.createDiv({
    cls: "inkswell-stats__muted",
    text: t("customize.beats.textHelp"),
  });
  const area = body.createEl("textarea", {
    cls: "inkswell-tplbody__text",
    attr: { rows: "10", spellcheck: "false" },
  });
  area.value = serializeBeatLines(beats);
  const actions = body.createDiv({ cls: "inkswell-tplbody__actions" });
  const apply = actions.createEl("button", { cls: "mod-cta", text: t("customize.beats.apply") });
  apply.type = "button";
  apply.onclick = () => {
    const parsed = parseBeatLines(area.value);
    if ("error" in parsed) {
      new Notice(parsed.error);
      return;
    }
    void save(parsed.beats);
  };
}

// ---------------------------------------------------------------------------
// Small dialogs
// ---------------------------------------------------------------------------

class AddBeatModal extends FormModal {
  private name = "";
  private blurb = "";
  constructor(
    app: App,
    private onAdd: (name: string, blurb: string) => void
  ) {
    super(app);
    this.cta = t("common.add");
  }
  protected renderForm(contentEl: HTMLElement): void {
    contentEl.createEl("h3", { text: t("customize.beats.addModal.title") });
    new Setting(contentEl)
      .setName(t("customize.beats.addModal.name"))
      .setDesc(t("customize.beats.addModal.nameDesc"))
      .addText((c) =>
        c.setPlaceholder(t("customize.beats.addModal.namePlaceholder")).onChange((v) => (this.name = v))
      );
    new Setting(contentEl)
      .setName(t("customize.beats.addModal.purpose"))
      .addText((c) =>
        c.setPlaceholder(t("customize.beats.addModal.purposePlaceholder")).onChange((v) => (this.blurb = v))
      );
  }
  protected submit(): boolean {
    const name = this.name.trim();
    if (!name) {
      new Notice(t("customize.beats.nameRequired"));
      return false;
    }
    if (!slugify(name)) {
      new Notice(t("customize.beats.nameNeedsChars"));
      return false;
    }
    this.onAdd(name, this.blurb.trim());
    return true;
  }
}

class RenameTemplateModal extends FormModal {
  private name: string;
  constructor(
    app: App,
    current: string,
    private onRename: (name: string) => Promise<void>
  ) {
    super(app);
    this.name = current;
  }
  protected renderForm(contentEl: HTMLElement): void {
    contentEl.createEl("h3", { text: t("customize.beats.renameModal.title") });
    new Setting(contentEl)
      .setName(t("customize.beats.renameModal.name"))
      .setDesc(t("customize.beats.renameModal.nameDesc"))
      .addText((c) => c.setValue(this.name).onChange((v) => (this.name = v)));
  }
  protected async submit(): Promise<boolean> {
    const name = this.name.trim();
    if (!name) {
      new Notice(t("customize.beats.nameRequired"));
      return false;
    }
    await this.onRename(name);
    return true;
  }
}
