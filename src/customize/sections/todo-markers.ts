/**
 * Customize → To-do markers: rename how the shipped markers are labeled, hide
 * the ones you never use, and add your own (`[CHECK: …]`, `[TK: …]`).
 *
 * The keyword is the contract — it's what the writer typed into their prose —
 * so it's shown read-only: a shipped marker's keyword never changes, and a
 * custom one is fixed at creation. Hiding only takes a marker out of the insert
 * UI; it's still found in To-dos and still stripped by compile. Removing a
 * custom marker is the one lossy act, so it confirms first.
 */

import { Notice } from "obsidian";
import {
  MarkerExtra,
  SHIPPED_MARKERS,
  isValidKeyword,
  markerSet,
  normalizeKeyword,
} from "../../lib/placeholders";
import { confirmDestructive, promptText } from "../../scenes/scene-actions";
import { SPEC_MARKERS } from "../../settings/overridable-lists";
import { renderOverrideEditor } from "../override-editor";
import type { CustomizeSection } from "../section";

export const todoMarkersSection: CustomizeSection = {
  id: "todo-markers",

  describe(plugin) {
    const o = plugin.settings.listOverrides.markers;
    const mine = o?.added?.length ?? 0;
    const hidden = o?.hidden?.length ?? 0;
    return `${SHIPPED_MARKERS.length} built-in${mine ? ` · ${mine} yours` : ""}${hidden ? ` · ${hidden} hidden` : ""}`;
  },

  render(host, ctx) {
    const keywordOf = (id: string, fallback: string): string =>
      markerSet(ctx.plugin.settings.listOverrides.markers).byId.get(id)?.keyword ?? fallback;

    renderOverrideEditor<MarkerExtra>(host, ctx, {
      listId: "markers",
      spec: SPEC_MARKERS,
      shipped: SHIPPED_MARKERS,
      allowAdd: true,
      noun: "marker",
      intro:
        "Markers you drop into your prose to come back to later — [TODO: …], [RESEARCH: …] and the " +
        "rest — then find in Revise → To-dos. Compiling removes them all. Renaming a marker changes " +
        "its name in menus and To-dos; the word you type in your scenes stays the same. To type a " +
        "different word, add your own marker. Hiding a marker only takes it out of the Insert menu: " +
        "markers already in your scenes are still found and still removed when you compile.",
      newItemExtra: async () => {
        const raw = await promptText(ctx.app, {
          title: "Word to type in your scenes (e.g. CHECK)",
          value: "",
          multiline: false,
          cta: "Add",
        });
        if (raw === null || !raw.trim()) return null;
        if (!isValidKeyword(raw)) {
          new Notice("A marker word starts with a letter and uses 2–20 letters, digits or hyphens.");
          return null;
        }
        const keyword = normalizeKeyword(raw);
        if (markerSet(ctx.plugin.settings.listOverrides.markers).byKeyword.has(keyword)) {
          new Notice(`[${keyword}] is already a marker.`);
          return null;
        }
        return { keyword };
      },
      // Read-only: the keyword lives in prose and never changes (never `patch`).
      renderExtra(el, it) {
        const recognized = markerSet(ctx.plugin.settings.listOverrides.markers).byId.has(it.id);
        el.createEl("code", {
          cls: "inkswell-customize__keyword",
          text: `[${keywordOf(it.id, it.extra.keyword)}: …]`,
        });
        if (!recognized) {
          el.createSpan({ cls: "inkswell-customize__badge", text: "word already used — inactive" });
        }
      },
      confirmRemove: (it) =>
        confirmDestructive(
          ctx.app,
          `Remove "${it.label}"? Markers already in your scenes typed as [${it.extra.keyword}: …] won't ` +
            "be found in To-dos or removed when you compile. To keep them working, hide the marker instead.",
          "Remove"
        ),
      removeNotice: (it) =>
        `Removed "${it.label}". Any [${it.extra.keyword}: …] markers stay in your scenes as plain text.`,
      // Live Write editors re-highlight with the new list (no panel rebuild).
      onSaved: () => ctx.plugin.applyEditorPrefs(),
    });
  },
};
