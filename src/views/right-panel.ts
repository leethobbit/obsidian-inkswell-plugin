/**
 * Write's side panel (the right column) is a small pluggable "panel slot": one
 * of a set of panels (Scene details, Codex, Plan, Revision) chosen via a
 * switcher, rather than a hardcoded single inspector. New panels drop into the
 * registry (WritePanel.rightPanels) without touching the single-host-view
 * architecture. The column can be dragged wider, hidden, and driven from the
 * command palette (write-layout.ts holds its per-device state).
 *
 * A panel receives the currently-open scene file (or null) each render and owns
 * its own container; other dependencies (store, callbacks) come via its
 * constructor, exactly like the existing panels.
 */

import type { TFile } from "obsidian";
import type { MessageKey } from "../i18n/locales/en";

export interface RightPanel {
  /** Stable id (also the remembered-selection key). */
  id: string;
  /** Short label shown on the slot's segmented switcher. */
  label: string;
  /** Render this panel for the open scene file (null = no scene open). */
  render(host: HTMLElement, file: TFile | null): void;
  /** A vault file was saved while this panel is showing; it decides whether it
   *  cares. Never called per keystroke (a scene is written on autosave/blur). */
  onVaultModify?(file: TFile): void;
  /** The Write panel is going away for good. */
  dispose?(): void;
}

/**
 * The slot's panels, in switcher order, for the "show … in the side panel"
 * commands (registered in main.ts before any Write panel exists). Keep in step
 * with WritePanel.rightPanels: `id` must match a panel's `id`.
 */
export const SIDE_PANELS: readonly { id: string; nameKey: MessageKey }[] = [
  { id: "scene", nameKey: "write.side.panel.scene" },
  { id: "codex", nameKey: "companion.codex.name" },
  { id: "plan", nameKey: "companion.plan.name" },
  { id: "revision", nameKey: "write.side.panel.revision" },
];
