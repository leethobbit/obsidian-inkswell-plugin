/**
 * Which device is this? Writing history is per device (words are counted where
 * they're typed), so the cross-device mirror needs a stable, DEVICE-LOCAL id.
 * `window.localStorage` is exactly that: per app install, never synced. (The
 * `App.loadLocalStorage` helpers would be nicer but need Obsidian 1.8.7, above
 * our floor.) The key is scoped by vault name so two vaults on one machine
 * don't share an id.
 *
 * Known limitation: clearing the app's site data mints a new id, and the old
 * device's log note becomes an orphan the user deletes by hand.
 */

import { Platform } from "obsidian";

export interface DeviceIdentity {
  /** Stable random id (base36). */
  id: string;
  /** Default human label, e.g. "iPad" — the log note's `device` property overrides it. */
  name: string;
}

const key = (vaultName: string): string => `inkswell-device:${vaultName}`;

function newId(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 36 ** 6).toString(36)}`;
}

/** A default label from the platform: "iPad", "iPhone", "Android tablet", "Android phone", "Mac", "Desktop". */
export function defaultDeviceName(): string {
  if (Platform.isIosApp) return Platform.isTablet ? "iPad" : "iPhone";
  if (Platform.isAndroidApp) return Platform.isTablet ? "Android tablet" : "Android phone";
  if (Platform.isMacOS) return "Mac";
  return "Desktop";
}

/** This device's identity for `vaultName`, minted and stored on first use. */
export function deviceIdentity(vaultName: string): DeviceIdentity {
  const storage = window.localStorage;
  try {
    const raw = storage.getItem(key(vaultName));
    if (raw) {
      const parsed = JSON.parse(raw) as { id?: unknown; name?: unknown };
      if (typeof parsed.id === "string" && parsed.id) {
        const name =
          typeof parsed.name === "string" && parsed.name.trim() ? parsed.name : defaultDeviceName();
        return { id: parsed.id, name };
      }
    }
  } catch {
    /* unreadable → mint a new one below */
  }
  const fresh = { id: newId(), name: defaultDeviceName() };
  try {
    storage.setItem(key(vaultName), JSON.stringify(fresh));
  } catch {
    /* storage unavailable: a session-only id still works for this run */
  }
  return fresh;
}
