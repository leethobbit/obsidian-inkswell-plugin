/**
 * One-time welcome shown on first launch. Orients the user to the phase pipeline
 * and points at the contextual tips, then sets `welcomeSeen` so it never nags
 * again. Re-armed via Settings → Help → "Reset tips & replay welcome".
 */

import { App, Modal, setIcon } from "obsidian";
import type InkswellPlugin from "../../main";
import { MessageKey, t } from "../i18n";

interface Phase {
  icon: string;
  nameKey: MessageKey;
  blurbKey: MessageKey;
}

const PHASES: Phase[] = [
  { icon: "compass", nameKey: "welcome.phase.plan.name", blurbKey: "welcome.phase.plan.blurb" },
  { icon: "pencil", nameKey: "welcome.phase.write.name", blurbKey: "welcome.phase.write.blurb" },
  { icon: "git-compare", nameKey: "welcome.phase.revise.name", blurbKey: "welcome.phase.revise.blurb" },
  { icon: "upload", nameKey: "welcome.phase.publish.name", blurbKey: "welcome.phase.publish.blurb" },
  { icon: "book-marked", nameKey: "welcome.phase.codex.name", blurbKey: "welcome.phase.codex.blurb" },
  { icon: "bar-chart-3", nameKey: "welcome.phase.track.name", blurbKey: "welcome.phase.track.blurb" },
];

export class WelcomeModal extends Modal {
  constructor(
    app: App,
    private plugin: InkswellPlugin
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("inkswell-welcome");

    contentEl.createEl("h2", { text: t("welcome.title") });
    contentEl.createEl("p", { cls: "inkswell-stats__muted", text: t("welcome.intro") });

    const grid = contentEl.createDiv({ cls: "inkswell-welcome__grid" });
    for (const phase of PHASES) {
      const card = grid.createDiv({ cls: "inkswell-welcome__card" });
      setIcon(card.createSpan({ cls: "inkswell-welcome__icon" }), phase.icon);
      const text = card.createDiv({ cls: "inkswell-welcome__text" });
      text.createSpan({ cls: "inkswell-welcome__name", text: t(phase.nameKey) });
      text.createSpan({ cls: "inkswell-stats__muted", text: t(phase.blurbKey) });
    }

    contentEl.createEl("p", { text: t("welcome.tips") });

    const actions = contentEl.createDiv({ cls: "inkswell-welcome__actions" });
    const start = actions.createEl("button", { cls: "mod-cta", text: t("welcome.start") });
    start.onclick = () => this.close();
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.plugin.settings.welcomeSeen) {
      this.plugin.settings.welcomeSeen = true;
      // Modal.onClose is void; persist without awaiting (fire-and-forget).
      void this.plugin.saveSettings();
    }
  }
}
