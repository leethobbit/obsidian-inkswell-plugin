/**
 * Customize → Features: one toggle per optional surface, grouped by area. Moved
 * here from the Settings tab. Hiding is lossless — only rendering and commands
 * are gated; notes and data are untouched (see src/features.ts).
 */

import { Setting } from "obsidian";
import { FeatureGroup, OPTIONAL_FEATURES, featureEnabled } from "../../features";
import type { CustomizeSection, SectionCtx } from "../section";

export const featuresSection: CustomizeSection = {
  id: "features",

  describe(plugin) {
    const hidden = OPTIONAL_FEATURES.filter(
      (f) => !featureEnabled(plugin.settings.disabledFeatures, f.id)
    ).length;
    return hidden === 0
      ? "Everything shown"
      : `${hidden} of ${OPTIONAL_FEATURES.length} hidden`;
  },

  render(host: HTMLElement, ctx: SectionCtx) {
    host.createEl("p", {
      cls: "inkswell-stats__muted",
      text:
        "Hide surfaces you don't use to keep Inkswell lean. Hiding only hides — your notes " +
        "and data are kept, and turning a feature back on restores everything. You can also " +
        "right-click an optional tab anywhere in the app to hide it.",
    });

    let lastGroup: FeatureGroup | null = null;
    for (const f of OPTIONAL_FEATURES) {
      if (f.group !== lastGroup) {
        new Setting(host).setName(f.group).setHeading();
        lastGroup = f.group;
      }
      new Setting(host)
        .setName(f.label)
        .setDesc(f.desc)
        .addToggle((t) =>
          t
            .setValue(featureEnabled(ctx.plugin.settings.disabledFeatures, f.id))
            .onChange(async (v) => {
              // No forced view rebuild: this panel is the active view. The
              // catalog row's "N hidden" line updates through rerender().
              await ctx.plugin.setFeatureEnabled(f.id, v, { rerender: false });
              ctx.rerender();
            })
        );
    }
  },
};
