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

export function attachHideMenu(
  el: HTMLElement,
  plugin: InkswellPlugin,
  feature: FeatureId,
  label: string
): void {
  el.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const menu = new Menu();
    menu.addItem((i) =>
      i
        .setTitle(`Hide ${label}`)
        .setIcon("eye-off")
        .onClick(() => {
          void plugin.setFeatureEnabled(feature, false);
          const sentence = label.charAt(0).toUpperCase() + label.slice(1);
          // A fragment (not `noticeEl`/`messageEl`, deprecated / above the API
          // floor) carries the Undo link. Long enough to reach it; Undo dismisses.
          let notice: Notice | null = null;
          const body = createFragment((frag) => {
            frag.appendText(`${sentence} hidden. `);
            const undo = frag.createEl("a", { text: "Undo" });
            undo.onclick = (ev) => {
              ev.preventDefault();
              void plugin.setFeatureEnabled(feature, true);
              notice?.hide();
            };
            frag.appendText(" — or turn it back on under Customize → Features.");
          });
          notice = new Notice(body, 8000);
        })
    );
    menu.showAtMouseEvent(e);
  });
}
