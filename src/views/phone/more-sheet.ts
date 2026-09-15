/**
 * The phone "More" action sheet — an Obsidian Menu (renders as a native bottom
 * sheet on mobile, the same proven touch path as attachRowMenu). Rows derive
 * from the single nav model: quick capture first, then the phone-usable slices,
 * a separator, and the larger-screen-only destinations (which show the "use a
 * larger screen" redirect when tapped). Bar destinations aren't repeated here.
 */
import { Menu } from "obsidian";
import { Destination, InkswellMode, destinationEnabled, phoneMoreDestinations } from "../nav-model";

export function openMoreSheet(
  e: MouseEvent,
  go: (mode: InkswellMode, subtab?: string) => void,
  onCapture: () => void,
  /** Feature ids the writer hid — a gated destination (Track) drops out of the sheet. */
  disabledFeatures: readonly string[] = []
): void {
  const menu = new Menu();
  menu.addItem((i) => i.setTitle("Capture idea").setIcon("plus").onClick(() => onCapture()));
  const all = phoneMoreDestinations();
  const usable = all.usable.filter((d) => destinationEnabled(d, disabledFeatures));
  const redirected = all.redirected.filter((d) => destinationEnabled(d, disabledFeatures));
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
