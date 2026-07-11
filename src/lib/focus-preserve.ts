/**
 * Keep focus, caret, and in-flight text alive across a DOM rebuild.
 *
 * Inline form fields (codex profile, scene meta) are recreated wholesale when
 * their panel re-renders. If that happens while the user is typing, the fresh
 * element is seeded from (possibly stale) frontmatter with the caret at 0 —
 * on mobile that manifests as text entering backwards. Rebuilds that must
 * happen (chip lists refreshing, an external change landing mid-edit) get
 * wrapped in `preserveFocus`, which re-finds the recreated field by its
 * stable tag and restores what the user had.
 *
 * Fields opt in via `tagField(el, "scope:key")` — the tag must be unique
 * within the rebuilt subtree.
 */

/** How much of the field's state can be carried across the rebuild.
 *  `setSelectionRange` THROWS on inputs that don't support selection
 *  (number, checkbox, date…), so caret restore is opt-in by input type. */
type RestoreMode = "text" | "value" | "focus";

/** Input types where value + caret restore are both valid. */
const SELECTABLE_TYPES = new Set(["text", "search", "url", "tel", "password"]);

interface SavedField {
  key: string;
  mode: RestoreMode;
  value: string;
  selectionStart: number | null;
  selectionEnd: number | null;
  scrollTop: number;
}

/** Stamp a stable identity on a rebuilt-able field so it can be re-found. */
export function tagField(el: HTMLElement, key: string): void {
  el.dataset.inkswellField = key;
}

function modeFor(el: HTMLElement): RestoreMode {
  if (el.instanceOf(HTMLTextAreaElement)) return "text";
  if (el.instanceOf(HTMLInputElement)) {
    if (SELECTABLE_TYPES.has(el.type)) return "text";
    if (el.type === "number") return "value";
  }
  return "focus"; // selects, checkboxes, anything else
}

/** Value/selection live only on inputs and textareas. Obsidian's `instanceOf`
 *  is used throughout — plain `instanceof` breaks across popout windows. */
function asText(el: HTMLElement): HTMLInputElement | HTMLTextAreaElement | null {
  if (el.instanceOf(HTMLInputElement)) return el;
  if (el.instanceOf(HTMLTextAreaElement)) return el;
  return null;
}

function capture(scope: HTMLElement): SavedField | null {
  const ae = scope.doc.activeElement;
  if (!ae?.instanceOf(HTMLElement) || !scope.contains(ae)) return null;
  const key = ae.dataset.inkswellField;
  if (!key) return null;
  const mode = modeFor(ae);
  const text = asText(ae);
  return {
    key,
    mode,
    value: text ? text.value : "",
    selectionStart: mode === "text" && text ? text.selectionStart : null,
    selectionEnd: mode === "text" && text ? text.selectionEnd : null,
    scrollTop: text ? text.scrollTop : 0,
  };
}

function restore(scope: HTMLElement, saved: SavedField): void {
  const el = Array.from(
    scope.querySelectorAll<HTMLElement>("[data-inkswell-field]")
  ).find((c) => c.dataset.inkswellField === saved.key);
  if (!el) return;
  const text = asText(el);
  if (saved.mode !== "focus" && text) {
    // The live value wins over the recreated one: the user may have typed
    // text that never hit `onchange`, and the rebuild seeded the element from
    // frontmatter that doesn't have it yet. Dropping keystrokes is worse than
    // briefly shadowing an external edit.
    if (text.value !== saved.value) text.value = saved.value;
  }
  el.focus({ preventScroll: true });
  if (saved.mode === "text" && text) {
    const end = saved.value.length;
    const from = Math.min(saved.selectionStart ?? end, end);
    const to = Math.min(saved.selectionEnd ?? end, end);
    text.setSelectionRange(from, to);
    text.scrollTop = saved.scrollTop;
  }
}

/**
 * Run `rebuild` (which may tear down and recreate everything under `scope`),
 * then hand focus, caret, and any un-committed text back to the field the
 * user was in. A no-op when nothing tagged inside `scope` is focused.
 */
export function preserveFocus(scope: HTMLElement, rebuild: () => void): void {
  const saved = capture(scope);
  rebuild();
  if (saved) restore(scope, saved);
}
