/**
 * How Write's side panel (the right column) is laid out on this device: its
 * width, whether it's hidden, and which panel it shows. Device-local on
 * purpose (`window.localStorage`, scoped by vault name, like write-mode.ts): a
 * width dragged on a wide monitor shouldn't follow the vault to a laptop.
 *
 * No Obsidian import, so the parsing and clamping are unit-tested.
 */

/** The column's width before anyone drags it (matches the stylesheet). */
export const SIDE_WIDTH_DEFAULT = 260;
export const SIDE_WIDTH_MIN = 220;
export const SIDE_WIDTH_MAX = 640;
/** The prose keeps at least this much, whatever the side panel asks for. */
export const EDITOR_WIDTH_MIN = 320;
/** One arrow-key press on the focused divider. */
export const SIDE_WIDTH_STEP = 16;

export interface WriteLayout {
  /** Dragged width in px; null = the stylesheet's default. */
  sideWidth: number | null;
  sideCollapsed: boolean;
  /** Id of the panel showing; null = the first one. */
  sidePanel: string | null;
}

export const DEFAULT_WRITE_LAYOUT: WriteLayout = {
  sideWidth: null,
  sideCollapsed: false,
  sidePanel: null,
};

/**
 * Fit a wanted width to the limits. `available` is the room the editor and the
 * side panel share (the row minus the scene list); when given, the editor
 * keeps EDITOR_WIDTH_MIN of it. The minimum wins when the two can't both hold.
 */
export function clampSideWidth(width: number, available?: number): number {
  let max = SIDE_WIDTH_MAX;
  if (available !== undefined && Number.isFinite(available)) {
    max = Math.min(max, available - EDITOR_WIDTH_MIN);
  }
  return Math.round(Math.max(SIDE_WIDTH_MIN, Math.min(width, max)));
}

/** Read a stored layout, tolerating anything (older shape, hand edits, junk). */
export function parseWriteLayout(raw: string | null | undefined): WriteLayout {
  if (!raw) return { ...DEFAULT_WRITE_LAYOUT };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_WRITE_LAYOUT };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ...DEFAULT_WRITE_LAYOUT };
  }
  const o = parsed as Record<string, unknown>;
  const width = o.sideWidth;
  const panel = o.sidePanel;
  return {
    sideWidth: typeof width === "number" && Number.isFinite(width) ? clampSideWidth(width) : null,
    sideCollapsed: o.sideCollapsed === true,
    sidePanel: typeof panel === "string" && panel ? panel : null,
  };
}

const key = (vaultName: string): string => `inkswell-write-layout:${vaultName}`;

export function loadWriteLayout(vaultName: string): WriteLayout {
  try {
    return parseWriteLayout(window.localStorage.getItem(key(vaultName)));
  } catch {
    return { ...DEFAULT_WRITE_LAYOUT };
  }
}

export function saveWriteLayout(vaultName: string, layout: WriteLayout): void {
  try {
    window.localStorage.setItem(key(vaultName), JSON.stringify(layout));
  } catch {
    /* storage unavailable: the layout lasts for this session */
  }
}
