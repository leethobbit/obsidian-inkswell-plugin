/**
 * "What a new one starts with": edits the BODY of a template note (everything
 * after the frontmatter) in place, without a writer ever opening the note.
 * Shared by Customize → Codex types (a type's starter content) and Customize →
 * Scene template. Frontmatter bytes are never re-serialized (replaceBody), so
 * `codex-fields`, tags, and hand formatting survive exactly.
 */

import { TFile } from "obsidian";
import { t } from "../i18n";
import { autosizeTextarea } from "../lib/form-fields";
import { tryFileOp } from "../lib/notify";
import { openScene } from "../scenes/scene-actions";
import { taggedTextarea } from "../views/panel-kit";
import type { SectionCtx } from "./section";

export interface TemplateBodyEditorOptions {
  /** The template note, or null when none exists yet. */
  file: TFile | null;
  /** Create the note (starter content); the editor re-renders with it. */
  create(): Promise<TFile>;
  /** `tagField` key so a rebuild keeps caret + uncommitted text. */
  fieldKey: string;
  /** One line under the box explaining `{{title}}` and any app-managed keys. */
  hint: string;
  /** What "none" means for this template, e.g. "New entries start with a heading only." */
  noneText: string;
  /** Read / write the body (kept injectable so codex and scene share the widget). */
  read(file: TFile): Promise<string>;
  write(file: TFile, body: string): Promise<void>;
}

export function renderTemplateBodyEditor(
  host: HTMLElement,
  ctx: SectionCtx,
  opts: TemplateBodyEditorOptions
): void {
  const wrap = host.createDiv({ cls: "inkswell-tplbody" });
  const { file } = opts;

  if (!file) {
    wrap.createDiv({ cls: "inkswell-stats__muted", text: opts.noneText });
    const row = wrap.createDiv({ cls: "inkswell-tplbody__actions" });
    const create = row.createEl("button", { text: t("customize.templateBody.create") });
    create.type = "button";
    create.onclick = async () => {
      const made = await tryFileOp(() => opts.create(), t("customize.fields.createTemplateFailed"));
      if (made) ctx.rerender();
    };
    return;
  }

  const ta = taggedTextarea(wrap, opts.fieldKey, { cls: "inkswell-tplbody__text" });
  ta.rows = 8;
  ta.spellcheck = true;
  ta.placeholder = t("customize.templateBody.loading");
  ta.disabled = true;
  void opts.read(file).then((body) => {
    if (!ta.isConnected) return;
    ta.disabled = false;
    ta.placeholder = "";
    // Don't clobber text the user began typing before the read resolved.
    if (!ta.value) ta.value = body;
    autosizeTextarea(ta);
  });
  ta.onchange = () => {
    ctx.markSelfWrite(file.path);
    void tryFileOp(() => opts.write(file, ta.value), t("customize.templateBody.saveFailed"));
  };

  wrap.createDiv({ cls: "inkswell-stats__muted inkswell-tplbody__hint", text: opts.hint });

  const row = wrap.createDiv({ cls: "inkswell-tplbody__actions" });
  const open = row.createEl("button", { text: t("customize.templateBody.open") });
  open.type = "button";
  open.setAttribute("aria-label", t("customize.templateBody.openAria", { path: file.path }));
  open.onclick = () => openScene(ctx.app, file);
  row.createSpan({ cls: "inkswell-stats__muted", text: file.path });
}
