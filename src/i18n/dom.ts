/**
 * Render a translated sentence that contains inline elements (a link, a bold
 * name, a code chip) without splitting it into fragments, which translators
 * can't reorder. The template marks each element with a `{slot}`; plain
 * `{vars}` are filled first by `t()`, so pass slots only for elements:
 *
 *   fillTemplate(note, t("customize.hiddenFeature"), {
 *     link: (el) => el.createEl("a", { text: t("customize.hiddenFeature.link") }),
 *   });
 *   // en: "This feature is currently hidden. {link}."
 *
 * Text between slots is appended as text nodes (never parsed as HTML). A
 * `{slot}` with no renderer stays visible, mirroring `interpolate`.
 */
export function fillTemplate(
  parent: HTMLElement,
  template: string,
  slots: Record<string, (parent: HTMLElement) => void>
): void {
  for (const part of template.split(/(\{\w+\})/)) {
    if (!part) continue;
    const m = /^\{(\w+)\}$/.exec(part);
    const render = m ? slots[m[1]] : undefined;
    if (render) render(parent);
    else parent.append(document.createTextNode(part));
  }
}
