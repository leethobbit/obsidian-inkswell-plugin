/**
 * Story ideas inbox (capture without leaving Home). Rendered below the shelves
 * on the All-projects dashboard and on the empty "no projects yet" state.
 * Collapsible (state in `settings.homeIdeasOpen`); each idea can be edited in
 * place, pinned, copied, saved out as a vault note, or deleted.
 */

import { Menu, Notice, setIcon } from "obsidian";
import { tagField } from "../../lib/focus-preserve";
import { attachRowMenu } from "../../lib/row-menu";
import { Idea } from "../../ideation/types";
import type InkswellPlugin from "../../../main";

export function renderIdeas(parent: HTMLElement, plugin: InkswellPlugin): void {
  const open = plugin.settings.homeIdeasOpen !== false;
  const sec = parent.createDiv({ cls: "inkswell-ideas" });
  sec.toggleClass("is-collapsed", !open);

  // Header: chevron + "Ideas" + count. Click / Enter toggles; the state is a
  // remembered preference, not a Customize-able shape.
  const head = sec.createDiv({ cls: "inkswell-ideas__head" });
  head.setAttribute("role", "button");
  head.tabIndex = 0;
  head.setAttribute("aria-expanded", String(open));
  const chevron = head.createSpan({ cls: "inkswell-ideas__chevron" });
  setIcon(chevron, open ? "chevron-down" : "chevron-right");
  head.createSpan({ cls: "inkswell-ideas__title", text: "Ideas" });
  if (plugin.ideas.length > 0) {
    head.createSpan({ cls: "inkswell-ideas__count", text: String(plugin.ideas.length) });
  }
  const toggle = () => {
    plugin.settings.homeIdeasOpen = !open;
    void plugin.persist();
    plugin.refreshExplorer();
  };
  head.onclick = toggle;
  head.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };
  if (!open) return;

  const body = sec.createDiv({ cls: "inkswell-ideas__body" });
  const input = body.createEl("input", {
    type: "text",
    cls: "inkswell-ideas__input",
    placeholder: "Capture an idea… (Enter)",
  });
  // Commits only on Enter — a rebuild mid-typing would otherwise drop the text.
  tagField(input, "ideas:capture");
  input.onkeydown = (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      plugin.addIdea(input.value);
      input.value = "";
    }
  };

  const ideas = [...plugin.ideas].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  for (const idea of ideas) renderIdeaRow(body, idea, plugin);
}

function renderIdeaRow(parent: HTMLElement, idea: Idea, plugin: InkswellPlugin): void {
  const row = parent.createDiv({ cls: "inkswell-idea" });
  if (idea.pinned) row.addClass("is-pinned");
  const pin = row.createSpan({ cls: "inkswell-idea__pin", text: idea.pinned ? "★" : "☆" });
  pin.setAttribute("aria-label", idea.pinned ? "Unpin" : "Pin");
  pin.onclick = () => plugin.togglePinIdea(idea.id);

  const text = row.createSpan({ cls: "inkswell-idea__text", text: idea.text });
  text.setAttribute("aria-label", "Edit idea");
  text.tabIndex = 0;
  const startEdit = () => beginEdit(text, idea, plugin);
  text.onclick = startEdit;
  text.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      startEdit();
    }
  };

  // Right-click / ⋯ (hover-revealed on desktop, always on touch).
  attachRowMenu(row, row, () => ideaMenu(idea, plugin, startEdit));
}

/** Swap the text for an input; Enter/blur saves (when changed), Escape restores. */
function beginEdit(textEl: HTMLElement, idea: Idea, plugin: InkswellPlugin): void {
  const input = createEl("input", { type: "text", cls: "inkswell-idea__edit" });
  input.value = idea.text;
  tagField(input, `ideas:edit:${idea.id}`);
  textEl.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  const finish = (save: boolean) => {
    if (done) return;
    done = true;
    const next = input.value.trim();
    if (save && next && next !== idea.text) {
      input.onblur = null;
      input.blur();
      plugin.updateIdea(idea.id, next);
    } else {
      input.replaceWith(textEl); // no change / cancelled — no rebuild needed
    }
  };
  input.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      finish(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      finish(false);
    }
  };
  input.onblur = () => finish(true);
}

function ideaMenu(idea: Idea, plugin: InkswellPlugin, startEdit: () => void): Menu {
  const menu = new Menu();
  menu.addItem((i) => i.setTitle("Edit").setIcon("pencil").onClick(startEdit));
  menu.addItem((i) =>
    i
      .setTitle("Copy")
      .setIcon("copy")
      .onClick(() => {
        void navigator.clipboard.writeText(idea.text).then(
          () => new Notice("Idea copied."),
          () => new Notice("Couldn't copy the idea.")
        );
      })
  );
  menu.addItem((i) =>
    i
      .setTitle("Save as note…")
      .setIcon("file-plus")
      .onClick(() => void plugin.saveIdeaAsNote(idea))
  );
  menu.addItem((i) =>
    i
      .setTitle(idea.pinned ? "Unpin" : "Pin")
      .setIcon(idea.pinned ? "pin-off" : "pin")
      .onClick(() => plugin.togglePinIdea(idea.id))
  );
  menu.addSeparator();
  menu.addItem((i) =>
    i
      .setTitle("Delete")
      .setIcon("trash")
      .onClick(() => plugin.removeIdea(idea.id))
  );
  return menu;
}
