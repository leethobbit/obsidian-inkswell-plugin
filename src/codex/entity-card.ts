/**
 * A view-only card for one Codex entry: portrait, name, type, aliases and the
 * entry's filled-in profile fields, with "Open in Codex" and "Open note". One
 * component for the peek (compact) and the Codex companion (full); CSS decides
 * the size. It reads the metadata cache only and never writes (editing lives in
 * the Codex panel).
 */

import { App, TFile } from "obsidian";
import type InkswellPlugin from "../../main";
import { t } from "../i18n";
import { attachOpenInTab } from "../lib/row-menu";
import { openFileInTab } from "../scenes/scene-actions";
import { linkAlias, linkTarget } from "./codex";
import { resolveProfileFields, readProfile } from "./codex-profile";
import { resolveEntityImage } from "./codex-store";
import { ProfileField, ProfileValue, isEmptyValue } from "./profile-schema";
import { CodexEntity, categoryLabel } from "./types";

export interface EntityCardOptions {
  app: App;
  plugin: InkswellPlugin;
  entity: CodexEntity;
  /** Entries a link value may resolve to (already scope-filtered). */
  entities: readonly CodexEntity[];
  size: "compact" | "full";
  /** A name in a link field was clicked: show that entry. Absent = not followable. */
  onNavigate?: (entity: CodexEntity) => void;
  /** Runs before the card sends you elsewhere (the peek closes itself here). */
  onLeave?: () => void;
}

/** Render the card into `host` (emptied first). */
export function renderEntityCard(host: HTMLElement, opts: EntityCardOptions): void {
  const { app, plugin, entity } = opts;
  host.empty();
  const card = host.createDiv({ cls: `inkswell-card inkswell-card--${opts.size}` });
  const file = app.vault.getAbstractFileByPath(entity.path);
  if (!(file instanceof TFile)) {
    card.createDiv({ cls: "inkswell-stats__muted", text: t("card.missing") });
    return;
  }

  const settings = plugin.settings;
  const { fields } = resolveProfileFields(app, settings, entity.category);
  const profile = readProfile(app, file, fields);

  const head = card.createDiv({ cls: "inkswell-card__head" });
  const imageField = fields.find((f) => f.type === "image");
  const rawImage = imageField ? profile[imageField.key] : undefined;
  const image = resolveEntityImage(app, typeof rawImage === "string" ? rawImage : undefined, file.path);
  if (image) {
    const img = head.createEl("img", { cls: "inkswell-card__portrait" });
    img.src = app.vault.getResourcePath(image);
    img.alt = "";
  }
  const title = head.createDiv({ cls: "inkswell-card__title" });
  title.createDiv({ cls: "inkswell-card__name", text: entity.name });
  title.createDiv({
    cls: "inkswell-card__type",
    text: categoryLabel(entity.category, settings.customCategories, settings.categoryOverrides),
  });
  if (entity.aliases.length > 0) {
    title.createDiv({ cls: "inkswell-card__aliases", text: entity.aliases.join(", ") });
  }

  const rows = card.createDiv({ cls: "inkswell-card__fields" });
  let shown = 0;
  for (const field of fields) {
    if (field.type === "image" || field.key === "aliases") continue;
    const value = profile[field.key];
    if (isEmptyValue(value)) continue;
    shown += 1;
    const row = rows.createDiv({ cls: "inkswell-card__field" });
    row.createDiv({ cls: "inkswell-card__label", text: field.label });
    renderValue(row.createDiv({ cls: "inkswell-card__value" }), field, value as ProfileValue, opts);
  }
  if (shown === 0) {
    rows.createDiv({ cls: "inkswell-stats__muted", text: t("card.empty") });
  }

  const actions = card.createDiv({ cls: "inkswell-card__actions" });
  const openCodex = actions.createEl("button", { cls: "mod-cta", text: t("card.openInCodex") });
  openCodex.onclick = () => {
    opts.onLeave?.();
    plugin.openCodexEntry(entity.path);
  };
  const openNote = actions.createEl("button", { text: t("card.openNote") });
  openNote.setAttribute("aria-label", t("card.openNote"));
  const openTab = () => {
    opts.onLeave?.();
    openFileInTab(app, file);
  };
  openNote.onclick = openTab;
  attachOpenInTab(openNote, openTab);
}

function renderValue(
  el: HTMLElement,
  field: ProfileField,
  value: ProfileValue,
  opts: EntityCardOptions
): void {
  if (field.type !== "links") {
    el.setText(Array.isArray(value) ? value.join(", ") : String(value));
    if (field.type === "textarea") el.addClass("is-prose");
    return;
  }
  const values = Array.isArray(value) ? value : [String(value)];
  const byName = new Map(opts.entities.map((e) => [e.name.toLowerCase(), e] as const));
  values.forEach((raw, i) => {
    if (i > 0) el.appendText(", ");
    const name = linkTarget(raw);
    const label = linkAlias(raw);
    const target = byName.get(name.trim().toLowerCase());
    const onNavigate = opts.onNavigate;
    if (target && onNavigate) {
      const a = el.createSpan({ cls: "inkswell-card__link", text: name });
      a.setAttribute("role", "link");
      a.tabIndex = 0;
      a.onclick = () => onNavigate(target);
      a.onkeydown = (e) => {
        if (e.key === "Enter") onNavigate(target);
      };
    } else {
      el.appendText(name);
    }
    if (label) el.createSpan({ cls: "inkswell-card__linklabel", text: ` (${label})` });
  });
}
