/**
 * Customize → To-do markers: hide or reorder the shipped markers, and add your
 * own (`[CHECK: …]`, `[TK: …]`).
 *
 * The keyword is the contract — it's what the writer typed into their prose —
 * so it's shown read-only: a shipped marker's keyword (and name) never
 * changes, and a custom one's keyword is fixed at creation. Shipped markers
 * can't be renamed because a button must say what it types; another word means
 * your own marker. Hiding only takes a marker out of the insert UI; it's still
 * found in the revision log and still stripped by compile. Removing a custom marker is
 * the one lossy act, so it confirms first.
 */

import { Notice } from "obsidian";
import { t, tp } from "../../i18n";
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
    const parts = [tp("customize.summary.builtIn", SHIPPED_MARKERS.length)];
    if (mine) parts.push(tp("customize.summary.yours", mine));
    if (hidden) parts.push(tp("customize.summary.hidden", hidden));
    return parts.join(" · ");
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
      intro: t("customize.markers.intro"),
      newItemExtra: async () => {
        const raw = await promptText(ctx.app, {
          title: t("customize.markers.wordPrompt"),
          value: "",
          multiline: false,
          cta: t("common.add"),
        });
        if (raw === null || !raw.trim()) return null;
        if (!isValidKeyword(raw)) {
          new Notice(t("customize.markers.invalidWord"));
          return null;
        }
        const keyword = normalizeKeyword(raw);
        if (markerSet(ctx.plugin.settings.listOverrides.markers).byKeyword.has(keyword)) {
          new Notice(t("customize.markers.taken", { keyword }));
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
          el.createSpan({ cls: "inkswell-customize__badge", text: t("customize.markers.inactive") });
        }
      },
      confirmRemove: (it) =>
        confirmDestructive(
          ctx.app,
          t("customize.markers.removeConfirm", { label: it.label, keyword: it.extra.keyword }),
          t("common.remove")
        ),
      removeNotice: (it) => t("customize.markers.removed", { label: it.label, keyword: it.extra.keyword }),
      // Live Write editors re-highlight with the new list (no panel rebuild).
      onSaved: () => ctx.plugin.applyEditorPrefs(),
    });
  },
};
