/**
 * The Customize destination: a master–detail catalog of everything a writer can
 * reshape (codex types & fields, templates, structures, checklists, prompts,
 * features). Left column = the catalog grouped by pipeline phase; right pane =
 * the selected section's editor. Sections plug in via `sections/index.ts`.
 *
 * Refresh rule: sections save and call `ctx.rerender()` (in-place, scroll and
 * focus preserved). They never call `plugin.refreshView()` — that would rebuild
 * the pane being edited. Other panels pick up changes on their own next render.
 */

import { App, setIcon } from "obsidian";
import type InkswellPlugin from "../../main";
import { featureEnabled } from "../features";
import { preserveUi } from "../lib/scroll-preserve";
import { SectionState } from "../views/panel-kit";
import { CUSTOMIZE_CATALOG, DEFAULT_SECTION, catalogByGroup, catalogEntry } from "./catalog";
import { SECTIONS } from "./sections";
import type { SectionCtx } from "./section";

export class CustomizePanel {
  private selected: string = DEFAULT_SECTION;
  private target: string | null = null;
  private container: HTMLElement | null = null;
  /** Open-state memory for sections' `<details>` cards (editor cards start open). */
  private cards = new SectionState([
    "codex-types:display",
    "codex-types:fields",
    "codex-types:starter",
    "scene-template:body",
  ]);

  constructor(
    private app: App,
    private plugin: InkswellPlugin
  ) {
    // A catalog entry without a renderer is a wiring bug — but it must never
    // take the whole Inkswell view down (this panel is constructed with the
    // host), so it is dropped from the catalog and reported, not thrown.
    for (const entry of CUSTOMIZE_CATALOG) {
      if (!SECTIONS[entry.id]) {
        console.warn(`[Inkswell] Customize section "${entry.id}" has no renderer — hidden.`);
      }
    }
  }

  /** Catalog entries that actually have a renderer. */
  private available(): typeof CUSTOMIZE_CATALOG {
    return CUSTOMIZE_CATALOG.filter((e) => !!SECTIONS[e.id]);
  }

  /** Deep-link: select a section (and optional sub-target) before the host renders. */
  open(sectionId: string, target?: string): void {
    if (!SECTIONS[sectionId]) return;
    this.selected = sectionId;
    this.target = target ?? null;
  }

  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("inkswell-customize");
    if (!SECTIONS[this.selected]) {
      this.selected = DEFAULT_SECTION;
      this.target = null;
    }

    this.renderCatalog(container.createDiv({ cls: "inkswell-customize__catalog" }));
    this.renderDetail(container.createDiv({ cls: "inkswell-customize__detail" }));
  }

  /** In-place re-render (scroll positions + focused field preserved). */
  softRefresh(): void {
    if (this.container?.isConnected) {
      preserveUi(this.container, () => this.render(this.container as HTMLElement));
    }
  }

  private renderCatalog(host: HTMLElement): void {
    const disabled = this.plugin.settings.disabledFeatures;
    const available = new Set(this.available().map((e) => e.id));
    for (const { group, entries: all } of catalogByGroup()) {
      const entries = all.filter((e) => available.has(e.id));
      if (entries.length === 0) continue;
      host.createDiv({ cls: "inkswell-customize__group", text: group.label });
      for (const entry of entries) {
        const row = host.createDiv({ cls: "inkswell-customize__row" });
        row.toggleClass("is-selected", entry.id === this.selected);
        row.setAttribute("role", "button");
        setIcon(row.createSpan({ cls: "inkswell-customize__icon" }), entry.icon);
        const text = row.createDiv({ cls: "inkswell-customize__text" });
        const name = text.createDiv({ cls: "inkswell-customize__name", text: entry.label });
        if (entry.feature && !featureEnabled(disabled, entry.feature)) {
          name.createSpan({ cls: "inkswell-customize__badge", text: "hidden" });
        }
        text.createDiv({
          cls: "inkswell-customize__desc",
          text: SECTIONS[entry.id].describe(this.plugin, this.app),
        });
        row.onclick = () => {
          this.selected = entry.id;
          this.target = null;
          this.softRefresh();
        };
      }
    }
  }

  private renderDetail(host: HTMLElement): void {
    const entry = catalogEntry(this.selected);
    const section = SECTIONS[this.selected];
    if (!entry || !section) return;

    const head = host.createDiv({ cls: "inkswell-customize__head" });
    setIcon(head.createSpan({ cls: "inkswell-customize__icon" }), entry.icon);
    head.createEl("h3", { text: entry.label });

    if (entry.feature && !featureEnabled(this.plugin.settings.disabledFeatures, entry.feature)) {
      const note = host.createDiv({ cls: "inkswell-customize__hidden-note inkswell-stats__muted" });
      note.appendText("This feature is currently hidden. ");
      const link = note.createEl("a", { text: "Turn it on under Features" });
      link.onclick = (e) => {
        e.preventDefault();
        this.open("features");
        this.softRefresh();
      };
      note.appendText(".");
    }

    section.render(host.createDiv({ cls: "inkswell-customize__body" }), this.ctx());
  }

  private ctx(): SectionCtx {
    return {
      app: this.app,
      plugin: this.plugin,
      target: this.target,
      setTarget: (target) => {
        this.target = target;
        this.softRefresh();
      },
      rerender: () => this.softRefresh(),
      cards: this.cards,
      markSelfWrite: (path) => this.plugin.selfWrites.mark(path),
    };
  }
}
