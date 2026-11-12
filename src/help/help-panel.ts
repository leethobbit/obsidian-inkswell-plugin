/**
 * The Help index destination: the full in-app reference, one collapsible section
 * per phase. Mirrors the other panels (a class with `render(container)` using
 * Obsidian's DOM helpers and the `inkswell-` namespace).
 */

import { App, Notice, setIcon } from "obsidian";
import type InkswellPlugin from "../../main";
import { t } from "../i18n";
import { fillTemplate } from "../i18n/dom";
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

    container.createEl("h2", { cls: "inkswell-help__title", text: t("help.panel.title") });
    container.createEl("p", { cls: "inkswell-stats__muted", text: t("help.panel.intro") });
    const shape = container.createEl("p", { cls: "inkswell-stats__muted" });
    fillTemplate(shape, t("help.panel.shape"), {
      link: (parent) => {
        const link = parent.createEl("a", { text: t("help.panel.shape.link") });
        link.onclick = (e) => {
          e.preventDefault();
          void this.plugin.openCustomize();
        };
      },
    });

    for (const section of HELP_SECTIONS) {
      const sec = container.createEl("details", { cls: "inkswell-stats__section inkswell-help__section" });
      const summary = sec.createEl("summary", { cls: "inkswell-help__summary" });
      setIcon(summary.createSpan({ cls: "inkswell-help__icon" }), section.icon);
      summary.createSpan({ cls: "inkswell-help__phase", text: t(section.phaseKey) });
      summary.createSpan({ cls: "inkswell-stats__muted", text: t(section.summaryKey) });
      const body = sec.createDiv({ cls: "inkswell-help__body" });
      section.body(body);
    }

    const footer = container.createDiv({ cls: "inkswell-help__footer" });
    const reset = footer.createEl("button", { text: t("help.panel.reset") });
    reset.onclick = async () => {
      await resetHelpState(this.plugin);
      this.plugin.refreshExplorer();
      new Notice(t("help.panel.reset.done"));
      new WelcomeModal(this.app, this.plugin).open();
    };
  }
}
