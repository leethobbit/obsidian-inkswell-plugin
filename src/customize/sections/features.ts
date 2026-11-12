/**
 * Customize → Features: one toggle per optional surface, grouped by area. Moved
 * here from the Settings tab. Hiding is lossless — only rendering and commands
 * are gated; notes and data are untouched (see src/features.ts).
 */

import { Setting } from "obsidian";
import { FEATURE_GROUP_LABEL, FeatureGroup, OPTIONAL_FEATURES, featureEnabled } from "../../features";
import { t } from "../../i18n";
import type { CustomizeSection, SectionCtx } from "../section";

export const featuresSection: CustomizeSection = {
  id: "features",

  describe(plugin) {
    const hidden = OPTIONAL_FEATURES.filter(
      (f) => !featureEnabled(plugin.settings.disabledFeatures, f.id)
    ).length;
    return hidden === 0
      ? t("customize.features.allShown")
      : t("customize.features.hidden", { count: hidden, total: OPTIONAL_FEATURES.length });
  },

  render(host: HTMLElement, ctx: SectionCtx) {
    host.createEl("p", {
      cls: "inkswell-stats__muted",
      text: t("customize.features.intro"),
    });

    let lastGroup: FeatureGroup | null = null;
    for (const f of OPTIONAL_FEATURES) {
      if (f.group !== lastGroup) {
        new Setting(host).setName(t(FEATURE_GROUP_LABEL[f.group])).setHeading();
        lastGroup = f.group;
      }
      new Setting(host)
        .setName(t(f.labelKey))
        .setDesc(t(f.descKey))
        .addToggle((c) =>
          c
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
