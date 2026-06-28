/**
 * One-time welcome shown on first launch. Orients the user to the phase pipeline
 * and points at the contextual tips, then sets `welcomeSeen` so it never nags
 * again. Re-armed via Settings → Help → "Reset tips & replay welcome".
 */

import { App, Modal, setIcon } from "obsidian";
import type InkswellPlugin from "../../main";

interface Phase {
  icon: string;
  name: string;
  blurb: string;
}

const PHASES: Phase[] = [
  { icon: "compass", name: "Plan", blurb: "Beat sheet, board, and overview." },
  { icon: "pencil", name: "Write", blurb: "Focused editor with to-do markers." },
  { icon: "git-compare", name: "Revise", blurb: "Audit, decision log, and sweeps." },
  { icon: "upload", name: "Publish", blurb: "Compile and launch your book." },
  { icon: "book-marked", name: "Codex", blurb: "Your story bible, used throughout." },
  { icon: "bar-chart-3", name: "Track", blurb: "Word counts, streaks, and sprints." },
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

    contentEl.createEl("h2", { text: "Welcome to Inkswell" });
    contentEl.createEl("p", {
      cls: "inkswell-stats__muted",
      text:
        "A complete workbench for novelists — one tab, organised by the phase you're " +
        "in. Switch phases from the icon rail on the left:",
    });

    const grid = contentEl.createDiv({ cls: "inkswell-welcome__grid" });
    for (const phase of PHASES) {
      const card = grid.createDiv({ cls: "inkswell-welcome__card" });
      setIcon(card.createSpan({ cls: "inkswell-welcome__icon" }), phase.icon);
      const text = card.createDiv({ cls: "inkswell-welcome__text" });
      text.createSpan({ cls: "inkswell-welcome__name", text: phase.name });
      text.createSpan({ cls: "inkswell-stats__muted", text: phase.blurb });
    }

    contentEl.createEl("p", {
      text:
        "New to a panel? Look for the “How this works” tip at the top — dismiss it once " +
        "you've got it. The Help tab in the rail keeps the full guide.",
    });

    const actions = contentEl.createDiv({ cls: "inkswell-welcome__actions" });
    const start = actions.createEl("button", { cls: "mod-cta", text: "Get started" });
    start.onclick = () => this.close();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
    if (!this.plugin.settings.welcomeSeen) {
      this.plugin.settings.welcomeSeen = true;
      await this.plugin.saveSettings();
    }
  }
}
