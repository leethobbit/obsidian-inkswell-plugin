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
    this.cta = opts.existing ? "Save" : "Add";
    this.name = opts.existing?.name ?? "";
    this.lines = opts.existing ? serializeBeatLines(opts.existing.beats) : "";
  }

  protected renderForm(contentEl: HTMLElement): void {
    const { existing } = this.opts;
    contentEl.createEl("h3", {
      text: existing ? "Edit beat template" : "Add beat template",
    });

    let idLine: HTMLElement | null = null;

    new Setting(contentEl)
      .setName("Name")
      .setDesc("Shown in the beat-sheet template picker, e.g. “Ten Things”.")
      .addText((t) => {
        t.setValue(this.name).onChange((v) => {
          this.name = v;
          if (idLine && !existing) {
            const slug = slugify(this.name);
            idLine.setText(slug ? `Stored as template: ${slug}` : "");
          }
        });
      });

    const beats = new Setting(contentEl)
      .setName("Beats")
      .setDesc(
        "One beat per line: “Name”, “Name | purpose”, or “25% | Name | purpose” to pin " +
          "where the beat sits in the book (unpinned beats spread evenly). Beat names key " +
          "your saved notes — renaming a line starts that beat fresh; reordering is safe."
      );
    beats.settingEl.addClass("inkswell-tplmodal__beats");
    const area = beats.controlEl.createEl("textarea", {
      cls: "inkswell-tplmodal__lines",
      attr: { rows: "12", spellcheck: "false" },
    });
    area.value = this.lines;
    area.addEventListener("input", () => (this.lines = area.value));

    idLine = contentEl.createDiv({ cls: "setting-item-description" });
    if (existing) {
      idLine.setText(
        `template: ${existing.id} (fixed — the id is written into project notes using it)`
      );
    } else {
      const slug = slugify(this.name);
      idLine.setText(slug ? `Stored as template: ${slug}` : "");
    }
  }

  protected async submit(): Promise<boolean> {
    const name = this.name.trim();
    if (!name) {
      new Notice("Name is required.");
      return false;
    }
    const id = this.opts.existing?.id ?? slugify(name);
    if (!id || !/^[a-z]/.test(id)) {
      new Notice("Name must start with a letter.");
      return false;
    }
    if (!this.opts.existing && this.opts.takenIds.includes(id)) {
      new Notice(`A beat template "${id}" already exists.`);
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
