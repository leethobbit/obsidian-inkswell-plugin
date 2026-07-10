/**
 * The Help index destination: the full in-app reference, one collapsible section
 * per phase. Mirrors the other panels (a class with `render(container)` using
 * Obsidian's DOM helpers and the `inkswell-` namespace).
 */

import { App, Notice, setIcon } from "obsidian";
import type InkswellPlugin from "../../main";
import { HELP_SECTIONS } from "./help-content";
import { resetHelpState } from "./hint";
import { WelcomeModal } from "./welcome-modal";

export class HelpPanel {
  constructor(
    private app: App,
    private plugin: InkswellPlugin
  ) {}

  render(container: HTMLElement): void {
    container.empty();
    container.addClass("inkswell-help");

    container.createEl("h2", { cls: "inkswell-help__title", text: "How Inkswell works" });
    container.createEl("p", {
      cls: "inkswell-stats__muted",
      text:
        "A reference for every part of the workbench. The pipeline runs Plan → Write → " +
        "Revise → Publish, with Codex and Track alongside. Expand a section to dig in.",
    });
    container.createEl("p", {
      cls: "inkswell-stats__muted",
      text:
        "Not using a surface? Hide it in Settings → Features (or right-click an optional " +
        "tab). Hiding is lossless — your data is kept and turning it back on restores it.",
    });

    for (const section of HELP_SECTIONS) {
      const sec = container.createEl("details", { cls: "inkswell-stats__section inkswell-help__section" });
      const summary = sec.createEl("summary", { cls: "inkswell-help__summary" });
      setIcon(summary.createSpan({ cls: "inkswell-help__icon" }), section.icon);
      summary.createSpan({ cls: "inkswell-help__phase", text: section.phase });
      summary.createSpan({ cls: "inkswell-stats__muted", text: section.summary });
      const body = sec.createDiv({ cls: "inkswell-help__body" });
      section.body(body);
    }

    const footer = container.createDiv({ cls: "inkswell-help__footer" });
    const reset = footer.createEl("button", { text: "Reset tips & replay welcome" });
    reset.onclick = async () => {
      await resetHelpState(this.plugin);
      this.plugin.refreshExplorer();
      new Notice("Tips reset.");
      new WelcomeModal(this.app, this.plugin).open();
    };
  }
}
