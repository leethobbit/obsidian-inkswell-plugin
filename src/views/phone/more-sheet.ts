/**
 * The phone "More" action sheet — an Obsidian Menu (renders as a native bottom
 * sheet on mobile, the same proven touch path as attachRowMenu). Surfaces quick
 * capture, the read-mostly phone slices (Track, To-dos) plus Help, and the
 * larger-screen-only destinations (which then show the "use a larger screen"
 * redirect). Codex lives on the bottom bar, so it's not repeated here.
 */
import { Menu } from "obsidian";
import type { InkswellMode } from "../inkswell-view";

export function openMoreSheet(
  e: MouseEvent,
  go: (mode: InkswellMode, subtab?: string) => void,
  onCapture: () => void
): void {
  const menu = new Menu();
  menu.addItem((i) => i.setTitle("Capture idea").setIcon("plus").onClick(() => onCapture()));
  menu.addItem((i) => i.setTitle("Track").setIcon("bar-chart-3").onClick(() => go("track")));
  menu.addItem((i) =>
    i.setTitle("To-dos").setIcon("list-checks").onClick(() => go("revise", "todos"))
  );
  menu.addItem((i) => i.setTitle("Help").setIcon("help-circle").onClick(() => go("help")));
  menu.addSeparator();
  // Larger-screen destinations — tapping shows the "use a larger screen" notice.
  menu.addItem((i) => i.setTitle("Plan").setIcon("compass").onClick(() => go("plan")));
  menu.addItem((i) => i.setTitle("Publish").setIcon("upload").onClick(() => go("publish")));
  menu.showAtMouseEvent(e);
}
