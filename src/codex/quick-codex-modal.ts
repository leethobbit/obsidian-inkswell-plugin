/**
 * Quick Codex dialog: name + type (+ "add the selected text as an alias" when
 * the two differ), on the house FormModal scaffold (Enter submits, autofocus +
 * select, idempotent submit). Shows live whether the name already matches an
 * existing entry — in which case the action links to it instead of creating.
 */

import { App, Notice, Setting } from "obsidian";
import { t } from "../i18n";
import { FormModal } from "../lib/form-modal";
import { QuickCodexSeed, findExistingEntity, shouldOfferAlias } from "./quick-codex";
import { CategoryDef, CodexEntity, categoryDisplayLabel } from "./types";

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
    this.cta = t("common.create");
    this.name = opts.seed?.name ?? "";
    this.categoryId =
      opts.categories.find((c) => c.id === opts.defaultCategoryId)?.id ??
      opts.categories[0]?.id ??
      "";
  }

  protected renderForm(contentEl: HTMLElement): void {
    contentEl.createEl("h3", { text: t("codex.quick.title") });

    new Setting(contentEl)
      .setName(t("codex.type.name"))
      .setDesc(t("codex.quick.name.desc"))
      .addText((text) => {
        text.setPlaceholder(t("codex.quick.name.placeholder"))
          .setValue(this.name)
          .onChange((v) => {
            this.name = v;
            this.refreshDerived();
          });
      });

    new Setting(contentEl)
      .setName(t("codex.quick.type"))
      .addDropdown((d) => {
        for (const c of this.opts.categories) d.addOption(c.id, categoryDisplayLabel(c));
        d.setValue(this.categoryId).onChange((v) => {
          this.categoryId = v;
        });
      });

    const core = this.opts.seed?.core.split(/\r?\n/)[0].trim() ?? "";
    this.aliasSetting = new Setting(contentEl)
      .setName(t("codex.quick.alias", { text: core }))
      .setDesc(t("codex.quick.alias.desc"))
      .addToggle((toggle) => toggle.setValue(this.addAlias).onChange((v) => (this.addAlias = v)));
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
    const label = (id: string) => {
      const def = this.opts.categories.find((c) => c.id === id);
      return def ? categoryDisplayLabel(def) : id;
    };
    if (this.hintEl) {
      this.hintEl.setText(
        existing
          ? t("codex.quick.matches", { name: existing.name, type: label(existing.category) })
          : this.opts.scopeHint
      );
    }
    const cta = this.contentEl.querySelector<HTMLButtonElement>("button.mod-cta");
    if (cta) cta.setText(existing ? t("codex.quick.link") : t("common.create"));
  }

  protected async submit(): Promise<boolean> {
    const name = this.name.trim();
    if (!name) {
      new Notice(t("codex.nameRequired"));
      return false;
    }
    if (!this.categoryId) {
      new Notice(t("codex.quick.chooseType"));
      return false;
    }
    const seed = this.opts.seed;
    const addAlias = !!seed && shouldOfferAlias(name, seed.core) && this.addAlias;
    await this.opts.onSubmit({ name, categoryId: this.categoryId, addAlias });
    return true;
  }
}
