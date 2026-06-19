/**
 * Codex hub (Plan → Codex): a master-detail browser. The left list groups
 * entities by category, searches, and creates new ones. Selecting an entity
 * opens a structured profile editor on the right — a focused form of that
 * category's fields (see `profile-schema`), written straight to the note's
 * frontmatter via `writeProfile` (never the prose body). The note body stays
 * freeform; "Open note" jumps to Obsidian's editor for it.
 */

import { App, Menu, TFile, normalizePath, setIcon } from "obsidian";
import {
  confirmDelete,
  openScene,
  promptText,
} from "../scenes/scene-actions";
import { createEntity, getCodexEntities, scenesReferencing } from "./codex-store";
import { linkTarget, toLink } from "./codex";
import { readProfile, writeProfile } from "./codex-profile";
import { Profile, ProfileField, profileFields } from "./profile-schema";
import { CODEX_CATEGORIES, CodexCategory, CodexEntity, categoryLabel } from "./types";
import type InkswellPlugin from "../../main";

export class CodexPanel {
  private app: App;
  private plugin: InkswellPlugin;
  private listEl: HTMLElement | null = null;
  private detailEl: HTMLElement | null = null;
  private search = "";
  private selectedPath: string | null = null;

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
      if (file) {
        this.selectedPath = file.path;
        this.renderList();
        this.renderDetail();
      }
    };

    const body = container.createDiv({ cls: "inkswell-codex__body" });
    this.listEl = body.createDiv({ cls: "inkswell-codex__list" });
    this.detailEl = body.createDiv({ cls: "inkswell-codex__detail" });
    this.renderList();
    this.renderDetail();
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
    if (entity.path === this.selectedPath) row.addClass("is-selected");
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

    row.onclick = () => {
      this.selectedPath = entity.path;
      this.renderList();
      this.renderDetail();
    };
    row.oncontextmenu = (e) => {
      e.preventDefault();
      const menu = new Menu();
      menu.addItem((i) =>
        i.setTitle("Open note").setIcon("file-text").onClick(() => openScene(this.app, file))
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

  /** Render the profile editor for the selected entity (or a placeholder). */
  private renderDetail(): void {
    const host = this.detailEl;
    if (!host) return;
    host.empty();

    const entity = this.selectedPath
      ? getCodexEntities(this.app).find((e) => e.path === this.selectedPath)
      : undefined;
    const file = entity ? this.app.vault.getAbstractFileByPath(entity.path) : null;
    if (!entity || !(file instanceof TFile)) {
      host.createDiv({
        cls: "inkswell-inspector__empty",
        text: "Select a codex entry to edit its profile.",
      });
      return;
    }

    const head = host.createDiv({ cls: "inkswell-codex__detail-head" });
    head.createDiv({ cls: "inkswell-inspector__title", text: entity.name });
    head.createDiv({
      cls: "inkswell-inspector__project",
      text: categoryLabel(entity.category),
    });
    const openBtn = head.createEl("button", { text: "Open note" });
    openBtn.onclick = () => openScene(this.app, file);

    const profile = readProfile(this.app, file, entity.category);
    const entities = getCodexEntities(this.app);
    for (const field of profileFields(entity.category)) {
      this.renderField(host, file, entity, field, profile, entities);
    }

    // Read-only: scenes that link this entity (characters/location frontmatter).
    const scenes = scenesReferencing(this.app, entity.name);
    this.field(host, "Appears in", (control) => {
      if (scenes.length === 0) {
        control.createSpan({ cls: "inkswell-stats__muted", text: "No scenes link this yet." });
        return;
      }
      const wrap = control.createDiv({ cls: "inkswell-codex__refs" });
      for (const s of scenes) {
        const ref = wrap.createSpan({ cls: "inkswell-chip", text: s.basename });
        ref.onclick = () => openScene(this.app, s);
      }
    });
  }

  private renderField(
    host: HTMLElement,
    file: TFile,
    entity: CodexEntity,
    field: ProfileField,
    profile: Profile,
    entities: CodexEntity[]
  ): void {
    const save = async (value: Profile[string]) => {
      await writeProfile(this.app, file, entity.category, { [field.key]: value });
    };
    // Re-render the detail after structural edits (chips, alias/parent changes
    // that the list also shows).
    const saveAndRefresh = async (value: Profile[string]) => {
      await save(value);
      this.renderList();
      this.renderDetail();
    };

    this.field(host, field.label, (control) => {
      if (field.type === "text") {
        const t = control.createEl("input", { type: "text" });
        t.value = (profile[field.key] as string) ?? "";
        if (field.placeholder) t.placeholder = field.placeholder;
        t.onchange = () => void save(t.value);
        return;
      }
      if (field.type === "textarea") {
        const ta = control.createEl("textarea", { cls: "inkswell-inspector__textarea" });
        ta.rows = 3;
        ta.value = (profile[field.key] as string) ?? "";
        if (field.placeholder) ta.placeholder = field.placeholder;
        ta.onchange = () => void save(ta.value);
        return;
      }
      if (field.type === "list") {
        const current = (profile[field.key] as string[]) ?? [];
        const chips = control.createDiv({ cls: "inkswell-inspector__chips" });
        for (const val of current) {
          const chip = chips.createSpan({ cls: "inkswell-chip", text: val });
          const x = chip.createSpan({ cls: "inkswell-chip__x", text: "×" });
          x.onclick = () => void saveAndRefresh(current.filter((c) => c !== val));
        }
        const input = control.createEl("input", { type: "text" });
        input.placeholder = field.placeholder ?? "Add…";
        input.onkeydown = (e) => {
          if (e.key !== "Enter") return;
          const v = input.value.trim();
          if (v && !current.includes(v)) void saveAndRefresh([...current, v]);
        };
        return;
      }
      // links
      this.renderLinkField(control, field, profile, entities, entity, saveAndRefresh);
    });
  }

  private renderLinkField(
    control: HTMLElement,
    field: ProfileField,
    profile: Profile,
    entities: CodexEntity[],
    self: CodexEntity,
    saveAndRefresh: (value: Profile[string]) => void
  ): void {
    const candidates = entities.filter(
      (e) =>
        e.path !== self.path &&
        (!field.linkCategory || e.category === field.linkCategory)
    );

    if (field.single) {
      const cur = profile[field.key] ? linkTarget(profile[field.key] as string) : "";
      const sel = control.createEl("select", { cls: "dropdown" });
      sel.createEl("option", { text: "— none —", value: "" });
      for (const c of candidates) sel.createEl("option", { text: c.name, value: c.name });
      sel.value = candidates.some((c) => c.name === cur) ? cur : "";
      sel.onchange = () => saveAndRefresh(sel.value ? toLink(sel.value) : "");
      return;
    }

    const current = (profile[field.key] as string[]) ?? [];
    const chips = control.createDiv({ cls: "inkswell-inspector__chips" });
    for (const link of current) {
      const chip = chips.createSpan({ cls: "inkswell-chip", text: linkTarget(link) });
      const x = chip.createSpan({ cls: "inkswell-chip__x", text: "×" });
      x.onclick = () => saveAndRefresh(current.filter((c) => c !== link));
    }
    const remaining = candidates.filter(
      (c) => !current.some((link) => linkTarget(link) === c.name)
    );
    if (remaining.length > 0) {
      const add = control.createEl("select", { cls: "dropdown" });
      add.createEl("option", { text: `+ add ${field.label.toLowerCase()}`, value: "" });
      for (const c of remaining) add.createEl("option", { text: c.name, value: c.name });
      add.value = "";
      add.onchange = () => {
        if (add.value) saveAndRefresh([...current, toLink(add.value)]);
      };
    } else if (candidates.length === 0) {
      const cat = field.linkCategory ? categoryLabel(field.linkCategory).toLowerCase() : "entity";
      control.createSpan({ cls: "inkswell-stats__muted", text: `No ${cat} entries in codex.` });
    }
  }

  private field(parent: HTMLElement, label: string, build: (host: HTMLElement) => void): void {
    const f = parent.createDiv({ cls: "inkswell-inspector__field" });
    if (label) f.createDiv({ cls: "inkswell-inspector__label", text: label });
    build(f.createDiv({ cls: "inkswell-inspector__control" }));
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
    if (this.selectedPath === file.path) this.selectedPath = path;
    this.renderList();
    this.renderDetail();
  }

  private async remove(file: TFile, name: string): Promise<void> {
    const ok = await confirmDelete(this.app, `Delete codex entry "${name}"? It will be moved to trash.`);
    if (!ok) return;
    await this.app.fileManager.trashFile(file);
    if (this.selectedPath === file.path) this.selectedPath = null;
    this.renderList();
    this.renderDetail();
  }
}
