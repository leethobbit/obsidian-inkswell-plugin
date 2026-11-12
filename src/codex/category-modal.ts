/**
 * Add/edit dialog for a codex type. Opened from Settings → Codex types (built-ins:
 * rename / re-icon / reset), Settings → Custom codex types, and the Codex panel's
 * "New type…" dropdown option; the caller persists the result (settings write +
 * refreshView). The id slug is derived from the name and immutable once created
 * — it's written into every entry's `codex:` frontmatter, so renaming it would
 * orphan them all (delete + recreate is the escape hatch). Built-ins are the
 * same story with a fixed id: only their display changes.
 */

import { App, Notice, Setting, getIconIds, setIcon } from "obsidian";
import { t } from "../i18n";
import { FormModal } from "../lib/form-modal";
import { CategoryDef, defaultPlural, slugifyCategoryId } from "./types";

export interface CategoryModalOptions {
  /** The type being edited (its CURRENT display for a built-in), or null to add a new one. */
  existing: CategoryDef | null;
  /** When editing a built-in: its shipped definition (enables "Reset to default"). */
  builtin?: CategoryDef;
  /** Ids already in use (built-ins + other customs; excludes `existing`). */
  takenIds: string[];
  /** Labels already in use, lowercased (labels name the template notes). */
  takenLabels: string[];
  onSubmit: (def: CategoryDef) => void | Promise<void>;
}

export class CategoryModal extends FormModal {
  private opts: CategoryModalOptions;
  private label: string;
  private plural: string;
  private icon: string;

  constructor(app: App, opts: CategoryModalOptions) {
    super(app);
    this.opts = opts;
    this.cta = opts.existing ? t("common.save") : t("common.add");
    this.label = opts.existing?.label ?? "";
    this.plural = opts.existing?.plural ?? "";
    this.icon = opts.existing?.icon ?? "box";
  }

  protected renderForm(contentEl: HTMLElement): void {
    const { existing, builtin } = this.opts;
    contentEl.createEl("h3", {
      text: builtin
        ? t("codex.type.title.edit")
        : existing
          ? t("codex.type.title.editCustom")
          : t("codex.type.title.add"),
    });

    let pluralInput: HTMLInputElement | null = null;
    let idLine: HTMLElement | null = null;

    // The label shown here is the stored one (it names the template note, so a
    // built-in's stays English); the plural default is the stored `<name>s` rule.
    new Setting(contentEl)
      .setName(t("codex.type.name"))
      .setDesc(
        builtin
          ? t("codex.type.name.descBuiltin", { id: builtin.id, template: `${builtin.label}.md` })
          : existing
            ? t("codex.type.name.descCustom")
            : t("codex.type.name.descNew")
      )
      .addText((text) => {
        text.setValue(this.label).onChange((v) => {
          this.label = v;
          if (pluralInput) pluralInput.placeholder = v.trim() ? `${v.trim()}s` : "";
          if (idLine && !existing) {
            const slug = slugifyCategoryId(this.label);
            idLine.setText(slug ? t("codex.type.storedAs", { id: slug }) : "");
          }
        });
      });

    new Setting(contentEl)
      .setName(t("codex.type.plural"))
      .setDesc(t("codex.type.plural.desc"))
      .addText((text) => {
        pluralInput = text.inputEl;
        text.setPlaceholder(this.label.trim() ? `${this.label.trim()}s` : "")
          .setValue(this.plural)
          .onChange((v) => (this.plural = v));
      });

    new Setting(contentEl)
      .setName(t("codex.type.icon"))
      .setDesc(t("codex.type.icon.desc"))
      .addText((text) => {
        const preview = createSpan({ cls: "inkswell-catmodal__preview" });
        text.inputEl.after(preview);
        setIcon(preview, this.icon);
        text.setValue(this.icon).onChange((v) => {
          this.icon = v;
          // Live preview; an unknown name just renders empty, which is safe.
          setIcon(preview, v.trim());
        });
      });

    idLine = contentEl.createDiv({ cls: "setting-item-description" });
    if (builtin) {
      idLine.setText(t("codex.type.idBuiltin", { id: builtin.id }));
    } else if (existing) {
      idLine.setText(t("codex.type.idFixed", { id: existing.id }));
    } else {
      const slug = slugifyCategoryId(this.label);
      idLine.setText(slug ? t("codex.type.storedAs", { id: slug }) : "");
    }

    // Built-in with a customized display: one click back to the shipped look.
    if (
      builtin &&
      existing &&
      (existing.label !== builtin.label ||
        existing.plural !== builtin.plural ||
        existing.icon !== builtin.icon)
    ) {
      new Setting(contentEl)
        .setName(t("codex.type.reset"))
        .setDesc(`${builtin.label} / ${builtin.plural} / ${builtin.icon}`)
        .addButton((b) =>
          b.setButtonText(t("common.reset")).onClick(() => {
            void (async () => {
              await this.opts.onSubmit({ ...builtin });
              this.close();
            })();
          })
        );
    }
  }

  protected async submit(): Promise<boolean> {
    const label = this.label.trim();
    if (!label) {
      new Notice(t("codex.nameRequired"));
      return false;
    }
    const id = this.opts.existing?.id ?? slugifyCategoryId(label);
    if (!id) {
      new Notice(t("codex.type.nameNoLetters"));
      return false;
    }
    if (!this.opts.existing && this.opts.takenIds.includes(id)) {
      new Notice(t("codex.type.idTaken", { id }));
      return false;
    }
    if (this.opts.takenLabels.includes(label.toLowerCase())) {
      new Notice(t("codex.type.labelTaken"));
      return false;
    }
    const icon = this.icon.trim() || "box";
    // getIconIds returns prefixed ids ("lucide-dog") while setIcon takes the
    // bare name — accept either form.
    const ids = getIconIds();
    if (!ids.includes(icon) && !ids.includes(`lucide-${icon}`)) {
      new Notice(t("codex.type.unknownIcon", { icon }));
      return false;
    }
    const plural = this.plural.trim() || defaultPlural(label);
    await this.opts.onSubmit({ id, label, plural, icon });
    return true;
  }
}
