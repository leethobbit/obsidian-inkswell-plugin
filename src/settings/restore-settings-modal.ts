/**
 * "Restore settings from a backup" (#61): pick one of the daily data.json
 * backups and bring back ITS SETTINGS ONLY — custom codex types, renamed
 * types, Customize changes, the rail arrangement, preferences. Writing
 * history, ideas and the open project stay as they are now, so recovering a
 * lost custom type doesn't also roll back the words written since.
 *
 * Each row shows the backup's day and what it holds (`settingsSummary`), so a
 * writer can spot the one from before something went wrong.
 */

import { App, SuggestModal } from "obsidian";
import { BackupSnapshot } from "../lib/data-backup";
import { settingsSummary } from "../lib/stored-data";
import { t } from "../i18n";

export class RestoreSettingsModal extends SuggestModal<BackupSnapshot> {
  constructor(
    app: App,
    private backups: BackupSnapshot[],
    private onChoose: (backup: BackupSnapshot) => void
  ) {
    super(app);
    this.setPlaceholder(t("settings.restore.placeholder"));
  }

  getSuggestions(query: string): BackupSnapshot[] {
    const q = query.trim().toLowerCase();
    return this.backups.filter(
      (b) => !q || b.date.includes(q) || settingsSummary(b.data.settings).toLowerCase().includes(q)
    );
  }

  renderSuggestion(b: BackupSnapshot, el: HTMLElement): void {
    el.createDiv({ text: b.date });
    el.createEl("small", { cls: "inkswell-stats__muted", text: settingsSummary(b.data.settings) });
  }

  onChooseSuggestion(b: BackupSnapshot): void {
    this.onChoose(b);
  }
}
