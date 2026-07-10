/**
 * The Write tab's right column is a small pluggable "panel slot": one of a set of
 * panels (Scene inspector, Revision, …) chosen via a switcher, rather than a
 * hardcoded single inspector. This is the contained first step toward a modular
 * workspace — new panels drop into the registry (WritePanel.rightPanels) without
 * touching the single-host-view architecture. (Full dockable/pop-out leaves are a
 * separate, deferred decision.)
 *
 * A panel receives the currently-open scene file (or null) each render and owns
 * its own container; other dependencies (store, callbacks) come via its
 * constructor, exactly like the existing panels.
 */

import { TFile } from "obsidian";

export interface RightPanel {
  /** Stable id (also the remembered-selection key). */
  id: string;
  /** Short label shown on the slot's segmented switcher. */
  label: string;
  /** Render this panel for the open scene file (null = no scene open). */
  render(host: HTMLElement, file: TFile | null): void;
}
