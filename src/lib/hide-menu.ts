/**
 * The in-place "Hide <feature>" affordance: right-click an optional tab, view
 * button, or toolbar control to hide that feature where you're looking at it.
 * One implementation for the host's sub-tabs, Structure's view switcher, and the
 * Write toolbar (they used to carry three copies).
 *
 * The toast offers Undo, and points at Customize → Features (where the toggles
 * live) rather than the Settings tab.
 */

import { Menu, Notice } from "obsidian";
import type InkswellPlugin from "../../main";
import type { FeatureId } from "../features";
import { t } from "../i18n";
import { fillTemplate } from "../i18n/dom";

/**
 * What the hide affordance says. A plain string is a capitalized NAME ("Board
 * view", "Beats"): the item reads "Hide {label}" and the toast "{label} hidden.".
 * A name that only works mid-sentence ("the scene stream") must pass both
 * phrases translated in full — `title` ("Hide the scene stream") and `hidden`
 * ("The scene stream hidden.") — since word order and capitalization vary by language.
 */
export type HideLabel = string | { title: string; hidden: string };

export function attachHideMenu(
  el: HTMLElement,
  plugin: InkswellPlugin,
  feature: FeatureId,
  label: HideLabel
): void {
  el.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const menu = new Menu();
    addHideItem(menu, plugin, feature, label);
    menu.showAtMouseEvent(e);
  });
}

/** The "Hide <feature>" item (with its Undo toast), for menus that carry other items too. */
export function addHideItem(menu: Menu, plugin: InkswellPlugin, feature: FeatureId, label: HideLabel): void {
  const title = typeof label === "string" ? t("lib.hideMenu.item", { label }) : label.title;
  const hidden = typeof label === "string" ? t("lib.hideMenu.hidden", { label }) : label.hidden;
  menu.addItem((i) =>
    i
      .setTitle(title)
      .setIcon("eye-off")
      .onClick(() => {
        void plugin.setFeatureEnabled(feature, false);
        // A fragment (not `noticeEl`/`messageEl`, deprecated / above the API
        // floor) carries the Undo link. Long enough to reach it; Undo dismisses.
        let notice: Notice | null = null;
        const body = createFragment((frag) => {
          fillTemplate(frag.createSpan(), t("lib.hideMenu.notice", { hidden }), {
            undo: (parent) => {
              const undo = parent.createEl("a", { text: t("lib.hideMenu.undo") });
              undo.onclick = (ev) => {
                ev.preventDefault();
                void plugin.setFeatureEnabled(feature, true);
                notice?.hide();
              };
            },
          });
        });
        notice = new Notice(body, 8000);
      })
  );
}
