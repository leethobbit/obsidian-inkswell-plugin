/**
 * The manuscript editing surface: a CodeMirror 6 editor with Live-Preview-style
 * Markdown rendering. Content is always styled (italic/bold/heading/etc.), and the
 * syntax markers (`*`, `**`, backticks, heading `#`s, quote `>`) are hidden until a
 * selection sits on the construct — then they reappear (dimmed) so you can edit
 * them. This keeps the surface fully ours: it uses only the CM6 packages Obsidian
 * already provides at runtime (view/state/commands), with no new bundled dependency
 * and no reliance on Obsidian's private editor internals.
 *
 * The scanning + hide/reveal logic is a pure function (`lib/markdown-syntax.ts`)
 * so it can be unit-tested without a DOM; this module is just the CM adapter:
 * intents → decorations, with hidden markers made atomic so the cursor steps over
 * them. Styling lives in styles.css against the `cm-md-*` classes.
 */

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  keymap,
} from "@codemirror/view";
import { Sel, buildSyntaxIntents } from "../lib/markdown-syntax";

function buildDecorations(view: EditorView): { all: DecorationSet; hidden: DecorationSet } {
  const sels: Sel[] = view.state.selection.ranges.map((r) => ({ from: r.from, to: r.to }));
  const intents = buildSyntaxIntents(view.state.doc.toString(), sels);

  const all = [];
  const hidden = [];
  for (const it of intents) {
    if (it.type === "hide") {
      const d = Decoration.replace({});
      all.push(d.range(it.from, it.to));
      hidden.push(d.range(it.from, it.to));
    } else {
      all.push(Decoration.mark({ class: it.cls as string }).range(it.from, it.to));
    }
  }
  return { all: Decoration.set(all, true), hidden: Decoration.set(hidden, true) };
}

const markdownHighlighter = ViewPlugin.fromClass(
  class {
    all: DecorationSet;
    hidden: DecorationSet;
    constructor(view: EditorView) {
      const d = buildDecorations(view);
      this.all = d.all;
      this.hidden = d.hidden;
    }
    update(u: ViewUpdate): void {
      // Selection changes drive marker hide/reveal, so rebuild on both.
      if (u.docChanged || u.selectionSet) {
        const d = buildDecorations(u.view);
        this.all = d.all;
        this.hidden = d.hidden;
      }
    }
  },
  { decorations: (v) => v.all }
);

// Make the currently-hidden markers atomic so cursor motion skips over the
// collapsed ranges in one step instead of landing in a zero-width gap.
const atomicMarkers = EditorView.atomicRanges.of(
  (view) => view.plugin(markdownHighlighter)?.hidden ?? Decoration.none
);

export interface SceneEditorOptions {
  parent: HTMLElement;
  doc: string;
  /** Fired after any document change (for live word counts). */
  onChange: () => void;
  /** Fired when the editor loses focus (to flush a save). */
  onBlur: () => void;
}

/** Create a manuscript editor bound to `parent`, seeded with `doc`. */
export function createSceneEditor(opts: SceneEditorOptions): EditorView {
  return new EditorView({
    parent: opts.parent,
    state: EditorState.create({
      doc: opts.doc,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
        markdownHighlighter,
        atomicMarkers,
        EditorView.updateListener.of((u) => {
          if (u.docChanged) opts.onChange();
        }),
        EditorView.domEventHandlers({
          blur: () => {
            opts.onBlur();
            return false;
          },
        }),
      ],
    }),
  });
}
