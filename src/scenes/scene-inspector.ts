/**
 * Scene Inspector: a single focused panel for the selected scene's metadata.
 * Deliberately small — the picked fields only, no wall of sections (that's the
 * antidote to StoryLine's mega-forms). Tracks the active scene file; edits write
 * straight to that scene's frontmatter (never its body).
 */

import { App, TFile } from "obsidian";
import { detectMentions, linkTarget, toLink } from "../codex/codex";
import { getCodexEntities } from "../codex/codex-store";
import { ProjectStore } from "../projects/project-store";
import {
  SCENE_STATUSES,
  SceneMeta,
  readSceneMeta,
  statusLabel,
  writeSceneMeta,
} from "./scene-meta";

const COLORS = ["#e06c75", "#e5c07b", "#98c379", "#56b6c2", "#61afef", "#c678dd"];

export class SceneInspector {
  private app: App;
  private store: ProjectStore;

  constructor(app: App, store: ProjectStore) {
    this.app = app;
    this.store = store;
  }

  render(container: HTMLElement, file: TFile | null): void {
    container.empty();
    container.addClass("inkswell-inspector");

    const ctx = file ? this.store.findSceneByPath(file.path) : null;
    if (!file || !ctx) {
      container.createDiv({
        cls: "inkswell-inspector__empty",
        text: "Open a scene to edit its details.",
      });
      return;
    }

    container.createDiv({ cls: "inkswell-inspector__title", text: ctx.scene.title });
    container.createDiv({
      cls: "inkswell-inspector__project",
      text: ctx.project.draft.title,
    });

    const meta = readSceneMeta(this.app, file);
    const save = (patch: Partial<SceneMeta>) => void writeSceneMeta(this.app, file, patch);
    const entities = getCodexEntities(this.app);

    // Status
    this.field(container, "Status", (host) => {
      const sel = host.createEl("select", { cls: "dropdown" });
      sel.createEl("option", { text: "— none —", value: "" });
      for (const s of SCENE_STATUSES) {
        const o = sel.createEl("option", { text: statusLabel(s), value: s });
        if (meta.status === s) o.selected = true;
      }
      sel.value = meta.status ?? "";
      sel.onchange = () => save({ status: (sel.value || undefined) as SceneMeta["status"] });
    });

    // Subtitle
    this.field(container, "Subtitle", (host) => {
      const t = host.createEl("input", { type: "text" });
      t.value = meta.subtitle ?? "";
      t.placeholder = "e.g. Three years later";
      t.onchange = () => save({ subtitle: t.value });
    });

    // Synopsis
    this.field(container, "Synopsis", (host) => {
      const ta = host.createEl("textarea", { cls: "inkswell-inspector__textarea" });
      ta.rows = 3;
      ta.value = meta.synopsis ?? "";
      ta.placeholder = "What happens in this scene…";
      ta.onchange = () => save({ synopsis: ta.value });
    });

    // POV
    this.field(container, "POV", (host) => {
      const t = host.createEl("input", { type: "text" });
      t.value = meta.pov ?? "";
      t.placeholder = "Point-of-view character";
      t.onchange = () => save({ pov: t.value });
    });

    // Characters (linked codex entities)
    this.field(container, "Characters", (host) => {
      const current = meta.characters ?? [];
      const chips = host.createDiv({ cls: "inkswell-inspector__chips" });
      for (const link of current) {
        const chip = chips.createSpan({ cls: "inkswell-chip", text: linkTarget(link) });
        const x = chip.createSpan({ cls: "inkswell-chip__x", text: "×" });
        x.onclick = () => save({ characters: current.filter((c) => c !== link) });
      }
      const chars = entities.filter((e) => e.category === "character");
      const remaining = chars.filter(
        (c) => !current.some((link) => linkTarget(link) === c.name)
      );
      if (remaining.length > 0) {
        const add = host.createEl("select", { cls: "dropdown" });
        add.createEl("option", { text: "+ add character", value: "" });
        for (const c of remaining) add.createEl("option", { text: c.name, value: c.name });
        add.value = "";
        add.onchange = () => {
          if (add.value) save({ characters: [...current, toLink(add.value)] });
        };
      } else if (chars.length === 0) {
        host.createSpan({ cls: "inkswell-stats__muted", text: "No characters in codex." });
      }
    });

    // Location (single linked codex entity)
    this.field(container, "Location", (host) => {
      const locs = entities.filter((e) => e.category === "location");
      const cur = meta.location ? linkTarget(meta.location) : "";
      const sel = host.createEl("select", { cls: "dropdown" });
      sel.createEl("option", { text: "— none —", value: "" });
      for (const l of locs) {
        const o = sel.createEl("option", { text: l.name, value: l.name });
        if (l.name === cur) o.selected = true;
      }
      sel.value = locs.some((l) => l.name === cur) ? cur : "";
      sel.onchange = () => save({ location: sel.value ? toLink(sel.value) : "" });
    });

    // Auto-detect codex mentions in the scene body.
    this.field(container, "", (host) => {
      const btn = host.createEl("button", { text: "Detect mentions" });
      btn.setAttribute("aria-label", "Scan the scene text for codex characters/locations");
      btn.onclick = async () => {
        const text = await this.app.vault.cachedRead(file);
        const mentions = detectMentions(text, entities);
        const fresh = readSceneMeta(this.app, file);
        const chars = Array.from(
          new Set([
            ...(fresh.characters ?? []),
            ...mentions.filter((m) => m.category === "character").map((m) => toLink(m.name)),
          ])
        );
        const patch: Partial<SceneMeta> = { characters: chars };
        const loc = mentions.find((m) => m.category === "location");
        if (loc && !fresh.location) patch.location = toLink(loc.name);
        await writeSceneMeta(this.app, file, patch);
      };
    });

    // Act + Chapter
    this.field(container, "Act / Chapter", (host) => {
      const row = host.createDiv({ cls: "inkswell-inspector__pair" });
      const act = row.createEl("input", { type: "text" });
      act.value = meta.act ?? "";
      act.placeholder = "Act";
      act.onchange = () => save({ act: act.value });
      const ch = row.createEl("input", { type: "text" });
      ch.value = meta.chapter ?? "";
      ch.placeholder = "Chapter";
      ch.onchange = () => save({ chapter: ch.value });
    });

    // Color
    this.field(container, "Color", (host) => {
      const row = host.createDiv({ cls: "inkswell-inspector__swatches" });
      for (const c of COLORS) {
        const sw = row.createDiv({ cls: "inkswell-swatch" });
        sw.style.backgroundColor = c;
        if (meta.color === c) sw.addClass("is-selected");
        sw.onclick = () => save({ color: c });
      }
      const clear = row.createDiv({ cls: "inkswell-swatch inkswell-swatch--clear" });
      clear.setText("×");
      clear.onclick = () => save({ color: undefined });
    });

    // Inactive
    this.field(container, "", (host) => {
      const label = host.createEl("label", { cls: "inkswell-inspector__toggle" });
      const cb = label.createEl("input", { type: "checkbox" });
      cb.checked = !!meta.inactive;
      cb.onchange = () => save({ inactive: cb.checked });
      label.createSpan({ text: "Archived / inactive (excluded from compile & stats)" });
    });
  }

  private field(parent: HTMLElement, label: string, build: (host: HTMLElement) => void): void {
    const f = parent.createDiv({ cls: "inkswell-inspector__field" });
    if (label) f.createDiv({ cls: "inkswell-inspector__label", text: label });
    build(f.createDiv({ cls: "inkswell-inspector__control" }));
  }
}
