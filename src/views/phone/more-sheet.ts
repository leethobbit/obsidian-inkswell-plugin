/**
 * The phone "More" action sheet — an Obsidian Menu (renders as a native bottom
 * sheet on mobile, the same proven touch path as attachRowMenu). Rows derive
 * from the single nav model: quick capture first, then the phone-usable slices,
 * a separator, and the larger-screen-only destinations (which show the "use a
 * larger screen" redirect when tapped). Bar destinations aren't repeated here.
 */
import { Menu } from "obsidian";
import { Destination, InkswellMode, phoneMoreDestinations } from "../nav-model";

export function openMoreSheet(
  e: MouseEvent,
  go: (mode: InkswellMode, subtab?: string) => void,
  onCapture: () => void
): void {
  const menu = new Menu();
  menu.addItem((i) => i.setTitle("Capture idea").setIcon("plus").onClick(() => onCapture()));
  const { usable, redirected } = phoneMoreDestinations();
  const addRow = (d: Destination) =>
    menu.addItem((i) =>
      i
        .setTitle(d.phone?.label ?? d.label)
        .setIcon(d.icon)
        .onClick(() => go(d.id, d.phone?.subtab))
    );
  usable.forEach(addRow);
  menu.addSeparator();
  redirected.forEach(addRow);
  menu.showAtMouseEvent(e);
}
