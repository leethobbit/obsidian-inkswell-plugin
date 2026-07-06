/**
 * Story ideas inbox (capture without leaving Home). Extracted from
 * explorer-view.ts; rendered on the global "all projects" dashboard and on the
 * empty "no projects yet" state.
 */

import type InkswellPlugin from "../../../main";

/** Story ideas inbox (capture without leaving Home). */
export function renderIdeas(parent: HTMLElement, plugin: InkswellPlugin): void {
  const sec = parent.createDiv({ cls: "inkswell-ideas" });
  const input = sec.createEl("input", {
    type: "text",
    cls: "inkswell-ideas__input",
    placeholder: "Capture an idea… (Enter)",
  });
  input.onkeydown = (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      plugin.addIdea(input.value);
      input.value = "";
    }
  };

  const ideas = [...plugin.ideas].sort(
    (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
  );
  for (const idea of ideas) {
    const row = sec.createDiv({ cls: "inkswell-idea" });
    if (idea.pinned) row.addClass("is-pinned");
    const pin = row.createSpan({ cls: "inkswell-idea__pin", text: idea.pinned ? "★" : "☆" });
    pin.setAttribute("aria-label", idea.pinned ? "Unpin" : "Pin");
    pin.onclick = () => plugin.togglePinIdea(idea.id);
    row.createSpan({ cls: "inkswell-idea__text", text: idea.text });
    const del = row.createSpan({ cls: "inkswell-idea__del", text: "×" });
    del.setAttribute("aria-label", "Delete idea");
    del.onclick = () => plugin.removeIdea(idea.id);
  }
}
