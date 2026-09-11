/**
 * Quick Codex dialog: name + type (+ "add the selected text as an alias" when
 * the two differ), on the house FormModal scaffold (Enter submits, autofocus +
 * select, idempotent submit). Shows live whether the name already matches an
 * existing entry — in which case the action links to it instead of creating.
 */

import { App, Notice, Setting } from "obsidian";
import { FormModal } from "../lib/form-modal";
import { QuickCodexSeed, findExistingEntity, shouldOfferAlias } from "./quick-codex";
import { CategoryDef, CodexEntity } from "./types";

export interface QuickCodexResult {
  name: string;
  categoryId: string;
  /** Store the selected text as an alias of the (new or existing) entry. */
  addAlias: boolean;
}

export interface QuickCodexModalOptions {
  seed: QuickCodexSeed | null;
  categories: CategoryDef[];
  defaultCategoryId: string;
  /** Snapshot of known entities, for the "matches existing" hint. */
  entities: CodexEntity[];
  /** Where a new entry will be scoped (the Codex panel's New-button tooltip). */
  scopeHint: string;
  onSubmit: (result: QuickCodexResult) => Promise<void>;
}

export class QuickCodexModal extends FormModal {
  private name: string;
  private categoryId: string;
  private addAlias = true;
  private aliasSetting: Setting | null = null;
  private hintEl: HTMLElement | null = null;

  constructor(
    app: App,
    private opts: QuickCodexModalOptions
  ) {
    super(app);
    this.cta = "Create";
    this.name = opts.seed?.name ?? "";
    this.categoryId =
      opts.categories.find((c) => c.id === opts.defaultCategoryId)?.id ??
      opts.categories[0]?.id ??
      "";
  }

  protected renderForm(contentEl: HTMLElement): void {
    contentEl.createEl("h3", { text: "New Codex entry" });

    new Setting(contentEl)
      .setName("Name")
      .setDesc("Becomes the note's file name; the link is inserted where the text was.")
      .addText((t) => {
        t.setPlaceholder("Beatrice")
          .setValue(this.name)
          .onChange((v) => {
            this.name = v;
            this.refreshDerived();
          });
      });

    new Setting(contentEl)
      .setName("Type")
      .addDropdown((d) => {
        for (const c of this.opts.categories) d.addOption(c.id, c.label);
        d.setValue(this.categoryId).onChange((v) => {
          this.categoryId = v;
        });
      });

    const core = this.opts.seed?.core.split(/\r?\n/)[0].trim() ?? "";
    this.aliasSetting = new Setting(contentEl)
      .setName(`Add “${core}” as an alias`)
      .setDesc("So the Codex still recognises the wording you used in the scene.")
      .addToggle((t) => t.setValue(this.addAlias).onChange((v) => (this.addAlias = v)));
    this.aliasSetting.settingEl.addClass("inkswell-quickcodex__alias");

    this.hintEl = contentEl.createDiv({ cls: "setting-item-description" });
    this.refreshDerived();
  }

  /** Alias row visibility, the existing-entry hint, and the CTA label all follow the name. */
  private refreshDerived(): void {
    const seed = this.opts.seed;
    const offerAlias = !!seed && shouldOfferAlias(this.name, seed.core);
    this.aliasSetting?.settingEl.toggleClass("is-hidden", !offerAlias);

    const existing = findExistingEntity(this.opts.entities, this.name);
    const label = (id: string) => this.opts.categories.find((c) => c.id === id)?.label ?? id;
    if (this.hintEl) {
      this.hintEl.setText(
        existing
          ? `Matches the existing entry “${existing.name}” (${label(existing.category)}) — the link will point there.`
          : this.opts.scopeHint
      );
    }
    const cta = this.contentEl.querySelector<HTMLButtonElement>("button.mod-cta");
    if (cta) cta.setText(existing ? "Link" : "Create");
  }

  protected async submit(): Promise<boolean> {
    const name = this.name.trim();
    if (!name) {
      new Notice("Name is required.");
      return false;
    }
    if (!this.categoryId) {
      new Notice("Choose a Codex type.");
      return false;
    }
    const seed = this.opts.seed;
    const addAlias = !!seed && shouldOfferAlias(name, seed.core) && this.addAlias;
    await this.opts.onSubmit({ name, categoryId: this.categoryId, addAlias });
    return true;
  }
}
