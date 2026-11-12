/**
 * Add/edit dialog for a user-defined beat template. Opened from Settings →
 * Beat sheet templates; the caller persists the result (settings write +
 * refreshView). The template id slug is derived from the name and immutable
 * once created — it's written into `inkswell.beats.template` on project index
 * notes, so renaming it would strand those sheets (delete + recreate is the
 * escape hatch). Beats are typed one per line; beat ids are slugified from
 * their names, so renaming a LINE detaches that beat's saved notes (renaming
 * back recovers them) while reordering lines is always safe.
 */

import { App, Notice, Setting } from "obsidian";
import { t } from "../i18n";
import { FormModal } from "../lib/form-modal";
import { slugify } from "../lib/slug";
import {
  BeatTemplateDef,
  parseBeatLines,
  serializeBeatLines,
} from "./custom-templates";

export interface BeatTemplateModalOptions {
  /** The template being edited, or null to add a new one. */
  existing: BeatTemplateDef | null;
  /** Template ids already in use (built-ins + other customs; excludes `existing`). */
  takenIds: string[];
  onSubmit: (def: BeatTemplateDef) => void | Promise<void>;
}

export class BeatTemplateModal extends FormModal {
  private opts: BeatTemplateModalOptions;
  private name: string;
  private lines: string;

  constructor(app: App, opts: BeatTemplateModalOptions) {
    super(app);
    this.opts = opts;
    this.cta = opts.existing ? t("common.save") : t("common.add");
    this.name = opts.existing?.name ?? "";
    this.lines = opts.existing ? serializeBeatLines(opts.existing.beats) : "";
  }

  protected renderForm(contentEl: HTMLElement): void {
    const { existing } = this.opts;
    contentEl.createEl("h3", {
      text: existing ? t("beats.tplModal.editTitle") : t("beats.tplModal.addTitle"),
    });

    let idLine: HTMLElement | null = null;

    new Setting(contentEl)
      .setName(t("beats.tplModal.name"))
      .setDesc(t("beats.tplModal.name.desc"))
      .addText((text) => {
        text.setValue(this.name).onChange((v) => {
          this.name = v;
          if (idLine && !existing) {
            const slug = slugify(this.name);
            idLine.setText(slug ? t("beats.tplModal.storedAs", { slug }) : "");
          }
        });
      });

    const beats = new Setting(contentEl)
      .setName(t("beats.tplModal.beats"))
      .setDesc(t("beats.tplModal.beats.desc"));
    beats.settingEl.addClass("inkswell-tplmodal__beats");
    const area = beats.controlEl.createEl("textarea", {
      cls: "inkswell-tplmodal__lines",
      attr: { rows: "12", spellcheck: "false" },
    });
    area.value = this.lines;
    area.addEventListener("input", () => (this.lines = area.value));

    idLine = contentEl.createDiv({ cls: "setting-item-description" });
    if (existing) {
      idLine.setText(t("beats.tplModal.fixedId", { id: existing.id }));
    } else {
      const slug = slugify(this.name);
      idLine.setText(slug ? t("beats.tplModal.storedAs", { slug }) : "");
    }
  }

  protected async submit(): Promise<boolean> {
    const name = this.name.trim();
    if (!name) {
      new Notice(t("beats.tplModal.nameRequired"));
      return false;
    }
    const id = this.opts.existing?.id ?? slugify(name);
    if (!id || !/^[a-z]/.test(id)) {
      new Notice(t("beats.tplModal.nameLetter"));
      return false;
    }
    if (!this.opts.existing && this.opts.takenIds.includes(id)) {
      new Notice(t("beats.tplModal.exists", { id }));
      return false;
    }
    const parsed = parseBeatLines(this.lines);
    if ("error" in parsed) {
      new Notice(parsed.error);
      return false;
    }
    await this.opts.onSubmit({ id, name, beats: parsed.beats });
    return true;
  }
}
