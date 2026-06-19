/**
 * Codex hub (Plan → Codex): browse entities grouped by category, search, create
 * new entities, and open/rename/delete via right-click. Entities are plain notes
 * with a `codex` frontmatter key; rename uses fileManager so wikilinks in scenes
 * update automatically.
 */

import { App, Menu, TFile, normalizePath, setIcon } from "obsidian";
import {
  confirmDelete,
  openScene,
  promptText,
} from "../scenes/scene-actions";
import { createEntity, getCodexEntities } from "./codex-store";
import { CODEX_CATEGORIES, CodexCategory, CodexEntity, categoryLabel } from "./types";
import type InkswellPlugin from "../../main";

export class CodexPanel {
  private app: App;
  private plugin: InkswellPlugin;
  private listEl: HTMLElement | null = null;
  private search = "";

  constructor(app: App, plugin: InkswellPlugin) {
    this.app = app;
    this.plugin = plugin;
  }

  render(container: HTMLElement): void {
    container.empty();
    container.addClass("inkswell-codex");

    const bar = container.createDiv({ cls: "inkswell-codex__toolbar" });
    const searchInput = bar.createEl("input", {
      type: "search",
      placeholder: "Search codex…",
    });
    searchInput.value = this.search;
    searchInput.oninput = () => {
      this.search = searchInput.value;
      this.renderList();
    };

    const catSel = bar.createEl("select", { cls: "dropdown" });
    for (const c of CODEX_CATEGORIES) {
      catSel.createEl("option", { text: c.label, value: c.id });
    }
    const newBtn = bar.createEl("button", { cls: "mod-cta", text: "New" });
    newBtn.onclick = async () => {
      const category = catSel.value as CodexCategory;
      const name = await promptText(this.app, {
        title: `New ${categoryLabel(category)}`,
        value: "",
        multiline: false,
        cta: "Create",
      });
      if (!name) return;
      const file = await createEntity(
        this.app,
        category,
        name,
        this.plugin.settings.codexFolder
      );
      if (file) openScene(this.app, file);
    };

    this.listEl = container.createDiv({ cls: "inkswell-codex__list" });
    this.renderList();
  }

  private renderList(): void {
    const list = this.listEl;
    if (!list) return;
    list.empty();

    const q = this.search.trim().toLowerCase();
    const all = getCodexEntities(this.app).filter((e) =>
      !q
        ? true
        : e.name.toLowerCase().includes(q) ||
          e.aliases.some((a) => a.toLowerCase().includes(q))
    );

    if (all.length === 0) {
      list.createDiv({
        cls: "inkswell-stats__muted",
        text: q
          ? "No matching codex entries."
          : "No codex entries yet. Create one above.",
      });
      return;
    }

    for (const cat of CODEX_CATEGORIES) {
      const entries = all.filter((e) => e.category === cat.id);
      if (entries.length === 0) continue;
      list.createEl("h4", { text: `${cat.plural} (${entries.length})` });
      for (const e of entries) this.renderRow(list, cat.icon, e);
    }
  }

  private renderRow(parent: HTMLElement, icon: string, entity: CodexEntity): void {
    const row = parent.createDiv({ cls: "inkswell-codex__row" });
    if (entity.parent) row.style.paddingLeft = "24px";
    setIcon(row.createSpan({ cls: "inkswell-codex__icon" }), icon);
    row.createSpan({ cls: "inkswell-codex__name", text: entity.name });
    if (entity.aliases.length) {
      row.createSpan({
        cls: "inkswell-codex__aliases",
        text: entity.aliases.join(", "),
      });
    }

    const file = this.app.vault.getAbstractFileByPath(entity.path);
    if (!(file instanceof TFile)) return;

    row.onclick = () => openScene(this.app, file);
    row.oncontextmenu = (e) => {
      e.preventDefault();
      const menu = new Menu();
      menu.addItem((i) =>
        i.setTitle("Open").setIcon("file-text").onClick(() => openScene(this.app, file))
      );
      menu.addItem((i) =>
        i.setTitle("Rename…").setIcon("pencil").onClick(() => this.rename(file))
      );
      menu.addSeparator();
      menu.addItem((i) =>
        i.setTitle("Delete").setIcon("trash").onClick(() => this.remove(file, entity.name))
      );
      menu.showAtMouseEvent(e);
    };
  }

  private async rename(file: TFile): Promise<void> {
    const next = await promptText(this.app, {
      title: "Rename codex entry",
      value: file.basename,
      multiline: false,
      cta: "Rename",
    });
    if (next === null) return;
    const safe = next.trim().replace(/[\\/:*?"<>|]/g, "-");
    if (!safe || safe === file.basename) return;
    const folder = file.parent ? file.parent.path : "";
    const path = normalizePath(folder ? `${folder}/${safe}.md` : `${safe}.md`);
    if (this.app.vault.getAbstractFileByPath(path)) return;
    await this.app.fileManager.renameFile(file, path);
  }

  private async remove(file: TFile, name: string): Promise<void> {
    const ok = await confirmDelete(this.app, `Delete codex entry "${name}"? It will be moved to trash.`);
    if (ok) await this.app.fileManager.trashFile(file);
  }
}
