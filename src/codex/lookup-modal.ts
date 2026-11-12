/**
 * "Look up in Codex" when no name is under the cursor: type a few letters,
 * pick an entry, and its card opens as a peek (Esc closes it and you're back
 * where you were). Searches name, aliases and role / type, like the Codex.
 */

import { App, SuggestModal } from "obsidian";
import type InkswellPlugin from "../../main";
import { t } from "../i18n";
import { codexSearchMatch } from "./codex-list";
import { CodexEntity, categoryDisplayName } from "./types";

export class CodexLookupModal extends SuggestModal<CodexEntity> {
  constructor(
    app: App,
    private plugin: InkswellPlugin,
    private entities: readonly CodexEntity[],
    private onPick: (entity: CodexEntity) => void
  ) {
    super(app);
    this.setPlaceholder(t("peek.lookUpPlaceholder"));
    this.emptyStateText = t("peek.lookUpEmpty");
  }

  getSuggestions(query: string): CodexEntity[] {
    const q = query.trim().toLowerCase();
    return this.entities
      .filter((e) => codexSearchMatch(e, q) !== null)
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 50);
  }

  renderSuggestion(entity: CodexEntity, el: HTMLElement): void {
    const s = this.plugin.settings;
    el.createDiv({ text: entity.name });
    el.createDiv({
      cls: "inkswell-stats__muted",
      text: categoryDisplayName(entity.category, s.customCategories, s.categoryOverrides),
    });
  }

  onChooseSuggestion(entity: CodexEntity): void {
    // After the modal has closed and handed focus back, so the peek's
    // outside-click watcher doesn't see the choosing click.
    window.setTimeout(() => this.onPick(entity), 0);
  }
}
