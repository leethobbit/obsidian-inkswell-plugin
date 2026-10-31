/**
 * Which view Write opens in on this device: one scene at a time, or the
 * stream. Device-local on purpose (`window.localStorage`, scoped by vault
 * name, like the device id in src/tracking/device.ts): a phone never inherits
 * a desktop's stream through a synced data.json, and a new install starts on
 * the familiar single-scene view.
 */

export type WriteMode = "scene" | "stream";

const key = (vaultName: string): string => `inkswell-write-mode:${vaultName}`;

export function loadWriteMode(vaultName: string): WriteMode {
  try {
    return window.localStorage.getItem(key(vaultName)) === "stream" ? "stream" : "scene";
  } catch {
    return "scene";
  }
}

export function saveWriteMode(vaultName: string, mode: WriteMode): void {
  try {
    window.localStorage.setItem(key(vaultName), mode);
  } catch {
    /* storage unavailable: the choice lasts for this session */
  }
}
