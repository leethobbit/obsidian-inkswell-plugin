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
import { FormModal } from "../lib/form-modal";
import { CategoryDef, slugifyCategoryId } from "./types";

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
    this.cta = opts.existing ? "Save" : "Add";
    this.label = opts.existing?.label ?? "";
    this.plural = opts.existing?.plural ?? "";
    this.icon = opts.existing?.icon ?? "box";
  }

  protected renderForm(contentEl: HTMLElement): void {
    const { existing, builtin } = this.opts;
    contentEl.createEl("h3", {
      text: builtin
        ? "Edit codex type"
        : existing
          ? "Edit custom codex type"
          : "Add custom codex type",
    });

    let pluralInput: HTMLInputElement | null = null;
    let idLine: HTMLElement | null = null;

    new Setting(contentEl)
      .setName("Name")
      .setDesc(
        builtin
          ? `Singular display name. Entries keep codex: ${builtin.id}, and the original ` +
            `${builtin.label}.md template keeps working until a note named after the new name exists.`
          : existing
            ? "Also names the type's template note — renaming means the old template note is no longer used."
            : "Singular display name, e.g. “Creature”. Also names the type's template note."
      )
      .addText((t) => {
        t.setValue(this.label).onChange((v) => {
          this.label = v;
          if (pluralInput) pluralInput.placeholder = v.trim() ? `${v.trim()}s` : "";
          if (idLine && !existing) {
            const slug = slugifyCategoryId(this.label);
            idLine.setText(slug ? `Stored as codex: ${slug}` : "");
          }
        });
      });

    new Setting(contentEl)
      .setName("Plural")
      .setDesc("Group heading in the Codex list. Blank = name + “s”.")
      .addText((t) => {
        pluralInput = t.inputEl;
        t.setPlaceholder(this.label.trim() ? `${this.label.trim()}s` : "")
          .setValue(this.plural)
          .onChange((v) => (this.plural = v));
      });

    new Setting(contentEl)
      .setName("Icon")
      .setDesc("Lucide icon name — e.g. “dog”, “crown”, “scroll”.")
      .addText((t) => {
        const preview = createSpan({ cls: "inkswell-catmodal__preview" });
        t.inputEl.after(preview);
        setIcon(preview, this.icon);
        t.setValue(this.icon).onChange((v) => {
          this.icon = v;
          // Live preview; an unknown name just renders empty, which is safe.
          setIcon(preview, v.trim());
        });
      });

    idLine = contentEl.createDiv({ cls: "setting-item-description" });
    if (builtin) {
      idLine.setText(`codex: ${builtin.id} (built-in — the id never changes)`);
    } else if (existing) {
      idLine.setText(`codex: ${existing.id} (fixed — the id is written into existing notes)`);
    } else {
      const slug = slugifyCategoryId(this.label);
      idLine.setText(slug ? `Stored as codex: ${slug}` : "");
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
        .setName("Reset to default")
        .setDesc(`${builtin.label} / ${builtin.plural} / ${builtin.icon}`)
        .addButton((b) =>
          b.setButtonText("Reset").onClick(() => {
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
      new Notice("Name is required.");
      return false;
    }
    const id = this.opts.existing?.id ?? slugifyCategoryId(label);
    if (!id) {
      new Notice("Name must contain letters or numbers.");
      return false;
    }
    if (!this.opts.existing && this.opts.takenIds.includes(id)) {
      new Notice(`A codex type "${id}" already exists.`);
      return false;
    }
    if (this.opts.takenLabels.includes(label.toLowerCase())) {
      new Notice("A Codex type with that name already exists (template notes are named by it).");
      return false;
    }
    const icon = this.icon.trim() || "box";
    // getIconIds returns prefixed ids ("lucide-dog") while setIcon takes the
    // bare name — accept either form.
    const ids = getIconIds();
    if (!ids.includes(icon) && !ids.includes(`lucide-${icon}`)) {
      new Notice(`"${icon}" isn't a known icon name.`);
      return false;
    }
    const plural = this.plural.trim() || `${label}s`;
    await this.opts.onSubmit({ id, label, plural, icon });
    return true;
  }
}
