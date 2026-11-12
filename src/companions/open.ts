/**
 * Opening companions: the one place that decides where a companion goes. An
 * open companion is brought forward, never duplicated; a new one goes into its
 * default sidebar, and after that Obsidian remembers wherever you move it.
 */

import { App, SuggestModal, WorkspaceLeaf, setIcon } from "obsidian";
import type InkswellPlugin from "../../main";
import { t } from "../i18n";
import { CompanionDef, CompanionId, companionById, visibleCompanions } from "./registry";

/** Show companion `id`, opening it in its default sidebar if it isn't open. */
export async function openCompanion(plugin: InkswellPlugin, id: CompanionId): Promise<void> {
  const def = companionById(id);
  const ws = plugin.app.workspace;
  const existing = ws.getLeavesOfType(def.viewType)[0];
  if (existing) {
    await ws.revealLeaf(existing);
    return;
  }
  const leaf = def.side === "left" ? ws.getLeftLeaf(false) : ws.getRightLeaf(false);
  if (!leaf) return;
  await leaf.setViewState({ type: def.viewType, active: true });
  await ws.revealLeaf(leaf);
}

/**
 * Turn `leaf` (the full Inkswell view, dragged into a sidebar) into companion
 * `id` — or, when that companion is already open elsewhere, close this leaf
 * and bring that one forward.
 */
export async function replaceWithCompanion(
  plugin: InkswellPlugin,
  leaf: WorkspaceLeaf,
  id: CompanionId
): Promise<void> {
  const def = companionById(id);
  const ws = plugin.app.workspace;
  const existing = ws.getLeavesOfType(def.viewType)[0];
  if (existing && existing !== leaf) {
    leaf.detach();
    await ws.revealLeaf(existing);
    return;
  }
  await leaf.setViewState({ type: def.viewType, active: true });
  await ws.revealLeaf(leaf);
}

/** "Open a companion…": pick one of the enabled companions. */
export class CompanionPickerModal extends SuggestModal<CompanionDef> {
  constructor(
    app: App,
    private plugin: InkswellPlugin
  ) {
    super(app);
    this.setPlaceholder(t("companion.pickerPlaceholder"));
  }

  getSuggestions(query: string): CompanionDef[] {
    const q = query.trim().toLowerCase();
    return visibleCompanions(this.plugin.settings.disabledFeatures).filter((c) =>
      t(c.labelKey).toLowerCase().includes(q)
    );
  }

  renderSuggestion(def: CompanionDef, el: HTMLElement): void {
    el.addClass("inkswell-companion-pick");
    setIcon(el.createSpan({ cls: "inkswell-companion-pick__icon" }), def.icon);
    el.createSpan({ text: t(def.labelKey) });
  }

  onChooseSuggestion(def: CompanionDef): void {
    void openCompanion(this.plugin, def.id);
  }
}
