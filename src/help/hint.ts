/**
 * The dismissible "How this works" callout injected above non-obvious panels.
 *
 * Lives in its OWN host element, never inside the panel's container — panels
 * call `container.empty()` and self-rerender, which would otherwise wipe the tip.
 * Dismissals persist in settings (`dismissedHints`) so a learned tip stays gone.
 */

import { setIcon } from "obsidian";
import type InkswellPlugin from "../../main";
import { HINTS } from "./help-content";

/**
 * Render the contextual tip for `key` into `host`. No-op (and `host` left empty)
 * when there's no tip for the key, tips are globally off, or this one was
 * dismissed. `host` is cleared first so it's safe to call on every re-render.
 */
export function renderHint(host: HTMLElement, plugin: InkswellPlugin, key: string): void {
  host.empty();
  const entry = HINTS[key];
  if (!entry) return;
  if (!plugin.settings.showHelpHints) return;
  if (plugin.settings.dismissedHints.includes(key)) return;

  const box = host.createEl("details", { cls: "inkswell-hint" });
  box.open = true;

  const summary = box.createEl("summary", { cls: "inkswell-hint__summary" });
  setIcon(summary.createSpan({ cls: "inkswell-hint__icon" }), "help-circle");
  summary.createSpan({ cls: "inkswell-hint__title", text: entry.title });

  const dismiss = summary.createEl("button", {
    cls: "inkswell-hint__dismiss",
    attr: { "aria-label": "Dismiss this tip", title: "Dismiss this tip" },
  });
  setIcon(dismiss, "x");
  dismiss.onclick = (e) => {
    // Inside <summary>, a click would toggle the <details>; suppress that.
    e.preventDefault();
    e.stopPropagation();
    void dismissHint(plugin, key);
    box.remove();
  };

  const bodyEl = box.createDiv({ cls: "inkswell-hint__body" });
  entry.body(bodyEl);
}

/** Persist a single dismissal. */
async function dismissHint(plugin: InkswellPlugin, key: string): Promise<void> {
  if (!plugin.settings.dismissedHints.includes(key)) {
    plugin.settings.dismissedHints.push(key);
    await plugin.saveSettings();
  }
}

/** Re-enable every tip and re-arm the one-time welcome. Saves to data.json. */
export async function resetHelpState(plugin: InkswellPlugin): Promise<void> {
  plugin.settings.dismissedHints = [];
  plugin.settings.welcomeSeen = false;
  await plugin.saveSettings();
}
